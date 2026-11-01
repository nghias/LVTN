// C:\Users\nhat nguyen\Desktop\LVTN\server\src\app\models\chiTietHopDong.model.js
const db = require('../../database/db');

const ChiTietHopDongModel = {
  // 1. Lấy toàn bộ bản ghi trong bảng chitiethopdongthue
  getAll: async () => {
    const [rows] = await db.execute(
      `SELECT MaND, MaHDT, NgayVao, NgayDi, VaiTro, TamTru
       FROM chitiethopdongthue
       ORDER BY MaHDT DESC, CASE WHEN VaiTro = 'DaiDien' THEN 0 ELSE 1 END`
    );
    return rows;
  },

  // 2. Lấy các dòng chi tiết hợp đồng cơ bản theo MaHDT
  getByMaHDT: async (maHDT) => {
    const [rows] = await db.execute(
      `SELECT MaND, MaHDT, NgayVao, NgayDi, VaiTro, TamTru
       FROM chitiethopdongthue
       WHERE MaHDT = ?
       ORDER BY CASE WHEN VaiTro = 'DaiDien' THEN 0 ELSE 1 END, NgayVao ASC`,
      [Number(maHDT)]
    );
    return rows;
  },

  // 3. Lấy các dòng chi tiết hợp đồng theo MaND (Khách thuê)
  getByMaND: async (maND) => {
    const [rows] = await db.execute(
      `SELECT MaND, MaHDT, NgayVao, NgayDi, VaiTro, TamTru
       FROM chitiethopdongthue
       WHERE MaND = ?
       ORDER BY MaHDT DESC`,
      [Number(maND)]
    );
    return rows;
  },

  // 4. Lấy danh sách thành viên chi tiết của 1 hợp đồng (Kèm hồ sơ cá nhân & thẻ ra vào để xuất PDF)
  getThanhVienByMaHDT: async (maHDT) => {
    const sqlThanhVien = `
      SELECT 
        ct.MaND, ct.MaHDT, ct.NgayVao, ct.NgayDi, ct.VaiTro, ct.TamTru,
        COALESCE(ttcn.HoTen, nd.TenTK) AS HoTen,
        ttcn.GioiTinh,
        ttcn.CCCD,
        ttcn.NgayCap,
        ttcn.NoiCap,
        ttcn.NamSinh,
        ttcn.SDT,
        ttcn.Email,
        ttcn.DiaChi,
        ttcn.NgheNghiep,
        GROUP_CONCAT(trv.GiaTri SEPARATOR ', ') AS DanhSachMaThe,
        COUNT(trv.MaThe) AS SoLuongThe
      FROM chitiethopdongthue ct
      INNER JOIN nguoidung nd ON ct.MaND = nd.MaND
      LEFT JOIN thongtincanhan ttcn ON nd.MaND = ttcn.MaND
      LEFT JOIN theravao trv ON nd.MaND = trv.MaND AND trv.TrangThai = 'HoatDong'
      WHERE ct.MaHDT = ?
      GROUP BY 
        ct.MaND, ct.MaHDT, ct.NgayVao, ct.NgayDi, ct.VaiTro, ct.TamTru,
        nd.TenTK, ttcn.HoTen, ttcn.GioiTinh, ttcn.CCCD, ttcn.NgayCap, ttcn.NoiCap,
        ttcn.NamSinh, ttcn.SDT, ttcn.Email, ttcn.DiaChi, ttcn.NgheNghiep
      ORDER BY CASE WHEN ct.VaiTro = 'DaiDien' THEN 0 ELSE 1 END, ct.NgayVao ASC
    `;
    const [rows] = await db.execute(sqlThanhVien, [Number(maHDT)]);
    return rows;
  },

  // 5. Lấy danh sách tất cả thành viên đang cư trú cùng phòng (Thuộc các HĐ còn hiệu lực và chưa chuyển đi)
  getThanhVienCungPhong: async (maPhong) => {
    const sqlThanhVienCungPhong = `
      SELECT DISTINCT
        ct.MaND, ct.MaHDT, ct.NgayVao, ct.NgayDi, ct.VaiTro, ct.TamTru,
        COALESCE(ttcn.HoTen, nd.TenTK) AS HoTen,
        ttcn.GioiTinh,
        ttcn.CCCD,
        ttcn.NgayCap,
        ttcn.NoiCap,
        ttcn.NamSinh,
        ttcn.SDT,
        ttcn.Email,
        ttcn.DiaChi,
        ttcn.NgheNghiep
      FROM chitiethopdongthue ct
      INNER JOIN hopdongthue hdt ON ct.MaHDT = hdt.MaHDT
      INNER JOIN nguoidung nd ON ct.MaND = nd.MaND
      LEFT JOIN thongtincanhan ttcn ON nd.MaND = ttcn.MaND
      WHERE hdt.MaPhong = ? AND hdt.TrangThai = 'ConHieuLuc' AND ct.NgayDi IS NULL
      ORDER BY ct.MaHDT ASC
    `;
    const [rows] = await db.execute(sqlThanhVienCungPhong, [Number(maPhong)]);
    return rows;
  },

  // 6. Chuẩn hóa & lọc trùng danh sách thành viên theo MaND trước khi lưu
  filterUniqueMembers: (danhSachThanhVien = []) => {
    const danhSachTVDuyNhat = [];
    const tapMaND = new Set();
    for (const tv of danhSachThanhVien) {
      const idND = Number(tv?.MaND);
      if (idND > 0 && !tapMaND.has(idND)) {
        tapMaND.add(idND);
        danhSachTVDuyNhat.push(tv);
      }
    }
    return danhSachTVDuyNhat;
  },

  // 7. Thêm 1 thành viên vào hợp đồng (Hỗ trợ truyền conn khi chạy trong Transaction)
  create: async (
    {
      MaND,
      MaHDT,
      NgayVao,
      NgayDi = null,
      VaiTro = 'ThanhVien',
      TamTru = 'ChuaDangKy',
    },
    conn = db
  ) => {
    const [result] = await conn.execute(
      `INSERT INTO chitiethopdongthue (MaND, MaHDT, NgayVao, NgayDi, VaiTro, TamTru)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        Number(MaND),
        Number(MaHDT),
        NgayVao,
        NgayDi || null,
        VaiTro || 'ThanhVien',
        TamTru || 'ChuaDangKy',
      ]
    );
    return result.affectedRows > 0;
  },

  // 8. Thêm danh sách nhiều thành viên vào 1 hợp đồng (Dùng cho chế độ DaiDienChung)
  insertManyForHopDong: async (
    maHDT,
    danhSachThanhVien = [],
    ngayBDMacDinh = null,
    conn = db
  ) => {
    const danhSachTVDuyNhat = ChiTietHopDongModel.filterUniqueMembers(danhSachThanhVien);

    for (let i = 0; i < danhSachTVDuyNhat.length; i++) {
      const tv = danhSachTVDuyNhat[i];
      const vaiTro = tv.VaiTro || (i === 0 ? 'DaiDien' : 'ThanhVien');
      await ChiTietHopDongModel.create(
        {
          MaND: tv.MaND,
          MaHDT: maHDT,
          NgayVao: tv.NgayVao || ngayBDMacDinh,
          NgayDi: tv.NgayDi || null,
          VaiTro: vaiTro,
          TamTru: tv.TamTru || 'ChuaDangKy',
        },
        conn
      );
    }
    return danhSachTVDuyNhat.length;
  },

  // 9. Xóa toàn bộ thành viên cũ và thêm lại danh sách mới cho 1 hợp đồng (Dùng khi Sửa hợp đồng)
  replaceByMaHDT: async (
    maHDT,
    danhSachThanhVien = [],
    ngayBDMacDinh = null,
    conn = db
  ) => {
    await ChiTietHopDongModel.deleteByMaHDT(maHDT, conn);
    return await ChiTietHopDongModel.insertManyForHopDong(
      maHDT,
      danhSachThanhVien,
      ngayBDMacDinh,
      conn
    );
  },

  // 10. Xóa toàn bộ chi tiết hợp đồng theo MaHDT (Hỗ trợ truyền conn khi chạy trong Transaction)
  deleteByMaHDT: async (maHDT, conn = db) => {
    const [result] = await conn.execute(
      `DELETE FROM chitiethopdongthue WHERE MaHDT = ?`,
      [Number(maHDT)]
    );
    return result.affectedRows;
  },

  // 11. Cập nhật ngày chuyển đi (NgayDi) hoặc trạng thái tạm trú (TamTru) của 1 thành viên
  updateThanhVien: async (maHDT, maND, { NgayDi, TamTru, VaiTro }, conn = db) => {
    const fields = [];
    const params = [];

    if (NgayDi !== undefined) {
      fields.push('NgayDi = ?');
      params.push(NgayDi || null);
    }
    if (TamTru !== undefined) {
      fields.push('TamTru = ?');
      params.push(TamTru);
    }
    if (VaiTro !== undefined) {
      fields.push('VaiTro = ?');
      params.push(VaiTro);
    }

    if (fields.length === 0) return false;

    params.push(Number(maHDT), Number(maND));
    const [result] = await conn.execute(
      `UPDATE chitiethopdongthue
       SET ${fields.join(', ')}
       WHERE MaHDT = ? AND MaND = ?`,
      params
    );
    return result.affectedRows > 0;
  },
};

module.exports = ChiTietHopDongModel;