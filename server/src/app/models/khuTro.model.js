// server/src/app/models/khuTro.model.js
const db = require('../../database/db');

const KhuTroModel = {
  // Lấy tất cả khu trọ (Dành cho Chủ trọ)
  getAll: async () => {
    const sql = `
      SELECT MaKhu, MaND, TenKhu, MoTa, DiaChi, MatKhau, MaMoCua
      FROM KhuTro
      ORDER BY MaKhu ASC
    `;
    const [rows] = await db.execute(sql);
    return rows;
  },

  // Lấy danh sách khu trọ theo MaND (Dành cho Quản lý)
  getByMaND: async (maND) => {
    const sql = `
      SELECT MaKhu, MaND, TenKhu, MoTa, DiaChi, MatKhau, MaMoCua
      FROM KhuTro
      WHERE MaND = ?
      ORDER BY MaKhu ASC
    `;
    const [rows] = await db.execute(sql, [maND]);
    return rows;
  },

  // Lấy chi tiết 1 khu trọ theo MaKhu
  getById: async (maKhu) => {
    const sql = `
      SELECT MaKhu, MaND, TenKhu, MoTa, DiaChi, MatKhau, MaMoCua
      FROM KhuTro
      WHERE MaKhu = ?
      LIMIT 1
    `;
    const [rows] = await db.execute(sql, [maKhu]);
    return rows[0] || null;
  },

  // Tìm khu trọ theo mã thẻ NFC đã băm HMAC-SHA256
  findByMaMoCua: async (hashedMaMoCua) => {
    const sql = `
      SELECT MaKhu, MaND, TenKhu, MoTa, DiaChi, MatKhau, MaMoCua
      FROM KhuTro
      WHERE MaMoCua = ?
      LIMIT 1
    `;
    const [rows] = await db.execute(sql, [hashedMaMoCua]);
    return rows[0] || null;
  },

  // Thêm khu trọ mới (MatKhau đã băm Bcrypt, MaMoCua đã băm HMAC-SHA256 từ Controller)
  create: async ({ MaND, TenKhu, MoTa, DiaChi, MatKhau, MaMoCua }) => {
    const sql = `
      INSERT INTO KhuTro (MaND, TenKhu, MoTa, DiaChi, MatKhau, MaMoCua)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const [result] = await db.execute(sql, [
      MaND,
      TenKhu,
      MoTa || '',
      DiaChi,
      MatKhau,
      MaMoCua || null,
    ]);
    return result.insertId;
  },

  // Sửa thông tin cơ bản khu trọ
  update: async (maKhu, { MaND, TenKhu, MoTa, DiaChi }) => {
    const sql = `
      UPDATE KhuTro
      SET MaND = ?, TenKhu = ?, MoTa = ?, DiaChi = ?
      WHERE MaKhu = ?
    `;
    const [result] = await db.execute(sql, [MaND, TenKhu, MoTa || '', DiaChi, maKhu]);
    return result.affectedRows > 0;
  },

  // Đổi mật khẩu mở cửa đã băm Bcrypt
  updateMatKhau: async (maKhu, hashedMatKhau) => {
    const sql = `UPDATE KhuTro SET MatKhau = ? WHERE MaKhu = ?`;
    const [result] = await db.execute(sql, [hashedMatKhau, maKhu]);
    return result.affectedRows > 0;
  },

  // Ghi / cập nhật mã thẻ NFC đã băm HMAC-SHA256
  updateMaMoCua: async (maKhu, hashedMaMoCua) => {
    const sql = `UPDATE KhuTro SET MaMoCua = ? WHERE MaKhu = ?`;
    const [result] = await db.execute(sql, [hashedMaMoCua, maKhu]);
    return result.affectedRows > 0;
  },

  // Xóa khu trọ
  delete: async (maKhu) => {
    const sql = `DELETE FROM KhuTro WHERE MaKhu = ?`;
    const [result] = await db.execute(sql, [maKhu]);
    return result.affectedRows > 0;
  },
};

module.exports = KhuTroModel;