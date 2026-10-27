// server/src/app/models/hoaDon.model.js
const db = require('../../database/db');

const HoaDonModel = {
  // 1. Lấy toàn bộ danh sách hóa đơn (sắp xếp mới nhất lên đầu)
  getAll: async () => {
    const [rows] = await db.execute(
      `SELECT MaHD, MaCS, MaPhong, MaGia, TienPhong, TienDien, TienNuoc, 
              TienPhuPhi, TienPhatSinh, TongTien, TienDaTra, 
              DATE_FORMAT(NgayTinh, '%Y-%m-%d') AS NgayTinh
       FROM HoaDon
       ORDER BY NgayTinh DESC, MaHD DESC`
    );
    return rows;
  },

  // 2. Lấy chi tiết 1 hóa đơn theo MaHD
  getById: async (maHD) => {
    const [rows] = await db.execute(
      `SELECT MaHD, MaCS, MaPhong, MaGia, TienPhong, TienDien, TienNuoc, 
              TienPhuPhi, TienPhatSinh, TongTien, TienDaTra, 
              DATE_FORMAT(NgayTinh, '%Y-%m-%d') AS NgayTinh
       FROM HoaDon
       WHERE MaHD = ?
       LIMIT 1`,
      [Number(maHD)]
    );
    return rows[0] || null;
  },

  // 3. Kiểm tra phòng đã có hóa đơn trong tháng (YYYY-MM) chưa
  getByPhongAndMonth: async (maPhong, thangNam) => {
    const [rows] = await db.execute(
      `SELECT MaHD, MaCS, MaPhong, DATE_FORMAT(NgayTinh, '%Y-%m-%d') AS NgayTinh
       FROM HoaDon
       WHERE MaPhong = ? AND DATE_FORMAT(NgayTinh, '%Y-%m') = ?
       LIMIT 1`,
      [Number(maPhong), String(thangNam).trim()]
    );
    return rows[0] || null;
  },

  // 4. Kiểm tra chỉ số điện nước (MaCS) đã được lập hóa đơn chưa
  getByMaCS: async (maCS) => {
    const [rows] = await db.execute(
      `SELECT MaHD, MaCS, MaPhong
       FROM HoaDon
       WHERE MaCS = ?
       LIMIT 1`,
      [Number(maCS)]
    );
    return rows[0] || null;
  },

  // 5. Lấy danh sách hóa đơn theo danh sách mã phòng (Phục vụ Quản lý & Khách thuê)
  getByRoomIds: async (roomIds = []) => {
    if (!Array.isArray(roomIds) || roomIds.length === 0) return [];
    const placeholders = roomIds.map(() => '?').join(',');
    const [rows] = await db.execute(
      `SELECT MaHD, MaCS, MaPhong, MaGia, TienPhong, TienDien, TienNuoc, 
              TienPhuPhi, TienPhatSinh, TongTien, TienDaTra, 
              DATE_FORMAT(NgayTinh, '%Y-%m-%d') AS NgayTinh
       FROM HoaDon
       WHERE MaPhong IN (${placeholders})
       ORDER BY NgayTinh DESC, MaHD DESC`,
      roomIds.map(Number)
    );
    return rows;
  },

  // 6. Tạo hóa đơn mới
  create: async (data) => {
    const {
      MaCS,
      MaPhong,
      MaGia,
      TienPhong,
      TienDien,
      TienNuoc,
      TienPhuPhi,
      TienPhatSinh,
      TongTien,
      TienDaTra = 0,
      NgayTinh,
    } = data;

    const [result] = await db.execute(
      `INSERT INTO HoaDon 
        (MaCS, MaPhong, MaGia, TienPhong, TienDien, TienNuoc, TienPhuPhi, TienPhatSinh, TongTien, TienDaTra, NgayTinh)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        Number(MaCS),
        Number(MaPhong),
        Number(MaGia),
        Number(TienPhong) || 0,
        Number(TienDien) || 0,
        Number(TienNuoc) || 0,
        Number(TienPhuPhi) || 0,
        Number(TienPhatSinh) || 0,
        Number(TongTien) || 0,
        Number(TienDaTra) || 0,
        NgayTinh,
      ]
    );
    return result.insertId;
  },

  // 7. Cập nhật hóa đơn (Khi sửa chỉ số điện nước hoặc thêm/bỏ phí phát sinh)
  update: async (maHD, data) => {
    const {
      TienPhong,
      TienDien,
      TienNuoc,
      TienPhuPhi,
      TienPhatSinh,
      TongTien,
      NgayTinh,
    } = data;

    const [result] = await db.execute(
      `UPDATE HoaDon
       SET TienPhong = ?,
           TienDien = ?,
           TienNuoc = ?,
           TienPhuPhi = ?,
           TienPhatSinh = ?,
           TongTien = ?,
           NgayTinh = ?
       WHERE MaHD = ?`,
      [
        Number(TienPhong) || 0,
        Number(TienDien) || 0,
        Number(TienNuoc) || 0,
        Number(TienPhuPhi) || 0,
        Number(TienPhatSinh) || 0,
        Number(TongTien) || 0,
        NgayTinh,
        Number(maHD),
      ]
    );
    return result.affectedRows > 0;
  },

  // 8. Xóa hóa đơn
  delete: async (maHD) => {
    const [result] = await db.execute(
      `DELETE FROM HoaDon WHERE MaHD = ?`,
      [Number(maHD)]
    );
    return result.affectedRows > 0;
  },
};

module.exports = HoaDonModel;