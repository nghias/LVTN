// src/services/phongTro.service.ts
import { ApiResponse } from '../types/auth.type';
import {
  KhuTroItem,
  PhongItem,
  QuanLyUserItem,
  TienIchItem,
} from '../types/phongTro.type';

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
).replace(/\/+$/, '');
const SERVER_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');
const PHONG_API = `${API_BASE_URL}/phong-tro`;

export const DEFAULT_ROOM_FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&auto=format&fit=crop&q=80';

async function requestJson<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
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

async function requestFormData<T>(
  endpoint: string,
  method: string,
  formData: FormData
): Promise<T> {
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

// Chuẩn hóa URL ảnh phòng (Hỗ trợ cả link http/https, Cloudinary, đường dẫn uploads/... và object AnhPhong)
export function resolveRoomImageUrl(
  rawInput?: string | { DuongDan?: string | null } | null
): string {
  if (!rawInput) {
    return DEFAULT_ROOM_FALLBACK_IMAGE;
  }

  const rawPath =
    typeof rawInput === 'string'
      ? rawInput.trim()
      : typeof rawInput === 'object' && rawInput.DuongDan
        ? String(rawInput.DuongDan).trim()
        : '';

  if (!rawPath) {
    return DEFAULT_ROOM_FALLBACK_IMAGE;
  }

  if (/^https?:\/\//i.test(rawPath)) {
    return rawPath;
  }

  const normalizedPath = rawPath.replace(/\\/g, '/').replace(/^\/+/, '');
  return `${SERVER_ORIGIN}/${normalizedPath}`;
}

export const PhongTroService = {
  getKhuTroList: () => requestJson<ApiResponse<KhuTroItem[]>>('/khu-tro'),
  getKhuTroDetail: (maKhu: number) =>
    requestJson<ApiResponse<KhuTroItem>>(`/khu-tro/${maKhu}`),
  getDanhSachQuanLy: () =>
    requestJson<ApiResponse<QuanLyUserItem[]>>('/quan-ly-list'),

  createKhuTro: (payload: {
    MaND: number;
    TenKhu: string;
    DiaChi: string;
    MoTa: string;
  }) =>
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

  getPhongList: (params?: {
    maKhu?: number;
    trangThai?: string;
    keyword?: string;
  }) => {
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
    requestFormData<ApiResponse<PhongItem>>(
      `/phong/${maPhong}`,
      'PUT',
      formData
    ),

  deletePhong: (maPhong: number) =>
    requestJson<ApiResponse<null>>(`/phong/${maPhong}`, { method: 'DELETE' }),
};