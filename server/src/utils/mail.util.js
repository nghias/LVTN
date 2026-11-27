// server/src/utils/mail.util.js
const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

function escapeHtml(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatVND(amount) {
  return `${Math.round(Number(amount || 0)).toLocaleString("vi-VN")}đ`;
}

function formatDateTimeVN(raw) {
  if (!raw) return "—";

  // Chuỗi DATETIME MySQL (YYYY-MM-DD HH:mm:ss) không kèm múi giờ -> hiển thị trực tiếp tránh lệch +7h trên server UTC
  if (typeof raw === "string") {
    const match = raw
      .trim()
      .match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
    if (match && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(raw)) {
      const [, yyyy, mm, dd, hh, min] = match;
      return `${hh}:${min} ${dd}/${mm}/${yyyy}`;
    }
  }

  const parsed = raw instanceof Date ? raw : new Date(raw);
  if (Number.isNaN(parsed.getTime())) return String(raw);

  return parsed.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
  });
}

/**
 * Khung HTML chuẩn hỗ trợ cả Light Mode & Dark Mode (Gmail Android/iOS, Apple Mail, Outlook)
 */
function wrapEmailDocument({
  title = "Hệ Thống Quản Lý Xóm Trọ",
  maxWidth = 620,
  borderColor = "#e2e8f0",
  headerBg = "#0f766e",
  accentBorder = "#00FFCC",
  eyebrow = "HỆ THỐNG NHÀ TRỌ XÓM TRỌ",
  eyebrowColor = "#ccfbf1",
  heading = "",
  headerAlign = "left",
  bodyHtml = "",
}) {
  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light dark" />
  <meta name="supported-color-schemes" content="light dark" />
  <title>${escapeHtml(title)}</title>
  <style>
    :root {
      color-scheme: light dark;
      supported-color-schemes: light dark;
    }
    body {
      margin: 0;
      padding: 16px 10px;
      background-color: #f1f5f9;
      font-family: Arial, Helvetica, sans-serif;
      color: #0f172a;
      -webkit-text-size-adjust: 100%;
    }
    @media (prefers-color-scheme: dark) {
      body, .email-outer {
        background-color: #0b1120 !important;
        color: #e2e8f0 !important;
      }
      .email-card {
        background-color: #111827 !important;
        border-color: #334155 !important;
      }
      .email-body {
        background-color: #111827 !important;
        color: #e2e8f0 !important;
      }
      .email-table {
        border-color: #334155 !important;
      }
      .email-cell-label {
        background-color: #1e293b !important;
        color: #94a3b8 !important;
        border-color: #334155 !important;
      }
      .email-cell-val {
        background-color: #111827 !important;
        color: #f1f5f9 !important;
        border-color: #334155 !important;
      }
      .email-muted {
        color: #94a3b8 !important;
      }
      .email-accent-text {
        color: #2dd4bf !important;
      }
      .email-danger-text {
        color: #fb7185 !important;
      }
      .email-total-cell {
        background-color: #132a27 !important;
        color: #f8fafc !important;
        border-color: #14b8a6 !important;
      }
      .email-total-amount {
        background-color: #132a27 !important;
        color: #2dd4bf !important;
        border-color: #14b8a6 !important;
      }
      .email-info-box {
        background-color: #0f2926 !important;
        border-color: #115e59 !important;
        color: #e2e8f0 !important;
      }
      .email-note-box {
        background-color: #1e293b !important;
        color: #cbd5e1 !important;
      }
      .email-danger-box {
        background-color: #2c1218 !important;
        border-color: #881337 !important;
        color: #fecdd3 !important;
      }
      .email-otp-box {
        background-color: #1e293b !important;
        color: #5eead4 !important;
        border-color: #14b8a6 !important;
      }
    }
  </style>
</head>
<body class="email-outer" style="margin: 0; padding: 16px 10px; background-color: #f1f5f9; font-family: Arial, Helvetica, sans-serif; color: #0f172a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="email-outer" style="background-color: #f1f5f9;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="email-card" style="max-width: ${maxWidth}px; margin: 0 auto; background-color: #ffffff; border: 1px solid ${borderColor}; border-radius: 16px; overflow: hidden;">
          <tr>
            <td align="${headerAlign}" style="background-color: ${headerBg}; background-image: linear-gradient(${headerBg}, ${headerBg}); border-bottom: 4px solid ${accentBorder}; padding: 22px 24px; color: #ffffff;">
              ${
                eyebrow
                  ? `<p style="margin: 0 0 6px 0; font-size: 11px; font-weight: bold; letter-spacing: 1.2px; text-transform: uppercase; color: ${eyebrowColor};">
                      ${eyebrow}
                    </p>`
                  : ""
              }
              <h2 style="margin: 0; font-size: 19px; line-height: 1.35; font-weight: bold; color: #ffffff;">
                ${heading}
              </h2>
            </td>
          </tr>
          <tr>
            <td class="email-body" style="padding: 24px; background-color: #ffffff; color: #1e293b; font-size: 14px; line-height: 1.6;">
              ${bodyHtml}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Hàm lõi gửi Email giao dịch qua Brevo HTTP API
 */
const sendEmail = async ({ to, toName, subject, html, htmlContent }) => {
  const apiKey = String(
    process.env.BREVO_API_KEY || process.env.SENDINBLUE_API_KEY || "",
  ).trim();
  const senderEmail = String(
    process.env.SMTP_EMAIL ||
      process.env.BREVO_SENDER_EMAIL ||
      process.env.MAIL_FROM ||
      process.env.EMAIL_USER ||
      "",
  ).trim();
  const recipientEmail = String(to || "").trim();
  const content = html || htmlContent;

  if (!apiKey || !senderEmail) {
    console.error("[Mail] Thiếu BREVO_API_KEY hoặc SMTP_EMAIL trong .env!", {
      hasApiKey: Boolean(apiKey),
      hasSenderEmail: Boolean(senderEmail),
    });
    throw new Error(
      "Cấu hình email Brevo chưa hoàn tất (BREVO_API_KEY / SMTP_EMAIL).",
    );
  }

  if (!recipientEmail) {
    throw new Error("Thiếu địa chỉ email người nhận.");
  }

  const response = await fetch(BREVO_API_URL, {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": apiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sender: {
        name: "Hệ Thống Quản Lý Xóm Trọ",
        email: senderEmail,
      },
      to: [{ email: recipientEmail, name: toName || "Khách hàng" }],
      subject,
      htmlContent: content,
    }),
  });

  const responseData = await response.json().catch(() => ({}));

  if (!response.ok) {
    console.error(
      "[Mail] Brevo API từ chối gửi mail:",
      response.status,
      JSON.stringify(responseData),
    );
    throw new Error(
      `Brevo API lỗi (${response.status}): ${responseData.message || response.statusText}`,
    );
  }

  console.log(
    `[Mail] Gửi email thành công tới ${recipientEmail} (messageId: ${responseData.messageId || "OK"})`,
  );
  return responseData;
};

