// server/src/app/models/datPhong.model.js
const db = require("../../database/db");

const SELECT_BOOKING_DETAIL_SQL = `
  SELECT
    dp.MaDP,
    dp.MaTraCuu,
    dp.TokenTraCuu,
    dp.MaPhong,
    dp.HoTenKhach,
    dp.SDT,
    dp.Email,
    DATE_FORMAT(dp.NgayHenXem, '%Y-%m-%d %H:%i:%s') AS NgayHenXem,
    dp.GhiChu,
    dp.SoTienCoc,
    dp.OrderCode,
    DATE_FORMAT(dp.ThoiGianTao, '%Y-%m-%d %H:%i:%s') AS ThoiGianTao,
    DATE_FORMAT(dp.ThoiGianHetHanQR, '%Y-%m-%d %H:%i:%s') AS ThoiGianHetHanQR,
    TIMESTAMPDIFF(SECOND, NOW(), dp.ThoiGianHetHanQR) AS SecondsRemainingQR,
    DATE_FORMAT(dp.ThoiGianThanhToan, '%Y-%m-%d %H:%i:%s') AS ThoiGianThanhToan,
    DATE_FORMAT(dp.ThoiGianHetHanGiu, '%Y-%m-%d %H:%i:%s') AS ThoiGianHetHanGiu,
    dp.TrangThai,
    dp.PhuongThucHoan,
    dp.SoTienHoan,
    DATE_FORMAT(dp.ThoiGianHoanCoc, '%Y-%m-%d %H:%i:%s') AS ThoiGianHoanCoc,
    dp.GhiChuHoanCoc,
    dp.NguoiXuLy,
    p.MaKhu,
    p.TenPhong,
    p.DienTich,
    p.Gia AS GiaPhong,
    p.TrangThai AS TrangThaiPhong,
    k.TenKhu,
    k.DiaChi AS DiaChiKhu,
    k.MaND AS MaQuanLyKhu,
    COALESCE(ql_tt.HoTen, ql_nd.TenTK) AS TenQuanLy,
    ql_tt.SDT AS SDTQuanLy,
    COALESCE(ql_tt.Email, ql_nd.TenTK) AS EmailQuanLy,
    COALESCE(xl_tt.HoTen, xl_nd.TenTK) AS TenNguoiXuLy,
    (
      SELECT ap.DuongDan
      FROM anhphong ap
      WHERE ap.MaPhong = p.MaPhong
      ORDER BY ap.AnhChinh DESC, ap.MaAnh ASC
      LIMIT 1
    ) AS AnhDaiDienPhong
  FROM datphong dp
  INNER JOIN phong p ON dp.MaPhong = p.MaPhong
  INNER JOIN khutro k ON p.MaKhu = k.MaKhu
  LEFT JOIN nguoidung ql_nd ON k.MaND = ql_nd.MaND
  LEFT JOIN thongtincanhan ql_tt ON k.MaND = ql_tt.MaND
  LEFT JOIN nguoidung xl_nd ON dp.NguoiXuLy = xl_nd.MaND
  LEFT JOIN thongtincanhan xl_tt ON dp.NguoiXuLy = xl_tt.MaND
`;

