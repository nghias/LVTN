import {
  DatPhongItem,
  KetQuaHoanCoc,
  KhuTroBrief,
  KiemTraPayOSResponse,
  PayOSBookingQrResponse,
  PhuongThucHoanCoc,
  TaoYeuCauDatCocPayload,
  ThongKeDatPhong,
} from "@/types/datPhong.type";

const getApiBaseUrl = () => {
  const raw = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
  const trimmed = raw.replace(/\/auth\/?$/, "").replace(/\/+$/, "");
  return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
};

const getAuthHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (typeof window !== "undefined") {
    const token =
      localStorage.getItem("token") ||
      localStorage.getItem("accessToken") ||
      sessionStorage.getItem("token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }
  return headers;
};

export const datPhongService = {
  // 1. [Public] Tạo yêu cầu đặt cọc & lấy mã VietQR PayOS
  taoYeuCau: async (
    payload: TaoYeuCauDatCocPayload,
  ): Promise<{
    success: boolean;
    message?: string;
    data?: PayOSBookingQrResponse;
  }> => {
    const res = await fetch(`${getApiBaseUrl()}/dat-phong/tao-yeu-cau`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(
        json.message || "Không thể tạo yêu cầu đặt cọc giữ phòng.",
      );
    }
    return json;
  },

  // 2. [Public] Polling 3 giây kiểm tra trạng thái thanh toán PayOS
  kiemTraPayOS: async (
    orderCode: number | string,
  ): Promise<{
    success: boolean;
    message?: string;
    data: KiemTraPayOSResponse;
  }> => {
    const res = await fetch(
      `${getApiBaseUrl()}/dat-phong/kiem-tra-payos/${orderCode}`,
      {
        method: "GET",
        cache: "no-store",
      },
    );
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(
        json.message || "Không thể kiểm tra trạng thái thanh toán.",
      );
    }
    return json;
  },

  // 3. [Public] Lấy chi tiết biên lai bằng token hoặc SĐT
  layHoaDon: async (
    maTraCuu: string,
    params: { token?: string; sdt?: string },
  ): Promise<{ success: boolean; data: DatPhongItem }> => {
    const qs = new URLSearchParams();
    if (params.token) qs.set("token", params.token);
    if (params.sdt) qs.set("sdt", params.sdt);

    const res = await fetch(
      `${getApiBaseUrl()}/dat-phong/hoa-don/${encodeURIComponent(maTraCuu)}?${qs.toString()}`,
      {
        method: "GET",
        cache: "no-store",
      },
    );
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.message || "Không tìm thấy biên lai đặt cọc.");
    }
    return json;
  },

  // 4. [ChuTro, QuanLy] Lấy danh sách đơn quản lý theo phạm vi khu trọ
  layDanhSachQuanLy: async (filters?: {
    maKhu?: string | number;
    maPhong?: string | number;
    trangThai?: string;
    keyword?: string;
  }): Promise<{
    success: boolean;
    data: {
      danhSach: DatPhongItem[];
      thongKe: ThongKeDatPhong;
      khuTroList: KhuTroBrief[];
    };
  }> => {
    const qs = new URLSearchParams();
    if (filters?.maKhu && filters.maKhu !== "ALL")
      qs.set("maKhu", String(filters.maKhu));
    if (filters?.maPhong && filters.maPhong !== "ALL")
      qs.set("maPhong", String(filters.maPhong));
    if (filters?.trangThai && filters.trangThai !== "ALL")
      qs.set("trangThai", filters.trangThai);
    if (filters?.keyword?.trim()) qs.set("keyword", filters.keyword.trim());

    const res = await fetch(
      `${getApiBaseUrl()}/dat-phong/quan-ly?${qs.toString()}`,
      {
        method: "GET",
        headers: getAuthHeaders(),
        credentials: "include",
        cache: "no-store",
      },
    );
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.message || "Không thể tải danh sách đặt phòng.");
    }
    return json;
  },

  // 5. [ChuTro, QuanLy] Xác nhận hoàn cọc (ChotThue | KhongThue | TrungLap)
  xacNhanHoanCoc: async (
    maDP: number,
    payload: {
      ketQua: KetQuaHoanCoc;
      phuongThucHoan: PhuongThucHoanCoc;
      ghiChuHoanCoc?: string;
    },
  ): Promise<{ success: boolean; message: string; data: DatPhongItem }> => {
    const res = await fetch(`${getApiBaseUrl()}/dat-phong/${maDP}/hoan-coc`, {
      method: "PUT",
      headers: getAuthHeaders(),
      credentials: "include",
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.message || "Không thể xác nhận hoàn cọc.");
    }
    return json;
  },
  // 6. [ChuTro, QuanLy] Lấy thông tin chi tiết phòng
  layThongTinPhong: async (maPhong: number | string) => {
    const res = await fetch(`${getApiBaseUrl()}/dat-phong/phong/${maPhong}`, {
      method: "GET",
      cache: "no-store",
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.message || "Không thể tải thông tin phòng.");
    }
    return json as {
      success: boolean;
      data: {
        MaPhong: number;
        MaKhu: number;
        TenPhong: string;
        DienTich: number;
        Gia: number;
        TrangThai: string;
        TenKhu: string;
        DiaChi: string;
        TenQuanLy?: string;
        SDTQuanLy?: string;
      };
    };
  },
  // 7. [ChuTro, QuanLy] Hủy đơn quá hạn (Chưa thanh toán, chưa xác nhận)
  huyDonQuaHan: async (orderCode: number | string) => {
    const res = await fetch(
      `${getApiBaseUrl()}/dat-phong/huy-het-han/${encodeURIComponent(String(orderCode))}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
    );
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.message || "Không thể hủy đơn quá hạn.");
    }
    return json as {
      success: boolean;
      message?: string;
      data: {
        paid: boolean;
        trangThai: string;
        maTraCuu?: string;
        tokenTraCuu?: string;
      };
    };
  },
  // 8. [ChuTro, QuanLy] Xóa đơn đặt cọc đã hủy hoặc quá hạn
  xoaDatPhong: async (
    maDP: number,
  ): Promise<{ success: boolean; message: string }> => {
    const res = await fetch(`${getApiBaseUrl()}/dat-phong/${maDP}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
      credentials: "include",
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.message || "Không thể xóa hóa đơn đặt cọc.");
    }
    return json;
  },
};
