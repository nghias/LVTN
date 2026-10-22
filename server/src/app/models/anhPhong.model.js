const db = require('../../database/db');

const AnhPhongModel = {
  // Lấy toàn bộ ảnh của 1 phòng (Ảnh chính xếp đầu tiên)
  getByMaPhong: async (maPhong) => {
    const sql = `
      SELECT MaAnh, MaPhong, DuongDan, AnhChinh
      FROM AnhPhong
      WHERE MaPhong = ?
      ORDER BY AnhChinh DESC, MaAnh ASC
    `;
    const [rows] = await db.execute(sql, [maPhong]);
    return rows;
  },

  // Lấy toàn bộ ảnh của danh sách nhiều phòng
  getByMaPhongList: async (maPhongIds = []) => {
    if (!maPhongIds || maPhongIds.length === 0) return [];
    const placeholders = maPhongIds.map(() => '?').join(',');
    const sql = `
      SELECT MaAnh, MaPhong, DuongDan, AnhChinh
      FROM AnhPhong
      WHERE MaPhong IN (${placeholders})
      ORDER BY AnhChinh DESC, MaAnh ASC
    `;
    const [rows] = await db.execute(sql, maPhongIds);
    return rows;
  },

  // Lấy 1 ảnh theo MaAnh
  getById: async (maAnh) => {
    const sql = `
      SELECT MaAnh, MaPhong, DuongDan, AnhChinh
      FROM AnhPhong
      WHERE MaAnh = ?
      LIMIT 1
    `;
    const [rows] = await db.execute(sql, [maAnh]);
    return rows[0] || null;
  },

  // Thêm 1 ảnh mới cho phòng
  create: async ({ MaPhong, DuongDan, AnhChinh }) => {
    const sql = `
      INSERT INTO AnhPhong (MaPhong, DuongDan, AnhChinh)
      VALUES (?, ?, ?)
    `;
    const [result] = await db.execute(sql, [MaPhong, DuongDan, AnhChinh ? 1 : 0]);
    return result.insertId;
  },

  // Đặt toàn bộ ảnh của phòng về ảnh phụ (AnhChinh = 0)
  resetMainImageByRoom: async (maPhong) => {
    const sql = `UPDATE AnhPhong SET AnhChinh = 0 WHERE MaPhong = ?`;
    await db.execute(sql, [maPhong]);
    return true;
  },

  // Đặt 1 ảnh cụ thể làm Ảnh chính (AnhChinh = 1)
  setMainImage: async (maAnh, maPhong) => {
    const sql = `UPDATE AnhPhong SET AnhChinh = 1 WHERE MaAnh = ? AND MaPhong = ?`;
    await db.execute(sql, [maAnh, maPhong]);
    return true;
  },

  // Xóa 1 ảnh theo MaAnh
  deleteById: async (maAnh) => {
    const sql = `DELETE FROM AnhPhong WHERE MaAnh = ?`;
    await db.execute(sql, [maAnh]);
    return true;
  },

  // Xóa toàn bộ ảnh của 1 phòng
  deleteByMaPhong: async (maPhong) => {
    const sql = `DELETE FROM AnhPhong WHERE MaPhong = ?`;
    await db.execute(sql, [maPhong]);
    return true;
  },
};

module.exports = AnhPhongModel;