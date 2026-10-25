// C:\Users\nhat nguyen\Desktop\LVTN\server\src\app\models\phongTro.model.js
const db = require("../../database/db");

const PhongTroModel = {
  // Lấy danh sách phòng theo danh sách MaKhu (dùng cho quản lý - vẫn giữ lọc cơ bản)
  getListByFilters: async ({ maKhuIds = [], trangThai, keyword }) => {
    if (!maKhuIds || maKhuIds.length === 0) return [];
    const placeholders = maKhuIds.map(() => "?").join(",");
    let sql = `
      SELECT MaPhong, MaKhu, TenPhong, DienTich, Gia, TrangThai
      FROM Phong
      WHERE MaKhu IN (${placeholders})
    `;
    const params = [...maKhuIds];
    if (trangThai) {
      sql += ` AND TrangThai = ? `;
      params.push(trangThai);
    }
    if (keyword) {
      sql += ` AND TenPhong LIKE ? `;
      params.push(`%${keyword.trim()}%`);
    }
    sql += ` ORDER BY MaKhu ASC, TenPhong ASC `;
    const [rows] = await db.execute(sql, params);
    return rows;
  },

  // Lấy tất cả phòng thuộc 1 danh sách MaKhu (đếm tổng / trống)
  getByMaKhuIds: async (maKhuIds = []) => {
    if (!maKhuIds || maKhuIds.length === 0) return [];
    const placeholders = maKhuIds.map(() => "?").join(",");
    const sql = `
      SELECT MaPhong, MaKhu, TenPhong, DienTich, Gia, TrangThai
      FROM Phong
      WHERE MaKhu IN (${placeholders})
    `;
    const [rows] = await db.execute(sql, maKhuIds);
    return rows;
  },

  // ========== PUBLIC: Chỉ lấy phòng CÒN TRỐNG ==========
  getPublicListByFilters: async () => {
    const sql = `
      SELECT MaPhong, MaKhu, TenPhong, DienTich, Gia, TrangThai
      FROM Phong
      WHERE TrangThai = 'Trong'
      ORDER BY MaKhu ASC, TenPhong ASC
    `;
    const [rows] = await db.execute(sql);
    return rows;
  },

  // Lấy toàn bộ phòng trống cho trang Home
  getAllPublicRooms: async () => {
    const sql = `
      SELECT MaPhong, MaKhu, TenPhong, DienTich, Gia, TrangThai
      FROM Phong
      WHERE TrangThai = 'Trong'
      ORDER BY MaKhu ASC, TenPhong ASC
    `;
    const [rows] = await db.execute(sql);
    return rows;
  },

  // ========== API RIÊNG CHO TRANG HOME ==========
  // Chỉ lấy tin đăng có TrangThai = 'DangHienThi' VÀ Phòng có TrangThai = 'Trong'
  getPublicTinDangForHome: async ({ maKhu, mucGia, dienTich } = {}) => {
    let sql = `
      SELECT 
        td.MaTin,
        td.MaPhong,
        td.MaND,
        td.TieuDe,
        td.MoTa,
        td.NgayDang,
        td.NgayHetHan,
        td.TrangThai AS TrangThaiTin,
        p.MaKhu,
        p.TenPhong,
        p.DienTich,
        p.Gia,
        p.TrangThai AS TrangThaiPhong,
        k.TenKhu,
        k.DiaChi,
        k.MoTa AS MoTaKhu,
        k.MaND AS MaQuanLyKhu
      FROM TinDang td
      INNER JOIN Phong p ON td.MaPhong = p.MaPhong
      INNER JOIN KhuTro k ON p.MaKhu = k.MaKhu
      WHERE td.TrangThai = 'DangHienThi'
        AND p.TrangThai = 'Trong'
    `;
    const params = [];

    if (maKhu && maKhu !== "ALL") {
      sql += ` AND p.MaKhu = ? `;
      params.push(Number(maKhu));
    }

    if (mucGia === "DUOI_25") {
      sql += ` AND p.Gia < 2500000 `;
    } else if (mucGia === "TU_25_DEN_40") {
      sql += ` AND p.Gia >= 2500000 AND p.Gia <= 4000000 `;
    } else if (mucGia === "TREN_40") {
      sql += ` AND p.Gia > 4000000 `;
    }

    if (dienTich === "DUOI_20") {
      sql += ` AND p.DienTich < 20 `;
    } else if (dienTich === "TU_20_DEN_30") {
      sql += ` AND p.DienTich >= 20 AND p.DienTich <= 30 `;
    } else if (dienTich === "TREN_30") {
      sql += ` AND p.DienTich > 30 `;
    }

    sql += ` ORDER BY td.NgayDang DESC, td.MaTin DESC `;
    const [rows] = await db.execute(sql, params);
    return rows;
  },

  // Giữ lại hàm cũ nếu nơi khác còn gọi nhưng đồng bộ điều kiện phòng trống
  getActiveTinDang: async () => {
    const sql = `
      SELECT td.MaTin, td.MaPhong, td.MaND, td.TieuDe, td.MoTa, td.NgayDang, td.NgayHetHan, td.TrangThai
      FROM TinDang td
      INNER JOIN Phong p ON td.MaPhong = p.MaPhong
      WHERE td.TrangThai = 'DangHienThi'
        AND p.TrangThai = 'Trong'
      ORDER BY td.NgayDang DESC
    `;
    const [rows] = await db.execute(sql);
    return rows;
  },

  getLatestGiaDienNuoc: async () => {
    const sql = `
      SELECT MaGia, GiaDien, GiaNuoc, NgayApDung
      FROM GiaDienNuoc
      ORDER BY NgayApDung DESC, MaGia DESC
      LIMIT 1
    `;
    const [rows] = await db.execute(sql);
    return rows[0] || null;
  },

  getById: async (maPhong) => {
    const sql = `
      SELECT MaPhong, MaKhu, TenPhong, DienTich, Gia, TrangThai
      FROM Phong
      WHERE MaPhong = ?
      LIMIT 1
    `;
    const [rows] = await db.execute(sql, [maPhong]);
    return rows[0] || null;
  },

  countByMaKhu: async (maKhu) => {
    const sql = `SELECT COUNT(*) AS total FROM Phong WHERE MaKhu = ?`;
    const [rows] = await db.execute(sql, [maKhu]);
    return rows[0].total;
  },

  checkDuplicateTenPhong: async (maKhu, tenPhong, excludeMaPhong = null) => {
    let sql = `
      SELECT MaPhong
      FROM Phong
      WHERE MaKhu = ? AND LOWER(TenPhong) = LOWER(?)
    `;
    const params = [maKhu, tenPhong.trim()];
    if (excludeMaPhong) {
      sql += ` AND MaPhong != ? `;
      params.push(excludeMaPhong);
    }
    const [rows] = await db.execute(sql, params);
    return rows.length > 0;
  },

  create: async ({ MaKhu, TenPhong, DienTich, Gia, TrangThai }) => {
    const sql = `
      INSERT INTO Phong (MaKhu, TenPhong, DienTich, Gia, TrangThai)
      VALUES (?, ?, ?, ?, ?)
    `;
    const [result] = await db.execute(sql, [
      MaKhu,
      TenPhong,
      DienTich,
      Gia,
      TrangThai || "Trong",
    ]);
    return result.insertId;
  },

  update: async (maPhong, { MaKhu, TenPhong, DienTich, Gia, TrangThai }) => {
    const sql = `
      UPDATE Phong
      SET MaKhu = ?, TenPhong = ?, DienTich = ?, Gia = ?, TrangThai = ?
      WHERE MaPhong = ?
    `;
    const [result] = await db.execute(sql, [
      MaKhu,
      TenPhong,
      DienTich,
      Gia,
      TrangThai,
      maPhong,
    ]);
    return result.affectedRows > 0;
  },

  delete: async (maPhong) => {
    const sql = `DELETE FROM Phong WHERE MaPhong = ?`;
    const [result] = await db.execute(sql, [maPhong]);
    return result.affectedRows > 0;
  },
};

module.exports = PhongTroModel;