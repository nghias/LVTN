// client/src/services/hoaDon.service.ts

const RAW_ENV_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const API_ROOT = RAW_ENV_URL.replace(/\/auth\/?$/, '').replace(/\/$/, '');
const HOA_DON_API_URL = API_ROOT.endsWith('/api')
  ? `${API_ROOT}/hoa-don`
  : `${API_ROOT}/api/hoa-don`;

export interface KhuTroOption {
  MaKhu: number;
  TenKhu: string;
}

export interface PhongOption {
  MaPhong: number;
  TenPhong: string;
  MaKhu: number;
}

export interface DichVuTrongHoaDon {
  MaDV: number;
  TenDV: string;
  DonGia: number;
  DonViTinh: string;
  SoLuong: number;
  ThanhTien: number;
}

export interface PhatSinhItem {
  MaPS?: number;
  MaHD?: number;
  TenPS: string;
  Gia: number | string;
  GhiChu?: string;
}

export interface HoaDonItem {
  MaHD: number;
  MaCS: number;
  MaPhong: number;
  TenPhong: string;
  MaKhu: number;
  TenKhu: string;
  MaGia: number;
  TienPhong: number;
  TienDien: number;
  TienNuoc: number;
  TienPhuPhi: number;
  TienPhatSinh: number;
  TongTien: number;
  TienDaTra: number;
  ConNo: number;
  NgayTinh: string;
  NgayGhi?: string;
  SoDienCu: number;
  SoDienMoi: number;
  SoNuocCu: number;
  SoNuocMoi: number;
  TrangThaiThanhToan: 'ChuaThanhToan' | 'MotPhan' | 'DaThanhToan';
  SoKhoanPhatSinh?: number;
}

export interface HoaDonChiTiet extends HoaDonItem {
  DiaChiKhu?: string;
  DienTieuThu: number;
  NuocTieuThu: number;
  NgayGhiChiSo?: string;
  GiaDien: number;
  GiaNuoc: number;
  DanhSachDichVu: DichVuTrongHoaDon[];
  DanhSachPhatSinh: PhatSinhItem[];
}

export interface PhongTinhHoaDonPreview {
  MaPhong: number;
  TenPhong: string;
  MaKhu: number;
  TenKhu: string;
  TrangThaiPhong: string;
  MaHDT: number | null;
  MaCS: number | null;
  NgayGhiChiSo: string | null;
  SoDienCu: number;
  SoDienMoi: number;
  DienTieuThu: number;
  SoNuocCu: number;
  SoNuocMoi: number;
  NuocTieuThu: number;
  MaGia: number;
  GiaDien: number;
  GiaNuoc: number;
  TienPhong: number;
  TienDien: number;
  TienNuoc: number;
  TienPhuPhi: number;
  DanhSachDichVu: DichVuTrongHoaDon[];
  TongTienTamTinh: number;
  TrangThaiTao: 'DU_DIEU_KIEN' | 'DA_TAO' | 'CHUA_CO_CHI_SO' | 'CHI_SO_LOI';
  LyDoKhongTheTao: string;
  MaHDDaTao: number | null;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

// Hàm tiện ích tạo chuỗi Query Params
const buildQueryString = (params?: Record<string, any>): string => {
  if (!params) return '';
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      searchParams.append(key, String(value));
    }
  });
  const query = searchParams.toString();
  return query ? `?${query}` : '';
};

// Hàm gọi API dùng chung bằng fetch kèm Cookie xác thực
const requestHoaDon = async <T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> => {
  try {
    const res = await fetch(`${HOA_DON_API_URL}${endpoint}`, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });

    const json = await res.json().catch(() => null);
    if (!json) {
      return {
        success: false,
        message: 'Phản hồi từ máy chủ không hợp lệ.',
      };
    }

    return {
      success: Boolean(res.ok && json.success !== false),
      message: json.message,
      data: json.data,
    };
  } catch {
    return {
      success: false,
      message: 'Không thể kết nối đến hệ thống, vui lòng thử lại sau!',
    };
  }
};

export const hoaDonService = {
  // 1. Lấy danh sách hóa đơn
  getAll: async (params?: {
    maKhu?: number | string;
    maPhong?: number | string;
    thangNam?: string;
    trangThaiTT?: string;
    search?: string;
  }) => {
    const query = buildQueryString(params);
    return requestHoaDon<{
      hoaDonList: HoaDonItem[];
      khuTroList: KhuTroOption[];
      phongList: PhongOption[];
    }>(query, { method: 'GET' });
  },

  // 2. Lấy dữ liệu tự động tính toán trước khi tạo hóa đơn tháng
  getDuLieuTaoThang: async (params: { thangNam: string; maKhu?: number }) => {
    const query = buildQueryString(params);
    return requestHoaDon<{
      thangNam: string;
      giaApDung: any;
      khuTroList: KhuTroOption[];
      danhSachPhong: PhongTinhHoaDonPreview[];
    }>(`/du-lieu-tao${query}`, { method: 'GET' });
  },

  // 3. Tạo hóa đơn tháng (1 phòng hoặc nhiều phòng)
  createMonthlyInvoices: async (payload: {
    thangNam: string;
    ngayTinh: string;
    danhSachPhongTao: Array<{
      MaPhong: number;
      PhatSinhList: Array<{ TenPS: string; Gia: number; GhiChu?: string }>;
    }>;
  }) => {
    return requestHoaDon<{ createdIds: number[] }>('/tao-hoa-don', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // 4. Xem chi tiết hóa đơn
  getById: async (maHD: number) => {
    return requestHoaDon<HoaDonChiTiet>(`/${maHD}`, { method: 'GET' });
  },

  // 5. Sửa hóa đơn (sửa nhanh chỉ số điện nước + thêm/bỏ phí phát sinh)
  update: async (
    maHD: number,
    payload: {
      SoDienMoi: number;
      SoNuocMoi: number;
      NgayTinh: string;
      PhatSinhList: Array<{ TenPS: string; Gia: number; GhiChu?: string }>;
    }
  ) => {
    return requestHoaDon(`/${maHD}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  // 6. Xóa hóa đơn
  delete: async (maHD: number) => {
    return requestHoaDon(`/${maHD}`, {
      method: 'DELETE',
    });
  },
};