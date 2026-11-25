// client/src/services/theRaVao.service.ts
const RAW_API_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://lvtn-mvac.onrender.com/api";
const API_ROOT = RAW_API_URL.replace(/\/auth\/?$/, "").replace(/\/+$/, "");
const BASE_URL = `${API_ROOT}/the-ra-vao`;

export interface KhuTroSimple {
  MaKhu: number;
  TenKhu: string;
}

export interface TheRaVaoItem {
  MaThe: number;
  MaND: number;
  MaUID: string | null;
  NgayTao: string;
  TrangThai: "HoatDong" | "ChoCapLai" | "BiKhoa" | "ThuHoi" | string;
  GhiChu: string | null;
  HoTen: string;
  SDT?: string | null;
  CCCD?: string | null;
  MaPhong?: number | null;
  TenPhong?: string | null;
  MaKhu?: number | null;
  TenKhu?: string | null;
  VaiTroHienThi?: string;
}

export interface NguoiChuaCoTheItem {
  MaND: number;
  HoTen: string;
  SDT: string | null;
  CCCD: string | null;
  MaPhong: number | null;
  TenPhong: string | null;
  MaKhu: number | null;
  TenKhu: string | null;
  VaiTroHienThi: string;
}

export interface LichSuTheItem {
  MaLS: number;
  MaThe: number;
  MaUID?: string | null;
  NgayQuetThe: string;
  GioQuetThe: string;
  MaND?: number;
  HoTen: string;
  TenPhong?: string | null;
  MaKhu?: number | null;
  TenKhu?: string | null;
}

export interface PhienGhiStatus {
  sessionId: string;
  mode: "NEW" | "REISSUE";
  status: "WAITING" | "SUCCESS" | "CANCELLED" | "EXPIRED" | "ERROR";
  remainingSec: number;
  lastError: string | null;
  result: {
    maThe: number;
    maND: number;
    uid: string;
    trangThai: string;
  } | null;
}

async function request(path: string, options?: RequestInit) {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers || {}),
    },
    credentials: "include",
    cache: "no-store",
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.message || `Lỗi máy chủ (${res.status})`);
  }
  return json;
}

export const theRaVaoService = {
  // Người thuê
  getTheCuaToi: (
    params?: { tuNgay?: string; denNgay?: string },
    options?: { silent?: boolean }
  ) => {
    const qs = new URLSearchParams();
    if (params?.tuNgay) qs.set("tuNgay", params.tuNgay);
    if (params?.denNgay) qs.set("denNgay", params.denNgay);
    const query = qs.toString() ? `?${qs.toString()}` : "";
    return request(`/cua-toi${query}`, {
      headers: options?.silent ? { "x-silent-fetch": "1" } : undefined,
    });
  },

  yeuCauCapLai: (payload: { lyDo: string }) =>
    request("/yeu-cau-cap-lai", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  

  // Chủ trọ & Quản lý
  getLichSuRaVao: (
    params?: {
      maKhu?: string;
      tuNgay?: string;
      denNgay?: string;
      keyword?: string;
    },
    options?: { silent?: boolean }
  ) => {
    const qs = new URLSearchParams();
    if (params?.maKhu) qs.set("maKhu", params.maKhu);
    if (params?.tuNgay) qs.set("tuNgay", params.tuNgay);
    if (params?.denNgay) qs.set("denNgay", params.denNgay);
    if (params?.keyword) qs.set("keyword", params.keyword);
    const query = qs.toString() ? `?${qs.toString()}` : "";
    return request(`/lich-su${query}`, {
      headers: options?.silent ? { "x-silent-fetch": "1" } : undefined,
    });
  },

  getDanhSachThe: (params?: {
    maKhu?: string;
    trangThai?: string;
    keyword?: string;
  }) => {
    const qs = new URLSearchParams();
    if (params?.maKhu) qs.set("maKhu", params.maKhu);
    if (params?.trangThai) qs.set("trangThai", params.trangThai);
    if (params?.keyword) qs.set("keyword", params.keyword);
    const query = qs.toString() ? `?${qs.toString()}` : "";
    return request(`/danh-sach${query}`);
  },

  getNguoiChuaCoThe: (maKhu?: string) => {
    const query = maKhu ? `?maKhu=${encodeURIComponent(maKhu)}` : "";
    return request(`/chua-co-the${query}`);
  },

  getChiTietThe: (maThe: number) => request(`/chi-tiet/${maThe}`),

  batDauPhienGhi: (payload: {
    mode: "NEW" | "REISSUE";
    maND?: number;
    maThe?: number;
    ghiChu?: string;
  }) =>
    request("/phien-ghi/bat-dau", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getTrangThaiPhienGhi: (sessionId: string) =>
    request(`/phien-ghi/${encodeURIComponent(sessionId)}`),

  huyPhienGhi: (sessionId: string) =>
    request(`/phien-ghi/${encodeURIComponent(sessionId)}/huy`, {
      method: "POST",
      keepalive: true,
    }),

  khoaThe: (maThe: number, lyDo?: string) =>
    request(`/${maThe}/khoa`, {
      method: "PATCH",
      body: JSON.stringify({ lyDo }),
    }),

  xoaThe: (maThe: number) =>
    request(`/${maThe}`, {
      method: "DELETE",
    }),
};