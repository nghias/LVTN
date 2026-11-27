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
const MIN_DEPOSIT_AMOUNT = Number(process.env.BOOKING_MIN_DEPOSIT || 1000);
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
  // -----------------------------------------------------------------------
  xacNhanThanhToanCocTuDong: async (orderCode, io = null) => {
    const lockKey = String(orderCode);
    if (inFlightConfirmations.has(lockKey)) {
      return inFlightConfirmations.get(lockKey);
    }

    const workPromise = (async () => {
      const txResult = await DatPhongModel.confirmPaymentTransaction(
        orderCode,
        {
          holdHours: HOLD_HOURS,
        },
      );

      if (!txResult.found) {
        return { found: false };
      }

      const booking = await DatPhongModel.getById(txResult.maDP);
      let emailResult = null;

      // Nếu là lần đầu xác nhận thành công -> gửi thông báo nội bộ & Email hóa đơn
      if (!txResult.alreadyProcessed && booking) {
        const isDuplicate = txResult.outcome === "TrungLapCanHoan";

        const tieuDe = isDuplicate
          ? `[Trùng cọc cần hoàn] ${booking.TenPhong} - ${booking.MaTraCuu}`
          : `[Đặt cọc giữ phòng] ${booking.TenPhong} - ${booking.HoTenKhach}`;

        const noiDung = isDuplicate
          ? `Khách ${booking.HoTenKhach} (SĐT: ${booking.SDT}, Email: ${booking.Email}) thanh toán ${formatVND(
              booking.SoTienCoc,
            )} nhưng phòng ${booking.TenPhong} (${booking.TenKhu}) đã được giữ trước đó. Mã đơn: ${
              booking.MaTraCuu
            }. Vui lòng liên hệ hoàn 100% tiền cọc.`
          : `Khách ${booking.HoTenKhach} (SĐT: ${booking.SDT}, Email: ${booking.Email}) đã thanh toán cọc ${formatVND(
              booking.SoTienCoc,
            )} giữ phòng ${booking.TenPhong} (${booking.TenKhu}). Hẹn xem: ${
              booking.NgayHenXem
            }. Mã tra cứu: ${booking.MaTraCuu}.`;

        // 1. Lưu thông báo vào bảng thongbao & nhanthongbao (chống trùng tuyệt đối theo MaTraCuu / OrderCode)
        try {
          const [existingNotiRows] = await db.execute(
            `SELECT MaTB FROM thongbao
             WHERE MaLTB = 6
               AND (
                 NoiDung LIKE ?
                 OR TieuDe LIKE ?
                 OR NoiDung LIKE ?
               )
               AND TieuDe NOT LIKE '%Hết hạn%'
             LIMIT 1`,
            [
              `%${booking.MaTraCuu}%`,
              `%${booking.MaTraCuu}%`,
              `%${booking.OrderCode}%`,
            ],
          );

          if (existingNotiRows.length === 0) {
            const maTB = await DatPhongModel.createInternalNotification({
              maLTB: 6,
              maQuanLyKhu: booking.MaQuanLyKhu,
              tieuDe,
              noiDung,
            });

            const dsNguoiNhan = Array.from(
              new Set([
                1,
                ...(booking.MaQuanLyKhu ? [Number(booking.MaQuanLyKhu)] : []),
              ]),
            );

            emitThongBaoMoi(dsNguoiNhan, {
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
            });
          }
        } catch (notiErr) {
          console.error("[DatPhong] Lỗi tạo thông báo nội bộ:", notiErr.message);
        }

        // 2. Gửi Email hóa đơn kèm thông tin liên hệ quản lý qua Brevo
        emailResult = await dispatchBookingEmail(
          isDuplicate ? "DUPLICATE" : "RECEIPT",
          booking,
        );
      }

      return {
        found: true,
        alreadyProcessed: txResult.alreadyProcessed,
        outcome: txResult.outcome,
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
  // -----------------------------------------------------------------------
  taoYeuCauDatCoc: async (req, res) => {
    try {
      const { MaPhong, HoTenKhach, SDT, Email, NgayHenXem, SoTienCoc, GhiChu } =
        req.body;

      if (
        !MaPhong ||
        !HoTenKhach ||
        !SDT ||
        !Email ||
        !NgayHenXem ||
        !SoTienCoc
      ) {
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

      const depositAmount = Math.round(Number(SoTienCoc));
      const giaPhong = Number(phong.Gia) || 0;
      const effectiveMinDeposit =
        giaPhong > 0
          ? Math.min(MIN_DEPOSIT_AMOUNT, giaPhong)
          : MIN_DEPOSIT_AMOUNT;

      if (
        !Number.isFinite(depositAmount) ||
        depositAmount < effectiveMinDeposit
      ) {
        return res.status(400).json({
          success: false,
          message: `Số tiền đặt cọc tối thiểu là ${formatVND(effectiveMinDeposit)}.`,
        });
      }

      if (giaPhong > 0 && depositAmount > giaPhong) {
        return res.status(400).json({
          success: false,
          message: `Số tiền đặt cọc không được vượt quá giá phòng (${formatVND(giaPhong)}).`,
        });
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
            name: `Dat coc giu phong ${removeVietnameseTones(phong.TenPhong)}`,
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
        message:
          "Tạo yêu cầu đặt cọc thành công. Vui lòng quét mã QR trong 15 phút.",
        data: {
          maDP,
          maTraCuu,
          tokenTraCuu,
          orderCode,
          soTienCoc: depositAmount,
          thoiGianHetHanQR: bookingCreated?.ThoiGianHetHanQR,
          phong: {
            MaPhong: phong.MaPhong,
            TenPhong: phong.TenPhong,
            TenKhu: phong.TenKhu,
            DiaChi: phong.DiaChi,
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
          },
        });
      }

      const payosConfig = await DatPhongModel.getPayOSConfig();
      const credentials = resolvePayOSCredentials(payosConfig);
      const payosData = await fetchPayOSPaymentStatus(orderCode, credentials);
      const payosStatus = String(payosData?.status || "").toUpperCase();

      if (payosStatus === "PAID") {
        const io = req.app?.get?.("io") || global.io;
        const result = await DatPhongController.xacNhanThanhToanCocTuDong(
          orderCode,
          io,
        );
        return res.status(200).json({
          success: true,
          message:
            result.outcome === "TrungLapCanHoan"
              ? "Giao dịch đã được ghi nhận nhưng phòng vừa có người đặt trước. Quản lý sẽ hoàn 100% tiền cọc."
              : "Thanh toán đặt cọc giữ phòng thành công!",
          data: {
            paid: true,
            trangThai: result.booking.TrangThai,
            maTraCuu: result.booking.MaTraCuu,
            tokenTraCuu: result.booking.TokenTraCuu,
            thoiGianThanhToan: result.booking.ThoiGianThanhToan,
            thoiGianHetHanGiu: result.booking.ThoiGianHetHanGiu,
            emailSent: Boolean(result.emailResult?.sent),
          },
        });
      }

      const secondsRemaining =
        booking.SecondsRemainingQR !== null &&
        booking.SecondsRemainingQR !== undefined
          ? Number(booking.SecondsRemainingQR)
          : 900;

      const isQrExpired = secondsRemaining <= 0;

      if (
        payosStatus === "CANCELLED" ||
        payosStatus === "EXPIRED" ||
        isQrExpired
      ) {
        await cancelPayOSPaymentLink(orderCode);
        await cancelBookingAndReleaseRoom(
          booking.MaDP,
          booking.MaPhong,
          payosStatus === "CANCELLED"
            ? "Đơn thanh toán đã bị hủy trên PayOS"
            : "Tự động hủy do quá 15 phút chưa thanh toán",
        );
        return res.status(200).json({
          success: true,
          data: {
            paid: false,
            trangThai: "DaHuy",
            payosStatus,
            secondsRemaining: 0,
            maTraCuu: booking.MaTraCuu,
          },
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          paid: false,
          trangThai: "ChoThanhToan",
          payosStatus,
          secondsRemaining,
          maTraCuu: booking.MaTraCuu,
          thoiGianHetHanQR: booking.ThoiGianHetHanQR,
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

      // Kiểm tra lần cuối với PayOS tránh trường hợp khách chuyển ở giây 14:59
      try {
        const payosConfig = await DatPhongModel.getPayOSConfig();
        const credentials = resolvePayOSCredentials(payosConfig);
        const payosData = await fetchPayOSPaymentStatus(orderCode, credentials);
        if (String(payosData?.status || "").toUpperCase() === "PAID") {
          const io = req.app?.get?.("io") || global.io;
          const result = await DatPhongController.xacNhanThanhToanCocTuDong(
            orderCode,
            io,
          );
          return res.status(200).json({
            success: true,
            data: {
              paid: true,
              trangThai: result.booking.TrangThai,
              maTraCuu: result.booking.MaTraCuu,
              tokenTraCuu: result.booking.TokenTraCuu,
            },
          });
        }
      } catch {
        // Bỏ qua lỗi mạng khi kiểm tra PayOS và tiến hành hủy đơn
      }

      await cancelPayOSPaymentLink(orderCode);
      await cancelBookingAndReleaseRoom(
        booking.MaDP,
        booking.MaPhong,
        "Tự động hủy do quá 15 phút chưa hoàn tất thanh toán",
      );

      return res.status(200).json({
        success: true,
        message:
          "Đơn đặt cọc đã hủy do quá 15 phút. Phòng đã trở về trạng thái không có cọc.",
        data: {
          paid: false,
          trangThai: "DaHuy",
          maTraCuu: booking.MaTraCuu,
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
      return res.status(200).json({
        success: true,
        data: {
          ...phong,
          Gia: Number(phong.Gia) || 0,
          DienTich: Number(phong.DienTich) || 0,
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