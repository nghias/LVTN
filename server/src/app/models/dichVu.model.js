// server/src/app/models/dichVu.model.js
const db = require('../../database/db');

const DichVuModel = {
  // 1. Lấy danh sách tất cả dịch vụ (hoặc tìm kiếm theo từ khóa)
  getAll: async (keyword = '') => {
    let sql = `
      SELECT MaDV, TenDV, DonGia, DonViTinh, MoTa
      FROM PhiDichVu
    `;
    const params = [];

    if (keyword && keyword.trim() !== '') {
      sql += ` WHERE TenDV LIKE ? OR DonViTinh LIKE ? OR MoTa LIKE ? OR CAST(MaDV AS CHAR) LIKE ?`;
      const searchPattern = `%${keyword.trim()}%`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    sql += ` ORDER BY MaDV ASC`;
    const [rows] = await db.execute(sql, params);
    return rows;
  },

  // 2. Lấy chi tiết 1 dịch vụ theo MaDV
  getById: async (maDV) => {
    const sql = `
      SELECT MaDV, TenDV, DonGia, DonViTinh, MoTa
      FROM PhiDichVu
      WHERE MaDV = ?
      LIMIT 1
    `;
    const [rows] = await db.execute(sql, [maDV]);
    return rows[0] || null;
  },

  // 3. Kiểm tra trùng tên dịch vụ (dùng khi Thêm hoặc Sửa)
  getByName: async (tenDV, excludeMaDV = null) => {
    let sql = `
      SELECT MaDV, TenDV
      FROM PhiDichVu
      WHERE LOWER(TenDV) = LOWER(?)
    `;
    const params = [tenDV.trim()];

    if (excludeMaDV !== null) {
      sql += ` AND MaDV != ?`;
      params.push(excludeMaDV);
    }

    sql += ` LIMIT 1`;
    const [rows] = await db.execute(sql, params);
    return rows[0] || null;
  },

  // 4. Thêm phí dịch vụ mới
  create: async ({ TenDV, DonGia, DonViTinh, MoTa }) => {
    const sql = `
      INSERT INTO PhiDichVu (TenDV, DonGia, DonViTinh, MoTa)
      VALUES (?, ?, ?, ?)
    `;
    const [result] = await db.execute(sql, [
      TenDV.trim(),
      Number(DonGia),
      DonViTinh.trim(),
      MoTa ? MoTa.trim() : '',
    ]);
    return result.insertId;
  },

  // 5. Cập nhật phí dịch vụ
  update: async (maDV, { TenDV, DonGia, DonViTinh, MoTa }) => {
    const sql = `
      UPDATE PhiDichVu
      SET TenDV = ?, DonGia = ?, DonViTinh = ?, MoTa = ?
      WHERE MaDV = ?
    `;
    const [result] = await db.execute(sql, [
      TenDV.trim(),
      Number(DonGia),
      DonViTinh.trim(),
      MoTa ? MoTa.trim() : '',
      maDV,
    ]);
    return result.affectedRows > 0;
  },

  // 6. Xóa phí dịch vụ
  delete: async (maDV) => {
    const sql = `DELETE FROM PhiDichVu WHERE MaDV = ?`;
    const [result] = await db.execute(sql, [maDV]);
    return result.affectedRows > 0;
  },
};

module.exports = DichVuModel;