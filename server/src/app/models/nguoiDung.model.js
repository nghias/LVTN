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
  // Tìm tài khoản theo địa chỉ Email đăng ký
  findByEmail: async (email) => {
    const sql = `
      SELECT MaND, HoTen, Email, TenTK, MatKhau, Quyen
      FROM NguoiDung
      WHERE LOWER(Email) = LOWER(?)
      LIMIT 1
    `;
    const [rows] = await db.execute(sql, [email.trim()]);
    return rows[0] || null;
  },

  // Cập nhật mật khẩu mới đã băm vào bảng NguoiDung
  updatePassword: async (maND, hashedPassword) => {
    const sql = `UPDATE NguoiDung SET MatKhau = ? WHERE MaND = ?`;
    const [result] = await db.execute(sql, [hashedPassword, maND]);
    return result.affectedRows > 0;
  },

  getAllKhachThueWithRoom: async () => {
    const sql = `
      SELECT 
        nd.MaND, nd.HoTen, nd.CCCD, nd.NamSinh, nd.SDT, nd.Email, nd.DiaChi, nd.TenTK, nd.Quyen,
        p.MaPhong, p.TenPhong,
        kt.MaKhu, kt.TenKhu, kt.MaND AS MaQuanLyKhu,
        hdt.MaHDT, hdt.TrangThai AS TrangThaiHD,
        ct.VaiTro, ct.TamTru, ct.NgayVao, ct.NgayDi
      FROM NguoiDung nd
      LEFT JOIN ChiTietHopDongThue ct ON nd.MaND = ct.MaND AND ct.NgayDi IS NULL
      LEFT JOIN HopDongThue hdt ON ct.MaHDT = hdt.MaHDT AND hdt.TrangThai = 'ConHieuLuc'
      LEFT JOIN Phong p ON hdt.MaPhong = p.MaPhong
      LEFT JOIN KhuTro kt ON p.MaKhu = kt.MaKhu
      WHERE nd.Quyen = 'KhachThue'
      ORDER BY nd.MaND DESC
    `;
    const [rows] = await db.execute(sql);
    return rows;
  },

  // 2. Kiểm tra trùng TenTK, CCCD, SDT, Email (trừ chính mình khi sửa)
  checkDuplicateField: async (field, value, excludeMaND = null) => {
    if (!value) return false;
    let sql = `SELECT MaND FROM NguoiDung WHERE ${field} = ?`;
    const params = [value];
    if (excludeMaND) {
      sql += ` AND MaND != ?`;
      params.push(excludeMaND);
    }
    const [rows] = await db.execute(sql, params);
    return rows.length > 0;
  },

  // 3. Tạo tài khoản Khách thuê mới
  createKhachThue: async (data) => {
    const sql = `
      INSERT INTO NguoiDung (HoTen, CCCD, NamSinh, SDT, Email, DiaChi, TenTK, MatKhau, Quyen)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'KhachThue')
    `;
    const [result] = await db.execute(sql, [
      data.HoTen,
      data.CCCD,
      data.NamSinh,
      data.SDT,
      data.Email,
      data.DiaChi,
      data.TenTK,
      data.MatKhau,
    ]);
    return result.insertId;
  },

  // 4. Cập nhật thông tin tài khoản Khách thuê
  updateKhachThue: async (maND, data) => {
    const sql = `
      UPDATE NguoiDung
      SET HoTen = ?, CCCD = ?, NamSinh = ?, SDT = ?, Email = ?, DiaChi = ?, TenTK = ?
      WHERE MaND = ? AND Quyen = 'KhachThue'
    `;
    const [result] = await db.execute(sql, [
      data.HoTen,
      data.CCCD,
      data.NamSinh,
      data.SDT,
      data.Email,
      data.DiaChi,
      data.TenTK,
      maND,
    ]);
    return result.affectedRows > 0;
  },

  // 5. Kiểm tra khách thuê có đang trong hợp đồng hiệu lực không
  hasActiveContract: async (maND) => {
    const sql = `
      SELECT ct.MaCTHDT
      FROM ChiTietHopDongThue ct
      INNER JOIN HopDongThue hdt ON ct.MaHDT = hdt.MaHDT
      WHERE ct.MaND = ? AND hdt.TrangThai = 'ConHieuLuc' AND ct.NgayDi IS NULL
      LIMIT 1
    `;
    const [rows] = await db.execute(sql, [maND]);
    return rows.length > 0;
  },

  // 6. Xóa tài khoản Khách thuê
  deleteKhachThue: async (maND) => {
    const sql = `DELETE FROM NguoiDung WHERE MaND = ? AND Quyen = 'KhachThue'`;
    const [result] = await db.execute(sql, [maND]);
    return result.affectedRows > 0;
  },
};

module.exports = NguoiDungModel;