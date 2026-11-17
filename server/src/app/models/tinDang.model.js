// src/models/tinDang.model.js
const db = require('../../database/db');

// Cho phép phòng trống hoặc đang bảo trì được đăng tin mới
const DANH_SACH_TRANG_THAI_CHO_PHEP_DANG = [
  'Trong',
  'ConTrong',
  'Con trong',
  'DangTrong',
  'Dang trong',
  'Trống',
  'Còn trống',
  'Đang trống',
  'BaoTri',
  'Bao tri',
  'Bảo trì',
  'Đang bảo trì',
];

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

// Chuẩn hóa giá trị TrangThai từ FE gửi lên về đúng chuẩn DB
function normalizeTrangThaiTin(value) {
  if (!value || String(value).trim() === '') return 'DangHienThi';
  const raw = String(value).trim();
  const mapTrangThai = {
    DangHienThi: 'DangHienThi',
    DaDang: 'DangHienThi',
    HienThi: 'DangHienThi',
    'Đã đăng': 'DangHienThi',
    'Đang hiển thị': 'DangHienThi',
    DaAn: 'DaAn',
    An: 'DaAn',
    'Đã ẩn': 'DaAn',
    HetHan: 'HetHan',
    'Hết hạn': 'HetHan',
    'Đã hết hạn': 'HetHan',
  };
  return mapTrangThai[raw] || 'DangHienThi';
}

