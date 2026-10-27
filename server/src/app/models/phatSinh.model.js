// server/src/app/models/phatSinh.model.js
const db = require('../../database/db');

const PhatSinhModel = {
  // 1. Lấy tất cả khoản phí phát sinh
  getAll: async () => {
    const [rows] = await db.execute(
      `SELECT MaPS, MaHD, TenPS, Gia, GhiChu
       FROM PhatSinh
       ORDER BY MaPS ASC`
    );
    return rows;
  },

  // 2. Lấy danh sách phí phát sinh của 1 hóa đơn
  getByMaHD: async (maHD) => {
    const [rows] = await db.execute(
      `SELECT MaPS, MaHD, TenPS, Gia, GhiChu
       FROM PhatSinh
       WHERE MaHD = ?
       ORDER BY MaPS ASC`,
      [Number(maHD)]
    );
    return rows;
  },

  // 3. Thêm 1 khoản phí phát sinh
  create: async ({ MaHD, TenPS, Gia, GhiChu }) => {
    const [result] = await db.execute(
      `INSERT INTO PhatSinh (MaHD, TenPS, Gia, GhiChu)
       VALUES (?, ?, ?, ?)`,
      [
        Number(MaHD),
        String(TenPS).trim(),
        Number(Gia) || 0,
        GhiChu ? String(GhiChu).trim() : null,
      ]
    );
    return result.insertId;
  },

  // 4. Xóa toàn bộ phí phát sinh của 1 hóa đơn (Phục vụ đồng bộ khi Sửa hoặc Xóa hóa đơn)
  deleteByMaHD: async (maHD) => {
    const [result] = await db.execute(
      `DELETE FROM PhatSinh WHERE MaHD = ?`,
      [Number(maHD)]
    );
    return result.affectedRows;
  },
};

module.exports = PhatSinhModel;