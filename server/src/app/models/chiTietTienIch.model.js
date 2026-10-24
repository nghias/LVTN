const db = require('../../database/db');

const ChiTietTienIchModel = {
  
  getAll: async () => {
    const sql = `SELECT MaPhong, MaTI FROM ChiTietTienIch`;
    const [rows] = await db.execute(sql);
    return rows;
  },
  // Lấy danh sách MaTI của 1 phòng
  getByMaPhong: async (maPhong) => {
    const sql = `
      SELECT MaPhong, MaTI
      FROM ChiTietTienIch
      WHERE MaPhong = ?
    `;
    const [rows] = await db.execute(sql, [maPhong]);
    return rows;
  },

  // Lấy danh sách MaTI của nhiều phòng cùng lúc
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

  countByMaTI: async (maTI) => {
    const sql = `SELECT COUNT(*) AS total FROM ChiTietTienIch WHERE MaTI = ?`;
    const [rows] = await db.execute(sql, [maTI]);
    return rows[0]?.total || 0;
  },

  // Gắn 1 tiện ích vào phòng
  create: async (maPhong, maTI) => {
    const sql = `INSERT INTO ChiTietTienIch (MaPhong, MaTI) VALUES (?, ?)`;
    await db.execute(sql, [maPhong, maTI]);
    return true;
  },

  // Xóa toàn bộ tiện ích của 1 phòng (Dùng khi cập nhật lại tiện ích hoặc xóa phòng)
  deleteByMaPhong: async (maPhong) => {
    const sql = `DELETE FROM ChiTietTienIch WHERE MaPhong = ?`;
    await db.execute(sql, [maPhong]);
    return true;
  },
};

module.exports = ChiTietTienIchModel;