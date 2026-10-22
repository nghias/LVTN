import { ApiResponse } from '../types/auth.type';
import {
  KhuTroItem,
  PhongItem,
  QuanLyUserItem,
  TienIchItem,
} from '../types/phongTro.type';

const AUTH_URL = process.env.NEXT_PUBLIC_API_URL + '/auth';
const API_ROOT = AUTH_URL.replace(/\/auth\/?$/, '');
const PHONG_API = `${API_ROOT}/phong-tro`;

async function requestJson<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${PHONG_API}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Thao tác thất bại!');
  }
  return data;
}

async function requestFormData<T>(endpoint: string, method: string, formData: FormData): Promise<T> {
  const res = await fetch(`${PHONG_API}${endpoint}`, {
    method,
    credentials: 'include',
    body: formData, // Không set Content-Type để trình duyệt tự gắn boundary cho multipart/form-data
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Tải dữ liệu lên thất bại!');
  }
  return data;
}

// Hàm hiển thị URL ảnh (Tương thích cả ảnh Cloudinary lẫn ảnh mẫu trong DB)
export function resolveRoomImageUrl(duongDan?: string | null): string {
  if (!duongDan) {
    return 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&auto=format&fit=crop&q=80';
  }
  if (duongDan.startsWith('http://') || duongDan.startsWith('https://')) {
    return duongDan;
  }
  // Nếu là đường dẫn tương đối (/uploads/phong/...) trong dữ liệu mẫu
  return 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&auto=format&fit=crop&q=80';
}

export const PhongTroService = {
  getKhuTroList: () => requestJson<ApiResponse<KhuTroItem[]>>('/khu-tro'),
  getKhuTroDetail: (maKhu: number) => requestJson<ApiResponse<KhuTroItem>>(`/khu-tro/${maKhu}`),
  getDanhSachQuanLy: () => requestJson<ApiResponse<QuanLyUserItem[]>>('/quan-ly-list'),

  createKhuTro: (payload: { MaND: number; TenKhu: string; DiaChi: string; MoTa: string }) =>
    requestJson<ApiResponse<KhuTroItem>>('/khu-tro', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateKhuTro: (
    maKhu: number,
    payload: { MaND?: number; TenKhu: string; DiaChi: string; MoTa: string }
  ) =>
    requestJson<ApiResponse<KhuTroItem>>(`/khu-tro/${maKhu}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  deleteKhuTro: (maKhu: number) =>
    requestJson<ApiResponse<null>>(`/khu-tro/${maKhu}`, { method: 'DELETE' }),

  getAllTienIch: () => requestJson<ApiResponse<TienIchItem[]>>('/tien-ich'),

  getPhongList: (params?: { maKhu?: number; trangThai?: string; keyword?: string }) => {
    const query = new URLSearchParams();
    if (params?.maKhu) query.set('maKhu', String(params.maKhu));
    if (params?.trangThai) query.set('trangThai', params.trangThai);
    if (params?.keyword) query.set('keyword', params.keyword);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return requestJson<ApiResponse<PhongItem[]>>(`/phong${qs}`);
  },

  getPhongDetail: (maPhong: number) =>
    requestJson<ApiResponse<PhongItem>>(`/phong/${maPhong}`),

  createPhong: (formData: FormData) =>
    requestFormData<ApiResponse<PhongItem>>('/phong', 'POST', formData),

  updatePhong: (maPhong: number, formData: FormData) =>
    requestFormData<ApiResponse<PhongItem>>(`/phong/${maPhong}`, 'PUT', formData),

  deletePhong: (maPhong: number) =>
    requestJson<ApiResponse<null>>(`/phong/${maPhong}`, { method: 'DELETE' }),
};