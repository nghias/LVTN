// client/src/services/home.service.ts

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"
).replace(/\/+$/, "");

export interface TienIchItem {
  MaTI: number;
  TenTI: string;
  MoTa?: string | null;
}

export interface PhiDichVuItem {
  MaDV: number;
  TenDV: string;
  DonGia: number;
  DonViTinh: string;
  MoTa?: string | null;
}

export interface GiaDienNuocHome {
  MaGia: number;
  GiaDien: number;
  GiaNuoc: number;
  NgayApDung: string;
}

export interface KhuTroHome {
  MaKhu: number;
  MaND: number;
  TenKhu: string;
  DiaChi: string;
  MoTa?: string | null;
  TenQuanLy?: string;
  SDTQuanLy?: string | null;
  TenChuTro?: string;
  SDTChuTro?: string | null;
  TongSoPhong?: number;
  SoPhongTrong?: number;
}

export interface RoomImageItem {
  MaAnh: number;
  MaPhong?: number;
  DuongDan: string;
  AnhChinh: number;
}

export interface TinDangHome {
  MaTin: number;
  MaPhong: number;
  MaKhu: number;
  MaND?: number;
  TieuDe: string;
  MoTa?: string | null;
  NgayDang?: string | null;
  NgayHetHan?: string | null;
  TrangThai?: string;
  TrangThaiPhong: string;
  NhanTrangThai?: string;
  MauTrangThai?: "green" | "orange" | "red" | "slate" | string;
  CoTheDatCoc?: boolean;
  TenPhong: string;
  TenKhu: string;
  DiaChi?: string;
  Gia: number;
  DienTich: number;
  AnhDaiDien?: string | null;
  DanhSachAnh: (string | RoomImageItem)[];
  AnhPhongList?: RoomImageItem[];
  TienIch?: TienIchItem[];
  DanhSachTienIch: TienIchItem[];
  TenQuanLy?: string;
  SDTQuanLy?: string | null;
  TenChuTro?: string;
  SDTChuTro?: string;
}

export interface HomeDataResponse {
  tinDang: TinDangHome[];
  tienIch: TienIchItem[];
  phiDichVu: PhiDichVuItem[];
  khuTro: KhuTroHome[];
  giaDienNuoc: GiaDienNuocHome;
}

export interface HomeTinDangFilterParams {
  maKhu?: string;
  mucGia?: string;
  dienTich?: string;
}

const DEFAULT_GIA_DIEN_NUOC: GiaDienNuocHome = {
  MaGia: 1,
  GiaDien: 3800,
  GiaNuoc: 18000,
  NgayApDung: "2026-08-01",
};

// Xác định trạng thái phòng chuẩn hóa từ dữ liệu API
export function getRoomStatusInfo(item: Partial<TinDangHome> | any) {
  const raw = String(
    item?.TrangThaiPhong ??
      item?.PhongTrangThai ??
      (item?.TrangThai !== "DangHienThi" ? item?.TrangThai : "Trong") ??
      "Trong"
  )
    .trim()
    .toLowerCase();

  if (["dangthue", "đang thuê", "dachothue", "đã cho thuê"].includes(raw)) {
    return {
      TrangThaiPhong: "DangThue",
      NhanTrangThai: "Đã cho thuê",
      MauTrangThai: "red" as const,
      CoTheDatCoc: false,
    };
  }

  if (
    ["dadatcoc", "đã đặt cọc", "danggiucho", "đang giữ chỗ"].includes(raw) ||
    item?.CoTheDatCoc === false
  ) {
    if (["baotri", "bảo trì", "đang bảo trì"].includes(raw)) {
      return {
        TrangThaiPhong: "BaoTri",
        NhanTrangThai: "Đang bảo trì",
        MauTrangThai: "slate" as const,
        CoTheDatCoc: false,
      };
    }
    return {
      TrangThaiPhong: "DaDatCoc",
      NhanTrangThai: "Đang được cọc",
      MauTrangThai: "orange" as const,
      CoTheDatCoc: false,
    };
  }

  if (["baotri", "bảo trì", "đang bảo trì"].includes(raw)) {
    return {
      TrangThaiPhong: "BaoTri",
      NhanTrangThai: "Đang bảo trì",
      MauTrangThai: "slate" as const,
      CoTheDatCoc: false,
    };
  }

  return {
    TrangThaiPhong: "Trong",
    NhanTrangThai: "Còn trống",
    MauTrangThai: "green" as const,
    CoTheDatCoc: true,
  };
}

