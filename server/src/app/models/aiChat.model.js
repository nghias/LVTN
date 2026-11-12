// server/src/app/models/aiChat.model.js
const db = require('../../database/db');
const cryptoUtil = require('../../utils/crypto.util');

const safeDecryptPhone = (rawVal) => {
  if (!rawVal) return '';
  const str = String(rawVal).trim();
  if (/^[0-9+\-\s.]{8,15}$/.test(str)) {
    return str.replace(/[^0-9]/g, '');
  }
  try {
    if (typeof cryptoUtil.decrypt === 'function') {
      const dec = cryptoUtil.decrypt(str);
      if (dec) return String(dec).replace(/[^0-9]/g, '');
    }
    if (typeof cryptoUtil.decryptText === 'function') {
      const dec = cryptoUtil.decryptText(str);
      if (dec) return String(dec).replace(/[^0-9]/g, '');
    }
  } catch {
    // Bỏ qua nếu không phải chuỗi mã hóa
  }
  return str;
};

const AiChatModel = {
  getRagContextData: async () => {
    // 1. Lấy các phòng đang trống VÀ đang mở đăng tin (DangHienThi)
    const sqlPhongDaDangTin = `
      SELECT 
        td.MaTin,
        td.MaPhong,
        td.MaND,
        td.TieuDe,
        td.MoTa,
        td.NgayDang,
        td.NgayHetHan,
        td.TrangThai,
        p.TenPhong,
        p.DienTich,
        p.Gia,
        p.TrangThai AS TrangThaiPhong,
        k.MaKhu,
        k.TenKhu,
        k.DiaChi AS DiaChiKhu,
        k.MoTa AS MoTaKhu,
        ttql.HoTen AS TenQuanLy,
        ttql.SDT AS SDTQuanLy,
        GROUP_CONCAT(DISTINCT ti.TenTI ORDER BY ti.TenTI SEPARATOR ', ') AS DanhSachTienIch
      FROM TinDang td
      INNER JOIN Phong p ON td.MaPhong = p.MaPhong
      INNER JOIN KhuTro k ON p.MaKhu = k.MaKhu
      LEFT JOIN NguoiDung ndql ON k.MaND = ndql.MaND
      LEFT JOIN ThongTinCaNhan ttql ON ndql.MaND = ttql.MaND
      LEFT JOIN ChiTietTienIch ctti ON p.MaPhong = ctti.MaPhong
      LEFT JOIN TienIch ti ON ctti.MaTI = ti.MaTI
      WHERE p.TrangThai = 'Trong'
        AND td.TrangThai = 'DangHienThi'
        AND (td.NgayHetHan IS NULL OR DATE(td.NgayHetHan) >= CURDATE())
      GROUP BY 
        td.MaTin, td.MaPhong, td.MaND, td.TieuDe, td.MoTa, td.NgayDang, td.NgayHetHan, td.TrangThai,
        p.TenPhong, p.DienTich, p.Gia, p.TrangThai,
        k.MaKhu, k.TenKhu, k.DiaChi, k.MoTa,
        ttql.HoTen, ttql.SDT
      ORDER BY k.MaKhu ASC, p.Gia ASC, p.TenPhong ASC
    `;

    // 2. Lấy thông tin Chủ trọ (hỗ trợ chung mọi cơ sở)
    const sqlChuTro = `
      SELECT 
        nd.MaND,
        tt.HoTen AS TenChuTro,
        tt.SDT AS SDTChuTro,
        tt.Email AS EmailChuTro
      FROM NguoiDung nd
      LEFT JOIN ThongTinCaNhan tt ON nd.MaND = tt.MaND
      WHERE nd.Quyen = 'ChuTro'
      ORDER BY nd.MaND ASC
      LIMIT 1
    `;

    // 3. Lấy danh sách Khu trọ
    const sqlKhuTro = `
      SELECT 
        k.MaKhu,
        k.MaND,
        k.TenKhu,
        k.MoTa,
        k.DiaChi,
        tt.HoTen AS TenQuanLy,
        tt.SDT AS SDTQuanLy
      FROM KhuTro k
      LEFT JOIN NguoiDung nd ON k.MaND = nd.MaND
      LEFT JOIN ThongTinCaNhan tt ON nd.MaND = tt.MaND
      ORDER BY k.MaKhu ASC
    `;

    // 4. Lấy bảng Phí dịch vụ (MaDV, TenDV, DonGia, DonViTinh)
    const sqlPhiDichVu = `
      SELECT MaDV, TenDV, DonGia, DonViTinh
      FROM PhiDichVu
      ORDER BY MaDV ASC
    `;

    // 5. Lấy toàn bộ danh mục Tiện ích (MaTI, TenTI, MoTa) kèm các phòng trống đang có tiện ích đó
    const sqlTienIch = `
      SELECT 
        ti.MaTI,
        ti.TenTI,
        ti.MoTa,
        GROUP_CONCAT(
          DISTINCT CASE 
            WHEN p.TrangThai = 'Trong' AND td.TrangThai = 'DangHienThi' 
            THEN p.TenPhong 
            ELSE NULL 
          END 
          ORDER BY p.TenPhong SEPARATOR ', '
        ) AS DanhSachPhongTrongCoTienIch
      FROM TienIch ti
      LEFT JOIN ChiTietTienIch ctti ON ti.MaTI = ctti.MaTI
      LEFT JOIN Phong p ON ctti.MaPhong = p.MaPhong
      LEFT JOIN TinDang td ON p.MaPhong = td.MaPhong AND td.TrangThai = 'DangHienThi'
      GROUP BY ti.MaTI, ti.TenTI, ti.MoTa
      ORDER BY ti.MaTI ASC
    `;

    // 6. Lấy đơn giá điện nước hiện hành
    const sqlGiaDienNuoc = `
      SELECT MaGia, GiaDien, GiaNuoc, NgayApDung
      FROM GiaDienNuoc
      ORDER BY NgayApDung DESC, MaGia DESC
      LIMIT 1
    `;

    const [
      [phongRows],
      [chuTroRows],
      [khuTroRows],
      [phiDichVuRows],
      [tienIchRows],
      [giaDienNuocRows],
    ] = await Promise.all([
      db.execute(sqlPhongDaDangTin),
      db.execute(sqlChuTro),
      db.execute(sqlKhuTro),
      db.execute(sqlPhiDichVu),
      db.execute(sqlTienIch),
      db.execute(sqlGiaDienNuoc).catch(() => [[]]),
    ]);

    const rawChuTro = chuTroRows[0] || {};
    const chuTroInfo = {
      TenChuTro: rawChuTro.TenChuTro || 'Nguyễn Thị Quỳnh Dư',
      SDTChuTro: safeDecryptPhone(rawChuTro.SDTChuTro) || '',
      EmailChuTro: rawChuTro.EmailChuTro || '',
    };

    const khuTroList = (khuTroRows || []).map((k) => ({
      ...k,
      TenQuanLy: k.TenQuanLy || `Quản lý ${k.TenKhu}`,
      SDTQuanLy: safeDecryptPhone(k.SDTQuanLy),
      TenChuTro: chuTroInfo.TenChuTro,
      SDTChuTro: chuTroInfo.SDTChuTro,
    }));

    const phongTrongDaDangList = (phongRows || []).map((row) => {
      const sdtQuanLy = safeDecryptPhone(row.SDTQuanLy);
      return {
        MaTin: Number(row.MaTin),
        MaPhong: Number(row.MaPhong),
        MaND: Number(row.MaND),
        TieuDe: row.TieuDe || `Cho thuê phòng ${row.TenPhong} - ${row.TenKhu}`,
        MoTa: row.MoTa || '',
        NgayDang: row.NgayDang,
        NgayHetHan: row.NgayHetHan,
        TrangThai: row.TrangThai || 'DangHienThi',
        TenPhong: row.TenPhong,
        DienTich: Number(row.DienTich) || 0,
        Gia: Number(row.Gia) || 0,
        TrangThaiPhong: row.TrangThaiPhong || 'Trong',
        MaKhu: Number(row.MaKhu),
        TenKhu: row.TenKhu,
        DiaChiKhu: row.DiaChiKhu || '',
        DanhSachTienIch: row.DanhSachTienIch || 'Cơ bản',
        TenQuanLy: row.TenQuanLy || `Quản lý ${row.TenKhu}`,
        SDTQuanLy: sdtQuanLy,
        SDT: sdtQuanLy || chuTroInfo.SDTChuTro,
        TenChuTro: chuTroInfo.TenChuTro,
        SDTChuTro: chuTroInfo.SDTChuTro,
      };
    });

    return {
      phongTrongDaDangList,
      chuTroInfo,
      khuTroList,
      phiDichVuList: phiDichVuRows || [],
      tienIchList: tienIchRows || [],
      giaDienNuoc: giaDienNuocRows?.[0] || {
        GiaDien: 3500,
        GiaNuoc: 15000,
      },
    };
  },
};

module.exports = AiChatModel;