// server/src/app/models/thongBao.model.js
const db = require("../../database/db");

const ThongBaoModel = {
  // 1. Lấy tất cả loại thông báo
  async getLoaiThongBao() {
    const [rows] = await db.query(
      `SELECT MaLTB, TenLTB, MoTa FROM LoaiThongBao ORDER BY MaLTB ASC`
    );
    return rows;
  },

  // 2. Lấy tất cả KhuTrọ (Dành cho Chủ trọ tổng)
  async getAllKhuTro() {
    const [rows] = await db.query(`
      SELECT kt.MaKhu, kt.MaND AS MaQuanLy, kt.TenKhu, kt.DiaChi, nd.HoTen AS TenQuanLy
      FROM KhuTro kt
      INNER JOIN NguoiDung nd ON kt.MaND = nd.MaND
      ORDER BY kt.MaKhu ASC
    `);
    return rows;
  },

  // 3. Lấy KhuTrọ do một người dùng cụ thể quản lý
  async getKhuTroByManager(maND) {
    const [rows] = await db.query(
      `SELECT kt.MaKhu, kt.MaND AS MaQuanLy, kt.TenKhu, kt.DiaChi, nd.HoTen AS TenQuanLy
       FROM KhuTro kt
       INNER JOIN NguoiDung nd ON kt.MaND = nd.MaND
       WHERE kt.MaND = ?
       ORDER BY kt.MaKhu ASC`,
      [maND]
    );
    return rows;
  },

  // 4. Lấy danh sách Phòng theo danh sách MaKhu
  async getPhongByKhuIds(khuIds) {
    if (!khuIds || khuIds.length === 0) return [];
    const [rows] = await db.query(
      `SELECT MaPhong, MaKhu, TenPhong, TrangThai
       FROM Phong
       WHERE MaKhu IN (?)
       ORDER BY MaKhu ASC, TenPhong ASC`,
      [khuIds]
    );
    return rows;
  },

  // 5. Lấy toàn bộ MaND trong hệ thống
  async getAllSystemRecipientIds(excludeMaND) {
    const [rows] = await db.query(
      `SELECT DISTINCT MaND FROM (
         SELECT kt.MaND FROM KhuTro kt
         UNION
         SELECT cthdt.MaND
         FROM ChiTietHopDongThue cthdt
         INNER JOIN HopDongThue hdt ON cthdt.MaHDT = hdt.MaHDT
         WHERE hdt.TrangThai = 'ConHieuLuc'
           AND (cthdt.NgayDi IS NULL OR cthdt.NgayDi >= CURDATE())
         UNION
         SELECT nd.MaND
         FROM NguoiDung nd
         WHERE nd.Quyen IN ('KhachThue', 'QuanLy')
       ) AS SystemUsers
       WHERE MaND != ?`,
      [excludeMaND]
    );
    return rows.map((r) => r.MaND);
  },

  // 6. Lấy danh sách MaND của Quản lý Khu trọ
  async getAllManagerIds(excludeMaND) {
    const [rows] = await db.query(
      `SELECT DISTINCT MaND FROM KhuTro WHERE MaND != ?`,
      [excludeMaND]
    );
    return rows.map((r) => r.MaND);
  },

  // 7. Lấy danh sách MaND của khách thuê thuộc 1 hoặc nhiều Khu trọ
  async getTenantIdsByKhu(khuIds, excludeMaND) {
    if (!khuIds || khuIds.length === 0) return [];
    const [rows] = await db.query(
      `SELECT DISTINCT cthdt.MaND
       FROM ChiTietHopDongThue cthdt
       INNER JOIN HopDongThue hdt ON cthdt.MaHDT = hdt.MaHDT
       INNER JOIN Phong p ON hdt.MaPhong = p.MaPhong
       WHERE p.MaKhu IN (?)
         AND hdt.TrangThai = 'ConHieuLuc'
         AND (cthdt.NgayDi IS NULL OR cthdt.NgayDi >= CURDATE())
         AND cthdt.MaND != ?`,
      [khuIds, excludeMaND]
    );
    return rows.map((r) => r.MaND);
  },

  // 8. Lấy danh sách MaND của khách thuê thuộc 1 Phòng cụ thể
  async getTenantIdsByPhong(maPhong, allowedKhuIds, excludeMaND) {
    if (!allowedKhuIds || allowedKhuIds.length === 0) return [];
    const [rows] = await db.query(
      `SELECT DISTINCT cthdt.MaND
       FROM ChiTietHopDongThue cthdt
       INNER JOIN HopDongThue hdt ON cthdt.MaHDT = hdt.MaHDT
       INNER JOIN Phong p ON hdt.MaPhong = p.MaPhong
       WHERE p.MaPhong = ?
         AND p.MaKhu IN (?)
         AND hdt.TrangThai = 'ConHieuLuc'
         AND (cthdt.NgayDi IS NULL OR cthdt.NgayDi >= CURDATE())
         AND cthdt.MaND != ?`,
      [maPhong, allowedKhuIds, excludeMaND]
    );
    return rows.map((r) => r.MaND);
  },

  // 9. Tạo thông báo mới hoặc trả lời thông báo (Transaction)
  async createThongBao({
    ndGui,
    maLTB,
    tieuDe,
    noiDung,
    maTBGoc = null,
    dsNguoiNhan,
  }) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const [result] = await conn.query(
        `INSERT INTO ThongBao (MaTBGoc, NDGui, MaLTB, TieuDe, NoiDung, NgayGui)
         VALUES (?, ?, ?, ?, ?, NOW())`,
        [maTBGoc, ndGui, maLTB, tieuDe, noiDung]
      );

      const maTB = result.insertId;

      if (dsNguoiNhan && dsNguoiNhan.length > 0) {
        const values = dsNguoiNhan.map((ndNhan) => [maTB, ndNhan, "ChuaDoc"]);
        await conn.query(
          `INSERT INTO NhanThongBao (MaTB, NDNhan, TrangThai) VALUES ?`,
          [values]
        );
      }

      await conn.commit();

      const [detailRows] = await conn.query(
        `SELECT tb.MaTB, tb.MaTBGoc, tb.NDGui, nd.HoTen AS TenNguoiGui, nd.Quyen AS QuyenNguoiGui,
                tb.MaLTB, ltb.TenLTB, tb.TieuDe, tb.NoiDung, tb.NgayGui,
                'ChuaDoc' AS TrangThai,
                (SELECT COUNT(*) FROM NhanThongBao ntb WHERE ntb.MaTB = tb.MaTB) AS SoNguoiNhan,
                (SELECT COUNT(*) FROM ThongBao r WHERE r.MaTBGoc = COALESCE(tb.MaTBGoc, tb.MaTB)) AS SoPhanHoi
         FROM ThongBao tb
         INNER JOIN NguoiDung nd ON tb.NDGui = nd.MaND
         INNER JOIN LoaiThongBao ltb ON tb.MaLTB = ltb.MaLTB
         WHERE tb.MaTB = ?`,
        [maTB]
      );

      return detailRows[0];
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  },

  // 10. Tìm kiếm & lấy danh sách thông báo ở trang Quản lý (Đã gửi + Đã nhận)
  async searchThongBao({
    maND,
    isSupremeLandlord,
    keyword = "",
    maLTB = "",
    tab = "da_gui",
  }) {
    const params = [];
    let sql = "";

    if (tab === "da_nhan") {
      sql = `
        SELECT tb.MaTB, tb.MaTBGoc, tb.NDGui, nd.HoTen AS TenNguoiGui, nd.Quyen AS QuyenNguoiGui,
               tb.MaLTB, ltb.TenLTB, tb.TieuDe, tb.NoiDung, tb.NgayGui,
               ntb.TrangThai,
               (SELECT COUNT(*) FROM NhanThongBao n2 WHERE n2.MaTB = tb.MaTB) AS SoNguoiNhan,
               (SELECT COUNT(*) FROM ThongBao r WHERE r.MaTBGoc = COALESCE(tb.MaTBGoc, tb.MaTB)) AS SoPhanHoi
        FROM ThongBao tb
        INNER JOIN NhanThongBao ntb ON tb.MaTB = ntb.MaTB
        INNER JOIN NguoiDung nd ON tb.NDGui = nd.MaND
        INNER JOIN LoaiThongBao ltb ON tb.MaLTB = ltb.MaLTB
        WHERE ntb.NDNhan = ?
      `;
      params.push(maND);
    } else {
      sql = `
        SELECT tb.MaTB, tb.MaTBGoc, tb.NDGui, nd.HoTen AS TenNguoiGui, nd.Quyen AS QuyenNguoiGui,
               tb.MaLTB, ltb.TenLTB, tb.TieuDe, tb.NoiDung, tb.NgayGui,
               (SELECT COUNT(*) FROM NhanThongBao ntb WHERE ntb.MaTB = tb.MaTB) AS SoNguoiNhan,
               (SELECT COUNT(*) FROM ThongBao r WHERE r.MaTBGoc = COALESCE(tb.MaTBGoc, tb.MaTB)) AS SoPhanHoi
        FROM ThongBao tb
        INNER JOIN NguoiDung nd ON tb.NDGui = nd.MaND
        INNER JOIN LoaiThongBao ltb ON tb.MaLTB = ltb.MaLTB
        WHERE tb.MaTBGoc IS NULL
      `;

      if (!isSupremeLandlord) {
        sql += ` AND tb.NDGui = ?`;
        params.push(maND);
      }
    }

    if (keyword && keyword.trim() !== "") {
      sql += ` AND (tb.TieuDe LIKE ? OR tb.NoiDung LIKE ? OR nd.HoTen LIKE ?)`;
      const likeKw = `%${keyword.trim()}%`;
      params.push(likeKw, likeKw, likeKw);
    }

    if (maLTB && Number(maLTB) > 0) {
      sql += ` AND tb.MaLTB = ?`;
      params.push(Number(maLTB));
    }

    sql += ` ORDER BY tb.NgayGui DESC`;

    const [rows] = await db.query(sql, params);
    return rows;
  },

  // 11. Lấy danh sách thông báo cho NotificationBell & Trang Thông báo Người thuê
  async getThongBaoCuaToi(
    maND,
    { limit = 50, keyword = "", maLTB = "", trangThai = "", tab = "da_nhan" } = {}
  ) {
    const params = [];
    let sql = "";

    if (tab === "da_gui") {
      // Các phản ánh / báo cáo sự cố do chính Khách thuê gửi đi
      sql = `
        SELECT tb.MaTB, tb.MaTBGoc, tb.NDGui, nd.HoTen AS TenNguoiGui, nd.Quyen AS QuyenNguoiGui,
               tb.MaLTB, ltb.TenLTB, tb.TieuDe, tb.NoiDung, tb.NgayGui,
               'DaDoc' AS TrangThai,
               (SELECT COUNT(*) FROM NhanThongBao ntb WHERE ntb.MaTB = tb.MaTB) AS SoNguoiNhan,
               (SELECT COUNT(*) FROM ThongBao r WHERE r.MaTBGoc = COALESCE(tb.MaTBGoc, tb.MaTB)) AS SoPhanHoi
        FROM ThongBao tb
        INNER JOIN NguoiDung nd ON tb.NDGui = nd.MaND
        INNER JOIN LoaiThongBao ltb ON tb.MaLTB = ltb.MaLTB
        WHERE tb.NDGui = ? AND tb.MaTBGoc IS NULL
      `;
      params.push(maND);
    } else {
      // Hộp thư đến của người dùng
      sql = `
        SELECT tb.MaTB, tb.MaTBGoc, tb.NDGui, nd.HoTen AS TenNguoiGui, nd.Quyen AS QuyenNguoiGui,
               tb.MaLTB, ltb.TenLTB, tb.TieuDe, tb.NoiDung, tb.NgayGui,
               ntb.TrangThai,
               (SELECT COUNT(*) FROM ThongBao r WHERE r.MaTBGoc = COALESCE(tb.MaTBGoc, tb.MaTB)) AS SoPhanHoi
        FROM NhanThongBao ntb
        INNER JOIN ThongBao tb ON ntb.MaTB = tb.MaTB
        INNER JOIN NguoiDung nd ON tb.NDGui = nd.MaND
        INNER JOIN LoaiThongBao ltb ON tb.MaLTB = ltb.MaLTB
        WHERE ntb.NDNhan = ?
      `;
      params.push(maND);

      if (trangThai === "ChuaDoc" || trangThai === "DaDoc") {
        sql += ` AND ntb.TrangThai = ?`;
        params.push(trangThai);
      }
    }

    if (keyword && keyword.trim() !== "") {
      sql += ` AND (tb.TieuDe LIKE ? OR tb.NoiDung LIKE ? OR nd.HoTen LIKE ?)`;
      const likeKw = `%${keyword.trim()}%`;
      params.push(likeKw, likeKw, likeKw);
    }

    if (maLTB && Number(maLTB) > 0) {
      sql += ` AND tb.MaLTB = ?`;
      params.push(Number(maLTB));
    }

    sql += ` ORDER BY tb.NgayGui DESC LIMIT ?`;
    params.push(Number(limit) || 50);

    const [rows] = await db.query(sql, params);

    const [unreadRows] = await db.query(
      `SELECT COUNT(*) AS unreadCount
       FROM NhanThongBao
       WHERE NDNhan = ? AND TrangThai = 'ChuaDoc'`,
      [maND]
    );

    return {
      items: rows,
      unreadCount: unreadRows[0]?.unreadCount || 0,
    };
  },

  // 11b. Lấy thông tin Phòng đang thuê của Khách & danh sách Quản lý/Chủ trọ nhận phản ánh
  async getThongTinPhongVaNguoiNhanCuaKhach(maND) {
    const [roomRows] = await db.query(
      `SELECT p.MaPhong, p.TenPhong, kt.MaKhu, kt.TenKhu, kt.MaND AS MaQuanLy, nd.HoTen AS TenQuanLy
       FROM ChiTietHopDongThue cthdt
       INNER JOIN HopDongThue hdt ON cthdt.MaHDT = hdt.MaHDT
       INNER JOIN Phong p ON hdt.MaPhong = p.MaPhong
       INNER JOIN KhuTro kt ON p.MaKhu = kt.MaKhu
       INNER JOIN NguoiDung nd ON kt.MaND = nd.MaND
       WHERE cthdt.MaND = ?
         AND hdt.TrangThai = 'ConHieuLuc'
         AND (cthdt.NgayDi IS NULL OR cthdt.NgayDi >= CURDATE())
       ORDER BY hdt.MaHDT DESC
       LIMIT 1`,
      [maND]
    );

    const thongTinPhong = roomRows[0] || null;
    const recipientSet = new Set();

    // Nếu khách đang ở phòng cụ thể -> Gửi cho Quản lý khu trọ đó
    if (thongTinPhong?.MaQuanLy && Number(thongTinPhong.MaQuanLy) !== Number(maND)) {
      recipientSet.add(Number(thongTinPhong.MaQuanLy));
    }

    // Luôn gửi đồng thời cho Chủ trọ tổng (ChuTro / Admin)
    const [landlords] = await db.query(
      `SELECT MaND FROM NguoiDung WHERE Quyen IN ('ChuTro', 'Admin') AND MaND != ?`,
      [maND]
    );
    landlords.forEach((r) => recipientSet.add(Number(r.MaND)));

    // Dự phòng nếu chưa tìm thấy ai thì gửi cho tất cả Quản lý
    if (recipientSet.size === 0) {
      const [managers] = await db.query(
        `SELECT DISTINCT MaND FROM KhuTro WHERE MaND != ?`,
        [maND]
      );
      managers.forEach((r) => recipientSet.add(Number(r.MaND)));
    }

    return {
      thongTinPhong,
      recipients: Array.from(recipientSet),
    };
  },

  // 12. Xem chi tiết 1 thông báo kèm toàn bộ luồng phản hồi (Replies)
  async getChiTietThongBao(maTB, maND) {
    // Tìm thông báo hiện tại
    const [currentRows] = await db.query(
      `SELECT MaTB, MaTBGoc FROM ThongBao WHERE MaTB = ?`,
      [maTB]
    );
    if (!currentRows[0]) return null;

    // Nếu người dùng bấm vào 1 thông báo phản hồi, tự động truy ngược về thông báo gốc (Root)
    const rootMaTB = currentRows[0].MaTBGoc || currentRows[0].MaTB;

    const [rootRows] = await db.query(
      `SELECT tb.MaTB, tb.MaTBGoc, tb.NDGui, nd.HoTen AS TenNguoiGui, nd.Quyen AS QuyenNguoiGui,
              tb.MaLTB, ltb.TenLTB, tb.TieuDe, tb.NoiDung, tb.NgayGui,
              (SELECT TrangThai FROM NhanThongBao ntb WHERE ntb.MaTB = tb.MaTB AND ntb.NDNhan = ? LIMIT 1) AS TrangThai,
              (SELECT COUNT(*) FROM NhanThongBao ntb2 WHERE ntb2.MaTB = tb.MaTB) AS SoNguoiNhan
       FROM ThongBao tb
       INNER JOIN NguoiDung nd ON tb.NDGui = nd.MaND
       INNER JOIN LoaiThongBao ltb ON tb.MaLTB = ltb.MaLTB
       WHERE tb.MaTB = ?`,
      [maND, rootMaTB]
    );

    if (!rootRows[0]) return null;

    // Lấy toàn bộ danh sách trả lời thuộc luồng thông báo gốc này
    const [replies] = await db.query(
      `SELECT tb.MaTB, tb.MaTBGoc, tb.NDGui, nd.HoTen AS TenNguoiGui, nd.Quyen AS QuyenNguoiGui,
              tb.MaLTB, tb.TieuDe, tb.NoiDung, tb.NgayGui
       FROM ThongBao tb
       INNER JOIN NguoiDung nd ON tb.NDGui = nd.MaND
       WHERE tb.MaTBGoc = ?
       ORDER BY tb.NgayGui ASC`,
      [rootMaTB]
    );

    return {
      ...rootRows[0],
      dsPhanHoi: replies,
    };
  },

  // 13. Tìm danh sách người nhận khi có người trả lời thông báo
  async getReplyRecipients(rootMaTB, targetMaTB, senderMaND) {
    const [targetRows] = await db.query(
      `SELECT MaTB, MaTBGoc, NDGui, MaLTB, TieuDe FROM ThongBao WHERE MaTB = ?`,
      [targetMaTB]
    );
    const [rootRows] = await db.query(
      `SELECT MaTB, NDGui, MaLTB, TieuDe FROM ThongBao WHERE MaTB = ?`,
      [rootMaTB]
    );

    if (!rootRows[0] || !targetRows[0]) return { root: null, recipients: [] };
    const root = rootRows[0];
    const target = targetRows[0];

    const recipientSet = new Set();

    // Nếu người trả lời không phải là người tạo thông báo gốc -> Gửi cho người tạo thông báo gốc
    if (Number(root.NDGui) !== Number(senderMaND)) {
      recipientSet.add(Number(root.NDGui));
    }

    // Nếu đang trả lời trực tiếp 1 tin nhắn con -> Gửi cho chủ tin nhắn con đó
    if (Number(target.NDGui) !== Number(senderMaND)) {
      recipientSet.add(Number(target.NDGui));
    }

    // Nếu chính người tạo thông báo gốc trả lời trên luồng chung -> Gửi cho những người đã từng phản hồi hoặc người nhận ban đầu
    if (recipientSet.size === 0) {
      const [repliers] = await db.query(
        `SELECT DISTINCT NDGui AS MaND FROM ThongBao WHERE MaTBGoc = ? AND NDGui != ?`,
        [rootMaTB, senderMaND]
      );
      repliers.forEach((r) => recipientSet.add(Number(r.MaND)));

      if (recipientSet.size === 0) {
        const [origRecipients] = await db.query(
          `SELECT DISTINCT NDNhan AS MaND FROM NhanThongBao WHERE MaTB = ? AND NDNhan != ?`,
          [rootMaTB, senderMaND]
        );
        origRecipients.forEach((r) => recipientSet.add(Number(r.MaND)));
      }
    }

    return {
      root,
      recipients: Array.from(recipientSet),
    };
  },

  // 14. Đánh dấu đã đọc 1 thông báo (và các phản hồi liên quan trong cùng luồng)
  async markAsRead(maTB, maND) {
    const [rows] = await db.query(
      `SELECT MaTB, MaTBGoc FROM ThongBao WHERE MaTB = ?`,
      [maTB]
    );
    const rootId = rows[0]?.MaTBGoc || maTB;

    await db.query(
      `UPDATE NhanThongBao ntb
       INNER JOIN ThongBao tb ON ntb.MaTB = tb.MaTB
       SET ntb.TrangThai = 'DaDoc'
       WHERE ntb.NDNhan = ?
         AND (tb.MaTB = ? OR tb.MaTB = ? OR tb.MaTBGoc = ?)`,
      [maND, maTB, rootId, rootId]
    );
    return true;
  },

  // 15. Đánh dấu đã đọc tất cả thông báo của người dùng
  async markAllAsRead(maND) {
    const [result] = await db.query(
      `UPDATE NhanThongBao
       SET TrangThai = 'DaDoc'
       WHERE NDNhan = ? AND TrangThai = 'ChuaDoc'`,
      [maND]
    );
    return result.affectedRows;
  },

  // 16. Lấy thông tin 1 thông báo để kiểm tra quyền trước khi xóa
  async getThongBaoById(maTB) {
    const [rows] = await db.query(
      `SELECT MaTB, MaTBGoc, NDGui, MaLTB, TieuDe FROM ThongBao WHERE MaTB = ?`,
      [maTB]
    );
    return rows[0] || null;
  },

  // 17. Xóa thông báo
  async deleteThongBao(maTB) {
    const [result] = await db.query(`DELETE FROM ThongBao WHERE MaTB = ?`, [
      maTB,
    ]);
    return result.affectedRows > 0;
  },
};

module.exports = ThongBaoModel;