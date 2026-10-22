const bcrypt = require('bcryptjs');
const AuthService = require('../../services/auth.service');
const NguoiDungModel = require('../models/nguoiDung.model');
const { setAuthCookies, clearAuthCookies } = require('../../utils/jwt.util');
const { successResponse, errorResponse } = require('../../utils/response.util');
const { encryptAES, decryptAES } = require('../../utils/crypto.util');

// Biểu thức chính quy kiểm tra độ mạnh mật khẩu:
// - Ít nhất 8 ký tự
// - Ít nhất 1 chữ cái in hoa (A-Z)
// - Ít nhất 1 chữ số (0-9)
// - Ít nhất 1 ký tự đặc biệt
const STRONG_PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]).{8,}$/;

// Nếu bạn đã có file validator.util.js thì require vào, nếu lỗi thì dùng hàm dự phòng bên dưới
let validateAndSanitizeProfile;
try {
  ({ validateAndSanitizeProfile } = require('../../utils/validator.util'));
} catch {
  validateAndSanitizeProfile = (body) => ({
    isValid: Boolean(body?.HoTen && body?.SDT),
    message: 'Vui lòng nhập đầy đủ Họ tên và Số điện thoại!',
    cleanData: {
      HoTen: String(body?.HoTen || '').trim(),
      CCCD: String(body?.CCCD || '').trim(),
      SDT: String(body?.SDT || '').trim(),
      NamSinh: body?.NamSinh ? Number(body.NamSinh) : null,
      Email: String(body?.Email || '').trim(),
      DiaChi: String(body?.DiaChi || '').trim(),
    },
  });
}

// Hàm giải mã và chuẩn hóa dữ liệu người dùng trước khi trả về Frontend
function formatUserProfile(user) {
  if (!user) return null;
  return {
    MaND: user.MaND,
    HoTen: user.HoTen,
    CCCD: user.CCCD ? decryptAES(user.CCCD) : '',
    NamSinh: user.NamSinh,
    SDT: user.SDT ? decryptAES(user.SDT) : '',
    Email: user.Email || '',
    DiaChi: user.DiaChi ? decryptAES(user.DiaChi) : '',
    TenTK: user.TenTK,
    Quyen: user.Quyen,
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

      const { user, accessToken, refreshToken } = await AuthService.login(
        TenTK.trim(),
        MatKhau
      );

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
      clearAuthCookies(res);
      return successResponse(res, 'Đăng xuất thành công!');
    } catch (error) {
      next(error);
    }
  },

  // [GET] /api/auth/me
  getMe: async (req, res, next) => {
    try {
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

      // 1. Kiểm tra nhập đủ dữ liệu
      if (!matKhauCu || !matKhauMoi) {
        return errorResponse(res, 'Vui lòng nhập đầy đủ mật khẩu hiện tại và mật khẩu mới!', 400);
      }

      // 2. Kiểm tra mật khẩu mới phải khác mật khẩu cũ
      if (matKhauCu === matKhauMoi) {
        return errorResponse(res, 'Mật khẩu mới phải khác mật khẩu hiện tại!', 400);
      }

      // 3. Kiểm tra độ mạnh mật khẩu mới (>= 8 ký tự, có chữ hoa, số, ký tự đặc biệt)
      if (!STRONG_PASSWORD_REGEX.test(matKhauMoi)) {
        return errorResponse(
          res,
          'Mật khẩu mới phải có ít nhất 8 ký tự, bao gồm chữ in hoa, chữ số và ký tự đặc biệt!',
          400
        );
      }

      // 4. Lấy thông tin người dùng từ NguoiDungModel
      const user = await NguoiDungModel.findById(maND);
      if (!user) {
        return errorResponse(res, 'Không thể xác thực tài khoản hiện tại!', 400);
      }

      // 5. Đối chiếu mật khẩu hiện tại với mật khẩu đã mã hóa trong Database
      let isCurrentPassValid = false;
      if (user.MatKhau && user.MatKhau.startsWith('$2')) {
        isCurrentPassValid = await bcrypt.compare(matKhauCu, user.MatKhau);
      } else {
        // Hỗ trợ trường hợp dữ liệu mẫu ban đầu chưa băm Bcrypt
        isCurrentPassValid = matKhauCu === user.MatKhau;
      }

      if (!isCurrentPassValid) {
        return errorResponse(res, 'Mật khẩu hiện tại không chính xác!', 400);
      }

      // 6. Kiểm tra thêm: Đảm bảo mật khẩu mới không trùng với bản băm hiện tại trong DB
      if (user.MatKhau && user.MatKhau.startsWith('$2')) {
        const isSameAsStoredHash = await bcrypt.compare(matKhauMoi, user.MatKhau);
        if (isSameAsStoredHash) {
          return errorResponse(res, 'Mật khẩu mới phải khác mật khẩu hiện tại!', 400);
        }
      }

      // 7. Mã hóa (Hash) mật khẩu mới bằng Bcrypt (Salt rounds = 10) và lưu vào DB
      const salt = await bcrypt.genSalt(10);
      const hashedNewPassword = await bcrypt.hash(matKhauMoi, salt);

      await NguoiDungModel.updatePassword(maND, hashedNewPassword);

      return successResponse(res, 'Đổi mật khẩu thành công!');
    } catch {
      // Không trả mã lỗi hệ thống hay SQL ra ngoài để bảo mật
      return errorResponse(res, 'Không thể đổi mật khẩu lúc này, vui lòng thử lại sau!', 400);
    }
  },

  // [GET] /api/auth/profile - Lấy thông tin cá nhân mới nhất từ Database
  getProfile: async (req, res, next) => {
    try {
      const maND = req.user.maND;
      const user = await NguoiDungModel.findById(maND);

      if (!user) {
        return errorResponse(res, 'Không tìm thấy tài khoản người dùng!', 404);
      }

      return successResponse(res, 'Lấy thông tin cá nhân thành công!', {
        user: formatUserProfile(user),
      });
    } catch (error) {
      next(error);
    }
  },

  // [PUT] /api/auth/profile - Cập nhật thông tin cá nhân vào Database
  updateProfile: async (req, res, next) => {
    try {
      const maND = req.user.maND;

      const validation = validateAndSanitizeProfile(req.body);
      if (!validation.isValid) {
        return errorResponse(res, validation.message, 400);
      }

      const { HoTen, CCCD, SDT, NamSinh, Email, DiaChi } = validation.cleanData;

      const encryptedSDT = typeof encryptAES === 'function' ? encryptAES(SDT) : SDT;
      const encryptedCCCD =
        CCCD && typeof encryptAES === 'function' ? encryptAES(CCCD) : CCCD;
      const encryptedDiaChi =
        DiaChi && typeof encryptAES === 'function' ? encryptAES(DiaChi) : DiaChi;

      if (typeof NguoiDungModel.checkDuplicateProfile === 'function') {
        const duplicate = await NguoiDungModel.checkDuplicateProfile(maND, {
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

      await NguoiDungModel.updateProfile(maND, {
        HoTen,
        CCCD: encryptedCCCD,
        NamSinh,
        SDT: encryptedSDT,
        Email,
        DiaChi: encryptedDiaChi,
      });

      const updatedUser = await NguoiDungModel.findById(maND);

      return successResponse(res, 'Cập nhật thông tin cá nhân thành công!', {
        user: formatUserProfile(updatedUser),
      });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = AuthController;