// client/src/services/khachThue.service.ts
import axiosInstance from 'axios';

export interface KhachThueItem {
  MaND: number;
  MaTT?: number | null;
  TenTK: string;
  Quyen: 'KhachThue';
  HoTen: string;
  GioiTinh?: 'Nam' | 'Nữ' | 'Khác' | string;
  NamSinh: number | null;
  CCCD: string | null;
  NgayCap?: string | null;
  NoiCap?: string | null;
  SDT: string;
  Email: string | null;
  DiaChi: string | null;
  NgheNghiep?: string | null;
  MaPhong?: number | null;
  TenPhong?: string | null;
  MaKhu?: number | null;
  TenKhu?: string | null;
  MaHDT?: number | null;
  VaiTro?: number | null;
  TamTru?: string | number | null;
  NgayVao?: string | null;
}

export interface KhachThuePayload {
  TenTK: string;
  MatKhau?: string;
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
}

export const khachThueService = {
  getList: async (params?: {
    maKhu?: string | number;
    trangThaiPhong?: string;
    keyword?: string;
  }) => {
    const res = await axiosInstance.get('/khach-thue/danh-sach', { params });
    return res.data.data as KhachThueItem[];
  },

  getDetail: async (maND: number) => {
    const res = await axiosInstance.get(`/khach-thue/${maND}`);
    return res.data.data as KhachThueItem;
  },

  create: async (payload: KhachThuePayload & { MatKhau: string }) => {
    const res = await axiosInstance.post('/khach-thue', payload);
    return res.data;
  },

  update: async (maND: number, payload: KhachThuePayload) => {
    const res = await axiosInstance.put(`/khach-thue/${maND}`, payload);
    return res.data;
  },

  resetPassword: async (maND: number, matKhauMoi: string) => {
    const res = await axiosInstance.put(`/khach-thue/${maND}/cap-lai-mat-khau`, {
      matKhauMoi,
    });
    return res.data;
  },

  delete: async (maND: number) => {
    const res = await axiosInstance.delete(`/khach-thue/${maND}`);
    return res.data;
  },
};