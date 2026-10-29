// server/src/app/models/nguoiDung.model.js
const db = require('../../database/db');

const NguoiDungModel = {
  // 1. Lấy tất cả tài khoản người dùng
  getAll: async () => {
    const sql = `
      SELECT MaND, TenTK, Quyen
      FROM NguoiDung
      ORDER BY MaND DESC
    `;
    const [rows] = await db.execute(sql);
    return rows;
  },

  // 2. Lấy danh sách tài khoản theo Quyền (VD: 'KhachThue')
  getByQuyen: async (quyen) => {
    const sql = `
      SELECT MaND, TenTK, Quyen
      FROM NguoiDung
      WHERE Quyen = ?
      ORDER BY MaND DESC
    `;
    const [rows] = await db.execute(sql, [quyen]);
    return rows;
  },

  // 3. Lấy danh sách tài khoản Chủ trọ & Quản lý
  getDanhSachQuanLy: async () => {
    const sql = `
      SELECT MaND, TenTK, Quyen
      FROM NguoiDung
      WHERE Quyen IN ('QuanLy', 'ChuTro')
      ORDER BY Quyen DESC, MaND ASC
    `;
    const [rows] = await db.execute(sql);
    return rows;
  },

  // 4. Tìm tài khoản theo MaND (Có lấy MatKhau để kiểm tra khi đổi mật khẩu)
  findById: async (maND) => {
    const sql = `
      SELECT MaND, TenTK, MatKhau, Quyen
      FROM NguoiDung
      WHERE MaND = ?
      LIMIT 1
    `;
    const [rows] = await db.execute(sql, [maND]);
    return rows[0] || null;
  },

  // 5. Tìm tài khoản theo TenTK (Dùng khi đăng nhập)
  findByTenTK: async (tenTK) => {
    const sql = `
      SELECT MaND, TenTK, MatKhau, Quyen
      FROM NguoiDung
      WHERE TenTK = ?
      LIMIT 1
    `;
    const [rows] = await db.execute(sql, [String(tenTK).trim()]);
    return rows[0] || null;
  },

  // 6. Kiểm tra trùng Tên tài khoản (trừ chính maND đang sửa)
  checkDuplicateTenTK: async (maND, tenTK) => {
    if (!tenTK || String(tenTK).trim() === '') return null;
    const sql = `
      SELECT MaND, TenTK
      FROM NguoiDung
      WHERE MaND != ? AND TenTK = ?
      LIMIT 1
    `;
    const [rows] = await db.execute(sql, [
      Number(maND) || 0,
      String(tenTK).trim(),
    ]);
    return rows[0] || null;
  },

  // 7. Tạo tài khoản mới trong bảng NguoiDung
  create: async ({ TenTK, MatKhau, Quyen = 'KhachThue' }) => {
    const sql = `
      INSERT INTO NguoiDung (TenTK, MatKhau, Quyen)
      VALUES (?, ?, ?)
    `;
    const [result] = await db.execute(sql, [
      String(TenTK).trim(),
      MatKhau,
      Quyen,
    ]);
    return result.insertId;
  },

  // 8. Cập nhật Tên tài khoản hoặc Quyền
  update: async (maND, { TenTK, Quyen }) => {
    const sql = `
      UPDATE NguoiDung
      SET TenTK = COALESCE(?, TenTK),
          Quyen = COALESCE(?, Quyen)
      WHERE MaND = ?
    `;
    const [result] = await db.execute(sql, [
      TenTK ? String(TenTK).trim() : null,
      Quyen || null,
      Number(maND),
    ]);
    return result.affectedRows > 0;
  },

  // 9. Cập nhật mật khẩu mới
  updatePassword: async (maND, hashedPassword) => {
    const sql = `
      UPDATE NguoiDung
      SET MatKhau = ?
      WHERE MaND = ?
    `;
    const [result] = await db.execute(sql, [hashedPassword, Number(maND)]);
    return result.affectedRows > 0;
  },

  // 10. Xóa tài khoản theo MaND
  delete: async (maND) => {
    const sql = `
      DELETE FROM NguoiDung
      WHERE MaND = ?
    `;
    const [result] = await db.execute(sql, [Number(maND)]);
    return result.affectedRows > 0;
  },
};

module.exports = NguoiDungModel;