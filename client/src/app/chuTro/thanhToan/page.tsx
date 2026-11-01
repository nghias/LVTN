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
      ? `Xác nhận khách thuê "${gd.TenKhachThue}" (${gd.TenPhong}) đã thanh toán số tiền ${Number(gd.SoTien).toLocaleString('vi-VN')} đ?`
      : `Bạn có chắc chắn muốn từ chối giao dịch ${Number(gd.SoTien).toLocaleString('vi-VN')} đ của phòng ${gd.TenPhong} không?`;

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

  // Lọc danh sách Hóa đơn
  const filteredHoaDons = useMemo(() => {
    return hoaDonList.filter((hd) => {
      const matchKhu =
        selectedKhu === 'ALL' || String(hd.MaKhu) === selectedKhu;
      const kw = keyword.trim().toLowerCase();
      const matchKw =
        !kw ||
        hd.TenPhong.toLowerCase().includes(kw) ||
        hd.TenKhachThue.toLowerCase().includes(kw) ||
        String(hd.MaHD).includes(kw);

      if (!matchKhu || !matchKw) return false;

      if (filterMode === 'CHUA_TRA') {
        return hd.TrangThaiThanhToan !== 'DaThanhToan';
      }
      if (filterMode === 'DA_TRA') {
        return hd.TrangThaiThanhToan === 'DaThanhToan';
      }
      if (filterMode === 'CHO_XAC_NHAN') {
        return hd.CoGiaoDichChoXacNhan;
      }
      return true;
    });
  }, [hoaDonList, selectedKhu, keyword, filterMode]);

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

  const renderPaymentBadge = (trangThai: string) => {
    if (trangThai === 'DaThanhToan') {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
          Đã trả đủ
        </span>
      );
    }
    if (trangThai === 'MotPhan') {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
          Trả một phần
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-300">
        Chưa thanh toán
      </span>
    );
  };

  return (
    <ProtectedRoute allowedRoles={['ChuTro', 'QuanLy']}>
      {(user) => (
        <div className="flex-1 flex flex-col bg-white text-slate-900">
          <QuanLyHeader user={user} />

          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
            {/* 1. Tiêu đề trang & Nút Thiết lập ngân hàng (Đồng bộ QuanLyKhuTroVaPhongPage) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                  Quản Lý Thanh Toán & Đối Soát Tự Động
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  {user.Quyen === 'ChuTro'
                    ? 'Chủ trọ thiết lập tài khoản ngân hàng, đối soát QR PayOS tự động và xác nhận thu tiền mặt'
                    : 'Quản lý cơ sở theo dõi lịch sử thanh toán và xác nhận thu tiền mặt của các phòng phụ trách'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {user.Quyen === 'ChuTro' && canEditPaymentInfo && (
                  <Link
                    href="/chuTro/thanhToan/thietLap"
                    className="flex-1 sm:flex-initial text-center px-5 py-2.5 rounded-full bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 border border-teal-300 text-xs font-bold shadow-xs transition no-underline"
                  >
                    + Thiết Lập Ngân Hàng
                  </Link>
                )}
              </div>
            </div>

            {/* 2. Thanh chọn Khu trọ & Khung thông tin Ngân hàng thụ hưởng */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {khuTroList.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setSelectedKhu('ALL')}
                    className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                      selectedKhu === 'ALL'
                        ? 'bg-[#00FFCC] text-slate-900 border border-teal-400 shadow-xs'
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
                      className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                        isSelected
                          ? 'bg-[#00FFCC] text-slate-900 border border-teal-400 shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {khu.TenKhu} ({count})
                    </button>
                  );
                })}
              </div>

              {/* Khung thông tin Ngân hàng thụ hưởng (Giống hệt khung activeKhu của Phòng trọ) */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900">
                      Ngân hàng thụ hưởng: {thongTinNH?.TenNganHang || 'MB Bank'}
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#00FFCC]/40 text-slate-900">
                      Chủ TK: {thongTinNH?.ChuTaiKhoan || 'TRAN TUAN NGHIA'}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white text-teal-800 border border-teal-200">
                      STK: {thongTinNH?.STK || '0931493785'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">
                    <strong>Trạng thái kênh thanh toán:</strong> Đã kích hoạt xác thực tự động qua cổng PayOS VietQR
                  </p>
                  <p className="text-xs text-slate-500">
                    Hệ thống tự động sinh mã QR theo từng hợp đồng/hóa đơn và gạch nợ ngay khi người thuê chuyển khoản thành công
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {user.Quyen === 'ChuTro' && canEditPaymentInfo ? (
                    <Link
                      href="/chuTro/thanhToan/thietLap"
                      className="px-4 py-2 rounded-full bg-white hover:bg-[#00FFCC] text-slate-800 border border-slate-300 text-xs font-bold transition no-underline"
                    >
                      Sửa thông tin TT
                    </Link>
                  ) : (
                    <span className="px-4 py-2 rounded-full bg-white text-slate-500 border border-slate-200 text-xs font-bold">
                      Chỉ Chủ trọ được quyền thay đổi
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* 3. Bộ lọc & Tìm kiếm hóa đơn thanh toán (Giống hệt Bộ lọc Phòng trọ) */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="sm:col-span-5">
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Tìm kiếm theo tên phòng (VD: P.101, P.102), tên khách..."
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
                />
              </div>

              <div className="sm:col-span-7 flex flex-wrap items-center gap-2">
                {[
                  {
                    value: 'ALL',
                    label: `Tất cả hóa đơn (${hoaDonList.length})`,
                  },
                  {
                    value: 'CHUA_TRA',
                    label: `Còn nợ (${hoaDonList.filter((h) => h.ConNo > 0).length})`,
                  },
                  {
                    value: 'CHO_XAC_NHAN',
                    label: `Chờ xác nhận (${pendingTransactions.length})`,
                  },
                  {
                    value: 'DA_TRA',
                    label: `Đã trả đủ (${hoaDonList.filter((h) => h.ConNo <= 0).length})`,
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
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                      filterMode === st.value
                        ? 'bg-[#00FFCC] text-slate-900'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Danh sách giao dịch đang chờ xác nhận nhanh */}
            {pendingTransactions.length > 0 && filterMode !== 'LICH_SU' && (
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border-2 border-[#00FFCC] space-y-3">
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
                            {gd.TenPhong} ({gd.TenKhu})
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#00FFCC]/25 text-slate-900 border border-teal-200">
                            {gd.PhuongThuc === 'TienMat'
                              ? 'Tiền mặt'
                              : 'Chuyển khoản QR'}
                          </span>
                          <span className="text-sm font-extrabold text-teal-700">
                            {Number(gd.SoTien).toLocaleString('vi-VN')} đ
                          </span>
                        </div>
                        <p className="text-xs text-slate-600">
                          <strong>Khách thuê:</strong> {gd.TenKhachThue} •{' '}
                          {gd.NgayTT}
                          {gd.GhiChu ? ` • ${gd.GhiChu}` : ''}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          disabled={processingId === gd.MaTT}
                          onClick={() => handleDuyetNhanh(gd, 'ThanhCong')}
                          className="px-4 py-2 rounded-xl bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 text-xs font-bold transition cursor-pointer disabled:opacity-50"
                        >
                          Xác nhận trả
                        </button>
                        <button
                          type="button"
                          disabled={processingId === gd.MaTT}
                          onClick={() => handleDuyetNhanh(gd, 'TuChoi')}
                          className="px-3.5 py-2 rounded-xl border border-red-200 bg-white hover:bg-red-50 text-red-600 text-xs font-bold transition cursor-pointer disabled:opacity-50"
                        >
                          Từ chối
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 5. Lưới Thẻ Hóa Đơn hoặc Bảng Lịch Sử Giao Dịch */}
            {loading ? (
              <div className="py-16 text-center text-sm text-slate-500">
                Đang tải danh sách thanh toán...
              </div>
            ) : filterMode === 'LICH_SU' ? (
              filteredHistory.length === 0 ? (
                <div className="py-16 text-center bg-slate-50 rounded-2xl border border-slate-200 p-6">
                  <p className="text-base font-bold text-slate-700">
                    Chưa có lịch sử giao dịch thanh toán nào!
                  </p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-slate-700 border-b border-slate-200">
                        <th className="py-3.5 px-4 text-xs font-bold">Mã GD</th>
                        <th className="py-3.5 px-4 text-xs font-bold">
                          Phòng / Cơ sở
                        </th>
                        <th className="py-3.5 px-4 text-xs font-bold">
                          Khách đại diện
                        </th>
                        <th className="py-3.5 px-4 text-xs font-bold">
                          Số tiền
                        </th>
                        <th className="py-3.5 px-4 text-xs font-bold">
                          Phương thức
                        </th>
                        <th className="py-3.5 px-4 text-xs font-bold">
                          Thời gian
                        </th>
                        <th className="py-3.5 px-4 text-xs font-bold">
                          Trạng thái
                        </th>
                        <th className="py-3.5 px-4 text-xs font-bold">
                          Ghi chú
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredHistory.map((item) => (
                        <tr key={item.MaTT} className="hover:bg-slate-50">
                          <td className="py-3.5 px-4 text-xs font-bold text-slate-700">
                            #{item.MaTT}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="text-sm font-bold text-slate-900 block">
                              Phòng {item.TenPhong}
                            </span>
                            <span className="text-xs text-slate-500">
                              {item.TenKhu} • HĐ #{item.MaHD}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-xs font-semibold text-slate-700">
                            {item.TenKhachThue}
                          </td>
                          <td className="py-3.5 px-4 text-sm font-extrabold text-teal-700">
                            {Number(item.SoTien).toLocaleString('vi-VN')} đ
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#00FFCC]/25 text-slate-900 border border-teal-200">
                              {item.PhuongThuc === 'TienMat'
                                ? 'Tiền mặt'
                                : 'Chuyển khoản QR'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-xs text-slate-500">
                            {item.NgayTT}
                          </td>
                          <td className="py-3.5 px-4">
                            {item.TrangThai === 'ThanhCong' ? (
                              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                Đã xác nhận
                              </span>
                            ) : item.TrangThai === 'TuChoi' ? (
                              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-300">
                                Đã từ chối
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                Chờ xác nhận
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-xs text-slate-500 max-w-xs truncate">
                            {item.GhiChu}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : filteredHoaDons.length === 0 ? (
              <div className="py-16 text-center bg-slate-50 rounded-2xl border border-slate-200 p-6">
                <p className="text-base font-bold text-slate-700">
                  Không tìm thấy hóa đơn nào phù hợp!
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Hãy thử thay đổi bộ lọc trạng thái hoặc từ khóa tìm kiếm.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredHoaDons.map((hd) => (
                  <div
                    key={hd.MaHD}
                    className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition overflow-hidden flex flex-col"
                  >
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div>
                        {/* Hàng nhãn Cơ sở & Trạng thái */}
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-900/80 text-[#00FFCC]">
                            {hd.TenKhu || 'Cơ sở Xóm Trọ'}
                          </span>
                          {renderPaymentBadge(hd.TrangThaiThanhToan)}
                        </div>

                        {/* Tên phòng & Kỳ hóa đơn (Giống hệt thẻ Phòng trọ) */}
                        <div className="flex items-baseline justify-between gap-2">
                          <h3 className="text-lg font-bold text-slate-900">
                            Phòng {hd.TenPhong}
                          </h3>
                          <span className="text-xs font-semibold text-slate-500">
                            HĐ #{hd.MaHD} • Kỳ {hd.NgayTinh}
                          </span>
                        </div>

                        {/* Tổng tiền kỳ này */}
                        <p className="mt-1 text-base font-extrabold text-teal-700">
                          {Number(hd.TongTien).toLocaleString('vi-VN')} đ / kỳ này
                        </p>

                        {/* Các tag thông tin */}
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#00FFCC]/25 text-slate-900 border border-teal-200">
                            Khách: {hd.TenKhachThue}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#00FFCC]/25 text-slate-900 border border-teal-200">
                            Đã trả: {Number(hd.TienDaTra).toLocaleString('vi-VN')} đ
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                              hd.ConNo > 0
                                ? 'bg-red-50 text-red-600 border-red-200'
                                : 'bg-[#00FFCC]/25 text-slate-900 border-teal-200'
                            }`}
                          >
                            Còn nợ: {Number(hd.ConNo).toLocaleString('vi-VN')} đ
                          </span>
                        </div>
                      </div>

                      {/* Cụm nút điều hướng (Giống hệt Chi tiết / Sửa của thẻ Phòng trọ) */}
                      <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                        <Link
                          href={`/chuTro/thanhToan/xacNhan/${hd.MaHD}`}
                          className="flex-1 py-2 text-center rounded-xl bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 text-xs font-bold transition no-underline"
                        >
                          {hd.ConNo > 0
                            ? 'Mã QR & Xác nhận trả'
                            : 'Chi tiết thanh toán'}
                        </Link>
                        <Link
                          href="/chuTro/hoaDon"
                          className="px-4 py-2 text-center rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold transition no-underline"
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