// Giữ tên hàm cũ để tương thích các file đang import: cho phép hiển thị TẤT CẢ phòng hợp lệ trên Trang chủ
export function isAvailablePublicTinDang(tin: any): boolean {
  return Boolean(tin && (Number(tin.MaPhong) > 0 || Number(tin.MaTin) > 0));
}

// Kiểm tra phòng có thể bấm đặt cọc hay không (chỉ phòng Còn trống & chưa đặt cọc)
export function isRoomBookable(tin: any): boolean {
  return getRoomStatusInfo(tin).CoTheDatCoc;
}

function extractRawRoomArray(json: any): any[] {
  if (!json) return [];
  if (Array.isArray(json.data?.phongList)) return json.data.phongList;
  if (Array.isArray(json.data?.tinDangList)) return json.data.tinDangList;
  if (Array.isArray(json.data?.tinDang)) return json.data.tinDang;
  if (Array.isArray(json.data)) return json.data;
  if (Array.isArray(json)) return json;
  return [];
}

function normalizeImageList(raw: any): RoomImageItem[] {
  const source = Array.isArray(raw?.AnhPhongList)
    ? raw.AnhPhongList
    : Array.isArray(raw?.DanhSachAnh)
      ? raw.DanhSachAnh
      : [];

  const result: RoomImageItem[] = [];
  source.forEach((img: any, idx: number) => {
    if (img && typeof img === "object" && typeof img.DuongDan === "string" && img.DuongDan.trim()) {
      result.push({
        MaAnh: Number(img.MaAnh) || idx + 1,
        MaPhong: Number(img.MaPhong || raw?.MaPhong || 0) || undefined,
        DuongDan: img.DuongDan.trim(),
        AnhChinh: Number(img.AnhChinh) === 1 ? 1 : 0,
      });
    } else if (typeof img === "string" && img.trim()) {
      result.push({
        MaAnh: idx + 1,
        MaPhong: Number(raw?.MaPhong || 0) || undefined,
        DuongDan: img.trim(),
        AnhChinh: idx === 0 ? 1 : 0,
      });
    }
  });

  if (result.length === 0 && typeof raw?.AnhDaiDien === "string" && raw.AnhDaiDien.trim()) {
    result.push({
      MaAnh: 1,
      MaPhong: Number(raw?.MaPhong || 0) || undefined,
      DuongDan: raw.AnhDaiDien.trim(),
      AnhChinh: 1,
    });
  }

  result.sort((a, b) => b.AnhChinh - a.AnhChinh);
  return result;
}

export function normalizeTinDangItem(raw: any): TinDangHome {
  const maPhong = Number(raw?.MaPhong || raw?.MaTin || 0);
  const images = normalizeImageList(raw);
  const tienIchList: TienIchItem[] = Array.isArray(raw?.TienIch)
    ? raw.TienIch
    : Array.isArray(raw?.DanhSachTienIch)
      ? raw.DanhSachTienIch
      : [];

  const statusMeta = getRoomStatusInfo(raw);
  const tenPhong = String(raw?.TenPhong || `P.${maPhong}`);
  const tenKhu = String(raw?.TenKhu || "");

  return {
    MaTin: maPhong,
    MaPhong: maPhong,
    MaKhu: Number(raw?.MaKhu || 0),
    MaND: Number(raw?.MaND || raw?.MaQuanLy || 0) || undefined,
    TieuDe:
      String(raw?.TieuDe || "").trim() ||
      `Phòng ${tenPhong}${tenKhu ? ` - ${tenKhu}` : ""}`,
    MoTa: raw?.MoTa || raw?.MoTaKhu || "",
    NgayDang: raw?.NgayDang || null,
    NgayHetHan: raw?.NgayHetHan || null,
    TrangThai: "DangHienThi",
    TrangThaiPhong: statusMeta.TrangThaiPhong,
    NhanTrangThai: raw?.NhanTrangThai || statusMeta.NhanTrangThai,
    MauTrangThai: raw?.MauTrangThai || statusMeta.MauTrangThai,
    CoTheDatCoc:
      typeof raw?.CoTheDatCoc === "boolean"
        ? raw.CoTheDatCoc
        : statusMeta.CoTheDatCoc,
    TenPhong: tenPhong,
    TenKhu: tenKhu,
    DiaChi: raw?.DiaChi || "",
    Gia: Number(raw?.Gia) || 0,
    DienTich: Number(raw?.DienTich) || 0,
    AnhDaiDien:
      images.length > 0 ? images[0].DuongDan : raw?.AnhDaiDien || null,
    DanhSachAnh: images,
    AnhPhongList: images,
    TienIch: tienIchList,
    DanhSachTienIch: tienIchList,
    TenQuanLy: raw?.TenQuanLy || raw?.TenNguoiLienHe || "Ban quản lý",
    SDTQuanLy: raw?.SDTQuanLy || raw?.SDTLienHe || null,
    TenChuTro: raw?.TenChuTro || raw?.TenQuanLy || "Ban quản lý",
    SDTChuTro: raw?.SDTChuTro || raw?.SDTQuanLy || "",
  };
}

