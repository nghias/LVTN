export type RoleType = 'ChuTro' | 'QuanLy' | 'KhachThue';

export interface UserProfile {
  MaND: number;
  HoTen: string;
  CCCD?: string;
  NamSinh?: number;
  SDT?: string;
  Email?: string;
  DiaChi?: string;
  TenTK: string;
  Quyen: RoleType;
}

export interface LoginPayload {
  TenTK: string;
  MatKhau: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}