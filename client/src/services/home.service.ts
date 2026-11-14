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

export interface AnhPhongHomeItem {
  MaAnh?: number;
  MaPhong?: number;
  DuongDan: string;
  AnhChinh?: number;
}

export type TrangThaiPhongType =
  | "Trong"
  | "ConTrong"
  | "Trống"
  | "Còn trống"
  | "DangThue"
  | "BaoTri"
  | string;

export interface TinDangHome {
  MaTin: number;
  TieuDe: string;
  MoTa: string | null;
  NgayDang: string;
  NgayHetHan: string | null;
  TrangThaiTin: "DangHienThi" | "DaAn" | "HetHan" | string;
  TrangThai?: "DangHienThi" | "DaAn" | "HetHan" | string;
  MaPhong: number;
  TenPhong: string;
  DienTich: number;
  Gia: number;
  TrangThaiPhong: TrangThaiPhongType;
  MaKhu: number;
  TenKhu: string;
  DiaChi: string;
  TenChuTro: string;
  SDTChuTro: string;
  TenQuanLy?: string;
  SDTQuanLy?: string | null;
  AnhDaiDien?: string | null;
  DanhSachAnh: string[];
  AnhPhongList?: AnhPhongHomeItem[];
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
  TenChuTro?: string;
  SDTChuTro?: string | null;
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

interface OwnerInfo {
  TenChuTro: string;
  SDTChuTro: string;
}

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"
).replace(/\/+$/, "");
const SERVER_ORIGIN = API_URL.replace(/\/api\/?$/, "");

const DEFAULT_GIA_DIEN_NUOC: GiaDienNuocHome = {
  MaGia: 1,
  GiaDien: 3500,
  GiaNuoc: 15000,
  NgayApDung: new Date().toISOString().split("T")[0],
};

// Thông tin Chủ trọ mặc định (MaND = 1, Quyen = 'ChuTro') dùng khi API trả nhầm Quản lý vào trường Chủ trọ
const DEFAULT_CHU_TRO: OwnerInfo = {
  TenChuTro: "Nguyễn Thị Quỳnh Dư",
  SDTChuTro: "0903112233",
};

const TRANG_THAI_PHONG_TRONG = ["Trong", "ConTrong", "Trống", "Còn trống"];

function cleanPhone(raw?: any): string {
  if (!raw) return "";
  return String(raw).replace(/[^0-9]/g, "");
}

// Kiểm tra phòng đang Còn trống và tin đăng Đang hiển thị
export function isAvailablePublicTinDang(item: Partial<TinDangHome>): boolean {
  const trangThaiPhong = String(item.TrangThaiPhong || "").trim();
  const trangThaiTin = String(
    item.TrangThai || item.TrangThaiTin || ""
  ).trim();

  return (
    TRANG_THAI_PHONG_TRONG.includes(trangThaiPhong) &&
    trangThaiTin === "DangHienThi"
  );
}

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

