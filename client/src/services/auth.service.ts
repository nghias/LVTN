import { httpRequest } from '../utils/http.util';
import { ApiResponse, LoginPayload, UserProfile } from '../types/auth.type';

export const AuthService = {
  // Gửi yêu cầu đăng nhập
  login: async (payload: LoginPayload) => {
    return httpRequest<ApiResponse<{ user: UserProfile; accessToken?: string }>>(
      '/login',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  },

  // Gửi yêu cầu đăng xuất (Xóa HttpOnly Cookie)
  logout: async () => {
    return httpRequest<ApiResponse<null>>('/logout', {
      method: 'POST',
    });
  },

  // Kiểm tra phiên đăng nhập hiện tại từ Cookie
  getMe: async () => {
    return httpRequest<ApiResponse<UserProfile>>('/me', {
      method: 'GET',
      cache: 'no-store',
    });
  },
};