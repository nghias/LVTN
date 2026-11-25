// server/src/utils/mail.util.js

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatVND(amount) {
  return `${Math.round(Number(amount || 0)).toLocaleString('vi-VN')}đ`;
}

function formatDateTimeVN(raw) {
  if (!raw) return '—';
  const parsed = new Date(String(raw).replace(' ', 'T'));
  if (Number.isNaN(parsed.getTime())) return String(raw);
  return parsed.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Asia/Ho_Chi_Minh',
  });
}

/**
 * Hàm lõi gửi Email giao dịch qua Brevo HTTP API
 */
const sendEmail = async ({ to, toName, subject, html }) => {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.SMTP_EMAIL;

  if (!apiKey || !senderEmail) {
    console.error('Thiếu BREVO_API_KEY hoặc SMTP_EMAIL trong file .env!');
    throw new Error('Cấu hình email server chưa hoàn tất.');
  }

  const response = await fetch(BREVO_API_URL, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'api-key': apiKey.trim(),
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender: {
        name: 'Hệ Thống Quản Lý Xóm Trọ',
        email: senderEmail.trim(),
      },
      to: [{ email: String(to).trim(), name: toName || 'Khách hàng' }],
      subject,
      htmlContent: html,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('Chi tiết lỗi từ Brevo API:', response.status, errorData);
    throw new Error(
      `Không thể gửi email qua API: ${errorData.message || response.statusText}`
    );
  }

  return await response.json();
};

/**
 * 1. GIỮ NGUYÊN: Email gửi mã OTP khôi phục mật khẩu
 */
