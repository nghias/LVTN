'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import { useAlertModal } from '@/components/common/AlertModalProvider';
import {
  hoaDonService,
  HoaDonItem,
  HoaDonChiTiet,
} from '@/services/hoaDon.service';
import NguoiThueHeader from '@/components/layout/NguoiThueHeader';

export default function KhachThueHoaDonPage() {
  const { showError } = useAlertModal();
  const monthInputRef = useRef<HTMLInputElement | null>(null);

  const [hoaDonList, setHoaDonList] = useState<HoaDonItem[]>([]);
  const [selectedDetail, setSelectedDetail] = useState<HoaDonChiTiet | null>(
    null
  );
  const [thangNam, setThangNam] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);

  const formatVND = (val: number | string) => {
    const num = Math.round(Number(val) || 0);
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' đ';
  };

  const formatDateVN = (dateStr?: string) => {
    if (!dateStr) return '';
    const parts = dateStr.slice(0, 10).split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
  };

  const formatMonthLabel = (ym: string) => {
    if (!ym) return '-- Tất cả các kỳ --';
    const parts = ym.split('-');
    if (parts.length === 2) return `Tháng ${parts[1]}/${parts[0]}`;
    return ym;
  };

  const handleViewDetail = useCallback(
    async (maHD: number) => {
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
    },
    [showError]
  );

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
          if (list.length > 0) {
            handleViewDetail(list[0].MaHD);
          } else {
            setSelectedDetail(null);
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
    [thangNam, showError, handleViewDetail]
  );

  useEffect(() => {
    fetchMyInvoices('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openMonthPicker = () => {
    const input = monthInputRef.current;
    if (!input) return;
    if (typeof input.showPicker === 'function') {
      input.showPicker();
    } else {
      input.focus();
      input.click();
    }
  };

  return (
    <ProtectedRoute allowedRoles={['KhachThue']}>
      {(user) => (
        <div className="min-h-screen flex flex-col bg-white text-slate-900">
          <NguoiThueHeader user={user} />
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  Hóa Đơn Tiền Phòng Của Tôi
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Tra cứu tiền phòng, chỉ số điện nước, phí dịch vụ và phí phát sinh hàng tháng của bạn.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <input
                    ref={monthInputRef}
                    type="month"
                    value={thangNam}
                    onChange={(e) => {
                      const val = e.target.value;
                      setThangNam(val);
                      fetchMyInvoices(val);
                    }}
                    className="sr-only"
                    aria-label="Chọn kỳ hóa đơn theo tháng và năm"
                  />
                  <button
                    type="button"
                    onClick={openMonthPicker}
                    className="min-w-[200px] px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:border-teal-500 focus:outline-none focus:ring-2 focus:ring-[#00FFCC] text-xs font-bold text-slate-800 flex items-center justify-between gap-3 cursor-pointer transition"
                  >
                    <span>{formatMonthLabel(thangNam)}</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="w-4 h-4 text-slate-600 shrink-0"
                    >
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                  </button>
                </div>

                {thangNam && (
                  <button
                    type="button"
                    onClick={() => {
                      setThangNam('');
                      fetchMyInvoices('');
                    }}
                    className="px-3.5 py-2.5 rounded-xl bg-[#00FFCC] hover:bg-[#00e6b8] border border-teal-300 text-slate-900 text-xs font-bold transition cursor-pointer whitespace-nowrap"
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
              <div className="py-16 text-center border border-dashed border-slate-300 rounded-3xl bg-slate-50/50 space-y-3">
                <p className="text-sm font-bold text-slate-700">
                  Hiện chưa có hóa đơn nào cho kỳ đã chọn.
                </p>
                {thangNam && (
                  <button
                    type="button"
                    onClick={() => {
                      setThangNam('');
                      fetchMyInvoices('');
                    }}
                    className="px-5 py-2 rounded-full bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 border border-teal-300 text-xs font-bold transition cursor-pointer"
                  >
                    Xem tất cả các kỳ
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Cột trái: Danh sách các kỳ hóa đơn của phòng */}
                <div className="lg:col-span-5 space-y-3">
                  {hoaDonList.map((item) => {
                    const isSelected = selectedDetail?.MaHD === item.MaHD;
                    const conNoNum = Number(item.ConNo) || 0;
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
                              Hóa đơn • {formatDateVN(item.NgayTinh)}
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

                        {/* Nút mở giao diện Thanh toán ngay trên thẻ */}
                        <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex justify-end">
                          <Link
                            href={`/nguoiThue/thanhToan/${item.MaHD}`}
                            onClick={(e) => e.stopPropagation()}
                            className={`px-4 py-1.5 rounded-full text-xs font-bold transition no-underline ${
                              conNoNum > 0
                                ? 'bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 border border-teal-400 shadow-2xs'
                                : 'bg-white hover:bg-[#00FFCC]/20 text-slate-700 border border-slate-300'
                            }`}
                          >
                            {conNoNum > 0
                              ? 'Thanh toán ngay →'
                              : 'Chi tiết thanh toán →'}
                          </Link>
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
                      <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <h2 className="text-lg font-bold text-slate-900">
                            Phiếu Báo Tiền Phòng
                          </h2>
                          <p className="text-xs font-semibold text-slate-500">
                            {selectedDetail.TenPhong} — {selectedDetail.TenKhu} | Ngày tính: {formatDateVN(selectedDetail.NgayTinh)}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3 text-xs">
                        <div className="flex justify-between py-2 border-b border-slate-100">
                          <span className="font-bold text-slate-700">
                            1. Tiền phòng
                          </span>
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

                      {/* Khung tổng kết dùng màu chủ đạo #00FFCC */}
                      <div className="p-4 rounded-2xl bg-[#00FFCC]/20 border border-teal-400 text-slate-900 grid grid-cols-3 gap-2 text-center">
                        <div>
                          <span className="text-[11px] text-slate-600 font-bold block">
                            Tổng hóa đơn
                          </span>
                          <span className="text-sm sm:text-base font-bold text-slate-900">
                            {formatVND(selectedDetail.TongTien)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[11px] text-slate-600 font-bold block">
                            Đã thanh toán
                          </span>
                          <span className="text-sm sm:text-base font-bold text-emerald-700">
                            {formatVND(selectedDetail.TienDaTra)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[11px] text-slate-600 font-bold block">
                            Còn cần đóng
                          </span>
                          <span className="text-sm sm:text-base font-bold text-rose-600">
                            {formatVND(selectedDetail.ConNo)}
                          </span>
                        </div>
                      </div>

                      {/* Nút hành động lớn dưới đáy phiếu hóa đơn */}
                      <div className="pt-1">
                        <Link
                          href={`/nguoiThue/thanhToan/${selectedDetail.MaHD}`}
                          className="w-full py-3 px-4 rounded-2xl bg-[#00FFCC] hover:bg-[#00e6b8] border border-teal-400 text-slate-900 text-xs font-bold flex items-center justify-center gap-2 transition no-underline shadow-xs"
                        >
                          {Number(selectedDetail.ConNo) > 0
                            ? `Quét Mã QR / Thanh Toán Hóa Đơn Này (${formatVND(selectedDetail.ConNo)}) →`
                            : 'Hóa Đơn Đã Đóng Đủ — Xem Chi Tiết Thanh Toán →'}
                        </Link>
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