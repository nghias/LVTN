const db = require("../../database/db");

const PhongTroModel = {
  // Lấy danh sách phòng theo danh sách MaKhu và bộ lọc
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

  // Lấy tất cả phòng thuộc 1 danh sách MaKhu (Dùng để đếm tổng số phòng / phòng trống)
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
  getPublicListByFilters: async ({
    maKhu,
    trangThai,
    keyword,
    minPrice,
    maxPrice,
    minArea,
    maxArea,
  } = {}) => {
    let sql = `
      SELECT MaPhong, MaKhu, TenPhong, DienTich, Gia, TrangThai
      FROM Phong
      WHERE 1 = 1
    `;
    const params = [];

    // Mặc định ẩn các phòng đang bảo trì trên trang Home nếu không truyền trangThai
    if (trangThai) {
      sql += ` AND TrangThai = ? `;
      params.push(trangThai);
    } else {
      sql += ` AND TrangThai != 'BaoTri' `;
    }

    if (maKhu) {
      sql += ` AND MaKhu = ? `;
      params.push(Number(maKhu));
    }

    if (keyword) {
      sql += ` AND TenPhong LIKE ? `;
      params.push(`%${keyword.trim()}%`);
    }

    if (minPrice !== undefined && minPrice !== "") {
      sql += ` AND Gia >= ? `;
      params.push(Number(minPrice));
    }

    if (maxPrice !== undefined && maxPrice !== "") {
      sql += ` AND Gia <= ? `;
      params.push(Number(maxPrice));
    }

    if (minArea !== undefined && minArea !== "") {
      sql += ` AND DienTich >= ? `;
      params.push(Number(minArea));
    }

    if (maxArea !== undefined && maxArea !== "") {
      sql += ` AND DienTich <= ? `;
      params.push(Number(maxArea));
    }

    // Ưu tiên hiển thị phòng 'Trong' lên đầu, sau đó sắp xếp theo mã khu và tên phòng
    sql += ` ORDER BY CASE WHEN TrangThai = 'Trong' THEN 0 ELSE 1 END, MaKhu ASC, TenPhong ASC `;

    const [rows] = await db.execute(sql, params);
    return rows;
  },
  // Lấy toàn bộ danh sách phòng cho trang Home (ẩn phòng đang Bảo trì)
  getAllPublicRooms: async () => {
    const sql = `
      SELECT MaPhong, MaKhu, TenPhong, DienTich, Gia, TrangThai
      FROM Phong
      WHERE TrangThai != 'BaoTri'
      ORDER BY CASE WHEN TrangThai = 'Trong' THEN 0 ELSE 1 END, MaKhu ASC, TenPhong ASC
    `;
    const [rows] = await db.execute(sql);
    return rows;
  },

  // Lấy danh sách bài đăng đang hiển thị từ bảng TinDang
  getActiveTinDang: async () => {
    const sql = `
      SELECT MaTin, MaPhong, MaND, TieuDe, MoTa, NgayDang, NgayHetHan, TrangThai
      FROM TinDang
      WHERE TrangThai = 'DangHienThi'
      ORDER BY NgayDang DESC
    `;
    const [rows] = await db.execute(sql);
    return rows;
  },

  // Lấy bảng giá điện nước mới nhất từ bảng GiaDienNuoc
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

  // Lấy danh sách phụ phí niêm yết từ bảng PhuPhi
  getAllPhuPhi: async () => {
    const sql = `
      SELECT MaPP, TenPP, Gia, GhiChu
      FROM PhuPhi
      ORDER BY MaPP ASC
    `;
    const [rows] = await db.execute(sql);
    return rows;
  },
  
  // Lấy chi tiết 1 phòng theo MaPhong
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

  // Đếm số lượng phòng trong 1 khu trọ
  countByMaKhu: async (maKhu) => {
    const sql = `SELECT COUNT(*) AS total FROM Phong WHERE MaKhu = ?`;
    const [rows] = await db.execute(sql, [maKhu]);
    return rows[0].total;
  },

  // Kiểm tra trùng tên phòng trong cùng 1 khu trọ
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

  // Thêm phòng mới
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

  // Sửa thông tin phòng
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

  // Xóa phòng
  delete: async (maPhong) => {
    const sql = `DELETE FROM Phong WHERE MaPhong = ?`;
    const [result] = await db.execute(sql, [maPhong]);
    return result.affectedRows > 0;
  },
};

module.exports = PhongTroModel;