/**
 * 1. Email gửi mã OTP khôi phục mật khẩu
 */
const sendResetOtpEmail = async (toEmail, hoTen, otpCode) => {
  const bodyHtml = `
    <p style="margin-top: 0;">Xin chào <strong>${escapeHtml(hoTen || "bạn")}</strong>,</p>
    <p>Mã xác thực (OTP) để đặt lại mật khẩu tài khoản Xóm Trọ của bạn là:</p>
    <div style="margin: 24px 0; text-align: center;">
      <span class="email-otp-box" style="display: inline-block; padding: 14px 32px; background-color: #f1f5f9; border: 2px dashed #0d9488; border-radius: 12px; font-size: 28px; font-weight: bold; letter-spacing: 6px; color: #0f172a;">
        ${escapeHtml(otpCode)}
      </span>
    </div>
    <p style="margin-bottom: 0;">Mã xác thực có hiệu lực trong vòng <strong>5 phút</strong>.</p>
  `;

  const html = wrapEmailDocument({
    title: "Xóm Trọ - Khôi phục mật khẩu",
    maxWidth: 520,
    headerBg: "#0f766e",
    accentBorder: "#00FFCC",
    eyebrow: "HỆ THỐNG NHÀ TRỌ XÓM TRỌ",
    eyebrowColor: "#99f6e4",
    heading: "XÓM TRỌ - KHÔI PHỤC MẬT KHẨU",
    headerAlign: "center",
    bodyHtml,
  });

  return sendEmail({
    to: toEmail,
    toName: hoTen || "Người dùng",
    subject: `[Xóm Trọ] Mã xác thực khôi phục mật khẩu: ${otpCode}`,
    html,
  });
};

