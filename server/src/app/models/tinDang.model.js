const pool = require("../../database/db");

const TinDangModel = {
  // Kiểm tra thông tin và quyền của người dùng
  async getNguoiDungById(maND) {
    const sql = `SELECT MaND, HoTen, Quyen FROM NguoiDung WHERE MaND = ? LIMIT 1`;
    const [rows] = await pool.query(sql, [maND]);
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
    const [rows] = await pool.query(sql, [maPhong, maND]);
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
    const [rows] = await pool.query(sql, [maTin, maND]);
    return rows.length > 0;
  },

  // 1. Lấy danh sách tin đăng cho trang Quản lý (Lấy cả tin hết hạn, chỉ xét quyền ChuTro / QuanLy)
  async getAllTinDang(maND, quyen) {
    // Chỉ duy nhất quyền ChuTro mới xem được tất cả tin đăng ở tất cả khu trọ
    const isChuTro = quyen === "ChuTro";
    const params = [];

    let whereClause = "";
    if (!isChuTro) {
      whereClause = "WHERE k.MaND = ?";
      params.push(maND);
    }

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
        k.TenKhu
      FROM TinDang td
      INNER JOIN Phong p ON td.MaPhong = p.MaPhong
      INNER JOIN KhuTro k ON p.MaKhu = k.MaKhu
      ${whereClause}
      ORDER BY td.NgayDang DESC, td.MaTin DESC
    `;

    const [rows] = await pool.query(sql, params);
    return rows.map((row) => ({
      ...row,
      DienTich: Number(row.DienTich),
      Gia: Number(row.Gia),
    }));
  },

  // 2. Lấy danh sách Phòng để chọn khi đăng tin (Chỉ ChuTro lấy tất cả, QuanLy chỉ lấy khu của mình)
  async getPhongListForSelect(maND, quyen) {
    const isChuTro = quyen === "ChuTro";
    const params = [];

    let whereClause = "";
    if (!isChuTro) {
      whereClause = "WHERE k.MaND = ?";
      params.push(maND);
    }

    const sql = `
      SELECT 
        p.MaPhong,
        p.TenPhong,
        p.DienTich,
        p.Gia,
        p.TrangThai,
        k.MaKhu,
        k.TenKhu,
        nd.HoTen AS TenChuTro,
        nd.SDT AS SDTChuTro
      FROM Phong p
      INNER JOIN KhuTro k ON p.MaKhu = k.MaKhu
      LEFT JOIN NguoiDung nd ON k.MaND = nd.MaND 
      ${whereClause}
      ORDER BY k.MaKhu ASC, p.MaPhong ASC
    `;

    const [rows] = await pool.query(sql, params);
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
        k.TenKhu
      FROM TinDang td
      INNER JOIN Phong p ON td.MaPhong = p.MaPhong
      INNER JOIN KhuTro k ON p.MaKhu = k.MaKhu
      WHERE td.TrangThai = 'DangHienThi'
        AND (td.NgayHetHan IS NULL OR td.NgayHetHan >= CURDATE())
      ORDER BY td.NgayDang DESC, td.MaTin DESC
    `;
    const [rows] = await pool.query(sql);
    return rows.map((row) => ({
      ...row,
      DienTich: Number(row.DienTich),
      Gia: Number(row.Gia),
    }));
  },

  // 4. Thêm mới tin đăng (Bảng TinDang)
  async createTinDang({ MaPhong, MaND, TieuDe, MoTa, NgayHetHan, TrangThai }) {
    const sql = `
      INSERT INTO TinDang (MaPhong, MaND, TieuDe, MoTa, NgayHetHan, TrangThai)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const [result] = await pool.query(sql, [
      MaPhong,
      MaND,
      TieuDe,
      MoTa || null,
      NgayHetHan || null,
      TrangThai || "DangHienThi",
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
    const [result] = await pool.query(sql, [
      MaPhong,
      TieuDe,
      MoTa || null,
      NgayHetHan || null,
      TrangThai,
      maTin,
    ]);
    return result.affectedRows > 0;
  },

  // 6. Xóa tin đăng theo MaTin
  async deleteTinDang(maTin) {
    const sql = `DELETE FROM TinDang WHERE MaTin = ?`;
    const [result] = await pool.query(sql, [maTin]);
    return result.affectedRows > 0;
  },
};

module.exports = TinDangModel;