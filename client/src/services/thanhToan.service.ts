// client/src/services/thanhToan.service.ts

const RAW_ENV_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const API_ROOT = RAW_ENV_URL.replace(/\/auth\/?$/, '').replace(/\/$/, '');
const THANH_TOAN_API_URL = API_ROOT.endsWith('/api')
  ? `${API_ROOT}/thanh-toan`
  : `${API_ROOT}/api/thanh-toan`;

export interface KhuTroOption {
  MaKhu: number;
  TenKhu: string;
  DiaChi?: string;
}

export interface ThongTinThanhToan {
  MaTT: number;
  MaND: number;
  TenNganHang: string;
  STK: string;
  ChuTaiKhoan: string;
}

export interface GiaoDichThanhToan {
  MaTT: number;
  MaHD: number;
  NgayTT: string;
  SoTien: number;
  PhuongThuc: 'ChuyenKhoan' | 'TienMat' | string;
  MinhChung?: string | null;
  GhiChu?: string | null;
  TrangThai: 'ChoXacNhan' | 'ThanhCong' | 'TuChoi' | string;
  MaPhong?: number | null;
  MaKhu?: number | null;
  TenPhong?: string;
  TenKhu?: string;
  TenKhachThue?: string;
  NgayTinhHoaDon?: string;
  TongTienHoaDon?: number;
  OrderCode?: number | null;
}

export interface HoaDonThanhToanItem {
  MaHD: number;
  MaCS: number;
  MaPhong: number;
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
  TrangThaiThanhToan: 'ChuaThanhToan' | 'MotPhan' | 'DaThanhToan';
  CoGiaoDichChoXacNhan: boolean;
  MaKhu: number | null;
  TenPhong: string;
  TenKhu: string;
  TenKhachThue: string;
  SDTKhachThue: string;
}

export interface PayOSQrData {
  MaTT: number;
  MaHD: number;
  orderCode: number;
  amount: number;
  description: string;
  checkoutUrl: string | null;
  qrCode: string | null;
  accountNumber: string;
  accountName: string;
  bin?: string;
  thongTinNganHang?: ThongTinThanhToan | null;
  payosNote?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  canEdit?: boolean;
  list?: ThongTinThanhToan[];
  paid?: boolean;
  status?: string;
  tienDaTra?: number;
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

// Hàm gọi API dùng chung bằng fetch kèm Cookie xác thực (đồng bộ với hoaDon.service.ts)
const requestThanhToan = async <T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> => {
  try {
    const res = await fetch(`${THANH_TOAN_API_URL}${endpoint}`, {
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
      ...json,
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

export const thanhToanService = {
  // 1. Lấy thông tin tài khoản ngân hàng nhận thanh toán
  getThongTinThanhToan: async () => {
    return requestThanhToan<ThongTinThanhToan | null>('/thong-tin', {
      method: 'GET',
    });
  },

  // 2. Cập nhật thông tin tài khoản nhận thanh toán (Chỉ Chủ trọ mới có quyền)
  updateThongTinThanhToan: async (payload: {
    MaTT?: number;
    TenNganHang: string;
    STK: string;
    ChuTaiKhoan: string;
  }) => {
    return requestThanhToan<ThongTinThanhToan>('/thong-tin', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  // 3. Lấy dữ liệu tổng hợp (Thông tin NH, Danh sách công nợ hóa đơn & Lịch sử thanh toán)
  getTongHop: async (params?: {
    maKhu?: number | string;
    maPhong?: number | string;
    trangThai?: string;
    search?: string;
  }) => {
    const query = buildQueryString(params);
    return requestThanhToan<{
      thongTinThanhToan: ThongTinThanhToan | null;
      canEditPaymentInfo: boolean;
      khuTroList: KhuTroOption[];
      hoaDonList: HoaDonThanhToanItem[];
      lichSuThanhToan: GiaoDichThanhToan[];
    }>(`/tong-hop${query}`, { method: 'GET' });
  },

  // 4. Lấy chi tiết thanh toán của 1 Hóa đơn theo MaHD
  getChiTietHoaDon: async (maHD: number | string) => {
    return requestThanhToan<{
      hoaDon: HoaDonThanhToanItem;
      thongTinThanhToan: ThongTinThanhToan | null;
      lichSuThanhToan: GiaoDichThanhToan[];
    }>(`/hoa-don/${maHD}`, { method: 'GET' });
  },

  // 5. Tạo giao dịch chuyển khoản & sinh mã QR tự động qua PayOS
  taoLinkPayOS: async (payload: { MaHD: number; SoTien?: number }) => {
    return requestThanhToan<PayOSQrData>('/tao-link-payos', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // 6. Kiểm tra trạng thái thanh toán tự động từ PayOS theo MaTT
  kiemTraPayOS: async (maTT: number | string) => {
    return requestThanhToan(`/kiem-tra-payos/${maTT}`, {
      method: 'GET',
    });
  },

  // 7. Người thuê gửi yêu cầu xác nhận đã trả tiền mặt
  guiYeuCauTienMat: async (payload: {
    MaHD: number;
    SoTien?: number;
    GhiChu?: string;
    MinhChung?: string;
  }) => {
    return requestThanhToan<{ MaTT: number }>('/tien-mat/yeu-cau', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // 8. Chủ trọ / Quản lý xác nhận thu tiền mặt trực tiếp trên Hóa đơn
  thuTienMatTrucTiep: async (payload: {
    MaHD: number;
    SoTien: number;
    PhuongThuc?: string;
    GhiChu?: string;
    MinhChung?: string;
  }) => {
    return requestThanhToan<{ MaTT: number; TienDaTraMoi: number }>(
      '/xac-nhan-truc-tiep',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  },

  // 9. Chủ trọ / Quản lý duyệt xác nhận trả ('ThanhCong') hoặc từ chối ('TuChoi') giao dịch
  duyetGiaoDich: async (
    maTT: number | string,
    payload: { TrangThai: 'ThanhCong' | 'TuChoi'; GhiChu?: string }
  ) => {
    return requestThanhToan<{
      MaTT: number;
      TrangThai: string;
      TienDaTraMoi: number;
    }>(`/duyet/${maTT}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },
};

export default thanhToanService;