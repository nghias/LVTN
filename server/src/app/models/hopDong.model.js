// C:\Users\nhat nguyen\Desktop\LVTN\server\src\app\models\hopDong.model.js
const db = require('../../database/db');

const HopDongModel = {
  // 0. Các hàm phục vụ xác thực và phân quyền ChuTro / QuanLy
  getNguoiDungById: async (maND) => {
    const [rows] = await db.execute(
      `SELECT MaND, TenTK, Quyen FROM nguoidung WHERE MaND = ? LIMIT 1`,
      [maND]
    );
    return rows[0] || null;
  },

  getHopDongCoBanById: async (maHDT) => {
    const [rows] = await db.execute(
      `SELECT MaHDT, MaPhong, TrangThai FROM hopdongthue WHERE MaHDT = ? LIMIT 1`,
      [maHDT]
    );
    return rows[0] || null;
  },

  checkPhongThuocQuanLy: async (maPhong, maND) => {
    const [rows] = await db.execute(
      `SELECT 1
       FROM phong p
       INNER JOIN khutro kt ON p.MaKhu = kt.MaKhu
       WHERE p.MaPhong = ? AND kt.MaND = ?
       LIMIT 1`,
      [maPhong, maND]
    );
    return rows.length > 0;
  },

  checkHopDongThuocQuanLy: async (maHDT, maND) => {
    const [rows] = await db.execute(
      `SELECT 1
       FROM hopdongthue hdt
       INNER JOIN phong p ON hdt.MaPhong = p.MaPhong
       INNER JOIN khutro kt ON p.MaKhu = kt.MaKhu
       WHERE hdt.MaHDT = ? AND kt.MaND = ?
       LIMIT 1`,
      [maHDT, maND]
    );
    return rows.length > 0;
  },

  // 1. Lấy danh sách hợp đồng + Tìm kiếm hợp đồng (Phân quyền theo ChuTro / QuanLy)
  getDanhSachHopDong: async ({
    tuKhoa = '',
    trangThai = '',
    maKhu = '',
    maPhong = '',
    maND = null,
    quyen = '',
  }) => {
    let sql = `
      SELECT 
        hdt.MaHDT, hdt.MaPhong, hdt.MaHDTCu, hdt.NgayBD, hdt.NgayKT, hdt.NgayKy, 
        hdt.TienCoc, hdt.TrangThai,
        p.TenPhong, p.DienTich, p.Gia AS GiaPhong, p.TrangThai AS TrangThaiPhong,
        kt.MaKhu, kt.TenKhu, kt.DiaChi AS DiaChiKhu,
        ndDaiDien.MaND AS MaNDDaiDien,
        COALESCE(ttcnDaiDien.HoTen, ndDaiDien.TenTK) AS TenDaiDien, 
        ttcnDaiDien.SDT AS SDTDaiDien,
        ttcnDaiDien.CCCD AS CCCDDaiDien,
        (
          SELECT COUNT(*) 
          FROM chitiethopdongthue ct 
          WHERE ct.MaHDT = hdt.MaHDT AND ct.NgayDi IS NULL
        ) AS SoThanhVien
      FROM hopdongthue hdt
      INNER JOIN phong p ON hdt.MaPhong = p.MaPhong
      INNER JOIN khutro kt ON p.MaKhu = kt.MaKhu
      LEFT JOIN chitiethopdongthue ctdd 
        ON hdt.MaHDT = ctdd.MaHDT AND ctdd.VaiTro = 'DaiDien'
      LEFT JOIN nguoidung ndDaiDien 
        ON ctdd.MaND = ndDaiDien.MaND
      LEFT JOIN thongtincanhan ttcnDaiDien 
        ON ndDaiDien.MaND = ttcnDaiDien.MaND
      WHERE 1=1
    `;
    const params = [];

    // Nếu không phải Chủ trọ thì chỉ lấy hợp đồng thuộc khu trọ do người đó quản lý
    if (quyen !== 'ChuTro') {
      sql += ` AND kt.MaND = ?`;
      params.push(maND);
    }

    if (trangThai) {
      sql += ` AND hdt.TrangThai = ?`;
      params.push(trangThai);
    }
    if (maKhu) {
      sql += ` AND kt.MaKhu = ?`;
      params.push(maKhu);
    }
    if (maPhong) {
      sql += ` AND p.MaPhong = ?`;
      params.push(maPhong);
    }
    if (tuKhoa && tuKhoa.trim() !== '') {
      const kw = `%${tuKhoa.trim()}%`;
      sql += `
        AND (
          CAST(hdt.MaHDT AS CHAR) LIKE ?
          OR p.TenPhong LIKE ?
          OR kt.TenKhu LIKE ?
          OR EXISTS (
            SELECT 1 
            FROM chitiethopdongthue ct2
            INNER JOIN nguoidung nd2 ON ct2.MaND = nd2.MaND
            LEFT JOIN thongtincanhan ttcn2 ON nd2.MaND = ttcn2.MaND
            WHERE ct2.MaHDT = hdt.MaHDT
              AND (
                ttcn2.HoTen LIKE ? 
                OR ttcn2.SDT LIKE ? 
                OR ttcn2.CCCD LIKE ?
                OR nd2.TenTK LIKE ?
              )
          )
        )
      `;
      params.push(kw, kw, kw, kw, kw, kw, kw);
    }

    sql += ` ORDER BY hdt.MaHDT DESC`;
    const [rows] = await db.execute(sql, params);
    return rows;
  },

  // 2. Lấy chi tiết đầy đủ của 1 hợp đồng để hiển thị PDF và xuất bản cứng
  getChiTietHopDongById: async (maHDT) => {
    const sqlHopDong = `
      SELECT 
        hdt.MaHDT, hdt.MaPhong, hdt.MaHDTCu, hdt.NgayBD, hdt.NgayKT, hdt.NgayKy, 
        hdt.TienCoc, hdt.TrangThai,
        p.TenPhong, p.DienTich, p.Gia AS GiaPhong, p.TrangThai AS TrangThaiPhong,
        kt.MaKhu, kt.TenKhu, kt.DiaChi AS DiaChiKhuTro,
        chuTro.MaND AS MaChuTro,
        COALESCE(ttcnChuTro.HoTen, chuTro.TenTK) AS TenChuTro,
        ttcnChuTro.GioiTinh AS GioiTinhChuTro,
        ttcnChuTro.CCCD AS CCCDChuTro,
        ttcnChuTro.NgayCap AS NgayCapChuTro,
        ttcnChuTro.NoiCap AS NoiCapChuTro,
        ttcnChuTro.NamSinh AS NamSinhChuTro,
        ttcnChuTro.SDT AS SDTChuTro, 
        ttcnChuTro.Email AS EmailChuTro,
        ttcnChuTro.DiaChi AS DiaChiChuTro
      FROM hopdongthue hdt
      INNER JOIN phong p ON hdt.MaPhong = p.MaPhong
      INNER JOIN khutro kt ON p.MaKhu = kt.MaKhu
      INNER JOIN nguoidung chuTro ON kt.MaND = chuTro.MaND
      LEFT JOIN thongtincanhan ttcnChuTro ON chuTro.MaND = ttcnChuTro.MaND
      WHERE hdt.MaHDT = ?
      LIMIT 1
    `;
    const [hdRows] = await db.execute(sqlHopDong, [maHDT]);
    if (!hdRows.length) return null;
    const hopDong = hdRows[0];

    const [nganHangRows] = await db.execute(
      `SELECT TenNganHang, STK, ChuTaiKhoan FROM thongtinthanhtoan WHERE MaND = ? LIMIT 1`,
      [hopDong.MaChuTro]
    );
    hopDong.ThongTinThanhToan = nganHangRows[0] || null;

    const sqlThanhVien = `
      SELECT 
        ct.MaND, ct.MaHDT, ct.NgayVao, ct.NgayDi, ct.VaiTro, ct.TamTru,
        COALESCE(ttcn.HoTen, nd.TenTK) AS HoTen,
        ttcn.GioiTinh,
        ttcn.CCCD,
        ttcn.NgayCap,
        ttcn.NoiCap,
        ttcn.NamSinh,
        ttcn.SDT,
        ttcn.Email,
        ttcn.DiaChi,
        ttcn.NgheNghiep,
        GROUP_CONCAT(trv.GiaTri SEPARATOR ', ') AS DanhSachMaThe,
        COUNT(trv.MaThe) AS SoLuongThe
      FROM chitiethopdongthue ct
      INNER JOIN nguoidung nd ON ct.MaND = nd.MaND
      LEFT JOIN thongtincanhan ttcn ON nd.MaND = ttcn.MaND
      LEFT JOIN theravao trv ON nd.MaND = trv.MaND AND trv.TrangThai = 'HoatDong'
      WHERE ct.MaHDT = ?
      GROUP BY 
        ct.MaND, ct.MaHDT, ct.NgayVao, ct.NgayDi, ct.VaiTro, ct.TamTru,
        nd.TenTK, ttcn.HoTen, ttcn.GioiTinh, ttcn.CCCD, ttcn.NgayCap, ttcn.NoiCap,
        ttcn.NamSinh, ttcn.SDT, ttcn.Email, ttcn.DiaChi, ttcn.NgheNghiep
      ORDER BY CASE WHEN ct.VaiTro = 'DaiDien' THEN 0 ELSE 1 END, ct.NgayVao ASC
    `;
    const [thanhVienRows] = await db.execute(sqlThanhVien, [maHDT]);
    hopDong.DanhSachThanhVien = thanhVienRows;

    const sqlThanhVienCungPhong = `
      SELECT DISTINCT
        ct.MaND, ct.MaHDT, ct.NgayVao, ct.NgayDi, ct.VaiTro, ct.TamTru,
        COALESCE(ttcn.HoTen, nd.TenTK) AS HoTen,
        ttcn.GioiTinh,
        ttcn.CCCD,
        ttcn.NgayCap,
        ttcn.NoiCap,
        ttcn.NamSinh,
        ttcn.SDT,
        ttcn.Email,
        ttcn.DiaChi,
        ttcn.NgheNghiep
      FROM chitiethopdongthue ct
      INNER JOIN hopdongthue hdt ON ct.MaHDT = hdt.MaHDT
      INNER JOIN nguoidung nd ON ct.MaND = nd.MaND
      LEFT JOIN thongtincanhan ttcn ON nd.MaND = ttcn.MaND
      WHERE hdt.MaPhong = ? AND hdt.TrangThai = 'ConHieuLuc' AND ct.NgayDi IS NULL
      ORDER BY ct.MaHDT ASC
    `;
    const [cungPhongRows] = await db.execute(sqlThanhVienCungPhong, [hopDong.MaPhong]);
    hopDong.ThanhVienCungPhong = cungPhongRows;

    const [tienIchRows] = await db.execute(
      `SELECT ti.MaTI, ti.TenTI, ti.MoTa
       FROM chitiettienich ctti
       INNER JOIN tienich ti ON ctti.MaTI = ti.MaTI
       WHERE ctti.MaPhong = ?`,
      [hopDong.MaPhong]
    );
    hopDong.DanhSachTienIch = tienIchRows;

    const [phiDichVuRows] = await db.execute(
      `SELECT 
         pdv.MaDV AS MaPDV,
         pdv.MaDV,
         pdv.TenDV AS TenPDV,
         pdv.TenDV,
         pdv.DonGia AS Gia,
         pdv.DonGia,
         pdv.DonViTinh,
         pdv.MoTa AS GhiChu,
         pdv.MoTa,
         ctpdv.SoLuong
       FROM chitietphidichvu ctpdv
       INNER JOIN phidichvu pdv ON ctpdv.MaDV = pdv.MaDV
       WHERE ctpdv.MaHDT = ?`,
      [maHDT]
    );
    hopDong.DanhSachPhiDichVu = phiDichVuRows;

    const [giaDienNuocRows] = await db.execute(
      `SELECT MaGia, GiaDien, GiaNuoc, NgayApDung 
       FROM giadiennuoc 
       ORDER BY NgayApDung DESC, MaGia DESC LIMIT 1`
    );
    hopDong.GiaDienNuoc = giaDienNuocRows[0] || { GiaDien: 3500, GiaNuoc: 15000 };

    const [chiSoDauRows] = await db.execute(
      `SELECT MaCS, SoDienCu, SoDienMoi, SoNuocCu, SoNuocMoi, NgayGhi
       FROM chisodiennuoc
       WHERE MaPhong = ?
       ORDER BY ABS(DATEDIFF(NgayGhi, ?)) ASC, MaCS DESC
       LIMIT 1`,
      [hopDong.MaPhong, hopDong.NgayBD]
    );
    hopDong.ChiSoBanGiao = chiSoDauRows[0] || {
      SoDienCu: 0,
      SoDienMoi: 0,
      SoNuocCu: 0,
      SoNuocMoi: 0,
      NgayGhi: hopDong.NgayBD,
    };

    const [hoaDonRows] = await db.execute(
      `SELECT 
         hd.*, csdn.SoDienCu, csdn.SoDienMoi, csdn.SoNuocCu, csdn.SoNuocMoi, csdn.NgayGhi,
         gdn.GiaDien, gdn.GiaNuoc
       FROM hoadon hd
       INNER JOIN chisodiennuoc csdn ON hd.MaCS = csdn.MaCS
       INNER JOIN giadiennuoc gdn ON hd.MaGia = gdn.MaGia
       WHERE hd.MaPhong = ?
       ORDER BY hd.NgayTinh DESC, hd.MaHD DESC
       LIMIT 1`,
      [hopDong.MaPhong]
    );
    hopDong.HoaDonMoiNhat = hoaDonRows[0] || null;

    return hopDong;
  },

  // 3. Lấy dữ liệu khởi tạo cho Modal Tạo/Sửa hợp đồng (Lọc phòng & HĐ cũ theo quyền)
  getDuLieuTaoMoi: async (maND = null, quyen = '') => {
    let sqlPhong = `
      SELECT p.MaPhong, p.MaKhu, p.TenPhong, p.DienTich, p.Gia, p.TrangThai, kt.TenKhu, kt.DiaChi
      FROM phong p
      INNER JOIN khutro kt ON p.MaKhu = kt.MaKhu
    `;
    const paramsPhong = [];
    if (quyen && quyen !== 'ChuTro') {
      sqlPhong += ` WHERE kt.MaND = ?`;
      paramsPhong.push(maND);
    }
    sqlPhong += ` ORDER BY kt.MaKhu ASC, p.TenPhong ASC`;
    const [danhSachPhong] = await db.execute(sqlPhong, paramsPhong);

    const [danhSachKhachThue] = await db.execute(`
      SELECT 
        nd.MaND,
        nd.TenTK,
        COALESCE(ttcn.HoTen, nd.TenTK) AS HoTen,
        ttcn.GioiTinh,
        ttcn.CCCD,
        ttcn.NgayCap,
        ttcn.NoiCap,
        ttcn.NamSinh,
        ttcn.SDT,
        ttcn.Email,
        ttcn.DiaChi,
        ttcn.NgheNghiep
      FROM nguoidung nd
      LEFT JOIN thongtincanhan ttcn ON nd.MaND = ttcn.MaND
      WHERE nd.Quyen = 'KhachThue'
      ORDER BY ttcn.HoTen ASC, nd.MaND DESC
    `);

    const [danhSachPhiDichVu] = await db.execute(`
      SELECT 
        MaDV AS MaPDV,
        MaDV,
        TenDV AS TenPDV,
        TenDV,
        DonGia AS Gia,
        DonGia,
        DonViTinh,
        MoTa AS GhiChu,
        MoTa
      FROM phidichvu
      ORDER BY MaDV ASC
    `);

    const [giaDienNuoc] = await db.execute(`
      SELECT MaGia, GiaDien, GiaNuoc, NgayApDung
      FROM giadiennuoc
      ORDER BY NgayApDung DESC, MaGia DESC LIMIT 1
    `);

    let sqlHopDongCu = `
      SELECT hdt.MaHDT, hdt.MaPhong, p.TenPhong, hdt.NgayBD, hdt.NgayKT, hdt.TrangThai
      FROM hopdongthue hdt
      INNER JOIN phong p ON hdt.MaPhong = p.MaPhong
      INNER JOIN khutro kt ON p.MaKhu = kt.MaKhu
    `;
    const paramsHopDongCu = [];
    if (quyen && quyen !== 'ChuTro') {
      sqlHopDongCu += ` WHERE kt.MaND = ?`;
      paramsHopDongCu.push(maND);
    }
    sqlHopDongCu += ` ORDER BY hdt.MaHDT DESC`;
    const [danhSachHopDongCu] = await db.execute(sqlHopDongCu, paramsHopDongCu);

    return {
      danhSachPhong,
      danhSachKhachThue,
      danhSachPhiDichVu,
      giaDienNuoc: giaDienNuoc[0] || { GiaDien: 3500, GiaNuoc: 15000 },
      danhSachHopDongCu,
    };
  },

  // 4. Tạo hợp đồng mới (Hỗ trợ cả 2 chế độ: "DaiDienChung" và "TachHopDongRieng")
  createHopDong: async (payload) => {
    const {
      MaPhong,
      MaHDTCu = null,
      NgayBD,
      NgayKT,
      NgayKy,
      TienCoc,
      TrangThai = 'ConHieuLuc',
      KieuHopDong = 'DaiDienChung',
      DanhSachThanhVien = [],
      DanhSachMaPDV = [],
      ChiSoDienBanGiao = null,
      ChiSoNuocBanGiao = null,
    } = payload;

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const danhSachTVDuyNhat = [];
      const tapMaND = new Set();
      for (const tv of DanhSachThanhVien) {
        const idND = Number(tv.MaND);
        if (idND > 0 && !tapMaND.has(idND)) {
          tapMaND.add(idND);
          danhSachTVDuyNhat.push(tv);
        }
      }

      const mapDichVu = new Map();
      for (const item of DanhSachMaPDV) {
        const rawMaDV = typeof item === 'object' && item !== null ? (item.MaDV ?? item.MaPDV) : item;
        const maDV = Number(rawMaDV);
        const soLuong =
          typeof item === 'object' && item !== null && item.SoLuong
            ? Math.max(1, Number(item.SoLuong))
            : 1;
        if (!Number.isNaN(maDV) && maDV > 0) {
          mapDichVu.set(maDV, soLuong);
        }
      }

      const danhSachMaHDTTaoMoi = [];

      if (KieuHopDong === 'TachHopDongRieng') {
        for (const tv of danhSachTVDuyNhat) {
          const [resHD] = await conn.execute(
            `INSERT INTO hopdongthue (MaPhong, MaHDTCu, NgayBD, NgayKT, NgayKy, TienCoc, TrangThai)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [MaPhong, MaHDTCu || null, NgayBD, NgayKT, NgayKy, TienCoc || 0, TrangThai]
          );
          const maHDTMoi = resHD.insertId;
          danhSachMaHDTTaoMoi.push(maHDTMoi);

          await conn.execute(
            `INSERT INTO chitiethopdongthue (MaND, MaHDT, NgayVao, NgayDi, VaiTro, TamTru)
             VALUES (?, ?, ?, ?, 'DaiDien', ?)`,
            [tv.MaND, maHDTMoi, tv.NgayVao || NgayBD, tv.NgayDi || null, tv.TamTru || 'ChuaDangKy']
          );

          for (const [maDV, soLuong] of mapDichVu.entries()) {
            await conn.execute(
              `INSERT INTO chitietphidichvu (MaHDT, MaDV, SoLuong) VALUES (?, ?, ?)`,
              [maHDTMoi, maDV, soLuong]
            );
          }
        }
      } else {
        const [resHD] = await conn.execute(
          `INSERT INTO hopdongthue (MaPhong, MaHDTCu, NgayBD, NgayKT, NgayKy, TienCoc, TrangThai)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [MaPhong, MaHDTCu || null, NgayBD, NgayKT, NgayKy, TienCoc || 0, TrangThai]
        );
        const maHDTMoi = resHD.insertId;
        danhSachMaHDTTaoMoi.push(maHDTMoi);

        for (let i = 0; i < danhSachTVDuyNhat.length; i++) {
          const tv = danhSachTVDuyNhat[i];
          const vaiTro = tv.VaiTro || (i === 0 ? 'DaiDien' : 'ThanhVien');
          await conn.execute(
            `INSERT INTO chitiethopdongthue (MaND, MaHDT, NgayVao, NgayDi, VaiTro, TamTru)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [tv.MaND, maHDTMoi, tv.NgayVao || NgayBD, tv.NgayDi || null, vaiTro, tv.TamTru || 'ChuaDangKy']
          );
        }

        for (const [maDV, soLuong] of mapDichVu.entries()) {
          await conn.execute(
            `INSERT INTO chitietphidichvu (MaHDT, MaDV, SoLuong) VALUES (?, ?, ?)`,
            [maHDTMoi, maDV, soLuong]
          );
        }
      }

      if (ChiSoDienBanGiao !== null || ChiSoNuocBanGiao !== null) {
        const dienDau = Number(ChiSoDienBanGiao || 0);
        const nuocDau = Number(ChiSoNuocBanGiao || 0);
        await conn.execute(
          `INSERT INTO chisodiennuoc (MaPhong, SoDienCu, SoDienMoi, SoNuocCu, SoNuocMoi, NgayGhi)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [MaPhong, dienDau, dienDau, nuocDau, nuocDau, NgayBD]
        );
      }

      if (TrangThai === 'ConHieuLuc') {
        await conn.execute(`UPDATE phong SET TrangThai = 'DangThue' WHERE MaPhong = ?`, [MaPhong]);
      }

      await conn.commit();
      return danhSachMaHDTTaoMoi;
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  },

  // 5. Cập nhật (Sửa) hợp đồng
  updateHopDong: async (maHDT, payload) => {
    const {
      MaPhong,
      MaHDTCu = null,
      NgayBD,
      NgayKT,
      NgayKy,
      TienCoc,
      TrangThai,
      DanhSachThanhVien = [],
      DanhSachMaPDV = [],
    } = payload;

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const [oldRows] = await conn.execute(
        `SELECT MaPhong FROM hopdongthue WHERE MaHDT = ?`,
        [maHDT]
      );
      if (!oldRows.length) throw new Error('Không tìm thấy hợp đồng cần sửa');
      const maPhongCu = oldRows[0].MaPhong;

      await conn.execute(
        `UPDATE hopdongthue
         SET MaPhong = ?, MaHDTCu = ?, NgayBD = ?, NgayKT = ?, NgayKy = ?, TienCoc = ?, TrangThai = ?
         WHERE MaHDT = ?`,
        [MaPhong, MaHDTCu || null, NgayBD, NgayKT, NgayKy, TienCoc || 0, TrangThai, maHDT]
      );

      const danhSachTVDuyNhat = [];
      const tapMaND = new Set();
      for (const tv of DanhSachThanhVien) {
        const idND = Number(tv.MaND);
        if (idND > 0 && !tapMaND.has(idND)) {
          tapMaND.add(idND);
          danhSachTVDuyNhat.push(tv);
        }
      }

      await conn.execute(`DELETE FROM chitiethopdongthue WHERE MaHDT = ?`, [maHDT]);
      for (let i = 0; i < danhSachTVDuyNhat.length; i++) {
        const tv = danhSachTVDuyNhat[i];
        const vaiTro = tv.VaiTro || (i === 0 ? 'DaiDien' : 'ThanhVien');
        await conn.execute(
          `INSERT INTO chitiethopdongthue (MaND, MaHDT, NgayVao, NgayDi, VaiTro, TamTru)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [tv.MaND, maHDT, tv.NgayVao || NgayBD, tv.NgayDi || null, vaiTro, tv.TamTru || 'ChuaDangKy']
        );
      }

      const [oldPdvRows] = await conn.execute(
        `SELECT MaDV, SoLuong FROM chitietphidichvu WHERE MaHDT = ?`,
        [maHDT]
      );
      const mapSoLuongCu = new Map(
        oldPdvRows.map((r) => [Number(r.MaDV), Number(r.SoLuong) || 1])
      );

      const mapDichVuMoi = new Map();
      for (const item of DanhSachMaPDV) {
        const rawMaDV = typeof item === 'object' && item !== null ? (item.MaDV ?? item.MaPDV) : item;
        const maDV = Number(rawMaDV);
        const soLuong =
          typeof item === 'object' && item !== null && item.SoLuong
            ? Math.max(1, Number(item.SoLuong))
            : mapSoLuongCu.get(maDV) || 1;
        if (!Number.isNaN(maDV) && maDV > 0) {
          mapDichVuMoi.set(maDV, soLuong);
        }
      }

      await conn.execute(`DELETE FROM chitietphidichvu WHERE MaHDT = ?`, [maHDT]);
      for (const [maDV, soLuong] of mapDichVuMoi.entries()) {
        await conn.execute(
          `INSERT INTO chitietphidichvu (MaHDT, MaDV, SoLuong) VALUES (?, ?, ?)`,
          [maHDT, maDV, soLuong]
        );
      }

      for (const idPhong of new Set([maPhongCu, MaPhong])) {
        const [activeCount] = await conn.execute(
          `SELECT COUNT(*) AS cnt FROM hopdongthue WHERE MaPhong = ? AND TrangThai = 'ConHieuLuc'`,
          [idPhong]
        );
        const trangThaiPhongMoi = activeCount[0].cnt > 0 ? 'DangThue' : 'Trong';
        await conn.execute(
          `UPDATE phong SET TrangThai = ? WHERE MaPhong = ?`,
          [trangThaiPhongMoi, idPhong]
        );
      }

      await conn.commit();
      return true;
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  },

  // 6. Xóa hợp đồng
  deleteHopDong: async (maHDT) => {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const [rows] = await conn.execute(
        `SELECT MaPhong FROM hopdongthue WHERE MaHDT = ?`,
        [maHDT]
      );
      if (!rows.length) return false;
      const maPhong = rows[0].MaPhong;

      await conn.execute(`DELETE FROM chitietphidichvu WHERE MaHDT = ?`, [maHDT]);
      await conn.execute(`DELETE FROM chitiethopdongthue WHERE MaHDT = ?`, [maHDT]);
      const [delRes] = await conn.execute(`DELETE FROM hopdongthue WHERE MaHDT = ?`, [maHDT]);

      const [activeCount] = await conn.execute(
        `SELECT COUNT(*) AS cnt FROM hopdongthue WHERE MaPhong = ? AND TrangThai = 'ConHieuLuc'`,
        [maPhong]
      );
      if (activeCount[0].cnt === 0) {
        await conn.execute(`UPDATE phong SET TrangThai = 'Trong' WHERE MaPhong = ?`, [maPhong]);
      }

      await conn.commit();
      return delRes.affectedRows > 0;
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  },
};

module.exports = HopDongModel;