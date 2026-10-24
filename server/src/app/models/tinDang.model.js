const pool = require("../../database/db");

const TinDangModel = {
  // Kiểm tra thông tin và quyền của người dùng
  async getNguoiDungById(maND) {
    const sql = `SELECT MaND, Quyen FROM NguoiDung WHERE MaND = ? LIMIT 1`;
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

  // 1. Lấy danh sách tin đăng kèm thông tin Phòng & Khu trọ (Phân quyền theo ChuTro / QuanLy)
  async getAllTinDang(maND, quyen) {
    const isChuTro = quyen === "ChuTro" || quyen === "Admin";
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

  // 2. Lấy danh sách Phòng để chọn khi đăng tin (Chủ trọ lấy tất cả, Quản lý chỉ lấy cơ sở mình quản lý)
  async getPhongListForSelect(maND, quyen) {
    const isChuTro = quyen === "ChuTro" || quyen === "Admin";
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
    return rows;
  },

  // 3. Thêm mới tin đăng (Bảng TinDang)
  async createTinDang({ MaPhong, MaND, TieuDe, MoTa, NgayHetHan, TrangThai }) {
    const sql = `
      INSERT INTO TinDang (MaPhong, MaND, TieuDe, MoTa, NgayHetHan, TrangThai)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const [result] = await pool.query(sql, [
      MaPhong,
      MaND || 1,
      TieuDe,
      MoTa || null,
      NgayHetHan || null,
      TrangThai || "DangHienThi",
    ]);
    return result.insertId;
  },

  // 4. Sửa tin đã đăng theo MaTin
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

  // 5. Xóa tin đăng theo MaTin
  async deleteTinDang(maTin) {
    const sql = `DELETE FROM TinDang WHERE MaTin = ?`;
    const [result] = await pool.query(sql, [maTin]);
    return result.affectedRows > 0;
  },
};

module.exports = TinDangModel;