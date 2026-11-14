// src/models/tinDang.model.js
const db = require("../../database/db");

const DANH_SACH_TRANG_THAI_TRONG = ["Trong", "ConTrong", "Trống", "Còn trống"];

// Subquery lấy thông tin cá nhân theo từng MaND (tránh nhân bản dòng nếu ThongTinCaNhan có nhiều bản ghi)
const SUBQUERY_THONG_TIN_CA_NHAN = `
  SELECT MaND, MAX(HoTen) AS HoTen, MAX(SDT) AS SDT, MAX(Email) AS Email
  FROM ThongTinCaNhan
  GROUP BY MaND
`;

// Subquery lấy thông tin Chủ trọ (tài khoản có Quyen = 'ChuTro', MaND = 1)
const SUBQUERY_CHU_TRO = `
  SELECT 
    nd.MaND,
    COALESCE(tt.HoTen, nd.TenTK) AS TenChuTro,
    tt.SDT AS SDTChuTro
  FROM NguoiDung nd
  LEFT JOIN (${SUBQUERY_THONG_TIN_CA_NHAN}) tt ON nd.MaND = tt.MaND
  WHERE nd.Quyen = 'ChuTro'
  ORDER BY nd.MaND ASC
  LIMIT 1
`;

// Chuẩn hóa chuỗi ngày về định dạng YYYY-MM-DD cho cột DATE của MySQL 8.4
function normalizeDate(value) {
  if (!value || String(value).trim() === "") return null;
  const str = String(value).trim();
  if (str.includes("T")) {
    return str.split("T")[0];
  }
  return str;
}

// Gắn DanhSachAnh (bảng AnhPhong) và TienIch (bảng ChiTietTienIch + TienIch) vào từng tin đăng
// Đồng bộ cấu trúc dữ liệu giống hệt trang ChiTietPhongTroPage
async function attachImagesToTinDangRows(rows = []) {
  if (!rows.length) return [];

  const maPhongIds = [
    ...new Set(rows.map((r) => Number(r.MaPhong)).filter(Boolean)),
  ];

  if (maPhongIds.length === 0) return rows;

  // 1. Lấy toàn bộ ảnh của các phòng từ bảng AnhPhong (Ưu tiên AnhChinh = 1 lên đầu)
  const [allImages] = await db.query(
    `
      SELECT MaAnh, MaPhong, DuongDan, AnhChinh
      FROM AnhPhong
      WHERE MaPhong IN (?)
      ORDER BY MaPhong ASC, AnhChinh DESC, MaAnh ASC
    `,
    [maPhongIds]
  );

  // 2. Lấy toàn bộ tiện ích đi kèm của từng phòng từ ChiTietTienIch JOIN TienIch
  const [allTienIch] = await db.query(
    `
      SELECT ctti.MaPhong, ti.MaTI, ti.TenTI, ti.MoTa
      FROM ChiTietTienIch ctti
      INNER JOIN TienIch ti ON ctti.MaTI = ti.MaTI
      WHERE ctti.MaPhong IN (?)
      ORDER BY ti.MaTI ASC
    `,
    [maPhongIds]
  );

  const imagesByPhong = {};
  for (const img of allImages) {
    const maPhong = Number(img.MaPhong);
    if (!imagesByPhong[maPhong]) {
      imagesByPhong[maPhong] = [];
    }
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
    if (!tienIchByPhong[maPhong]) {
      tienIchByPhong[maPhong] = [];
    }
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

    // Ưu tiên lấy ảnh có AnhChinh = 1, nếu không có thì lấy ảnh đầu tiên
    const mainImgObj =
      anhPhongList.find((item) => Number(item.AnhChinh) === 1) ||
      anhPhongList[0] ||
      null;

    return {
      ...row,
      DienTich: Number(row.DienTich),
      Gia: Number(row.Gia),
      AnhDaiDien: mainImgObj ? mainImgObj.DuongDan : row.AnhDaiDien || null,
      // Trả về cả mảng object (giống ChiTietPhongTroPage) để FE dùng đồng nhất
      DanhSachAnh: anhPhongList,
      AnhPhongList: anhPhongList,
      TienIch: tienIchPhong,
      DanhSachTienIch: tienIchPhong,
    };
  });
}