/**
 * 2. Email Biên lai xác nhận đặt cọc giữ phòng thành công
 */
const sendBookingReceiptEmail = async (booking) => {
  const {
    Email,
    HoTenKhach,
    MaTraCuu,
    OrderCode,
    TenPhong,
    TenKhu,
    DiaChiKhu,
    DiaChi,
    NgayHenXem,
    ThoiGianThanhToan,
    ThoiGianHetHanGiu,
    SoTienCoc,
    TenQuanLy,
    SDTQuanLy,
    EmailQuanLy,
    ThongTinNganHangNhan,
    receiptUrl,
  } = booking;

  const diaChiHienThi = DiaChiKhu || DiaChi || "";
  const cleanPhone = String(SDTQuanLy || "").replace(/[^\d]/g, "");

  const bodyHtml = `
    <p style="margin-top: 0;">Xin chào <strong>${escapeHtml(HoTenKhach)}</strong>,</p>
    <p>
      Hệ thống đã ghi nhận bạn chuyển khoản đặt cọc thành công qua PayOS VietQR.
      Phòng <strong>${escapeHtml(TenPhong)} (${escapeHtml(TenKhu)})</strong> hiện đã được khóa giữ chỗ riêng cho bạn.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" class="email-table" style="border-collapse: collapse; margin: 18px 0; border: 1px solid #e2e8f0; font-size: 13px;">
      <tr>
        <td class="email-cell-label" style="padding: 10px 14px; background-color: #f8fafc; color: #64748b; border-bottom: 1px solid #e2e8f0; width: 42%;">Mã tra cứu hóa đơn</td>
        <td class="email-cell-val" style="padding: 10px 14px; font-weight: bold; color: #0f172a; border-bottom: 1px solid #e2e8f0;">${escapeHtml(MaTraCuu)}</td>
      </tr>
      <tr>
        <td class="email-cell-label" style="padding: 10px 14px; background-color: #f8fafc; color: #64748b; border-bottom: 1px solid #e2e8f0;">Mã giao dịch PayOS</td>
        <td class="email-cell-val" style="padding: 10px 14px; font-weight: bold; color: #0f172a; border-bottom: 1px solid #e2e8f0;">${escapeHtml(OrderCode)}</td>
      </tr>
      <tr>
        <td class="email-cell-label" style="padding: 10px 14px; background-color: #f8fafc; color: #64748b; border-bottom: 1px solid #e2e8f0;">Phòng / Cơ sở</td>
        <td class="email-cell-val" style="padding: 10px 14px; font-weight: bold; color: #0f172a; border-bottom: 1px solid #e2e8f0;">
          ${escapeHtml(TenPhong)} — ${escapeHtml(TenKhu)}<br/>
          <span class="email-muted" style="font-weight: normal; color: #475569; font-size: 12px;">${escapeHtml(diaChiHienThi)}</span>
        </td>
      </tr>
      <tr>
        <td class="email-cell-label" style="padding: 10px 14px; background-color: #f8fafc; color: #64748b; border-bottom: 1px solid #e2e8f0;">Ngày hẹn xem phòng</td>
        <td class="email-cell-val email-accent-text" style="padding: 10px 14px; font-weight: bold; color: #0f766e; border-bottom: 1px solid #e2e8f0;">${escapeHtml(formatDateTimeVN(NgayHenXem))}</td>
      </tr>
      <tr>
        <td class="email-cell-label" style="padding: 10px 14px; background-color: #f8fafc; color: #64748b; border-bottom: 1px solid #e2e8f0;">Thời gian thanh toán</td>
        <td class="email-cell-val" style="padding: 10px 14px; color: #0f172a; border-bottom: 1px solid #e2e8f0;">${escapeHtml(formatDateTimeVN(ThoiGianThanhToan))}</td>
      </tr>
      <tr>
        <td class="email-cell-label" style="padding: 10px 14px; background-color: #f8fafc; color: #64748b; border-bottom: 1px solid #e2e8f0;">Hạn giữ phòng tối đa</td>
        <td class="email-cell-val email-danger-text" style="padding: 10px 14px; font-weight: bold; color: #be123c; border-bottom: 1px solid #e2e8f0;">${escapeHtml(formatDateTimeVN(ThoiGianHetHanGiu))}</td>
      </tr>
      ${
        ThongTinNganHangNhan
          ? `<tr>
              <td class="email-cell-label" style="padding: 10px 14px; background-color: #f8fafc; color: #64748b; border-bottom: 1px solid #e2e8f0;">Tài khoản nhận cọc</td>
              <td class="email-cell-val" style="padding: 10px 14px; color: #0f172a; border-bottom: 1px solid #e2e8f0;">
                ${escapeHtml(ThongTinNganHangNhan.TenNganHang)} • ${escapeHtml(ThongTinNganHangNhan.STK)} (${escapeHtml(ThongTinNganHangNhan.ChuTaiKhoan)})
              </td>
            </tr>`
          : ""
      }
      <tr>
        <td class="email-total-cell" style="padding: 12px 14px; background-color: #f0fdfa; border-top: 2px solid #0d9488; font-weight: bold; color: #0f172a;">SỐ TIỀN ĐÃ ĐẶT CỌC</td>
        <td class="email-total-amount" style="padding: 12px 14px; background-color: #f0fdfa; border-top: 2px solid #0d9488; font-weight: bold; font-size: 16px; color: #0f766e;">${escapeHtml(formatVND(SoTienCoc))}</td>
      </tr>
    </table>

    <div class="email-info-box" style="background-color: #f0fdfa; border: 1px solid #99f6e4; border-radius: 12px; padding: 14px 16px; margin: 18px 0; font-size: 13px; color: #1e293b;">
      <p class="email-accent-text" style="margin: 0 0 6px 0; font-weight: bold; color: #0f766e; text-transform: uppercase; font-size: 11px;">
        Thông tin liên hệ Quản lý cơ sở để hỗ trợ &amp; giải quyết
      </p>
      <p style="margin: 4px 0;">Quản lý phụ trách: <strong>${escapeHtml(TenQuanLy || "Ban quản lý Xóm Trọ")}</strong></p>
      <p style="margin: 4px 0;">
        Số điện thoại:
        ${
          cleanPhone
            ? `<a href="tel:${escapeHtml(cleanPhone)}" class="email-accent-text" style="color: #0f766e; font-weight: bold; text-decoration: none;">${escapeHtml(SDTQuanLy)}</a>
               &nbsp;|&nbsp; <a href="https://zalo.me/${escapeHtml(cleanPhone)}" target="_blank" style="color: #0284c7; font-weight: bold; text-decoration: none;">Nhắn Zalo</a>`
            : `<strong>${escapeHtml(SDTQuanLy || "Đang cập nhật")}</strong>`
        }
      </p>
      ${
        EmailQuanLy
          ? `<p style="margin: 4px 0;">Email quản lý: <a href="mailto:${escapeHtml(EmailQuanLy)}" class="email-accent-text" style="color: #0f766e; font-weight: bold; text-decoration: none;">${escapeHtml(EmailQuanLy)}</a></p>`
          : ""
      }
    </div>

    <div class="email-note-box" style="background-color: #f8fafc; border-left: 4px solid #0d9488; padding: 12px 14px; font-size: 13px; color: #334155; margin-bottom: 20px;">
      <strong>Lưu ý hoàn cọc 100%:</strong> Khi đến xem phòng đúng hẹn, vui lòng xuất trình mã <strong>${escapeHtml(MaTraCuu)}</strong> để quản lý hoàn lại <strong>100% tiền cọc</strong> (kể cả khi bạn không thuê).
    </div>

    ${
      receiptUrl
        ? `<div style="text-align: center; margin: 22px 0 8px 0;">
            <a href="${escapeHtml(receiptUrl)}" target="_blank" style="display: inline-block; padding: 12px 24px; background-color: #0f766e; background-image: linear-gradient(#0f766e, #0f766e); border: 1px solid #14b8a6; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 14px; border-radius: 10px;">
              <span style="color: #ffffff;">Xem &amp; Tải Hóa Đơn PDF</span>
            </a>
          </div>
          <p class="email-muted" style="text-align: center; font-size: 11px; color: #64748b; word-break: break-all; margin-bottom: 0;">
            Đường dẫn hóa đơn: <a href="${escapeHtml(receiptUrl)}" class="email-accent-text" style="color: #0f766e;">${escapeHtml(receiptUrl)}</a>
          </p>`
        : ""
    }
  `;

  const html = wrapEmailDocument({
    title: `Xác nhận đặt cọc phòng ${TenPhong} - ${MaTraCuu}`,
    maxWidth: 640,
    headerBg: "#0f766e",
    accentBorder: "#00FFCC",
    eyebrow: "HỆ THỐNG NHÀ TRỌ XÓM TRỌ",
    eyebrowColor: "#99f6e4",
    heading: "XÁC NHẬN ĐẶT CỌC GIỮ PHÒNG THÀNH CÔNG",
    bodyHtml,
  });

  return sendEmail({
    to: Email,
    toName: HoTenKhach,
    subject: `[Xóm Trọ] Xác nhận đặt cọc thành công & Hóa đơn phòng ${TenPhong} - ${MaTraCuu}`,
    html,
  });
};

