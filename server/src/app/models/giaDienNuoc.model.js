// server/src/app/models/giaDienNuoc.model.js
const db = require('../../database/db');

const GiaDienNuocModel = {
  // 1. Lấy toàn bộ lịch sử đơn giá điện nước (mới nhất lên đầu)
  getAll: async () => {
    const sql = `
      SELECT MaGia, GiaDien, GiaNuoc,
             DATE_FORMAT(NgayApDung, '%Y-%m-%d') AS NgayApDung
      FROM GiaDienNuoc
      ORDER BY NgayApDung DESC, MaGia DESC
    `;
    const [rows] = await db.execute(sql);
    return rows;
  },

  // 2. Lấy đơn giá điện nước đang áp dụng hiện tại
  getCurrentPrice: async () => {
    const sql = `
      SELECT MaGia, GiaDien, GiaNuoc,
             DATE_FORMAT(NgayApDung, '%Y-%m-%d') AS NgayApDung
      FROM GiaDienNuoc
      ORDER BY NgayApDung DESC, MaGia DESC
      LIMIT 1
    `;
    const [rows] = await db.execute(sql);
    return rows[0] || { MaGia: 0, GiaDien: 3800, GiaNuoc: 18000, NgayApDung: '2026-08-01' };
  },

  // 3. Lấy chi tiết 1 mốc giá theo MaGia
  getById: async (maGia) => {
    const sql = `
      SELECT MaGia, GiaDien, GiaNuoc,
             DATE_FORMAT(NgayApDung, '%Y-%m-%d') AS NgayApDung
      FROM GiaDienNuoc
      WHERE MaGia = ?
      LIMIT 1
    `;
    const [rows] = await db.execute(sql, [Number(maGia)]);
    return rows[0] || null;
  },

  // 4. Thêm mốc giá điện nước mới (lưu lịch sử biến động giá)
  create: async ({ GiaDien, GiaNuoc, NgayApDung }) => {
    const sql = `
      INSERT INTO GiaDienNuoc (GiaDien, GiaNuoc, NgayApDung)
      VALUES (?, ?, ?)
    `;
    const [result] = await db.execute(sql, [
      Number(GiaDien),
      Number(GiaNuoc),
      NgayApDung,
    ]);
    return result.insertId;
  },

  // 5. Cập nhật một bản ghi giá điện nước
  update: async (maGia, { GiaDien, GiaNuoc, NgayApDung }) => {
    const sql = `
      UPDATE GiaDienNuoc
      SET GiaDien = ?, GiaNuoc = ?, NgayApDung = ?
      WHERE MaGia = ?
    `;
    const [result] = await db.execute(sql, [
      Number(GiaDien),
      Number(GiaNuoc),
      NgayApDung,
      Number(maGia),
    ]);
    return result.affectedRows > 0;
  },

  // 6. Xóa bản ghi giá điện nước
  delete: async (maGia) => {
    const sql = `DELETE FROM GiaDienNuoc WHERE MaGia = ?`;
    const [result] = await db.execute(sql, [Number(maGia)]);
    return result.affectedRows > 0;
  },
};

module.exports = GiaDienNuocModel;