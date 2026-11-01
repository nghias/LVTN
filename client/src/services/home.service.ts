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
const SERVER_ORIGIN = API_URL.replace(/\/api\/?$/, "");

const DEFAULT_GIA_DIEN_NUOC: GiaDienNuocHome = {
  MaGia: 1,
  GiaDien: 3500,
  GiaNuoc: 15000,
  NgayApDung: new Date().toISOString().split("T")[0],
};

// Hàm chuẩn hóa đường dẫn ảnh từ DB (hỗ trợ cả URL Cloudinary lẫn đường dẫn uploads/...)
export function resolveHomeRoomImageUrl(rawInput?: any): string | null {
  if (!rawInput) return null;

  const rawPath =
    typeof rawInput === "string"
      ? rawInput.trim()
      : typeof rawInput === "object" && rawInput.DuongDan
        ? String(rawInput.DuongDan).trim()
        : "";

  if (!rawPath) return null;

  if (/^https?:\/\//i.test(rawPath)) {
    return rawPath;
  }

  const normalizedPath = rawPath.replace(/\\/g, "/").replace(/^\/+/, "");
  return `${SERVER_ORIGIN}/${normalizedPath}`;
}

function normalizeTinDangItem(item: any): TinDangHome {
  const rawList: any[] = Array.isArray(item?.DanhSachAnh)
    ? item.DanhSachAnh
    : [];

  const normalizedImages = rawList
    .map((img) => resolveHomeRoomImageUrl(img))
    .filter((url): url is string => Boolean(url));

  const mainImage =
    resolveHomeRoomImageUrl(item?.AnhDaiDien) || normalizedImages[0] || null;

  return {
    ...item,
    MaTin: Number(item.MaTin),
    MaPhong: Number(item.MaPhong),
    MaKhu: Number(item.MaKhu),
    DienTich: Number(item.DienTich || 0),
    Gia: Number(item.Gia || 0),
    TrangThaiTin: item.TrangThaiTin || item.TrangThai || "DangHienThi",
    TrangThai: item.TrangThai || item.TrangThaiTin || "DangHienThi",
    TrangThaiPhong: item.TrangThaiPhong || "Trong",
    AnhDaiDien: mainImage,
    DanhSachAnh:
      normalizedImages.length > 0
        ? normalizedImages
        : mainImage
          ? [mainImage]
          : [],
    DanhSachTienIch: Array.isArray(item.DanhSachTienIch)
      ? item.DanhSachTienIch
      : Array.isArray(item.TienIch)
        ? item.TienIch
        : [],
  };
}

export class HomeService {
  // 1. Lấy toàn bộ dữ liệu khởi tạo trang Home từ phongTro.Controller
  static async getHomeData(): Promise<HomeDataPayload> {
    try {
      const res = await fetch(`${API_URL}/phong-tro/public/home-data`, {
        method: "GET",
        cache: "no-store",
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || !json || json.success === false) {
        console.error(
          "Cảnh báo API home-data:",
          json?.message || res.statusText,
        );
        // Fallback tự động lấy tin đăng qua API /phong-tro/public/tin-dang
        const fallbackTinDang = await HomeService.getPublicTinDang().catch(
          () => [],
        );
        return {
          tinDang: fallbackTinDang,
          tienIch: [],
          phiDichVu: [],
          khuTro: [],
          giaDienNuoc: DEFAULT_GIA_DIEN_NUOC,
        };
      }

      const rawData = json.data || {};
      return {
        tinDang: Array.isArray(rawData.tinDang)
          ? rawData.tinDang.map(normalizeTinDangItem)
          : [],
        tienIch: Array.isArray(rawData.tienIch) ? rawData.tienIch : [],
        phiDichVu: Array.isArray(rawData.phiDichVu) ? rawData.phiDichVu : [],
        khuTro: Array.isArray(rawData.khuTro) ? rawData.khuTro : [],
        giaDienNuoc: rawData.giaDienNuoc || DEFAULT_GIA_DIEN_NUOC,
      };
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu trang chủ:", error);
      return {
        tinDang: [],
        tienIch: [],
        phiDichVu: [],
        khuTro: [],
        giaDienNuoc: DEFAULT_GIA_DIEN_NUOC,
      };
    }
  }

  // 2. API riêng chỉ lấy danh sách tin đăng cho trang Home từ phongTro.Controller
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

      const json = await res.json().catch(() => null);

      if (!res.ok || !json || json.success === false) {
        console.error(
          "Lỗi API /phong-tro/public/tin-dang:",
          json?.message || res.statusText,
        );
        return [];
      }

      return Array.isArray(json.data)
        ? json.data.map(normalizeTinDangItem)
        : [];
    } catch (error) {
      console.error("Lỗi khi tải danh sách tin đăng trang chủ:", error);
      return [];
    }
  }
}

export const getPublicHomeTinDang = (params?: HomeTinDangFilterParams) =>
  HomeService.getPublicTinDang(params);