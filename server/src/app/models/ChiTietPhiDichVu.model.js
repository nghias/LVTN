// server/src/app/models/chiTietDichVu.model.js
const db = require('../../database/db');

// Đổi thành 'ChiTietDichVu' nếu tên bảng trong CSDL của bạn là ChiTietDichVu
const TABLE_NAME = 'ChiTietPhiDichVu';

const ChiTietDichVuModel = {
  // 1. Lấy toàn bộ bản ghi (MaHDT, MaDV, SoLuong)
  getAll: async () => {
    const sql = `SELECT MaHDT, MaDV, SoLuong FROM ${TABLE_NAME}`;
    const [rows] = await db.execute(sql);
    return rows;
  },

  // 2. Lấy danh sách hợp đồng đang sử dụng 1 dịch vụ (MaDV)
  getByMaDV: async (maDV) => {
    const sql = `
      SELECT MaHDT, MaDV, SoLuong
      FROM ${TABLE_NAME}
      WHERE MaDV = ?
    `;
    const [rows] = await db.execute(sql, [maDV]);
    return rows;
  },

  // 3. Lấy danh sách dịch vụ đã đăng ký của 1 hợp đồng (Dùng khi xem/sửa Hợp đồng)
  getByMaHDT: async (maHDT) => {
    const sql = `
      SELECT MaHDT, MaDV, SoLuong
      FROM ${TABLE_NAME}
      WHERE MaHDT = ?
    `;
    const [rows] = await db.execute(sql, [maHDT]);
    return rows;
  },

  // 4. Lấy danh sách dịch vụ của nhiều hợp đồng cùng lúc
  getByMaHDTList: async (maHDTIds = []) => {
    if (!maHDTIds || maHDTIds.length === 0) return [];
    const placeholders = maHDTIds.map(() => '?').join(',');
    const sql = `
      SELECT MaHDT, MaDV, SoLuong
      FROM ${TABLE_NAME}
      WHERE MaHDT IN (${placeholders})
    `;
    const [rows] = await db.execute(sql, maHDTIds);
    return rows;
  },

  // 5. Đếm tổng số hợp đồng đang áp dụng 1 dịch vụ (Kiểm tra trước khi xóa dịch vụ)
  countByMaDV: async (maDV) => {
    const sql = `SELECT COUNT(*) AS total FROM ${TABLE_NAME} WHERE MaDV = ?`;
    const [rows] = await db.execute(sql, [maDV]);
    return rows[0]?.total || 0;
  },

  // 6. Gán dịch vụ vào hợp đồng kèm số lượng (Dùng khi tạo/sửa Hợp đồng)
  create: async (maHDT, maDV, soLuong = 1) => {
    const sql = `
      INSERT INTO ${TABLE_NAME} (MaHDT, MaDV, SoLuong)
      VALUES (?, ?, ?)
    `;
    await db.execute(sql, [
      Number(maHDT),
      Number(maDV),
      Math.max(1, Number(soLuong) || 1),
    ]);
    return true;
  },

  // 7. Xóa toàn bộ dịch vụ của 1 hợp đồng (Dùng khi cập nhật lại dịch vụ của Hợp đồng)
  deleteByMaHDT: async (maHDT) => {
    const sql = `DELETE FROM ${TABLE_NAME} WHERE MaHDT = ?`;
    await db.execute(sql, [maHDT]);
    return true;
  },

  // 8. Xóa theo MaDV
  deleteByMaDV: async (maDV) => {
    const sql = `DELETE FROM ${TABLE_NAME} WHERE MaDV = ?`;
    await db.execute(sql, [maDV]);
    return true;
  },
};

module.exports = ChiTietDichVuModel;