// src/components/home/home.data.ts
import { KhuTroSummary } from "@/services/home.service";

const RAW_ENV_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
const API_ROOT = RAW_ENV_URL.replace(/\/auth\/?$/, "").replace(/\/$/, "");

export const PUBLIC_TIN_DANG_URL = API_ROOT.endsWith("/api")
  ? `${API_ROOT}/tin-dang/public`
  : `${API_ROOT}/api/tin-dang/public`;

export type TrangThaiTin = "DangHienThi" | "DaAn" | "HetHan";

export interface TinDangItem {
  MaTin: number;
  MaPhong: number;
  MaND: number;
  TieuDe: string;
  MoTa: string | null;
  NgayDang: string;
  NgayHetHan: string | null;
  TrangThai: TrangThaiTin;
  TenPhong: string;
  DienTich: number;
  Gia: number;
  TrangThaiPhong: string;
  MaKhu: number;
  TenKhu: string;
  DiaChiKhu?: string | null;
  DanhSachTienIch?: string | null;
  AnhDaiDien?: string | null;
  TenChuTro?: string | null;
  TenQuanLy?: string | null;
  HoTen?: string | null;
  SDTChuTro?: string | null;
  SDTQuanLy?: string | null;
  SDT?: string | null;
  SoDienThoai?: string | null;
}

export type KhuTroWithContact = KhuTroSummary & {
  TenQuanLy?: string | null;
  TenChuTro?: string | null;
  HoTen?: string | null;
  SDTQuanLy?: string | null;
  SDTChuTro?: string | null;
  SDT?: string | null;
  SoDienThoai?: string | null;
};

export interface ChatMessage {
  id: string;
  sender: "ai" | "user";
  text: string;
  time: string;
  suggestedRooms?: TinDangItem[];
}

export interface ManagerContactInfo {
  tenQuanLy: string;
  sdtHienThi: string;
  cleanPhone: string;
  hasPhoneFromDB: boolean;
  zaloUrl: string;
  telUrl: string;
}

export interface OwnerContactInfo {
  tenChuTro: string;
  sdtHienThi: string;
  cleanPhone: string;
  hasPhoneFromDB: boolean;
  zaloUrl: string;
  telUrl: string;
}

export const GOI_Y_CAU_HOI_AI = [
  "Hiện có những phòng nào đang trống?",
  "Đơn giá điện nước tính như thế nào?",
  "Cách liên hệ Zalo quản lý khu trọ?",
];

// Định dạng tiền tệ cố định không dùng Intl để tránh lỗi Hydration #418 (args[]=text)
export const formatVND = (amount: number | string) => {
  const numeric = Math.round(Number(amount) || 0);
  return numeric.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") + " đ";
};

// Định dạng ngày DD/MM/YYYY cố định theo GMT+7 không dùng Intl để Server (UTC) và Client khớp 100%
export const formatDateVN = (
  dateInput?: string | Date | null
): {
  formattedDate: string;
  isoDate?: string;
} => {
  if (!dateInput) return { formattedDate: "Mới cập nhật" };

  const rawStr = typeof dateInput === "string" ? dateInput.trim() : "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(rawStr)) {
    const [y, m, d] = rawStr.split("-");
    return {
      formattedDate: `${d}/${m}/${y}`,
      isoDate: `${rawStr}T00:00:00.000Z`,
    };
  }

  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return { formattedDate: "Mới cập nhật" };

  const vnTime = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  const dd = String(vnTime.getUTCDate()).padStart(2, "0");
  const mm = String(vnTime.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = vnTime.getUTCFullYear();

  return {
    formattedDate: `${dd}/${mm}/${yyyy}`,
    isoDate: date.toISOString(),
  };
};

export const extractManagerContact = (
  tin: TinDangItem,
  khuTroList: KhuTroWithContact[]
): ManagerContactInfo => {
  const khu = khuTroList.find((k) => Number(k.MaKhu) === Number(tin.MaKhu));

  const tenQuanLy =
    tin.TenQuanLy ||
    khu?.TenQuanLy ||
    tin.HoTen ||
    khu?.HoTen ||
    tin.TenChuTro ||
    khu?.TenChuTro ||
    `Quản lý ${tin.TenKhu}`;

  const rawPhone =
    tin.SDTQuanLy ||
    khu?.SDTQuanLy ||
    tin.SDT ||
    tin.SoDienThoai ||
    khu?.SDT ||
    khu?.SoDienThoai ||
    tin.SDTChuTro ||
    khu?.SDTChuTro ||
    "";

  const cleanPhone = String(rawPhone).replace(/[^0-9]/g, "");

  return {
    tenQuanLy,
    sdtHienThi: String(rawPhone).trim(),
    cleanPhone,
    hasPhoneFromDB: cleanPhone.length > 0,
    zaloUrl: cleanPhone ? `https://zalo.me/${cleanPhone}` : "#",
    telUrl: cleanPhone ? `tel:${cleanPhone}` : "#",
  };
};

export const extractOwnerContact = (
  tin: TinDangItem,
  khuTroList: KhuTroWithContact[]
): OwnerContactInfo => {
  const khu = khuTroList.find((k) => Number(k.MaKhu) === Number(tin.MaKhu));
  const anyKhuWithOwner = khuTroList.find(
    (k) => k.TenChuTro || k.SDTChuTro
  );

  const tenChuTro =
    tin.TenChuTro?.trim() ||
    khu?.TenChuTro?.trim() ||
    anyKhuWithOwner?.TenChuTro?.trim() ||
    "Nguyễn Thị Quỳnh Dư";

  const rawPhone =
    tin.SDTChuTro?.trim() ||
    khu?.SDTChuTro?.trim() ||
    anyKhuWithOwner?.SDTChuTro?.trim() ||
    "";

  const cleanPhone = String(rawPhone).replace(/[^0-9]/g, "");

  return {
    tenChuTro,
    sdtHienThi: String(rawPhone).trim(),
    cleanPhone,
    hasPhoneFromDB: cleanPhone.length > 0,
    zaloUrl: cleanPhone ? `https://zalo.me/${cleanPhone}` : "#",
    telUrl: cleanPhone ? `tel:${cleanPhone}` : "#",
  };
};