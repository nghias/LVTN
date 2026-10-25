// client/src/services/tienIch.service.ts
export interface TienIchItem {
  MaTI: number;
  TenTI: string;
  MoTa: string;
  SoPhongSuDung?: number;
  TongSoPhongApDung?: number;
  SoPhongApDungTrongQuyen?: number;
}

export interface KhuTroOption {
  MaKhu: number;
  TenKhu: string;
  DiaChi: string;
}

export interface PhongOption {
  MaPhong: number;
  MaKhu: number;
  TenPhong: string;
  Gia: number | string;
  TrangThai: string;
  TenKhu: string;
}

const AUTH_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/auth';
const API_ROOT = AUTH_URL.replace(/\/auth\/?$/, '');
const TIEN_ICH_API = `${API_ROOT}/tien-ich`;

export const tienIchService = {
  // 1. Lấy danh sách Cơ sở & Phòng mà user có quyền gán tiện ích
  getPhongOptions: async () => {
    const res = await fetch(`${TIEN_ICH_API}/phong-ap-dung-options`, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
    return res.json();
  },

  // 2. Lấy danh sách & tìm kiếm tiện ích
  getList: async (search: string = '') => {
    const query = search.trim()
      ? `?search=${encodeURIComponent(search.trim())}`
      : '';
    const res = await fetch(`${TIEN_ICH_API}${query}`, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
    return res.json();
  },

  // 3. Lấy chi tiết 1 tiện ích kèm mảng MaPhong đã gán
  getById: async (maTI: number | string) => {
    const res = await fetch(`${TIEN_ICH_API}/${maTI}`, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
    return res.json();
  },

  // 4. Thêm tiện ích mới kèm gán phòng
  create: async (payload: {
    TenTI: string;
    MoTa: string;
    PhongApDung: number[];
  }) => {
    const res = await fetch(TIEN_ICH_API, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  // 5. Sửa tiện ích kèm cập nhật phòng áp dụng
  update: async (
    maTI: number | string,
    payload: {
      TenTI: string;
      MoTa: string;
      PhongApDung: number[];
    }
  ) => {
    const res = await fetch(`${TIEN_ICH_API}/${maTI}`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  // 6. Xóa tiện ích
  delete: async (maTI: number | string) => {
    const res = await fetch(`${TIEN_ICH_API}/${maTI}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
    return res.json();
  },
};