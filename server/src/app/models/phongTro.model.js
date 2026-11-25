// server/src/app/models/phongTro.model.js
const db = require("../../database/db");
const AnhPhongModel = require("./anhPhong.model");

const PhongTroModel = {
  // 1. Lấy danh sách phòng theo danh sách MaKhu (dùng cho quản lý)
  getListByFilters: async ({ maKhuIds = [], trangThai, keyword }) => {
    if (!maKhuIds || maKhuIds.length === 0) return [];
    const placeholders = maKhuIds.map(() => "?").join(",");
    let sql = `
      SELECT MaPhong, MaKhu, TenPhong, DienTich, Gia, TrangThai
      FROM phong
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

  // 2. Lấy tất cả phòng thuộc 1 danh sách MaKhu (đếm tổng / trống / đã đặt cọc)
  getByMaKhuIds: async (maKhuIds = []) => {
    if (!maKhuIds || maKhuIds.length === 0) return [];
    const placeholders = maKhuIds.map(() => "?").join(",");
    const sql = `
      SELECT MaPhong, MaKhu, TenPhong, DienTich, Gia, TrangThai
      FROM phong
      WHERE MaKhu IN (${placeholders})
      ORDER BY MaKhu ASC, TenPhong ASC
    `;
    const [rows] = await db.execute(sql, maKhuIds);
    return rows;
  },

  // 3. PUBLIC: Lấy phòng CÒN TRỐNG và ĐANG ĐƯỢC CỌC để hiển thị ngoài Trang chủ
  getPublicListByFilters: async () => {
    const sql = `
      SELECT MaPhong, MaKhu, TenPhong, DienTich, Gia, TrangThai
      FROM phong
      WHERE TrangThai IN ('Trong', 'DaDatCoc')
      ORDER BY (TrangThai = 'Trong') DESC, MaKhu ASC, MaPhong DESC
    `;
    const [rows] = await db.execute(sql);
    return rows;
  },

  // 4. Lấy toàn bộ phòng đang mở (Còn trống + Đang được cọc) cho trang Home
  getAllPublicRooms: async () => {
    const sql = `
      SELECT MaPhong, MaKhu, TenPhong, DienTich, Gia, TrangThai
      FROM phong
      WHERE TrangThai IN ('Trong', 'DaDatCoc')
      ORDER BY (TrangThai = 'Trong') DESC, MaKhu ASC, MaPhong DESC
    `;
    const [rows] = await db.execute(sql);
    return rows;
  },

  // 5. API RIÊNG CHO TRANG HOME (đọc trực tiếp từ bảng phong + khutro, bỏ bảng TinDang)
  getPublicTinDangForHome: async ({ maKhu, mucGia, dienTich } = {}) => {
    let sql = `
      SELECT
        p.MaPhong AS MaTin,
        p.MaPhong,
        k.MaND,
        CONCAT('Cho thuê phòng ', p.TenPhong, ' - ', k.TenKhu) AS TieuDe,
        COALESCE(k.MoTa, CONCAT('Phòng ', p.TenPhong, ' tại ', k.DiaChi)) AS MoTa,
        NOW() AS NgayDang,
        NULL AS NgayHetHan,
        'DangHienThi' AS TrangThaiTin,
        'DangHienThi' AS TrangThai,
        p.MaKhu,
        p.TenPhong,
        p.DienTich,
        p.Gia,
        p.TrangThai AS TrangThaiPhong,
        k.TenKhu,
        k.DiaChi,
        k.MoTa AS MoTaKhu,
        k.MaND AS MaQuanLyKhu
      FROM phong p
      INNER JOIN khutro k ON p.MaKhu = k.MaKhu
      WHERE p.TrangThai IN ('Trong', 'DaDatCoc')
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

    // Ưu tiên phòng Còn trống lên trước, phòng mới thêm (MaPhong lớn) lên đầu
    sql += ` ORDER BY (p.TrangThai = 'Trong') DESC, p.MaPhong DESC `;
    const [rows] = await db.execute(sql, params);

    if (rows.length === 0) return [];

    const maPhongIds = [...new Set(rows.map((r) => Number(r.MaPhong)))];
    const images = await AnhPhongModel.getByMaPhongList(maPhongIds);

    return rows.map((row) => {
      const roomImgs = images.filter(
        (img) => Number(img.MaPhong) === Number(row.MaPhong),
      );
      const mainImg =
        roomImgs.find((img) => Number(img.AnhChinh) === 1) ||
        roomImgs[0] ||
        null;

      return {
        ...row,
        CoTheDatCoc: row.TrangThaiPhong === "Trong",
        AnhDaiDienDB: mainImg ? mainImg.DuongDan : null,
        DanhSachAnh: roomImgs,
      };
    });
  },

  // 6. Giữ tương thích ngược cho các nơi còn gọi getActiveTinDang (đọc từ bảng phong)
  getActiveTinDang: async () => {
    const sql = `
      SELECT
        p.MaPhong AS MaTin,
        p.MaPhong,
        k.MaND,
        CONCAT('Cho thuê phòng ', p.TenPhong, ' - ', k.TenKhu) AS TieuDe,
        COALESCE(k.MoTa, CONCAT('Phòng ', p.TenPhong, ' tại ', k.DiaChi)) AS MoTa,
        NOW() AS NgayDang,
        NULL AS NgayHetHan,
        'DangHienThi' AS TrangThai,
        p.TrangThai AS TrangThaiPhong
      FROM phong p
      INNER JOIN khutro k ON p.MaKhu = k.MaKhu
      WHERE p.TrangThai IN ('Trong', 'DaDatCoc')
      ORDER BY (p.TrangThai = 'Trong') DESC, p.MaPhong DESC
    `;
    const [rows] = await db.execute(sql);
    return rows;
  },

  // 7. Lấy bảng giá điện nước mới nhất
  getLatestGiaDienNuoc: async () => {
    const sql = `
      SELECT MaGia, GiaDien, GiaNuoc, NgayApDung
      FROM giadiennuoc
      ORDER BY NgayApDung DESC, MaGia DESC
      LIMIT 1
    `;
    const [rows] = await db.execute(sql);
    return rows[0] || null;
  },

  // 8. Lấy chi tiết 1 phòng theo MaPhong
  getById: async (maPhong) => {
    const sql = `
      SELECT MaPhong, MaKhu, TenPhong, DienTich, Gia, TrangThai
      FROM phong
      WHERE MaPhong = ?
      LIMIT 1
    `;
    const [rows] = await db.execute(sql, [Number(maPhong)]);
    return rows[0] || null;
  },

  // 9. Đếm tổng số phòng trong 1 Khu trọ
  countByMaKhu: async (maKhu) => {
    const sql = `SELECT COUNT(*) AS total FROM phong WHERE MaKhu = ?`;
    const [rows] = await db.execute(sql, [Number(maKhu)]);
    return rows[0].total;
  },

  // 10. Kiểm tra trùng tên phòng trong cùng 1 Khu trọ
  checkDuplicateTenPhong: async (maKhu, tenPhong, excludeMaPhong = null) => {
    let sql = `
      SELECT MaPhong
      FROM phong
      WHERE MaKhu = ? AND LOWER(TenPhong) = LOWER(?)
    `;
    const params = [Number(maKhu), tenPhong.trim()];
    if (excludeMaPhong) {
      sql += ` AND MaPhong != ? `;
      params.push(Number(excludeMaPhong));
    }
    const [rows] = await db.execute(sql, params);
    return rows.length > 0;
  },

  getPhongCuaNguoiThue: async (maND) => {
    const sqlActive = `
      SELECT DISTINCT p.MaPhong, p.TenPhong, p.MaKhu, p.TrangThai, k.TenKhu
      FROM chitiethopdongthue ct
      INNER JOIN hopdongthue hdt ON ct.MaHDT = hdt.MaHDT
      INNER JOIN phong p ON hdt.MaPhong = p.MaPhong
      LEFT JOIN khutro k ON p.MaKhu = k.MaKhu
      WHERE ct.MaND = ?
        AND ct.NgayDi IS NULL
        AND hdt.TrangThai IN ('ConHieuLuc', 'DangThue', 'HieuLuc')
      ORDER BY p.MaPhong ASC
    `;
    const [activeRows] = await db.execute(sqlActive, [Number(maND)]);
    if (activeRows && activeRows.length > 0) {
      return activeRows;
    }

    const sqlAll = `
      SELECT DISTINCT p.MaPhong, p.TenPhong, p.MaKhu, p.TrangThai, k.TenKhu
      FROM chitiethopdongthue ct
      INNER JOIN hopdongthue hdt ON ct.MaHDT = hdt.MaHDT
      INNER JOIN phong p ON hdt.MaPhong = p.MaPhong
      LEFT JOIN khutro k ON p.MaKhu = k.MaKhu
      WHERE ct.MaND = ?
      ORDER BY p.MaPhong ASC
    `;
    const [allRows] = await db.execute(sqlAll, [Number(maND)]);
    return allRows || [];
  },

  // 11. Thêm phòng mới
  create: async ({ MaKhu, TenPhong, DienTich, Gia, TrangThai }) => {
    const sql = `
      INSERT INTO phong (MaKhu, TenPhong, DienTich, Gia, TrangThai)
      VALUES (?, ?, ?, ?, ?)
    `;
    const [result] = await db.execute(sql, [
      Number(MaKhu),
      TenPhong.trim(),
      Number(DienTich),
      Number(Gia),
      TrangThai || "Trong",
    ]);
    return result.insertId;
  },

  // 12. Cập nhật thông tin phòng
  update: async (maPhong, { MaKhu, TenPhong, DienTich, Gia, TrangThai }) => {
    const sql = `
      UPDATE phong
      SET MaKhu = ?, TenPhong = ?, DienTich = ?, Gia = ?, TrangThai = ?
      WHERE MaPhong = ?
    `;
    const [result] = await db.execute(sql, [
      Number(MaKhu),
      TenPhong.trim(),
      Number(DienTich),
      Number(Gia),
      TrangThai,
      Number(maPhong),
    ]);
    return result.affectedRows > 0;
  },

  // 13. Xóa phòng
  delete: async (maPhong) => {
    const sql = `DELETE FROM phong WHERE MaPhong = ?`;
    const [result] = await db.execute(sql, [Number(maPhong)]);
    return result.affectedRows > 0;
  },

  // ỦY QUYỀN SANG AnhPhongModel ĐÃ TÁCH
  getAnhByMaPhongList: (maPhongIds = []) =>
    AnhPhongModel.getByMaPhongList(maPhongIds),
  getAnhByMaPhong: (maPhong) => AnhPhongModel.getByMaPhong(maPhong),
};

module.exports = PhongTroModel;