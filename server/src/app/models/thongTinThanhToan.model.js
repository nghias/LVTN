// server/src/app/models/thongTinThanhToan.model.js
const db = require('../../database/db');

let isSchemaChecked = false;

// Tự động bổ sung 3 cột cấu hình PayOS nếu bảng ThongTinThanhToan chưa có
async function ensurePayOSColumns() {
  if (isSchemaChecked) return;
  isSchemaChecked = true;
  const alterQueries = [
    `ALTER TABLE ThongTinThanhToan ADD COLUMN PayosClientId VARCHAR(255) NULL DEFAULT NULL`,
    `ALTER TABLE ThongTinThanhToan ADD COLUMN PayosApiKey VARCHAR(255) NULL DEFAULT NULL`,
    `ALTER TABLE ThongTinThanhToan ADD COLUMN PayosChecksumKey VARCHAR(255) NULL DEFAULT NULL`,
  ];
  for (const sql of alterQueries) {
    try {
      await db.execute(sql);
    } catch {
      // Bỏ qua nếu cột đã tồn tại
    }
  }
}

const ThongTinThanhToanModel = {
  // 1. Lấy tất cả bản ghi thông tin thanh toán (Mặc định lấy bản ghi của Chủ trọ MaTT = 1 lên đầu)
  getAll: async () => {
    await ensurePayOSColumns();
    const [rows] = await db.execute(
      `SELECT MaTT, MaND, TenNganHang, STK, ChuTaiKhoan,
              PayosClientId, PayosApiKey, PayosChecksumKey
       FROM ThongTinThanhToan
       ORDER BY MaTT ASC`
    );
    return rows;
  },

  // 2. Lấy bản ghi thông tin thanh toán chính của hệ thống (của Chủ trọ)
  getPrimary: async () => {
    await ensurePayOSColumns();
    const [rows] = await db.execute(
      `SELECT MaTT, MaND, TenNganHang, STK, ChuTaiKhoan,
              PayosClientId, PayosApiKey, PayosChecksumKey
       FROM ThongTinThanhToan
       ORDER BY MaTT ASC
       LIMIT 1`
    );
    return rows[0] || null;
  },

  // 3. Lấy theo MaND
  getByMaND: async (maND) => {
    await ensurePayOSColumns();
    const [rows] = await db.execute(
      `SELECT MaTT, MaND, TenNganHang, STK, ChuTaiKhoan,
              PayosClientId, PayosApiKey, PayosChecksumKey
       FROM ThongTinThanhToan
       WHERE MaND = ?
       ORDER BY MaTT ASC
       LIMIT 1`,
      [Number(maND)]
    );
    return rows[0] || null;
  },

  // 4. Lấy theo MaTT
  getById: async (maTT) => {
    await ensurePayOSColumns();
    const [rows] = await db.execute(
      `SELECT MaTT, MaND, TenNganHang, STK, ChuTaiKhoan,
              PayosClientId, PayosApiKey, PayosChecksumKey
       FROM ThongTinThanhToan
       WHERE MaTT = ?
       LIMIT 1`,
      [Number(maTT)]
    );
    return rows[0] || null;
  },

  // 5. Thêm mới thông tin thanh toán
  create: async ({
    MaND,
    TenNganHang,
    STK,
    ChuTaiKhoan,
    PayosClientId = null,
    PayosApiKey = null,
    PayosChecksumKey = null,
  }) => {
    await ensurePayOSColumns();
    const [result] = await db.execute(
      `INSERT INTO ThongTinThanhToan 
        (MaND, TenNganHang, STK, ChuTaiKhoan, PayosClientId, PayosApiKey, PayosChecksumKey)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        Number(MaND),
        String(TenNganHang).trim(),
        String(STK).trim(),
        String(ChuTaiKhoan).trim().toUpperCase(),
        PayosClientId ? String(PayosClientId).trim() : null,
        PayosApiKey ? String(PayosApiKey).trim() : null,
        PayosChecksumKey ? String(PayosChecksumKey).trim() : null,
      ]
    );
    return result.insertId;
  },

  // 6. Cập nhật thông tin thanh toán theo MaTT
  update: async (
    maTT,
    {
      TenNganHang,
      STK,
      ChuTaiKhoan,
      PayosClientId,
      PayosApiKey,
      PayosChecksumKey,
    }
  ) => {
    await ensurePayOSColumns();

    const fields = ['TenNganHang = ?', 'STK = ?', 'ChuTaiKhoan = ?'];
    const params = [
      String(TenNganHang).trim(),
      String(STK).trim(),
      String(ChuTaiKhoan).trim().toUpperCase(),
    ];

    if (PayosClientId !== undefined) {
      fields.push('PayosClientId = ?');
      params.push(PayosClientId ? String(PayosClientId).trim() : null);
    }
    if (PayosApiKey !== undefined) {
      fields.push('PayosApiKey = ?');
      params.push(PayosApiKey ? String(PayosApiKey).trim() : null);
    }
    if (PayosChecksumKey !== undefined) {
      fields.push('PayosChecksumKey = ?');
      params.push(PayosChecksumKey ? String(PayosChecksumKey).trim() : null);
    }

    params.push(Number(maTT));

    const [result] = await db.execute(
      `UPDATE ThongTinThanhToan
       SET ${fields.join(', ')}
       WHERE MaTT = ?`,
      params
    );
    return result.affectedRows > 0;
  },
};

module.exports = ThongTinThanhToanModel;