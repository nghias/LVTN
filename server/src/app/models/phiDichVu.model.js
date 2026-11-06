const db = require("../../database/db");

const PhiDichVuModel = {
  // Lấy tất cả dịch vụ / phụ phí
  getAll: async () => {
    const sql = `
      SELECT MaDV, TenDV, DonGia, DonViTinh, MoTa
      FROM PhiDichVu
      ORDER BY MaDV ASC
    `;
    const [rows] = await db.execute(sql);
    return rows;
  },

  // Lấy dịch vụ theo MaDV
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

  // Thêm dịch vụ mới
  create: async ({ TenDV, DonGia, DonViTinh, MoTa }) => {
    const sql = `
      INSERT INTO PhiDichVu (TenDV, DonGia, DonViTinh, MoTa)
      VALUES (?, ?, ?, ?)
    `;
    const [result] = await db.execute(sql, [TenDV, DonGia, DonViTinh, MoTa]);
    return result.insertId;
  },

  // Cập nhật dịch vụ
  update: async (maDV, { TenDV, DonGia, DonViTinh, MoTa }) => {
    const sql = `
      UPDATE PhiDichVu
      SET TenDV = ?, DonGia = ?, DonViTinh = ?, MoTa = ?
      WHERE MaDV = ?
    `;
    const [result] = await db.execute(sql, [TenDV, DonGia, DonViTinh, MoTa, maDV]);
    return result.affectedRows > 0;
  },

  // Xóa dịch vụ
  delete: async (maDV) => {
    const sql = `DELETE FROM PhiDichVu WHERE MaDV = ?`;
    const [result] = await db.execute(sql, [maDV]);
    return result.affectedRows > 0;
  },
};

module.exports = PhiDichVuModel;