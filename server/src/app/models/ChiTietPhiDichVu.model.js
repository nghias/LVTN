const db = require("../../database/db");

const ChiTietPhiDichVuModel = {
  // Lấy danh sách chi tiết phí dịch vụ theo Mã Hợp Đồng Thuê (MaHDT)
  getByMaHDT: async (maHDT) => {
    const sql = `
      SELECT c.MaHDT, c.MaDV, c.SoLuong, 
             d.TenDV, d.DonGia, d.DonViTinh
      FROM ChiTietPhiDichVu c
      JOIN PhiDichVu d ON c.MaDV = d.MaDV
      WHERE c.MaHDT = ?
    `;
    const [rows] = await db.execute(sql, [maHDT]);
    return rows;
  },

  // Thêm mới một bản ghi chi tiết phí dịch vụ
  create: async ({ MaHDT, MaDV, SoLuong }) => {
    const sql = `
      INSERT INTO ChiTietPhiDichVu (MaHDT, MaDV, SoLuong)
      VALUES (?, ?, ?)
    `;
    const [result] = await db.execute(sql, [MaHDT, MaDV, SoLuong]);
    return result.affectedRows > 0;
  },

  // Cập nhật số lượng dịch vụ của hợp đồng
  update: async (maHDT, maDV, { SoLuong }) => {
    const sql = `
      UPDATE ChiTietPhiDichVu
      SET SoLuong = ?
      WHERE MaHDT = ? AND MaDV = ?
    `;
    const [result] = await db.execute(sql, [SoLuong, maHDT, maDV]);
    return result.affectedRows > 0;
  },

  // Xóa dịch vụ khỏi hợp đồng
  delete: async (maHDT, maDV) => {
    const sql = `
      DELETE FROM ChiTietPhiDichVu 
      WHERE MaHDT = ? AND MaDV = ?
    `;
    const [result] = await db.execute(sql, [maHDT, maDV]);
    return result.affectedRows > 0;
  },
};

module.exports = ChiTietPhiDichVuModel;