const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const NguoiDungModel = require('../models/nguoiDung.model');
const ThongTinCaNhanModel = require('../models/thongTinCaNhan.model');
const { sendResetOtpEmail } = require('../../utils/mail.util');
const { successResponse, errorResponse } = require('../../utils/response.util');
const { encryptAES, decryptAES } = require('../../utils/crypto.util');

const otpStore = new Map();
const STRONG_PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]).{8,}$/;

// Hàm kiểm tra và làm sạch dữ liệu hồ sơ cá nhân
let validateAndSanitizeProfile;
try {
  ({ validateAndSanitizeProfile } = require('../../utils/validator.util'));
} catch {
  validateAndSanitizeProfile = (body) => ({
    isValid: Boolean(body?.HoTen && body?.SDT),
    message: 'Vui lòng nhập đầy đủ Họ tên và Số điện thoại!',
    cleanData: {
      HoTen: String(body?.HoTen || '').trim(),
      GioiTinh: String(body?.GioiTinh || 'Nam').trim(),
      NamSinh: body?.NamSinh ? Number(body.NamSinh) : null,
      CCCD: String(body?.CCCD || '').trim(),
      NgayCap: body?.NgayCap || null,
      NoiCap: String(body?.NoiCap || 'Cục Cảnh sát QLHC về TTXH').trim(),
      SDT: String(body?.SDT || '').trim(),
      Email: String(body?.Email || '').trim(),
      DiaChi: String(body?.DiaChi || '').trim(),
      NgheNghiep: String(body?.NgheNghiep || '').trim(),
    },
  });
}

// Hàm giải mã và chuẩn hóa dữ liệu hồ sơ cá nhân người dùng trước khi trả về Frontend
function formatUserProfile(user, profile) {
  if (!user) return null;
  return {
    MaND: user.MaND,
    TenTK: user.TenTK,
    Quyen: user.Quyen,
    HoTen: profile?.HoTen || user.HoTen || '',
    GioiTinh: profile?.GioiTinh || user.GioiTinh || 'Nam',
    NamSinh: profile?.NamSinh || user.NamSinh || null,
    CCCD: profile?.CCCD ? decryptAES(profile.CCCD) : (user.CCCD ? decryptAES(user.CCCD) : ''),
    NgayCap: profile?.NgayCap || user.NgayCap || null,
    NoiCap: profile?.NoiCap || user.NoiCap || 'Cục Cảnh sát QLHC về TTXH',
    SDT: profile?.SDT ? decryptAES(profile.SDT) : (user.SDT ? decryptAES(user.SDT) : ''),
    Email: profile?.Email || user.Email || '',
    DiaChi: profile?.DiaChi ? decryptAES(profile.DiaChi) : (user.DiaChi ? decryptAES(user.DiaChi) : ''),
    NgheNghiep: profile?.NgheNghiep || user.NgheNghiep || '',
  };
}

