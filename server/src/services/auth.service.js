const NguoiDungModel = require('../app/models/nguoiDung.model');
const { comparePassword, hashPassword, decryptAES } = require('../utils/crypto.util');
const { generateAccessToken, generateRefreshToken } = require('../utils/jwt.util');
const STRONG_PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]).{8,}$/;

const AuthService = {
  // 1. Xử lý Đăng nhập bằng Bcrypt
  login: async (taiKhoan, matKhau) => {
    const user = await NguoiDungModel.findByLoginIdentifier(taiKhoan);
    if (!user) {
      const error = new Error('Tài khoản hoặc mật khẩu không chính xác!');
      error.statusCode = 401;
      throw error;
    }

    const isMatch = await comparePassword(matKhau, user.MatKhau);
    if (!isMatch) {
      const error = new Error('Tài khoản hoặc mật khẩu không chính xác!');
      error.statusCode = 401;
      throw error;
    }

    const tokenPayload = {
      maND: user.MaND,
      tenTK: user.TenTK,
      hoTen: user.HoTen,
      quyen: user.Quyen,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken({ maND: user.MaND });

    const userProfile = {
      MaND: user.MaND,
      HoTen: user.HoTen,
      CCCD: decryptAES(user.CCCD),
      NamSinh: user.NamSinh,
      SDT: decryptAES(user.SDT),
      Email: user.Email,
      DiaChi: decryptAES(user.DiaChi),
      TenTK: user.TenTK,
      Quyen: user.Quyen,
    };

    return {
      user: userProfile,
      accessToken,
      refreshToken,
    };
  },

  // 2. Lấy thông tin người dùng hiện tại cho API /api/auth/me (Khắc phục lỗi 500)
  getCurrentUserProfile: async (maND) => {
    if (!maND) {
      const error = new Error('Không xác định được định danh người dùng!');
      error.statusCode = 401;
      throw error;
    }

    const user = await NguoiDungModel.findById(maND);
    if (!user) {
      const error = new Error('Không tìm thấy tài khoản người dùng!');
      error.statusCode = 404;
      throw error;
    }

    return {
      MaND: user.MaND,
      HoTen: user.HoTen,
      CCCD: decryptAES(user.CCCD),
      NamSinh: user.NamSinh,
      SDT: decryptAES(user.SDT),
      Email: user.Email,
      DiaChi: decryptAES(user.DiaChi),
      TenTK: user.TenTK,
      Quyen: user.Quyen,
    };
  },
// Bên trong AuthService:
  changePassword: async (maND, matKhauCu, matKhauMoi) => {
    // 1. Kiểm tra mật khẩu mới phải khác mật khẩu hiện tại
    if (matKhauCu === matKhauMoi) {
      const error = new Error('Mật khẩu mới phải khác mật khẩu hiện tại!');
      error.statusCode = 400;
      throw error;
    }

    // 2. Kiểm tra độ mạnh mật khẩu bằng Regex
    if (!STRONG_PASSWORD_REGEX.test(matKhauMoi)) {
      const error = new Error(
        'Mật khẩu mới phải có ít nhất 8 ký tự, bao gồm chữ in hoa, chữ số và ký tự đặc biệt!'
      );
      error.statusCode = 400;
      throw error;
    }

    // 3. Tìm người dùng trong Database
    const user = await NguoiDungModel.findById(maND);
    if (!user) {
      const error = new Error('Người dùng không tồn tại!');
      error.statusCode = 404;
      throw error;
    }

    // 4. Đối chiếu mật khẩu hiện tại
    const isMatch = await comparePassword(matKhauCu, user.MatKhau);
    if (!isMatch) {
      const error = new Error('Mật khẩu hiện tại không chính xác!');
      error.statusCode = 400;
      throw error;
    }

    // 5. Đảm bảo mật khẩu mới không trùng với bản băm hiện tại trong DB
    const isSameAsOldHash = await comparePassword(matKhauMoi, user.MatKhau);
    if (isSameAsOldHash) {
      const error = new Error('Mật khẩu mới phải khác mật khẩu hiện tại!');
      error.statusCode = 400;
      throw error;
    }

    // 6. Mã hóa mật khẩu mới và cập nhật
    const hashedNewPass = await hashPassword(matKhauMoi);
    await NguoiDungModel.updatePassword(maND, hashedNewPass);
    return true;
  },
};

module.exports = AuthService;