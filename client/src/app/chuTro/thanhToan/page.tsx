// client/src/app/chuTro/thanhToan/page.tsx
'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import QuanLyHeader from '@/components/layout/QuanLyHeader';
import { useAlertModal } from '@/components/common/AlertModalProvider';
import {
  thanhToanService,
  ThongTinThanhToan,
  HoaDonThanhToanItem,
  GiaoDichThanhToan,
} from '@/services/thanhToan.service';

export default function QuanLyThanhToanPage() {
  const { showSuccess, showError, showConfirm } = useAlertModal();

  const [loading, setLoading] = useState<boolean>(true);
  const [thongTinNH, setThongTinNH] = useState<ThongTinThanhToan | null>(null);
  const [canEditPaymentInfo, setCanEditPaymentInfo] = useState<boolean>(false);
  const [khuTroList, setKhuTroList] = useState<any[]>([]);
  const [hoaDonList, setHoaDonList] = useState<HoaDonThanhToanItem[]>([]);
  const [lichSuList, setLichSuList] = useState<GiaoDichThanhToan[]>([]);

  const [selectedKhu, setSelectedKhu] = useState<string>('ALL');
  const [filterMode, setFilterMode] = useState<
    'ALL' | 'CHUA_TRA' | 'CHO_XAC_NHAN' | 'DA_TRA' | 'LICH_SU'
  >('ALL');
  const [keyword, setKeyword] = useState<string>('');
  const [processingId, setProcessingId] = useState<number | null>(null);

  const formatVND = (val: number | string) => {
    const num = Math.round(Number(val) || 0);
    return num.toLocaleString('vi-VN') + ' đ';
  };

  const formatDateVN = (dateStr?: string) => {
    if (!dateStr) return '';
    const parts = dateStr.slice(0, 10).split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
  };

  // Rút gọn tên cơ sở trong thẻ/bảng để không bị tràn dòng
  const formatShortKhu = (tenKhu?: string, maKhu?: number | string | null) => {
    if (!tenKhu) return maKhu ? `Cơ sở ${maKhu}` : 'Cơ sở';
    const match = tenKhu.match(/cơ\s*sở\s*\d+/i);
    if (match) {
      return match[0].replace(/^c/i, 'C');
    }
    return (
      tenKhu
        .replace(/^xóm\s*trọ\s*/i, '')
        .split('-')[0]
        .trim() || tenKhu
    );
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await thanhToanService.getTongHop();
      if (res.success && res.data) {
        setThongTinNH(res.data.thongTinThanhToan);
        setCanEditPaymentInfo(Boolean(res.data.canEditPaymentInfo));
        const khus = res.data.khuTroList || [];
        setKhuTroList(khus);
        setHoaDonList(res.data.hoaDonList || []);
        setLichSuList(res.data.lichSuThanhToan || []);

        if (khus.length === 1) {
          setSelectedKhu(String(khus[0].MaKhu));
        }
      } else if (res.message) {
        showError(res.message);
      }
    } catch {
      showError('Không thể tải dữ liệu quản lý thanh toán lúc này!');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDuyetNhanh = (
    gd: GiaoDichThanhToan,
    trangThai: 'ThanhCong' | 'TuChoi'
  ) => {
    const isApprove = trangThai === 'ThanhCong';
    const message = isApprove
      ? `Xác nhận khách thuê "${gd.TenKhachThue}" (${gd.TenPhong}) đã thanh toán số tiền ${formatVND(gd.SoTien)}?`
      : `Bạn có chắc chắn muốn từ chối giao dịch ${formatVND(gd.SoTien)} của phòng ${gd.TenPhong} không?`;

    showConfirm(
      message,
      isApprove ? 'Xác nhận đã nhận tiền' : 'Xác nhận từ chối giao dịch',
      async () => {
        try {
          setProcessingId(gd.MaTT);
          const res = await thanhToanService.duyetGiaoDich(gd.MaTT, {
            TrangThai: trangThai,
          });
          if (res.success) {
            showSuccess(
              res.message ||
                (isApprove
                  ? 'Đã xác nhận thanh toán thành công!'
                  : 'Đã từ chối giao dịch thanh toán!')
            );
            fetchData();
          } else {
            showError(res.message || 'Không thể xử lý giao dịch này!');
          }
        } catch {
          showError('Có lỗi xảy ra khi xác nhận giao dịch!');
        } finally {
          setProcessingId(null);
        }
      },
      isApprove ? 'Xác nhận' : 'Từ chối',
      'Hủy'
    );
  };

  // Đếm số hóa đơn theo từng Khu trọ
  const countByKhu = useMemo(() => {
    const map = new Map<string, number>();
    hoaDonList.forEach((hd) => {
      const k = String(hd.MaKhu);
      map.set(k, (map.get(k) || 0) + 1);
    });
    return map;
  }, [hoaDonList]);

  // Danh sách hóa đơn theo cơ sở đang chọn
  const hoaDonByKhu = useMemo(() => {
    return hoaDonList.filter(
      (hd) => selectedKhu === 'ALL' || String(hd.MaKhu) === selectedKhu
    );
  }, [hoaDonList, selectedKhu]);

  // Giao dịch đang chờ xác nhận
  const pendingTransactions = useMemo(() => {
    return lichSuList.filter((item) => {
      const isPending =
        item.TrangThai === 'ChoXacNhan' || item.TrangThai === '0';
      const matchKhu =
        selectedKhu === 'ALL' || String(item.MaKhu) === selectedKhu;
      const kw = keyword.trim().toLowerCase();
      const matchKw =
        !kw ||
        item.TenPhong?.toLowerCase().includes(kw) ||
        item.TenKhachThue?.toLowerCase().includes(kw) ||
        String(item.MaHD).includes(kw);
      return isPending && matchKhu && matchKw;
    });
  }, [lichSuList, selectedKhu, keyword]);

  // Lọc danh sách Hóa đơn hiển thị
  const filteredHoaDons = useMemo(() => {
    return hoaDonByKhu.filter((hd) => {
      const kw = keyword.trim().toLowerCase();
      const matchKw =
        !kw ||
        hd.TenPhong.toLowerCase().includes(kw) ||
        hd.TenKhachThue.toLowerCase().includes(kw) ||
        String(hd.MaHD).includes(kw);

      if (!matchKw) return false;

      if (filterMode === 'CHUA_TRA') {
        return Number(hd.ConNo) > 0 && hd.TrangThaiThanhToan !== 'DaThanhToan';
      }
      if (filterMode === 'DA_TRA') {
        return Number(hd.ConNo) <= 0 || hd.TrangThaiThanhToan === 'DaThanhToan';
      }
      if (filterMode === 'CHO_XAC_NHAN') {
        return Boolean(hd.CoGiaoDichChoXacNhan);
      }
      return true;
    });
  }, [hoaDonByKhu, keyword, filterMode]);

  // Lọc lịch sử giao dịch
  const filteredHistory = useMemo(() => {
    return lichSuList.filter((item) => {
      const matchKhu =
        selectedKhu === 'ALL' || String(item.MaKhu) === selectedKhu;
      const kw = keyword.trim().toLowerCase();
      const matchKw =
        !kw ||
        item.TenPhong?.toLowerCase().includes(kw) ||
        item.TenKhachThue?.toLowerCase().includes(kw) ||
        String(item.MaHD).includes(kw) ||
        item.GhiChu?.toLowerCase().includes(kw);
      return matchKhu && matchKw;
    });
  }, [lichSuList, selectedKhu, keyword]);

  // Thống kê nhanh đồng bộ với trang Hóa đơn
  const tongPhaiThu = hoaDonByKhu.reduce(
    (sum, item) => sum + Math.round(Number(item.TongTien) || 0),
    0
  );
  const tongDaThu = hoaDonByKhu.reduce(
    (sum, item) => sum + Math.round(Number(item.TienDaTra) || 0),
    0
  );
  const tongConNo = Math.max(0, tongPhaiThu - tongDaThu);

  const renderPaymentBadge = (trangThai: string) => {
    if (trangThai === 'DaThanhToan') {
      return (
        <span className="inline-block px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold whitespace-nowrap">
          Đã trả đủ
        </span>
      );
    }
    if (trangThai === 'MotPhan') {
      return (
        <span className="inline-block px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold whitespace-nowrap">
          Trả một phần
        </span>
      );
    }
    return (
      <span className="inline-block px-2.5 py-1 rounded-full bg-rose-100 text-rose-700 text-xs font-bold whitespace-nowrap">
        Chưa thanh toán
      </span>
    );
  };

  return (
    <ProtectedRoute allowedRoles={['ChuTro', 'QuanLy']}>
      {(user) => (
        <div className="min-h-screen flex flex-col bg-white text-slate-900">
          <QuanLyHeader user={user} />

          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
            {/* 1. Tiêu đề trang & Nút Thiết lập ngân hàng */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  Quản Lý Thanh Toán & Đối Soát Tự Động
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  {user.Quyen === 'ChuTro'
                    ? 'Chủ trọ thiết lập tài khoản ngân hàng, đối soát QR PayOS tự động và xác nhận thu tiền mặt.'
                    : 'Quản lý cơ sở theo dõi lịch sử thanh toán và xác nhận thu tiền mặt của các phòng phụ trách.'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 shrink-0">
                {user.Quyen === 'ChuTro' && canEditPaymentInfo && (
                  <Link
                    href="/chuTro/thanhToan/thietLap"
                    className="flex-1 sm:flex-initial text-center px-5 py-2.5 rounded-full bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 border border-teal-300 text-xs font-bold shadow-xs transition no-underline whitespace-nowrap"
                  >
                    + Thiết Lập Ngân Hàng
                  </Link>
                )}
              </div>
            </div>

            {/* 2. Tabs chọn Cơ sở (Hiển thị đầy đủ tên cơ sở) */}
            {khuTroList.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
                {khuTroList.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setSelectedKhu('ALL')}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                      selectedKhu === 'ALL'
                        ? 'bg-[#00FFCC] text-slate-900 shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Tất cả cơ sở ({hoaDonList.length})
                  </button>
                )}

                {khuTroList.map((khu) => {
                  const isSelected =
                    selectedKhu === String(khu.MaKhu) ||
                    (khuTroList.length === 1 && selectedKhu === 'ALL');
                  const count = countByKhu.get(String(khu.MaKhu)) || 0;
                  return (
                    <button
                      key={khu.MaKhu}
                      type="button"
                      onClick={() =>
                        setSelectedKhu(
                          selectedKhu === String(khu.MaKhu) &&
                            khuTroList.length > 1
                            ? 'ALL'
                            : String(khu.MaKhu)
                        )
                      }
                      className={`px-4 py-2 rounded-full text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                        isSelected
                          ? 'bg-[#00FFCC] text-slate-900 shadow-2xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {khu.TenKhu} ({count})
                    </button>
                  );
                })}
              </div>
            )}

            {/* 3. Thẻ thống kê nhanh */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70">
                <p className="text-xs font-bold text-slate-500">
                  Tổng số hóa đơn
                </p>
                <p className="text-xl font-bold text-slate-900 mt-1">
                  {hoaDonByKhu.length} hóa đơn
                </p>
              </div>
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70">
                <p className="text-xs font-bold text-slate-500">
                  Tổng tiền phải thu
                </p>
                <p className="text-xl font-bold text-slate-900 mt-1">
                  {formatVND(tongPhaiThu)}
                </p>
              </div>
              <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/60">
                <p className="text-xs font-bold text-emerald-700">Đã thu</p>
                <p className="text-xl font-bold text-emerald-800 mt-1">
                  {formatVND(tongDaThu)}
                </p>
              </div>
              <div className="p-4 rounded-2xl border border-rose-200 bg-rose-50/60">
                <p className="text-xs font-bold text-rose-700">
                  Còn nợ chưa thu
                </p>
                <p className="text-xl font-bold text-rose-800 mt-1">
                  {formatVND(tongConNo)}
                </p>
              </div>
            </div>

            {/* 4. Khung thông tin Ngân hàng thụ hưởng */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/70 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm sm:text-base font-bold text-slate-900">
                    Ngân hàng thụ hưởng: {thongTinNH?.TenNganHang || 'MB Bank'}
                  </h2>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold whitespace-nowrap bg-[#00FFCC]/40 text-slate-900">
                    Chủ TK: {thongTinNH?.ChuTaiKhoan || 'TRAN TUAN NGHIA'}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold whitespace-nowrap bg-white text-teal-800 border border-teal-200">
                    STK: {thongTinNH?.STK || '0931493785'}
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  <strong className="font-bold text-slate-800">
                    Trạng thái kênh thanh toán:
                  </strong>{' '}
                  Đã kích hoạt xác thực tự động qua cổng PayOS VietQR. Hệ thống tự động sinh mã QR theo từng hợp đồng/hóa đơn và gạch nợ ngay khi người thuê chuyển khoản thành công.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {user.Quyen === 'ChuTro' && canEditPaymentInfo ? (
                  <Link
                    href="/chuTro/thanhToan/thietLap"
                    className="inline-flex items-center px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 text-xs font-bold whitespace-nowrap transition no-underline"
                  >
                    Sửa thông tin TT
                  </Link>
                ) : (
                  <span className="inline-flex items-center px-3.5 py-2 rounded-xl bg-white text-slate-500 border border-slate-200 text-xs font-bold whitespace-nowrap">
                    Chỉ Chủ trọ được quyền thay đổi
                  </span>
                )}
              </div>
            </div>

            {/* 5. Bộ lọc & Tìm kiếm */}
            <div className="w-full p-4 sm:p-5 rounded-3xl border border-slate-200 bg-slate-50/50 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex-1 min-w-[240px]">
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Tìm kiếm theo tên phòng (VD: P.101, P.102), tên khách, mã HĐ..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm font-bold text-slate-900 placeholder:font-normal placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {[
                  {
                    value: 'ALL',
                    label: `Tất cả hóa đơn (${hoaDonByKhu.length})`,
                  },
                  {
                    value: 'CHUA_TRA',
                    label: `Còn nợ (${
                      hoaDonByKhu.filter(
                        (h) =>
                          Number(h.ConNo) > 0 &&
                          h.TrangThaiThanhToan !== 'DaThanhToan'
                      ).length
                    })`,
                  },
                  {
                    value: 'CHO_XAC_NHAN',
                    label: `Chờ xác nhận (${pendingTransactions.length})`,
                  },
                  {
                    value: 'DA_TRA',
                    label: `Đã trả đủ (${
                      hoaDonByKhu.filter(
                        (h) =>
                          Number(h.ConNo) <= 0 ||
                          h.TrangThaiThanhToan === 'DaThanhToan'
                      ).length
                    })`,
                  },
                  {
                    value: 'LICH_SU',
                    label: `Lịch sử GD (${filteredHistory.length})`,
                  },
                ].map((st) => (
                  <button
                    key={st.value}
                    type="button"
                    onClick={() => setFilterMode(st.value as any)}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                      filterMode === st.value
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 6. Danh sách giao dịch đang chờ xác nhận nhanh */}
            {pendingTransactions.length > 0 && filterMode !== 'LICH_SU' && (
              <div className="p-4 sm:p-5 rounded-3xl bg-slate-50/70 border-2 border-[#00FFCC] space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-slate-900">
                    Giao dịch đang chờ xác nhận trả ({pendingTransactions.length})
                  </h2>
                </div>

                <div className="divide-y divide-slate-200/70">
                  {pendingTransactions.map((gd) => (
                    <div
                      key={gd.MaTT}
                      className="py-3 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-bold text-slate-900">
                            {gd.TenPhong}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-slate-200/80 text-slate-700 text-[11px] font-bold">
                            {formatShortKhu(gd.TenKhu, gd.MaKhu)}
                          </span>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold whitespace-nowrap bg-[#00FFCC]/30 text-slate-900 border border-teal-200">
                            {gd.PhuongThuc === 'TienMat'
                              ? 'Tiền mặt'
                              : 'Chuyển khoản QR'}
                          </span>
                          <span className="text-sm font-bold text-emerald-700 whitespace-nowrap">
                            {formatVND(gd.SoTien)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600">
                          <strong className="font-bold text-slate-800">
                            Khách thuê:
                          </strong>{' '}
                          {gd.TenKhachThue} • {formatDateVN(gd.NgayTT)}
                          {gd.GhiChu ? ` • ${gd.GhiChu}` : ''}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          disabled={processingId === gd.MaTT}
                          onClick={() => handleDuyetNhanh(gd, 'ThanhCong')}
                          className="px-4 py-2 rounded-xl bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 text-xs font-bold whitespace-nowrap transition cursor-pointer disabled:opacity-50"
                        >
                          Xác nhận trả
                        </button>
                        <button
                          type="button"
                          disabled={processingId === gd.MaTT}
                          onClick={() => handleDuyetNhanh(gd, 'TuChoi')}
                          className="px-4 py-2 rounded-xl bg-red-100 hover:bg-red-200 text-red-700 text-xs font-bold whitespace-nowrap transition cursor-pointer disabled:opacity-50"
                        >
                          Từ chối
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 7. Lưới Thẻ Hóa Đơn hoặc Bảng Lịch Sử Giao Dịch */}
            {loading ? (
              <div className="py-16 text-center text-slate-500 text-sm font-bold">
                Đang tải danh sách thanh toán...
              </div>
            ) : filterMode === 'LICH_SU' ? (
              filteredHistory.length === 0 ? (
                <div className="py-16 text-center border border-dashed border-slate-300 rounded-3xl bg-slate-50/50 p-6">
                  <p className="text-sm font-bold text-slate-700">
                    Chưa có lịch sử giao dịch thanh toán nào!
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-3xl border border-slate-200 shadow-xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase tracking-wider">
                        <th className="py-3.5 px-4 font-bold whitespace-nowrap">
                          Mã GD
                        </th>
                        <th className="py-3.5 px-4 font-bold whitespace-nowrap">
                          Phòng / Cơ Sở
                        </th>
                        <th className="py-3.5 px-4 font-bold whitespace-nowrap">
                          Khách Đại Diện
                        </th>
                        <th className="py-3.5 px-4 font-bold text-right whitespace-nowrap">
                          Số Tiền
                        </th>
                        <th className="py-3.5 px-4 font-bold text-center whitespace-nowrap">
                          Phương Thức
                        </th>
                        <th className="py-3.5 px-4 font-bold whitespace-nowrap">
                          Thời Gian
                        </th>
                        <th className="py-3.5 px-4 font-bold text-center whitespace-nowrap">
                          Trạng Thái
                        </th>
                        <th className="py-3.5 px-4 font-bold whitespace-nowrap">
                          Ghi Chú
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-xs sm:text-sm">
                      {filteredHistory.map((item) => (
                        <tr
                          key={item.MaTT}
                          className="hover:bg-slate-50/80 transition"
                        >
                          <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                            #{item.MaTT}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900">
                                {item.TenPhong}
                              </span>
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-bold">
                                {formatShortKhu(item.TenKhu, item.MaKhu)}
                              </span>
                            </div>
                            <div className="text-[11px] font-semibold text-slate-500">
                              HĐ #{item.MaHD}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-800 whitespace-nowrap">
                            {item.TenKhachThue}
                          </td>
                          <td className="py-3.5 px-4 text-right font-bold text-emerald-700 whitespace-nowrap">
                            {formatVND(item.SoTien)}
                          </td>
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <span className="inline-block px-2.5 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200">
                              {item.PhuongThuc === 'TienMat'
                                ? 'Tiền mặt'
                                : 'Chuyển khoản QR'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-xs font-semibold text-slate-500 whitespace-nowrap">
                            {item.NgayTT}
                          </td>
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            {item.TrangThai === 'ThanhCong' ? (
                              <span className="inline-block px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                                Đã xác nhận
                              </span>
                            ) : item.TrangThai === 'TuChoi' ? (
                              <span className="inline-block px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-700">
                                Đã từ chối
                              </span>
                            ) : (
                              <span className="inline-block px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                                Chờ xác nhận
                              </span>
                            )}
                          </td>
                          <td
                            className="py-3.5 px-4 text-xs text-slate-500 max-w-xs truncate"
                            title={item.GhiChu || ''}
                          >
                            {item.GhiChu || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : filteredHoaDons.length === 0 ? (
              <div className="py-16 text-center border border-dashed border-slate-300 rounded-3xl bg-slate-50/50 space-y-2 p-6">
                <p className="text-sm font-bold text-slate-700">
                  Không tìm thấy hóa đơn nào phù hợp với bộ lọc hiện tại.
                </p>
                <p className="text-xs text-slate-500">
                  Hãy thử thay đổi bộ lọc trạng thái hoặc từ khóa tìm kiếm.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredHoaDons.map((hd) => (
                  <div
                    key={hd.MaHD}
                    className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition overflow-hidden flex flex-col"
                  >
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div className="space-y-3">
                        {/* Hàng tên Phòng, nhãn Cơ sở rút gọn & Trạng thái */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h3 className="text-base sm:text-lg font-bold text-slate-900 whitespace-nowrap">
                                Phòng {hd.TenPhong}
                              </h3>
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-bold whitespace-nowrap">
                                {formatShortKhu(hd.TenKhu, hd.MaKhu)}
                              </span>
                            </div>
                            <p className="text-xs font-semibold text-slate-500 mt-0.5">
                              HĐ #{hd.MaHD} • Kỳ {formatDateVN(hd.NgayTinh)}
                            </p>
                          </div>

                          {renderPaymentBadge(hd.TrangThaiThanhToan)}
                        </div>

                        {/* Tổng tiền kỳ này */}
                        <div className="pt-1 border-t border-slate-100 flex items-baseline justify-between">
                          <span className="text-xs font-bold text-slate-500">
                            Tổng tiền kỳ này
                          </span>
                          <span className="text-lg font-bold text-slate-900">
                            {formatVND(hd.TongTien)}
                          </span>
                        </div>

                        {/* Khung chi tiết Khách thuê, Đã trả, Còn nợ */}
                        <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-1.5 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-slate-500">
                              Khách đại diện:
                            </span>
                            <span className="font-bold text-slate-900 truncate">
                              {hd.TenKhachThue}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-slate-500">
                              Đã trả:
                            </span>
                            <span className="font-bold text-emerald-700">
                              {formatVND(hd.TienDaTra)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-slate-500">
                              Còn nợ:
                            </span>
                            <span
                              className={`font-bold ${
                                Number(hd.ConNo) > 0
                                  ? 'text-rose-600'
                                  : 'text-slate-700'
                              }`}
                            >
                              {formatVND(hd.ConNo)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Cụm nút điều hướng */}
                      <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                        <Link
                          href={`/chuTro/thanhToan/xacNhan/${hd.MaHD}`}
                          className="flex-1 py-2.5 px-3 text-center rounded-xl bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 text-xs font-bold whitespace-nowrap transition no-underline"
                        >
                          {Number(hd.ConNo) > 0
                            ? 'Mã QR & Xác nhận trả'
                            : 'Chi tiết thanh toán'}
                        </Link>
                        <Link
                          href={`/chuTro/hoaDon/chiTiet/${hd.MaHD}`}
                          className="px-4 py-2.5 text-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold whitespace-nowrap transition no-underline"
                        >
                          Hóa đơn
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </main>
        </div>
      )}
    </ProtectedRoute>
  );
}