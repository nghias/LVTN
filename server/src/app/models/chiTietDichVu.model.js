// server/src/app/models/chiTietDichVu.model.js
const db = require('../../database/db');

const ChiTietDichVuModel = {
  // 1. Lấy toàn bộ bản ghi ChiTietDichVu
  getAll: async () => {
    const sql = `SELECT MaPhong, MaDV, SoLuong FROM ChiTietDichVu`;
    const [rows] = await db.execute(sql);
    return rows;
  },

  // 2. Lấy danh sách phòng áp dụng của 1 dịch vụ (MaDV)
  getByMaDV: async (maDV) => {
    const sql = `
      SELECT MaPhong, MaDV, SoLuong
      FROM ChiTietDichVu
      WHERE MaDV = ?
    `;
    const [rows] = await db.execute(sql, [maDV]);
    return rows;
  },

  // 3. Lấy danh sách dịch vụ của 1 phòng (MaPhong)
  getByMaPhong: async (maPhong) => {
    const sql = `
      SELECT MaPhong, MaDV, SoLuong
      FROM ChiTietDichVu
      WHERE MaPhong = ?
    `;
    const [rows] = await db.execute(sql, [maPhong]);
    return rows;
  },

  // 4. Đếm tổng số phòng đang áp dụng 1 dịch vụ
  countByMaDV: async (maDV) => {
    const sql = `SELECT COUNT(*) AS total FROM ChiTietDichVu WHERE MaDV = ?`;
    const [rows] = await db.execute(sql, [maDV]);
    return rows[0]?.total || 0;
  },

  // 5. Gán dịch vụ cho phòng kèm số lượng
  create: async (maPhong, maDV, soLuong = 1) => {
    const sql = `
      INSERT INTO ChiTietDichVu (MaPhong, MaDV, SoLuong)
      VALUES (?, ?, ?)
    `;
    await db.execute(sql, [
      Number(maPhong),
      Number(maDV),
      Math.max(1, Number(soLuong) || 1),
    ]);
    return true;
  },

  // 6. Xóa toàn bộ phòng áp dụng của 1 dịch vụ (Dùng khi Chủ trọ cập nhật lại toàn bộ)
  deleteByMaDV: async (maDV) => {
    const sql = `DELETE FROM ChiTietDichVu WHERE MaDV = ?`;
    await db.execute(sql, [maDV]);
    return true;
  },

  // 7. Chỉ xóa các phòng thuộc danh sách được phép quản lý (Dùng khi Quản lý cập nhật cơ sở của mình)
  deleteByMaDVAndMaPhongList: async (maDV, maPhongIds = []) => {
    if (!maPhongIds || maPhongIds.length === 0) return true;
    const placeholders = maPhongIds.map(() => '?').join(',');
    const sql = `
      DELETE FROM ChiTietDichVu
      WHERE MaDV = ? AND MaPhong IN (${placeholders})
    `;
    await db.execute(sql, [maDV, ...maPhongIds]);
    return true;
  },
};

module.exports = ChiTietDichVuModel;