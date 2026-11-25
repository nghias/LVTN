// src/models/tinDang.model.js
const db = require('../../database/db');

// Subquery lấy thông tin cá nhân theo từng MaND
const SUBQUERY_THONG_TIN_CA_NHAN = `
  SELECT MaND, MAX(HoTen) AS HoTen, MAX(SDT) AS SDT, MAX(Email) AS Email
  FROM thongtincanhan
  GROUP BY MaND
`;

// Subquery lấy thông tin Chủ trọ (tài khoản có Quyen = 'ChuTro')
const SUBQUERY_CHU_TRO = `
  SELECT 
    nd.MaND,
    COALESCE(tt.HoTen, nd.TenTK) AS TenChuTro,
    tt.SDT AS SDTChuTro
  FROM nguoidung nd
  LEFT JOIN (${SUBQUERY_THONG_TIN_CA_NHAN}) tt ON nd.MaND = tt.MaND
  WHERE nd.Quyen = 'ChuTro'
  ORDER BY nd.MaND ASC
  LIMIT 1
`;

// Chuẩn hóa trạng thái phòng để hiển thị thống nhất trên Trang chủ
function resolveRoomDisplayState(rawTrangThai, dangCoDonCoc) {
  const normalized = String(rawTrangThai || 'Trong').trim().toLowerCase();

  if (['dangthue', 'đang thuê', 'dachothue', 'đã cho thuê'].includes(normalized)) {
    return {
      TrangThaiPhong: 'DangThue',
      NhanTrangThai: 'Đã cho thuê',
      MauTrangThai: 'red',
      CoTheDatCoc: false,
    };
  }

  if (
    ['dadatcoc', 'đã đặt cọc', 'danggiucho', 'đang giữ chỗ'].includes(normalized) ||
    Number(dangCoDonCoc) === 1
  ) {
    return {
      TrangThaiPhong: 'DaDatCoc',
      NhanTrangThai: 'Đang được cọc',
      MauTrangThai: 'orange',
      CoTheDatCoc: false,
    };
  }

  if (['baotri', 'bảo trì', 'đang bảo trì'].includes(normalized)) {
    return {
      TrangThaiPhong: 'BaoTri',
      NhanTrangThai: 'Đang bảo trì',
      MauTrangThai: 'slate',
      CoTheDatCoc: false,
    };
  }

  return {
    TrangThaiPhong: 'Trong',
    NhanTrangThai: 'Còn trống',
    MauTrangThai: 'green',
    CoTheDatCoc: true,
  };
}

// Gắn DanhSachAnh, TienIch và thông tin trạng thái chuẩn hóa vào từng phòng
async function attachRoomDetails(rows = []) {
  if (!rows.length) return [];

  const maPhongIds = [
    ...new Set(rows.map((r) => Number(r.MaPhong)).filter(Boolean)),
  ];

  if (maPhongIds.length === 0) return rows;

  const [allImages] = await db.query(
    `
      SELECT MaAnh, MaPhong, DuongDan, AnhChinh
      FROM anhphong
      WHERE MaPhong IN (?)
      ORDER BY MaPhong ASC, AnhChinh DESC, MaAnh ASC
    `,
    [maPhongIds]
  );

  const [allTienIch] = await db.query(
    `
      SELECT ctti.MaPhong, ti.MaTI, ti.TenTI, ti.MoTa
      FROM chitiettienich ctti
      INNER JOIN tienich ti ON ctti.MaTI = ti.MaTI
      WHERE ctti.MaPhong IN (?)
      ORDER BY ti.MaTI ASC
    `,
    [maPhongIds]
  );

  const imagesByPhong = {};
  for (const img of allImages) {
    const maPhong = Number(img.MaPhong);
    if (!imagesByPhong[maPhong]) imagesByPhong[maPhong] = [];
    if (img.DuongDan && String(img.DuongDan).trim()) {
      imagesByPhong[maPhong].push({
        MaAnh: Number(img.MaAnh),
        MaPhong: maPhong,
        DuongDan: String(img.DuongDan).trim(),
        AnhChinh: Number(img.AnhChinh) === 1 ? 1 : 0,
      });
    }
  }

  const tienIchByPhong = {};
  for (const ti of allTienIch) {
    const maPhong = Number(ti.MaPhong);
    if (!tienIchByPhong[maPhong]) tienIchByPhong[maPhong] = [];
    tienIchByPhong[maPhong].push({
      MaTI: Number(ti.MaTI),
      TenTI: ti.TenTI,
      MoTa: ti.MoTa || null,
    });
  }

  return rows.map((row) => {
    const maPhong = Number(row.MaPhong);
    const anhPhongList = imagesByPhong[maPhong] || [];
    const tienIchPhong = tienIchByPhong[maPhong] || [];
    const mainImgObj =
      anhPhongList.find((item) => Number(item.AnhChinh) === 1) ||
      anhPhongList[0] ||
      null;

    const statusMeta = resolveRoomDisplayState(
      row.TrangThaiPhong,
      row.DangCoDonCoc
    );

    return {
      ...row,
      MaPhong: maPhong,
      MaTin: maPhong, // Giữ tương thích nếu FE vẫn dùng key MaTin
      TieuDe: `Phòng ${row.TenPhong} - ${row.TenKhu}`,
      MoTa: row.MoTaKhu || null,
      DienTich: Number(row.DienTich),
      Gia: Number(row.Gia),
      TrangThai: statusMeta.TrangThaiPhong,
      TrangThaiPhong: statusMeta.TrangThaiPhong,
      NhanTrangThai: statusMeta.NhanTrangThai,
      MauTrangThai: statusMeta.MauTrangThai,
      CoTheDatCoc: statusMeta.CoTheDatCoc,
      AnhDaiDien: mainImgObj ? mainImgObj.DuongDan : row.AnhDaiDien || null,
      DanhSachAnh: anhPhongList,
      AnhPhongList: anhPhongList,
      TienIch: tienIchPhong,
      DanhSachTienIch: tienIchPhong,
    };
  });
}

