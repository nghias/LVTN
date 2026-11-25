// server/src/app/models/theRaVao.model.js
const db = require("../../database/db");

const TheRaVaoModel = {
  async findAll() {
    const [rows] = await db.query(
      `SELECT MaThe, MaND, GiaTri, NgayTao, TrangThai, GhiChu
       FROM TheRaVao
       ORDER BY FIELD(TrangThai, 'ChoCapLai', 'DangGhiThe', 'HoatDong', 'BiKhoa', 'ThuHoi'), MaThe DESC`
    );
    return rows;
  },

  async findById(maThe) {
    const [rows] = await db.query(
      `SELECT MaThe, MaND, GiaTri, NgayTao, TrangThai, GhiChu
       FROM TheRaVao
       WHERE MaThe = ?
       LIMIT 1`,
      [maThe]
    );
    return rows[0] || null;
  },

  async findByGiaTri(giaTri) {
    const [rows] = await db.query(
      `SELECT MaThe, MaND, GiaTri, NgayTao, TrangThai, GhiChu
       FROM TheRaVao
       WHERE GiaTri = ?
       LIMIT 1`,
      [giaTri]
    );
    return rows[0] || null;
  },

  async findByMaND(maND) {
    const [rows] = await db.query(
      `SELECT MaThe, MaND, GiaTri, NgayTao, TrangThai, GhiChu
       FROM TheRaVao
       WHERE MaND = ?
       ORDER BY MaThe DESC`,
      [maND]
    );
    return rows;
  },

  async findByMaNDList(maNDList) {
    if (!maNDList || maNDList.length === 0) return [];
    const placeholders = maNDList.map(() => "?").join(",");
    const [rows] = await db.query(
      `SELECT MaThe, MaND, GiaTri, NgayTao, TrangThai, GhiChu
       FROM TheRaVao
       WHERE MaND IN (${placeholders})
       ORDER BY FIELD(TrangThai, 'ChoCapLai', 'DangGhiThe', 'HoatDong', 'BiKhoa', 'ThuHoi'), MaThe DESC`,
      maNDList
    );
    return rows;
  },

  async findPendingByMaND(maND) {
    const [rows] = await db.query(
      `SELECT MaThe, MaND, GiaTri, NgayTao, TrangThai, GhiChu
       FROM TheRaVao
       WHERE MaND = ? AND TrangThai IN ('ChoCapLai', 'DangGhiThe')
       LIMIT 1`,
      [maND]
    );
    return rows[0] || null;
  },

  async findPendingWriteJobsByMaNDList(maNDList) {
    if (!maNDList || maNDList.length === 0) return [];
    const placeholders = maNDList.map(() => "?").join(",");
    const [rows] = await db.query(
      `SELECT MaThe, MaND, GiaTri, NgayTao, TrangThai, GhiChu
       FROM TheRaVao
       WHERE MaND IN (${placeholders})
         AND TrangThai = 'DangGhiThe'
         AND GiaTri LIKE 'WAIT|%'
       ORDER BY NgayTao DESC`,
      maNDList
    );
    return rows;
  },

  async findActiveByUidPrefix(uidPrefix, excludeMaThe) {
    const [rows] = await db.query(
      `SELECT MaThe
       FROM TheRaVao
       WHERE GiaTri LIKE ? AND TrangThai = 'HoatDong' AND MaThe <> ?
       LIMIT 1`,
      [`${uidPrefix}|%`, excludeMaThe]
    );
    return rows[0] || null;
  },

  async create({ maND, giaTri, trangThai, ghiChu }) {
    const [result] = await db.query(
      `INSERT INTO TheRaVao (MaND, GiaTri, NgayTao, TrangThai, GhiChu)
       VALUES (?, ?, NOW(), ?, ?)`,
      [maND, giaTri, trangThai, ghiChu]
    );
    return result.insertId;
  },

  async updateForWrite(maThe, maND, { giaTri, ghiChu }) {
    await db.query(
      `UPDATE TheRaVao
       SET GiaTri = ?, TrangThai = 'DangGhiThe', NgayTao = NOW(), GhiChu = ?
       WHERE MaThe = ? AND MaND = ?`,
      [giaTri, ghiChu, maThe, maND]
    );
  },

  async activateCard(maThe, giaTriMoi) {
    await db.query(
      `UPDATE TheRaVao
       SET GiaTri = ?, TrangThai = 'HoatDong', NgayTao = NOW()
       WHERE MaThe = ?`,
      [giaTriMoi, maThe]
    );
  },

  async lockActiveByMaND(maND, lyDo) {
    await db.query(
      `UPDATE TheRaVao
       SET TrangThai = 'BiKhoa',
           GhiChu = TRIM(BOTH ' | ' FROM CONCAT(IFNULL(GhiChu, ''), ' | ', ?))
       WHERE MaND = ? AND TrangThai = 'HoatDong'`,
      [lyDo, maND]
    );
  },

  async lockById(maThe, lyDo) {
    await db.query(
      `UPDATE TheRaVao
       SET TrangThai = 'BiKhoa',
           GhiChu = TRIM(BOTH ' | ' FROM CONCAT(IFNULL(GhiChu, ''), ' | ', ?))
       WHERE MaThe = ?`,
      [lyDo, maThe]
    );
  },
};

module.exports = TheRaVaoModel;