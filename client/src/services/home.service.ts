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
  TrangThai?: "DangHienThi" | "DaAn" | "HetHan";
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
  TenQuanLy?: string;
  SDTQuanLy?: string | null;
  AnhDaiDien?: string | null;
  DanhSachAnh: string[];
  DanhSachTienIch: TienIchItem[];
}

export interface KhuTroSummary {
  MaKhu: number;
  MaND?: number;
  TenKhu: string;
  DiaChi: string;
  MoTa: string | null;
  TenQuanLy?: string;
  SDTQuanLy?: string | null;
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

export interface HomeTinDangFilterParams {
  maKhu?: string;
  mucGia?: string;
  dienTich?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export class HomeService {
  // 1. Lấy toàn bộ dữ liệu khởi tạo trang Home (đã bao gồm tin đăng Phòng trống + Đang hiển thị)
  static async getHomeData(): Promise<HomeDataPayload> {
    try {
      const res = await fetch(`${API_URL}/phong-tro/public/home-data`, {
        method: "GET",
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

  // 2. API riêng chỉ lấy danh sách tin đăng cho trang Home (Phòng trống + Đang hiển thị)
  static async getPublicTinDang(
    params?: HomeTinDangFilterParams,
  ): Promise<TinDangHome[]> {
    try {
      const query = new URLSearchParams();

      if (params?.maKhu && params.maKhu !== "ALL") {
        query.set("maKhu", params.maKhu);
      }
      if (params?.mucGia && params.mucGia !== "ALL") {
        query.set("mucGia", params.mucGia);
      }
      if (params?.dienTich && params.dienTich !== "ALL") {
        query.set("dienTich", params.dienTich);
      }

      const queryString = query.toString();
      const url = `${API_URL}/phong-tro/public/tin-dang${
        queryString ? `?${queryString}` : ""
      }`;

      const res = await fetch(url, {
        method: "GET",
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error("Không thể tải danh sách tin đăng trang chủ");
      }

      const json = await res.json();
      return Array.isArray(json.data) ? json.data : [];
    } catch (error) {
      console.error("Lỗi khi tải danh sách tin đăng trang chủ:", error);
      throw error;
    }
  }
}

// Export thêm hàm rời để tiện import trực tiếp nếu cần
export const getPublicHomeTinDang = (params?: HomeTinDangFilterParams) =>
  HomeService.getPublicTinDang(params);