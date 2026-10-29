// server/src/app/models/nguoiDung.model.js
const db = require('../../database/db');

const NguoiDungModel = {
  // 1. Tìm người dùng khi đăng nhập (bằng TenTK, Email hoặc SDT)
  findByLoginIdentifier: async (identifier) => {
    const sql = `
      SELECT 
        nd.MaND, nd.TenTK, nd.MatKhau, nd.Quyen,
        tt.MaTT, tt.HoTen, tt.GioiTinh, tt.NamSinh, tt.CCCD, 
        tt.NgayCap, tt.NoiCap, tt.SDT, tt.Email, tt.DiaChi, tt.NgheNghiep
      FROM NguoiDung nd
      LEFT JOIN ThongTinCaNhan tt ON nd.MaND = tt.MaND
      WHERE nd.TenTK = ? OR tt.Email = ? OR tt.SDT = ?
      LIMIT 1
    `;
    const [rows] = await db.execute(sql, [identifier, identifier, identifier]);
    return rows[0] || null;
  },

  findByTenTK: async (tenTK) => {
    const sql = `
      SELECT MaND, TenTK, MatKhau, Quyen
      FROM NguoiDung
      WHERE TenTK = ?
      LIMIT 1
    `;
    const [rows] = await db.execute(sql, [tenTK]);
    return rows[0] || null;
  },

  // 2. Lấy chi tiết người dùng theo MaND
  findById: async (maND) => {
    const sql = `
      SELECT 
        nd.MaND, nd.TenTK, nd.MatKhau, nd.Quyen,
        tt.MaTT, tt.HoTen, tt.GioiTinh, tt.NamSinh, tt.CCCD, 
        tt.NgayCap, tt.NoiCap, tt.SDT, tt.Email, tt.DiaChi, tt.NgheNghiep
      FROM NguoiDung nd
      LEFT JOIN ThongTinCaNhan tt ON nd.MaND = tt.MaND
      WHERE nd.MaND = ?
      LIMIT 1
    `;
    const [rows] = await db.execute(sql, [maND]);
    return rows[0] || null;
  },

  // 3. Lấy danh sách Chủ trọ & Quản lý (phục vụ quản lý Khu trọ)
  getDanhSachQuanLy: async () => {
    const sql = `
      SELECT 
        nd.MaND, nd.TenTK, nd.Quyen,
        COALESCE(tt.HoTen, nd.TenTK) AS HoTen,
        tt.SDT, tt.Email
      FROM NguoiDung nd
      LEFT JOIN ThongTinCaNhan tt ON nd.MaND = tt.MaND
      WHERE nd.Quyen IN ('QuanLy', 'ChuTro')
      ORDER BY nd.Quyen DESC, nd.MaND ASC
    `;
    const [rows] = await db.execute(sql);
    return rows;
  },

  // 4. Lấy danh sách tất cả Khách thuê kèm thông tin cá nhân & phòng đang ở
  getAllKhachThueWithRoom: async () => {
    const sql = `
      SELECT 
        nd.MaND, nd.TenTK, nd.Quyen,
        tt.MaTT, tt.HoTen, tt.GioiTinh, tt.NamSinh, tt.CCCD,
        tt.NgayCap, tt.NoiCap, tt.SDT, tt.Email, tt.DiaChi, tt.NgheNghiep,
        p.MaPhong, p.TenPhong,
        kt.MaKhu, kt.TenKhu, kt.MaND AS MaQuanLyKhu,
        hdt.MaHDT, hdt.TrangThai AS TrangThaiHD,
        ct.VaiTro, ct.TamTru, ct.NgayVao, ct.NgayDi
      FROM NguoiDung nd
      LEFT JOIN ThongTinCaNhan tt ON nd.MaND = tt.MaND
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

  // 5. Kiểm tra trùng TenTK, Email, SDT, CCCD
  checkDuplicateUser: async ({ TenTK, Email, SDT, CCCD }, excludeMaND = null) => {
    let sql = `
      SELECT nd.MaND, nd.TenTK, tt.Email, tt.SDT, tt.CCCD
      FROM NguoiDung nd
      LEFT JOIN ThongTinCaNhan tt ON nd.MaND = tt.MaND
      WHERE (
        (nd.TenTK IS NOT NULL AND nd.TenTK != '' AND nd.TenTK = ?)
        OR (tt.SDT IS NOT NULL AND tt.SDT != '' AND tt.SDT = ?)
        OR (tt.Email IS NOT NULL AND tt.Email != '' AND tt.Email = ?)
        OR (tt.CCCD IS NOT NULL AND tt.CCCD != '' AND tt.CCCD = ?)
      )
    `;
    const params = [TenTK || '', SDT || '', Email || '', CCCD || ''];

    if (excludeMaND) {
      sql += ` AND nd.MaND != ?`;
      params.push(excludeMaND);
    }
    sql += ` LIMIT 1`;

    const [rows] = await db.execute(sql, params);
    return rows[0] || null;
  },

  // 6. Tạo tài khoản Khách thuê mới (Transaction trên NguoiDung + ThongTinCaNhan)
  createKhachThue: async (data) => {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const [ndResult] = await conn.execute(
        `INSERT INTO NguoiDung (TenTK, MatKhau, Quyen) VALUES (?, ?, 'KhachThue')`,
        [data.TenTK, data.MatKhau]
      );
      const newMaND = ndResult.insertId;

      await conn.execute(
        `INSERT INTO ThongTinCaNhan 
          (MaND, HoTen, GioiTinh, NamSinh, CCCD, NgayCap, NoiCap, SDT, Email, DiaChi, NgheNghiep)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newMaND,
          data.HoTen,
          data.GioiTinh || 'Nam',
          data.NamSinh || null,
          data.CCCD || null,
          data.NgayCap || null,
          data.NoiCap || 'Cục Cảnh sát QLHC về TTXH',
          data.SDT,
          data.Email || null,
          data.DiaChi || null,
          data.NgheNghiep || null,
        ]
      );

      await conn.commit();
      return newMaND;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },

  // 7. Cập nhật thông tin Khách thuê (Transaction trên NguoiDung + ThongTinCaNhan)
  updateKhachThue: async (maND, data) => {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      if (data.TenTK) {
        await conn.execute(
          `UPDATE NguoiDung SET TenTK = ? WHERE MaND = ?`,
          [data.TenTK, maND]
        );
      }

      const [existingTT] = await conn.execute(
        `SELECT MaTT FROM ThongTinCaNhan WHERE MaND = ? LIMIT 1`,
        [maND]
      );

      if (existingTT.length > 0) {
        await conn.execute(
          `UPDATE ThongTinCaNhan
           SET HoTen = ?, GioiTinh = ?, NamSinh = ?, CCCD = ?, NgayCap = ?, NoiCap = ?, SDT = ?, Email = ?, DiaChi = ?, NgheNghiep = ?
           WHERE MaND = ?`,
          [
            data.HoTen,
            data.GioiTinh || 'Nam',
            data.NamSinh || null,
            data.CCCD || null,
            data.NgayCap || null,
            data.NoiCap || null,
            data.SDT,
            data.Email || null,
            data.DiaChi || null,
            data.NgheNghiep || null,
            maND,
          ]
        );
      } else {
        await conn.execute(
          `INSERT INTO ThongTinCaNhan
            (MaND, HoTen, GioiTinh, NamSinh, CCCD, NgayCap, NoiCap, SDT, Email, DiaChi, NgheNghiep)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            maND,
            data.HoTen,
            data.GioiTinh || 'Nam',
            data.NamSinh || null,
            data.CCCD || null,
            data.NgayCap || null,
            data.NoiCap || null,
            data.SDT,
            data.Email || null,
            data.DiaChi || null,
            data.NgheNghiep || null,
          ]
        );
      }

      await conn.commit();
      return true;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },

  // 8. Kiểm tra khách thuê có đang có hợp đồng hiệu lực không trước khi xóa
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

  // 9. Xóa tài khoản khách thuê
  deleteKhachThue: async (maND) => {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      await conn.execute(`DELETE FROM ThongTinCaNhan WHERE MaND = ?`, [maND]);
      const [res] = await conn.execute(
        `DELETE FROM NguoiDung WHERE MaND = ? AND Quyen = 'KhachThue'`,
        [maND]
      );
      await conn.commit();
      return res.affectedRows > 0;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },

  // 10. Đổi mật khẩu
  updatePassword: async (maND, hashedPassword) => {
    const sql = `UPDATE NguoiDung SET MatKhau = ? WHERE MaND = ?`;
    const [result] = await db.execute(sql, [hashedPassword, maND]);
    return result.affectedRows > 0;
  },
};

module.exports = NguoiDungModel;