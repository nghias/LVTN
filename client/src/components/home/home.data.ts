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
    tieuDe: "Tư Vấn AI & Tìm Phòng",
    moTa: "Tra cứu phòng trống đa tiêu chí kết hợp trợ lý ảo AI Chatbot giải đáp quy định, chi phí và gợi ý phòng 24/7.",
    nhan: "AI Chatbot",
  },
  {
    buoc: "02",
    tieuDe: "Số Hóa Hợp Đồng & Tạm Trú",
    moTa: "Cấp tài khoản cư dân nội bộ, tra cứu hợp đồng điện tử minh bạch và khai báo tạm trú - tạm vắng trực tuyến.",
    nhan: "Hồ sơ số",
  },
  {
    buoc: "03",
    tieuDe: "Thu Thập Chỉ Số Điện Nước IoT",
    moTa: "Đồng hồ điện tử IoT tự động ghi nhận và đồng bộ chỉ số tiêu thụ điện, nước theo thời gian thực về máy chủ.",
    nhan: "Thiết bị IoT",
  },
  {
    buoc: "04",
    tieuDe: "Đối Soát QR & Gạch Nợ Tự Động",
    moTa: "Tự động lập hóa đơn hàng tháng, quét mã QR chuyển khoản, xác nhận giao dịch và tổng hợp báo cáo doanh thu.",
    nhan: "Auto Payment",
  },
];

export const NHOM_DOI_TUONG = [
  {
    vaiTro: "Khách Vãng Lai",
    doiTuong: "Đối với Người tìm phòng",
    moTaChinh:
      "Công cụ tra cứu phòng trống nhanh chóng, trực quan và sát với nhu cầu thực tế mà không qua trung gian rao vặt.",
    diemNhanCongNghe: "Tích hợp Trợ lý ảo AI Chatbot tư vấn tự động",
    tinhNang: [
      "Bộ lọc đa tiêu chí theo từng cơ sở, diện tích, mức giá thuê và tiện ích đi kèm.",
      "Niêm yết công khai đơn giá điện, nước và các khoản phí dịch vụ hàng tháng.",
      "AI Chatbot tự động giải đáp thắc mắc về nội quy, chi phí và gợi ý phòng phù hợp.",
      "Kết nối trực tiếp với chủ trọ để đặt lịch hẹn xem phòng nhanh chóng.",
    ],
  },
  {
    vaiTro: "Cư Dân Nội Bộ",
    doiTuong: "Đối với Người thuê trọ",
    moTaChinh:
      "Không gian quản lý cá nhân minh bạch, tiện lợi trong suốt quá trình cư trú thông qua tài khoản nội bộ được cấp phát.",
    diemNhanCongNghe: "Theo dõi điện nước IoT & Thanh toán QR tự động",
    tinhNang: [
      "Tra cứu chi tiết hợp đồng thuê phòng, danh mục tiện ích và phí dịch vụ đang áp dụng.",
      "Gửi yêu cầu khai báo tạm trú - tạm vắng và báo cáo sự cố cơ sở vật chất trực tuyến.",
      "Theo dõi chỉ số tiêu thụ điện, nước cập nhật tự động từ đồng hồ IoT kèm lịch sử hàng tháng.",
      "Kiểm tra hóa đơn chi tiết và quét mã QR thanh toán chuyển khoản tự động.",
    ],
  },
  {
    vaiTro: "Quản Trị Viên",
    doiTuong: "Đối với Chủ trọ đa cơ sở",
    moTaChinh:
      "Trung tâm điều hành tập trung giúp xóa bỏ hoàn toàn sổ sách giấy tờ thủ công và các file Excel rời rạc.",
    diemNhanCongNghe: "Đồng bộ IoT, Gạch nợ tự động & Báo cáo chuyên sâu",
    tinhNang: [
      "Quản lý đồng bộ nhiều cơ sở, thiết lập linh hoạt diện tích, tiện ích và định giá từng phòng.",
      "Toàn quyền cấp phát tài khoản, quản lý hồ sơ khách thuê, duyệt tạm trú và vòng đời hợp đồng.",
      "Tự động thu thập chỉ số điện nước từ thiết bị IoT về máy chủ và đối soát gạch nợ hóa đơn.",
      "Tổng hợp chính xác báo cáo thống kê doanh thu, công nợ và sản lượng tiêu thụ điện nước.",
    ],
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