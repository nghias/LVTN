// C:\Users\nhat nguyen\Desktop\LVTN\client\src\services\hopDong.service.ts

import { ChiTietHopDongFull, HopDongItem } from '../types/hopDong.type';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Hàm phụ tạo headers (kèm Bearer token nếu có lưu trong localStorage)
function getHeaders(isJson = false): HeadersInit {
  const headers: Record<string, string> = {};
  if (isJson) {
    headers['Content-Type'] = 'application/json';
  }
  if (typeof window !== 'undefined') {
    const token =
      localStorage.getItem('token') ||
      localStorage.getItem('accessToken') ||
      localStorage.getItem('jwt');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  return headers;
}

// Hàm phụ lấy MaND dự phòng từ localStorage nếu có
function getFallbackMaND(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('user') || localStorage.getItem('userProfile');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const id = parsed?.MaND || parsed?.maND;
    return id ? String(id) : null;
  } catch {
    return null;
  }
}

// Hàm phụ kiểm tra phản hồi từ cả HopDongController (thanhCong/thongBao) và auth.middleware (success/message)
async function handleResponse(res: Response, defaultErrorMsg: string) {
  const data = await res.json();
  if (!res.ok || data.thanhCong === false || data.success === false) {
    throw new Error(data.thongBao || data.message || defaultErrorMsg);
  }
  return data;
}

export const hopDongService = {
  layDanhSach: async (params?: {
    tuKhoa?: string;
    trangThai?: string;
    maKhu?: string;
    maPhong?: string;
  }): Promise<HopDongItem[]> => {
    const query = new URLSearchParams();
    if (params?.tuKhoa) query.set('tuKhoa', params.tuKhoa);
    if (params?.trangThai) query.set('trangThai', params.trangThai);
    if (params?.maKhu) query.set('maKhu', params.maKhu);
    if (params?.maPhong) query.set('maPhong', params.maPhong);

    const maND = getFallbackMaND();
    if (maND) query.set('MaND', maND);

    const endpoint = params?.tuKhoa ? 'tim-kiem' : 'danh-sach';
    const res = await fetch(`${API_URL}/hop-dong/${endpoint}?${query.toString()}`, {
      method: 'GET',
      headers: getHeaders(),
      credentials: 'include', // Gửi kèm JWT Cookie sang Backend
      cache: 'no-store',
    });

    const data = await handleResponse(res, 'Lỗi khi tải danh sách hợp đồng');
    return data.duLieu;
  },

  layDuLieuTaoMoi: async () => {
    const query = new URLSearchParams();
    const maND = getFallbackMaND();
    if (maND) query.set('MaND', maND);

    const res = await fetch(`${API_URL}/hop-dong/du-lieu-tao-moi?${query.toString()}`, {
      method: 'GET',
      headers: getHeaders(),
      credentials: 'include',
      cache: 'no-store',
    });

    const data = await handleResponse(res, 'Không thể tải dữ liệu khởi tạo hợp đồng');
    return data.duLieu;
  },

  xemChiTiet: async (maHDT: number): Promise<ChiTietHopDongFull> => {
    const query = new URLSearchParams();
    const maND = getFallbackMaND();
    if (maND) query.set('MaND', maND);

    const res = await fetch(`${API_URL}/hop-dong/chi-tiet/${maHDT}?${query.toString()}`, {
      method: 'GET',
      headers: getHeaders(),
      credentials: 'include',
      cache: 'no-store',
    });

    const data = await handleResponse(res, 'Không thể tải chi tiết hợp đồng');
    return data.duLieu;
  },

  taoHopDong: async (payload: any) => {
    const maND = getFallbackMaND();
    const res = await fetch(`${API_URL}/hop-dong/tao-moi`, {
      method: 'POST',
      headers: getHeaders(true),
      credentials: 'include',
      body: JSON.stringify({
        ...payload,
        ...(maND && !payload?.MaND ? { MaND: Number(maND) } : {}),
      }),
    });

    return handleResponse(res, 'Lỗi khi tạo hợp đồng mới');
  },

  suaHopDong: async (maHDT: number, payload: any) => {
    const maND = getFallbackMaND();
    const res = await fetch(`${API_URL}/hop-dong/cap-nhat/${maHDT}`, {
      method: 'PUT',
      headers: getHeaders(true),
      credentials: 'include',
      body: JSON.stringify({
        ...payload,
        ...(maND && !payload?.MaND ? { MaND: Number(maND) } : {}),
      }),
    });

    return handleResponse(res, 'Lỗi khi cập nhật hợp đồng');
  },

  xoaHopDong: async (maHDT: number) => {
    const query = new URLSearchParams();
    const maND = getFallbackMaND();
    if (maND) query.set('MaND', maND);

    const res = await fetch(`${API_URL}/hop-dong/xoa/${maHDT}?${query.toString()}`, {
      method: 'DELETE',
      headers: getHeaders(),
      credentials: 'include',
    });

    return handleResponse(res, 'Không thể xóa hợp đồng này');
  },
};