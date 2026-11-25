export type TrangThaiDatPhong =
  | 'ChoThanhToan'
  | 'DaDatCoc'
  | 'DaHoanCoc_ChotThue'
  | 'DaHoanCoc_KhongThue'
  | 'QuaHanMatCoc'
  | 'TrungLapCanHoan'
  | 'DaHuy';

export type PhuongThucHoanCoc = 'TienMat' | 'ChuyenKhoan';
export type KetQuaHoanCoc = 'ChotThue' | 'KhongThue' | 'TrungLap';

export interface DatPhongItem {
  MaDP: number;
  MaTraCuu: string;
  TokenTraCuu?: string;
  MaPhong: number;
  HoTenKhach: string;
  SDT: string;
  Email: string;
  NgayHenXem: string;
  GhiChu?: string | null;
  SoTienCoc: number;
  OrderCode: number;
  ThoiGianTao: string;
  ThoiGianHetHanQR: string;
  ThoiGianThanhToan?: string | null;
  ThoiGianHetHanGiu?: string | null;
  TrangThai: TrangThaiDatPhong;
  PhuongThucHoan?: PhuongThucHoanCoc | null;
  SoTienHoan: number;
  ThoiGianHoanCoc?: string | null;
  GhiChuHoanCoc?: string | null;
  NguoiXuLy?: number | null;
  MaKhu: number;
  TenPhong: string;
  DienTich: number;
  GiaPhong: number;
  TrangThaiPhong: string;
  TenKhu: string;
  DiaChiKhu: string;
  MaQuanLyKhu?: number | null;
  TenQuanLy?: string | null;
  SDTQuanLy?: string | null;
  EmailQuanLy?: string | null;
  TenNguoiXuLy?: string | null;
  AnhDaiDienPhong?: string | null;
  ThongTinNganHangNhan?: {
    TenNganHang: string;
    STK: string;
    ChuTaiKhoan: string;
  } | null;
}

export interface TaoYeuCauDatCocPayload {
  MaPhong: number;
  HoTenKhach: string;
  SDT: string;
  Email: string;
  NgayHenXem: string;
  SoTienCoc: number;
  GhiChu?: string;
}

export interface PayOSBookingQrResponse {
  maDP: number;
  maTraCuu: string;
  tokenTraCuu: string;
  orderCode: number;
  soTienCoc: number;
  thoiGianHetHanQR: string;
  phong: {
    MaPhong: number;
    TenPhong: string;
    TenKhu: string;
    DiaChi: string;
  };
  payos: {
    checkoutUrl: string;
    qrCode: string;
    accountNumber: string;
    accountName: string;
    bin: string;
    amount: number;
    description: string;
    expiredAt: number;
  };
}

export interface KiemTraPayOSResponse {
  paid: boolean;
  trangThai: TrangThaiDatPhong;
  payosStatus?: string;
  maTraCuu: string;
  tokenTraCuu?: string;
  thoiGianThanhToan?: string | null;
  thoiGianHetHanGiu?: string | null;
  thoiGianHetHanQR?: string | null;
}

export interface ThongKeDatPhong {
  tongDon: number;
  choThanhToan: number;
  daDatCoc: number;
  trungLapCanHoan: number;
  daHoanCoc: number;
  quaHanMatCoc: number;
  daHuy: number;
}

export interface KhuTroBrief {
  MaKhu: number;
  MaND: number;
  TenKhu: string;
  DiaChi: string;
}