// client/src/services/dienNuoc.service.ts
export interface ChiSoDienNuocItem {
  MaCS: number;
  MaPhong: number;
  SoDienCu: number;
  SoDienMoi: number;
  SoNuocCu: number;
  SoNuocMoi: number;
  NgayGhi: string;
  TenPhong: string;
  MaKhu: number;
  TenKhu: string;
  SoDienTieuThu: number;
  SoNuocTieuThu: number;
  DonGiaDienApDung: number;
  DonGiaNuocApDung: number;
  TienDienTamTinh: number;
  TienNuocTamTinh: number;
  TongTienDienNuoc: number;
}

export interface GiaDienNuocItem {
  MaGia: number;
  GiaDien: number | string;
  GiaNuoc: number | string;
  NgayApDung: string;
}

export interface KhuTroOption {
  MaKhu: number;
  TenKhu: string;
}

export interface PhongDienNuocOption {
  MaPhong: number;
  MaKhu: number;
  TenPhong: string;
  TrangThai: string;
  TenKhu: string;
  SoDienGoiY: number;
  SoNuocGoiY: number;
  NgayGhiGanNhat: string | null;
  DaGhiThangNay?: boolean;
  ChiSoThangNay?: {
    MaCS: number;
    SoDienCu: number;
    SoDienMoi: number;
    SoNuocCu: number;
    SoNuocMoi: number;
    NgayGhi: string;
  } | null;
}

export interface ChiSoPayload {
  MaPhong: number;
  SoDienCu?: number;
  SoDienMoi: number;
  SoNuocCu?: number;
  SoNuocMoi: number;
  NgayGhi: string;
}

export interface BulkChiSoItemPayload {
  MaPhong: number;
  SoDienMoi: number;
  SoNuocMoi: number;
}

export interface GiaDienNuocPayload {
  GiaDien: number;
  GiaNuoc: number;
  NgayApDung: string;
}

const AUTH_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/auth';
const API_ROOT = AUTH_URL.replace(/\/auth\/?$/, '');
const DIEN_NUOC_API = `${API_ROOT}/dien-nuoc`;

export const dienNuocService = {
  // 1. Lấy danh sách Khu trọ, Phòng (kèm chỉ số cũ khóa cứng & trạng thái ghi theo tháng)
  getOptions: async (thangNam: string = '') => {
    const qs = thangNam ? `?thangNam=${encodeURIComponent(thangNam)}` : '';
    const res = await fetch(`${DIEN_NUOC_API}/options${qs}`, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
    return res.json();
  },

  // 2. Lấy danh sách & lọc chỉ số điện nước
  getList: async (params?: {
    maKhu?: string | number;
    maPhong?: string | number;
    thangNam?: string;
    search?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.maKhu) query.set('maKhu', String(params.maKhu));
    if (params?.maPhong) query.set('maPhong', String(params.maPhong));
    if (params?.thangNam) query.set('thangNam', params.thangNam);
    if (params?.search?.trim()) query.set('search', params.search.trim());

    const qs = query.toString() ? `?${query.toString()}` : '';
    const res = await fetch(`${DIEN_NUOC_API}${qs}`, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
    return res.json();
  },

  // 3. Lấy chi tiết 1 bản ghi chỉ số
  getById: async (maCS: number | string) => {
    const res = await fetch(`${DIEN_NUOC_API}/chi-so/${maCS}`, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
    return res.json();
  },

  // 4. Thêm chỉ số điện nước cho 1 phòng
  createChiSo: async (payload: ChiSoPayload) => {
    const res = await fetch(`${DIEN_NUOC_API}/chi-so`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  // 5. Thêm chỉ số điện nước hàng loạt cho nhiều phòng
  createBulkChiSo: async (payload: {
    NgayGhi: string;
    DanhSachChiSo: BulkChiSoItemPayload[];
  }) => {
    const res = await fetch(`${DIEN_NUOC_API}/chi-so/hang-loat`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  // 6. Sửa chỉ số điện nước
  updateChiSo: async (
    maCS: number | string,
    payload: { SoDienMoi: number; SoNuocMoi: number; NgayGhi: string }
  ) => {
    const res = await fetch(`${DIEN_NUOC_API}/chi-so/${maCS}`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  // 7. Xóa chỉ số điện nước
  deleteChiSo: async (maCS: number | string) => {
    const res = await fetch(`${DIEN_NUOC_API}/chi-so/${maCS}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
    return res.json();
  },

  // 8. Lấy đơn giá hiện hành và lịch sử giá điện nước
  getGiaList: async () => {
    const res = await fetch(`${DIEN_NUOC_API}/gia`, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
    return res.json();
  },

  // 9. Cập nhật (thêm mốc mới) đơn giá điện nước
  createGia: async (payload: GiaDienNuocPayload) => {
    const res = await fetch(`${DIEN_NUOC_API}/gia`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  // 10. Sửa mốc đơn giá điện nước
  updateGia: async (maGia: number | string, payload: GiaDienNuocPayload) => {
    const res = await fetch(`${DIEN_NUOC_API}/gia/${maGia}`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  // 11. Xóa mốc đơn giá điện nước
  deleteGia: async (maGia: number | string) => {
    const res = await fetch(`${DIEN_NUOC_API}/gia/${maGia}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
    return res.json();
  },
};