const sendResetOtpEmail = async (toEmail, hoTen, otpCode) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; background-color: #ffffff;">
      <div style="background-color: #00FFCC; padding: 18px 24px; text-align: center;">
        <h2 style="margin: 0; color: #0f172a; font-size: 20px;">XÓM TRỌ - KHÔI PHỤC MẬT KHẨU</h2>
      </div>
      <div style="padding: 24px; color: #334155; font-size: 14px; line-height: 1.6;">
        <p>Xin chào <strong>${escapeHtml(hoTen || 'bạn')}</strong>,</p>
        <p>Mã xác thực (OTP) để đặt lại mật khẩu tài khoản Xóm Trọ của bạn là:</p>
        <div style="margin: 24px 0; text-align: center;">
          <span style="display: inline-block; padding: 14px 32px; background-color: #f1f5f9; border: 2px dashed #0d9488; border-radius: 12px; font-size: 28px; font-weight: bold; letter-spacing: 6px; color: #0f172a;">
            ${escapeHtml(otpCode)}
          </span>
        </div>
        <p>Mã xác thực có hiệu lực trong vòng <strong>5 phút</strong>.</p>
      </div>
    </div>
  `;

  return sendEmail({
    to: toEmail,
    toName: hoTen || 'Người dùng',
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

  const cleanPhone = String(SDTQuanLy || '').replace(/[^\d]/g, '');

  const html = `
  <div style="font-family: Arial, Helvetica, sans-serif; max-width: 640px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden; color: #0f172a;">
    <div style="background-color: #0f172a; padding: 22px 24px; color: #ffffff;">
      <p style="margin: 0; font-size: 11px; font-weight: bold; letter-spacing: 1px; color: #00FFCC; text-transform: uppercase;">
        Hệ Thống Nhà Trọ Xóm Trọ
      </p>
      <h2 style="margin: 6px 0 0 0; font-size: 20px;">
        XÁC NHẬN ĐẶT CỌC GIỮ PHÒNG THÀNH CÔNG
      </h2>
    </div>

    <div style="padding: 24px; font-size: 14px; line-height: 1.6;">
      <p style="margin-top: 0;">Xin chào <strong>${escapeHtml(HoTenKhach)}</strong>,</p>
      <p>
        Hệ thống đã ghi nhận bạn chuyển khoản đặt cọc thành công qua PayOS VietQR.
        Phòng <strong>${escapeHtml(TenPhong)} (${escapeHtml(TenKhu)})</strong> hiện đã được khóa giữ chỗ riêng cho bạn.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin: 18px 0; border: 1px solid #e2e8f0; font-size: 13px;">
        <tr>
          <td style="padding: 10px 14px; background: #f8fafc; color: #64748b; border-bottom: 1px solid #e2e8f0; width: 42%;">Mã tra cứu hóa đơn</td>
          <td style="padding: 10px 14px; font-weight: bold; border-bottom: 1px solid #e2e8f0;">${escapeHtml(MaTraCuu)}</td>
        </tr>
        <tr>
          <td style="padding: 10px 14px; background: #f8fafc; color: #64748b; border-bottom: 1px solid #e2e8f0;">Mã giao dịch PayOS</td>
          <td style="padding: 10px 14px; font-weight: bold; border-bottom: 1px solid #e2e8f0;">${escapeHtml(OrderCode)}</td>
        </tr>
        <tr>
          <td style="padding: 10px 14px; background: #f8fafc; color: #64748b; border-bottom: 1px solid #e2e8f0;">Phòng / Cơ sở</td>
          <td style="padding: 10px 14px; font-weight: bold; border-bottom: 1px solid #e2e8f0;">
            ${escapeHtml(TenPhong)} — ${escapeHtml(TenKhu)}<br/>
            <span style="font-weight: normal; color: #475569; font-size: 12px;">${escapeHtml(DiaChiKhu || '')}</span>
          </td>
        </tr>
        <tr>
          <td style="padding: 10px 14px; background: #f8fafc; color: #64748b; border-bottom: 1px solid #e2e8f0;">Ngày hẹn xem phòng</td>
          <td style="padding: 10px 14px; font-weight: bold; color: #0f766e; border-bottom: 1px solid #e2e8f0;">${escapeHtml(formatDateTimeVN(NgayHenXem))}</td>
        </tr>
        <tr>
          <td style="padding: 10px 14px; background: #f8fafc; color: #64748b; border-bottom: 1px solid #e2e8f0;">Thời gian thanh toán</td>
          <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0;">${escapeHtml(formatDateTimeVN(ThoiGianThanhToan))}</td>
        </tr>
        <tr>
          <td style="padding: 10px 14px; background: #f8fafc; color: #64748b; border-bottom: 1px solid #e2e8f0;">Hạn giữ phòng tối đa</td>
          <td style="padding: 10px 14px; font-weight: bold; color: #be123c; border-bottom: 1px solid #e2e8f0;">${escapeHtml(formatDateTimeVN(ThoiGianHetHanGiu))}</td>
        </tr>
        ${
          ThongTinNganHangNhan
            ? `<tr>
                <td style="padding: 10px 14px; background: #f8fafc; color: #64748b; border-bottom: 1px solid #e2e8f0;">Tài khoản nhận cọc</td>
                <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0;">
                  ${escapeHtml(ThongTinNganHangNhan.TenNganHang)} • ${escapeHtml(ThongTinNganHangNhan.STK)} (${escapeHtml(ThongTinNganHangNhan.ChuTaiKhoan)})
                </td>
              </tr>`
            : ''
        }
        <tr style="background-color: #ccfbf1;">
          <td style="padding: 12px 14px; font-weight: bold;">SỐ TIỀN ĐÃ ĐẶT CỌC</td>
          <td style="padding: 12px 14px; font-weight: bold; font-size: 16px; color: #0f766e;">${escapeHtml(formatVND(SoTienCoc))}</td>
        </tr>
      </table>

      <!-- Khối thông tin liên hệ quản lý cơ sở để hỗ trợ / giải quyết -->
      <div style="background-color: #f0fdfa; border: 1px solid #99f6e4; border-radius: 12px; padding: 14px 16px; margin: 18px 0; font-size: 13px;">
        <p style="margin: 0 0 6px 0; font-weight: bold; color: #0f766e; text-transform: uppercase; font-size: 11px;">
          Thông tin liên hệ Quản lý cơ sở để hỗ trợ &amp; giải quyết
        </p>
        <p style="margin: 4px 0;">Quản lý phụ trách: <strong>${escapeHtml(TenQuanLy || 'Ban quản lý Xóm Trọ')}</strong></p>
        <p style="margin: 4px 0;">
          Số điện thoại:
          ${
            cleanPhone
              ? `<a href="tel:${escapeHtml(cleanPhone)}" style="color: #0f172a; font-weight: bold;">${escapeHtml(SDTQuanLy)}</a>
                 &nbsp;|&nbsp; <a href="https://zalo.me/${escapeHtml(cleanPhone)}" target="_blank" style="color: #0068FF; font-weight: bold;">Nhắn Zalo</a>`
              : `<strong>${escapeHtml(SDTQuanLy || 'Đang cập nhật')}</strong>`
          }
        </p>
        ${
          EmailQuanLy
            ? `<p style="margin: 4px 0;">Email quản lý: <a href="mailto:${escapeHtml(EmailQuanLy)}" style="color: #0f766e; font-weight: bold;">${escapeHtml(EmailQuanLy)}</a></p>`
            : ''
        }
      </div>

      <div style="background-color: #f8fafc; border-left: 4px solid #00FFCC; padding: 12px 14px; font-size: 13px; color: #334155; margin-bottom: 20px;">
        <strong>Lưu ý hoàn cọc 100%:</strong> Khi đến xem phòng đúng hẹn, vui lòng xuất trình mã <strong>${escapeHtml(MaTraCuu)}</strong> để quản lý hoàn lại <strong>100% tiền cọc</strong> (kể cả khi bạn không thuê).
      </div>

      ${
        receiptUrl
          ? `<div style="text-align: center; margin: 22px 0 8px 0;">
              <a href="${escapeHtml(receiptUrl)}" target="_blank" style="display: inline-block; padding: 12px 24px; background-color: #00FFCC; color: #0f172a; text-decoration: none; font-weight: bold; font-size: 14px; border-radius: 10px;">
                Xem &amp; Tải Hóa Đơn PDF
              </a>
            </div>
            <p style="text-align: center; font-size: 11px; color: #64748b; word-break: break-all;">
              Đường dẫn hóa đơn: <a href="${escapeHtml(receiptUrl)}" style="color: #0f766e;">${escapeHtml(receiptUrl)}</a>
            </p>`
          : ''
      }
    </div>
  </div>`;

  return sendEmail({
    to: Email,
    toName: HoTenKhach,
    subject: `[Xóm Trọ] Xác nhận đặt cọc thành công & Hóa đơn phòng ${TenPhong} - ${MaTraCuu}`,
    html,
  });
};

/**
 * 3. Email thông báo trùng lặp giao dịch (Race Condition) - Cam kết hoàn 100%
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

  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #fecdd3; border-radius: 16px; overflow: hidden; background-color: #ffffff; color: #1e293b;">
      <div style="background-color: #be123c; padding: 20px 24px; color: #ffffff;">
        <p style="margin: 0; font-size: 11px; font-weight: bold; letter-spacing: 1px; text-transform: uppercase; opacity: 0.9;">
          THÔNG BÁO GIAO DỊCH TRÙNG LẶP
        </p>
        <h2 style="margin: 6px 0 0 0; font-size: 19px;">
          HOÀN 100% TIỀN CỌC PHÒNG ${escapeHtml(TenPhong)}
        </h2>
      </div>

      <div style="padding: 24px; font-size: 14px; line-height: 1.6;">
        <p style="margin-top: 0;">Xin chào <strong>${escapeHtml(HoTenKhach)}</strong>,</p>
        <p>
          Hệ thống đã ghi nhận khoản chuyển khoản <strong>${escapeHtml(formatVND(SoTienCoc))}</strong>
          (Mã đơn: <strong>${escapeHtml(MaTraCuu)}</strong> • PayOS: <strong>${escapeHtml(OrderCode)}</strong>).
        </p>
        <p>
          Rất tiếc, phòng <strong>${escapeHtml(TenPhong)} (${escapeHtml(TenKhu)})</strong> vừa được một khách hàng khác hoàn tất đặt cọc ngay trước đó vài giây.
        </p>
        <div style="background-color: #fff1f2; border: 1px solid #fecdd3; border-radius: 12px; padding: 14px; margin: 16px 0; font-size: 13px; color: #881337;">
          <strong>Cam kết hoàn tiền 100%:</strong> Quản lý cơ sở <strong>${escapeHtml(TenQuanLy || 'Ban quản lý')}</strong> (SĐT: <strong>${escapeHtml(SDTQuanLy || '—')}</strong>) đã nhận được thông báo ưu tiên và sẽ liên hệ hoàn trả lại toàn bộ <strong>${escapeHtml(formatVND(SoTienCoc))}</strong> cho bạn trong thời gian sớm nhất.
        </div>
        ${
          receiptUrl
            ? `<p style="font-size: 13px;">Theo dõi trạng thái hoàn tiền tại: <a href="${escapeHtml(receiptUrl)}" style="color: #be123c; font-weight: bold;">Xem biên lai ${escapeHtml(MaTraCuu)}</a></p>`
            : ''
        }
      </div>
    </div>
  `;

  return sendEmail({
    to: Email,
    toName: HoTenKhach,
    subject: `[Xóm Trọ] Thông báo hoàn 100% cọc trùng lặp phòng ${TenPhong} - ${MaTraCuu}`,
    html,
  });
};

