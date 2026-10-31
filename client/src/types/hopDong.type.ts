// client/src/types/hopDong.type.ts

export interface ThanhVienHopDong {
  MaND: number;
  MaHDT?: number;
  HoTen: string;
  GioiTinh?: string | null;
  CCCD: string | null;
  NgayCap?: string | null;
  NoiCap?: string | null;
  NamSinh: number | null;
  SDT: string;
  Email: string | null;
  DiaChi: string | null;
  NgheNghiep?: string | null;
  NgayVao: string;
  NgayDi: string | null;
  VaiTro: 'DaiDien' | 'ThanhVien';
  TamTru: 'ChuaDangKy' | 'DaDangKy' | 'DangCho';
  DanhSachMaThe?: string;
  SoLuongThe?: number;
}

export interface PhiDichVuItem {
  MaPDV: number;
  MaDV?: number;
  TenPDV: string;
  TenDV?: string;
  Gia: number;
  DonGia?: number;
  DonViTinh?: string;
  SoLuong?: number;
  GhiChu?: string | null;
  MoTa?: string | null;
}

export interface TienIchItem {
  MaTI: number;
  TenTI: string;
  MoTa?: string | null;
}

export interface HopDongItem {
  MaHDT: number;
  MaPhong: number;
  MaHDTCu: number | null;
  NgayBD: string;
  NgayKT: string;
  NgayKy: string;
  TienCoc: number;
  TrangThai: 'ConHieuLuc' | 'HetHan' | 'DaHuy';
  TenPhong: string;
  DienTich: number;
  GiaPhong: number;
  TrangThaiPhong: string;
  MaKhu: number;
  TenKhu: string;
  DiaChiKhu?: string;
  MaQuanLyKhu?: number;
  MaNDDaiDien?: number;
  TenDaiDien?: string;
  SDTDaiDien?: string;
  CCCDDaiDien?: string;
  SoThanhVien?: number;
}

export interface ChiTietHopDongFull extends HopDongItem {
  DiaChiKhuTro: string;
  MaChuTro: number;
  TenChuTro: string;
  GioiTinhChuTro?: string | null;
  CCCDChuTro: string | null;
  NgayCapChuTro?: string | null;
  NoiCapChuTro?: string | null;
  NamSinhChuTro: number | null;
  SDTChuTro: string;
  EmailChuTro: string | null;
  DiaChiChuTro: string | null;
  ThongTinThanhToan: {
    TenNganHang: string;
    STK: string;
    ChuTaiKhoan: string;
  } | null;
  DanhSachThanhVien: ThanhVienHopDong[];
  ThanhVienCungPhong: ThanhVienHopDong[];
  DanhSachTienIch: TienIchItem[];
  DanhSachPhiDichVu: PhiDichVuItem[];
  GiaDienNuoc: {
    MaGia?: number;
    GiaDien: number;
    GiaNuoc: number;
    NgayApDung?: string;
  };
  ChiSoBanGiao: {
    SoDienCu: number;
    SoDienMoi: number;
    SoNuocCu: number;
    SoNuocMoi: number;
    NgayGhi: string;
  };
  HoaDonMoiNhat?: {
    MaHD: number;
    TienPhong: number;
    TienDien: number;
    TienNuoc: number;
    TienPhuPhi: number;
    TienPhatSinh: number;
    TongTien: number;
    NgayTinh: string;
    SoDienCu: number;
    SoDienMoi: number;
    SoNuocCu: number;
    SoNuocMoi: number;
    GiaDien: number;
    GiaNuoc: number;
  } | null;
}