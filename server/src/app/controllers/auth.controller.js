// server/src/app/controllers/auth.controller.js
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const AuthService = require('../../services/auth.service');
const NguoiDungModel = require('../models/nguoiDung.model');
const ThongTinCaNhanModel = require('../models/thongTinCaNhan.model');
const {
  setAuthCookies,
  clearAuthCookies,
  verifyRefreshToken,
  generateAccessToken,
} = require('../../utils/jwt.util');
const { successResponse, errorResponse } = require('../../utils/response.util');
const { encryptAES, decryptAES } = require('../../utils/crypto.util');

const otpStore = new Map();
const STRONG_PASSWORD_REGEX =
  /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]).{8,}$/;

// Giải mã an toàn (nếu dữ liệu trong bảng ThongTinCaNhan đang là chữ thường thì giữ nguyên)
const safeDecrypt = (val) => {
  if (!val) return '';
  try {
    const decrypted = typeof decryptAES === 'function' ? decryptAES(val) : val;
    return decrypted || val;
  } catch {
    return val;
  }
};

// Hàm gửi email OTP qua Brevo Transactional Email API
async function sendResetOtpEmail(toEmail, hoTen, otpCode) {
  const apiKey = (process.env.BREVO_API_KEY || '').trim();
  const senderEmail = (
    process.env.SMTP_EMAIL || 'tuannghia5839@gmail.com'
  ).trim();

  if (!apiKey) {
    throw new Error('Thiếu cấu hình BREVO_API_KEY trong file .env');
  }

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender: {
        name: 'Hệ thống Quản lý Nhà trọ Xóm Trọ',
        email: senderEmail,
      },
      to: [
        {
          email: toEmail,
          name: hoTen || 'Người dùng',
        },
      ],
      subject: 'Mã xác thực OTP khôi phục mật khẩu - Xóm Trọ',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px;">
          <h2 style="color: #0d9488; margin-top: 0;">Khôi phục mật khẩu</h2>
          <p>Xin chào <strong>${hoTen || 'bạn'}</strong>,</p>
          <p>Bạn vừa yêu cầu đặt lại mật khẩu cho tài khoản trên Hệ thống Quản lý Nhà trọ. Mã xác thực OTP của bạn là:</p>
          <div style="background: #f0fdfa; border: 1px dashed #0d9488; padding: 16px; text-align: center; font-size: 28px; font-weight: bold; letter-spacing: 6px; color: #0f766e; border-radius: 8px; margin: 20px 0;">
            ${otpCode}
          </div>
          <p style="color: #6b7280; font-size: 14px;">Mã này có hiệu lực trong vòng <strong>5 phút</strong>. Tuyệt đối không chia sẻ mã này cho bất kỳ ai.</p>
        </div>
      `,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Brevo API error: ${errText}`);
  }
}

