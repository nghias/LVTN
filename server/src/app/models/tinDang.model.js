// src/models/tinDang.model.js
const db = require("../../database/db");

// Cho phép phòng trống hoặc đang bảo trì (nhận cọc trước) được đăng tin & hiển thị
const DANH_SACH_TRANG_THAI_CHO_PHEP_DANG = [
  "Trong",
  "ConTrong",
  "Trống",
  "Còn trống",
  "BaoTri",
  "Bảo trì",
];

// Subquery lấy thông tin cá nhân theo từng MaND
const SUBQUERY_THONG_TIN_CA_NHAN = `
  SELECT MaND, MAX(HoTen) AS HoTen, MAX(SDT) AS SDT, MAX(Email) AS Email
  FROM ThongTinCaNhan
  GROUP BY MaND
`;

// Subquery lấy thông tin Chủ trọ (tài khoản có Quyen = 'ChuTro')
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

// Chuẩn hóa giá trị TrangThai từ FE gửi lên về đúng chuẩn DB
function normalizeTrangThaiTin(value) {
  if (!value || String(value).trim() === "") return "DangHienThi";
  const raw = String(value).trim();
  const mapTrangThai = {
    DangHienThi: "DangHienThi",
    DaDang: "DangHienThi",
    HienThi: "DangHienThi",
    "Đã đăng": "DangHienThi",
    "Đang hiển thị": "DangHienThi",
    DaAn: "DaAn",
    An: "DaAn",
    "Đã ẩn": "DaAn",
    HetHan: "HetHan",
    "Hết hạn": "HetHan",
  };
  return mapTrangThai[raw] || "DangHienThi";
}

