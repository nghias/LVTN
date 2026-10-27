// client/src/services/thongBao.service.ts
import {
  CreateThongBaoPayload,
  ThongBaoChiTiet,
  ThongBaoItem,
  ThongBaoMetadata,
  ThongBaoReplyItem,
} from "../types/thongBao.type";

const RAW_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
const API_BASE = RAW_BASE.endsWith("/api")
  ? `${RAW_BASE}/thong-bao`
  : `${RAW_BASE}/api/thong-bao`;

const getAuthHeaders = () => {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : "";
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const thongBaoService = {
  async getMetadata(): Promise<ThongBaoMetadata> {
    const res = await fetch(`${API_BASE}/metadata`, {
      headers: getAuthHeaders(),
      credentials: "include",
    });
    const json = await res.json();
    if (!res.ok || !json.success)
      throw new Error(json.message || "Lỗi tải cấu hình");
    return json.data;
  },

  async getDanhSach(params: {
    keyword?: string;
    maLTB?: string;
    tab?: "da_gui" | "da_nhan";
  }): Promise<ThongBaoItem[]> {
    const query = new URLSearchParams();
    if (params.keyword) query.set("keyword", params.keyword);
    if (params.maLTB) query.set("maLTB", params.maLTB);
    if (params.tab) query.set("tab", params.tab);

    const res = await fetch(`${API_BASE}?${query.toString()}`, {
      headers: getAuthHeaders(),
      credentials: "include",
    });
    const json = await res.json();
    if (!res.ok || !json.success)
      throw new Error(json.message || "Lỗi tải danh sách");
    return json.data;
  },

// Lấy danh sách thông báo cho NotificationBell & Trang Người thuê
  async getThongBaoCuaToi(
    params:
      | number
      | {
          limit?: number;
          keyword?: string;
          maLTB?: string;
          trangThai?: string;
          tab?: "da_nhan" | "da_gui";
        } = 30
  ): Promise<{
    items: ThongBaoItem[];
    unreadCount: number;
    loaiThongBaoList?: { MaLTB: number; TenLTB: string; MoTa?: string }[];
    thongTinPhong?: {
      MaPhong: number;
      TenPhong: string;
      MaKhu: number;
      TenKhu: string;
      MaQuanLy: number;
      TenQuanLy: string;
    } | null;
  }> {
    const query = new URLSearchParams();
    if (typeof params === "number") {
      query.set("limit", String(params));
    } else {
      if (params.limit) query.set("limit", String(params.limit));
      if (params.keyword) query.set("keyword", params.keyword);
      if (params.maLTB) query.set("maLTB", params.maLTB);
      if (params.trangThai) query.set("trangThai", params.trangThai);
      if (params.tab) query.set("tab", params.tab);
    }

    const res = await fetch(`${API_BASE}/cua-toi?${query.toString()}`, {
      headers: getAuthHeaders(),
      credentials: "include",
    });
    const json = await res.json();
    if (!res.ok || !json.success)
      throw new Error(json.message || "Lỗi tải thông báo cá nhân");
    return json.data;
  },

  // Khách thuê gửi phản ánh / báo cáo sự cố
  async guiPhanAnh(payload: {
    maLTB: number;
    tieuDe: string;
    noiDung: string;
  }): Promise<{ message: string; data: ThongBaoItem }> {
    const res = await fetch(`${API_BASE}/phan-anh`, {
      method: "POST",
      headers: getAuthHeaders(),
      credentials: "include",
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok || !json.success)
      throw new Error(json.message || "Gửi phản ánh thất bại");
    return json;
  },

  // Xem chi tiết thông báo + danh sách phản hồi
  async getChiTiet(maTB: number): Promise<ThongBaoChiTiet> {
    const res = await fetch(`${API_BASE}/${maTB}/chi-tiet`, {
      headers: getAuthHeaders(),
      credentials: "include",
    });
    const json = await res.json();
    if (!res.ok || !json.success)
      throw new Error(json.message || "Lỗi tải chi tiết thông báo");
    return json.data;
  },

  // Gửi phản hồi / trả lời thông báo
  async traLoiThongBao(
    maTB: number,
    noiDung: string
  ): Promise<ThongBaoReplyItem> {
    const res = await fetch(`${API_BASE}/${maTB}/tra-loi`, {
      method: "POST",
      headers: getAuthHeaders(),
      credentials: "include",
      body: JSON.stringify({ noiDung }),
    });
    const json = await res.json();
    if (!res.ok || !json.success)
      throw new Error(json.message || "Gửi phản hồi thất bại");
    return json.data;
  },

  // Đánh dấu đã đọc 1 thông báo
  async danhDauDaDoc(maTB: number): Promise<void> {
    const res = await fetch(`${API_BASE}/${maTB}/da-doc`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      credentials: "include",
    });
    const json = await res.json();
    if (!res.ok || !json.success)
      throw new Error(json.message || "Lỗi đánh dấu đã đọc");
  },

  // Đánh dấu đã đọc tất cả
  async danhDauDaDocTatCa(): Promise<void> {
    const res = await fetch(`${API_BASE}/da-doc-tat-ca`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      credentials: "include",
    });
    const json = await res.json();
    if (!res.ok || !json.success)
      throw new Error(json.message || "Lỗi đánh dấu đã đọc tất cả");
  },

  async taoThongBao(payload: CreateThongBaoPayload): Promise<{
    message: string;
    data: ThongBaoItem;
  }> {
    const res = await fetch(API_BASE, {
      method: "POST",
      headers: getAuthHeaders(),
      credentials: "include",
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok || !json.success)
      throw new Error(json.message || "Gửi thông báo thất bại");
    return json;
  },

  async xoaThongBao(maTB: number): Promise<void> {
    const res = await fetch(`${API_BASE}/${maTB}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
      credentials: "include",
    });
    const json = await res.json();
    if (!res.ok || !json.success)
      throw new Error(json.message || "Xóa thông báo thất bại");
  },
};