/**
 * 3. Email thông báo trùng lặp giao dịch - Cam kết hoàn 100%
 */
const sendBookingDuplicateEmail = async (booking) => {
  const {
    Email,
    HoTenKhach,
    MaTraCuu,
    OrderCode,
    TenPhong,
    TenKhu,
    SoTienCoc,
    TenQuanLy,
    SDTQuanLy,
    receiptUrl,
  } = booking;

  const bodyHtml = `
    <p style="margin-top: 0;">Xin chào <strong>${escapeHtml(HoTenKhach)}</strong>,</p>
    <p>
      Hệ thống đã ghi nhận khoản chuyển khoản <strong>${escapeHtml(formatVND(SoTienCoc))}</strong>
      (Mã đơn: <strong>${escapeHtml(MaTraCuu)}</strong> • PayOS: <strong>${escapeHtml(OrderCode)}</strong>).
    </p>
    <p>
      Rất tiếc, phòng <strong>${escapeHtml(TenPhong)} (${escapeHtml(TenKhu)})</strong> vừa được một khách hàng khác hoàn tất đặt cọc ngay trước đó vài giây.
    </p>
    <div class="email-danger-box" style="background-color: #fff1f2; border: 1px solid #fecdd3; border-radius: 12px; padding: 14px; margin: 16px 0; font-size: 13px; color: #881337;">
      <strong>Cam kết hoàn tiền 100%:</strong> Quản lý cơ sở <strong>${escapeHtml(TenQuanLy || "Ban quản lý")}</strong> (SĐT: <strong>${escapeHtml(SDTQuanLy || "—")}</strong>) đã nhận được thông báo ưu tiên và sẽ liên hệ hoàn trả lại toàn bộ <strong>${escapeHtml(formatVND(SoTienCoc))}</strong> cho bạn trong thời gian sớm nhất.
    </div>
    ${
      receiptUrl
        ? `<p style="font-size: 13px; margin-bottom: 0;">Theo dõi trạng thái hoàn tiền tại: <a href="${escapeHtml(receiptUrl)}" class="email-danger-text" style="color: #be123c; font-weight: bold;">Xem biên lai ${escapeHtml(MaTraCuu)}</a></p>`
        : ""
    }
  `;

  const html = wrapEmailDocument({
    title: `Thông báo hoàn cọc trùng lặp phòng ${TenPhong}`,
    maxWidth: 600,
    borderColor: "#fecdd3",
    headerBg: "#be123c",
    accentBorder: "#fda4af",
    eyebrow: "THÔNG BÁO GIAO DỊCH TRÙNG LẶP",
    eyebrowColor: "#ffe4e6",
    heading: `HOÀN 100% TIỀN CỌC PHÒNG ${escapeHtml(TenPhong)}`,
    bodyHtml,
  });

  return sendEmail({
    to: Email,
    toName: HoTenKhach,
    subject: `[Xóm Trọ] Thông báo hoàn 100% cọc trùng lặp phòng ${TenPhong} - ${MaTraCuu}`,
    html,
  });
};