// Chuẩn hóa Date object hoặc chuỗi ISO về YYYY-MM-DD cho MySQL
function normalizeDate(value) {
  if (!value) return null;

  if (value instanceof Date) {
    if (isNaN(value.getTime())) return null;
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const str = String(value).trim();
  if (!str) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  if (str.includes('T')) {
    return str.split('T')[0];
  }

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return null;
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

  // Tự động chuyển các tin đã quá NgayHetHan sang trạng thái 'HetHan'
  async syncExpiredTinDang() {
    await db.query(`
      UPDATE tindang
      SET TrangThai = 'HetHan'
      WHERE TrangThai IN ('DangHienThi', 'DaDang', 'Đã đăng', 'Đang hiển thị')
        AND NgayHetHan IS NOT NULL
        AND NgayHetHan < CURDATE()
    `);
  },

  async getNguoiDungById(maND) {
    const sql = `
      SELECT 
        nd.MaND,
        nd.TenTK,
        nd.Quyen,
        COALESCE(ttcn.HoTen, nd.TenTK) AS HoTen,
        ttcn.SDT,
        ttcn.Email
      FROM nguoidung nd
      LEFT JOIN (${SUBQUERY_THONG_TIN_CA_NHAN}) ttcn ON nd.MaND = ttcn.MaND
      WHERE nd.MaND = ?
      LIMIT 1
    `;
    const [rows] = await db.query(sql, [maND]);
    return rows[0] || null;
  },

  async getChuTroMacDinh() {
    const sql = `
      SELECT 
        nd.MaND,
        nd.TenTK,
        nd.Quyen,
        COALESCE(ttcn.HoTen, nd.TenTK) AS HoTen,
        ttcn.SDT,
        ttcn.Email
      FROM nguoidung nd
      LEFT JOIN (${SUBQUERY_THONG_TIN_CA_NHAN}) ttcn ON nd.MaND = ttcn.MaND
      WHERE nd.Quyen = 'ChuTro'
      ORDER BY nd.MaND ASC
      LIMIT 1
    `;
    const [rows] = await db.query(sql);
    return rows[0] || null;
  },

  async getTinDangById(maTin) {
    const sql = `SELECT * FROM tindang WHERE MaTin = ? LIMIT 1`;
    const [rows] = await db.query(sql, [maTin]);
    return rows[0] || null;
  },

  // Lấy danh sách khu trọ theo vai trò (ChuTro thấy tất cả, QuanLy thấy khu mình quản lý)
  async getKhuTroList(maND, quyen) {
    const hasFullAccess = quyen === 'ChuTro' || quyen === 'Admin';
    const params = [];
    let whereClause = '';

    if (!hasFullAccess) {
      whereClause = 'WHERE k.MaND = ?';
      params.push(maND);
    }

    const sql = `
      SELECT k.MaKhu, k.MaND, k.TenKhu, k.MoTa, k.DiaChi
      FROM khutro k
      ${whereClause}
      ORDER BY k.MaKhu ASC
    `;
    const [rows] = await db.query(sql, params);
    return rows;
  },

  // Kiểm tra phòng có thuộc khu trọ do Quản lý (khutro.MaND) phụ trách hay không
  async checkPhongThuocQuanLy(maPhong, maND) {
    const sql = `
      SELECT p.MaPhong
      FROM phong p
      INNER JOIN khutro k ON p.MaKhu = k.MaKhu
      WHERE p.MaPhong = ? AND k.MaND = ?
      LIMIT 1
    `;
    const [rows] = await db.query(sql, [maPhong, maND]);
    return rows.length > 0;
  },

  // Kiểm tra tin đăng có thuộc khu trọ do Quản lý (khutro.MaND) phụ trách hay không (không lọc theo tindang.MaND)
  async checkTinThuocQuanLy(maTin, maND) {
    const sql = `
      SELECT td.MaTin
      FROM tindang td
      INNER JOIN phong p ON td.MaPhong = p.MaPhong
      INNER JOIN khutro k ON p.MaKhu = k.MaKhu
      WHERE td.MaTin = ? AND k.MaND = ?
      LIMIT 1
    `;
    const [rows] = await db.query(sql, [maTin, maND]);
    return rows.length > 0;
  },

  // Kiểm tra phòng có hợp lệ để đăng tin mới hay không (Bỏ qua tin HetHan và DaAn)
  async checkPhongCoTheDangTin(maPhong, excludeMaTin = null) {
    const params = [];
    let excludeClause = '';

    if (excludeMaTin) {
      excludeClause = 'AND td.MaTin <> ?';
      params.push(excludeMaTin);
    }

    params.push(maPhong);

    const sql = `
      SELECT 
        p.MaPhong,
        TRIM(p.TrangThai) AS TrangThaiPhong,
        td.MaTin AS ActiveMaTin,
        (
          SELECT COUNT(*)
          FROM tindang td_old
          WHERE td_old.MaPhong = p.MaPhong
            AND (
              TRIM(td_old.TrangThai) IN ('HetHan', 'Hết hạn', 'Đã hết hạn')
              OR (td_old.NgayHetHan IS NOT NULL AND td_old.NgayHetHan < CURDATE())
            )
        ) AS SoTinHetHan
      FROM phong p
      LEFT JOIN tindang td 
        ON p.MaPhong = td.MaPhong 
        AND TRIM(td.TrangThai) IN ('DangHienThi', 'DaDang', 'Đã đăng', 'Đang hiển thị')
        AND (td.NgayHetHan IS NULL OR td.NgayHetHan >= CURDATE())
        ${excludeClause}
      WHERE p.MaPhong = ?
      LIMIT 1
    `;

    const [rows] = await db.query(sql, params);
    if (!rows.length) {
      return { valid: false, reason: 'NOT_FOUND' };
    }

    const phong = rows[0];

    // Nếu đã có tin đang hiển thị còn hạn thì chặn không cho đăng trùng
    if (phong.ActiveMaTin) {
      return { valid: false, reason: 'ALREADY_HAS_STATUS' };
    }

    const isAllowedStatus = DANH_SACH_TRANG_THAI_CHO_PHEP_DANG.some(
      (st) =>
        st.toLowerCase() === String(phong.TrangThaiPhong || '').toLowerCase()
    );

    // Cho phép nếu phòng đang Trống/Bảo trì HOẶC phòng có tin đăng đã hết hạn
    if (!isAllowedStatus && Number(phong.SoTinHetHan) === 0) {
      return { valid: false, reason: 'NOT_EMPTY' };
    }

    return { valid: true };
  },

  // 1. Lấy danh sách tin đăng cho trang Quản lý (Lọc theo khutro.MaND đối với QuanLy, lấy tất cả đối với ChuTro)
  async getAllTinDang(maND, quyen) {
    const hasFullAccess = quyen === 'ChuTro' || quyen === 'Admin';
    const params = [];

    const conditions = [
      'td.TrangThai IS NOT NULL',
      "TRIM(td.TrangThai) <> ''",
    ];

    // Quản lý chỉ thấy tin của khu mình quản lý (k.MaND), không lọc theo người tạo tin (td.MaND)
    if (!hasFullAccess) {
      conditions.push('k.MaND = ?');
      params.push(maND);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

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
          WHEN td.TrangThai IN ('HetHan', 'Hết hạn', 'Đã hết hạn') 
            OR (td.NgayHetHan IS NOT NULL AND td.NgayHetHan < CURDATE()) THEN 'HetHan'
          WHEN td.TrangThai IN ('DaAn', 'An', 'Đã ẩn') THEN 'DaAn'
          ELSE 'DangHienThi'
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
          FROM anhphong ap
          WHERE ap.MaPhong = p.MaPhong
          ORDER BY ap.AnhChinh DESC, ap.MaAnh ASC
          LIMIT 1
        ) AS AnhDaiDien
      FROM tindang td
      INNER JOIN phong p ON td.MaPhong = p.MaPhong
      INNER JOIN khutro k ON p.MaKhu = k.MaKhu
      LEFT JOIN nguoidung nd_ql ON k.MaND = nd_ql.MaND
      LEFT JOIN (${SUBQUERY_THONG_TIN_CA_NHAN}) tt_ql ON nd_ql.MaND = tt_ql.MaND
      LEFT JOIN (${SUBQUERY_CHU_TRO}) ct ON 1 = 1
      ${whereClause}
      ORDER BY td.NgayDang DESC, td.MaTin DESC
    `;

    const [rows] = await db.query(sql, params);
    return attachImagesToTinDangRows(rows);
  },

  // 2. Lấy danh sách Phòng gửi qua FE để chọn khi đăng tin mới
  // - ChuTro: Thấy tất cả phòng trống / bảo trì chưa có tin DangHienThi còn hạn ở mọi khu trọ
  // - QuanLy: Thấy tất cả phòng trống / bảo trì chưa có tin DangHienThi còn hạn thuộc khu mình quản lý (k.MaND)
  // - Phòng mới thêm hoặc phòng chỉ có tin HetHan / DaAn đều được hiển thị đầy đủ
  async getPhongListForSelect(maND, quyen, excludeMaTin = null) {
    const hasFullAccess = quyen === 'ChuTro' || quyen === 'Admin';
    const params = [];
    let excludeJoinClause = '';

    if (excludeMaTin) {
      excludeJoinClause = 'AND td.MaTin <> ?';
      params.push(excludeMaTin);
    }

    const conditions = [
      'td.MaTin IS NULL',
      `(
        TRIM(p.TrangThai) IN ('Trong', 'ConTrong', 'Con trong', 'DangTrong', 'Dang trong', 'Trống', 'Còn trống', 'Đang trống', 'BaoTri', 'Bao tri', 'Bảo trì', 'Đang bảo trì')
        OR EXISTS (
          SELECT 1 FROM tindang td_exp
          WHERE td_exp.MaPhong = p.MaPhong
            AND (
              TRIM(td_exp.TrangThai) IN ('HetHan', 'Hết hạn', 'Đã hết hạn')
              OR (td_exp.NgayHetHan IS NOT NULL AND td_exp.NgayHetHan < CURDATE())
            )
        )
      )`,
    ];

    if (!hasFullAccess) {
      conditions.push('k.MaND = ?');
      params.push(maND);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

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
      FROM phong p
      INNER JOIN khutro k ON p.MaKhu = k.MaKhu
      LEFT JOIN nguoidung nd_ql ON k.MaND = nd_ql.MaND
      LEFT JOIN (${SUBQUERY_THONG_TIN_CA_NHAN}) tt_ql ON nd_ql.MaND = tt_ql.MaND
      LEFT JOIN (${SUBQUERY_CHU_TRO}) ct ON 1 = 1
      LEFT JOIN tindang td 
        ON p.MaPhong = td.MaPhong 
        AND TRIM(td.TrangThai) IN ('DangHienThi', 'DaDang', 'Đã đăng', 'Đang hiển thị')
        AND (td.NgayHetHan IS NULL OR td.NgayHetHan >= CURDATE())
        ${excludeJoinClause}
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
    await this.syncExpiredTinDang();

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
          FROM anhphong ap
          WHERE ap.MaPhong = p.MaPhong
          ORDER BY ap.AnhChinh DESC, ap.MaAnh ASC
          LIMIT 1
        ) AS AnhDaiDien
      FROM tindang td
      INNER JOIN phong p ON td.MaPhong = p.MaPhong
      INNER JOIN khutro k ON p.MaKhu = k.MaKhu
      LEFT JOIN nguoidung nd_ql ON k.MaND = nd_ql.MaND
      LEFT JOIN (${SUBQUERY_THONG_TIN_CA_NHAN}) tt_ql ON nd_ql.MaND = tt_ql.MaND
      LEFT JOIN (${SUBQUERY_CHU_TRO}) ct ON 1 = 1
      WHERE TRIM(td.TrangThai) IN ('DangHienThi', 'DaDang', 'Đã đăng', 'Đang hiển thị')
        AND TRIM(p.TrangThai) IN ('Trong', 'ConTrong', 'Con trong', 'DangTrong', 'Dang trong', 'Trống', 'Còn trống', 'Đang trống', 'BaoTri', 'Bao tri', 'Bảo trì', 'Đang bảo trì')
        AND (td.NgayHetHan IS NULL OR td.NgayHetHan >= CURDATE())
      ORDER BY td.NgayDang DESC, td.MaTin DESC
    `;
    const [rows] = await db.query(sql);
    return attachImagesToTinDangRows(rows);
  },

  // 3.1. Lấy chi tiết 1 tin đăng công khai theo MaTin
  async getPublicTinDangById(maTin) {
    await this.syncExpiredTinDang();

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
          FROM anhphong ap
          WHERE ap.MaPhong = p.MaPhong
          ORDER BY ap.AnhChinh DESC, ap.MaAnh ASC
          LIMIT 1
        ) AS AnhDaiDien
      FROM tindang td
      INNER JOIN phong p ON td.MaPhong = p.MaPhong
      INNER JOIN khutro k ON p.MaKhu = k.MaKhu
      LEFT JOIN nguoidung nd_ql ON k.MaND = nd_ql.MaND
      LEFT JOIN (${SUBQUERY_THONG_TIN_CA_NHAN}) tt_ql ON nd_ql.MaND = tt_ql.MaND
      LEFT JOIN (${SUBQUERY_CHU_TRO}) ct ON 1 = 1
      WHERE td.MaTin = ?
        AND TRIM(td.TrangThai) IN ('DangHienThi', 'DaDang', 'Đã đăng', 'Đang hiển thị')
        AND TRIM(p.TrangThai) IN ('Trong', 'ConTrong', 'Con trong', 'DangTrong', 'Dang trong', 'Trống', 'Còn trống', 'Đang trống', 'BaoTri', 'Bao tri', 'Bảo trì', 'Đang bảo trì')
        AND (td.NgayHetHan IS NULL OR td.NgayHetHan >= CURDATE())
      LIMIT 1
    `;
    const [rows] = await db.query(sql, [maTin]);
    if (!rows.length) return null;

    const enrichedRows = await attachImagesToTinDangRows(rows);
    return enrichedRows[0] || null;
  },

  // 4. Thêm mới tin đăng (Giữ nguyên lịch sử các tin đã HetHan trước đó, chỉ tạo bản ghi tin mới)
  async createTinDang({ MaPhong, MaND, TieuDe, MoTa, NgayHetHan, TrangThai }) {
    // Chỉ đồng bộ các tin cũ đã quá ngày hết hạn sang trạng thái 'HetHan', giữ nguyên bản ghi cũ
    await db.query(
      `
        UPDATE tindang
        SET TrangThai = 'HetHan'
        WHERE MaPhong = ?
          AND NgayHetHan IS NOT NULL
          AND NgayHetHan < CURDATE()
          AND TrangThai <> 'HetHan'
      `,
      [MaPhong]
    );

    const trangThaiTin = normalizeTrangThaiTin(TrangThai);
    const ngayHetHanChuan = ensureValidExpiryDate(NgayHetHan, trangThaiTin);

    // INSERT bản ghi tin đăng mới hoàn toàn (sinh MaTin mới)
    const sql = `
      INSERT INTO tindang (MaPhong, MaND, TieuDe, MoTa, NgayDang, NgayHetHan, TrangThai)
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
    let trangThaiTin = normalizeTrangThaiTin(TrangThai);
    const ngayHetHanChuan = normalizeDate(NgayHetHan);

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    // Nếu ngày hết hạn nhỏ hơn ngày hiện tại thì chuyển về HetHan (không tự động mở lại hạn tin cũ)
    if (ngayHetHanChuan && ngayHetHanChuan < todayStr) {
      trangThaiTin = 'HetHan';
    }

    const sql = `
      UPDATE tindang
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

    return result.affectedRows > 0;
  },

  // 6. Xóa đúng tin đăng theo MaTin (không xóa nhầm các tin lịch sử khác của cùng MaPhong)
  async deleteTinDang(maTin) {
    const [result] = await db.query(`DELETE FROM tindang WHERE MaTin = ?`, [
      maTin,
    ]);
    return result.affectedRows > 0;
  },

  // 7. Cập nhật giá phòng
  async updateGiaPhong(maPhong, giaMoi) {
    const sql = `
      UPDATE phong
      SET Gia = ?
      WHERE MaPhong = ?
    `;
    const [result] = await db.query(sql, [Number(giaMoi), Number(maPhong)]);
    return result.affectedRows > 0;
  },
};

module.exports = TinDangModel;