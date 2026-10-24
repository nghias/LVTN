// client/src/services/tienIch.service.ts
export interface TienIchItem {
  MaTI: number;
  TenTI: string;
  MoTa: string;
  SoPhongSuDung?: number;
}

const AUTH_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/auth';
const API_ROOT = AUTH_URL.replace(/\/auth\/?$/, '');
const TIEN_ICH_API = `${API_ROOT}/tien-ich`;

export const tienIchService = {
  // 1. Lấy danh sách & tìm kiếm tiện ích
  getList: async (search: string = '') => {
    const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : '';
    const res = await fetch(`${TIEN_ICH_API}${query}`, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
    return res.json();
  },

  // 2. Lấy chi tiết 1 tiện ích theo MaTI
  getById: async (maTI: number | string) => {
    const res = await fetch(`${TIEN_ICH_API}/${maTI}`, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
    return res.json();
  },

  // 3. Thêm tiện ích mới
  create: async (payload: { TenTI: string; MoTa: string }) => {
    const res = await fetch(TIEN_ICH_API, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  // 4. Sửa tiện ích
  update: async (maTI: number | string, payload: { TenTI: string; MoTa: string }) => {
    const res = await fetch(`${TIEN_ICH_API}/${maTI}`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  // 5. Xóa tiện ích
  delete: async (maTI: number | string) => {
    const res = await fetch(`${TIEN_ICH_API}/${maTI}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
    return res.json();
  },
};