const AuthController = {
  // 1. [POST] /api/auth/login
  login: async (req, res, next) => {
    try {
      const taiKhoan = req.body?.TenTK || req.body?.taiKhoan || req.body?.identifier || '';
      const matKhau = req.body?.MatKhau || req.body?.matKhau || req.body?.password || '';

      if (!taiKhoan || !matKhau) {
        return errorResponse(
          res,
          'Vui lòng nhập đầy đủ tài khoản và mật khẩu!',
          400
        );
      }

      const { user, accessToken, refreshToken } = await AuthService.login(
        String(taiKhoan).trim(),
        matKhau
      );

      if (typeof setAuthCookies === 'function') {
        setAuthCookies(res, accessToken, refreshToken);
      }

      return successResponse(res, 'Đăng nhập thành công!', {
        user,
        accessToken,
      });
    } catch (error) {
      next(error);
    }
  },

  // 2. [POST] /api/auth/logout
  logout: async (req, res, next) => {
    try {
      if (typeof clearAuthCookies === 'function') {
        clearAuthCookies(res);
      }
      return successResponse(res, 'Đăng xuất thành công!', null);
    } catch (error) {
      next(error);
    }
  },

  // 3. [POST] /api/auth/refresh-token (hoặc refresh)
  refreshToken: async (req, res, next) => {
    try {
      const token = req.cookies?.refreshToken || req.body?.refreshToken;
      if (!token) {
        return errorResponse(res, 'Không tìm thấy Refresh Token!', 401);
      }

      const decoded =
        typeof verifyRefreshToken === 'function'
          ? verifyRefreshToken(token)
          : null;
      const maND = decoded?.maND || decoded?.MaND;
      if (!maND) {
        return errorResponse(res, 'Phiên đăng nhập không hợp lệ!', 401);
      }

      const user = await AuthService.getCurrentUserProfile(maND);
      const newAccessToken = generateAccessToken({
        maND: user.MaND,
        tenTK: user.TenTK,
        hoTen: user.HoTen,
        quyen: user.Quyen,
      });

      if (typeof setAuthCookies === 'function') {
        setAuthCookies(res, newAccessToken, token);
      }

      return successResponse(res, 'Làm mới phiên đăng nhập thành công!', {
        accessToken: newAccessToken,
        user,
      });
    } catch (error) {
      next(error);
    }
  },

  // Bí danh nếu auth.router.js gọi AuthController.refresh
  refresh: async (req, res, next) => {
    return AuthController.refreshToken(req, res, next);
  },

  // 4. [GET] /api/auth/me
  getMe: async (req, res, next) => {
    try {
      const maND = req.user?.maND || req.user?.MaND;
      const user = await AuthService.getCurrentUserProfile(maND);
      return successResponse(res, 'Lấy thông tin phiên đăng nhập thành công!', {
        user,
      });
    } catch (error) {
      next(error);
    }
  },

  // 5. [GET] /api/auth/profile
  getProfile: async (req, res, next) => {
    try {
      const maND = req.user?.maND || req.user?.MaND;
      const user = await AuthService.getCurrentUserProfile(maND);
      return successResponse(res, 'Lấy thông tin cá nhân thành công!', {
        user,
      });
    } catch (error) {
      next(error);
    }
  },

  // 6. [PUT] /api/auth/profile
  updateProfile: async (req, res, next) => {
    try {
      const maND = req.user?.maND || req.user?.MaND;
      const {
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
      } = req.body;

      if (!HoTen || !SDT) {
        return errorResponse(
          res,
          'Vui lòng nhập đầy đủ Họ tên và Số điện thoại!',
          400
        );
      }

      const currentProfile = await ThongTinCaNhanModel.getByMaND(maND);

      // Kiểm tra trùng Email, SĐT, CCCD trên bảng ThongTinCaNhan
      const duplicate = await ThongTinCaNhanModel.checkDuplicate(maND, {
        Email,
        SDT,
        CCCD,
      });

      if (duplicate) {
        if (
          Email &&
          duplicate.Email &&
          duplicate.Email.toLowerCase() === String(Email).trim().toLowerCase()
        ) {
          return errorResponse(
            res,
            'Địa chỉ Email này đã được sử dụng bởi tài khoản khác!',
            400
          );
        }
        if (SDT && duplicate.SDT === String(SDT).trim()) {
          return errorResponse(
            res,
            'Số điện thoại này đã được đăng ký cho tài khoản khác!',
            400
          );
        }
        if (CCCD && duplicate.CCCD === String(CCCD).trim()) {
          return errorResponse(
            res,
            'Số CCCD này đã tồn tại trên hệ thống!',
            400
          );
        }
      }

      await ThongTinCaNhanModel.upsertByMaND(maND, {
        HoTen: String(HoTen).trim(),
        GioiTinh: GioiTinh || currentProfile?.GioiTinh || 'Nam',
        NamSinh: NamSinh ? Number(NamSinh) : currentProfile?.NamSinh || null,
        CCCD: CCCD !== undefined ? String(CCCD).trim() : currentProfile?.CCCD || null,
        NgayCap: NgayCap !== undefined ? NgayCap : currentProfile?.NgayCap || null,
        NoiCap:
          NoiCap !== undefined
            ? String(NoiCap).trim()
            : currentProfile?.NoiCap || 'Cục Cảnh sát QLHC về TTXH',
        SDT: String(SDT).trim(),
        Email:
          Email !== undefined ? String(Email).trim() : currentProfile?.Email || null,
        DiaChi:
          DiaChi !== undefined ? String(DiaChi).trim() : currentProfile?.DiaChi || null,
        NgheNghiep:
          NgheNghiep !== undefined
            ? String(NgheNghiep).trim()
            : currentProfile?.NgheNghiep || null,
      });

      const updatedUser = await AuthService.getCurrentUserProfile(maND);
      return successResponse(res, 'Cập nhật thông tin cá nhân thành công!', {
        user: updatedUser,
      });
    } catch (error) {
      next(error);
    }
  },

  // 7. [PUT] /api/auth/change-password
  changePassword: async (req, res, next) => {
    try {
      const maND = req.user?.maND || req.user?.MaND;
      const { matKhauCu, matKhauMoi } = req.body;

      if (!matKhauCu || !matKhauMoi) {
        return errorResponse(
          res,
          'Vui lòng nhập đầy đủ mật khẩu hiện tại và mật khẩu mới!',
          400
        );
      }

      await AuthService.changePassword(maND, matKhauCu, matKhauMoi);
      return successResponse(res, 'Đổi mật khẩu thành công!', null);
    } catch (error) {
      next(error);
    }
  },

  // 8. [POST] /api/auth/forgot-password/send-otp
  sendForgotPasswordOtp: async (req, res) => {
    try {
      const email = String(req.body?.email || '')
        .trim()
        .toLowerCase();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return errorResponse(res, 'Vui lòng nhập địa chỉ Email hợp lệ!', 400);
      }

      // Tìm trong bảng ThongTinCaNhan hoặc NguoiDung (nếu TenTK là email)
      let profile = await ThongTinCaNhanModel.findByEmailOrSDT(email);
      let account = null;

      if (profile) {
        account = await NguoiDungModel.findById(profile.MaND);
      } else {
        account = await NguoiDungModel.findByTenTK(email);
        if (account) {
          profile = await ThongTinCaNhanModel.getByMaND(account.MaND);
        }
      }

      if (!account) {
        return errorResponse(
          res,
          'Email này chưa được đăng ký trong hệ thống!',
          404
        );
      }

      const otpCode = String(crypto.randomInt(100000, 999999));
      const otpHash = crypto.createHash('sha256').update(otpCode).digest('hex');

      otpStore.set(email, {
        maND: account.MaND,
        otpHash,
        expiresAt: Date.now() + 5 * 60 * 1000,
        attempts: 0,
        verified: false,
      });

      const targetEmail = profile?.Email || email;
      const hoTen = profile?.HoTen || account.TenTK;

      await sendResetOtpEmail(targetEmail, hoTen, otpCode);

      return successResponse(
        res,
        'Mã xác thực gồm 6 chữ số đã được gửi đến Email của bạn!'
      );
    } catch (error) {
      console.error('[ForgotPassword Send OTP Error]:', error.message || error);
      return errorResponse(
        res,
        'Không thể gửi email xác thực lúc này. Vui lòng kiểm tra lại cấu hình email!',
        500
      );
    }
  },

  // 9. [POST] /api/auth/forgot-password/verify-otp
  verifyForgotPasswordOtp: async (req, res) => {
    try {
      const email = String(req.body?.email || '')
        .trim()
        .toLowerCase();
      const otp = String(req.body?.otp || '').trim();

      const record = otpStore.get(email);
      if (!record || Date.now() > record.expiresAt) {
        otpStore.delete(email);
        return errorResponse(
          res,
          'Mã xác thực đã hết hạn hoặc không tồn tại. Vui lòng lấy mã mới!',
          400
        );
      }

      if (record.attempts >= 5) {
        otpStore.delete(email);
        return errorResponse(
          res,
          'Bạn đã nhập sai quá 5 lần. Vui lòng yêu cầu gửi lại mã mới!',
          400
        );
      }

      const inputHash = crypto.createHash('sha256').update(otp).digest('hex');
      if (inputHash !== record.otpHash) {
        record.attempts += 1;
        return errorResponse(res, 'Mã xác thực không chính xác!', 400);
      }

      record.verified = true;
      otpStore.set(email, record);

      return successResponse(res, 'Xác thực mã OTP thành công!');
    } catch (error) {
      console.error(
        '[ForgotPassword Verify OTP Error]:',
        error.message || error
      );
      return errorResponse(res, 'Không thể xác thực mã lúc này!', 400);
    }
  },

  // 10. [POST] /api/auth/forgot-password/reset
  resetPasswordWithOtp: async (req, res) => {
    try {
      const email = String(req.body?.email || '')
        .trim()
        .toLowerCase();
      const otp = String(req.body?.otp || '').trim();
      const matKhauMoi = String(req.body?.matKhauMoi || '');

      const record = otpStore.get(email);
      if (!record || !record.verified || Date.now() > record.expiresAt) {
        otpStore.delete(email);
        return errorResponse(
          res,
          'Phiên khôi phục mật khẩu đã hết hạn. Vui lòng thực hiện lại!',
          400
        );
      }

      const inputHash = crypto.createHash('sha256').update(otp).digest('hex');
      if (inputHash !== record.otpHash) {
        return errorResponse(res, 'Mã xác thực không hợp lệ!', 400);
      }

      if (!STRONG_PASSWORD_REGEX.test(matKhauMoi)) {
        return errorResponse(
          res,
          'Mật khẩu mới phải có ít nhất 8 ký tự, bao gồm chữ in hoa, chữ số và ký tự đặc biệt!',
          400
        );
      }

      const user = await NguoiDungModel.findById(record.maND);
      if (!user) {
        return errorResponse(res, 'Không tìm thấy tài khoản người dùng!', 404);
      }

      if (user.MatKhau) {
        const isSameAsOld = user.MatKhau.startsWith('$2')
          ? await bcrypt.compare(matKhauMoi, user.MatKhau)
          : matKhauMoi === user.MatKhau;

        if (isSameAsOld) {
          return errorResponse(
            res,
            'Mật khẩu mới phải khác với mật khẩu đang sử dụng!',
            400
          );
        }
      }

      const salt = await bcrypt.genSalt(10);
      const hashedNewPass = await bcrypt.hash(matKhauMoi, salt);
      await NguoiDungModel.updatePassword(record.maND, hashedNewPass);

      otpStore.delete(email);

      return successResponse(res, 'Cập nhật mật khẩu mới thành công!');
    } catch (error) {
      console.error('[ForgotPassword Reset Error]:', error.message || error);
      return errorResponse(
        res,
        'Không thể đặt lại mật khẩu lúc này, vui lòng thử lại sau!',
        400
      );
    }
  },
};

module.exports = AuthController;