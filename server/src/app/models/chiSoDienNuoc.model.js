// server/src/app/models/chiSoDienNuoc.model.js
const db = require('../../database/db');

const ChiSoDienNuocModel = {
  // 1. Lấy toàn bộ danh sách chỉ số điện nước (sắp xếp mới nhất lên đầu)
  getAll: async () => {
    const sql = `
      SELECT MaCS, MaPhong, SoDienCu, SoDienMoi, SoNuocCu, SoNuocMoi,
             DATE_FORMAT(NgayGhi, '%Y-%m-%d') AS NgayGhi
      FROM ChiSoDienNuoc
      ORDER BY NgayGhi DESC, MaCS DESC
    `;
    const [rows] = await db.execute(sql);
    return rows;
  },

  // 2. Lấy danh sách chỉ số theo danh sách MaPhong (dành cho Quản lý cơ sở)
  getByMaPhongList: async (maPhongIds = []) => {
    if (!maPhongIds || maPhongIds.length === 0) return [];
    const placeholders = maPhongIds.map(() => '?').join(',');
    const sql = `
      SELECT MaCS, MaPhong, SoDienCu, SoDienMoi, SoNuocCu, SoNuocMoi,
             DATE_FORMAT(NgayGhi, '%Y-%m-%d') AS NgayGhi
      FROM ChiSoDienNuoc
      WHERE MaPhong IN (${placeholders})
      ORDER BY NgayGhi DESC, MaCS DESC
    `;
    const [rows] = await db.execute(sql, maPhongIds);
    return rows;
  },

  // 3. Lấy chi tiết 1 bản ghi theo MaCS
  getById: async (maCS) => {
    const sql = `
      SELECT MaCS, MaPhong, SoDienCu, SoDienMoi, SoNuocCu, SoNuocMoi,
             DATE_FORMAT(NgayGhi, '%Y-%m-%d') AS NgayGhi
      FROM ChiSoDienNuoc
      WHERE MaCS = ?
      LIMIT 1
    `;
    const [rows] = await db.execute(sql, [maCS]);
    return rows[0] || null;
  },

  // 4. Lấy bản ghi chỉ số gần nhất của 1 phòng (để gợi ý SoDienCu, SoNuocCu khi thêm mới)
  getLatestByMaPhong: async (maPhong) => {
    const sql = `
      SELECT MaCS, MaPhong, SoDienCu, SoDienMoi, SoNuocCu, SoNuocMoi,
             DATE_FORMAT(NgayGhi, '%Y-%m-%d') AS NgayGhi
      FROM ChiSoDienNuoc
      WHERE MaPhong = ?
      ORDER BY NgayGhi DESC, MaCS DESC
      LIMIT 1
    `;
    const [rows] = await db.execute(sql, [maPhong]);
    return rows[0] || null;
  },

  // 5. Kiểm tra trùng kỳ ghi (cùng MaPhong và cùng Tháng/Năm NgayGhi)
  checkExistsInMonth: async (maPhong, ngayGhi, excludeMaCS = null) => {
    let sql = `
      SELECT MaCS, DATE_FORMAT(NgayGhi, '%Y-%m-%d') AS NgayGhi
      FROM ChiSoDienNuoc
      WHERE MaPhong = ?
        AND YEAR(NgayGhi) = YEAR(?)
        AND MONTH(NgayGhi) = MONTH(?)
    `;
    const params = [Number(maPhong), ngayGhi, ngayGhi];

    if (excludeMaCS !== null) {
      sql += ` AND MaCS != ?`;
      params.push(Number(excludeMaCS));
    }

    sql += ` LIMIT 1`;
    const [rows] = await db.execute(sql, params);
    return rows[0] || null;
  },

  // 6. Thêm chỉ số điện nước mới
  create: async ({ MaPhong, SoDienCu, SoDienMoi, SoNuocCu, SoNuocMoi, NgayGhi }) => {
    const sql = `
      INSERT INTO ChiSoDienNuoc (MaPhong, SoDienCu, SoDienMoi, SoNuocCu, SoNuocMoi, NgayGhi)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const [result] = await db.execute(sql, [
      Number(MaPhong),
      Number(SoDienCu),
      Number(SoDienMoi),
      Number(SoNuocCu),
      Number(SoNuocMoi),
      NgayGhi,
    ]);
    return result.insertId;
  },

  // 7. Cập nhật chỉ số điện nước
  update: async (maCS, { MaPhong, SoDienCu, SoDienMoi, SoNuocCu, SoNuocMoi, NgayGhi }) => {
    const sql = `
      UPDATE ChiSoDienNuoc
      SET MaPhong = ?, SoDienCu = ?, SoDienMoi = ?, SoNuocCu = ?, SoNuocMoi = ?, NgayGhi = ?
      WHERE MaCS = ?
    `;
    const [result] = await db.execute(sql, [
      Number(MaPhong),
      Number(SoDienCu),
      Number(SoDienMoi),
      Number(SoNuocCu),
      Number(SoNuocMoi),
      NgayGhi,
      Number(maCS),
    ]);
    return result.affectedRows > 0;
  },

  // 8. Xóa chỉ số điện nước
  delete: async (maCS) => {
    const sql = `DELETE FROM ChiSoDienNuoc WHERE MaCS = ?`;
    const [result] = await db.execute(sql, [Number(maCS)]);
    return result.affectedRows > 0;
  },
};

module.exports = ChiSoDienNuocModel;