/**
 * 4. Email xác nhận đã hoàn trả 100% tiền cọc
 */
const sendBookingRefundEmail = async (booking) => {
  const {
    Email,
    HoTenKhach,
    MaTraCuu,
    TenPhong,
    TenKhu,
    SoTienHoan,
    SoTienCoc,
    PhuongThucHoan,
    ThoiGianHoanCoc,
    GhiChuHoanCoc,
    TrangThai,
    TenNguoiXuLy,
    receiptUrl,
  } = booking;

  const isChotThue = TrangThai === "DaHoanCoc_ChotThue";
  const methodLabel =
    PhuongThucHoan === "ChuyenKhoan"
      ? "Chuyển khoản ngân hàng"
      : "Tiền mặt trực tiếp";

  const bodyHtml = `
    <p style="margin-top: 0;">Xin chào <strong>${escapeHtml(HoTenKhach)}</strong>,</p>
    <p>
      Đơn đặt cọc giữ phòng <strong>${escapeHtml(MaTraCuu)}</strong> cho phòng
      <strong>${escapeHtml(TenPhong)} (${escapeHtml(TenKhu)})</strong> đã được xác nhận hoàn tiền đầy đủ.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" class="email-table" style="border-collapse: collapse; margin: 16px 0; border: 1px solid #e2e8f0; font-size: 13px;">
      <tr>
        <td class="email-cell-label" style="padding: 10px 14px; background-color: #f8fafc; color: #64748b; border-bottom: 1px solid #e2e8f0; width: 42%;">Số tiền đã hoàn</td>
        <td class="email-cell-val email-accent-text" style="padding: 10px 14px; font-weight: bold; color: #047857; font-size: 15px; border-bottom: 1px solid #e2e8f0;">${escapeHtml(formatVND(SoTienHoan || SoTienCoc))}</td>
      </tr>
      <tr>
        <td class="email-cell-label" style="padding: 10px 14px; background-color: #f8fafc; color: #64748b; border-bottom: 1px solid #e2e8f0;">Phương thức hoàn</td>
        <td class="email-cell-val" style="padding: 10px 14px; font-weight: bold; color: #0f172a; border-bottom: 1px solid #e2e8f0;">${escapeHtml(methodLabel)}</td>
      </tr>
      <tr>
        <td class="email-cell-label" style="padding: 10px 14px; background-color: #f8fafc; color: #64748b; border-bottom: 1px solid #e2e8f0;">Thời gian xác nhận</td>
        <td class="email-cell-val" style="padding: 10px 14px; color: #0f172a; border-bottom: 1px solid #e2e8f0;">${escapeHtml(formatDateTimeVN(ThoiGianHoanCoc))}</td>
      </tr>
      <tr>
        <td class="email-cell-label" style="padding: 10px 14px; background-color: #f8fafc; color: #64748b; border-bottom: 1px solid #e2e8f0;">Người xử lý</td>
        <td class="email-cell-val" style="padding: 10px 14px; color: #0f172a; border-bottom: 1px solid #e2e8f0;">${escapeHtml(TenNguoiXuLy || "Ban quản lý Xóm Trọ")}</td>
      </tr>
      <tr>
        <td class="email-cell-label" style="padding: 10px 14px; background-color: #f8fafc; color: #64748b;">Ghi chú</td>
        <td class="email-cell-val" style="padding: 10px 14px; color: #334155;">${escapeHtml(GhiChuHoanCoc || (isChotThue ? "Hoàn cọc giữ chỗ và tiến hành lập hợp đồng thuê." : "Hoàn tất đối soát cọc giữ chỗ."))}</td>
      </tr>
    </table>

    ${
      isChotThue
        ? `<p class="email-accent-text" style="font-size: 13px; color: #0f766e;"><strong>Chào mừng bạn đến với Xóm Trọ!</strong> Phòng ${escapeHtml(TenPhong)} vẫn đang được giữ để quản lý hoàn tất thủ tục lập Hợp đồng thuê cho bạn.</p>`
        : `<p class="email-muted" style="font-size: 13px; color: #475569;">Cảm ơn bạn đã quan tâm đến hệ thống Xóm Trọ. Rất mong có dịp phục vụ bạn trong thời gian tới.</p>`
    }

    ${
      receiptUrl
        ? `<div style="text-align: center; margin-top: 20px;">
            <a href="${escapeHtml(receiptUrl)}" target="_blank" style="display: inline-block; padding: 12px 24px; background-color: #0f766e; background-image: linear-gradient(#0f766e, #0f766e); border: 1px solid #14b8a6; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 13px; border-radius: 10px;">
              <span style="color: #ffffff;">Xem Biên Lai Đã Cập Nhật</span>
            </a>
          </div>`
        : ""
    }
  `;

  const html = wrapEmailDocument({
    title: `Xác nhận hoàn cọc phòng ${TenPhong} - ${MaTraCuu}`,
    maxWidth: 600,
    headerBg: "#0f766e",
    accentBorder: "#00FFCC",
    eyebrow: "HỆ THỐNG NHÀ TRỌ XÓM TRỌ",
    eyebrowColor: "#99f6e4",
    heading: "XÁC NHẬN ĐÃ HOÀN 100% TIỀN CỌC GIỮ PHÒNG",
    bodyHtml,
  });

  return sendEmail({
    to: Email,
    toName: HoTenKhach,
    subject: `[Xóm Trọ] Xác nhận hoàn 100% tiền cọc phòng ${TenPhong} - ${MaTraCuu}`,
    html,
  });
};

