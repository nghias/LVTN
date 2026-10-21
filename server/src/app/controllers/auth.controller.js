const AuthService = require('../../services/auth.service');
const { setAuthCookies, clearAuthCookies } = require('../../utils/jwt.util');
const { successResponse, errorResponse } = require('../../utils/response.util');

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

      // Lưu JWT vào HttpOnly Cookie
      setAuthCookies(res, accessToken, refreshToken);

      return successResponse(res, 'Đăng nhập thành công!', {
        user,
        accessToken, // Trả kèm để tiện test trên Postman/Apidog
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

  // [GET] /api/auth/me (Kiểm tra phiên đăng nhập hiện tại khi F5 trang Next.js)
  getMe: async (req, res, next) => {
    try {
      const userProfile = await AuthService.getCurrentUserProfile(req.user.maND);
      return successResponse(res, 'Lấy thông tin tài khoản thành công!', userProfile);
    } catch (error) {
      next(error);
    }
  },

  // [PUT] /api/auth/change-password
  changePassword: async (req, res, next) => {
    try {
      const { matKhauCu, matKhauMoi } = req.body;

      if (!matKhauCu || !matKhauMoi || matKhauMoi.length < 6) {
        return errorResponse(
          res,
          'Vui lòng nhập mật khẩu cũ và mật khẩu mới (tối thiểu 6 ký tự)!',
          400
        );
      }

      await AuthService.changePassword(req.user.maND, matKhauCu, matKhauMoi);
      return successResponse(res, 'Đổi mật khẩu thành công!');
    } catch (error) {
      next(error);
    }
  },
};

module.exports = AuthController;