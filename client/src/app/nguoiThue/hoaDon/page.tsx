'use client';

import React, { useEffect, useState, useCallback } from 'react';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import { useAlertModal } from '@/components/common/AlertModalProvider';
import {
  hoaDonService,
  HoaDonItem,
  HoaDonChiTiet,
} from '@/services/hoaDon.service';

export default function KhachThueHoaDonPage() {
  const { showError } = useAlertModal();

  const [hoaDonList, setHoaDonList] = useState<HoaDonItem[]>([]);
  const [selectedDetail, setSelectedDetail] = useState<HoaDonChiTiet | null>(
    null
  );
  const [thangNam, setThangNam] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);

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

  const fetchMyInvoices = useCallback(
    async (kyThang?: string) => {
      try {
        setLoading(true);
        const res = await hoaDonService.getAll({
          thangNam: kyThang ?? thangNam,
        });

        if (res.success && res.data) {
          const list: HoaDonItem[] = res.data.hoaDonList || [];
          setHoaDonList(list);
          if (list.length > 0 && !selectedDetail) {
            handleViewDetail(list[0].MaHD);
          }
        } else {
          showError('Không thể tải danh sách hóa đơn của phòng.');
        }
      } catch {
        showError('Không thể kết nối máy chủ để tải hóa đơn.');
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [thangNam, showError]
  );

  useEffect(() => {
    fetchMyInvoices();
  }, [fetchMyInvoices]);

  const handleViewDetail = async (maHD: number) => {
    try {
      setLoadingDetail(true);
      const res = await hoaDonService.getById(maHD);
      if (res.success && res.data) {
        setSelectedDetail(res.data);
      } else {
        showError('Không thể tải chi tiết hóa đơn này.');
      }
    } catch {
      showError('Không thể tải chi tiết hóa đơn.');
    } finally {
      setLoadingDetail(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['KhachThue']}>
      {() => (
        <div className="min-h-screen flex flex-col bg-white text-slate-900">
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  Hóa Đơn Tiền Phòng Của Tôi
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Tra cứu chi tiết tiền phòng, chỉ số điện nước, phí dịch vụ và phí phát sinh hàng tháng của phòng bạn.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="month"
                  value={thangNam}
                  onChange={(e) => {
                    const val = e.target.value;
                    setThangNam(val);
                    fetchMyInvoices(val);
                  }}
                  className="px-3.5 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm font-bold"
                />
                {thangNam && (
                  <button
                    type="button"
                    onClick={() => {
                      setThangNam('');
                      fetchMyInvoices('');
                    }}
                    className="px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold hover:bg-slate-100 cursor-pointer"
                  >
                    Tất cả kỳ
                  </button>
                )}
              </div>
            </div>

            {loading ? (
              <div className="py-16 text-center text-slate-500 text-sm font-bold">
                Đang tải hóa đơn phòng của bạn...
              </div>
            ) : hoaDonList.length === 0 ? (
              <div className="py-16 text-center border border-dashed border-slate-300 rounded-3xl bg-slate-50/50">
                <p className="text-sm font-bold text-slate-700">
                  Hiện chưa có hóa đơn nào cho phòng của bạn.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Cột trái: Danh sách các kỳ hóa đơn của phòng */}
                <div className="lg:col-span-5 space-y-3">
                  {hoaDonList.map((item) => {
                    const isSelected = selectedDetail?.MaHD === item.MaHD;
                    return (
                      <div
                        key={item.MaHD}
                        onClick={() => handleViewDetail(item.MaHD)}
                        className={`p-4 rounded-2xl border transition cursor-pointer ${
                          isSelected
                            ? 'border-teal-500 bg-[#00FFCC]/10 shadow-xs'
                            : 'border-slate-200 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-xs font-bold text-slate-500">
                              Hóa đơn #{item.MaHD} • {formatDateVN(item.NgayTinh)}
                            </span>
                            <h3 className="text-base font-bold text-slate-900 mt-0.5">
                              {item.TenPhong} ({item.TenKhu})
                            </h3>
                          </div>

                          {item.TrangThaiThanhToan === 'DaThanhToan' ? (
                            <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                              Đã thanh toán
                            </span>
                          ) : item.TrangThaiThanhToan === 'MotPhan' ? (
                            <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
                              Trả một phần
                            </span>
                          ) : (
                            <span className="px-3 py-1 rounded-full bg-rose-100 text-rose-700 text-xs font-bold">
                              Chưa trả
                            </span>
                          )}
                        </div>

                        <div className="mt-3 pt-3 border-t border-slate-200/70 flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-600">
                            Tổng cộng: <strong>{formatVND(item.TongTien)}</strong>
                          </span>
                          <span className="font-bold text-rose-600">
                            Còn nợ: {formatVND(item.ConNo)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Cột phải: Phiếu chi tiết hóa đơn đang chọn */}
                <div className="lg:col-span-7">
                  {loadingDetail || !selectedDetail ? (
                    <div className="p-10 rounded-3xl border border-slate-200 text-center text-sm font-bold text-slate-500">
                      Đang tải chi tiết hóa đơn...
                    </div>
                  ) : (
                    <div className="p-6 rounded-3xl border border-slate-200 bg-white shadow-xs space-y-5">
                      <div className="border-b border-slate-200 pb-4 flex items-center justify-between">
                        <div>
                          <h2 className="text-lg font-bold text-slate-900">
                            Phiếu Báo Tiền Phòng #{selectedDetail.MaHD}
                          </h2>
                          <p className="text-xs font-semibold text-slate-500">
                            {selectedDetail.TenPhong} — {selectedDetail.TenKhu} | Ngày tính: {formatDateVN(selectedDetail.NgayTinh)}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3 text-xs sm:text-sm">
                        <div className="flex justify-between py-2 border-b border-slate-100">
                          <span className="font-bold text-slate-700">1. Tiền phòng</span>
                          <span className="font-bold text-slate-900">
                            {formatVND(selectedDetail.TienPhong)}
                          </span>
                        </div>

                        <div className="flex justify-between py-2 border-b border-slate-100">
                          <div>
                            <span className="font-bold text-slate-700">
                              2. Tiền điện ({selectedDetail.SoDienCu} → {selectedDetail.SoDienMoi}: {selectedDetail.DienTieuThu} kWh × {formatVND(selectedDetail.GiaDien)})
                            </span>
                          </div>
                          <span className="font-bold text-amber-800">
                            {formatVND(selectedDetail.TienDien)}
                          </span>
                        </div>

                        <div className="flex justify-between py-2 border-b border-slate-100">
                          <div>
                            <span className="font-bold text-slate-700">
                              3. Tiền nước ({selectedDetail.SoNuocCu} → {selectedDetail.SoNuocMoi}: {selectedDetail.NuocTieuThu} m³ × {formatVND(selectedDetail.GiaNuoc)})
                            </span>
                          </div>
                          <span className="font-bold text-sky-800">
                            {formatVND(selectedDetail.TienNuoc)}
                          </span>
                        </div>

                        <div className="py-2 border-b border-slate-100 space-y-2">
                          <div className="flex justify-between">
                            <span className="font-bold text-slate-700">
                              4. Phí dịch vụ ({selectedDetail.DanhSachDichVu.length})
                            </span>
                            <span className="font-bold text-teal-800">
                              {formatVND(selectedDetail.TienPhuPhi)}
                            </span>
                          </div>
                          {selectedDetail.DanhSachDichVu.map((dv) => (
                            <div
                              key={dv.MaDV}
                              className="pl-3 flex justify-between text-xs text-slate-600 font-semibold"
                            >
                              <span>
                                • {dv.TenDV} ({dv.SoLuong} {dv.DonViTinh})
                              </span>
                              <span>{formatVND(dv.ThanhTien)}</span>
                            </div>
                          ))}
                        </div>

                        <div className="py-2 border-b border-slate-100 space-y-2">
                          <div className="flex justify-between">
                            <span className="font-bold text-slate-700">
                              5. Phí phát sinh ({selectedDetail.DanhSachPhatSinh.length})
                            </span>
                            <span className="font-bold text-purple-800">
                              {formatVND(selectedDetail.TienPhatSinh)}
                            </span>
                          </div>
                          {selectedDetail.DanhSachPhatSinh.map((ps, idx) => (
                            <div
                              key={ps.MaPS || idx}
                              className="pl-3 flex justify-between text-xs text-slate-600 font-semibold"
                            >
                              <span>
                                • {ps.TenPS} {ps.GhiChu ? `(${ps.GhiChu})` : ''}
                              </span>
                              <span>{formatVND(ps.Gia)}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-900 text-white grid grid-cols-3 gap-2 text-center">
                        <div>
                          <span className="text-[11px] text-slate-400 font-bold block">
                            Tổng hóa đơn
                          </span>
                          <span className="text-sm sm:text-base font-bold">
                            {formatVND(selectedDetail.TongTien)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[11px] text-slate-400 font-bold block">
                            Đã thanh toán
                          </span>
                          <span className="text-sm sm:text-base font-bold text-[#00FFCC]">
                            {formatVND(selectedDetail.TienDaTra)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[11px] text-slate-400 font-bold block">
                            Còn cần đóng
                          </span>
                          <span className="text-sm sm:text-base font-bold text-rose-400">
                            {formatVND(selectedDetail.ConNo)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </main>
        </div>
      )}
    </ProtectedRoute>
  );
}