// Trích xuất thông tin Chủ trọ thực sự (Quyen = 'ChuTro'), tránh lấy nhầm Quản lý cơ sở
function resolveTrueOwnerInfo(
  rawHomeData?: any,
  khuList: any[] = [],
  tinList: any[] = []
): OwnerInfo {
  // 1. Nếu API home-data có trả riêng object chuTro
  const rawChuTro = rawHomeData?.chuTro || rawHomeData?.owner;
  if (rawChuTro && typeof rawChuTro === "object") {
    const ten = String(
      rawChuTro.TenChuTro || rawChuTro.HoTen || rawChuTro.TenTK || ""
    ).trim();
    const sdt = cleanPhone(
      rawChuTro.SDTChuTro || rawChuTro.SDT || rawChuTro.SoDienThoai
    );
    if (ten && sdt) {
      return { TenChuTro: ten, SDTChuTro: sdt };
    }
  }

  // Tập hợp tên & SĐT của các Quản lý cơ sở để loại trừ
  const managerNames = new Set<string>();
  const managerPhones = new Set<string>();

  for (const k of khuList) {
    const mName = String(k?.TenQuanLy || "").trim().toLowerCase();
    const mPhone = cleanPhone(k?.SDTQuanLy);
    if (mName) managerNames.add(mName);
    if (mPhone) managerPhones.add(mPhone);
  }

  for (const t of tinList) {
    const mName = String(t?.TenQuanLy || "").trim().toLowerCase();
    const mPhone = cleanPhone(t?.SDTQuanLy);
    if (mName) managerNames.add(mName);
    if (mPhone) managerPhones.add(mPhone);
  }

  // 2. Tìm trong khuList hoặc tinList bản ghi có TenChuTro/SDTChuTro KHÔNG trùng với Quản lý
  for (const source of [...khuList, ...tinList]) {
    const candidateName = String(source?.TenChuTro || "").trim();
    const candidatePhone = cleanPhone(source?.SDTChuTro);

    const isManagerName =
      candidateName && managerNames.has(candidateName.toLowerCase());
    const isManagerPhone =
      candidatePhone && managerPhones.has(candidatePhone);

    if (
      candidateName &&
      candidatePhone &&
      !isManagerName &&
      !isManagerPhone
    ) {
      return {
        TenChuTro: candidateName,
        SDTChuTro: candidatePhone,
      };
    }
  }

  return DEFAULT_CHU_TRO;
}

