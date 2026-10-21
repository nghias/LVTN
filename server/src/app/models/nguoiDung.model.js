const db = require('../../database/db');

const NguoiDungModel = {
  // Tìm người dùng theo TenTK, Email hoặc SDT để đăng nhập
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

  // Tìm người dùng theo MaND
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

  // Lấy danh sách Khu trọ mà Quản lý này phụ trách (Bảng KhuTro)
  getManagedKhuTroByMaND: async (maND) => {
    const sql = `
      SELECT MaKhu, TenKhu, DiaChi
      FROM KhuTro
      WHERE MaND = ?
    `;
    const [rows] = await db.execute(sql, [maND]);
    return rows;
  },

  // Lấy thông tin Phòng và Hợp đồng đang hiệu lực của Khách thuê
  getActiveRoomByKhachThue: async (maND) => {
    const sql = `
      SELECT 
        p.MaPhong, p.TenPhong, p.MaKhu, kt.TenKhu,
        hdt.MaHDT, ct.VaiTro, ct.TamTru
      FROM ChiTietHopDongThue ct
      INNER JOIN HopDongThue hdt ON ct.MaHDT = hdt.MaHDT
      INNER JOIN Phong p ON hdt.MaPhong = p.MaPhong
      INNER JOIN KhuTro kt ON p.MaKhu = kt.MaKhu
      WHERE ct.MaND = ? 
        AND hdt.TrangThai = 'ConHieuLuc' 
        AND ct.NgayDi IS NULL
      LIMIT 1
    `;
    const [rows] = await db.execute(sql, [maND]);
    return rows[0] || null;
  },

  // Cập nhật mật khẩu mới
  updatePassword: async (maND, hashedPassword) => {
    const sql = `UPDATE NguoiDung SET MatKhau = ? WHERE MaND = ?`;
    const [result] = await db.execute(sql, [hashedPassword, maND]);
    return result.affectedRows > 0;
  },
};

module.exports = NguoiDungModel;