export class HomeService {
  // 1. Lấy toàn bộ dữ liệu trang chủ (bao gồm TẤT CẢ phòng ở các cơ sở)
  static async getHomeData(): Promise<HomeDataResponse> {
    try {
      const [homeRes, publicRoomsRes] = await Promise.all([
        fetch(`${API_URL}/phong-tro/public/home-data`, {
          method: "GET",
          cache: "no-store",
        }).catch(() => null),
        fetch(`${API_URL}/phong-tro/public/phong`, {
          method: "GET",
          cache: "no-store",
        }).catch(() => null),
      ]);

      const homeJson = homeRes && homeRes.ok ? await homeRes.json().catch(() => null) : null;
      const rawHomeData = homeJson?.data || {};

      const homeRoomList = extractRawRoomArray({
        data: rawHomeData.phongList || rawHomeData.tinDang || [],
      }).map(normalizeTinDangItem);

      const publicJson =
        publicRoomsRes && publicRoomsRes.ok
          ? await publicRoomsRes.json().catch(() => null)
          : null;
      const publicRoomList = extractRawRoomArray(publicJson).map(
        normalizeTinDangItem
      );

      let finalRooms: TinDangHome[] = [];
      if (homeRoomList.length > 0) {
        finalRooms = homeRoomList;
      } else if (publicRoomList.length > 0) {
        finalRooms = publicRoomList;
      } else {
        finalRooms = await HomeService.getPublicTinDang().catch(() => []);
      }

      return {
        tinDang: finalRooms.filter(isAvailablePublicTinDang),
        tienIch: Array.isArray(rawHomeData.tienIch) ? rawHomeData.tienIch : [],
        phiDichVu: Array.isArray(rawHomeData.phiDichVu)
          ? rawHomeData.phiDichVu
          : [],
        khuTro: Array.isArray(rawHomeData.khuTro) ? rawHomeData.khuTro : [],
        giaDienNuoc: rawHomeData.giaDienNuoc || DEFAULT_GIA_DIEN_NUOC,
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

  // 2. Lấy danh sách toàn bộ phòng công khai (hỗ trợ lọc khu / giá / diện tích)
  static async getPublicTinDang(
    params?: HomeTinDangFilterParams
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
      const suffix = queryString ? `?${queryString}` : "";

      const primaryRes = await fetch(
        `${API_URL}/phong-tro/public/phong${suffix}`,
        {
          method: "GET",
          cache: "no-store",
        }
      ).catch(() => null);

      if (primaryRes && primaryRes.ok) {
        const primaryJson = await primaryRes.json().catch(() => null);
        const rawList = extractRawRoomArray(primaryJson);
        if (rawList.length > 0 || primaryJson?.success) {
          return rawList
            .map(normalizeTinDangItem)
            .filter(isAvailablePublicTinDang);
        }
      }

      // Fallback sang /tin-dang/public nếu có
      const fallbackRes = await fetch(`${API_URL}/tin-dang/public${suffix}`, {
        method: "GET",
        cache: "no-store",
      }).catch(() => null);

      if (!fallbackRes || !fallbackRes.ok) return [];
      const fallbackJson = await fallbackRes.json().catch(() => null);
      if (!fallbackJson || fallbackJson.success === false) return [];

      return extractRawRoomArray(fallbackJson)
        .map(normalizeTinDangItem)
        .filter(isAvailablePublicTinDang);
    } catch (error) {
      console.error("Lỗi khi tải danh sách phòng trang chủ:", error);
      return [];
    }
  }

  // 3. Lấy chi tiết 1 phòng công khai theo MaPhong
  static async getPublicRoomDetail(
    maPhong: number
  ): Promise<TinDangHome | null> {
    try {
      const res = await fetch(`${API_URL}/phong-tro/public/phong/${maPhong}`, {
        method: "GET",
        cache: "no-store",
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success || !json?.data) return null;
      return normalizeTinDangItem(json.data);
    } catch (error) {
      console.error("Lỗi khi tải chi tiết phòng:", error);
      return null;
    }
  }
}