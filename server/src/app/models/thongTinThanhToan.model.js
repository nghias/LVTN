// server/src/app/models/thongTinThanhToan.model.js
const db = require('../../database/db');

const ThongTinThanhToanModel = {
  // 1. Lấy tất cả bản ghi thông tin thanh toán (Mặc định lấy bản ghi của Chủ trọ MaTT = 1 lên đầu)
  getAll: async () => {
    const [rows] = await db.execute(
      `SELECT MaTT, MaND, TenNganHang, STK, ChuTaiKhoan
       FROM ThongTinThanhToan
       ORDER BY MaTT ASC`
    );
    return rows;
  },

  // 2. Lấy bản ghi thông tin thanh toán chính của hệ thống (của Chủ trọ)
  getPrimary: async () => {
    const [rows] = await db.execute(
      `SELECT MaTT, MaND, TenNganHang, STK, ChuTaiKhoan
       FROM ThongTinThanhToan
       ORDER BY MaTT ASC
       LIMIT 1`
    );
    return rows[0] || null;
  },

  // 3. Lấy theo MaND
  getByMaND: async (maND) => {
    const [rows] = await db.execute(
      `SELECT MaTT, MaND, TenNganHang, STK, ChuTaiKhoan
       FROM ThongTinThanhToan
       WHERE MaND = ?
       ORDER BY MaTT ASC
       LIMIT 1`,
      [Number(maND)]
    );
    return rows[0] || null;
  },

  // 4. Lấy theo MaTT
  getById: async (maTT) => {
    const [rows] = await db.execute(
      `SELECT MaTT, MaND, TenNganHang, STK, ChuTaiKhoan
       FROM ThongTinThanhToan
       WHERE MaTT = ?
       LIMIT 1`,
      [Number(maTT)]
    );
    return rows[0] || null;
  },

  // 5. Thêm mới thông tin thanh toán
  create: async ({ MaND, TenNganHang, STK, ChuTaiKhoan }) => {
    const [result] = await db.execute(
      `INSERT INTO ThongTinThanhToan (MaND, TenNganHang, STK, ChuTaiKhoan)
       VALUES (?, ?, ?, ?)`,
      [
        Number(MaND),
        String(TenNganHang).trim(),
        String(STK).trim(),
        String(ChuTaiKhoan).trim().toUpperCase(),
      ]
    );
    return result.insertId;
  },

  // 6. Cập nhật thông tin thanh toán theo MaTT
  update: async (maTT, { TenNganHang, STK, ChuTaiKhoan }) => {
    const [result] = await db.execute(
      `UPDATE ThongTinThanhToan
       SET TenNganHang = ?, STK = ?, ChuTaiKhoan = ?
       WHERE MaTT = ?`,
      [
        String(TenNganHang).trim(),
        String(STK).trim(),
        String(ChuTaiKhoan).trim().toUpperCase(),
        Number(maTT),
      ]
    );
    return result.affectedRows > 0;
  },
};

module.exports = ThongTinThanhToanModel;