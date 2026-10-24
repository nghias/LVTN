// client/src/services/dichVu.service.ts
export interface DichVuItem {
  MaDV: number;
  TenDV: string;
  DonGia: number | string;
  DonViTinh: string;
  MoTa: string;
  TongSoPhongApDung?: number;
  SoPhongApDungTrongQuyen?: number;
}

export interface PhongApDungPayload {
  MaPhong: number;
  SoLuong: number;
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

const AUTH_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/auth';
const API_ROOT = AUTH_URL.replace(/\/auth\/?$/, '');
const DICH_VU_API = `${API_ROOT}/dich-vu`;

export const dichVuService = {
  // 1. Lấy danh sách Cơ sở & Phòng mà user có quyền gán dịch vụ
  getPhongOptions: async () => {
    const res = await fetch(`${DICH_VU_API}/phong-ap-dung-options`, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
    return res.json();
  },

  // 2. Lấy danh sách & tìm kiếm phí dịch vụ
  getList: async (search: string = '') => {
    const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : '';
    const res = await fetch(`${DICH_VU_API}${query}`, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
    return res.json();
  },

  // 3. Lấy chi tiết 1 phí dịch vụ kèm các phòng đã gán
  getById: async (maDV: number | string) => {
    const res = await fetch(`${DICH_VU_API}/${maDV}`, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
    return res.json();
  },

  // 4. Thêm phí dịch vụ mới
  create: async (payload: {
    TenDV: string;
    DonGia: number;
    DonViTinh: string;
    MoTa: string;
    PhongApDung: PhongApDungPayload[];
  }) => {
    const res = await fetch(DICH_VU_API, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  // 5. Sửa phí dịch vụ & cập nhật danh sách phòng áp dụng
  update: async (
    maDV: number | string,
    payload: {
      TenDV: string;
      DonGia: number;
      DonViTinh: string;
      MoTa: string;
      PhongApDung: PhongApDungPayload[];
    }
  ) => {
    const res = await fetch(`${DICH_VU_API}/${maDV}`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  // 6. Xóa phí dịch vụ
  delete: async (maDV: number | string) => {
    const res = await fetch(`${DICH_VU_API}/${maDV}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
    return res.json();
  },
};