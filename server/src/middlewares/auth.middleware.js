const { verifyAccessToken } = require('../utils/jwt.util');
const { errorResponse } = require('../utils/response.util');
const { ROLES } = require('../utils/constants.util');

// 1. Middleware kiểm tra đã đăng nhập hay chưa (Đọc từ HttpOnly Cookie hoặc Header Bearer)
const verifyToken = (req, res, next) => {
  try {
    let token = req.cookies?.accessToken;

    // Hỗ trợ thêm đọc từ Header Authorization (tiện khi test bằng Postman / Apidog)
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return errorResponse(res, 'Vui lòng đăng nhập để tiếp tục!', 401);
    }

    const decoded = verifyAccessToken(token);
    req.user = decoded; // Gắn thông tin (maND, quyen, khuQuanLyIds, maPhongDangThue) vào req
    next();
  } catch (error) {
    return errorResponse(res, 'Phiên đăng nhập đã hết hạn hoặc không hợp lệ!', 401);
  }
};

// 2. Middleware phân quyền theo Vai trò (ChuTro, QuanLy, KhachThue)
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.quyen)) {
      return errorResponse(
        res,
        'Bạn không có quyền truy cập vào chức năng này!',
        403
      );
    }
    next();
  };
};

// 3. Middleware kiểm tra quyền quản lý Khu trọ (Dùng cho các API thao tác theo MaKhu)
// - ChuTro (Nguyễn Thị Quỳnh Dư): Được thao tác trên cả 3 khu trọ.
// - QuanLy (Nghĩa, Nguyên, Nam): Chỉ được thao tác đúng MaKhu mình phụ trách.
const checkKhuTroAccess = (req, res, next) => {
  const { quyen, khuQuanLyIds } = req.user;
  if (quyen === ROLES.CHU_TRO) {
    return next();
  }

  const maKhu = Number(req.params.maKhu || req.body.MaKhu || req.query.maKhu);
  if (quyen === ROLES.QUAN_LY) {
    if (!maKhu || khuQuanLyIds.includes(maKhu)) {
      return next();
    }
    return errorResponse(
      res,
      'Bạn chỉ được phép quản lý khu trọ do mình phụ trách!',
      403
    );
  }

  return errorResponse(res, 'Không đủ quyền thực hiện thao tác này!', 403);
};

module.exports = {
  verifyToken,
  authorizeRoles,
  checkKhuTroAccess,
};