/**
 * 5. Email thông báo đơn giữ phòng đã quá hạn (Cron Job kích hoạt)
 */
const sendBookingExpiredEmail = async (booking) => {
  const {
    Email,
    HoTenKhach,
    MaTraCuu,
    TenPhong,
    TenKhu,
    SoTienCoc,
    ThoiGianHetHanGiu,
  } = booking;
  if (!Email) return null;

  const bodyHtml = `
    <p style="margin-top: 0;">Xin chào <strong>${escapeHtml(HoTenKhach)}</strong>,</p>
    <p>
      Đơn đặt cọc giữ chỗ <strong>${escapeHtml(MaTraCuu)}</strong> cho phòng
      <strong>${escapeHtml(TenPhong)} (${escapeHtml(TenKhu)})</strong> đã quá thời hạn giữ phòng
      (<strong>${escapeHtml(formatDateTimeVN(ThoiGianHetHanGiu))}</strong>).
    </p>
    <p>
      Theo quy định đặt cọc giữ chỗ, hệ thống đã tự động chuyển trạng thái đơn sang
      <strong>Quá hạn mất cọc</strong> (${escapeHtml(formatVND(SoTienCoc))}) và mở lại phòng
      <strong>${escapeHtml(TenPhong)}</strong> về trạng thái <strong>Trống</strong>.
    </p>
    <p class="email-muted" style="font-size: 13px; color: #64748b; margin-bottom: 0;">
      Nếu có sự cố nhầm lẫn hoặc bạn đã đến xem phòng trước thời điểm trên, vui lòng liên hệ trực tiếp quản lý cơ sở để được hỗ trợ kiểm tra.
    </p>
  `;

  const html = wrapEmailDocument({
    title: `Thông báo hết hạn giữ phòng ${TenPhong}`,
    maxWidth: 580,
    borderColor: "#cbd5e1",
    headerBg: "#334155",
    accentBorder: "#94a3b8",
    eyebrow: "HỆ THỐNG NHÀ TRỌ XÓM TRỌ",
    eyebrowColor: "#cbd5e1",
    heading: `THÔNG BÁO HẾT HẠN GIỮ PHÒNG ${escapeHtml(TenPhong)}`,
    bodyHtml,
  });

  return sendEmail({
    to: Email,
    toName: HoTenKhach,
    subject: `[Xóm Trọ] Đơn đặt cọc ${MaTraCuu} (${TenPhong}) đã hết hạn giữ chỗ`,
    html,
  });
};

module.exports = {
  sendEmail,
  sendResetOtpEmail,
  sendBookingReceiptEmail,
  sendBookingDuplicateEmail,
  sendBookingRefundEmail,
  sendBookingExpiredEmail,
};