const AuthController = {
  // [POST] /api/auth/login
  login: async (req, res, next) => {
    try {
      const { TenTK, MatKhau } = req.body;

      if (!TenTK || !MatKhau) {
        return errorResponse(res, 'Vui lòng nhập đầy đủ tài khoản và mật khẩu!', 400);
      }

      const AuthService = require('../../services/auth.service');
      const { user, accessToken, refreshToken } = await AuthService.login(
        TenTK.trim(),
        MatKhau
      );

      const { setAuthCookies } = require('../../utils/jwt.util');
      setAuthCookies(res, accessToken, refreshToken);

      return successResponse(res, 'Đăng nhập thành công!', {
        user,
        accessToken,
      });
    } catch (error) {
      next(error);
    }
  },

  // [POST] /api/auth/logout
  logout: async (req, res, next) => {
    try {
      const { clearAuthCookies } = require('../../utils/jwt.util');
      clearAuthCookies(res);
      return successResponse(res, 'Đăng xuất thành công!');
    } catch (error) {
      next(error);
    }
  },

  // [GET] /api/auth/me
  getMe: async (req, res, next) => {
    try {
      const AuthService = require('../../services/auth.service');
      const userProfile = await AuthService.getCurrentUserProfile(req.user.maND);
      return successResponse(res, 'Lấy thông tin tài khoản thành công!', userProfile);
    } catch (error) {
      next(error);
    }
  },

  // [PUT] /api/auth/change-password
  changePassword: async (req, res) => {
    try {
      const maND = req.user.maND;
      const { matKhauCu, matKhauMoi } = req.body;

      if (!matKhauCu || !matKhauMoi) {
        return errorResponse(res, 'Vui lòng nhập đầy đủ mật khẩu hiện tại và mật khẩu mới!', 400);
      }

      if (matKhauCu === matKhauMoi) {
        return errorResponse(res, 'Mật khẩu mới phải khác mật khẩu hiện tại!', 400);
      }

      if (!STRONG_PASSWORD_REGEX.test(matKhauMoi)) {
        return errorResponse(
          res,
          'Mật khẩu mới phải có ít nhất 8 ký tự, bao gồm chữ in hoa, chữ số và ký tự đặc biệt!',
          400
        );
      }

      const user = await NguoiDungModel.findById(maND);
      if (!user) {
        return errorResponse(res, 'Không thể xác thực tài khoản hiện tại!', 400);
      }

      let isCurrentPassValid = false;
      if (user.MatKhau && user.MatKhau.startsWith('$2')) {
        isCurrentPassValid = await bcrypt.compare(matKhauCu, user.MatKhau);
      } else {
        isCurrentPassValid = matKhauCu === user.MatKhau;
      }

      if (!isCurrentPassValid) {
        return errorResponse(res, 'Mật khẩu hiện tại không chính xác!', 400);
      }

      if (user.MatKhau && user.MatKhau.startsWith('$2')) {
        const isSameAsStoredHash = await bcrypt.compare(matKhauMoi, user.MatKhau);
        if (isSameAsStoredHash) {
          return errorResponse(res, 'Mật khẩu mới phải khác mật khẩu hiện tại!', 400);
        }
      }

      const salt = await bcrypt.genSalt(10);
      const hashedNewPassword = await bcrypt.hash(matKhauMoi, salt);

      await NguoiDungModel.updatePassword(maND, hashedNewPassword);

      return successResponse(res, 'Đổi mật khẩu thành công!');
    } catch {
      return errorResponse(res, 'Không thể đổi mật khẩu lúc này, vui lòng thử lại sau!', 400);
    }
  },

  // [GET] /api/auth/profile
  getProfile: async (req, res, next) => {
    try {
      const maND = req.user.maND;
      const user = await NguoiDungModel.findById(maND);

      if (!user) {
        return errorResponse(res, 'Không tìm thấy tài khoản người dùng!', 404);
      }

      const profile = await ThongTinCaNhanModel.getByMaND(maND);

      return successResponse(res, 'Lấy thông tin cá nhân thành công!', {
        user: formatUserProfile(user, profile),
      });
    } catch (error) {
      next(error);
    }
  },

  // [PUT] /api/auth/profile - Cập nhật đầy đủ các trường mới: HoTen, GioiTinh, NamSinh, CCCD, NgayCap, NoiCap, SDT, Email, DiaChi, NgheNghiep
  updateProfile: async (req, res, next) => {
    try {
      const maND = req.user.maND;

      const validation = validateAndSanitizeProfile(req.body);
      if (!validation.isValid) {
        return errorResponse(res, validation.message, 400);
      }

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
      } = validation.cleanData;

      const encryptedSDT = typeof encryptAES === 'function' ? encryptAES(SDT) : SDT;
      const encryptedCCCD = CCCD && typeof encryptAES === 'function' ? encryptAES(CCCD) : CCCD;
      const encryptedDiaChi = DiaChi && typeof encryptAES === 'function' ? encryptAES(DiaChi) : DiaChi;

      // Kiểm tra trùng lặp thông tin cá nhân (SĐT, CCCD, Email)
      if (typeof ThongTinCaNhanModel.checkDuplicate === 'function') {
        const duplicate = await ThongTinCaNhanModel.checkDuplicate(maND, {
          Email,
          SDT: encryptedSDT,
          CCCD: encryptedCCCD,
        });

        if (duplicate) {
          if (Email && duplicate.Email && duplicate.Email.toLowerCase() === Email.toLowerCase()) {
            return errorResponse(res, 'Địa chỉ Email này đã được sử dụng bởi tài khoản khác!', 400);
          }
          if (duplicate.SDT === encryptedSDT || duplicate.SDT === SDT) {
            return errorResponse(res, 'Số điện thoại này đã được đăng ký cho tài khoản khác!', 400);
          }
          if (CCCD && (duplicate.CCCD === encryptedCCCD || duplicate.CCCD === CCCD)) {
            return errorResponse(res, 'Số CCCD này đã tồn tại trên hệ thống!', 400);
          }
        }
      }

      // Lưu cập nhật vào bảng ThongTinCaNhan bao gồm các trường mới
      await ThongTinCaNhanModel.upsertByMaND(maND, {
        HoTen,
        GioiTinh,
        NamSinh,
        CCCD: encryptedCCCD,
        NgayCap,
        NoiCap,
        SDT: encryptedSDT,
        Email,
        DiaChi: encryptedDiaChi,
        NgheNghiep,
      });

      const updatedUser = await NguoiDungModel.findById(maND);
      const updatedProfile = await ThongTinCaNhanModel.getByMaND(maND);

      return successResponse(res, 'Cập nhật thông tin cá nhân thành công!', {
        user: formatUserProfile(updatedUser, updatedProfile),
      });
    } catch (error) {
      next(error);
    }
  },

  // [POST] /api/auth/forgot-password/send-otp
  sendForgotPasswordOtp: async (req, res) => {
    try {
      const email = String(req.body?.email || '').trim().toLowerCase();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return errorResponse(res, 'Vui lòng nhập địa chỉ Email hợp lệ!', 400);
      }

      const profile = await ThongTinCaNhanModel.findByEmailOrSDT(email);
      let user = null;
      if (profile) {
        user = await NguoiDungModel.findById(profile.MaND);
      }

      if (!user) {
        return errorResponse(res, 'Email này chưa được đăng ký trong hệ thống!', 404);
      }

      const otpCode = String(crypto.randomInt(100000, 999999));
      const otpHash = crypto.createHash('sha256').update(otpCode).digest('hex');

      otpStore.set(email, {
        maND: user.MaND,
        otpHash,
        expiresAt: Date.now() + 5 * 60 * 1000,
        attempts: 0,
        verified: false,
      });

      await sendResetOtpEmail(profile.Email || email, profile.HoTen || 'Người dùng', otpCode);

      return successResponse(res, 'Mã xác thực gồm 6 chữ số đã được gửi đến Email của bạn!');
    } catch (error) {
      console.error('[ForgotPassword Send OTP Error]:', error.message || error);
      return errorResponse(res, 'Không thể gửi email xác thực lúc này. Vui lòng kiểm tra lại cấu hình email!', 500);
    }
  },

  // [POST] /api/auth/forgot-password/verify-otp
  verifyForgotPasswordOtp: async (req, res) => {
    try {
      const email = String(req.body?.email || '').trim().toLowerCase();
      const otp = String(req.body?.otp || '').trim();

      const record = otpStore.get(email);
      if (!record || Date.now() > record.expiresAt) {
        otpStore.delete(email);
        return errorResponse(res, 'Mã xác thực đã hết hạn hoặc không tồn tại. Vui lòng lấy mã mới!', 400);
      }

      if (record.attempts >= 5) {
        otpStore.delete(email);
        return errorResponse(res, 'Bạn đã nhập sai quá 5 lần. Vui lòng yêu cầu gửi lại mã mới!', 400);
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
      console.error('[ForgotPassword Verify OTP Error]:', error.message || error);
      return errorResponse(res, 'Không thể xác thực mã lúc này!', 400);
    }
  },

  // [POST] /api/auth/forgot-password/reset
  resetPasswordWithOtp: async (req, res) => {
    try {
      const email = String(req.body?.email || '').trim().toLowerCase();
      const otp = String(req.body?.otp || '').trim();
      const matKhauMoi = String(req.body?.matKhauMoi || '');

      const record = otpStore.get(email);
      if (!record || !record.verified || Date.now() > record.expiresAt) {
        otpStore.delete(email);
        return errorResponse(res, 'Phiên khôi phục mật khẩu đã hết hạn. Vui lòng thực hiện lại!', 400);
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
          return errorResponse(res, 'Mật khẩu mới phải khác với mật khẩu đang sử dụng!', 400);
        }
      }

      const salt = await bcrypt.genSalt(10);
      const hashedNewPass = await bcrypt.hash(matKhauMoi, salt);
      await NguoiDungModel.updatePassword(record.maND, hashedNewPass);

      otpStore.delete(email);

      return successResponse(res, 'Cập nhật mật khẩu mới thành công!');
    } catch (error) {
      console.error('[ForgotPassword Reset Error]:', error.message || error);
      return errorResponse(res, 'Không thể đặt lại mật khẩu lúc này, vui lòng thử lại sau!', 400);
    }
  },
};

module.exports = AuthController;