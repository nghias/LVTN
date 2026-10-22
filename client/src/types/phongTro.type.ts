export type RoomStatus = 'Trong' | 'DangThue' | 'BaoTri';

export interface KhuTroItem {
  MaKhu: number;
  MaND: number;
  TenKhu: string;
  MoTa: string;
  DiaChi: string;
  TenQuanLy?: string;
  SDTQuanLy?: string;
  TongSoPhong?: number;
  SoPhongTrong?: number;
}

export interface TienIchItem {
  MaTI: number;
  TenTI: string;
  MoTa?: string;
}

export interface AnhPhongItem {
  MaAnh: number;
  MaPhong: number;
  DuongDan: string;
  AnhChinh: number; // 1: Ảnh chính, 0: Ảnh phụ
}

export interface PhongItem {
  MaPhong: number;
  MaKhu: number;
  TenPhong: string;
  DienTich: number;
  Gia: number;
  TrangThai: RoomStatus;
  TenKhu: string;
  DiaChi: string;
  MaQuanLyKhu: number;
  AnhDaiDien?: string | null;
  TienIch: TienIchItem[];
  DanhSachAnh?: AnhPhongItem[];
}

export interface QuanLyUserItem {
  MaND: number;
  HoTen: string;
  SDT: string;
  Email: string;
}