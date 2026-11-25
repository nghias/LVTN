// server/src/jobs/datPhong.cron.js
const cron = require('node-cron');
const DatPhongModel = require('../app/models/datPhong.model');
const MailUtil = require('../utils/mailDatPhong.util');
const { emitThongBaoMoi, getIO } = require('../services/socket.service');

let isRunning = false;
let scheduledTask = null;

function formatVND(amount) {
  return `${Math.round(Number(amount || 0)).toLocaleString('vi-VN')}đ`;
}

/**
 * Hàm quét & xử lý các đơn đặt phòng quá hạn (QR quá 15p & đơn giữ phòng quá hạn)
 */
async function runDatPhongCleanup(io = null) {
  if (isRunning) {
    console.log('[DatPhong Cron] Lượt quét trước đang chạy, bỏ qua lượt này.');
    return null;
  }

  isRunning = true;
  try {
    const result = (await DatPhongModel.processExpiredBookings()) || {};
    const cancelledQrCount = Number(result.cancelledQrCount || 0);
    // Hỗ trợ cả 2 tên key (expiredHoldList hoặc expiredHoldRows) tránh lỗi undefined.length
    const expiredList = Array.isArray(result.expiredHoldList)
      ? result.expiredHoldList
      : Array.isArray(result.expiredHoldRows)
        ? result.expiredHoldRows
        : [];

    if (cancelledQrCount > 0 || expiredList.length > 0) {
      console.log(
        `[DatPhong Cron] Đã hủy ${cancelledQrCount} đơn QR quá hạn 15p | Chuyển quá hạn mất cọc & mở lại phòng cho ${expiredList.length} đơn.`
      );
    }

    const activeIo = io || (typeof getIO === 'function' ? getIO() : null);

    for (const item of expiredList) {
      // 1. Tạo thông báo nội bộ (MaLTB = 6, gửi Chủ trọ + Quản lý khu)
      try {
        const tieuDe = `[Hết hạn giữ phòng] Phòng ${item.TenPhong} - ${item.TenKhu} (${item.MaTraCuu})`;
        const noiDung = `Đơn đặt cọc ${item.MaTraCuu} của khách ${item.HoTenKhach} (${
          item.SDT
        }, cọc ${formatVND(item.SoTienCoc)}) cho phòng ${item.TenPhong} (${
          item.TenKhu
        }) đã quá hạn giữ chỗ${
          item.ThoiGianHetHanGiu ? ` lúc ${item.ThoiGianHetHanGiu}` : ''
        }. Hệ thống đã chuyển sang QuaHanMatCoc và mở lại phòng về trạng thái Trống.`;

        let maTB = null;
        let dsNguoiNhan = Array.from(
          new Set([1, ...(item.MaQuanLyKhu ? [Number(item.MaQuanLyKhu)] : [])])
        );

        // Gọi đúng hàm tạo thông báo hiện có trong DatPhongModel
        if (typeof DatPhongModel.createBookingNotification === 'function') {
          const noti = await DatPhongModel.createBookingNotification({
            maQuanLyKhu: item.MaQuanLyKhu,
            tieuDe,
            noiDung,
          });
          maTB = noti?.maTB ?? noti;
          if (Array.isArray(noti?.dsNguoiNhan) && noti.dsNguoiNhan.length > 0) {
            dsNguoiNhan = noti.dsNguoiNhan;
          }
        } else if (typeof DatPhongModel.createInternalNotification === 'function') {
          maTB = await DatPhongModel.createInternalNotification({
            maLTB: 6,
            maQuanLyKhu: item.MaQuanLyKhu,
            tieuDe,
            noiDung,
          });
        }

        // 2. Đẩy thông báo realtime qua Socket.io
        if (dsNguoiNhan.length > 0 && typeof emitThongBaoMoi === 'function') {
          emitThongBaoMoi(dsNguoiNhan, {
            MaTB: maTB,
            MaTBGoc: null,
            NDGui: 1,
            TenNguoiGui: 'Hệ thống Đặt cọc tự động',
            QuyenNguoiGui: 'ChuTro',
            MaLTB: 6,
            TenLTB: 'Đặt cọc giữ phòng',
            TieuDe: tieuDe,
            NoiDung: noiDung,
            NgayGui: new Date().toISOString(),
            TrangThai: 'ChuaDoc',
          });
        }
      } catch (notiErr) {
        console.error(
          `[DatPhong Cron] Lỗi gửi thông báo nội bộ cho ${item.MaTraCuu}:`,
          notiErr.message
        );
      }

      // 3. Gửi Email thông báo hết hạn cho khách
      if (item.Email && typeof MailUtil.sendBookingExpiredEmail === 'function') {
        try {
          await MailUtil.sendBookingExpiredEmail(item);
        } catch (mailErr) {
          console.error(
            `[DatPhong Cron] Lỗi gửi email quá hạn cho ${item.MaTraCuu}:`,
            mailErr.message
          );
        }
      }
    }

    return { cancelledQrCount, expiredHoldCount: expiredList.length };
  } catch (error) {
    console.error('[DatPhong Cron] Lỗi khi quét đơn đặt phòng quá hạn:', error);
    return null;
  } finally {
    isRunning = false;
  }
}


function startDatPhongCron(io = null) {
  if (scheduledTask) {
    return scheduledTask;
  }

  const cronExpr = process.env.BOOKING_CRON_EXPR || '*/1 * * * *';

  scheduledTask = cron.schedule(
    cronExpr,
    () => {
      runDatPhongCleanup(io);
    },
    { timezone: 'Asia/Ho_Chi_Minh' }
  );

  // Quét bù 1 lần sau khi server khởi động 10 giây
  setTimeout(() => {
    runDatPhongCleanup(io);
  }, 10000);

  console.log(`[DatPhong Cron] Đã khởi động tác vụ tự động (lịch: ${cronExpr}).`);
  return scheduledTask;
}

module.exports = {
  startDatPhongCron,
  runDatPhongCleanup,
};