const TinDangModel = {
  async getNguoiDungById(maND) {
    const sql = `
      SELECT 
        nd.MaND,
        nd.TenTK,
        nd.Quyen,
        COALESCE(ttcn.HoTen, nd.TenTK) AS HoTen,
        ttcn.SDT,
        ttcn.Email
      FROM NguoiDung nd
      LEFT JOIN (${SUBQUERY_THONG_TIN_CA_NHAN}) ttcn ON nd.MaND = ttcn.MaND
      WHERE nd.MaND = ?
      LIMIT 1
    `;
    const [rows] = await db.query(sql, [maND]);
    return rows[0] || null;
  },

  async getTinDangById(maTin) {
    const sql = `SELECT * FROM TinDang WHERE MaTin = ? LIMIT 1`;
    const [rows] = await db.query(sql, [maTin]);
    return rows[0] || null;
  },

  async checkPhongThuocQuanLy(maPhong, maND) {
    const sql = `
      SELECT p.MaPhong
      FROM Phong p
      INNER JOIN KhuTro k ON p.MaKhu = k.MaKhu
      WHERE p.MaPhong = ? AND k.MaND = ?
      LIMIT 1
    `;
    const [rows] = await db.query(sql, [maPhong, maND]);
    return rows.length > 0;
  },

  async checkTinThuocQuanLy(maTin, maND) {
    const sql = `
      SELECT td.MaTin
      FROM TinDang td
      INNER JOIN Phong p ON td.MaPhong = p.MaPhong
      INNER JOIN KhuTro k ON p.MaKhu = k.MaKhu
      WHERE td.MaTin = ? AND k.MaND = ?
      LIMIT 1
    `;
    const [rows] = await db.query(sql, [maTin, maND]);
    return rows.length > 0;
  },

  async checkPhongCoTheDangTin(maPhong, excludeMaTin = null) {
    const params = [];
    let excludeClause = "";

    if (excludeMaTin) {
      excludeClause = "AND td.MaTin <> ?";
      params.push(excludeMaTin);
    }

    params.push(maPhong);

    const sql = `
      SELECT 
        p.MaPhong,
        p.TrangThai AS TrangThaiPhong,
        td.MaTin,
        td.TrangThai AS TrangThaiTin
      FROM Phong p
      LEFT JOIN TinDang td 
        ON p.MaPhong = td.MaPhong 
        AND td.TrangThai IS NOT NULL 
        AND TRIM(td.TrangThai) <> ''
        ${excludeClause}
      WHERE p.MaPhong = ?
      LIMIT 1
    `;

    const [rows] = await db.query(sql, params);
    if (!rows.length) {
      return { valid: false, reason: "NOT_FOUND" };
    }

    const phong = rows[0];

    if (!DANH_SACH_TRANG_THAI_TRONG.includes(phong.TrangThaiPhong)) {
      return { valid: false, reason: "NOT_EMPTY" };
    }

    if (phong.MaTin) {
      return { valid: false, reason: "ALREADY_HAS_STATUS" };
    }

    return { valid: true };
  },

  // 1. Lấy danh sách tin đăng cho trang Quản lý
  async getAllTinDang(maND, quyen) {
    const hasFullAccess = quyen === "ChuTro" || quyen === "Admin";
    const params = [];

    const conditions = [
      "td.TrangThai IS NOT NULL",
      "TRIM(td.TrangThai) <> ''",
    ];

    if (!hasFullAccess) {
      conditions.push("k.MaND = ?");
      params.push(maND);
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;

    const sql = `
      SELECT 
        td.MaTin,
        td.MaPhong,
        td.MaND,
        td.TieuDe,
        td.MoTa,
        td.NgayDang,
        td.NgayHetHan,
        CASE 
          WHEN td.NgayHetHan IS NOT NULL AND td.NgayHetHan < CURDATE() THEN 'HetHan'
          ELSE td.TrangThai
        END AS TrangThai,
        p.TenPhong,
        p.DienTich,
        p.Gia,
        p.TrangThai AS TrangThaiPhong,
        k.MaKhu,
        k.TenKhu,
        k.DiaChi,
        k.MaND AS MaQuanLy,
        COALESCE(tt_ql.HoTen, nd_ql.TenTK) AS TenQuanLy,
        tt_ql.SDT AS SDTQuanLy,
        COALESCE(ct.TenChuTro, COALESCE(tt_ql.HoTen, nd_ql.TenTK)) AS TenChuTro,
        COALESCE(ct.SDTChuTro, tt_ql.SDT) AS SDTChuTro,
        (
          SELECT ap.DuongDan
          FROM AnhPhong ap
          WHERE ap.MaPhong = p.MaPhong
          ORDER BY ap.AnhChinh DESC, ap.MaAnh ASC
          LIMIT 1
        ) AS AnhDaiDien
      FROM TinDang td
      INNER JOIN Phong p ON td.MaPhong = p.MaPhong
      INNER JOIN KhuTro k ON p.MaKhu = k.MaKhu
      LEFT JOIN NguoiDung nd_ql ON k.MaND = nd_ql.MaND
      LEFT JOIN (${SUBQUERY_THONG_TIN_CA_NHAN}) tt_ql ON nd_ql.MaND = tt_ql.MaND
      LEFT JOIN (${SUBQUERY_CHU_TRO}) ct ON 1 = 1
      ${whereClause}
      ORDER BY td.NgayDang DESC, td.MaTin DESC
    `;

    const [rows] = await db.query(sql, params);
    return attachImagesToTinDangRows(rows);
  },

  // 2. Lấy danh sách Phòng gửi qua FE để chọn khi đăng tin mới
  async getPhongListForSelect(maND, quyen) {
    const hasFullAccess = quyen === "ChuTro" || quyen === "Admin";
    const params = [];

    const conditions = [
      "p.TrangThai IN ('Trong', 'ConTrong', 'Trống', 'Còn trống')",
      "td.MaTin IS NULL",
    ];

    if (!hasFullAccess) {
      conditions.push("k.MaND = ?");
      params.push(maND);
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;

    const sql = `
      SELECT 
        p.MaPhong,
        p.TenPhong,
        p.DienTich,
        p.Gia,
        p.TrangThai,
        NULL AS TrangThaiTin,
        k.MaKhu,
        k.TenKhu,
        k.DiaChi,
        k.MaND AS MaQuanLy,
        COALESCE(tt_ql.HoTen, nd_ql.TenTK) AS TenQuanLy,
        tt_ql.SDT AS SDTQuanLy,
        COALESCE(ct.TenChuTro, COALESCE(tt_ql.HoTen, nd_ql.TenTK)) AS TenChuTro,
        COALESCE(ct.SDTChuTro, tt_ql.SDT) AS SDTChuTro
      FROM Phong p
      INNER JOIN KhuTro k ON p.MaKhu = k.MaKhu
      LEFT JOIN NguoiDung nd_ql ON k.MaND = nd_ql.MaND
      LEFT JOIN (${SUBQUERY_THONG_TIN_CA_NHAN}) tt_ql ON nd_ql.MaND = tt_ql.MaND
      LEFT JOIN (${SUBQUERY_CHU_TRO}) ct ON 1 = 1
      LEFT JOIN TinDang td 
        ON p.MaPhong = td.MaPhong 
        AND td.TrangThai IS NOT NULL 
        AND TRIM(td.TrangThai) <> ''
      ${whereClause}
      ORDER BY k.MaKhu ASC, p.MaPhong ASC
    `;

    const [rows] = await db.query(sql, params);
    return rows.map((row) => ({
      ...row,
      DienTich: Number(row.DienTich),
      Gia: Number(row.Gia),
    }));
  },

  // 3. Lấy danh sách tin đăng công khai cho Trang chủ
  async getPublicTinDang() {
    const sql = `
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
        k.DiaChi,
        k.MaND AS MaQuanLy,
        COALESCE(tt_ql.HoTen, nd_ql.TenTK) AS TenQuanLy,
        tt_ql.SDT AS SDTQuanLy,
        COALESCE(ct.TenChuTro, COALESCE(tt_ql.HoTen, nd_ql.TenTK)) AS TenChuTro,
        COALESCE(ct.SDTChuTro, tt_ql.SDT) AS SDTChuTro,
        (
          SELECT ap.DuongDan
          FROM AnhPhong ap
          WHERE ap.MaPhong = p.MaPhong
          ORDER BY ap.AnhChinh DESC, ap.MaAnh ASC
          LIMIT 1
        ) AS AnhDaiDien
      FROM TinDang td
      INNER JOIN Phong p ON td.MaPhong = p.MaPhong
      INNER JOIN KhuTro k ON p.MaKhu = k.MaKhu
      LEFT JOIN NguoiDung nd_ql ON k.MaND = nd_ql.MaND
      LEFT JOIN (${SUBQUERY_THONG_TIN_CA_NHAN}) tt_ql ON nd_ql.MaND = tt_ql.MaND
      LEFT JOIN (${SUBQUERY_CHU_TRO}) ct ON 1 = 1
      WHERE td.TrangThai = 'DangHienThi'
        AND p.TrangThai IN ('Trong', 'ConTrong', 'Trống', 'Còn trống')
        AND (td.NgayHetHan IS NULL OR td.NgayHetHan >= CURDATE())
      ORDER BY td.NgayDang DESC, td.MaTin DESC
    `;
    const [rows] = await db.query(sql);
    return attachImagesToTinDangRows(rows);
  },

  // 3.1. Lấy chi tiết 1 tin đăng công khai theo MaTin
  async getPublicTinDangById(maTin) {
    const sql = `
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
        k.DiaChi,
        k.MaND AS MaQuanLy,
        COALESCE(tt_ql.HoTen, nd_ql.TenTK) AS TenQuanLy,
        tt_ql.SDT AS SDTQuanLy,
        COALESCE(ct.TenChuTro, COALESCE(tt_ql.HoTen, nd_ql.TenTK)) AS TenChuTro,
        COALESCE(ct.SDTChuTro, tt_ql.SDT) AS SDTChuTro,
        (
          SELECT ap.DuongDan
          FROM AnhPhong ap
          WHERE ap.MaPhong = p.MaPhong
          ORDER BY ap.AnhChinh DESC, ap.MaAnh ASC
          LIMIT 1
        ) AS AnhDaiDien
      FROM TinDang td
      INNER JOIN Phong p ON td.MaPhong = p.MaPhong
      INNER JOIN KhuTro k ON p.MaKhu = k.MaKhu
      LEFT JOIN NguoiDung nd_ql ON k.MaND = nd_ql.MaND
      LEFT JOIN (${SUBQUERY_THONG_TIN_CA_NHAN}) tt_ql ON nd_ql.MaND = tt_ql.MaND
      LEFT JOIN (${SUBQUERY_CHU_TRO}) ct ON 1 = 1
      WHERE td.MaTin = ?
        AND td.TrangThai = 'DangHienThi'
        AND p.TrangThai IN ('Trong', 'ConTrong', 'Trống', 'Còn trống')
        AND (td.NgayHetHan IS NULL OR td.NgayHetHan >= CURDATE())
      LIMIT 1
    `;
    const [rows] = await db.query(sql, [maTin]);
    if (!rows.length) return null;

    const enrichedRows = await attachImagesToTinDangRows(rows);
    return enrichedRows[0] || null;
  },

  // 4. Thêm mới tin đăng
  async createTinDang({ MaPhong, MaND, TieuDe, MoTa, NgayHetHan, TrangThai }) {
    await db.query(
      `DELETE FROM TinDang WHERE MaPhong = ? AND (TrangThai IS NULL OR TRIM(TrangThai) = '')`,
      [MaPhong]
    );

    const trangThaiTin =
      TrangThai && String(TrangThai).trim() !== ""
        ? String(TrangThai).trim()
        : "DangHienThi";

    const sql = `
      INSERT INTO TinDang (MaPhong, MaND, TieuDe, MoTa, NgayDang, NgayHetHan, TrangThai)
      VALUES (?, ?, ?, ?, NOW(), ?, ?)
    `;
    const [result] = await db.query(sql, [
      MaPhong,
      MaND,
      TieuDe,
      MoTa || null,
      normalizeDate(NgayHetHan),
      trangThaiTin,
    ]);
    return result.insertId;
  },

  // 5. Sửa tin đã đăng theo MaTin
  async updateTinDang(maTin, { MaPhong, TieuDe, MoTa, NgayHetHan, TrangThai }) {
    const sql = `
      UPDATE TinDang
      SET MaPhong = ?,
          TieuDe = ?,
          MoTa = ?,
          NgayHetHan = ?,
          TrangThai = ?
      WHERE MaTin = ?
    `;
    const [result] = await db.query(sql, [
      MaPhong,
      TieuDe,
      MoTa || null,
      normalizeDate(NgayHetHan),
      TrangThai || "DangHienThi",
      maTin,
    ]);
    return result.affectedRows > 0;
  },

  // 6. Xóa tin đăng theo MaTin
  async deleteTinDang(maTin) {
    const [rows] = await db.query(
      `SELECT MaPhong FROM TinDang WHERE MaTin = ? LIMIT 1`,
      [maTin]
    );
    if (!rows.length) {
      return false;
    }

    const maPhong = rows[0].MaPhong;

    const [result] = await db.query(
      `DELETE FROM TinDang WHERE MaTin = ? OR MaPhong = ?`,
      [maTin, maPhong]
    );
    return result.affectedRows > 0;
  },

  // 7. Cập nhật giá phòng
  async updateGiaPhong(maPhong, giaMoi) {
    const sql = `
      UPDATE Phong
      SET Gia = ?
      WHERE MaPhong = ?
    `;
    const [result] = await db.query(sql, [Number(giaMoi), Number(maPhong)]);
    return result.affectedRows > 0;
  },
};

module.exports = TinDangModel;