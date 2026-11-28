// server/src/app/controllers/datPhong.controller.js
const crypto = require("crypto");
const db = require("../../database/db");
const DatPhongModel = require("../models/datPhong.model");
const { emitThongBaoMoi } = require("../../services/socket.service");

// Tải mail.util.js (kèm log rõ ràng nếu lỗi đường dẫn/cú pháp)
let MailUtil = null;
try {
  MailUtil = require("../../utils/mail.util");
} catch (err) {
  console.error("[DatPhong] Lỗi nạp ../../utils/mail.util:", err);
}

const PAYOS_BASE_URL = "https://api-merchant.payos.vn/v2/payment-requests";
const QR_EXPIRE_MINUTES = 15;
const HOLD_HOURS = Number(process.env.BOOKING_HOLD_HOURS || 48);
const DEPOSIT_RATE = 0.15; // Đặt cọc cố định 15% giá trị phòng
const CLIENT_URL = (
  process.env.CLIENT_URL ||
  process.env.FRONTEND_URL ||
  "http://localhost:3000"
).replace(/\/+$/, "");

// Khóa chống chạy song song khi PayOS Webhook và Polling 3 giây gọi cùng lúc
const inFlightConfirmations = new Map();

// =========================================================================
// CÁC HÀM HELPER NỘI BỘ
// =========================================================================

// Tính tiền đặt cọc cố định 15% giá phòng (làm tròn bội số 1.000đ)
function calculateFixedDeposit(giaPhong) {
  const price = Number(giaPhong) || 0;
  if (price <= 0) return 0;
  return Math.round((price * DEPOSIT_RATE) / 1000) * 1000;
}

function resolvePayOSCredentials(thongTinNH) {
  const clientId = String(
    thongTinNH?.PayosClientId || process.env.PAYOS_CLIENT_ID || "",
  ).trim();
  const apiKey = String(
    thongTinNH?.PayosApiKey || process.env.PAYOS_API_KEY || "",
  ).trim();
  const checksumKey = String(
    thongTinNH?.PayosChecksumKey || process.env.PAYOS_CHECKSUM_KEY || "",
  ).trim();

  return { clientId, apiKey, checksumKey };
}

function createPayOSSignature(
  { amount, cancelUrl, description, orderCode, returnUrl },
  checksumKey,
) {
  const rawSignature = `amount=${amount}&cancelUrl=${cancelUrl}&description=${description}&orderCode=${orderCode}&returnUrl=${returnUrl}`;
  return crypto
    .createHmac("sha256", checksumKey)
    .update(rawSignature)
    .digest("hex");
}

function removeVietnameseTones(str = "") {
  return String(str)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function formatVND(amount) {
  return `${Math.round(Number(amount || 0)).toLocaleString("vi-VN")}đ`;
}

// Đối chiếu số tiền thực nhận trên PayOS so với số tiền cọc 15% yêu cầu
function evaluatePayOSAmount(payosData, expectedAmount) {
  const expected = Math.round(Number(expectedAmount) || 0);
  const payosStatus = String(payosData?.status || "").toUpperCase();

  let paidAmount = 0;
  if (payosData?.amountPaid !== undefined && payosData?.amountPaid !== null) {
    paidAmount = Number(payosData.amountPaid) || 0;
  } else if (
    Array.isArray(payosData?.transactions) &&
    payosData.transactions.length > 0
  ) {
    paidAmount = payosData.transactions.reduce(
      (sum, tx) => sum + (Number(tx?.amount) || 0),
      0,
    );
  } else if (payosStatus === "PAID") {
    paidAmount = Number(payosData?.amount) || expected;
  }
  paidAmount = Math.round(paidAmount);

  const remainingAmount = Math.max(0, expected - paidAmount);
  const overpaidAmount = Math.max(0, paidAmount - expected);

  let amountStatus = "UNPAID"; // UNPAID | UNDERPAID | EXACT | OVERPAID
  let isWrongAmount = false;
  let warningMessage = null;

  if (paidAmount > 0 && paidAmount < expected) {
    amountStatus = "UNDERPAID";
    isWrongAmount = true;
    warningMessage = `Cảnh báo chuyển thiếu tiền: Hệ thống mới nhận được ${formatVND(
      paidAmount,
    )} / ${formatVND(expected)} (còn thiếu ${formatVND(
      remainingAmount,
    )}). Phòng CHƯA được giữ chỗ. Vui lòng chuyển bổ sung đúng ${formatVND(
      remainingAmount,
    )} với cùng nội dung chuyển khoản trước khi hết giờ, hoặc liên hệ quản lý cơ sở để được hỗ trợ.`;
  } else if (paidAmount > expected && expected > 0) {
    amountStatus = "OVERPAID";
    isWrongAmount = true;
    warningMessage = `Cảnh báo chuyển thừa tiền: Bạn đã chuyển ${formatVND(
      paidAmount,
    )}, thừa ${formatVND(overpaidAmount)} so với mức cọc 15% quy định (${formatVND(
      expected,
    )}). Phòng vẫn được giữ chỗ và quản lý sẽ đối soát hoàn lại phần tiền thừa cho bạn.`;
  } else if (paidAmount === expected && expected > 0) {
    amountStatus = "EXACT";
  }

  return {
    payosStatus,
    expectedAmount: expected,
    paidAmount,
    remainingAmount,
    overpaidAmount,
    amountStatus,
    isWrongAmount,
    isSufficient: paidAmount >= expected && expected > 0,
    warningMessage,
  };
}

// Sinh OrderCode 12 chữ số bắt đầu bằng 9 để tách biệt với bảng ThanhToan hóa đơn
function generateBookingOrderCode() {
  const timePart = Date.now().toString().slice(-10);
  const randDigit = Math.floor(Math.random() * 10);
  return Number(`9${timePart}${randDigit}`);
}

// Sinh mã tra cứu biên lai: DCYYYYMMDD + 4 số ngẫu nhiên
function generateMaTraCuu() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const suffix = String(Math.floor(1000 + Math.random() * 9000));
  return `DC${yyyy}${mm}${dd}${suffix}`;
}

