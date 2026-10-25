// client/src/services/dichVu.service.ts
export interface DichVuItem {
  MaDV: number;
  TenDV: string;
  DonGia: number | string;
  DonViTinh: string;
  MoTa: string;
  SoHopDongApDung?: number;
}

export interface DichVuPayload {
  TenDV: string;
  DonGia: number;
  DonViTinh: string;
  MoTa: string;
}

const AUTH_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/auth';
const API_ROOT = AUTH_URL.replace(/\/auth\/?$/, '');
const DICH_VU_API = `${API_ROOT}/dich-vu`;

export const dichVuService = {
  // 1. Lấy danh sách & tìm kiếm phí dịch vụ
  getList: async (search: string = '') => {
    const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : '';
    const res = await fetch(`${DICH_VU_API}${query}`, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
    return res.json();
  },

  // 2. Lấy chi tiết 1 phí dịch vụ theo MaDV
  getById: async (maDV: number | string) => {
    const res = await fetch(`${DICH_VU_API}/${maDV}`, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
    return res.json();
  },

  // 3. Thêm phí dịch vụ mới
  create: async (payload: DichVuPayload) => {
    const res = await fetch(DICH_VU_API, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  // 4. Sửa thông tin phí dịch vụ
  update: async (maDV: number | string, payload: DichVuPayload) => {
    const res = await fetch(`${DICH_VU_API}/${maDV}`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  // 5. Xóa phí dịch vụ
  delete: async (maDV: number | string) => {
    const res = await fetch(`${DICH_VU_API}/${maDV}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
    return res.json();
  },
};