const BASE_SELECT_PHONG = `
  SELECT 
    p.MaPhong,
    p.TenPhong,
    p.DienTich,
    p.Gia,
    p.TrangThai AS TrangThaiPhong,
    k.MaKhu,
    k.TenKhu,
    k.MoTa AS MoTaKhu,
    k.DiaChi,
    k.MaND AS MaQuanLy,
    COALESCE(tt_ql.HoTen, nd_ql.TenTK) AS TenQuanLy,
    tt_ql.SDT AS SDTQuanLy,
    COALESCE(ct.TenChuTro, COALESCE(tt_ql.HoTen, nd_ql.TenTK)) AS TenChuTro,
    COALESCE(ct.SDTChuTro, tt_ql.SDT) AS SDTChuTro,
    EXISTS (
      SELECT 1
      FROM datphong dp
      WHERE dp.MaPhong = p.MaPhong
        AND dp.TrangThai = 'DaDatCoc'
        AND (dp.ThoiGianHetHanGiu IS NULL OR dp.ThoiGianHetHanGiu >= NOW())
    ) AS DangCoDonCoc,
    (
      SELECT ap.DuongDan
      FROM anhphong ap
      WHERE ap.MaPhong = p.MaPhong
      ORDER BY ap.AnhChinh DESC, ap.MaAnh ASC
      LIMIT 1
    ) AS AnhDaiDien
  FROM phong p
  INNER JOIN khutro k ON p.MaKhu = k.MaKhu
  LEFT JOIN nguoidung nd_ql ON k.MaND = nd_ql.MaND
  LEFT JOIN (${SUBQUERY_THONG_TIN_CA_NHAN}) tt_ql ON nd_ql.MaND = tt_ql.MaND
  LEFT JOIN (${SUBQUERY_CHU_TRO}) ct ON 1 = 1
`;

const TinDangModel = {
  // 1. Lấy TẤT CẢ phòng cho Trang chủ (ưu tiên: Còn trống -> Đang được cọc -> Đã cho thuê -> Bảo trì)
  async getPublicRooms() {
    const sql = `
      ${BASE_SELECT_PHONG}
      ORDER BY
        CASE
          WHEN TRIM(p.TrangThai) = 'Trong' AND NOT EXISTS (
            SELECT 1 FROM datphong dp
            WHERE dp.MaPhong = p.MaPhong
              AND dp.TrangThai = 'DaDatCoc'
              AND (dp.ThoiGianHetHanGiu IS NULL OR dp.ThoiGianHetHanGiu >= NOW())
          ) THEN 1
          WHEN TRIM(p.TrangThai) = 'DaDatCoc' OR EXISTS (
            SELECT 1 FROM datphong dp
            WHERE dp.MaPhong = p.MaPhong
              AND dp.TrangThai = 'DaDatCoc'
              AND (dp.ThoiGianHetHanGiu IS NULL OR dp.ThoiGianHetHanGiu >= NOW())
          ) THEN 2
          WHEN TRIM(p.TrangThai) = 'DangThue' THEN 3
          ELSE 4
        END ASC,
        k.MaKhu ASC,
        p.MaPhong ASC
    `;
    const [rows] = await db.query(sql);
    return attachRoomDetails(rows);
  },

  // 2. Lấy chi tiết 1 phòng theo MaPhong
  async getPublicRoomById(maPhong) {
    const sql = `
      ${BASE_SELECT_PHONG}
      WHERE p.MaPhong = ?
      LIMIT 1
    `;
    const [rows] = await db.query(sql, [Number(maPhong)]);
    if (!rows.length) return null;

    const enrichedRows = await attachRoomDetails(rows);
    return enrichedRows[0] || null;
  },

  // Alias giữ tương thích nếu có file khác vẫn gọi tên hàm cũ
  getPublicTinDang() {
    return this.getPublicRooms();
  },
  getPublicTinDangById(maPhong) {
    return this.getPublicRoomById(maPhong);
  },
};

module.exports = TinDangModel;