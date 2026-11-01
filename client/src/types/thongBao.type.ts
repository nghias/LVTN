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

export type PhongItem = PhongTroItem;

export interface NguoiNhanItem {
  MaND: number;
  HoTen: string;
  TenTK?: string;
  Quyen: string;
  MaKhu?: number | null;
  TenKhu?: string | null;
  MaPhong?: number | null;
  TenPhong?: string | null;
}

export type PhamViThongBao =
  | "TOAN_HE_THONG"
  | "TAT_CA_QUAN_LY"
  | "THEO_KHU"
  | "THEO_PHONG"
  | "MOT_NGUOI"
  | "NHIEU_NGUOI";

export interface ThongBaoMetadata {
  vaiTroHienThi: "CHU_TRO_TONG" | "QUAN_LY_KHU";
  isSupremeLandlord: boolean;
  khuTroList: KhuTroItem[];
  phongList: PhongTroItem[];
  loaiThongBaoList: LoaiThongBao[];
  nguoiNhanList?: NguoiNhanItem[];
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
  phamVi: PhamViThongBao;
  maKhu?: number;
  maPhong?: number;
  nguoiNhanIds?: number[];
}

export interface ThongTinPhongKhach {
  MaPhong: number;
  TenPhong: string;
  MaKhu: number;
  TenKhu: string;
  MaQuanLy: number;
  TenQuanLy: string;
}