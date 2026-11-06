import { ApiResponse, LoginPayload, UserProfile } from '@/types/auth.type';

const RAW_ENV_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const API_URL = RAW_ENV_URL.endsWith('/auth')
  ? RAW_ENV_URL
  : `${RAW_ENV_URL.replace(/\/+$/, '')}/auth`;

// 1. Lưu Token vào Cookie của tên miền Frontend (Vercel) để middleware.ts đọc được
function setClientAuthToken(token?: string) {
  if (!token || typeof window === 'undefined') return;

  // Lưu vào localStorage để các service khác (như khachThue.service) dùng chung
  localStorage.setItem('accessToken', token);
  localStorage.setItem('token', token);

  // Gắn vào document.cookie của tên miền hiện tại (thexomtro.vercel.app)
  const isHttps = window.location.protocol === 'https:';
  const maxAge = 7 * 24 * 60 * 60; // 7 ngày
  document.cookie = `accessToken=${token}; path=/; max-age=${maxAge}; SameSite=Lax${
    isHttps ? '; Secure' : ''
  }`;
}

// 2. Xóa Token khỏi Cookie và localStorage khi đăng xuất
function clearClientAuthToken() {
  if (typeof window === 'undefined') return;

  localStorage.removeItem('accessToken');
  localStorage.removeItem('token');
  sessionStorage.removeItem('token');

  document.cookie =
    'accessToken=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  document.cookie =
    'refreshToken=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT';
}

// 3. Lấy Token từ Cookie hoặc localStorage để đính kèm vào Header Authorization
function getClientAuthToken(): string | null {
  if (typeof window === 'undefined') return null;

  const storageToken =
    localStorage.getItem('accessToken') ||
    localStorage.getItem('token') ||
    sessionStorage.getItem('token');

  if (storageToken) return storageToken;

  const match = document.cookie.match(/(?:^|;\s*)accessToken=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function getAuthHeaders(includeJsonContentType = true): HeadersInit {
  const headers: Record<string, string> = {};
  if (includeJsonContentType) {
    headers['Content-Type'] = 'application/json';
  }

  const token = getClientAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

// Hàm đọc JSON an toàn, chặn lỗi "Unexpected token '<', <!DOCTYPE..." khi gặp 404/500
async function parseJsonResponse<T>(
  res: Response,
  defaultErrorMsg: string
): Promise<T> {
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(
      `Không tìm thấy đường dẫn API (${res.status} ${res.statusText})!`
    );
  }

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || defaultErrorMsg);
  }
  return data as T;
}

export const AuthService = {
  // 1. Đăng nhập
  async login(
    payload: LoginPayload
  ): Promise<ApiResponse<{ user: UserProfile; accessToken?: string }>> {
    const res = await fetch(`${API_URL}/login`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result = await parseJsonResponse<
      ApiResponse<{ user: UserProfile; accessToken?: string }>
    >(res, 'Đăng nhập thất bại!');

    // Lưu ngay accessToken vào Cookie của Vercel để vượt qua middleware.ts
    const token =
      result?.data?.accessToken ||
      (result as unknown as { accessToken?: string })?.accessToken;
    if (token) {
      setClientAuthToken(token);
    }

    return result;
  },

  // 2. Đăng xuất
  async logout(): Promise<ApiResponse<null>> {
    try {
      const res = await fetch(`${API_URL}/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: getAuthHeaders(false),
      });

      return await parseJsonResponse<ApiResponse<null>>(
        res,
        'Đăng xuất thất bại!'
      );
    } finally {
      // Luôn xóa sạch Cookie & localStorage ở Frontend dù mạng hay server có lỗi
      clearClientAuthToken();
    }
  },

  // 3. Lấy thông tin phiên đăng nhập hiện tại
  async getMe(): Promise<ApiResponse<{ user: UserProfile }>> {
    const res = await fetch(`${API_URL}/me`, {
      method: 'GET',
      credentials: 'include',
      headers: getAuthHeaders(false),
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
      headers: getAuthHeaders(false),
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
    GioiTinh?: string;
    NgayCap?: string | null;
    NoiCap?: string;
    NgheNghiep?: string;
  }): Promise<ApiResponse<{ user: UserProfile }>> {
    const res = await fetch(`${API_URL}/profile`, {
      method: 'PUT',
      credentials: 'include',
      headers: getAuthHeaders(true),
      body: JSON.stringify(payload),
    });

    return parseJsonResponse<ApiResponse<{ user: UserProfile }>>(
      res,
      'Cập nhật thông tin thất bại!'
    );
  },

  // 6. Đổi mật khẩu tài khoản (/api/auth/change-password)
  async changePassword(payload: {
    matKhauCu: string;
    matKhauMoi: string;
  }): Promise<ApiResponse<null>> {
    let res: Response;
    try {
      res = await fetch(`${API_URL}/change-password`, {
        method: 'PUT',
        credentials: 'include',
        headers: getAuthHeaders(true),
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
  async verifyForgotPasswordOtp(
    email: string,
    otp: string
  ): Promise<ApiResponse<null>> {
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