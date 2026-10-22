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
};