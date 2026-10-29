// server/src/services/auth.service.js
const NguoiDungModel = require('../app/models/nguoiDung.model');
const ThongTinCaNhanModel = require('../app/models/thongTinCaNhan.model');
const { comparePassword, hashPassword, decryptAES, encryptAES } = require('../utils/crypto.util');
const { generateAccessToken, generateRefreshToken } = require('../utils/jwt.util');

// Hàm giải mã an toàn (Nếu trong DB đang lưu dạng chữ thường như 0931493785 thì giữ nguyên)
const safeDecrypt = (val) => {
  if (!val) return '';
  try {
    const decrypted = decryptAES ? decryptAES(val) : val;
    return decrypted || val;
  } catch {
    return val;
  }
};

// Hàm ghép thông tin từ bảng NguoiDung và bảng ThongTinCaNhan
const mergeAccountAndProfile = (account, profile) => {
  if (!account) return null;
  return {
    MaND: account.MaND,
    TenTK: account.TenTK,
    Quyen: account.Quyen,
    MaTT: profile?.MaTT || null,
    HoTen: profile?.HoTen || account.TenTK,
    GioiTinh: profile?.GioiTinh || 'Nam',
    NamSinh: profile?.NamSinh || null,
    CCCD: safeDecrypt(profile?.CCCD),
    NgayCap: profile?.NgayCap || null,
    NoiCap: safeDecrypt(profile?.NoiCap) || 'Cục Cảnh sát QLHC về TTXH',
    SDT: safeDecrypt(profile?.SDT),
    Email: profile?.Email || account.TenTK,
    DiaChi: safeDecrypt(profile?.DiaChi),
    NgheNghiep: profile?.NgheNghiep || '',
  };
};

const AuthService = {
  // 1. Xử lý Đăng nhập (Tìm ở NguoiDung theo TenTK, nếu không có thì tìm ở ThongTinCaNhan theo Email/SDT)
  login: async (taiKhoan, matKhau) => {
    const cleanIdentifier = String(taiKhoan).trim();

    // Bước 1: Tìm trong bảng NguoiDung theo TenTK
    let account = await NguoiDungModel.findByLoginIdentifier(cleanIdentifier);
    let profile = null;

    if (account) {
      profile = await ThongTinCaNhanModel.getByMaND(account.MaND);
    } else {
      // Nếu người dùng nhập SĐT hoặc Email phụ trong bảng ThongTinCaNhan
      profile = await ThongTinCaNhanModel.findByEmailOrSDT(cleanIdentifier);
      if (!profile && encryptAES) {
        profile = await ThongTinCaNhanModel.findByEmailOrSDT(encryptAES(cleanIdentifier));
      }
      if (profile) {
        account = await NguoiDungModel.findById(profile.MaND);
      }
    }

    if (!account) {
      const error = new Error('Tài khoản hoặc mật khẩu không chính xác!');
      error.statusCode = 401;
      throw error;
    }

    // Bước 2: Đối chiếu mật khẩu bằng Bcrypt
    const isMatch = await comparePassword(matKhau, account.MatKhau);
    if (!isMatch) {
      const error = new Error('Tài khoản hoặc mật khẩu không chính xác!');
      error.statusCode = 401;
      throw error;
    }

    const userProfile = mergeAccountAndProfile(account, profile);

    // Bước 3: Tạo JWT Token
    const tokenPayload = {
      maND: userProfile.MaND,
      tenTK: userProfile.TenTK,
      hoTen: userProfile.HoTen,
      quyen: userProfile.Quyen,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken({ maND: userProfile.MaND });

    return {
      user: userProfile,
      accessToken,
      refreshToken,
    };
  },

  // 2. Lấy thông tin người dùng hiện tại cho API /api/auth/me và /api/auth/profile
  getCurrentUserProfile: async (maND) => {
    if (!maND) {
      const error = new Error('Không xác định được định danh người dùng!');
      error.statusCode = 401;
      throw error;
    }

    const account = await NguoiDungModel.findById(maND);
    if (!account) {
      const error = new Error('Không tìm thấy tài khoản người dùng!');
      error.statusCode = 404;
      throw error;
    }

    const profile = await ThongTinCaNhanModel.getByMaND(maND);
    return mergeAccountAndProfile(account, profile);
  },

  // 3. Đổi mật khẩu
  changePassword: async (maND, matKhauCu, matKhauMoi) => {
    const account = await NguoiDungModel.findById(maND);
    if (!account) {
      const error = new Error('Người dùng không tồn tại!');
      error.statusCode = 404;
      throw error;
    }

    const isMatch = await comparePassword(matKhauCu, account.MatKhau);
    if (!isMatch) {
      const error = new Error('Mật khẩu hiện tại không chính xác!');
      error.statusCode = 400;
      throw error;
    }

    const isSameAsOld = await comparePassword(matKhauMoi, account.MatKhau);
    if (isSameAsOld) {
      const error = new Error('Mật khẩu mới phải khác mật khẩu hiện tại!');
      error.statusCode = 400;
      throw error;
    }

    const hashedNewPass = await hashPassword(matKhauMoi);
    await NguoiDungModel.updatePassword(maND, hashedNewPass);
    return true;
  },
};

module.exports = AuthService;