function normalizeMySQLDateTime(rawDate) {
  if (!rawDate) return null;
  const parsed = new Date(rawDate);
  if (Number.isNaN(parsed.getTime())) return null;

  const pad = (n) => String(n).padStart(2, "0");
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(
    parsed.getDate(),
  )} ${pad(parsed.getHours())}:${pad(parsed.getMinutes())}:${pad(
    parsed.getSeconds(),
  )}`;
}

// Lấy MaND hiện tại từ request
function extractCurrentMaND(req) {
  return (
    req.user?.maND ||
    req.user?.MaND ||
    req.user?.id ||
    req.query?.MaND ||
    req.body?.MaND ||
    null
  );
}

async function getCurrentUserFromDB(req) {
  const maND = extractCurrentMaND(req);
  if (!maND) return null;
  const [rows] = await db.execute(
    `SELECT MaND, TenTK, Quyen FROM nguoidung WHERE MaND = ? LIMIT 1`,
    [Number(maND)],
  );
  return rows[0] || null;
}

async function getAccessibleRoomsAndKhu(user) {
  const role = String(user?.Quyen || "").trim();
  const maND = Number(user?.MaND);

  const [allRooms] = await db.execute(
    `SELECT MaPhong, MaKhu, TenPhong, Gia, TrangThai FROM phong ORDER BY MaKhu ASC, TenPhong ASC`,
  );
  const [allKhu] = await db.execute(
    `SELECT MaKhu, MaND, TenKhu, DiaChi FROM khutro ORDER BY MaKhu ASC`,
  );

  if (role === "ChuTro" || role === "Admin" || maND === 1) {
    return {
      allowedRoomIds: allRooms.map((r) => Number(r.MaPhong)),
      allRooms,
      allKhu,
    };
  }

  if (role === "QuanLy") {
    const myKhuIds = allKhu
      .filter((k) => Number(k.MaND) === maND)
      .map((k) => Number(k.MaKhu));
    const allowedRooms = allRooms.filter((r) =>
      myKhuIds.includes(Number(r.MaKhu)),
    );
    return {
      allowedRoomIds: allowedRooms.map((r) => Number(r.MaPhong)),
      allRooms: allowedRooms,
      allKhu: allKhu.filter((k) => myKhuIds.includes(Number(k.MaKhu))),
    };
  }

  return { allowedRoomIds: [], allRooms: [], allKhu: [] };
}

async function fetchPayOSPaymentStatus(orderCode, credentials) {
  const response = await fetch(`${PAYOS_BASE_URL}/${orderCode}`, {
    method: "GET",
    headers: {
      "x-client-id": credentials.clientId,
      "x-api-key": credentials.apiKey,
    },
  });
  const json = await response.json();
  if (!response.ok || json.code !== "00") {
    throw new Error(
      json.desc || "Không thể kiểm tra trạng thái giao dịch PayOS",
    );
  }
  return json.data;
}

// Hủy link thanh toán trên PayOS khi quá 15 phút
async function cancelPayOSPaymentLink(
  orderCode,
  reason = "Quá hạn thanh toán 15 phút",
) {
  try {
    const payosConfig = await DatPhongModel.getPayOSConfig();
    const { clientId, apiKey } = resolvePayOSCredentials(payosConfig);
    if (!clientId || !apiKey) return;

    await fetch(`${PAYOS_BASE_URL}/${orderCode}/cancel`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-client-id": clientId,
        "x-api-key": apiKey,
      },
      body: JSON.stringify({ cancellationReason: reason }),
    });
  } catch {
    // Bỏ qua nếu link đã hết hạn sẵn trên PayOS
  }
}

// Hủy đơn quá hạn & đảm bảo phòng trở về trạng thái 'Trong' (không có cọc)
async function cancelBookingAndReleaseRoom(maDP, maPhong, reason) {
  await DatPhongModel.markAsCancelled(maDP, reason);
  if (maPhong) {
    await db.execute(
      `UPDATE phong
       SET TrangThai = 'Trong'
       WHERE MaPhong = ?
         AND TrangThai = 'DaDatCoc'
         AND NOT EXISTS (
           SELECT 1 FROM datphong
           WHERE MaPhong = ? AND TrangThai IN ('DaDatCoc', 'DaHoanCoc_ChotThue')
         )`,
      [Number(maPhong), Number(maPhong)],
    );
  }
}

// Helper tạo thông báo nội bộ (chống trùng theo từ khóa + mã đơn)
async function createAndEmitBookingNotification({
  booking,
  tieuDe,
  noiDung,
  dedupKeyword,
  io = null,
}) {
  try {
    const [existingNotiRows] = await db.execute(
      `SELECT MaTB FROM thongbao
       WHERE MaLTB = 6
         AND (NoiDung LIKE ? OR TieuDe LIKE ?)
         AND TieuDe LIKE ?
       LIMIT 1`,
      [`%${booking.MaTraCuu}%`, `%${booking.MaTraCuu}%`, `%${dedupKeyword}%`],
    );

    if (existingNotiRows.length > 0) return null;

    let maQuanLyKhu = booking.MaQuanLyKhu ? Number(booking.MaQuanLyKhu) : null;
    if (!maQuanLyKhu && booking.MaPhong) {
      const [khuRows] = await db.execute(
        `SELECT k.MaND AS MaQuanLyKhu
         FROM phong p
         INNER JOIN khutro k ON p.MaKhu = k.MaKhu
         WHERE p.MaPhong = ?
         LIMIT 1`,
        [Number(booking.MaPhong)],
      );
      maQuanLyKhu = khuRows[0]?.MaQuanLyKhu
        ? Number(khuRows[0].MaQuanLyKhu)
        : null;
    }

    const dsNguoiNhan = Array.from(
      new Set([1, ...(maQuanLyKhu ? [maQuanLyKhu] : [])]),
    );

    let maTB = null;
    if (typeof DatPhongModel.createInternalNotification === "function") {
      maTB = await DatPhongModel.createInternalNotification({
        maLTB: 6,
        maQuanLyKhu,
        tieuDe,
        noiDung,
      });
    } else if (typeof DatPhongModel.createBookingNotification === "function") {
      const notiRes = await DatPhongModel.createBookingNotification({
        maQuanLyKhu,
        tieuDe,
        noiDung,
      });
      maTB = notiRes?.maTB ?? notiRes;
    } else {
      const [insTb] = await db.execute(
        `INSERT INTO thongbao (MaTBGoc, NDGui, MaLTB, TieuDe, NoiDung, NgayGui)
         VALUES (NULL, 1, 6, ?, ?, NOW())`,
        [tieuDe, noiDung],
      );
      maTB = insTb.insertId;
    }

    if (maTB && dsNguoiNhan.length > 0) {
      for (const ndId of dsNguoiNhan) {
        await db.execute(
          `INSERT IGNORE INTO nhanthongbao (MaTB, NDNhan, TrangThai)
           VALUES (?, ?, 'ChuaDoc')`,
          [Number(maTB), Number(ndId)],
        );
      }
    }

    const socketPayload = {
      MaTB: maTB,
      MaTBGoc: null,
      NDGui: 1,
      TenNguoiGui: "Hệ thống Đặt cọc tự động",
      QuyenNguoiGui: "ChuTro",
      MaLTB: 6,
      TenLTB: "Đặt cọc giữ phòng",
      TieuDe: tieuDe,
      NoiDung: noiDung,
      NgayGui: new Date().toISOString(),
      TrangThai: "ChuaDoc",
    };

    if (typeof emitThongBaoMoi === "function") {
      emitThongBaoMoi(dsNguoiNhan, socketPayload);
    } else if (io) {
      dsNguoiNhan.forEach((ndId) => {
        io.to(`user_${ndId}`).emit("NEW_NOTIFICATION", socketPayload);
        io.to(`user_${ndId}`).emit("thong_bao_moi", socketPayload);
      });
    }

    return maTB;
  } catch (notiErr) {
    console.error(
      `[DatPhong][Noti] Lỗi tạo thông báo nội bộ cho ${booking?.MaTraCuu}:`,
      notiErr,
    );
    return null;
  }
}

// Gửi Email hóa đơn đặt cọc / trùng cọc / hoàn cọc qua mail.util.js (Brevo)
async function dispatchBookingEmail(type, booking) {
  if (!booking) {
    console.warn(`[DatPhong][Mail] Không có dữ liệu booking để gửi (${type}).`);
    return { sent: false, reason: "NO_BOOKING" };
  }

  const recipientEmail = String(booking.Email || booking.email || "").trim();
  if (!recipientEmail) {
    console.warn(
      `[DatPhong][Mail] Đơn ${booking.MaTraCuu} không có Email khách hàng -> bỏ qua gửi mail (${type}).`,
    );
    return { sent: false, reason: "NO_EMAIL" };
  }

  if (!MailUtil) {
    console.error(
      `[DatPhong][Mail] Không thể gửi mail (${type}) cho ${booking.MaTraCuu} vì mail.util.js chưa nạp được.`,
    );
    return { sent: false, reason: "MAIL_UTIL_MISSING" };
  }

  try {
    const receiptUrl = `${CLIENT_URL}/datPhong/hoaDon/${encodeURIComponent(
      booking.MaTraCuu || "",
    )}?token=${encodeURIComponent(booking.TokenTraCuu || "")}`;

    let payosConfig = null;
    try {
      payosConfig = await DatPhongModel.getPayOSConfig();
    } catch (cfgErr) {
      console.warn(
        "[DatPhong][Mail] Không lấy được thông tin ngân hàng nhận cọc:",
        cfgErr.message,
      );
    }

    const enrichedBooking = {
      ...booking,
      Email: recipientEmail,
      DiaChiKhu: booking.DiaChiKhu || booking.DiaChi || "",
      receiptUrl,
      ThongTinNganHangNhan: payosConfig
        ? {
            TenNganHang: payosConfig.TenNganHang,
            STK: payosConfig.STK,
            ChuTaiKhoan: payosConfig.ChuTaiKhoan,
          }
        : null,
    };

    console.log(
      `[DatPhong][Mail] Đang gửi email (${type}) cho đơn ${booking.MaTraCuu} -> ${recipientEmail}`,
    );

    if (
      type === "RECEIPT" &&
      typeof MailUtil.sendBookingReceiptEmail === "function"
    ) {
      const res = await MailUtil.sendBookingReceiptEmail(enrichedBooking);
      return { sent: true, response: res };
    }
    if (
      type === "DUPLICATE" &&
      typeof MailUtil.sendBookingDuplicateEmail === "function"
    ) {
      const res = await MailUtil.sendBookingDuplicateEmail(enrichedBooking);
      return { sent: true, response: res };
    }
    if (
      type === "REFUND" &&
      typeof MailUtil.sendBookingRefundEmail === "function"
    ) {
      const res = await MailUtil.sendBookingRefundEmail(enrichedBooking);
      return { sent: true, response: res };
    }

    if (typeof MailUtil.sendEmail === "function") {
      const subjectMap = {
        RECEIPT: `[Xóm Trọ] Xác nhận đặt cọc thành công & Hóa đơn phòng ${booking.TenPhong} - ${booking.MaTraCuu}`,
        DUPLICATE: `[Xóm Trọ] Thông báo trùng đơn đặt cọc phòng ${booking.TenPhong} - ${booking.MaTraCuu}`,
        REFUND: `[Xóm Trọ] Xác nhận hoàn 100% tiền cọc phòng ${booking.TenPhong} - ${booking.MaTraCuu}`,
      };
      const htmlMap = {
        RECEIPT: `
          <h3>Xác nhận đặt cọc giữ phòng thành công</h3>
          <p>Xin chào <b>${booking.HoTenKhach}</b>,</p>
          <p>Hệ thống đã nhận được khoản cọc <b>${formatVND(booking.SoTienCoc)}</b> cho phòng <b>${booking.TenPhong}</b> (${booking.TenKhu}).</p>
          <ul>
            <li><b>Mã tra cứu hóa đơn:</b> ${booking.MaTraCuu}</li>
            <li><b>Mã giao dịch PayOS:</b> ${booking.OrderCode}</li>
            <li><b>Ngày hẹn xem phòng:</b> ${booking.NgayHenXem}</li>
            <li><b>Hạn giữ phòng:</b> ${booking.ThoiGianHetHanGiu}</li>
            <li><b>Quản lý hỗ trợ &amp; giải quyết:</b> ${booking.TenQuanLy || "Ban quản lý"} — SĐT: ${booking.SDTQuanLy || "—"}</li>
          </ul>
          <p>Xem và tải hóa đơn tại đây: <a href="${receiptUrl}">${receiptUrl}</a></p>
        `,
        DUPLICATE: `
          <h3>Thông báo trùng lặp thanh toán giữ phòng</h3>
          <p>Xin chào <b>${booking.HoTenKhach}</b>,</p>
          <p>Hệ thống đã nhận <b>${formatVND(booking.SoTienCoc)}</b> cho mã đơn <b>${booking.MaTraCuu}</b>, tuy nhiên phòng <b>${booking.TenPhong}</b> vừa được khách khác giữ chỗ ngay trước đó.</p>
          <p>Quản lý <b>${booking.TenQuanLy || ""} (${booking.SDTQuanLy || ""})</b> sẽ liên hệ hoàn lại <b>100% tiền cọc</b> cho bạn trong thời gian sớm nhất.</p>
          <p>Chi tiết biên lai: <a href="${receiptUrl}">${receiptUrl}</a></p>
        `,
        REFUND: `
          <h3>Xác nhận đã hoàn 100% tiền cọc giữ phòng</h3>
          <p>Xin chào <b>${booking.HoTenKhach}</b>,</p>
          <p>Đơn đặt cọc <b>${booking.MaTraCuu}</b> (phòng <b>${booking.TenPhong}</b>) đã được xác nhận hoàn lại <b>${formatVND(booking.SoTienHoan)}</b> qua hình thức <b>${booking.PhuongThucHoan === "ChuyenKhoan" ? "Chuyển khoản" : "Tiền mặt"}</b>.</p>
          <p>Ghi chú: ${booking.GhiChuHoanCoc || "Hoàn tất đối soát cọc"}</p>
          <p>Xem lại biên lai: <a href="${receiptUrl}">${receiptUrl}</a></p>
        `,
      };
      const res = await MailUtil.sendEmail({
        to: recipientEmail,
        toName: booking.HoTenKhach,
        subject: subjectMap[type],
        html: htmlMap[type],
        htmlContent: htmlMap[type],
      });
      return { sent: true, response: res };
    }

    console.error(
      `[DatPhong][Mail] mail.util.js không export hàm gửi mail phù hợp cho loại "${type}".`,
    );
    return { sent: false, reason: "NO_HANDLER" };
  } catch (mailErr) {
    console.error(
      `[DatPhong][Mail] Lỗi gửi Email (${type}) cho ${booking.MaTraCuu}:`,
      mailErr,
    );
    return { sent: false, error: mailErr.message };
  }
}

// =========================================================================
// CONTROLLER CHÍNH
// =========================================================================

const DatPhongController = {
  // -----------------------------------------------------------------------
  // HÀM DÙNG CHUNG: Xác nhận thanh toán cọc tự động
  // Gọi từ cả API Polling 3 giây lẫn Webhook trong ThanhToanController.js
  // Tự đối chiếu số tiền thực nhận trên PayOS trước khi chốt đơn
  // -----------------------------------------------------------------------
  xacNhanThanhToanCocTuDong: async (
    orderCode,
    io = null,
    payosDataInput = null,
  ) => {
    const lockKey = String(orderCode);
    if (inFlightConfirmations.has(lockKey)) {
      return inFlightConfirmations.get(lockKey);
    }

    const workPromise = (async () => {
      const bookingBefore = await DatPhongModel.getByOrderCode(orderCode);
      if (!bookingBefore) {
        return { found: false };
      }

      // Đối chiếu số tiền thực chuyển trên PayOS nếu đơn vẫn đang chờ thanh toán
      let amountCheck = null;
      if (bookingBefore.TrangThai === "ChoThanhToan") {
        let payosData = payosDataInput;
        if (!payosData) {
          try {
            const payosConfig = await DatPhongModel.getPayOSConfig();
            const credentials = resolvePayOSCredentials(payosConfig);
            if (credentials.clientId && credentials.apiKey) {
              payosData = await fetchPayOSPaymentStatus(orderCode, credentials);
            }
          } catch (payosErr) {
            console.error(
              `[DatPhong] Không thể đối chiếu PayOS cho orderCode=${orderCode}:`,
              payosErr.message,
            );
          }
        }

        if (payosData) {
          amountCheck = evaluatePayOSAmount(payosData, bookingBefore.SoTienCoc);

          // CHẶN KHÔNG CHỐT ĐƠN nếu chuyển thiếu tiền hoặc PayOS chưa PAID
          if (
            !amountCheck.isSufficient ||
            amountCheck.payosStatus !== "PAID"
          ) {
            console.warn(
              `[DatPhong] Từ chối chốt đơn ${bookingBefore.MaTraCuu}: status=${amountCheck.payosStatus}, nhận=${amountCheck.paidAmount}, yêu cầu=${amountCheck.expectedAmount}`,
            );

            // Nếu khách đã lỡ chuyển thiếu tiền -> báo ngay cho Quản lý & Chủ trọ biết
            if (amountCheck.amountStatus === "UNDERPAID") {
              await createAndEmitBookingNotification({
                booking: bookingBefore,
                tieuDe: `[Chuyển thiếu tiền cọc] ${bookingBefore.TenPhong} - ${bookingBefore.MaTraCuu}`,
                noiDung: `Khách ${bookingBefore.HoTenKhach} (SĐT: ${bookingBefore.SDT}) vừa chuyển thiếu tiền cọc phòng ${bookingBefore.TenPhong}: mới nhận ${formatVND(
                  amountCheck.paidAmount,
                )} / yêu cầu ${formatVND(
                  amountCheck.expectedAmount,
                )} (thiếu ${formatVND(
                  amountCheck.remainingAmount,
                )}). Phòng hiện CHƯA được khóa giữ chỗ.`,
                dedupKeyword: "Chuyển thiếu tiền cọc",
                io,
              });
            }

            return {
              found: true,
              rejected: true,
              reason: "WRONG_AMOUNT",
              amountCheck,
              booking: bookingBefore,
            };
          }
        }
      }

      const txResult = await DatPhongModel.confirmPaymentTransaction(
        orderCode,
        {
          holdHours: HOLD_HOURS,
        },
      );

      if (!txResult.found) {
        return { found: false };
      }

      // Nếu khách chuyển THỪA tiền -> ghi chú chênh lệch vào đơn để quản lý đối soát
      const isOverpaid = amountCheck?.amountStatus === "OVERPAID";
      if (isOverpaid && !txResult.alreadyProcessed) {
        const overpaidNote = `[CẢNH BÁO CHUYỂN THỪA: Đã nhận ${formatVND(
          amountCheck.paidAmount,
        )} / Yêu cầu ${formatVND(amountCheck.expectedAmount)}, thừa ${formatVND(
          amountCheck.overpaidAmount,
        )}]`;
        try {
          await db.execute(
            `UPDATE datphong
             SET GhiChu = CASE
               WHEN GhiChu IS NULL OR TRIM(GhiChu) = '' THEN ?
               ELSE CONCAT(GhiChu, ' | ', ?)
             END
             WHERE MaDP = ?`,
            [overpaidNote, overpaidNote, Number(txResult.maDP)],
          );
        } catch (noteErr) {
          console.error(
            "[DatPhong] Lỗi ghi chú chuyển thừa tiền:",
            noteErr.message,
          );
        }
      }

      const booking = await DatPhongModel.getById(txResult.maDP);
      let emailResult = null;

      // Nếu là lần đầu xác nhận thành công -> gửi thông báo nội bộ & Email hóa đơn
      if (!txResult.alreadyProcessed && booking) {
        const isDuplicate = txResult.outcome === "TrungLapCanHoan";

        const overpaidSuffix = isOverpaid
          ? ` LƯU Ý: Khách chuyển THỪA ${formatVND(
              amountCheck.overpaidAmount,
            )} (thực nhận ${formatVND(
              amountCheck.paidAmount,
            )}), vui lòng đối soát hoàn lại phần thừa.`
          : "";

        const tieuDe = isDuplicate
          ? `[Trùng cọc cần hoàn] ${booking.TenPhong} - ${booking.MaTraCuu}`
          : isOverpaid
            ? `[Đặt cọc — Chuyển thừa tiền] ${booking.TenPhong} - ${booking.HoTenKhach}`
            : `[Đặt cọc giữ phòng] ${booking.TenPhong} - ${booking.HoTenKhach}`;

        const noiDung = isDuplicate
          ? `Khách ${booking.HoTenKhach} (SĐT: ${booking.SDT}, Email: ${booking.Email}) thanh toán ${formatVND(
              isOverpaid ? amountCheck.paidAmount : booking.SoTienCoc,
            )} nhưng phòng ${booking.TenPhong} (${booking.TenKhu}) đã được giữ trước đó. Mã đơn: ${
              booking.MaTraCuu
            }. Vui lòng liên hệ hoàn 100% tiền cọc.${overpaidSuffix}`
          : `Khách ${booking.HoTenKhach} (SĐT: ${booking.SDT}, Email: ${booking.Email}) đã thanh toán cọc ${formatVND(
              booking.SoTienCoc,
            )} giữ phòng ${booking.TenPhong} (${booking.TenKhu}). Hẹn xem: ${
              booking.NgayHenXem
            }. Mã tra cứu: ${booking.MaTraCuu}.${overpaidSuffix}`;

        // 1. Lưu thông báo vào bảng thongbao & nhanthongbao
        await createAndEmitBookingNotification({
          booking,
          tieuDe,
          noiDung,
          dedupKeyword: isDuplicate ? "Trùng cọc" : "Đặt cọc",
          io,
        });

        // 2. Gửi Email hóa đơn kèm thông tin liên hệ quản lý qua Brevo
        emailResult = await dispatchBookingEmail(
          isDuplicate ? "DUPLICATE" : "RECEIPT",
          booking,
        );
      }

      return {
        found: true,
        rejected: false,
        alreadyProcessed: txResult.alreadyProcessed,
        outcome: txResult.outcome,
        amountCheck,
        booking,
        emailResult,
      };
    })();

    inFlightConfirmations.set(lockKey, workPromise);
    try {
      return await workPromise;
    } finally {
      inFlightConfirmations.delete(lockKey);
    }
  },

  // -----------------------------------------------------------------------
  // 1. [POST] /api/dat-phong/tao-yeu-cau (Public - Khách vãng lai)
  // Tiền đặt cọc cố định = 15% giá trị phòng
  // -----------------------------------------------------------------------
  taoYeuCauDatCoc: async (req, res) => {
    try {
      const { MaPhong, HoTenKhach, SDT, Email, NgayHenXem, SoTienCoc, GhiChu } =
        req.body;

      if (!MaPhong || !HoTenKhach || !SDT || !Email || !NgayHenXem) {
        return res.status(400).json({
          success: false,
          message: "Vui lòng nhập đầy đủ thông tin đặt cọc giữ phòng.",
        });
      }

      const sdtClean = String(SDT).trim();
      const emailClean = String(Email).trim();
      const hoTenClean = String(HoTenKhach).trim();

      if (!/^(0|\+84)[0-9]{8,10}$/.test(sdtClean)) {
        return res.status(400).json({
          success: false,
          message: "Số điện thoại không hợp lệ.",
        });
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailClean)) {
        return res.status(400).json({
          success: false,
          message:
            "Địa chỉ Email không hợp lệ (bắt buộc để nhận hóa đơn đặt cọc).",
        });
      }

      const ngayHenXemMySQL = normalizeMySQLDateTime(NgayHenXem);
      if (!ngayHenXemMySQL) {
        return res.status(400).json({
          success: false,
          message: "Thời gian hẹn xem phòng không hợp lệ.",
        });
      }

      const phong = await DatPhongModel.getPhongWithKhuById(Number(MaPhong));
      if (!phong) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy phòng trọ yêu cầu.",
        });
      }

      if (String(phong.TrangThai).trim() !== "Trong") {
        return res.status(409).json({
          success: false,
          message:
            phong.TrangThai === "DaDatCoc"
              ? `Phòng ${phong.TenPhong} hiện đã có khách đặt cọc giữ chỗ.`
              : `Phòng ${phong.TenPhong} hiện không còn trống (${phong.TrangThai}).`,
        });
      }

      // Tính tiền đặt cọc cố định 15% trực tiếp từ giá phòng trong CSDL
      const giaPhong = Number(phong.Gia) || 0;
      const depositAmount = calculateFixedDeposit(giaPhong);

      if (giaPhong <= 0 || depositAmount <= 0) {
        return res.status(400).json({
          success: false,
          message:
            "Phòng trọ chưa có giá thuê hợp lệ để tính tiền đặt cọc 15%.",
        });
      }

      // Chặn trường hợp phía client gửi sai số tiền so với quy định 15%
      if (
        SoTienCoc !== undefined &&
        SoTienCoc !== null &&
        String(SoTienCoc).trim() !== ""
      ) {
        const clientAmount = Math.round(Number(SoTienCoc));
        if (!Number.isFinite(clientAmount) || clientAmount !== depositAmount) {
          return res.status(400).json({
            success: false,
            message: `Số tiền đặt cọc bắt buộc bằng đúng 15% giá thuê phòng (${formatVND(depositAmount)}).`,
          });
        }
      }

      const payosConfig = await DatPhongModel.getPayOSConfig();
      const credentials = resolvePayOSCredentials(payosConfig);
      if (
        !credentials.clientId ||
        !credentials.apiKey ||
        !credentials.checksumKey
      ) {
        return res.status(500).json({
          success: false,
          message:
            "Hệ thống chưa cấu hình đầy đủ thông tin cổng thanh toán PayOS.",
        });
      }

      const maTraCuu = generateMaTraCuu();
      const tokenTraCuu = crypto.randomBytes(32).toString("hex");
      const orderCode = generateBookingOrderCode();

      const maDP = await DatPhongModel.create({
        MaTraCuu: maTraCuu,
        TokenTraCuu: tokenTraCuu,
        MaPhong: phong.MaPhong,
        HoTenKhach: hoTenClean,
        SDT: sdtClean,
        Email: emailClean,
        NgayHenXem: ngayHenXemMySQL,
        GhiChu: GhiChu ? String(GhiChu).trim() : null,
        SoTienCoc: depositAmount,
        OrderCode: orderCode,
        QrExpireMinutes: QR_EXPIRE_MINUTES,
      });

      const returnUrl = `${CLIENT_URL}/datPhong/hoaDon/${encodeURIComponent(
        maTraCuu,
      )}?token=${encodeURIComponent(tokenTraCuu)}`;
      const cancelUrl = `${CLIENT_URL}/datPhong/hoaDon?maTraCuu=${encodeURIComponent(
        maTraCuu,
      )}&token=${encodeURIComponent(tokenTraCuu)}`;

      const rawDesc = `DATCOC ${removeVietnameseTones(phong.TenPhong)} DP${maDP}`;
      const description = rawDesc.slice(0, 25);
      const expiredAt = Math.floor(Date.now() / 1000) + QR_EXPIRE_MINUTES * 60;

      const signature = createPayOSSignature(
        {
          amount: depositAmount,
          cancelUrl,
          description,
          orderCode,
          returnUrl,
        },
        credentials.checksumKey,
      );

      const payosPayload = {
        orderCode,
        amount: depositAmount,
        description,
        buyerName: hoTenClean,
        buyerEmail: emailClean,
        buyerPhone: sdtClean,
        items: [
          {
            name: `Dat coc 15% giu phong ${removeVietnameseTones(phong.TenPhong)}`,
            quantity: 1,
            price: depositAmount,
          },
        ],
        cancelUrl,
        returnUrl,
        expiredAt,
        signature,
      };

      const payosRes = await fetch(PAYOS_BASE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-client-id": credentials.clientId,
          "x-api-key": credentials.apiKey,
        },
        body: JSON.stringify(payosPayload),
      });

      const payosJson = await payosRes.json();

      if (!payosRes.ok || payosJson.code !== "00" || !payosJson.data) {
        await cancelBookingAndReleaseRoom(
          maDP,
          phong.MaPhong,
          `Lỗi khởi tạo mã QR PayOS: ${payosJson.desc || payosRes.status}`,
        );
        return res.status(502).json({
          success: false,
          message:
            payosJson.desc || "Không thể khởi tạo mã thanh toán PayOS VietQR.",
        });
      }

      const bookingCreated = await DatPhongModel.getById(maDP);

      return res.status(201).json({
        success: true,
        message: `Tạo yêu cầu đặt cọc 15% (${formatVND(depositAmount)}) thành công. Vui lòng chuyển đúng số tiền trong 15 phút.`,
        data: {
          maDP,
          maTraCuu,
          tokenTraCuu,
          orderCode,
          soTienCoc: depositAmount,
          tyLeCoc: 15,
          giaPhong,
          thoiGianHetHanQR: bookingCreated?.ThoiGianHetHanQR,
          phong: {
            MaPhong: phong.MaPhong,
            TenPhong: phong.TenPhong,
            TenKhu: phong.TenKhu,
            DiaChi: phong.DiaChi,
            Gia: giaPhong,
          },
          payos: {
            checkoutUrl: payosJson.data.checkoutUrl,
            qrCode: payosJson.data.qrCode,
            accountNumber: payosJson.data.accountNumber,
            accountName: payosJson.data.accountName,
            bin: payosJson.data.bin,
            amount: payosJson.data.amount,
            description: payosJson.data.description,
            expiredAt,
          },
        },
      });
    } catch (error) {
      console.error("Lỗi taoYeuCauDatCoc:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi máy chủ khi tạo yêu cầu đặt cọc giữ phòng.",
      });
    }
  },

  // -----------------------------------------------------------------------
  // 2. [GET] /api/dat-phong/kiem-tra-payos/:orderCode (Public - Polling 3s)
  // Kiểm tra trạng thái & đối chiếu chính xác số tiền thực chuyển
  // -----------------------------------------------------------------------
  kiemTraThanhToanPayOS: async (req, res) => {
    try {
      const orderCode = Number(req.params.orderCode);
      if (!orderCode) {
        return res.status(400).json({
          success: false,
          message: "Mã giao dịch orderCode không hợp lệ.",
        });
      }

      const booking = await DatPhongModel.getByOrderCode(orderCode);
      if (!booking) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy đơn đặt cọc tương ứng.",
        });
      }

      if (booking.TrangThai !== "ChoThanhToan") {
        const isPaid = [
          "DaDatCoc",
          "DaHoanCoc_ChotThue",
          "DaHoanCoc_KhongThue",
          "QuaHanMatCoc",
          "TrungLapCanHoan",
        ].includes(booking.TrangThai);

        return res.status(200).json({
          success: true,
          data: {
            paid: isPaid,
            trangThai: booking.TrangThai,
            maTraCuu: booking.MaTraCuu,
            tokenTraCuu: isPaid ? booking.TokenTraCuu : undefined,
            thoiGianThanhToan: booking.ThoiGianThanhToan,
            thoiGianHetHanGiu: booking.ThoiGianHetHanGiu,
            expectedAmount: Number(booking.SoTienCoc) || 0,
            paidAmount: isPaid ? Number(booking.SoTienCoc) || 0 : 0,
            remainingAmount: 0,
            overpaidAmount: 0,
            amountStatus: isPaid ? "EXACT" : "UNPAID",
            isWrongAmount: false,
            warningMessage: null,
          },
        });
      }

      const payosConfig = await DatPhongModel.getPayOSConfig();
      const credentials = resolvePayOSCredentials(payosConfig);
      const payosData = await fetchPayOSPaymentStatus(orderCode, credentials);
      const amountCheck = evaluatePayOSAmount(payosData, booking.SoTienCoc);

      const secondsRemaining =
        booking.SecondsRemainingQR !== null &&
        booking.SecondsRemainingQR !== undefined
          ? Number(booking.SecondsRemainingQR)
          : 900;

      // Trường hợp 1: PayOS xác nhận PAID và đủ tiền (>= 15% quy định)
      if (amountCheck.payosStatus === "PAID" && amountCheck.isSufficient) {
        const io = req.app?.get?.("io") || global.io;
        const result = await DatPhongController.xacNhanThanhToanCocTuDong(
          orderCode,
          io,
          payosData,
        );

        return res.status(200).json({
          success: true,
          message:
            result.outcome === "TrungLapCanHoan"
              ? "Giao dịch đã được ghi nhận nhưng phòng vừa có người đặt trước. Quản lý sẽ hoàn 100% tiền cọc."
              : amountCheck.amountStatus === "OVERPAID"
                ? amountCheck.warningMessage
                : "Thanh toán đặt cọc giữ phòng thành công!",
          data: {
            paid: true,
            trangThai: result.booking.TrangThai,
            maTraCuu: result.booking.MaTraCuu,
            tokenTraCuu: result.booking.TokenTraCuu,
            thoiGianThanhToan: result.booking.ThoiGianThanhToan,
            thoiGianHetHanGiu: result.booking.ThoiGianHetHanGiu,
            emailSent: Boolean(result.emailResult?.sent),
            payosStatus: amountCheck.payosStatus,
            expectedAmount: amountCheck.expectedAmount,
            paidAmount: amountCheck.paidAmount,
            remainingAmount: amountCheck.remainingAmount,
            overpaidAmount: amountCheck.overpaidAmount,
            amountStatus: amountCheck.amountStatus,
            isWrongAmount: amountCheck.isWrongAmount,
            warningMessage: amountCheck.warningMessage,
          },
        });
      }

      const isQrExpired = secondsRemaining <= 0;

      // Trường hợp 2: Quá hạn 15 phút hoặc PayOS đã hủy/hết hạn
      if (
        amountCheck.payosStatus === "CANCELLED" ||
        amountCheck.payosStatus === "EXPIRED" ||
        isQrExpired
      ) {
        const hasPartialPayment = amountCheck.amountStatus === "UNDERPAID";
        const cancelReason = hasPartialPayment
          ? `Quá hạn 15 phút và khách chuyển thiếu tiền (đã nhận ${formatVND(
              amountCheck.paidAmount,
            )} / yêu cầu ${formatVND(amountCheck.expectedAmount)}, thiếu ${formatVND(
              amountCheck.remainingAmount,
            )})`
          : amountCheck.payosStatus === "CANCELLED"
            ? "Đơn thanh toán đã bị hủy trên PayOS"
            : "Tự động hủy do quá 15 phút chưa thanh toán";

        await cancelPayOSPaymentLink(orderCode, cancelReason);
        await cancelBookingAndReleaseRoom(
          booking.MaDP,
          booking.MaPhong,
          cancelReason,
        );

        // Nếu khách đã chuyển thiếu tiền trước khi hết giờ -> báo Quản lý hỗ trợ hoàn lại
        if (hasPartialPayment) {
          const io = req.app?.get?.("io") || global.io;
          await createAndEmitBookingNotification({
            booking,
            tieuDe: `[Hết hạn — Chuyển thiếu tiền cọc] ${booking.TenPhong} - ${booking.MaTraCuu}`,
            noiDung: `Đơn ${booking.MaTraCuu} (khách ${booking.HoTenKhach}, SĐT: ${booking.SDT}) đã hết hạn 15 phút nhưng khách đã chuyển thiếu ${formatVND(
              amountCheck.paidAmount,
            )} / ${formatVND(
              amountCheck.expectedAmount,
            )}. Vui lòng liên hệ khách kiểm tra và hoàn lại số tiền đã chuyển.`,
            dedupKeyword: "Hết hạn — Chuyển thiếu tiền cọc",
            io,
          });
        }

        return res.status(200).json({
          success: true,
          message: hasPartialPayment
            ? `Đơn đã hết hạn 15 phút. Hệ thống ghi nhận bạn đã chuyển thiếu ${formatVND(
                amountCheck.paidAmount,
              )} / ${formatVND(
                amountCheck.expectedAmount,
              )}. Vui lòng liên hệ quản lý cơ sở (${booking.SDTQuanLy || "Ban quản lý"}) để được đối soát hoàn lại.`
            : "Đơn đặt cọc đã hết hạn thanh toán.",
          data: {
            paid: false,
            trangThai: "DaHuy",
            payosStatus: amountCheck.payosStatus,
            secondsRemaining: 0,
            maTraCuu: booking.MaTraCuu,
            expectedAmount: amountCheck.expectedAmount,
            paidAmount: amountCheck.paidAmount,
            remainingAmount: amountCheck.remainingAmount,
            overpaidAmount: amountCheck.overpaidAmount,
            amountStatus: amountCheck.amountStatus,
            isWrongAmount: amountCheck.isWrongAmount,
            warningMessage: hasPartialPayment
              ? `Đơn đã hết hạn thanh toán nhưng hệ thống ghi nhận bạn đã chuyển ${formatVND(
                  amountCheck.paidAmount,
                )} (thiếu ${formatVND(
                  amountCheck.remainingAmount,
                )}). Vui lòng liên hệ quản lý cơ sở để được hỗ trợ hoàn tiền.`
              : null,
          },
        });
      }

      // Trường hợp 3: Đang chờ thanh toán — nếu khách vừa chuyển thiếu tiền -> bắn cảnh báo ngay
      if (amountCheck.amountStatus === "UNDERPAID") {
        const io = req.app?.get?.("io") || global.io;
        await createAndEmitBookingNotification({
          booking,
          tieuDe: `[Chuyển thiếu tiền cọc] ${booking.TenPhong} - ${booking.MaTraCuu}`,
          noiDung: `Khách ${booking.HoTenKhach} (SĐT: ${booking.SDT}) chuyển thiếu tiền cọc phòng ${booking.TenPhong}: mới nhận ${formatVND(
            amountCheck.paidAmount,
          )} / yêu cầu ${formatVND(
            amountCheck.expectedAmount,
          )} (thiếu ${formatVND(amountCheck.remainingAmount)}).`,
          dedupKeyword: "Chuyển thiếu tiền cọc",
          io,
        });
      }

      return res.status(200).json({
        success: true,
        message: amountCheck.warningMessage || undefined,
        data: {
          paid: false,
          trangThai: "ChoThanhToan",
          payosStatus: amountCheck.payosStatus,
          secondsRemaining,
          maTraCuu: booking.MaTraCuu,
          thoiGianHetHanQR: booking.ThoiGianHetHanQR,
          expectedAmount: amountCheck.expectedAmount,
          paidAmount: amountCheck.paidAmount,
          remainingAmount: amountCheck.remainingAmount,
          overpaidAmount: amountCheck.overpaidAmount,
          amountStatus: amountCheck.amountStatus,
          isWrongAmount: amountCheck.isWrongAmount,
          warningMessage: amountCheck.warningMessage,
        },
      });
    } catch (error) {
      console.error("Lỗi kiemTraThanhToanPayOS:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi máy chủ khi kiểm tra trạng thái thanh toán PayOS.",
      });
    }
  },

  // -----------------------------------------------------------------------
  // 3. [POST] /api/dat-phong/huy-het-han/:orderCode (Public - Hết 15 phút)
  // -----------------------------------------------------------------------
  huyDonQuaHanQR: async (req, res) => {
    try {
      const orderCode = Number(req.params.orderCode);
      if (!orderCode) {
        return res.status(400).json({
          success: false,
          message: "Mã giao dịch orderCode không hợp lệ.",
        });
      }

      const booking = await DatPhongModel.getByOrderCode(orderCode);
      if (!booking) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy đơn đặt cọc.",
        });
      }

      if (booking.TrangThai !== "ChoThanhToan") {
        const isPaid = [
          "DaDatCoc",
          "DaHoanCoc_ChotThue",
          "DaHoanCoc_KhongThue",
          "TrungLapCanHoan",
        ].includes(booking.TrangThai);
        return res.status(200).json({
          success: true,
          data: {
            paid: isPaid,
            trangThai: booking.TrangThai,
            maTraCuu: booking.MaTraCuu,
            tokenTraCuu: isPaid ? booking.TokenTraCuu : undefined,
          },
        });
      }

      let amountCheck = null;

      // Kiểm tra lần cuối với PayOS tránh trường hợp khách chuyển ở giây 14:59
      try {
        const payosConfig = await DatPhongModel.getPayOSConfig();
        const credentials = resolvePayOSCredentials(payosConfig);
        const payosData = await fetchPayOSPaymentStatus(orderCode, credentials);
        amountCheck = evaluatePayOSAmount(payosData, booking.SoTienCoc);

        if (amountCheck.payosStatus === "PAID" && amountCheck.isSufficient) {
          const io = req.app?.get?.("io") || global.io;
          const result = await DatPhongController.xacNhanThanhToanCocTuDong(
            orderCode,
            io,
            payosData,
          );
          return res.status(200).json({
            success: true,
            data: {
              paid: true,
              trangThai: result.booking.TrangThai,
              maTraCuu: result.booking.MaTraCuu,
              tokenTraCuu: result.booking.TokenTraCuu,
              expectedAmount: amountCheck.expectedAmount,
              paidAmount: amountCheck.paidAmount,
              overpaidAmount: amountCheck.overpaidAmount,
              amountStatus: amountCheck.amountStatus,
              isWrongAmount: amountCheck.isWrongAmount,
              warningMessage: amountCheck.warningMessage,
            },
          });
        }
      } catch {
        // Bỏ qua lỗi mạng khi kiểm tra PayOS và tiến hành hủy đơn
      }

      const hasPartialPayment = amountCheck?.amountStatus === "UNDERPAID";
      const cancelReason = hasPartialPayment
        ? `Quá hạn 15 phút và khách chuyển thiếu tiền (đã nhận ${formatVND(
            amountCheck.paidAmount,
          )} / yêu cầu ${formatVND(amountCheck.expectedAmount)})`
        : "Tự động hủy do quá 15 phút chưa hoàn tất thanh toán";

      await cancelPayOSPaymentLink(orderCode, cancelReason);
      await cancelBookingAndReleaseRoom(
        booking.MaDP,
        booking.MaPhong,
        cancelReason,
      );

      if (hasPartialPayment) {
        const io = req.app?.get?.("io") || global.io;
        await createAndEmitBookingNotification({
          booking,
          tieuDe: `[Hết hạn — Chuyển thiếu tiền cọc] ${booking.TenPhong} - ${booking.MaTraCuu}`,
          noiDung: `Đơn ${booking.MaTraCuu} (khách ${booking.HoTenKhach}, SĐT: ${booking.SDT}) đã hết hạn 15 phút nhưng khách đã chuyển thiếu ${formatVND(
            amountCheck.paidAmount,
          )} / ${formatVND(
            amountCheck.expectedAmount,
          )}. Vui lòng liên hệ khách kiểm tra và hoàn lại số tiền đã chuyển.`,
          dedupKeyword: "Hết hạn — Chuyển thiếu tiền cọc",
          io,
        });
      }

      return res.status(200).json({
        success: true,
        message: hasPartialPayment
          ? `Đơn đặt cọc đã hủy do quá 15 phút và chuyển thiếu tiền (đã nhận ${formatVND(
              amountCheck.paidAmount,
            )}). Vui lòng liên hệ quản lý cơ sở để được hỗ trợ hoàn tiền.`
          : "Đơn đặt cọc đã hủy do quá 15 phút. Phòng đã trở về trạng thái không có cọc.",
        data: {
          paid: false,
          trangThai: "DaHuy",
          maTraCuu: booking.MaTraCuu,
          expectedAmount: amountCheck?.expectedAmount ?? Number(booking.SoTienCoc),
          paidAmount: amountCheck?.paidAmount ?? 0,
          remainingAmount: amountCheck?.remainingAmount ?? 0,
          amountStatus: amountCheck?.amountStatus ?? "UNPAID",
          isWrongAmount: Boolean(hasPartialPayment),
          warningMessage: hasPartialPayment
            ? `Hệ thống ghi nhận bạn đã chuyển ${formatVND(
                amountCheck.paidAmount,
              )} nhưng còn thiếu ${formatVND(
                amountCheck.remainingAmount,
              )} khi mã QR hết hạn. Vui lòng liên hệ quản lý cơ sở để được đối soát hoàn lại.`
            : null,
        },
      });
    } catch (error) {
      console.error("Lỗi huyDonQuaHanQR:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi máy chủ khi hủy đơn đặt cọc quá hạn.",
      });
    }
  },

  // -----------------------------------------------------------------------
  // 4. [GET] /api/dat-phong/hoa-don/:maTraCuu (Public ?token=... hoặc ?sdt=...)
  // -----------------------------------------------------------------------
  layHoaDonDatCoc: async (req, res) => {
    try {
      const maTraCuu = String(req.params.maTraCuu || "").trim();
      const token = String(req.query.token || "").trim();
      const sdt = String(req.query.sdt || "").trim();

      if (!maTraCuu) {
        return res.status(400).json({
          success: false,
          message: "Thiếu mã tra cứu biên lai.",
        });
      }

      if (!token && !sdt) {
        return res.status(401).json({
          success: false,
          message:
            "Vui lòng cung cấp mã xác thực (token) hoặc số điện thoại đặt phòng để xem biên lai.",
        });
      }

      const booking = await DatPhongModel.getByMaTraCuu(maTraCuu);
      if (!booking) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy biên lai đặt cọc với mã tra cứu này.",
        });
      }

      const isValidToken = token && token === booking.TokenTraCuu;
      const isValidSdt = sdt && sdt === String(booking.SDT || "").trim();

      if (!isValidToken && !isValidSdt) {
        return res.status(403).json({
          success: false,
          message: "Thông tin xác thực biên lai không khớp.",
        });
      }

      const payosConfig = await DatPhongModel.getPayOSConfig();
      const { TokenTraCuu, ...safeBooking } = booking;

      return res.status(200).json({
        success: true,
        data: {
          ...safeBooking,
          SoTienCoc: Number(safeBooking.SoTienCoc) || 0,
          SoTienHoan: Number(safeBooking.SoTienHoan) || 0,
          GiaPhong: Number(safeBooking.GiaPhong) || 0,
          DienTich: Number(safeBooking.DienTich) || 0,
          ThongTinNganHangNhan: payosConfig
            ? {
                TenNganHang: payosConfig.TenNganHang,
                STK: payosConfig.STK,
                ChuTaiKhoan: payosConfig.ChuTaiKhoan,
              }
            : null,
        },
      });
    } catch (error) {
      console.error("Lỗi layHoaDonDatCoc:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi máy chủ khi tải biên lai đặt cọc.",
      });
    }
  },

  // -----------------------------------------------------------------------
  // 5. [GET] /api/dat-phong/quan-ly (ChuTro, QuanLy)
  // -----------------------------------------------------------------------
  layDanhSachQuanLy: async (req, res) => {
    try {
      const user = await getCurrentUserFromDB(req);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Vui lòng đăng nhập để truy cập danh sách đặt phòng.",
        });
      }

      if (!["ChuTro", "QuanLy", "Admin"].includes(String(user.Quyen).trim())) {
        return res.status(403).json({
          success: false,
          message: "Bạn không có quyền xem danh sách đặt cọc giữ phòng.",
        });
      }

      const { allowedRoomIds, allKhu } = await getAccessibleRoomsAndKhu(user);
      const { maKhu, maPhong, trangThai, keyword } = req.query;

      const list = await DatPhongModel.getManagementList({
        allowedRoomIds,
        maKhu,
        maPhong,
        trangThai,
        keyword,
      });

      const thongKe = {
        tongDon: list.length,
        choThanhToan: 0,
        daDatCoc: 0,
        trungLapCanHoan: 0,
        daHoanCoc: 0,
        quaHanMatCoc: 0,
        daHuy: 0,
      };

      const sanitizedList = list.map((item) => {
        if (item.TrangThai === "ChoThanhToan") thongKe.choThanhToan += 1;
        else if (item.TrangThai === "DaDatCoc") thongKe.daDatCoc += 1;
        else if (item.TrangThai === "TrungLapCanHoan")
          thongKe.trungLapCanHoan += 1;
        else if (
          item.TrangThai === "DaHoanCoc_ChotThue" ||
          item.TrangThai === "DaHoanCoc_KhongThue"
        ) {
          thongKe.daHoanCoc += 1;
        } else if (item.TrangThai === "QuaHanMatCoc") thongKe.quaHanMatCoc += 1;
        else if (item.TrangThai === "DaHuy") thongKe.daHuy += 1;

        return {
          ...item,
          SoTienCoc: Number(item.SoTienCoc) || 0,
          SoTienHoan: Number(item.SoTienHoan) || 0,
          GiaPhong: Number(item.GiaPhong) || 0,
          DienTich: Number(item.DienTich) || 0,
        };
      });

      return res.status(200).json({
        success: true,
        data: {
          danhSach: sanitizedList,
          thongKe,
          khuTroList: allKhu,
        },
      });
    } catch (error) {
      console.error("Lỗi layDanhSachQuanLy:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi máy chủ khi tải danh sách đặt cọc giữ phòng.",
      });
    }
  },

  // -----------------------------------------------------------------------
  // 6. [PUT] /api/dat-phong/:maDP/hoan-coc (ChuTro, QuanLy)
  // -----------------------------------------------------------------------
  xacNhanHoanCoc: async (req, res) => {
    try {
      const user = await getCurrentUserFromDB(req);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Vui lòng đăng nhập để thực hiện thao tác này.",
        });
      }

      if (!["ChuTro", "QuanLy", "Admin"].includes(String(user.Quyen).trim())) {
        return res.status(403).json({
          success: false,
          message: "Bạn không có quyền xác nhận hoàn cọc.",
        });
      }

      const maDP = Number(req.params.maDP);
      const { ketQua, phuongThucHoan, ghiChuHoanCoc } = req.body;

      if (!maDP) {
        return res.status(400).json({
          success: false,
          message: "Mã đơn đặt phòng không hợp lệ.",
        });
      }

      if (!["ChotThue", "KhongThue", "TrungLap"].includes(ketQua)) {
        return res.status(400).json({
          success: false,
          message: "ketQua phải là 'ChotThue', 'KhongThue' hoặc 'TrungLap'.",
        });
      }

      if (!["TienMat", "ChuyenKhoan"].includes(phuongThucHoan)) {
        return res.status(400).json({
          success: false,
          message: "phuongThucHoan phải là 'TienMat' hoặc 'ChuyenKhoan'.",
        });
      }

      const existing = await DatPhongModel.getById(maDP);
      if (!existing) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy đơn đặt phòng.",
        });
      }

      const { allowedRoomIds } = await getAccessibleRoomsAndKhu(user);
      if (!allowedRoomIds.includes(Number(existing.MaPhong))) {
        return res.status(403).json({
          success: false,
          message:
            "Bạn chỉ được xử lý đơn đặt cọc thuộc khu trọ mình phụ trách.",
        });
      }

      const result = await DatPhongModel.confirmRefundTransaction({
        maDP,
        ketQua,
        phuongThucHoan,
        ghiChuHoanCoc: ghiChuHoanCoc ? String(ghiChuHoanCoc).trim() : null,
        nguoiXuLy: user.MaND,
      });

      if (result.error === "NOT_FOUND") {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy đơn đặt phòng.",
        });
      }

      if (result.error === "INVALID_STATUS") {
        return res.status(409).json({
          success: false,
          message: result.message,
        });
      }

      const updatedBooking = await DatPhongModel.getById(maDP);
      await dispatchBookingEmail("REFUND", updatedBooking);

      return res.status(200).json({
        success: true,
        message:
          ketQua === "ChotThue"
            ? "Đã xác nhận hoàn cọc và giữ trạng thái phòng để lập hợp đồng thuê."
            : ketQua === "KhongThue"
              ? "Đã xác nhận hoàn cọc và mở lại phòng về trạng thái Trống."
              : "Đã xác nhận hoàn cọc 100% cho đơn trùng lặp.",
        data: {
          ...updatedBooking,
          SoTienCoc: Number(updatedBooking.SoTienCoc) || 0,
          SoTienHoan: Number(updatedBooking.SoTienHoan) || 0,
        },
      });
    } catch (error) {
      console.error("Lỗi xacNhanHoanCoc:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi máy chủ khi xác nhận hoàn cọc.",
      });
    }
  },

  // -----------------------------------------------------------------------
  // 7. [GET] /api/dat-phong/phong/:maPhong (Public)
  // -----------------------------------------------------------------------
  layThongTinPhongDatCoc: async (req, res) => {
    try {
      const maPhong = Number(req.params.maPhong);
      if (!maPhong) {
        return res
          .status(400)
          .json({ success: false, message: "Mã phòng không hợp lệ." });
      }
      const phong = await DatPhongModel.getPhongWithKhuById(maPhong);
      if (!phong) {
        return res
          .status(404)
          .json({ success: false, message: "Không tìm thấy phòng trọ." });
      }
      const gia = Number(phong.Gia) || 0;
      return res.status(200).json({
        success: true,
        data: {
          ...phong,
          Gia: gia,
          DienTich: Number(phong.DienTich) || 0,
          TyLeCoc: 15,
          SoTienCocQuyDinh: calculateFixedDeposit(gia),
        },
      });
    } catch (error) {
      console.error("Lỗi layThongTinPhongDatCoc:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi máy chủ khi tải thông tin phòng.",
      });
    }
  },

  // -----------------------------------------------------------------------
  // 8. [DELETE] /api/dat-phong/:maDP (ChuTro, QuanLy)
  // Chỉ cho phép xóa đơn có TrangThai = 'DaHuy' hoặc 'QuaHanMatCoc'
  // -----------------------------------------------------------------------
  xoaDatPhong: async (req, res) => {
    try {
      const user = await getCurrentUserFromDB(req);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Vui lòng đăng nhập để thực hiện thao tác này.",
        });
      }

      if (!["ChuTro", "QuanLy", "Admin"].includes(String(user.Quyen).trim())) {
        return res.status(403).json({
          success: false,
          message: "Bạn không có quyền xóa đơn đặt cọc.",
        });
      }

      const maDP = Number(req.params.maDP);
      if (!maDP) {
        return res.status(400).json({
          success: false,
          message: "Mã đơn đặt phòng không hợp lệ.",
        });
      }

      const existing = await DatPhongModel.getById(maDP);
      if (!existing) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy đơn đặt cọc cần xóa.",
        });
      }

      const { allowedRoomIds } = await getAccessibleRoomsAndKhu(user);
      if (!allowedRoomIds.includes(Number(existing.MaPhong))) {
        return res.status(403).json({
          success: false,
          message: "Bạn chỉ được xóa đơn đặt cọc thuộc khu trọ mình phụ trách.",
        });
      }

      if (!["DaHuy", "QuaHanMatCoc"].includes(existing.TrangThai)) {
        return res.status(409).json({
          success: false,
          message:
            "Chỉ có thể xóa hóa đơn đặt cọc ở trạng thái Đã hủy hoặc Quá hạn mất cọc.",
        });
      }

      const deleted = await DatPhongModel.deleteExpiredOrCancelledById(maDP);
      if (!deleted) {
        return res.status(409).json({
          success: false,
          message:
            "Không thể xóa đơn đặt cọc này (trạng thái có thể đã thay đổi).",
        });
      }

      return res.status(200).json({
        success: true,
        message: `Đã xóa vĩnh viễn hóa đơn đặt cọc ${existing.MaTraCuu}.`,
      });
    } catch (error) {
      console.error("Lỗi xoaDatPhong:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi máy chủ khi xóa đơn đặt cọc.",
      });
    }
  },
};

module.exports = DatPhongController;