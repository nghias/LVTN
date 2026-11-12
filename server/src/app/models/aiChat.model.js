// server/src/app/models/aiChat.model.js
const db = require('../../database/db');
const cryptoUtil = require('../../utils/crypto.util');

// Hàm hỗ trợ giải mã SĐT an toàn (tương thích cả dữ liệu mã hóa AES-256 và số điện thoại thuần)
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
  /**
   * Truy xuất toàn bộ dữ liệu thực tế từ MySQL / TiDB Cloud phục vụ kiến trúc RAG
   */
  getRagContextData: async () => {
    // 1. CHỈ lấy các phòng đang trống VÀ đã được đăng tin công khai (DangHienThi)
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

    // 2. Lấy thông tin liên hệ của Chủ trọ (Bắt buộc có cho mọi cơ sở)
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

    // 3. Lấy danh sách các Cơ sở / Khu trọ và người quản lý phụ trách
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

    // 4. Lấy bảng Phí dịch vụ (Khớp đúng 4 cột: MaDV, TenDV, DonGia, DonViTinh)
    const sqlPhiDichVu = `
      SELECT MaDV, TenDV, DonGia, DonViTinh
      FROM PhiDichVu
      ORDER BY MaDV ASC
    `;

    // 5. Lấy đơn giá điện nước hiện hành mới nhất
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
      [giaDienNuocRows],
    ] = await Promise.all([
      db.execute(sqlPhongDaDangTin),
      db.execute(sqlChuTro),
      db.execute(sqlKhuTro),
      db.execute(sqlPhiDichVu),
      db.execute(sqlGiaDienNuoc).catch(() => [[]]),
    ]);

    // Chuẩn hóa thông tin Chủ trọ
    const rawChuTro = chuTroRows[0] || {};
    const chuTroInfo = {
      TenChuTro: rawChuTro.TenChuTro || 'Nguyễn Thị Quỳnh Dư',
      SDTChuTro: safeDecryptPhone(rawChuTro.SDTChuTro) || '',
      EmailChuTro: rawChuTro.EmailChuTro || '',
    };

    // Chuẩn hóa danh sách Khu trọ
    const khuTroList = (khuTroRows || []).map((k) => ({
      ...k,
      TenQuanLy: k.TenQuanLy || `Quản lý ${k.TenKhu}`,
      SDTQuanLy: safeDecryptPhone(k.SDTQuanLy),
      TenChuTro: chuTroInfo.TenChuTro,
      SDTChuTro: chuTroInfo.SDTChuTro,
    }));

    // Chuẩn hóa danh sách Phòng trống đã đăng tin (Khớp 100% kiểu TinDangItem của Frontend)
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
        // Thông tin Quản lý trực tiếp của cơ sở đó
        TenQuanLy: row.TenQuanLy || `Quản lý ${row.TenKhu}`,
        SDTQuanLy: sdtQuanLy,
        SDT: sdtQuanLy || chuTroInfo.SDTChuTro,
        // Thông tin Chủ trọ luôn đi kèm cho mọi cơ sở
        TenChuTro: chuTroInfo.TenChuTro,
        SDTChuTro: chuTroInfo.SDTChuTro,
      };
    });

    return {
      phongTrongDaDangList,
      chuTroInfo,
      khuTroList,
      phiDichVuList: phiDichVuRows || [],
      giaDienNuoc: giaDienNuocRows?.[0] || {
        GiaDien: 3500,
        GiaNuoc: 15000,
      },
    };
  },
};

module.exports = AiChatModel;