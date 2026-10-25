// server/src/app/models/tienIch.model.js
const db = require('../../database/db');

const TienIchModel = {
  // 1. Lấy danh sách tất cả tiện ích (hoặc tìm kiếm theo từ khóa)
  getAll: async (keyword = '') => {
    let sql = `
      SELECT MaTI, TenTI, MoTa
      FROM TienIch
    `;
    const params = [];

    if (keyword && keyword.trim() !== '') {
      sql += ` WHERE TenTI LIKE ? OR MoTa LIKE ? OR CAST(MaTI AS CHAR) LIKE ?`;
      const searchPattern = `%${keyword.trim()}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    sql += ` ORDER BY MaTI ASC`;
    const [rows] = await db.execute(sql, params);
    return rows;
  },

  // 2. Lấy chi tiết 1 tiện ích theo MaTI
  getById: async (maTI) => {
    const sql = `
      SELECT MaTI, TenTI, MoTa
      FROM TienIch
      WHERE MaTI = ?
      LIMIT 1
    `;
    const [rows] = await db.execute(sql, [maTI]);
    return rows[0] || null;
  },

  // 3. Kiểm tra trùng tên tiện ích (dùng khi Thêm hoặc Sửa)
  getByName: async (tenTI, excludeMaTI = null) => {
    let sql = `
      SELECT MaTI, TenTI, MoTa
      FROM TienIch
      WHERE LOWER(TenTI) = LOWER(?)
    `;
    const params = [tenTI.trim()];

    if (excludeMaTI !== null) {
      sql += ` AND MaTI != ?`;
      params.push(excludeMaTI);
    }

    sql += ` LIMIT 1`;
    const [rows] = await db.execute(sql, params);
    return rows[0] || null;
  },

  // 4. Thêm tiện ích mới
  create: async ({ TenTI, MoTa }) => {
    const sql = `
      INSERT INTO TienIch (TenTI, MoTa)
      VALUES (?, ?)
    `;
    const [result] = await db.execute(sql, [
      TenTI.trim(),
      MoTa ? MoTa.trim() : '',
    ]);
    return result.insertId;
  },

  // 5. Cập nhật tiện ích
  update: async (maTI, { TenTI, MoTa }) => {
    const sql = `
      UPDATE TienIch
      SET TenTI = ?, MoTa = ?
      WHERE MaTI = ?
    `;
    const [result] = await db.execute(sql, [
      TenTI.trim(),
      MoTa ? MoTa.trim() : '',
      maTI,
    ]);
    return result.affectedRows > 0;
  },

  // 6. Xóa tiện ích
  delete: async (maTI) => {
    const sql = `DELETE FROM TienIch WHERE MaTI = ?`;
    const [result] = await db.execute(sql, [maTI]);
    return result.affectedRows > 0;
  },
};

module.exports = TienIchModel;