/**
 * 4. Email xác nhận đã hoàn trả 100% tiền cọc (Chốt thuê / Không thuê / Trùng lặp)
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

  const isChotThue = TrangThai === 'DaHoanCoc_ChotThue';
  const methodLabel =
    PhuongThucHoan === 'ChuyenKhoan' ? 'Chuyển khoản ngân hàng' : 'Tiền mặt trực tiếp';

  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; background-color: #ffffff; color: #1e293b;">
      <div style="background-color: #00FFCC; padding: 20px 24px; color: #0f172a;">
        <p style="margin: 0; font-size: 11px; font-weight: bold; letter-spacing: 1px; text-transform: uppercase;">
          HỆ THỐNG NHÀ TRỌ XÓM TRỌ
        </p>
        <h2 style="margin: 6px 0 0 0; font-size: 19px;">
          XÁC NHẬN ĐÃ HOÀN 100% TIỀN CỌC GIỮ PHÒNG
        </h2>
      </div>

      <div style="padding: 24px; font-size: 14px; line-height: 1.6;">
        <p style="margin-top: 0;">Xin chào <strong>${escapeHtml(HoTenKhach)}</strong>,</p>
        <p>
          Đơn đặt cọc giữ phòng <strong>${escapeHtml(MaTraCuu)}</strong> cho phòng
          <strong>${escapeHtml(TenPhong)} (${escapeHtml(TenKhu)})</strong> đã được xác nhận hoàn tiền đầy đủ.
        </p>

        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin: 16px 0; border: 1px solid #e2e8f0; font-size: 13px;">
          <tr>
            <td style="padding: 10px 14px; background-color: #f8fafc; color: #64748b; border-bottom: 1px solid #e2e8f0; width: 42%;">Số tiền đã hoàn</td>
            <td style="padding: 10px 14px; font-weight: bold; color: #047857; font-size: 15px; border-bottom: 1px solid #e2e8f0;">${escapeHtml(formatVND(SoTienHoan || SoTienCoc))}</td>
          </tr>
          <tr>
            <td style="padding: 10px 14px; background-color: #f8fafc; color: #64748b; border-bottom: 1px solid #e2e8f0;">Phương thức hoàn</td>
            <td style="padding: 10px 14px; font-weight: bold; color: #0f172a; border-bottom: 1px solid #e2e8f0;">${escapeHtml(methodLabel)}</td>
          </tr>
          <tr>
            <td style="padding: 10px 14px; background-color: #f8fafc; color: #64748b; border-bottom: 1px solid #e2e8f0;">Thời gian xác nhận</td>
            <td style="padding: 10px 14px; color: #0f172a; border-bottom: 1px solid #e2e8f0;">${escapeHtml(formatDateTimeVN(ThoiGianHoanCoc))}</td>
          </tr>
          <tr>
            <td style="padding: 10px 14px; background-color: #f8fafc; color: #64748b; border-bottom: 1px solid #e2e8f0;">Người xử lý</td>
            <td style="padding: 10px 14px; color: #0f172a; border-bottom: 1px solid #e2e8f0;">${escapeHtml(TenNguoiXuLy || 'Ban quản lý Xóm Trọ')}</td>
          </tr>
          <tr>
            <td style="padding: 10px 14px; background-color: #f8fafc; color: #64748b;">Ghi chú</td>
            <td style="padding: 10px 14px; color: #334155;">${escapeHtml(GhiChuHoanCoc || (isChotThue ? 'Hoàn cọc giữ chỗ và tiến hành lập hợp đồng thuê.' : 'Hoàn tất đối soát cọc giữ chỗ.'))}</td>
          </tr>
        </table>

        ${
          isChotThue
            ? `<p style="font-size: 13px; color: #0f766e;"><strong>Chào mừng bạn đến với Xóm Trọ!</strong> Phòng ${escapeHtml(TenPhong)} vẫn đang được giữ để quản lý hoàn tất thủ tục lập Hợp đồng thuê cho bạn.</p>`
            : `<p style="font-size: 13px; color: #475569;">Cảm ơn bạn đã quan tâm đến hệ thống Xóm Trọ. Rất mong có dịp phục vụ bạn trong thời gian tới.</p>`
        }

        ${
          receiptUrl
            ? `
          <div style="text-align: center; margin-top: 20px;">
            <a href="${escapeHtml(receiptUrl)}" target="_blank" style="display: inline-block; padding: 11px 22px; background-color: #0f172a; color: #00FFCC; text-decoration: none; font-weight: bold; font-size: 13px; border-radius: 10px;">
              Xem Biên Lai Đã Cập Nhật
            </a>
          </div>
        `
            : ''
        }
      </div>
    </div>
  `;

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
  const { Email, HoTenKhach, MaTraCuu, TenPhong, TenKhu, SoTienCoc, ThoiGianHetHanGiu } = booking;
  if (!Email) return null;

  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 580px; margin: 0 auto; border: 1px solid #cbd5e1; border-radius: 16px; overflow: hidden; background-color: #ffffff; color: #1e293b;">
      <div style="background-color: #334155; padding: 20px 24px; color: #ffffff;">
        <p style="margin: 0; font-size: 11px; font-weight: bold; letter-spacing: 1px; text-transform: uppercase; color: #94a3b8;">
          HỆ THỐNG NHÀ TRỌ XÓM TRỌ
        </p>
        <h2 style="margin: 6px 0 0 0; font-size: 18px;">
          THÔNG BÁO HẾT HẠN GIỮ PHÒNG ${escapeHtml(TenPhong)}
        </h2>
      </div>
      <div style="padding: 24px; font-size: 14px; line-height: 1.6;">
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
        <p style="font-size: 13px; color: #64748b;">
          Nếu có sự cố nhầm lẫn hoặc bạn đã đến xem phòng trước thời điểm trên, vui lòng liên hệ trực tiếp quản lý cơ sở để được hỗ trợ kiểm tra.
        </p>
      </div>
    </div>
  `;

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