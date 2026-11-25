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
  TrangThai: "HoatDong" | "ChoCapLai" | "DangGhiThe" | "BiKhoa" | "ThuHoi" | string;
  GhiChu: string | null;
  HoTen?: string;
  MaPhong?: number | null;
  TenPhong?: string | null;
  MaKhu?: number | null;
  TenKhu?: string | null;
}

export interface LichSuTheItem {
  MaLS: number;
  MaThe: number;
  MaUID?: string | null;
  NgayQuetThe: string;
  GioQuetThe: string;
  MaND?: number;
  HoTen?: string;
  TenPhong?: string | null;
  MaKhu?: number | null;
  TenKhu?: string | null;
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
  // Người thuê (KhachThue)
  getTheCuaToi: (params?: { tuNgay?: string; denNgay?: string }) => {
    const qs = new URLSearchParams();
    if (params?.tuNgay) qs.set("tuNgay", params.tuNgay);
    if (params?.denNgay) qs.set("denNgay", params.denNgay);
    const query = qs.toString() ? `?${qs.toString()}` : "";
    return request(`/cua-toi${query}`);
  },

  yeuCauCapLai: (payload: { lyDo: string; khoaTheCu: boolean }) =>
    request("/yeu-cau-cap-lai", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // Chủ trọ & Quản lý
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

  capLaiThe: (payload: {
    maND: number;
    maTheYeuCau?: number;
    ghiChu?: string;
  }) =>
    request("/cap-lai", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  khoaThe: (maThe: number, lyDo?: string) =>
    request(`/${maThe}/khoa`, {
      method: "PATCH",
      body: JSON.stringify({ lyDo }),
    }),

  getLichSuRaVao: (params?: {
    maKhu?: string;
    tuNgay?: string;
    denNgay?: string;
    keyword?: string;
  }) => {
    const qs = new URLSearchParams();
    if (params?.maKhu) qs.set("maKhu", params.maKhu);
    if (params?.tuNgay) qs.set("tuNgay", params.tuNgay);
    if (params?.denNgay) qs.set("denNgay", params.denNgay);
    if (params?.keyword) qs.set("keyword", params.keyword);
    const query = qs.toString() ? `?${qs.toString()}` : "";
    return request(`/lich-su${query}`);
  },
};