const DatPhongModel = {
  // 1. Lấy thông tin phòng + khu trọ + quản lý khu để kiểm tra trước khi tạo đơn
  getPhongWithKhuById: async (maPhong) => {
    const sql = `
      SELECT
        p.MaPhong, p.MaKhu, p.TenPhong, p.DienTich, p.Gia, p.TrangThai,
        k.TenKhu, k.DiaChi, k.MaND AS MaQuanLyKhu,
        COALESCE(tt.HoTen, nd.TenTK) AS TenQuanLy,
        tt.SDT AS SDTQuanLy
      FROM phong p
      INNER JOIN khutro k ON p.MaKhu = k.MaKhu
      LEFT JOIN nguoidung nd ON k.MaND = nd.MaND
      LEFT JOIN thongtincanhan tt ON k.MaND = tt.MaND
      WHERE p.MaPhong = ?
      LIMIT 1
    `;
    const [rows] = await db.execute(sql, [Number(maPhong)]);
    return rows[0] || null;
  },

  // 2. Lấy cấu hình tài khoản ngân hàng & PayOS của Chủ trọ (ưu tiên MaND = 1)
  getPayOSConfig: async () => {
    const sql = `
      SELECT tt.MaTT, tt.MaND, tt.TenNganHang, tt.STK, tt.ChuTaiKhoan,
             tt.PayosClientId, tt.PayosApiKey, tt.PayosChecksumKey
      FROM thongtinthanhtoan tt
      INNER JOIN nguoidung nd ON tt.MaND = nd.MaND
      ORDER BY (nd.MaND = 1) DESC, (nd.Quyen = 'ChuTro') DESC, tt.MaTT ASC
      LIMIT 1
    `;
    const [rows] = await db.execute(sql);
    return rows[0] || null;
  },

  // 3. Tạo mới đơn đặt cọc (TrangThai = 'ChoThanhToan', KHÔNG khóa phòng)
  create: async ({
    MaTraCuu,
    TokenTraCuu,
    MaPhong,
    HoTenKhach,
    SDT,
    Email,
    NgayHenXem,
    GhiChu = null,
    SoTienCoc,
    OrderCode,
    QrExpireMinutes = 15,
  }) => {
    const sql = `
      INSERT INTO datphong (
        MaTraCuu, TokenTraCuu, MaPhong, HoTenKhach, SDT, Email,
        NgayHenXem, GhiChu, SoTienCoc, OrderCode,
        ThoiGianTao, ThoiGianHetHanQR, TrangThai
      )
      VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        NOW(), DATE_ADD(NOW(), INTERVAL ? MINUTE), 'ChoThanhToan'
      )
    `;
    const [result] = await db.execute(sql, [
      MaTraCuu,
      TokenTraCuu,
      Number(MaPhong),
      HoTenKhach,
      SDT,
      Email,
      NgayHenXem,
      GhiChu,
      Number(SoTienCoc),
      Number(OrderCode),
      Number(QrExpireMinutes),
    ]);
    return result.insertId;
  },

  // 4. Lấy chi tiết đơn đặt phòng theo MaDP
  getById: async (maDP) => {
    const sql = `${SELECT_BOOKING_DETAIL_SQL} WHERE dp.MaDP = ? LIMIT 1`;
    const [rows] = await db.execute(sql, [Number(maDP)]);
    return rows[0] || null;
  },

  // 5. Lấy chi tiết đơn đặt phòng theo OrderCode
  getByOrderCode: async (orderCode) => {
    const sql = `${SELECT_BOOKING_DETAIL_SQL} WHERE dp.OrderCode = ? LIMIT 1`;
    const [rows] = await db.execute(sql, [Number(orderCode)]);
    return rows[0] || null;
  },

  // 6. Lấy chi tiết đơn đặt phòng theo MaTraCuu
  getByMaTraCuu: async (maTraCuu) => {
    const sql = `${SELECT_BOOKING_DETAIL_SQL} WHERE dp.MaTraCuu = ? LIMIT 1`;
    const [rows] = await db.execute(sql, [String(maTraCuu).trim()]);
    return rows[0] || null;
  },

  // 7. Hủy đơn ChoThanhToan (khi gọi PayOS lỗi hoặc quá hạn QR)
  markAsCancelled: async (maDP, ghiChu = null) => {
    const sql = `
      UPDATE datphong
      SET TrangThai = 'DaHuy',
          GhiChuHoanCoc = COALESCE(?, GhiChuHoanCoc)
      WHERE MaDP = ? AND TrangThai = 'ChoThanhToan'
    `;
    const [result] = await db.execute(sql, [ghiChu, Number(maDP)]);
    return result.affectedRows > 0;
  },

  // 8. TRANSACTION XÁC NHẬN THANH TOÁN TỰ ĐỘNG (Idempotent + Chống Race Condition)
  confirmPaymentTransaction: async (orderCode, { holdHours = 48 } = {}) => {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const [dpRows] = await conn.execute(
        `SELECT * FROM datphong WHERE OrderCode = ? FOR UPDATE`,
        [Number(orderCode)],
      );

      const booking = dpRows[0];
      if (!booking) {
        await conn.rollback();
        return { found: false };
      }

      if (booking.TrangThai !== "ChoThanhToan") {
        await conn.commit();
        return {
          found: true,
          alreadyProcessed: true,
          outcome: booking.TrangThai,
          maDP: booking.MaDP,
        };
      }

      const [roomRows] = await conn.execute(
        `SELECT MaPhong, MaKhu, TenPhong, TrangThai FROM phong WHERE MaPhong = ? FOR UPDATE`,
        [Number(booking.MaPhong)],
      );
      const room = roomRows[0];

      if (!room) {
        await conn.rollback();
        throw new Error(`Không tìm thấy phòng MaPhong=${booking.MaPhong}`);
      }

      let outcome = "DaDatCoc";

      if (String(room.TrangThai).trim() === "Trong") {
        const [updateDp] = await conn.execute(
          `UPDATE datphong
           SET TrangThai = 'DaDatCoc',
               ThoiGianThanhToan = NOW(),
               ThoiGianHetHanGiu = DATE_ADD(NOW(), INTERVAL ? HOUR)
           WHERE MaDP = ? AND TrangThai = 'ChoThanhToan'`,
          [Number(holdHours), Number(booking.MaDP)],
        );

        if (updateDp.affectedRows === 0) {
          await conn.rollback();
          return {
            found: true,
            alreadyProcessed: true,
            outcome: "DaDatCoc",
            maDP: booking.MaDP,
          };
        }

        await conn.execute(
          `UPDATE phong SET TrangThai = 'DaDatCoc' WHERE MaPhong = ?`,
          [Number(booking.MaPhong)],
        );
        outcome = "DaDatCoc";
      } else {
        const [updateDup] = await conn.execute(
          `UPDATE datphong
           SET TrangThai = 'TrungLapCanHoan',
               ThoiGianThanhToan = NOW(),
               ThoiGianHetHanGiu = NULL,
               GhiChuHoanCoc = ?
           WHERE MaDP = ? AND TrangThai = 'ChoThanhToan'`,
          [
            `Trùng lặp thanh toán do phòng ${room.TenPhong} đã ở trạng thái ${room.TrangThai}, chờ hoàn 100% tiền cọc`,
            Number(booking.MaDP),
          ],
        );

        if (updateDup.affectedRows === 0) {
          await conn.rollback();
          return {
            found: true,
            alreadyProcessed: true,
            outcome: "TrungLapCanHoan",
            maDP: booking.MaDP,
          };
        }
        outcome = "TrungLapCanHoan";
      }

      await conn.commit();
      return {
        found: true,
        alreadyProcessed: false,
        outcome,
        maDP: booking.MaDP,
      };
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  },

  // 9. TRANSACTION XÁC NHẬN HOÀN CỌC (ChotThue | KhongThue | TrungLap)
  confirmRefundTransaction: async ({
    maDP,
    ketQua,
    phuongThucHoan,
    ghiChuHoanCoc,
    nguoiXuLy,
  }) => {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const [dpRows] = await conn.execute(
        `SELECT * FROM datphong WHERE MaDP = ? FOR UPDATE`,
        [Number(maDP)],
      );
      const booking = dpRows[0];

      if (!booking) {
        await conn.rollback();
        return { error: "NOT_FOUND" };
      }

      let nextBookingStatus = "";
      let shouldReopenRoom = false;

      if (ketQua === "TrungLap") {
        if (booking.TrangThai !== "TrungLapCanHoan") {
          await conn.rollback();
          return {
            error: "INVALID_STATUS",
            currentStatus: booking.TrangThai,
            message:
              "Chỉ đơn ở trạng thái TrungLapCanHoan mới được hoàn cọc trùng lặp.",
          };
        }
        nextBookingStatus = "DaHoanCoc_KhongThue";
        shouldReopenRoom = false;
      } else if (ketQua === "KhongThue") {
        if (booking.TrangThai !== "DaDatCoc") {
          await conn.rollback();
          return {
            error: "INVALID_STATUS",
            currentStatus: booking.TrangThai,
            message:
              "Chỉ đơn ở trạng thái DaDatCoc mới có thể xác nhận hoàn cọc không thuê.",
          };
        }
        nextBookingStatus = "DaHoanCoc_KhongThue";
        shouldReopenRoom = true;
      } else if (ketQua === "ChotThue") {
        if (booking.TrangThai !== "DaDatCoc") {
          await conn.rollback();
          return {
            error: "INVALID_STATUS",
            currentStatus: booking.TrangThai,
            message:
              "Chỉ đơn ở trạng thái DaDatCoc mới có thể xác nhận hoàn cọc chốt thuê.",
          };
        }
        nextBookingStatus = "DaHoanCoc_ChotThue";
        shouldReopenRoom = false;
      } else {
        await conn.rollback();
        return { error: "INVALID_ACTION" };
      }

      const [roomRows] = await conn.execute(
        `SELECT MaPhong, TrangThai FROM phong WHERE MaPhong = ? FOR UPDATE`,
        [Number(booking.MaPhong)],
      );
      const room = roomRows[0];

      await conn.execute(
        `UPDATE datphong
         SET TrangThai = ?,
             PhuongThucHoan = ?,
             SoTienHoan = SoTienCoc,
             ThoiGianHoanCoc = NOW(),
             GhiChuHoanCoc = ?,
             NguoiXuLy = ?
         WHERE MaDP = ?`,
        [
          nextBookingStatus,
          phuongThucHoan,
          ghiChuHoanCoc || null,
          Number(nguoiXuLy),
          Number(maDP),
        ],
      );

      if (shouldReopenRoom && room && room.TrangThai === "DaDatCoc") {
        const [otherActive] = await conn.execute(
          `SELECT MaDP FROM datphong WHERE MaPhong = ? AND MaDP != ? AND TrangThai = 'DaDatCoc' LIMIT 1`,
          [Number(booking.MaPhong), Number(maDP)],
        );
        if (otherActive.length === 0) {
          await conn.execute(
            `UPDATE phong SET TrangThai = 'Trong' WHERE MaPhong = ?`,
            [Number(booking.MaPhong)],
          );
        }
      }

      await conn.commit();
      return {
        success: true,
        nextBookingStatus,
        reopenedRoom: shouldReopenRoom,
      };
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  },

  // 10. Lấy danh sách đơn quản lý theo phạm vi phòng được phép truy cập
  getManagementList: async ({
    allowedRoomIds = [],
    maKhu,
    maPhong,
    trangThai,
    keyword,
  }) => {
    if (!allowedRoomIds || allowedRoomIds.length === 0) return [];

    const placeholders = allowedRoomIds.map(() => "?").join(",");
    let sql = `${SELECT_BOOKING_DETAIL_SQL} WHERE dp.MaPhong IN (${placeholders}) `;
    const params = [...allowedRoomIds.map(Number)];

    if (maKhu && maKhu !== "ALL") {
      sql += ` AND p.MaKhu = ? `;
      params.push(Number(maKhu));
    }

    if (maPhong && maPhong !== "ALL") {
      sql += ` AND dp.MaPhong = ? `;
      params.push(Number(maPhong));
    }

    if (trangThai && trangThai !== "ALL") {
      sql += ` AND dp.TrangThai = ? `;
      params.push(String(trangThai).trim());
    }

    if (keyword && String(keyword).trim() !== "") {
      const kw = `%${String(keyword).trim()}%`;
      sql += ` AND (
        dp.MaTraCuu LIKE ?
        OR dp.SDT LIKE ?
        OR dp.HoTenKhach LIKE ?
        OR dp.Email LIKE ?
        OR p.TenPhong LIKE ?
      ) `;
      params.push(kw, kw, kw, kw, kw);
    }

    sql += `
      ORDER BY
        CASE dp.TrangThai
          WHEN 'TrungLapCanHoan' THEN 1
          WHEN 'DaDatCoc' THEN 2
          WHEN 'ChoThanhToan' THEN 3
          ELSE 4
        END ASC,
        dp.ThoiGianTao DESC,
        dp.MaDP DESC
    `;

    const [rows] = await db.execute(sql, params);
    return rows;
  },

  // 11. Tạo thông báo nội bộ (MaLTB = 6) gửi cho Chủ trọ và Quản lý khu trọ
  createBookingNotification: async (
    { maLTB = 6, maQuanLyKhu, tieuDe, noiDung },
    conn = db,
  ) => {
    const [chuTroRows] = await conn.execute(
      `SELECT MaND FROM nguoidung WHERE Quyen = 'ChuTro'`,
    );

    const recipientSet = new Set();
    if (maQuanLyKhu) recipientSet.add(Number(maQuanLyKhu));
    chuTroRows.forEach((r) => recipientSet.add(Number(r.MaND)));

    const dsNguoiNhan = Array.from(recipientSet).filter((id) => id > 0);
    if (dsNguoiNhan.length === 0) return { maTB: null, dsNguoiNhan: [] };

    const ndGui = Number(chuTroRows[0]?.MaND || maQuanLyKhu || 1);

    const [tbRes] = await conn.execute(
      `INSERT INTO thongbao (MaTBGoc, NDGui, MaLTB, TieuDe, NoiDung, NgayGui)
       VALUES (NULL, ?, ?, ?, ?, NOW())`,
      [ndGui, Number(maLTB) || 6, tieuDe, noiDung],
    );

    const maTB = tbRes.insertId;
    for (const ndNhan of dsNguoiNhan) {
      await conn.execute(
        `INSERT IGNORE INTO nhanthongbao (MaTB, NDNhan, TrangThai)
         VALUES (?, ?, 'ChuaDoc')`,
        [maTB, ndNhan],
      );
    }

    return { maTB, dsNguoiNhan };
  },

  // Alias trả về trực tiếp maTB để khớp với datPhong.controller.js
  createInternalNotification: async (
    { maLTB = 6, maQuanLyKhu, tieuDe, noiDung },
    conn = db,
  ) => {
    const result = await DatPhongModel.createBookingNotification(
      { maLTB, maQuanLyKhu, tieuDe, noiDung },
      conn,
    );
    return result.maTB;
  },

  // 12. Hủy đơn QR quá 15 phút theo OrderCode và đảm bảo phòng về 'Trong'
  cancelExpiredQrByOrderCode: async (orderCode) => {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const [rows] = await conn.execute(
        `SELECT MaDP, MaPhong, TrangThai, ThoiGianHetHanQR
         FROM datphong
         WHERE OrderCode = ?
         FOR UPDATE`,
        [Number(orderCode)],
      );

      const dp = rows[0];
      if (!dp) {
        await conn.commit();
        return { updated: false, reason: "NOT_FOUND" };
      }

      if (dp.TrangThai !== "ChoThanhToan") {
        await conn.commit();
        return { updated: false, trangThai: dp.TrangThai };
      }

      await conn.execute(
        `UPDATE datphong
         SET TrangThai = 'DaHuy',
             GhiChuHoanCoc = 'Tự động hủy do quá 15 phút chưa hoàn tất thanh toán'
         WHERE MaDP = ?`,
        [dp.MaDP],
      );

      const [activeDeposits] = await conn.execute(
        `SELECT COUNT(*) AS cnt
         FROM datphong
         WHERE MaPhong = ? AND TrangThai IN ('DaDatCoc', 'DaHoanCoc_ChotThue')`,
        [dp.MaPhong],
      );

      if (Number(activeDeposits[0]?.cnt || 0) === 0) {
        await conn.execute(
          `UPDATE phong
           SET TrangThai = 'Trong'
           WHERE MaPhong = ? AND TrangThai = 'DaDatCoc'`,
          [dp.MaPhong],
        );
      }

      await conn.commit();
      return { updated: true, maPhong: dp.MaPhong, trangThai: "DaHuy" };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },

  // 13. Cron Job xử lý hàng loạt: hủy đơn QR quá 15 phút + mở lại phòng quá hạn giữ 48h
  processExpiredBookings: async () => {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const [expiredQrRows] = await conn.execute(
        `SELECT MaDP, MaPhong
         FROM datphong
         WHERE TrangThai = 'ChoThanhToan'
           AND ThoiGianHetHanQR <= NOW()
         FOR UPDATE`,
      );

      let cancelledQrCount = 0;
      for (const row of expiredQrRows) {
        await conn.execute(
          `UPDATE datphong
           SET TrangThai = 'DaHuy',
               GhiChuHoanCoc = 'Tự động hủy do quá 15 phút chưa hoàn tất thanh toán'
           WHERE MaDP = ?`,
          [row.MaDP],
        );
        cancelledQrCount++;

        const [cntRows] = await conn.execute(
          `SELECT COUNT(*) AS cnt
           FROM datphong
           WHERE MaPhong = ? AND TrangThai IN ('DaDatCoc', 'DaHoanCoc_ChotThue')`,
          [row.MaPhong],
        );
        if (Number(cntRows[0]?.cnt || 0) === 0) {
          await conn.execute(
            `UPDATE phong SET TrangThai = 'Trong'
             WHERE MaPhong = ? AND TrangThai = 'DaDatCoc'`,
            [row.MaPhong],
          );
        }
      }

      const [expiredHoldRows] = await conn.execute(
        `SELECT dp.MaDP, dp.MaTraCuu, dp.MaPhong, dp.HoTenKhach, dp.SDT, dp.Email, dp.SoTienCoc,
                DATE_FORMAT(dp.ThoiGianHetHanGiu, '%Y-%m-%d %H:%i:%s') AS ThoiGianHetHanGiu,
                p.TenPhong, k.TenKhu, k.MaND AS MaQuanLyKhu
         FROM datphong dp
         INNER JOIN phong p ON dp.MaPhong = p.MaPhong
         INNER JOIN khutro k ON p.MaKhu = k.MaKhu
         WHERE dp.TrangThai = 'DaDatCoc'
           AND dp.ThoiGianHetHanGiu IS NOT NULL
           AND dp.ThoiGianHetHanGiu <= NOW()
         FOR UPDATE`,
      );

      for (const row of expiredHoldRows) {
        await conn.execute(
          `UPDATE datphong
           SET TrangThai = 'QuaHanMatCoc',
               GhiChuHoanCoc = 'Quá thời hạn giữ chỗ mà khách không đến xem phòng'
           WHERE MaDP = ?`,
          [row.MaDP],
        );
        await conn.execute(
          `UPDATE phong SET TrangThai = 'Trong'
           WHERE MaPhong = ? AND TrangThai = 'DaDatCoc'`,
          [row.MaPhong],
        );
      }

      await conn.commit();
      return {
        cancelledQrCount,
        expiredHoldRows,
        expiredHoldList: expiredHoldRows,
      };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },

  // 14. Xóa vĩnh viễn đơn đặt cọc đã hủy hoặc quá hạn mất cọc
  deleteExpiredOrCancelledById: async (maDP) => {
    const sql = `
      DELETE FROM datphong
      WHERE MaDP = ?
        AND TrangThai IN ('DaHuy', 'QuaHanMatCoc')
    `;
    const [result] = await db.execute(sql, [Number(maDP)]);
    return result.affectedRows > 0;
  },
};

module.exports = DatPhongModel;