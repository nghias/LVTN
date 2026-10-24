const pool = require("../../database/db");

const TinDangModel = {
  // 1. Lấy danh sách tất cả tin đăng kèm thông tin Phòng & Khu trọ
  async getAllTinDang() {
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
      ORDER BY td.NgayDang DESC, td.MaTin DESC
    `;
    const [rows] = await pool.query(sql);
    return rows.map((row) => ({
      ...row,
      DienTich: Number(row.DienTich),
      Gia: Number(row.Gia),
    }));
  },

  // 2. Lấy danh sách Phòng để Chủ trọ chọn khi đăng tin
  async getPhongListForSelect() {
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
      LEFT JOIN NguoiDung nd ON p.MaND = nd.MaND
      ORDER BY k.MaKhu ASC, p.MaPhong ASC
    `;
    const [rows] = await pool.query(sql);
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
