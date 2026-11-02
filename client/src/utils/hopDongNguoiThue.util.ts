// client/src/utils/hopDongNguoiThue.util.ts
import { ChiTietHopDongFull as ChiTietHopDongPdfType } from '@/types/hopDong.type';

export interface HopDongTomTat {
  MaHDT: number;
  MaPhong: number;
  MaHDTCu?: number | null;
  NgayBD: string;
  NgayKT: string;
  NgayKy: string;
  TienCoc: number;
  TrangThai: 'ConHieuLuc' | 'HetHan' | 'DaHuy' | string;
  TenPhong: string;
  DienTich: number;
  GiaPhong: number;
  TenKhu: string;
  DiaChiKhu: string;
  VaiTroCuaToi: 'DaiDien' | 'ThanhVien' | string;
  TamTruCuaToi: string;
  NgayVaoCuaToi: string;
  NgayDiCuaToi?: string | null;
  TenQuanLy: string;
  SDTQuanLy?: string;
  SoThanhVien: number;
  DaGuiYeuCauHuy: boolean;
}

export interface ChiTietHopDongNguoiThue {
  MaHDT: number;
  MaPhong: number;
  MaHDTCu?: number | null;
  NgayBD: string;
  NgayKT: string;
  NgayKy: string;
  TienCoc: number;
  TrangThai: string;
  TenPhong: string;
  DienTich: number;
  GiaPhong: number;
  TenKhu: string;
  DiaChiKhuTro: string;
  TenChuTro: string;
  NamSinhChuTro?: number | string | null;
  NgaySinhChuTro?: string | null;
  SDTChuTro?: string;
  EmailChuTro?: string;
  CCCDChuTro?: string;
  NgayCapChuTro?: string | null;
  NoiCapChuTro?: string | null;
  DiaChiChuTro?: string;
  DaGuiYeuCauHuy?: boolean;
  ThoiGianGuiYeuCauHuy?: string | null;
  ThongTinThanhToan?: {
    TenNganHang: string;
    STK: string;
    ChuTaiKhoan: string;
  } | null;
  DanhSachThanhVien?: Array<{
    MaND: number;
    HoTen: string;
    NamSinh?: number | string | null;
    NgaySinh?: string | null;
    SDT?: string;
    Email?: string;
    CCCD?: string;
    NgayCap?: string | null;
    NoiCap?: string | null;
    DiaChi?: string | null;
    VaiTro: string;
    TamTru: string;
    NgayVao?: string;
    NgayDi?: string | null;
    SoLuongThe?: number;
    DanhSachMaThe?: string;
  }>;
  ThanhVienCungPhong?: Array<any>;
  DanhSachTienIch?: Array<{
    MaTI: number;
    TenTI: string;
    MoTa?: string;
  }>;
  DanhSachPhiDichVu?: Array<{
    MaDV?: number;
    MaPDV?: number;
    TenDV?: string;
    TenPDV?: string;
    DonGia?: number;
    Gia?: number;
    DonViTinh?: string;
    SoLuong?: number;
  }>;
  GiaDienNuoc?: {
    GiaDien: number;
    GiaNuoc: number;
  };
  GiaDien?: number;
  GiaNuoc?: number;
  ChiSoBanGiao?: {
    SoDienCu?: number;
    SoDienMoi?: number;
    SoNuocCu?: number;
    SoNuocMoi?: number;
    NgayGhi?: string;
  };
  HoaDonMoiNhat?: any;
}

export const LY_DO_MAU = [
  'Chuyển nơi công tác / thay đổi trường học',
  'Đã hết nhu cầu thuê phòng tại khu vực này',
  'Muốn chuyển sang phòng khác rộng hơn',
  'Thay đổi kế hoạch tài chính / về quê',
];

/**
 * Chuẩn hóa chuỗi tiếng Việt về dạng Unicode dựng sẵn (NFC)
 * Khắc phục triệt để lỗi nhảy dấu, tách chữ khi render font serif hoặc xuất PDF
 */
export const chuanHoaNFC = (str?: string | number | null, fallback = ''): string => {
  if (str === null || str === undefined || str === '') return fallback;
  return String(str).normalize('NFC').trim();
};

