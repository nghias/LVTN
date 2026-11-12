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
}

export interface ManagerContactInfo {
  tenQuanLy: string;
  sdtHienThi: string;
  cleanPhone: string;
  hasPhoneFromDB: boolean;
  zaloUrl: string;
  telUrl: string;
}

export const VONG_LAP_VAN_HANH = [
  {
    buoc: "01",
    tieuDe: "Tìm phòng & Tư vấn cùng AI",
    nhan: "Nhanh chóng",
    moTa: "Xem hình ảnh, giá thuê thực tế và trò chuyện với Trợ lý ảo 24/7.",
  },
  {
    buoc: "02",
    tieuDe: "Hợp đồng",
    nhan: "Minh bạch",
    moTa: "Ký hợp đồng rõ ràng, lưu trữ hồ sơ và bảo mật an toàn.",
  },
  {
    buoc: "03",
    tieuDe: "Có hệ thống lấy số liệu nước tự động",
    nhan: "Chính xác",
    moTa: "Theo dõi tiêu thụ nước tự động.",
  },
  {
    buoc: "04",
    tieuDe: "Thanh toán Hóa đơn dễ dàng",
    nhan: "Tiện lợi",
    moTa: "Nhận thông báo hóa đơn và thanh toán nhanh chóng qua.",
  },
];


export const GOI_Y_CAU_HOI_AI = [
  "Hiện có những phòng nào đang trống?",
  "Đơn giá điện nước tính như thế nào?",
  "Cách liên hệ Zalo quản lý khu trọ?",
];

export const formatVND = (amount: number | string) =>
  new Intl.NumberFormat("vi-VN").format(Number(amount) || 0) + " đ";

export const extractManagerContact = (
  tin: TinDangItem,
  khuTroList: KhuTroWithContact[]
): ManagerContactInfo => {
  const khu = khuTroList.find((k) => Number(k.MaKhu) === Number(tin.MaKhu));

  const tenQuanLy =
    tin.TenQuanLy ||
    tin.TenChuTro ||
    tin.HoTen ||
    khu?.TenQuanLy ||
    khu?.TenChuTro ||
    khu?.HoTen ||
    `Quản lý ${tin.TenKhu}`;

  const rawPhone =
    tin.SDTQuanLy ||
    tin.SDTChuTro ||
    tin.SDT ||
    tin.SoDienThoai ||
    khu?.SDTQuanLy ||
    khu?.SDTChuTro ||
    khu?.SDT ||
    khu?.SoDienThoai ||
    "";

  const cleanPhone = rawPhone.replace(/[^0-9]/g, "");

  return {
    tenQuanLy,
    sdtHienThi: rawPhone.trim(),
    cleanPhone,
    hasPhoneFromDB: cleanPhone.length > 0,
    zaloUrl: cleanPhone ? `https://zalo.me/${cleanPhone}` : "#",
    telUrl: cleanPhone ? `tel:${cleanPhone}` : "#",
  };
};