// src/services/home.service.ts

export interface TienIchItem {
  MaTI: number;
  TenTI: string;
  MoTa?: string;
}

export interface PhiDichVuItem {
  MaDV: number;    
  TenDV: string;     
  DonGia: number;      
  DonViTinh?: string; 
  MoTa?: string;
}

export interface TinDangHome {
  MaTin: number;
  TieuDe: string;
  MoTa: string | null;
  NgayDang: string;
  NgayHetHan: string | null;
  TrangThaiTin: "DangHienThi" | "DaAn" | "HetHan";
  MaPhong: number;
  TenPhong: string;
  DienTich: number;
  Gia: number;
  TrangThaiPhong: "Trong" | "DangThue" | "BaoTri";
  MaKhu: number;
  TenKhu: string;
  DiaChi: string;
  TenChuTro: string;
  SDTChuTro: string;
  DanhSachAnh: string[];
  DanhSachTienIch: TienIchItem[];
}

export interface KhuTroSummary {
  MaKhu: number;
  TenKhu: string;
  DiaChi: string;
  MoTa: string | null;
  TongSoPhong: number;
  SoPhongTrong: number;
}

export interface GiaDienNuocHome {
  MaGia: number;
  GiaDien: number;
  GiaNuoc: number;
  NgayApDung: string;
}

export interface HomeDataPayload {
  tinDang: TinDangHome[];
  tienIch: TienIchItem[];
  phiDichVu: PhiDichVuItem[];
  khuTro: KhuTroSummary[];
  giaDienNuoc: GiaDienNuocHome;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export class HomeService {
  static async getHomeData(): Promise<HomeDataPayload> {
    try {
      
      const res = await fetch(`${API_URL}/phong-tro/public/home-data`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Không thể tải dữ liệu trang chủ");
      const json = await res.json();
      return json.data;
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu trang chủ:", error);
      throw error;
    }
  }
}