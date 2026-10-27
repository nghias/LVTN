'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import QuanLyHeader from '@/components/layout/QuanLyHeader';
import { useAlertModal } from '@/components/common/AlertModalProvider';
import { hoaDonService, HoaDonChiTiet } from '@/services/hoaDon.service';

export default function ChiTietHoaDonPage() {
  const params = useParams();
  const router = useRouter();
  const maHD = Number(params?.maHD);
  const { showError } = useAlertModal();

  const [detail, setDetail] = useState<HoaDonChiTiet | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

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

  useEffect(() => {
    if (!maHD) return;
    let isMounted = true;

    const fetchDetail = async () => {
      try {
        setLoading(true);
        const res = await hoaDonService.getById(maHD);
        if (!isMounted) return;

        if (res.success && res.data) {
          setDetail(res.data);
        } else {
          showError('Không tìm thấy chi tiết hóa đơn.');
          router.push('/chuTro/hoaDon');
        }
      } catch {
        if (isMounted) showError('Không thể tải chi tiết hóa đơn.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchDetail();
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maHD]);

  return (
    <ProtectedRoute allowedRoles={['ChuTro', 'QuanLy']}>
      {(user) => (
        <div className="min-h-screen flex flex-col bg-white text-slate-900">
          <QuanLyHeader user={user} />

          <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <Link
                  href="/chuTro/hoaDon"
                  className="text-xs font-bold text-slate-600 hover:text-slate-900 no-underline"
                >
                  ← Quay lại danh sách Hóa đơn
                </Link>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-2">
                  Chi Tiết Hóa Đơn #{maHD}
                </h1>
              </div>

              {detail && (
                <div className="flex items-center gap-2">
                  <Link
                    href={`/chuTro/hoaDon/sua/${detail.MaHD}`}
                    className="px-5 py-2.5 rounded-full bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 text-xs font-bold no-underline"
                  >
                    Chỉnh sửa hóa đơn
                  </Link>
                </div>
              )}
            </div>

            {loading || !detail ? (
              <div className="py-16 text-center text-slate-500 text-sm font-bold">
                Đang tải chi tiết hóa đơn...
              </div>
            ) : (
              <div className="border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6 bg-white">
                {/* Thông tin chung */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      {detail.TenKhu}
                    </span>
                    <h2 className="text-2xl font-bold text-slate-900 mt-0.5">
                      {detail.TenPhong}
                    </h2>
                    <p className="text-xs font-semibold text-slate-500 mt-1">
                      Ngày lập hóa đơn: <strong>{formatDateVN(detail.NgayTinh)}</strong> | Ngày ghi chỉ số: <strong>{formatDateVN(detail.NgayGhiChiSo)}</strong>
                    </p>
                  </div>

                  <div className="text-left sm:text-right">
                    {detail.ConNo <= 0 ? (
                      <span className="inline-block px-4 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                        Đã thanh toán đủ
                      </span>
                    ) : Number(detail.TienDaTra) > 0 ? (
                      <span className="inline-block px-4 py-1.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
                        Đã trả một phần
                      </span>
                    ) : (
                      <span className="inline-block px-4 py-1.5 rounded-full bg-rose-100 text-rose-700 text-xs font-bold">
                        Chưa thanh toán
                      </span>
                    )}
                  </div>
                </div>

                {/* 1. Tiền phòng */}
                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      1. Tiền thuê phòng cố định
                    </p>
                  </div>
                  <p className="text-base font-bold text-slate-900">
                    {formatVND(detail.TienPhong)}
                  </p>
                </div>

                {/* 2. Tiền điện & nước */}
                <div className="space-y-3 pb-4 border-b border-slate-100">
                  <p className="text-sm font-bold text-slate-900">
                    2. Chi tiết Điện & Nước tiêu thụ (Mã CS #{detail.MaCS})
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 flex items-center justify-between">
                      <div className="text-xs space-y-1">
                        <p className="font-bold text-amber-900">Tiền Điện</p>
                        <p className="font-semibold text-slate-600">
                          Chỉ số: {detail.SoDienCu} → {detail.SoDienMoi} ({detail.DienTieuThu} kWh)
                        </p>
                        <p className="font-semibold text-slate-600">
                          Đơn giá: {formatVND(detail.GiaDien)}/kWh
                        </p>
                      </div>
                      <p className="text-base font-bold text-amber-900">
                        {formatVND(detail.TienDien)}
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-200 flex items-center justify-between">
                      <div className="text-xs space-y-1">
                        <p className="font-bold text-sky-900">Tiền Nước</p>
                        <p className="font-semibold text-slate-600">
                          Chỉ số: {detail.SoNuocCu} → {detail.SoNuocMoi} ({detail.NuocTieuThu} m³)
                        </p>
                        <p className="font-semibold text-slate-600">
                          Đơn giá: {formatVND(detail.GiaNuoc)}/m³
                        </p>
                      </div>
                      <p className="text-base font-bold text-sky-900">
                        {formatVND(detail.TienNuoc)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 3. Phí dịch vụ theo hợp đồng */}
                <div className="space-y-3 pb-4 border-b border-slate-100">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-slate-900">
                      3. Phí dịch vụ theo hợp đồng ({detail.DanhSachDichVu.length})
                    </p>
                    <p className="text-base font-bold text-teal-800">
                      {formatVND(detail.TienPhuPhi)}
                    </p>
                  </div>

                  {detail.DanhSachDichVu.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {detail.DanhSachDichVu.map((dv) => (
                        <div
                          key={dv.MaDV}
                          className="px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-bold text-slate-800">
                              {dv.TenDV}
                            </span>
                            <span className="text-slate-500 font-semibold ml-1.5">
                              ({formatVND(dv.DonGia)} × {dv.SoLuong} {dv.DonViTinh})
                            </span>
                          </div>
                          <span className="font-bold text-slate-900">
                            {formatVND(dv.ThanhTien)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 4. Phí phát sinh */}
                <div className="space-y-3 pb-4 border-b border-slate-100">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-slate-900">
                      4. Chi phí phát sinh ({detail.DanhSachPhatSinh.length})
                    </p>
                    <p className="text-base font-bold text-purple-800">
                      {formatVND(detail.TienPhatSinh)}
                    </p>
                  </div>

                  {detail.DanhSachPhatSinh.length > 0 ? (
                    <div className="space-y-2">
                      {detail.DanhSachPhatSinh.map((ps, idx) => (
                        <div
                          key={ps.MaPS || idx}
                          className="px-4 py-2.5 rounded-xl bg-purple-50/50 border border-purple-200 flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-bold text-slate-900">
                              {ps.TenPS}
                            </span>
                            {ps.GhiChu && (
                              <span className="text-slate-500 font-semibold ml-2">
                                — {ps.GhiChu}
                              </span>
                            )}
                          </div>
                          <span className="font-bold text-purple-900">
                            {formatVND(ps.Gia)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 font-semibold">
                      Không có khoản phí phát sinh nào trong kỳ này.
                    </p>
                  )}
                </div>

                {/* Tổng kết thanh toán */}
                <div className="p-5 rounded-2xl bg-slate-900 text-white grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs font-bold text-slate-400">
                      Tổng cộng hóa đơn
                    </p>
                    <p className="text-xl font-bold text-white mt-1">
                      {formatVND(detail.TongTien)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400">
                      Số tiền đã trả
                    </p>
                    <p className="text-xl font-bold text-[#00FFCC] mt-1">
                      {formatVND(detail.TienDaTra)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400">
                      Dư nợ còn lại
                    </p>
                    <p className="text-xl font-bold text-rose-400 mt-1">
                      {formatVND(detail.ConNo)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      )}
    </ProtectedRoute>
  );
}