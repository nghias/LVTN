// server/src/app/models/chiTietTienIch.model.js
const db = require('../../database/db');

const ChiTietTienIchModel = {
  // 1. Lấy toàn bộ dữ liệu ChiTietTienIch
  getAll: async () => {
    const sql = `SELECT MaPhong, MaTI FROM ChiTietTienIch`;
    const [rows] = await db.execute(sql);
    return rows;
  },

  // 2. Lấy danh sách phòng đang gắn 1 tiện ích (MaTI)
  getByMaTI: async (maTI) => {
    const sql = `
      SELECT MaPhong, MaTI
      FROM ChiTietTienIch
      WHERE MaTI = ?
    `;
    const [rows] = await db.execute(sql, [maTI]);
    return rows;
  },

  // 3. Lấy danh sách MaTI của 1 phòng (MaPhong)
  getByMaPhong: async (maPhong) => {
    const sql = `
      SELECT MaPhong, MaTI
      FROM ChiTietTienIch
      WHERE MaPhong = ?
    `;
    const [rows] = await db.execute(sql, [maPhong]);
    return rows;
  },

  // 4. Lấy danh sách MaTI của nhiều phòng cùng lúc
  getByMaPhongList: async (maPhongIds = []) => {
    if (!maPhongIds || maPhongIds.length === 0) return [];
    const placeholders = maPhongIds.map(() => '?').join(',');
    const sql = `
      SELECT MaPhong, MaTI
      FROM ChiTietTienIch
      WHERE MaPhong IN (${placeholders})
    `;
    const [rows] = await db.execute(sql, maPhongIds);
    return rows;
  },

  // 5. Đếm tổng số phòng đang sử dụng 1 tiện ích
  countByMaTI: async (maTI) => {
    const sql = `SELECT COUNT(*) AS total FROM ChiTietTienIch WHERE MaTI = ?`;
    const [rows] = await db.execute(sql, [maTI]);
    return rows[0]?.total || 0;
  },

  // 6. Gán tiện ích cho phòng
  create: async (maPhong, maTI) => {
    const sql = `INSERT INTO ChiTietTienIch (MaPhong, MaTI) VALUES (?, ?)`;
    await db.execute(sql, [Number(maPhong), Number(maTI)]);
    return true;
  },

  // 7. Xóa toàn bộ tiện ích của 1 phòng (dùng bên Quản lý Phòng trọ)
  deleteByMaPhong: async (maPhong) => {
    const sql = `DELETE FROM ChiTietTienIch WHERE MaPhong = ?`;
    await db.execute(sql, [maPhong]);
    return true;
  },

  // 8. Xóa toàn bộ phòng đang gắn 1 tiện ích (dùng khi Chủ trọ cập nhật toàn hệ thống)
  deleteByMaTI: async (maTI) => {
    const sql = `DELETE FROM ChiTietTienIch WHERE MaTI = ?`;
    await db.execute(sql, [maTI]);
    return true;
  },

  // 9. Chỉ xóa các phòng thuộc phạm vi quản lý của Quản lý cơ sở
  deleteByMaTIAndMaPhongList: async (maTI, maPhongIds = []) => {
    if (!maPhongIds || maPhongIds.length === 0) return true;
    const placeholders = maPhongIds.map(() => '?').join(',');
    const sql = `
      DELETE FROM ChiTietTienIch
      WHERE MaTI = ? AND MaPhong IN (${placeholders})
    `;
    await db.execute(sql, [maTI, ...maPhongIds]);
    return true;
  },
};

module.exports = ChiTietTienIchModel;