// Chuẩn hóa Date object hoặc chuỗi ISO về YYYY-MM-DD cho MySQL 8.4
function normalizeDate(value) {
  if (!value) return null;

  if (value instanceof Date) {
    if (isNaN(value.getTime())) return null;
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  const str = String(value).trim();
  if (!str) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  if (str.includes("T")) {
    return str.split("T")[0];
  }

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const day = String(parsed.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  return null;
}

// Đảm bảo nếu tin đang là DangHienThi nhưng NgayHetHan đã qua thì tự động gia hạn +30 ngày
function ensureValidExpiryDate(ngayHetHan, trangThaiTin) {
  const normalized = normalizeDate(ngayHetHan);
  if (trangThaiTin !== "DangHienThi") {
    return normalized;
  }

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  // Nếu không truyền ngày hết hạn hoặc ngày hết hạn cũ nhỏ hơn hôm nay -> tự động +7 ngày (1 tuần)
  if (!normalized || normalized < todayStr) {
    const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const y = next7Days.getFullYear();
    const m = String(next7Days.getMonth() + 1).padStart(2, "0");
    const d = String(next7Days.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  return normalized;
}

// Gắn DanhSachAnh và TienIch vào từng tin đăng
async function attachImagesToTinDangRows(rows = []) {
  if (!rows.length) return [];

  const maPhongIds = [
    ...new Set(rows.map((r) => Number(r.MaPhong)).filter(Boolean)),
  ];

  if (maPhongIds.length === 0) return rows;

  const [allImages] = await db.query(
    `
      SELECT MaAnh, MaPhong, DuongDan, AnhChinh
      FROM AnhPhong
      WHERE MaPhong IN (?)
      ORDER BY MaPhong ASC, AnhChinh DESC, MaAnh ASC
    `,
    [maPhongIds]
  );

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

    const mainImgObj =
      anhPhongList.find((item) => Number(item.AnhChinh) === 1) ||
      anhPhongList[0] ||
      null;

    return {
      ...row,
      DienTich: Number(row.DienTich),
      Gia: Number(row.Gia),
      AnhDaiDien: mainImgObj ? mainImgObj.DuongDan : row.AnhDaiDien || null,
      DanhSachAnh: anhPhongList,
      AnhPhongList: anhPhongList,
      TienIch: tienIchPhong,
      DanhSachTienIch: tienIchPhong,
    };
  });
}

const TinDangModel = {
  normalizeTrangThaiTin,

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

  // Kiểm tra phòng có hợp lệ để tạo/chuyển tin đăng hay không
  async checkPhongCoTheDangTin(maPhong, excludeMaTin = null) {
    const params = [];
    let excludeClause = "";

    if (excludeMaTin) {
      excludeClause = "AND td.MaTin <> ?";
      params.push(excludeMaTin);
    }

    params.push(maPhong);

    // Chỉ chặn nếu phòng đang có một tin ĐANG HIỂN THỊ và CÒN HẠN
    const sql = `
      SELECT 
        p.MaPhong,
        p.TrangThai AS TrangThaiPhong,
        td.MaTin,
        td.TrangThai AS TrangThaiTin
      FROM Phong p
      LEFT JOIN TinDang td 
        ON p.MaPhong = td.MaPhong 
        AND td.TrangThai IN ('DangHienThi', 'DaDang')
        AND (td.NgayHetHan IS NULL OR td.NgayHetHan >= CURDATE())
        ${excludeClause}
      WHERE p.MaPhong = ?
      LIMIT 1
    `;

    const [rows] = await db.query(sql, params);
    if (!rows.length) {
      return { valid: false, reason: "NOT_FOUND" };
    }

    const phong = rows[0];

    if (!DANH_SACH_TRANG_THAI_CHO_PHEP_DANG.includes(phong.TrangThaiPhong)) {
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
          WHEN td.TrangThai IN ('DangHienThi', 'DaDang', 'Đã đăng', 'Đang hiển thị') THEN 'DangHienThi'
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

    // Cho phép chọn phòng Trống hoặc Bảo trì mà chưa có tin DangHienThi còn hạn
    const conditions = [
      "p.TrangThai IN ('Trong', 'ConTrong', 'Trống', 'Còn trống', 'BaoTri', 'Bảo trì')",
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
        AND td.TrangThai IN ('DangHienThi', 'DaDang')
        AND (td.NgayHetHan IS NULL OR td.NgayHetHan >= CURDATE())
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
        'DangHienThi' AS TrangThai,
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
      WHERE td.TrangThai IN ('DangHienThi', 'DaDang', 'Đã đăng', 'Đang hiển thị')
        AND p.TrangThai IN ('Trong', 'ConTrong', 'Trống', 'Còn trống', 'BaoTri', 'Bảo trì')
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
        'DangHienThi' AS TrangThai,
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
        AND td.TrangThai IN ('DangHienThi', 'DaDang', 'Đã đăng', 'Đang hiển thị')
        AND p.TrangThai IN ('Trong', 'ConTrong', 'Trống', 'Còn trống', 'BaoTri', 'Bảo trì')
        AND (td.NgayHetHan IS NULL OR td.NgayHetHan >= CURDATE())
      LIMIT 1
    `;
    const [rows] = await db.query(sql, [maTin]);
    if (!rows.length) return null;

    const enrichedRows = await attachImagesToTinDangRows(rows);
    return enrichedRows[0] || null;
  },

  // 4. Thêm mới tin đăng (Dọn dẹp tin cũ hết hạn/đã ẩn của cùng phòng để tránh trùng lặp)
  async createTinDang({ MaPhong, MaND, TieuDe, MoTa, NgayHetHan, TrangThai }) {
    await db.query(
      `DELETE FROM TinDang WHERE MaPhong = ? AND (TrangThai IS NULL OR TRIM(TrangThai) = '' OR TrangThai IN ('HetHan', 'DaAn') OR (NgayHetHan IS NOT NULL AND NgayHetHan < CURDATE()))`,
      [MaPhong]
    );

    const trangThaiTin = normalizeTrangThaiTin(TrangThai);
    const ngayHetHanChuan = ensureValidExpiryDate(NgayHetHan, trangThaiTin);

    const sql = `
      INSERT INTO TinDang (MaPhong, MaND, TieuDe, MoTa, NgayDang, NgayHetHan, TrangThai)
      VALUES (?, ?, ?, ?, NOW(), ?, ?)
    `;
    const [result] = await db.query(sql, [
      MaPhong,
      MaND,
      TieuDe,
      MoTa || null,
      ngayHetHanChuan,
      trangThaiTin,
    ]);
    return result.insertId;
  },

  // 5. Sửa tin đã đăng theo MaTin
  async updateTinDang(maTin, { MaPhong, TieuDe, MoTa, NgayHetHan, TrangThai }) {
    const trangThaiTin = normalizeTrangThaiTin(TrangThai);
    const ngayHetHanChuan = ensureValidExpiryDate(NgayHetHan, trangThaiTin);

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
      ngayHetHanChuan,
      trangThaiTin,
      maTin,
    ]);

    // Nếu người dùng bật tin sang DangHienThi mà phòng đó không còn khách ở thực tế (không có thành viên NgayDi IS NULL)
    // thì tự động đồng bộ trạng thái phòng về 'Trong' (tránh lỗi kẹt trạng thái như P.309)
    if (trangThaiTin === "DangHienThi" && MaPhong) {
      await db.query(
        `
          UPDATE Phong p
          SET p.TrangThai = 'Trong'
          WHERE p.MaPhong = ?
            AND p.TrangThai = 'DangThue'
            AND NOT EXISTS (
              SELECT 1
              FROM HopDongThue hdt
              INNER JOIN ChiTietHopDongThue cthdt ON hdt.MaHDT = cthdt.MaHDT
              WHERE hdt.MaPhong = p.MaPhong
                AND hdt.TrangThai = 'ConHieuLuc'
                AND cthdt.NgayDi IS NULL
            )
        `,
        [MaPhong]
      );
    }

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