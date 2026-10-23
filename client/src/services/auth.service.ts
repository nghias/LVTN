import { ApiResponse, LoginPayload, UserProfile } from '@/types/auth.type';

const API_URL = process.env.NEXT_PUBLIC_API_URL + '/auth';

// Hàm đọc JSON an toàn, chặn lỗi "Unexpected token '<', <!DOCTYPE..." khi gặp 404/500
async function parseJsonResponse<T>(res: Response, defaultErrorMsg: string): Promise<T> {
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(`Không tìm thấy đường dẫn API (${res.status} ${res.statusText})!`);
  }

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || defaultErrorMsg);
  }
  return data as T;
}

export const AuthService = {
  // 1. Đăng nhập
  async login(payload: LoginPayload): Promise<ApiResponse<{ user: UserProfile }>> {
    const res = await fetch(`${API_URL}/login`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    return parseJsonResponse<ApiResponse<{ user: UserProfile }>>(
      res,
      'Đăng nhập thất bại!'
    );
  },

  // 2. Đăng xuất
  async logout(): Promise<ApiResponse<null>> {
    const res = await fetch(`${API_URL}/logout`, {
      method: 'POST',
      credentials: 'include',
    });

    return parseJsonResponse<ApiResponse<null>>(res, 'Đăng xuất thất bại!');
  },

  // 3. Lấy thông tin phiên đăng nhập hiện tại
  async getMe(): Promise<ApiResponse<{ user: UserProfile }>> {
    const res = await fetch(`${API_URL}/me`, {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
    });

    return parseJsonResponse<ApiResponse<{ user: UserProfile }>>(
      res,
      'Phiên đăng nhập đã hết hạn!'
    );
  },

  // 4. Lấy thông tin cá nhân mới nhất từ Backend (/api/auth/profile)
  async getProfile(): Promise<ApiResponse<{ user: UserProfile }>> {
    const res = await fetch(`${API_URL}/profile`, {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
    });

    return parseJsonResponse<ApiResponse<{ user: UserProfile }>>(
      res,
      'Không thể tải thông tin tài khoản!'
    );
  },

  // 5. Gửi dữ liệu cập nhật thông tin cá nhân về Backend (/api/auth/profile)
  async updateProfile(payload: {
    HoTen: string;
    CCCD: string;
    SDT: string;
    NamSinh: number | null;
    Email: string;
    DiaChi: string;
  }): Promise<ApiResponse<{ user: UserProfile }>> {
    const res = await fetch(`${API_URL}/profile`, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    return parseJsonResponse<ApiResponse<{ user: UserProfile }>>(
      res,
      'Cập nhật thông tin thất bại!'
    );
  },
  // Đổi mật khẩu tài khoản (/api/auth/change-password)
  async changePassword(payload: {
    matKhauCu: string;
    matKhauMoi: string;
  }): Promise<ApiResponse<null>> {
    let res: Response;
    try {
      res = await fetch(`${API_URL}/change-password`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
    } catch {
      throw new Error('Không thể kết nối đến hệ thống, vui lòng thử lại sau!');
    }

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      throw new Error('Không thể thực hiện đổi mật khẩu lúc này!');
    }

    const data = await res.json();
    if (!res.ok || !data.success) {
      // Chỉ hiển thị thông báo nghiệp vụ an toàn (VD: "Mật khẩu hiện tại không chính xác!")
      throw new Error(
        data.message || 'Đổi mật khẩu không thành công, vui lòng kiểm tra lại!'
      );
    }

    return data;
  },
  // 7. Gửi mã OTP khôi phục mật khẩu về Email thật
  async sendForgotPasswordOtp(email: string): Promise<ApiResponse<null>> {
    const res = await fetch(`${API_URL}/forgot-password/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Không thể gửi mã xác thực!');
    }
    return data;
  },

  // 8. Kiểm tra mã OTP người dùng nhập
  async verifyForgotPasswordOtp(email: string, otp: string): Promise<ApiResponse<null>> {
    const res = await fetch(`${API_URL}/forgot-password/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Mã xác thực không chính xác!');
    }
    return data;
  },

  // 9. Đặt lại mật khẩu mới sau khi xác thực OTP đúng
  async resetPasswordWithOtp(payload: {
    email: string;
    otp: string;
    matKhauMoi: string;
  }): Promise<ApiResponse<null>> {
    const res = await fetch(`${API_URL}/forgot-password/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Không thể đặt lại mật khẩu mới!');
    }
    return data;
  },
};