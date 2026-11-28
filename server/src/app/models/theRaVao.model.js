// server/src/app/models/theRaVao.model.js
const db = require('../../database/db');

const TheRaVaoModel = {
  async findAll() {
    const [rows] = await db.query(
      `SELECT MaThe, MaND, GiaTri, NgayTao, TrangThai, GhiChu
       FROM TheRaVao
       ORDER BY FIELD(TrangThai, 'ChoCapLai', 'HoatDong', 'BiKhoa', 'ThuHoi'), MaThe DESC`
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

  async findByGiaTri(giaTriHash) {
    const [rows] = await db.query(
      `SELECT MaThe, MaND, GiaTri, NgayTao, TrangThai, GhiChu
       FROM TheRaVao
       WHERE GiaTri = ?
       LIMIT 1`,
      [giaTriHash]
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

  // Đối chiếu theo tiền tố HMAC(UID) để chặn dùng trùng phôi thẻ vật lý
  async findByUidPrefix(uidHash, excludeMaThe = 0) {
    const [rows] = await db.query(
      `SELECT MaThe, MaND
       FROM TheRaVao
       WHERE (GiaTri LIKE ? OR GiaTri = ?) AND MaThe <> ?
       LIMIT 1`,
      [`${uidHash}|%`, uidHash, Number(excludeMaThe) || 0]
    );
    return rows[0] || null;
  },

  async create({ maND, giaTri, trangThai = 'HoatDong', ghiChu }) {
    const [result] = await db.query(
      `INSERT INTO TheRaVao (MaND, GiaTri, NgayTao, TrangThai, GhiChu)
       VALUES (?, ?, CURDATE(), ?, ?)`,
      [maND, giaTri, trangThai, ghiChu || null]
    );
    return result.insertId;
  },

  async reissueById(maThe, { giaTri, ghiChu }) {
    const [result] = await db.query(
      `UPDATE TheRaVao
       SET GiaTri = ?, NgayTao = CURDATE(), TrangThai = 'HoatDong', GhiChu = ?
       WHERE MaThe = ?`,
      [giaTri, ghiChu || null, maThe]
    );
    return result.affectedRows > 0;
  },

  async updateStatus(maThe, trangThai, ghiChu) {
    const [result] = await db.query(
      `UPDATE TheRaVao
       SET TrangThai = ?,
           GhiChu = CASE
             WHEN ? IS NOT NULL AND ? <> '' THEN ?
             ELSE GhiChu
           END
       WHERE MaThe = ?`,
      [trangThai, ghiChu || '', ghiChu || '', ghiChu || '', maThe]
    );
    return result.affectedRows > 0;
  },

  async deleteById(maThe) {
    const [result] = await db.query(
      `DELETE FROM TheRaVao WHERE MaThe = ?`,
      [maThe]
    );
    return result.affectedRows > 0;
  },
};

module.exports = TheRaVaoModel;