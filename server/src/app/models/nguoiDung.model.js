const db = require('../../database/db');

const NguoiDungModel = {
  findByLoginIdentifier: async (identifier) => {
    const sql = `
      SELECT MaND, HoTen, CCCD, NamSinh, SDT, Email, DiaChi, TenTK, MatKhau, Quyen
      FROM NguoiDung
      WHERE TenTK = ? OR Email = ? OR SDT = ?
      LIMIT 1
    `;
    const [rows] = await db.execute(sql, [identifier, identifier, identifier]);
    return rows[0] || null;
  },

  findById: async (maND) => {
    const sql = `
      SELECT MaND, HoTen, CCCD, NamSinh, SDT, Email, DiaChi, TenTK, MatKhau, Quyen
      FROM NguoiDung
      WHERE MaND = ?
      LIMIT 1
    `;
    const [rows] = await db.execute(sql, [maND]);
    return rows[0] || null;
  },

  getDanhSachQuanLy: async () => {
    const sql = `
      SELECT MaND, HoTen, SDT, Email, Quyen
      FROM NguoiDung
      WHERE Quyen IN ('QuanLy', 'ChuTro')
      ORDER BY Quyen DESC, MaND ASC
    `;
    const [rows] = await db.execute(sql);
    return rows;
  },

  // Kiểm tra Email, SĐT hoặc CCCD có bị trùng với tài khoản khác không
  // Kiểm tra trùng Email, SĐT, CCCD với người dùng khác (trừ chính maND đang sửa)
  checkDuplicateProfile: async (maND, { Email, SDT, CCCD }) => {
    const sql = `
      SELECT MaND, Email, SDT, CCCD
      FROM NguoiDung
      WHERE MaND != ?
        AND (
          (Email IS NOT NULL AND Email != '' AND Email = ?)
          OR (SDT IS NOT NULL AND SDT != '' AND SDT = ?)
          OR (CCCD IS NOT NULL AND CCCD != '' AND CCCD = ?)
        )
      LIMIT 1
    `;
    const [rows] = await db.execute(sql, [maND, Email || '', SDT || '', CCCD || '']);
    return rows[0] || null;
  },

  // Cập nhật thông tin cá nhân (Không cho phép sửa TenTK, Quyen, MatKhau tại đây)
  updateProfile: async (maND, { HoTen, CCCD, NamSinh, SDT, Email, DiaChi }) => {
    const sql = `
      UPDATE NguoiDung
      SET HoTen = ?, CCCD = ?, NamSinh = ?, SDT = ?, Email = ?, DiaChi = ?
      WHERE MaND = ?
    `;
    const [result] = await db.execute(sql, [
      HoTen,
      CCCD,
      NamSinh,
      SDT,
      Email,
      DiaChi,
      maND,
    ]);
    return result.affectedRows > 0;
  },

  updatePassword: async (maND, hashedPassword) => {
    const sql = `UPDATE NguoiDung SET MatKhau = ? WHERE MaND = ?`;
    const [result] = await db.execute(sql, [hashedPassword, maND]);
    return result.affectedRows > 0;
  },
};

module.exports = NguoiDungModel;