const db = require("../../database/db");

// Chuẩn hóa chuỗi ngày về định dạng YYYY-MM-DD cho cột DATE của MySQL 8.4
function normalizeDate(value) {
  if (!value || String(value).trim() === "") return null;
  const str = String(value).trim();
  // Nếu FE gửi định dạng ISO (VD: 2026-11-20T00:00:00.000Z) thì cắt lấy YYYY-MM-DD
  if (str.includes("T")) {
    return str.split("T")[0];
  }
  return str;
}

const TinDangModel = {
  // Kiểm tra thông tin và quyền của người dùng (JOIN với ThongTinCaNhan)
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
      LEFT JOIN ThongTinCaNhan ttcn ON nd.MaND = ttcn.MaND
      WHERE nd.MaND = ?
      LIMIT 1
    `;
    const [rows] = await db.query(sql, [maND]);
    return rows[0] || null;
  },

  // Lấy thông tin chi tiết 1 tin đăng theo MaTin
  async getTinDangById(maTin) {
    const sql = `SELECT * FROM TinDang WHERE MaTin = ? LIMIT 1`;
    const [rows] = await db.query(sql, [maTin]);
    return rows[0] || null;
  },

  // Kiểm tra phòng có thuộc khu trọ do người dùng này quản lý hay không
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

  // Kiểm tra tin đăng có thuộc khu trọ do người dùng này quản lý hay không
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

  // Kiểm tra phòng có đủ điều kiện đăng tin mới không (Phải còn trống VÀ chưa có trạng thái tin)
  async checkPhongCoTheDangTin(maPhong, excludeMaTin = null) {
    const params = [];
    let excludeClause = "";

    // Lưu ý: excludeClause nằm trong LEFT JOIN (trước WHERE) nên phải push excludeMaTin trước
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
    const danhSachTrangThaiTrong = ["Trong", "ConTrong", "Trống", "Còn trống"];

    if (!danhSachTrangThaiTrong.includes(phong.TrangThaiPhong)) {
      return { valid: false, reason: "NOT_EMPTY" };
    }

    if (phong.MaTin) {
      return { valid: false, reason: "ALREADY_HAS_STATUS" };
    }

    return { valid: true };
  },

  // 1. Lấy danh sách tin đăng cho trang Quản lý (Chỉ lấy những tin đang có trạng thái)
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
        COALESCE(ttcn.HoTen, nd.TenTK) AS TenChuTro,
        ttcn.SDT AS SDTChuTro,
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
      LEFT JOIN NguoiDung nd ON k.MaND = nd.MaND
      LEFT JOIN ThongTinCaNhan ttcn ON nd.MaND = ttcn.MaND
      ${whereClause}
      ORDER BY td.NgayDang DESC, td.MaTin DESC
    `;

    const [rows] = await db.query(sql, params);
    return rows.map((row) => ({
      ...row,
      DienTich: Number(row.DienTich),
      Gia: Number(row.Gia),
    }));
  },

  // 2. Lấy danh sách Phòng gửi qua FE để chọn khi đăng tin mới
  // Chỉ lấy phòng CÒN TRỐNG và KHÔNG CÓ TRẠNG THÁI TIN
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
        COALESCE(ttcn.HoTen, nd.TenTK) AS TenChuTro,
        ttcn.SDT AS SDTChuTro
      FROM Phong p
      INNER JOIN KhuTro k ON p.MaKhu = k.MaKhu
      LEFT JOIN NguoiDung nd ON k.MaND = nd.MaND
      LEFT JOIN ThongTinCaNhan ttcn ON nd.MaND = ttcn.MaND
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

  // 3. Lấy danh sách tin đăng công khai cho Trang chủ (Chỉ lấy tin DangHienThi và chưa hết hạn)
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
        COALESCE(ttcn.HoTen, nd.TenTK) AS TenChuTro,
        ttcn.SDT AS SDTChuTro,
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
      LEFT JOIN NguoiDung nd ON k.MaND = nd.MaND
      LEFT JOIN ThongTinCaNhan ttcn ON nd.MaND = ttcn.MaND
      WHERE td.TrangThai = 'DangHienThi'
        AND (td.NgayHetHan IS NULL OR td.NgayHetHan >= CURDATE())
      ORDER BY td.NgayDang DESC, td.MaTin DESC
    `;
    const [rows] = await db.query(sql);
    return rows.map((row) => ({
      ...row,
      DienTich: Number(row.DienTich),
      Gia: Number(row.Gia),
    }));
  },

  // 4. Thêm mới tin đăng
  async createTinDang({ MaPhong, MaND, TieuDe, MoTa, NgayHetHan, TrangThai }) {
    // Dọn bản ghi rỗng (không có trạng thái) của phòng này nếu có trước khi thêm mới
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

  // 6. Xóa tin đăng theo MaTin (Xóa luôn trạng thái tin của phòng để phòng xuất hiện lại ở phần thêm tin)
  async deleteTinDang(maTin) {
    const [rows] = await db.query(
      `SELECT MaPhong FROM TinDang WHERE MaTin = ? LIMIT 1`,
      [maTin]
    );
    if (!rows.length) {
      return false;
    }

    const maPhong = rows[0].MaPhong;

    // Xóa tin đăng và toàn bộ trạng thái tin gắn với phòng đó
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