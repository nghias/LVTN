// client/src/types/thongBao.type.ts
export interface LoaiThongBao {
  MaLTB: number;
  TenLTB: string;
  MoTa?: string;
}

export interface KhuTroItem {
  MaKhu: number;
  MaQuanLy: number;
  TenKhu: string;
  DiaChi?: string;
  TenQuanLy?: string;
}

export interface PhongTroItem {
  MaPhong: number;
  MaKhu: number;
  TenPhong: string;
  TrangThai: string;
}

export interface ThongBaoMetadata {
  vaiTroHienThi: "CHU_TRO_TONG" | "QUAN_LY_KHU";
  isSupremeLandlord: boolean;
  khuTroList: KhuTroItem[];
  phongList: PhongTroItem[];
  loaiThongBaoList: LoaiThongBao[];
}

export interface ThongBaoReplyItem {
  MaTB: number;
  MaTBGoc: number;
  NDGui: number;
  TenNguoiGui: string;
  QuyenNguoiGui: string;
  MaLTB: number;
  TieuDe: string;
  NoiDung: string;
  NgayGui: string;
}

export interface ThongBaoItem {
  MaTB: number;
  MaTBGoc?: number | null;
  NDGui: number;
  TenNguoiGui: string;
  QuyenNguoiGui: string;
  MaLTB: number;
  TenLTB: string;
  TieuDe: string;
  NoiDung: string;
  NgayGui: string;
  TrangThai?: "ChuaDoc" | "DaDoc";
  SoNguoiNhan?: number;
  SoPhanHoi?: number;
}

export interface ThongBaoChiTiet extends ThongBaoItem {
  dsPhanHoi: ThongBaoReplyItem[];
}

export interface CreateThongBaoPayload {
  maLTB: number;
  tieuDe: string;
  noiDung: string;
  phamVi: "TOAN_HE_THONG" | "TAT_CA_QUAN_LY" | "THEO_KHU" | "THEO_PHONG";
  maKhu?: number;
  maPhong?: number;
}

export interface ThongTinPhongKhach {
  MaPhong: number;
  TenPhong: string;
  MaKhu: number;
  TenKhu: string;
  MaQuanLy: number;
  TenQuanLy: string;
}

export type PhamViThongBao =
  | "TOAN_HE_THONG"
  | "TAT_CA_QUAN_LY"
  | "THEO_KHU"
  | "THEO_PHONG";

// Đổi tên hoặc thêm alias cho PhongItem

export interface PhongTroItem {
  MaPhong: number;
  MaKhu: number;
  TenPhong: string;
  TrangThai: string;
}

export type PhongItem = PhongTroItem;
