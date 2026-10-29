// client/src/services/khachThue.service.ts
const getApiBaseUrl = () => {
  const raw = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
  const trimmed = raw.replace(/\/auth\/?$/, '').replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
};

const API_URL = getApiBaseUrl();

export interface KhachThueItem {
  MaND: number;
  TenTK: string;
  Quyen: string;
  MaTT?: number | null;
  HoTen: string;
  GioiTinh?: string | null;
  NamSinh?: number | string | null;
  CCCD?: string | null;
  NgayCap?: string | null;
  NoiCap?: string | null;
  SDT: string;
  Email?: string | null;
  DiaChi?: string | null;
  NgheNghiep?: string | null;
  MaPhong?: number | null;
  TenPhong?: string | null;
  MaKhu?: number | null;
  TenKhu?: string | null;
  MaHDT?: number | null;
  TrangThaiHD?: string | null;
  VaiTro?: string | number | null;
  TamTru?: string | null;
  NgayVao?: string | null;
  NgayDi?: string | null;
}

export interface KhachThuePayload {
  HoTen: string;
  GioiTinh?: string;
  NamSinh?: number | string | null;
  CCCD?: string;
  NgayCap?: string | null;
  NoiCap?: string;
  SDT: string;
  Email?: string;
  DiaChi?: string;
  NgheNghiep?: string;
  TenTK?: string;
  MatKhau?: string;
}

const getAuthHeaders = (): HeadersInit => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (typeof window !== 'undefined') {
    const token =
      localStorage.getItem('token') ||
      localStorage.getItem('accessToken') ||
      sessionStorage.getItem('token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  return headers;
};

export const KhachThueService = {
  getList: async (params?: {
    maKhu?: string | number;
    trangThaiPhong?: string;
    keyword?: string;
  }): Promise<KhachThueItem[]> => {
    const query = new URLSearchParams();
    if (params?.maKhu) query.set('maKhu', String(params.maKhu));
    if (params?.trangThaiPhong) query.set('trangThaiPhong', params.trangThaiPhong);
    if (params?.keyword) query.set('keyword', params.keyword);

    const qs = query.toString();
    const url = `${API_URL}/khach-thue/danh-sach${qs ? `?${qs}` : ''}`;

    const res = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || 'Không thể tải danh sách khách thuê');
    }
    return Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : [];
  },

  getDetail: async (maND: number | string): Promise<KhachThueItem> => {
    const res = await fetch(`${API_URL}/khach-thue/${maND}`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || 'Không thể tải thông tin khách thuê');
    }
    return data.data || data;
  },

  create: async (payload: KhachThuePayload) => {
    const res = await fetch(`${API_URL}/khach-thue`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || 'Tạo tài khoản khách thuê thất bại');
    }
    return data;
  },

  update: async (maND: number | string, payload: KhachThuePayload) => {
    const res = await fetch(`${API_URL}/khach-thue/${maND}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || 'Cập nhật hồ sơ khách thuê thất bại');
    }
    return data;
  },

  resetPassword: async (maND: number | string, matKhauMoi: string) => {
    const res = await fetch(`${API_URL}/khach-thue/${maND}/cap-lai-mat-khau`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({ MatKhauMoi: matKhauMoi, matKhauMoi }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || 'Cấp lại mật khẩu thất bại');
    }
    return data;
  },

  delete: async (maND: number | string) => {
    const res = await fetch(`${API_URL}/khach-thue/${maND}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || 'Xóa khách thuê thất bại');
    }
    return data;
  },
};

// Export thêm alias chữ thường để tương thích với các file import { khachThueService }
export const khachThueService = KhachThueService;
export default KhachThueService;