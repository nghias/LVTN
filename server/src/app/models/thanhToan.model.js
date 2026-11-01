// server/src/app/models/thanhToan.model.js
const db = require('../../database/db');

const ThanhToanModel = {
  // 1. Lấy tất cả giao dịch thanh toán
  getAll: async () => {
    const [rows] = await db.execute(
      `SELECT MaTT, MaHD, DATE_FORMAT(NgayTT, '%Y-%m-%d %H:%i:%s') AS NgayTT,
              SoTien, PhuongThuc, MinhChung, GhiChu, TrangThai
       FROM ThanhToan
       ORDER BY NgayTT DESC, MaTT DESC`
    );
    return rows;
  },

  // 2. Lấy chi tiết 1 giao dịch theo MaTT
  getById: async (maTT) => {
    const [rows] = await db.execute(
      `SELECT MaTT, MaHD, DATE_FORMAT(NgayTT, '%Y-%m-%d %H:%i:%s') AS NgayTT,
              SoTien, PhuongThuc, MinhChung, GhiChu, TrangThai
       FROM ThanhToan
       WHERE MaTT = ?
       LIMIT 1`,
      [Number(maTT)]
    );
    return rows[0] || null;
  },

  // 3. Lấy danh sách giao dịch của 1 hóa đơn (MaHD)
  getByMaHD: async (maHD) => {
    const [rows] = await db.execute(
      `SELECT MaTT, MaHD, DATE_FORMAT(NgayTT, '%Y-%m-%d %H:%i:%s') AS NgayTT,
              SoTien, PhuongThuc, MinhChung, GhiChu, TrangThai
       FROM ThanhToan
       WHERE MaHD = ?
       ORDER BY NgayTT DESC, MaTT DESC`,
      [Number(maHD)]
    );
    return rows;
  },

  // 4. Lấy danh sách giao dịch theo danh sách MaHD
  getByMaHDList: async (maHDList = []) => {
    if (!Array.isArray(maHDList) || maHDList.length === 0) return [];
    const placeholders = maHDList.map(() => '?').join(',');
    const [rows] = await db.execute(
      `SELECT MaTT, MaHD, DATE_FORMAT(NgayTT, '%Y-%m-%d %H:%i:%s') AS NgayTT,
              SoTien, PhuongThuc, MinhChung, GhiChu, TrangThai
       FROM ThanhToan
       WHERE MaHD IN (${placeholders})
       ORDER BY NgayTT DESC, MaTT DESC`,
      maHDList.map(Number)
    );
    return rows;
  },

  // 5. Tìm giao dịch theo mã orderCode của PayOS (lưu trong GhiChu hoặc MinhChung)
  findByPayOSOrderCode: async (orderCode) => {
    const token = `[PAYOS:${orderCode}]`;
    const [rows] = await db.execute(
      `SELECT MaTT, MaHD, DATE_FORMAT(NgayTT, '%Y-%m-%d %H:%i:%s') AS NgayTT,
              SoTien, PhuongThuc, MinhChung, GhiChu, TrangThai
       FROM ThanhToan
       WHERE GhiChu LIKE ? OR MinhChung = ?
       ORDER BY MaTT DESC
       LIMIT 1`,
      [`%${token}%`, String(orderCode)]
    );
    return rows[0] || null;
  },

  // 6. Tính tổng số tiền đã thanh toán thành công của 1 MaHD
  getTotalPaidByMaHD: async (maHD) => {
    const [rows] = await db.execute(
      `SELECT COALESCE(SUM(SoTien), 0) AS TongDaTra
       FROM ThanhToan
       WHERE MaHD = ? AND TrangThai IN ('ThanhCong', 'DaThanhToan', '1', 1)`,
      [Number(maHD)]
    );
    return Number(rows[0]?.TongDaTra || 0);
  },

  // 7. Tạo mới giao dịch thanh toán
  create: async ({
    MaHD,
    NgayTT = null,
    SoTien,
    PhuongThuc,
    MinhChung = null,
    GhiChu = null,
    TrangThai = 'ChoXacNhan',
  }) => {
    if (NgayTT) {
      const [result] = await db.execute(
        `INSERT INTO ThanhToan (MaHD, NgayTT, SoTien, PhuongThuc, MinhChung, GhiChu, TrangThai)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          Number(MaHD),
          NgayTT,
          Number(SoTien) || 0,
          String(PhuongThuc).trim(),
          MinhChung || null,
          GhiChu || null,
          TrangThai,
        ]
      );
      return result.insertId;
    } else {
      const [result] = await db.execute(
        `INSERT INTO ThanhToan (MaHD, NgayTT, SoTien, PhuongThuc, MinhChung, GhiChu, TrangThai)
         VALUES (?, NOW(), ?, ?, ?, ?, ?)`,
        [
          Number(MaHD),
          Number(SoTien) || 0,
          String(PhuongThuc).trim(),
          MinhChung || null,
          GhiChu || null,
          TrangThai,
        ]
      );
      return result.insertId;
    }
  },

  // 8. Cập nhật trạng thái và ghi chú/minh chứng của giao dịch
  updateStatus: async (maTT, { TrangThai, GhiChu, MinhChung, NgayTT = false }) => {
    const fields = ['TrangThai = ?'];
    const params = [TrangThai];

    if (GhiChu !== undefined) {
      fields.push('GhiChu = ?');
      params.push(GhiChu);
    }
    if (MinhChung !== undefined) {
      fields.push('MinhChung = ?');
      params.push(MinhChung);
    }
    if (NgayTT) {
      fields.push('NgayTT = NOW()');
    }

    params.push(Number(maTT));
    const [result] = await db.execute(
      `UPDATE ThanhToan SET ${fields.join(', ')} WHERE MaTT = ?`,
      params
    );
    return result.affectedRows > 0;
  },

  // 9. Xóa giao dịch thanh toán
  delete: async (maTT) => {
    const [result] = await db.execute(
      `DELETE FROM ThanhToan WHERE MaTT = ?`,
      [Number(maTT)]
    );
    return result.affectedRows > 0;
  },
};

module.exports = ThanhToanModel;