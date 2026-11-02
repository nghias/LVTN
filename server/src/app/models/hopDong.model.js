// C:\Users\nhat nguyen\Desktop\LVTN\server\src\app\models\hopDong.model.js
const db = require('../../database/db');
const ChiTietHopDongModel = require('./chiTietHopDong.model');

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

    // Gọi sang ChiTietHopDongModel để lấy DanhSachThanhVien và ThanhVienCungPhong
    const [danhSachThanhVien, thanhVienCungPhong] = await Promise.all([
      ChiTietHopDongModel.getThanhVienByMaHDT(maHDT),
      ChiTietHopDongModel.getThanhVienCungPhong(hopDong.MaPhong),
    ]);
    hopDong.DanhSachThanhVien = danhSachThanhVien;
    hopDong.ThanhVienCungPhong = thanhVienCungPhong;

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

      // Lọc danh sách thành viên duy nhất thông qua ChiTietHopDongModel
      const danhSachTVDuyNhat =
        ChiTietHopDongModel.filterUniqueMembers(DanhSachThanhVien);

      const mapDichVu = new Map();
      for (const item of DanhSachMaPDV) {
        const rawMaDV =
          typeof item === 'object' && item !== null
            ? item.MaDV ?? item.MaPDV
            : item;
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
            [
              MaPhong,
              MaHDTCu || null,
              NgayBD,
              NgayKT,
              NgayKy,
              TienCoc || 0,
              TrangThai,
            ]
          );
          const maHDTMoi = resHD.insertId;
          danhSachMaHDTTaoMoi.push(maHDTMoi);

          // Lưu chi tiết hợp đồng thông qua ChiTietHopDongModel
          await ChiTietHopDongModel.create(
            {
              MaND: tv.MaND,
              MaHDT: maHDTMoi,
              NgayVao: tv.NgayVao || NgayBD,
              NgayDi: tv.NgayDi || null,
              VaiTro: 'DaiDien',
              TamTru: tv.TamTru || 'ChuaDangKy',
            },
            conn
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
          [
            MaPhong,
            MaHDTCu || null,
            NgayBD,
            NgayKT,
            NgayKy,
            TienCoc || 0,
            TrangThai,
          ]
        );
        const maHDTMoi = resHD.insertId;
        danhSachMaHDTTaoMoi.push(maHDTMoi);

        // Lưu toàn bộ thành viên của hợp đồng thông qua ChiTietHopDongModel
        await ChiTietHopDongModel.insertManyForHopDong(
          maHDTMoi,
          danhSachTVDuyNhat,
          NgayBD,
          conn
        );

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
        await conn.execute(
          `UPDATE phong SET TrangThai = 'DangThue' WHERE MaPhong = ?`,
          [MaPhong]
        );
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
        [
          MaPhong,
          MaHDTCu || null,
          NgayBD,
          NgayKT,
          NgayKy,
          TienCoc || 0,
          TrangThai,
          maHDT,
        ]
      );

      // Thay thế danh sách thành viên trong chitiethopdongthue thông qua ChiTietHopDongModel
      await ChiTietHopDongModel.replaceByMaHDT(
        maHDT,
        DanhSachThanhVien,
        NgayBD,
        conn
      );

      const [oldPdvRows] = await conn.execute(
        `SELECT MaDV, SoLuong FROM chitietphidichvu WHERE MaHDT = ?`,
        [maHDT]
      );
      const mapSoLuongCu = new Map(
        oldPdvRows.map((r) => [Number(r.MaDV), Number(r.SoLuong) || 1])
      );

      const mapDichVuMoi = new Map();
      for (const item of DanhSachMaPDV) {
        const rawMaDV =
          typeof item === 'object' && item !== null
            ? item.MaDV ?? item.MaPDV
            : item;
        const maDV = Number(rawMaDV);
        const soLuong =
          typeof item === 'object' && item !== null && item.SoLuong
            ? Math.max(1, Number(item.SoLuong))
            : mapSoLuongCu.get(maDV) || 1;
        if (!Number.isNaN(maDV) && maDV > 0) {
          mapDichVuMoi.set(maDV, soLuong);
        }
      }

      await conn.execute(`DELETE FROM chitietphidichvu WHERE MaHDT = ?`, [
        maHDT,
      ]);
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
        const trangThaiPhongMoi =
          activeCount[0].cnt > 0 ? 'DangThue' : 'Trong';
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

      await conn.execute(`DELETE FROM chitietphidichvu WHERE MaHDT = ?`, [
        maHDT,
      ]);

      // Xóa chi tiết hợp đồng thông qua ChiTietHopDongModel
      await ChiTietHopDongModel.deleteByMaHDT(maHDT, conn);

      const [delRes] = await conn.execute(
        `DELETE FROM hopdongthue WHERE MaHDT = ?`,
        [maHDT]
      );

      const [activeCount] = await conn.execute(
        `SELECT COUNT(*) AS cnt FROM hopdongthue WHERE MaPhong = ? AND TrangThai = 'ConHieuLuc'`,
        [maPhong]
      );
      if (activeCount[0].cnt === 0) {
        await conn.execute(
          `UPDATE phong SET TrangThai = 'Trong' WHERE MaPhong = ?`,
          [maPhong]
        );
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

  // 7. [BẢO MẬT] Kiểm tra hợp đồng có thuộc về Khách thuê đang đăng nhập hay không
  checkHopDongThuocKhachThue: async (maHDT, maND) => {
    const [rows] = await db.execute(
      `SELECT ct.MaHDT, ct.MaND, ct.VaiTro, ct.NgayVao, ct.NgayDi, ct.TamTru,
              hdt.TrangThai AS TrangThaiHopDong, hdt.MaPhong,
              p.TenPhong, kt.MaKhu, kt.TenKhu, kt.MaND AS MaQuanLyKhu
       FROM chitiethopdongthue ct
       INNER JOIN hopdongthue hdt ON ct.MaHDT = hdt.MaHDT
       INNER JOIN phong p ON hdt.MaPhong = p.MaPhong
       INNER JOIN khutro kt ON p.MaKhu = kt.MaKhu
       WHERE ct.MaHDT = ? AND ct.MaND = ?
       LIMIT 1`,
      [Number(maHDT), Number(maND)]
    );
    return rows[0] || null;
  },

  // 8. Lấy danh sách hợp đồng CỦA RIÊNG khách thuê đang đăng nhập
  getDanhSachHopDongCuaToi: async (maND, { trangThai = '', tuKhoa = '' } = {}) => {
    let sql = `
      SELECT 
        hdt.MaHDT, hdt.MaPhong, hdt.MaHDTCu, hdt.NgayBD, hdt.NgayKT, hdt.NgayKy, 
        hdt.TienCoc, hdt.TrangThai,
        p.TenPhong, p.DienTich, p.Gia AS GiaPhong, p.TrangThai AS TrangThaiPhong,
        kt.MaKhu, kt.TenKhu, kt.DiaChi AS DiaChiKhu,
        ctCuaToi.VaiTro AS VaiTroCuaToi,
        ctCuaToi.TamTru AS TamTruCuaToi,
        ctCuaToi.NgayVao AS NgayVaoCuaToi,
        ctCuaToi.NgayDi AS NgayDiCuaToi,
        quanLy.MaND AS MaQuanLy,
        COALESCE(ttcnQL.HoTen, quanLy.TenTK) AS TenQuanLy,
        ttcnQL.SDT AS SDTQuanLy,
        (
          SELECT COUNT(*) 
          FROM chitiethopdongthue ct 
          WHERE ct.MaHDT = hdt.MaHDT AND ct.NgayDi IS NULL
        ) AS SoThanhVien,
        EXISTS (
          SELECT 1 FROM thongbao tb
          WHERE tb.NDGui = ?
            AND tb.MaTBGoc IS NULL
            AND tb.TieuDe LIKE CONCAT('%[Yêu cầu hủy HĐ #', hdt.MaHDT, ']%')
        ) AS DaGuiYeuCauHuy
      FROM chitiethopdongthue ctCuaToi
      INNER JOIN hopdongthue hdt ON ctCuaToi.MaHDT = hdt.MaHDT
      INNER JOIN phong p ON hdt.MaPhong = p.MaPhong
      INNER JOIN khutro kt ON p.MaKhu = kt.MaKhu
      INNER JOIN nguoidung quanLy ON kt.MaND = quanLy.MaND
      LEFT JOIN thongtincanhan ttcnQL ON quanLy.MaND = ttcnQL.MaND
      WHERE ctCuaToi.MaND = ?
    `;
    const params = [Number(maND), Number(maND)];

    if (trangThai && trangThai.trim() !== '') {
      sql += ` AND hdt.TrangThai = ?`;
      params.push(trangThai.trim());
    }

    if (tuKhoa && tuKhoa.trim() !== '') {
      const kw = `%${tuKhoa.trim()}%`;
      sql += ` AND (CAST(hdt.MaHDT AS CHAR) LIKE ? OR p.TenPhong LIKE ? OR kt.TenKhu LIKE ?)`;
      params.push(kw, kw, kw);
    }

    sql += `
      ORDER BY 
        CASE WHEN hdt.TrangThai = 'ConHieuLuc' THEN 0 ELSE 1 END ASC,
        hdt.MaHDT DESC
    `;

    const [rows] = await db.execute(sql, params);
    return rows.map((row) => ({
      ...row,
      DaGuiYeuCauHuy: Boolean(row.DaGuiYeuCauHuy),
    }));
  },

  // 9. Lấy danh sách Quản lý trực tiếp của Khu trọ + Chủ trọ để nhận thông báo hủy HĐ
  getNguoiNhanYeuCauHuyHopDong: async (maHDT, excludeMaND) => {
    // Lấy thông tin người quản lý trực tiếp khu trọ của hợp đồng này
    const [khuRows] = await db.execute(
      `SELECT kt.MaND AS MaQuanLy, p.TenPhong, kt.TenKhu
       FROM hopdongthue hdt
       INNER JOIN phong p ON hdt.MaPhong = p.MaPhong
       INNER JOIN khutro kt ON p.MaKhu = kt.MaKhu
       WHERE hdt.MaHDT = ?
       LIMIT 1`,
      [Number(maHDT)]
    );

    const recipientSet = new Set();
    if (khuRows[0]?.MaQuanLy && Number(khuRows[0].MaQuanLy) !== Number(excludeMaND)) {
      recipientSet.add(Number(khuRows[0].MaQuanLy));
    }

    // Lấy thêm tài khoản Chủ trọ tổng (Quyen = 'ChuTro') để cùng nắm thông tin
    const [chuTroRows] = await db.execute(
      `SELECT MaND FROM nguoidung WHERE Quyen = 'ChuTro' AND MaND != ?`,
      [Number(excludeMaND)]
    );
    chuTroRows.forEach((r) => recipientSet.add(Number(r.MaND)));

    // Tìm MaLTB phù hợp trong bảng LoaiThongBao (ưu tiên loại Hợp đồng / Phản ánh / Sự cố)
    const [ltbRows] = await db.execute(
      `SELECT MaLTB FROM loaithongbao
       ORDER BY
         CASE
           WHEN TenLTB LIKE '%hợp đồng%' OR TenLTB LIKE '%Hợp đồng%' THEN 0
           WHEN TenLTB LIKE '%phản ánh%' OR TenLTB LIKE '%sự cố%' OR TenLTB LIKE '%yêu cầu%' THEN 1
           ELSE 2
         END ASC,
         MaLTB ASC
       LIMIT 1`
    );

    const [senderRows] = await db.execute(
      `SELECT COALESCE(tt.HoTen, nd.TenTK) AS HoTen, tt.SDT
       FROM nguoidung nd
       LEFT JOIN thongtincanhan tt ON nd.MaND = tt.MaND
       WHERE nd.MaND = ?
       LIMIT 1`,
      [Number(excludeMaND)]
    );

    return {
      dsNguoiNhan: Array.from(recipientSet),
      maLTB: ltbRows[0]?.MaLTB || 1,
      tenPhong: khuRows[0]?.TenPhong || '',
      tenKhu: khuRows[0]?.TenKhu || '',
      tenNguoiGui: senderRows[0]?.HoTen || 'Khách thuê',
      sdtNguoiGui: senderRows[0]?.SDT || '',
    };
  },

  // 10. Kiểm tra chống spam gửi yêu cầu hủy trùng lặp cho cùng 1 hợp đồng
  checkDaGuiYeuCauHuy: async (maHDT, maND) => {
    const [rows] = await db.execute(
      `SELECT MaTB, NgayGui FROM thongbao
       WHERE NDGui = ?
         AND MaTBGoc IS NULL
         AND TieuDe LIKE ?
       ORDER BY NgayGui DESC
       LIMIT 1`,
      [Number(maND), `%[Yêu cầu hủy HĐ #${Number(maHDT)}]%`]
    );
    return rows[0] || null;
  },
};

module.exports = HopDongModel;