function normalizeTinDangItem(
  item: any,
  ownerInfo: OwnerInfo = DEFAULT_CHU_TRO,
  khuMap?: Map<number, KhuTroSummary>
): TinDangHome {
  // 1. Chuẩn hóa danh sách AnhPhongList (nếu BE trả về từ bảng AnhPhong)
  const rawAnhPhongList: any[] = Array.isArray(item?.AnhPhongList)
    ? item.AnhPhongList
    : [];

  const normalizedAnhPhongList: AnhPhongHomeItem[] = rawAnhPhongList
    .map((img): AnhPhongHomeItem | null => {
      const fullUrl = resolveHomeRoomImageUrl(img);
      if (!fullUrl) return null;
      return {
        MaAnh: img?.MaAnh ? Number(img.MaAnh) : undefined,
        MaPhong: img?.MaPhong ? Number(img.MaPhong) : Number(item?.MaPhong),
        DuongDan: fullUrl,
        AnhChinh: Number(img?.AnhChinh) === 1 ? 1 : 0,
      };
    })
    .filter((img): img is AnhPhongHomeItem => img !== null);

  // 2. Chuẩn hóa danh sách DanhSachAnh
  const rawDanhSachAnh: any[] = Array.isArray(item?.DanhSachAnh)
    ? item.DanhSachAnh
    : [];

  const urlsFromDanhSachAnh = rawDanhSachAnh
    .map((img) => resolveHomeRoomImageUrl(img))
    .filter((url): url is string => Boolean(url));

  const urlsFromAnhPhongList = normalizedAnhPhongList.map((img) => img.DuongDan);

  const mainImage =
    resolveHomeRoomImageUrl(item?.AnhDaiDien) ||
    urlsFromAnhPhongList[0] ||
    urlsFromDanhSachAnh[0] ||
    null;

  // 3. Gộp tất cả ảnh và loại bỏ trùng lặp sau khi đã chuẩn hóa thành full URL
  const allUniqueImages = Array.from(
    new Set([
      ...urlsFromAnhPhongList,
      ...urlsFromDanhSachAnh,
      ...(mainImage ? [mainImage] : []),
    ])
  );

  const maKhu = Number(item?.MaKhu || 0);
  const matchedKhu = khuMap?.get(maKhu);

  // 4. Tách bạch thông tin Quản lý cơ sở và Chủ trọ
  const rawTenQuanLy = String(
    item?.TenQuanLy || matchedKhu?.TenQuanLy || ""
  ).trim();
  const rawSDTQuanLy = cleanPhone(
    item?.SDTQuanLy || matchedKhu?.SDTQuanLy
  );

  const rawTenChuTro = String(item?.TenChuTro || "").trim();
  const rawSDTChuTro = cleanPhone(item?.SDTChuTro);

  // Kiểm tra xem trường TenChuTro/SDTChuTro từ BE có đang bị lấy nhầm thành Quản lý không
  const isOwnerFieldActuallyManager =
    (rawTenQuanLy &&
      rawTenChuTro.toLowerCase() === rawTenQuanLy.toLowerCase()) ||
    (rawSDTQuanLy && rawSDTChuTro === rawSDTQuanLy) ||
    item?.Quyen === "QuanLy" ||
    item?.QuyenNguoiDang === "QuanLy";

  // Nếu BE chưa trả TenQuanLy mà lại đổ tên Quản lý vào TenChuTro thì giữ lại cho TenQuanLy
  const finalTenQuanLy =
    rawTenQuanLy ||
    (rawTenChuTro && rawTenChuTro !== ownerInfo.TenChuTro
      ? rawTenChuTro
      : undefined);

  const finalSDTQuanLy =
    rawSDTQuanLy ||
    (rawSDTChuTro && rawSDTChuTro !== ownerInfo.SDTChuTro
      ? rawSDTChuTro
      : null);

  const finalTenChuTro =
    !isOwnerFieldActuallyManager &&
    rawTenChuTro &&
    rawTenChuTro.toLowerCase() !== (finalTenQuanLy || "").toLowerCase()
      ? rawTenChuTro
      : ownerInfo.TenChuTro;

  const finalSDTChuTro =
    !isOwnerFieldActuallyManager &&
    rawSDTChuTro &&
    rawSDTChuTro !== (finalSDTQuanLy || "")
      ? rawSDTChuTro
      : ownerInfo.SDTChuTro;

  const trangThaiTin = String(
    item?.TrangThai || item?.TrangThaiTin || "DangHienThi"
  ).trim();
  const trangThaiPhong = String(item?.TrangThaiPhong || "Trong").trim();

  return {
    ...item,
    MaTin: Number(item.MaTin),
    MaPhong: Number(item.MaPhong),
    MaKhu: maKhu,
    DienTich: Number(item.DienTich || 0),
    Gia: Number(item.Gia || 0),
    TrangThaiTin: trangThaiTin,
    TrangThai: trangThaiTin,
    TrangThaiPhong: trangThaiPhong,
    TenQuanLy: finalTenQuanLy,
    SDTQuanLy: finalSDTQuanLy,
    TenChuTro: finalTenChuTro,
    SDTChuTro: finalSDTChuTro,
    AnhDaiDien: mainImage,
    DanhSachAnh: allUniqueImages,
    AnhPhongList:
      normalizedAnhPhongList.length > 0
        ? normalizedAnhPhongList
        : allUniqueImages.map((url, idx) => ({
            MaPhong: Number(item.MaPhong),
            DuongDan: url,
            AnhChinh: idx === 0 ? 1 : 0,
          })),
    DanhSachTienIch: Array.isArray(item.DanhSachTienIch)
      ? item.DanhSachTienIch
      : Array.isArray(item.TienIch)
        ? item.TienIch
        : [],
  };
}

// Trích xuất mảng tin đăng từ nhiều định dạng response khác nhau của BE
function extractRawTinDangArray(json: any): any[] {
  if (!json) return [];
  if (Array.isArray(json.data)) return json.data;
  if (Array.isArray(json.data?.tinDangList)) return json.data.tinDangList;
  if (Array.isArray(json.data?.tinDang)) return json.data.tinDang;
  return [];
}

