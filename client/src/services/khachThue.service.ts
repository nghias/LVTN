import { ApiResponse } from '@/types/auth.type';

export interface KhachThueItem {
  MaND: number;
  HoTen: string;
  CCCD: string;
  NamSinh: number | null;
  SDT: string;
  Email: string | null;
  DiaChi: string;
  TenTK: string;
  Quyen: 'KhachThue';
  MaPhong?: number | null;
  TenPhong?: string | null;
  MaKhu?: number | null;
  TenKhu?: string | null;
  MaHDT?: number | null;
  VaiTro?: number | null;
  TamTru?: string | number | null;
  NgayVao?: string | null;
}

const AUTH_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/auth';
const API_ROOT = AUTH_URL.replace(/\/auth\/?$/, '');
const KHACH_THUE_API = `${API_ROOT}/khach-thue`;

async function requestJson<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${KHACH_THUE_API}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const data = await res.json().catch(() => ({
    success: false,
    message: 'Lỗi kết nối đến máy chủ!',
  }));

  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Thao tác thất bại!');
  }

  return data;
}

export const KhachThueService = {
  getList: async (params?: { maKhu?: string | number; trangThaiPhong?: string; keyword?: string }) => {
    const query = new URLSearchParams();
    if (params?.maKhu) query.set('maKhu', String(params.maKhu));
    if (params?.trangThaiPhong) query.set('trangThaiPhong', params.trangThaiPhong);
    if (params?.keyword) query.set('keyword', params.keyword);
    const qs = query.toString() ? `?${query.toString()}` : '';

    const res = await requestJson<ApiResponse<KhachThueItem[]>>(`/danh-sach${qs}`);
    return res.data || [];
  },

  getDetail: async (maND: number) => {
    const res = await requestJson<ApiResponse<KhachThueItem>>(`/${maND}`);
    if (!res.data) throw new Error('Không tìm thấy thông tin khách thuê!');
    return res.data;
  },

  create: async (payload: {
    HoTen: string;
    CCCD: string;
    NamSinh?: number | string;
    SDT: string;
    Email?: string;
    DiaChi?: string;
    TenTK: string;
    MatKhau: string;
  }) => {
    return requestJson<ApiResponse<KhachThueItem>>('', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  update: async (
    maND: number,
    payload: {
      HoTen: string;
      CCCD: string;
      NamSinh?: number | string;
      SDT: string;
      Email?: string;
      DiaChi?: string;
      TenTK: string;
    }
  ) => {
    return requestJson<ApiResponse<KhachThueItem>>(`/${maND}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  resetPassword: async (maND: number, matKhauMoi: string) => {
    return requestJson<ApiResponse<null>>(`/${maND}/cap-lai-mat-khau`, {
      method: 'PUT',
      body: JSON.stringify({ matKhauMoi }),
    });
  },

  delete: async (maND: number) => {
    return requestJson<ApiResponse<null>>(`/${maND}`, {
      method: 'DELETE',
    });
  },
};