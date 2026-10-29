// server/src/app/models/thongTinCaNhan.model.js
const db = require('../../database/db');

const ThongTinCaNhanModel = {
  // 1. Lấy toàn bộ danh sách thông tin cá nhân
  getAll: async () => {
    const sql = `
      SELECT 
        MaTT, MaND, HoTen, GioiTinh, NamSinh,
        CCCD, DATE_FORMAT(NgayCap, '%Y-%m-%d') AS NgayCap, NoiCap,
        SDT, Email, DiaChi, NgheNghiep
      FROM ThongTinCaNhan
      ORDER BY MaTT DESC
    `;
    const [rows] = await db.execute(sql);
    return rows;
  },

  // 2. Lấy thông tin cá nhân của 1 người dùng theo MaND
  getByMaND: async (maND) => {
    const sql = `
      SELECT 
        MaTT, MaND, HoTen, GioiTinh, NamSinh,
        CCCD, DATE_FORMAT(NgayCap, '%Y-%m-%d') AS NgayCap, NoiCap,
        SDT, Email, DiaChi, NgheNghiep
      FROM ThongTinCaNhan
      WHERE MaND = ?
      LIMIT 1
    `;
    const [rows] = await db.execute(sql, [Number(maND)]);
    return rows[0] || null;
  },

  // 3. Lấy thông tin cá nhân của nhiều người dùng theo danh sách MaND
  getByMaNDList: async (maNDIds = []) => {
    if (!maNDIds || maNDIds.length === 0) return [];
    const placeholders = maNDIds.map(() => '?').join(',');
    const sql = `
      SELECT 
        MaTT, MaND, HoTen, GioiTinh, NamSinh,
        CCCD, DATE_FORMAT(NgayCap, '%Y-%m-%d') AS NgayCap, NoiCap,
        SDT, Email, DiaChi, NgheNghiep
      FROM ThongTinCaNhan
      WHERE MaND IN (${placeholders})
    `;
    const [rows] = await db.execute(sql, maNDIds.map(Number));
    return rows;
  },

  // 4. Tìm hồ sơ cá nhân theo Email hoặc SĐT (Hỗ trợ đăng nhập bằng Email/SĐT)
  findByEmailOrSDT: async (identifier) => {
    const val = String(identifier).trim();
    const sql = `
      SELECT 
        MaTT, MaND, HoTen, GioiTinh, NamSinh,
        CCCD, DATE_FORMAT(NgayCap, '%Y-%m-%d') AS NgayCap, NoiCap,
        SDT, Email, DiaChi, NgheNghiep
      FROM ThongTinCaNhan
      WHERE Email = ? OR SDT = ?
      LIMIT 1
    `;
    const [rows] = await db.execute(sql, [val, val]);
    return rows[0] || null;
  },

  // 5. Kiểm tra trùng Email, SĐT, CCCD với người dùng khác (trừ chính maND đang sửa)
  checkDuplicate: async (maND, { Email, SDT, CCCD }) => {
    const emailVal = Email ? String(Email).trim() : '';
    const sdtVal = SDT ? String(SDT).trim() : '';
    const cccdVal = CCCD ? String(CCCD).trim() : '';

    const sql = `
      SELECT MaTT, MaND, Email, SDT, CCCD
      FROM ThongTinCaNhan
      WHERE MaND != ?
        AND (
          (? != '' AND Email = ?)
          OR (? != '' AND SDT = ?)
          OR (? != '' AND CCCD = ?)
        )
      LIMIT 1
    `;
    const [rows] = await db.execute(sql, [
      Number(maND) || 0,
      emailVal, emailVal,
      sdtVal, sdtVal,
      cccdVal, cccdVal,
    ]);
    return rows[0] || null;
  },

  // 6. Thêm mới hồ sơ thông tin cá nhân
  create: async ({
    MaND,
    HoTen,
    GioiTinh,
    NamSinh,
    CCCD,
    NgayCap,
    NoiCap,
    SDT,
    Email,
    DiaChi,
    NgheNghiep,
  }) => {
    const sql = `
      INSERT INTO ThongTinCaNhan (
        MaND, HoTen, GioiTinh, NamSinh, CCCD, NgayCap, NoiCap, SDT, Email, DiaChi, NgheNghiep
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await db.execute(sql, [
      Number(MaND),
      HoTen ? String(HoTen).trim() : '',
      GioiTinh || 'Nam',
      NamSinh ? Number(NamSinh) : null,
      CCCD ? String(CCCD).trim() : null,
      NgayCap || null,
      NoiCap ? String(NoiCap).trim() : 'Cục Cảnh sát QLHC về TTXH',
      SDT ? String(SDT).trim() : '',
      Email ? String(Email).trim() : null,
      DiaChi ? String(DiaChi).trim() : null,
      NgheNghiep ? String(NgheNghiep).trim() : null,
    ]);
    return result.insertId;
  },

  // 7. Cập nhật hồ sơ thông tin cá nhân theo MaND (Nếu chưa có dòng nào sẽ tự động tạo mới)
  upsertByMaND: async (
    maND,
    {
      HoTen,
      GioiTinh,
      NamSinh,
      CCCD,
      NgayCap,
      NoiCap,
      SDT,
      Email,
      DiaChi,
      NgheNghiep,
    }
  ) => {
    const sql = `
      INSERT INTO ThongTinCaNhan (
        MaND, HoTen, GioiTinh, NamSinh, CCCD, NgayCap, NoiCap, SDT, Email, DiaChi, NgheNghiep
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        HoTen = VALUES(HoTen),
        GioiTinh = VALUES(GioiTinh),
        NamSinh = VALUES(NamSinh),
        CCCD = VALUES(CCCD),
        NgayCap = VALUES(NgayCap),
        NoiCap = VALUES(NoiCap),
        SDT = VALUES(SDT),
        Email = VALUES(Email),
        DiaChi = VALUES(DiaChi),
        NgheNghiep = VALUES(NgheNghiep)
    `;
    const [result] = await db.execute(sql, [
      Number(maND),
      HoTen ? String(HoTen).trim() : '',
      GioiTinh || 'Nam',
      NamSinh ? Number(NamSinh) : null,
      CCCD ? String(CCCD).trim() : null,
      NgayCap || null,
      NoiCap ? String(NoiCap).trim() : 'Cục Cảnh sát QLHC về TTXH',
      SDT ? String(SDT).trim() : '',
      Email ? String(Email).trim() : null,
      DiaChi ? String(DiaChi).trim() : null,
      NgheNghiep ? String(NgheNghiep).trim() : null,
    ]);
    return result.affectedRows > 0;
  },

  // 8. Xóa thông tin cá nhân theo MaND
  deleteByMaND: async (maND) => {
    const sql = `
      DELETE FROM ThongTinCaNhan
      WHERE MaND = ?
    `;
    const [result] = await db.execute(sql, [Number(maND)]);
    return result.affectedRows > 0;
  },
};

module.exports = ThongTinCaNhanModel;