export class HomeService {
  // 1. Lấy toàn bộ dữ liệu khởi tạo trang Home (Kết hợp /phong-tro/public/home-data và /tin-dang/public để có đủ ảnh)
  static async getHomeData(): Promise<HomeDataPayload> {
    try {
      const [homeRes, publicTinRes] = await Promise.allSettled([
        fetch(`${API_URL}/phong-tro/public/home-data`, {
          method: "GET",
          cache: "no-store",
        }),
        fetch(`${API_URL}/tin-dang/public`, {
          method: "GET",
          cache: "no-store",
        }),
      ]);

      let homeJson: any = null;
      if (homeRes.status === "fulfilled" && homeRes.value.ok) {
        homeJson = await homeRes.value.json().catch(() => null);
      }

      let publicTinJson: any = null;
      if (publicTinRes.status === "fulfilled" && publicTinRes.value.ok) {
        publicTinJson = await publicTinRes.value.json().catch(() => null);
      }

      const rawHomeData = homeJson?.data || {};
      const rawKhuList: any[] = Array.isArray(rawHomeData.khuTro)
        ? rawHomeData.khuTro
        : [];
      const rawHomeTinList: any[] = Array.isArray(rawHomeData.tinDang)
        ? rawHomeData.tinDang
        : [];
      const rawPublicTinList: any[] = extractRawTinDangArray(publicTinJson);

      // Xác định đúng thông tin Chủ trọ (MaND = 1, Quyen = 'ChuTro')
      const ownerInfo = resolveTrueOwnerInfo(
        rawHomeData,
        rawKhuList,
        [...rawHomeTinList, ...rawPublicTinList]
      );

      // Chuẩn hóa danh sách KhuTrọ kèm thông tin Quản lý & Chủ trọ
      const normalizedKhuTro: KhuTroSummary[] = rawKhuList.map((k: any) => ({
        ...k,
        MaKhu: Number(k.MaKhu),
        MaND: k.MaND ? Number(k.MaND) : undefined,
        TenKhu: String(k.TenKhu || "").trim(),
        DiaChi: String(k.DiaChi || "").trim(),
        MoTa: k.MoTa ?? null,
        TenQuanLy: k.TenQuanLy || k.HoTen || undefined,
        SDTQuanLy: cleanPhone(k.SDTQuanLy || k.SDT || k.SoDienThoai) || null,
        TenChuTro: ownerInfo.TenChuTro,
        SDTChuTro: ownerInfo.SDTChuTro,
        TongSoPhong: Number(k.TongSoPhong || 0),
        SoPhongTrong: Number(k.SoPhongTrong || 0),
      }));

      const khuMap = new Map<number, KhuTroSummary>(
        normalizedKhuTro.map((k) => [k.MaKhu, k])
      );

      const homeTinList = rawHomeTinList.map((item) =>
        normalizeTinDangItem(item, ownerInfo, khuMap)
      );
      const publicTinList = rawPublicTinList.map((item) =>
        normalizeTinDangItem(item, ownerInfo, khuMap)
      );

      // Gộp dữ liệu ảnh đầy đủ từ /tin-dang/public với thông tin tiện ích từ /home-data
      let mergedTinDang: TinDangHome[] = [];

      if (publicTinList.length > 0 && homeTinList.length > 0) {
        const homeTinMap = new Map<number, TinDangHome>(
          homeTinList.map((t: TinDangHome) => [t.MaTin, t])
        );
        mergedTinDang = publicTinList.map((pubTin) => {
          const matchedHomeTin = homeTinMap.get(pubTin.MaTin);
          if (!matchedHomeTin) return pubTin;

          const combinedImages = Array.from(
            new Set([...pubTin.DanhSachAnh, ...matchedHomeTin.DanhSachAnh])
          );

          return {
            ...matchedHomeTin,
            ...pubTin,
            TenQuanLy: pubTin.TenQuanLy || matchedHomeTin.TenQuanLy,
            SDTQuanLy: pubTin.SDTQuanLy || matchedHomeTin.SDTQuanLy,
            TenChuTro: ownerInfo.TenChuTro,
            SDTChuTro: ownerInfo.SDTChuTro,
            AnhDaiDien: pubTin.AnhDaiDien || matchedHomeTin.AnhDaiDien,
            DanhSachAnh: combinedImages,
            AnhPhongList:
              pubTin.AnhPhongList && pubTin.AnhPhongList.length > 0
                ? pubTin.AnhPhongList
                : matchedHomeTin.AnhPhongList,
            DanhSachTienIch:
              pubTin.DanhSachTienIch.length > 0
                ? pubTin.DanhSachTienIch
                : matchedHomeTin.DanhSachTienIch,
          };
        });
      } else if (publicTinList.length > 0) {
        mergedTinDang = publicTinList;
      } else if (homeTinList.length > 0) {
        mergedTinDang = homeTinList;
      } else {
        mergedTinDang = await HomeService.getPublicTinDang().catch(() => []);
      }

      return {
        tinDang: mergedTinDang.filter(isAvailablePublicTinDang),
        tienIch: Array.isArray(rawHomeData.tienIch) ? rawHomeData.tienIch : [],
        phiDichVu: Array.isArray(rawHomeData.phiDichVu)
          ? rawHomeData.phiDichVu
          : [],
        khuTro: normalizedKhuTro,
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

  // 2. API lấy danh sách tin đăng công khai (Hỗ trợ cả /tin-dang/public và /phong-tro/public/tin-dang)
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

      const primaryRes = await fetch(`${API_URL}/tin-dang/public${suffix}`, {
        method: "GET",
        cache: "no-store",
      }).catch(() => null);

      if (primaryRes && primaryRes.ok) {
        const primaryJson = await primaryRes.json().catch(() => null);
        const rawList = extractRawTinDangArray(primaryJson);
        if (rawList.length > 0 || primaryJson?.success) {
          const ownerInfo = resolveTrueOwnerInfo(primaryJson?.data, [], rawList);
          return rawList
            .map((item) => normalizeTinDangItem(item, ownerInfo))
            .filter(isAvailablePublicTinDang);
        }
      }

      const fallbackRes = await fetch(
        `${API_URL}/phong-tro/public/tin-dang${suffix}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const fallbackJson = await fallbackRes.json().catch(() => null);
      if (!fallbackRes.ok || !fallbackJson || fallbackJson.success === false) {
        return [];
      }

      const fallbackRawList = extractRawTinDangArray(fallbackJson);
      const ownerInfo = resolveTrueOwnerInfo(
        fallbackJson?.data,
        [],
        fallbackRawList
      );

      return fallbackRawList
        .map((item) => normalizeTinDangItem(item, ownerInfo))
        .filter(isAvailablePublicTinDang);
    } catch (error) {
      console.error("Lỗi khi tải danh sách tin đăng trang chủ:", error);
      return [];
    }
  }

  // 3. Lấy chi tiết 1 phòng & toàn bộ ảnh theo MaTin (Hỗ trợ fallback từ getHomeData)
  static async getPublicTinDangDetail(
    maTin: number
  ): Promise<TinDangHome | null> {
    try {
      const homeData = await HomeService.getHomeData();
      const khuMap = new Map<number, KhuTroSummary>(
        homeData.khuTro.map((k) => [k.MaKhu, k])
      );
      const ownerInfo: OwnerInfo = {
        TenChuTro:
          homeData.khuTro[0]?.TenChuTro || DEFAULT_CHU_TRO.TenChuTro,
        SDTChuTro:
          homeData.khuTro[0]?.SDTChuTro || DEFAULT_CHU_TRO.SDTChuTro,
      };

      const res = await fetch(`${API_URL}/tin-dang/public/${maTin}`, {
        method: "GET",
        cache: "no-store",
      }).catch(() => null);

      if (res && res.ok) {
        const json = await res.json().catch(() => null);
        const rawTin = json?.data?.tinDang || json?.data;
        if (rawTin && typeof rawTin === "object" && !Array.isArray(rawTin)) {
          const normalized = normalizeTinDangItem(rawTin, ownerInfo, khuMap);
          if (isAvailablePublicTinDang(normalized)) {
            return normalized;
          }
        }
      }

      // Fallback: Tìm trong danh sách tổng hợp của HomeData nếu endpoint lẻ không trả về
      const matched = homeData.tinDang.find(
        (item) => Number(item.MaTin) === Number(maTin)
      );
      return matched || null;
    } catch (error) {
      console.error("Lỗi khi tải chi tiết tin đăng:", error);
      return null;
    }
  }
}

export const getPublicHomeTinDang = (params?: HomeTinDangFilterParams) =>
  HomeService.getPublicTinDang(params);