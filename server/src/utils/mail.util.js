const sendResetOtpEmail = async (toEmail, hoTen, otpCode) => {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.SMTP_EMAIL;

  // Kiểm tra xem biến môi trường đã được nạp chưa
  if (!apiKey || !senderEmail) {
    console.error('Thiếu BREVO_API_KEY hoặc SMTP_EMAIL trong file .env!');
    throw new Error('Cấu hình email server chưa hoàn tất.');
  }

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
      <div style="background-color: #00FFCC; padding: 18px 24px; text-align: center;">
        <h2 style="margin: 0; color: #0f172a; font-size: 20px;">XÓM TRỌ - KHÔI PHỤC MẬT KHẨU</h2>
      </div>
      <div style="padding: 24px; color: #334155; font-size: 14px; line-height: 1.6;">
        <p>Xin chào <strong>${hoTen || 'bạn'}</strong>,</p>
        <p>Mã xác thực (OTP) để đặt lại mật khẩu tài khoản Xóm Trọ của bạn là:</p>
        <div style="margin: 24px 0; text-align: center;">
          <span style="display: inline-block; padding: 14px 32px; background-color: #f1f5f9; border: 2px dashed #0d9488; border-radius: 12px; font-size: 28px; font-weight: bold; letter-spacing: 6px; color: #0f172a;">
            ${otpCode}
          </span>
        </div>
        <p>Mã xác thực có hiệu lực trong vòng <strong>5 phút</strong>.</p>
      </div>
    </div>
  `;

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'api-key': apiKey.trim(), // .trim() giúp loại bỏ khoảng trắng thừa nếu có trong .env
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender: {
        name: 'Hệ Thống Quản Lý Xóm Trọ',
        email: senderEmail.trim(),
      },
      to: [{ email: toEmail, name: hoTen || 'Người dùng' }],
      subject: `[Xóm Trọ] Mã xác thực khôi phục mật khẩu: ${otpCode}`,
      htmlContent,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('Chi tiết lỗi từ Brevo API:', response.status, errorData);
    throw new Error(`Không thể gửi email qua API: ${errorData.message || response.statusText}`);
  }

  return await response.json();
};

module.exports = { sendResetOtpEmail };