export const formatVND = (val?: number | string) =>
  `${Number(val || 0).toLocaleString('vi-VN')} đ`;

export const formatDateVN = (dateStr?: string | null) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const layNamSinh = (namSinh?: any, ngaySinh?: any): number | null => {
  if (namSinh && !Number.isNaN(Number(namSinh))) return Number(namSinh);
  if (ngaySinh) {
    const d = new Date(ngaySinh);
    if (!Number.isNaN(d.getTime())) return d.getFullYear();
  }
  return null;
};

/**
 * Chuẩn hóa dữ liệu hợp đồng từ API người thuê sang đúng chuẩn ChiTietHopDongFull của HopDongPdfModal
 */
export function chuanHoaDuLieuSangPdf(
  chiTiet: ChiTietHopDongNguoiThue,
  tomTat?: HopDongTomTat | null
): ChiTietHopDongPdfType {
  const rawThanhVien =
    (chiTiet.ThanhVienCungPhong && chiTiet.ThanhVienCungPhong.length > 0
      ? chiTiet.ThanhVienCungPhong
      : chiTiet.DanhSachThanhVien) || [];

  const danhSachThanhVienChuan = rawThanhVien.map((tv: any) => ({
    MaND: Number(tv.MaND || 0),
    HoTen: chuanHoaNFC(tv.HoTen, '................................................'),
    CCCD: chuanHoaNFC(tv.CCCD || tv.SoCCCD, '................................'),
    NgayCap: tv.NgayCap || tv.NgayCapCCCD || null,
    NoiCap: chuanHoaNFC(tv.NoiCap || tv.NoiCapCCCD, 'Cục Cảnh sát QLHC về TTXH'),
    NamSinh: layNamSinh(tv.NamSinh, tv.NgaySinh),
    SDT: chuanHoaNFC(tv.SDT || tv.SoDienThoai, '................................'),
    Email: chuanHoaNFC(tv.Email, '........................'),
    DiaChi: chuanHoaNFC(
      tv.DiaChi || tv.DiaChiThuongTru || tv.QueQuan,
      '................................................'
    ),
    NgayVao: tv.NgayVao || chiTiet.NgayBD,
    NgayDi: tv.NgayDi || null,
    VaiTro: tv.VaiTro === 'DaiDien' ? 'DaiDien' : 'ThanhVien',
    TamTru: tv.TamTru || 'ChuaDangKy',
    SoLuongThe: Number(tv.SoLuongThe ?? 1),
    DanhSachMaThe: chuanHoaNFC(tv.DanhSachMaThe || tv.MaTheTu, ''),
  }));

  const soDienBanGiao = Number(
    chiTiet.ChiSoBanGiao?.SoDienMoi ??
      chiTiet.ChiSoBanGiao?.SoDienCu ??
      (chiTiet as any).ChiSoDienDau ??
      0
  );
  const soNuocBanGiao = Number(
    chiTiet.ChiSoBanGiao?.SoNuocMoi ??
      chiTiet.ChiSoBanGiao?.SoNuocCu ??
      (chiTiet as any).ChiSoNuocDau ??
      0
  );

  const giaDien = Number(chiTiet.GiaDienNuoc?.GiaDien ?? chiTiet.GiaDien ?? 3500);
  const giaNuoc = Number(chiTiet.GiaDienNuoc?.GiaNuoc ?? chiTiet.GiaNuoc ?? 18000);

  return {
    ...(chiTiet as any),
    MaHDT: chiTiet.MaHDT,
    MaPhong: chiTiet.MaPhong,
    MaHDTCu: chiTiet.MaHDTCu ?? tomTat?.MaHDTCu ?? null,
    NgayBD: chiTiet.NgayBD,
    NgayKT: chiTiet.NgayKT,
    NgayKy: chiTiet.NgayKy || chiTiet.NgayBD,
    TienCoc: Number(chiTiet.TienCoc || 0),
    TrangThai: chiTiet.TrangThai,
    TenPhong: chuanHoaNFC(chiTiet.TenPhong || tomTat?.TenPhong, ''),
    DienTich: Number(chiTiet.DienTich || tomTat?.DienTich || 0),
    GiaPhong: Number(chiTiet.GiaPhong || tomTat?.GiaPhong || 0),
    TenKhu: chuanHoaNFC(chiTiet.TenKhu || tomTat?.TenKhu, ''),
    DiaChiKhuTro: chuanHoaNFC(
      chiTiet.DiaChiKhuTro || (chiTiet as any).DiaChiKhu || tomTat?.DiaChiKhu,
      ''
    ),
    TenChuTro: chuanHoaNFC(
      chiTiet.TenChuTro || tomTat?.TenQuanLy,
      'Chủ cơ sở nhà trọ'
    ),
    NamSinhChuTro: layNamSinh(chiTiet.NamSinhChuTro, chiTiet.NgaySinhChuTro),
    CCCDChuTro: chuanHoaNFC(chiTiet.CCCDChuTro, '........................'),
    NgayCapChuTro: chiTiet.NgayCapChuTro || null,
    NoiCapChuTro: chuanHoaNFC(
      chiTiet.NoiCapChuTro,
      'Cục Cảnh sát QLHC về TTXH'
    ),
    DiaChiChuTro: chuanHoaNFC(
      chiTiet.DiaChiChuTro || chiTiet.DiaChiKhuTro || tomTat?.DiaChiKhu,
      ''
    ),
    SDTChuTro: chuanHoaNFC(
      chiTiet.SDTChuTro || tomTat?.SDTQuanLy,
      '........................'
    ),
    EmailChuTro: chuanHoaNFC(chiTiet.EmailChuTro, '........................'),
    ThongTinThanhToan: chiTiet.ThongTinThanhToan
      ? {
          TenNganHang: chuanHoaNFC(chiTiet.ThongTinThanhToan.TenNganHang),
          STK: chuanHoaNFC(chiTiet.ThongTinThanhToan.STK),
          ChuTaiKhoan: chuanHoaNFC(
            chiTiet.ThongTinThanhToan.ChuTaiKhoan || chiTiet.TenChuTro
          ),
        }
      : null,
    DanhSachThanhVien: danhSachThanhVienChuan,
    ThanhVienCungPhong: danhSachThanhVienChuan,
    DanhSachTienIch: (chiTiet.DanhSachTienIch || []).map((ti) => ({
      ...ti,
      TenTI: chuanHoaNFC(ti.TenTI),
    })),
    DanhSachPhiDichVu: (chiTiet.DanhSachPhiDichVu || []).map((dv) => ({
      ...dv,
      TenDV: chuanHoaNFC(dv.TenDV || dv.TenPDV),
      DonViTinh: chuanHoaNFC(dv.DonViTinh, 'Phòng/Tháng'),
      DonGia: Number(dv.DonGia ?? dv.Gia ?? 0),
      SoLuong: Number(dv.SoLuong ?? 1),
    })),
    GiaDienNuoc: {
      GiaDien: giaDien,
      GiaNuoc: giaNuoc,
    },
    ChiSoBanGiao: {
      SoDienCu: Number(chiTiet.ChiSoBanGiao?.SoDienCu ?? soDienBanGiao),
      SoDienMoi: soDienBanGiao,
      SoNuocCu: Number(chiTiet.ChiSoBanGiao?.SoNuocCu ?? soNuocBanGiao),
      SoNuocMoi: soNuocBanGiao,
      NgayGhi:
        chiTiet.ChiSoBanGiao?.NgayGhi || chiTiet.NgayKy || chiTiet.NgayBD,
    },
    HoaDonMoiNhat: chiTiet.HoaDonMoiNhat || null,
  } as unknown as ChiTietHopDongPdfType;
}

/**
 * Helper gọi API chuẩn (hỗ trợ cả Cookie JWT & Bearer Token)
 */
export async function requestHopDongApi<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ status: number; data: T }> {
  const rawBase = (
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
  ).replace(/\/+$/, '');
  const baseUrl = rawBase.endsWith('/api') ? rawBase : `${rawBase}/api`;
  const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (typeof window !== 'undefined') {
    const token =
      localStorage.getItem('accessToken') || localStorage.getItem('token');
    if (token && !headers.Authorization) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error: any = new Error(
      data?.thongBao || data?.message || 'Lỗi kết nối máy chủ'
    );
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return { status: response.status, data };
}