// client/src/app/chuTro/thanhToan/xacNhan/[maHD]/page.tsx
'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import QuanLyHeader from '@/components/layout/QuanLyHeader';
import { useAlertModal } from '@/components/common/AlertModalProvider';
import { thanhToanService, PayOSQrData } from '@/services/thanhToan.service';

export default function XacNhanTraTienPage() {
  const params = useParams();
  const router = useRouter();
  const maHD = Number(params.maHD);
  const { showSuccess, showError, showConfirm } = useAlertModal();

  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [hoaDon, setHoaDon] = useState<any>(null);
  const [thongTinNH, setThongTinNH] = useState<any>(null);
  const [lichSu, setLichSu] = useState<any[]>([]);

  const [soTienThu, setSoTienThu] = useState<number>(0);
  const [ghiChu, setGhiChu] = useState<string>('Thu tiền mặt trực tiếp tại phòng');

  const [qrData, setQrData] = useState<PayOSQrData | null>(null);
  const [loadingQR, setLoadingQR] = useState<boolean>(false);
  const [autoVerified, setAutoVerified] = useState<boolean>(false);

  // Dùng ref để đảm bảo chỉ gọi tạo/lấy QR đúng 1 lần khi vào trang
  const qrInitializedRef = useRef<boolean>(false);

  const loadInvoiceData = useCallback(
    async (showInitialSpinner = false) => {
      try {
        if (showInitialSpinner) setLoading(true);
        const res = await thanhToanService.getChiTietHoaDon(maHD);
        if (res.success && res.data) {
          const hd = res.data.hoaDon;
          setHoaDon(hd);
          setThongTinNH(res.data.thongTinThanhToan);
          setLichSu(res.data.lichSuThanhToan || []);
          setSoTienThu(hd.ConNo || 0);

          if (hd.ConNo > 0 && !qrInitializedRef.current) {
            qrInitializedRef.current = true;
            setLoadingQR(true);
            const qrRes = await thanhToanService.taoLinkPayOS({
              MaHD: maHD,
              SoTien: hd.ConNo,
            });
            if (qrRes.success && qrRes.data) {
              setQrData(qrRes.data);
            }
            setLoadingQR(false);
          } else if (hd.ConNo <= 0) {
            setQrData(null);
          }
        } else {
          showError(res.message || 'Không tải được thông tin hóa đơn');
          router.push('/chuTro/thanhToan');
        }
      } catch {
        showError('Không tải được thông tin hóa đơn');
        router.push('/chuTro/thanhToan');
      } finally {
        if (showInitialSpinner) setLoading(false);
      }
    },
    [maHD] // Chỉ phụ thuộc vào maHD để tuyệt đối không tự chạy lại khi state render
  );

  useEffect(() => {
    qrInitializedRef.current = false;
    if (maHD) {
      loadInvoiceData(true);
    }
  }, [maHD, loadInvoiceData]);

  // Kiểm tra trạng thái thanh toán ngầm mỗi 4 giây (Hoàn toàn im lặng, không làm nháy trang)
  useEffect(() => {
    if (!qrData?.MaTT || autoVerified || !hoaDon || hoaDon.ConNo <= 0) return;

    const timer = setInterval(async () => {
      try {
        const res = await thanhToanService.kiemTraPayOS(qrData.MaTT);
        if (res.success && res.paid) {
          setAutoVerified(true);
          clearInterval(timer);
          showSuccess('Đã xác thực chuyển khoản tự động từ PayOS thành công!');
          await loadInvoiceData(false);
        }
      } catch {
        // Bỏ qua lỗi mạng tạm thời khi polling ngầm
      }
    }, 4000);

    return () => clearInterval(timer);
  }, [qrData?.MaTT, autoVerified, hoaDon?.ConNo, loadInvoiceData]);

  const handleThuTienMatTrucTiep = (e: React.FormEvent) => {
    e.preventDefault();
    if (soTienThu <= 0) {
      showError('Số tiền xác nhận thu phải lớn hơn 0!');
      return;
    }

    showConfirm(
      `Bạn có chắc chắn muốn xác nhận đã nhận ${Number(soTienThu).toLocaleString('vi-VN')} đ tiền mặt của phòng ${hoaDon?.TenPhong} không?`,
      'Xác nhận thu tiền mặt',
      async () => {
        try {
          setSubmitting(true);
          const res = await thanhToanService.thuTienMatTrucTiep({
            MaHD: maHD,
            SoTien: soTienThu,
            PhuongThuc: 'TienMat',
            GhiChu: ghiChu,
          });
          if (res.success) {
            showSuccess('Đã xác nhận người thuê trả tiền mặt thành công!');
            await loadInvoiceData(false);
          } else {
            showError(res.message || 'Không thể xác nhận thu tiền mặt');
          }
        } catch {
          showError('Lỗi kết nối khi xác nhận thu tiền mặt');
        } finally {
          setSubmitting(false);
        }
      },
      'Xác nhận',
      'Hủy'
    );
  };

  const handleDuyetGiaoDich = (
    gd: any,
    trangThai: 'ThanhCong' | 'TuChoi'
  ) => {
    const isApprove = trangThai === 'ThanhCong';
    showConfirm(
      isApprove
        ? `Xác nhận khoản thanh toán ${Number(gd.SoTien).toLocaleString('vi-VN')} đ này là hợp lệ?`
        : `Bạn có chắc chắn muốn từ chối giao dịch ${Number(gd.SoTien).toLocaleString('vi-VN')} đ này không?`,
      isApprove ? 'Xác nhận trả tiền' : 'Từ chối giao dịch',
      async () => {
        try {
          setSubmitting(true);
          const res = await thanhToanService.duyetGiaoDich(gd.MaTT, {
            TrangThai: trangThai,
          });
          if (res.success) {
            showSuccess(
              res.message ||
                (isApprove
                  ? 'Đã xác nhận thanh toán thành công!'
                  : 'Đã từ chối giao dịch!')
            );
            await loadInvoiceData(false);
          } else {
            showError(res.message || 'Lỗi khi duyệt giao dịch');
          }
        } catch {
          showError('Lỗi khi duyệt giao dịch');
        } finally {
          setSubmitting(false);
        }
      },
      isApprove ? 'Xác nhận' : 'Từ chối',
      'Hủy'
    );
  };

  const bankBin = qrData?.bin || '970422';
  const stk = qrData?.accountNumber || thongTinNH?.STK || '0931493785';
  const chuTK =
    qrData?.accountName || thongTinNH?.ChuTaiKhoan || 'TRAN TUAN NGHIA';
  const noiDungCK =
    qrData?.description ||
    (hoaDon?.MaHDT
      ? `HDT${hoaDon.MaHDT} HD${hoaDon?.MaHD} ${hoaDon?.TenPhong}`
      : `HD${hoaDon?.MaHD} ${hoaDon?.TenPhong}`);

  // ƯU TIÊN DÙNG MÃ QR ĐỘNG CỦA PAYOS (qrData.qrCode) ĐỂ PAYOS TỰ ĐỘNG BẮT ĐƯỢC GIAO DỊCH
  const qrImageUrl = qrData?.qrCode
    ? `https://quickchart.io/qr?text=${encodeURIComponent(qrData.qrCode)}&size=320&margin=1`
    : hoaDon
    ? `https://img.vietqr.io/image/${bankBin}-${stk}-compact2.png?amount=${
        qrData?.amount || hoaDon.ConNo
      }&addInfo=${encodeURIComponent(noiDungCK)}&accountName=${encodeURIComponent(
        chuTK
      )}`
    : '';

  return (
    <ProtectedRoute allowedRoles={['ChuTro', 'QuanLy']}>
      {(user) => (
        <div className="flex-1 flex flex-col bg-white text-slate-900">
          <QuanLyHeader user={user} />

          <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
            <div>
              <Link
                href="/chuTro/thanhToan"
                className="text-xs font-bold text-slate-600 hover:text-slate-900 no-underline inline-flex items-center gap-1"
              >
                ← Quay lại danh sách Thanh toán
              </Link>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-2">
                {hoaDon
                  ? `Xác Nhận Thanh Toán — Phòng ${hoaDon.TenPhong}`
                  : 'Chi Tiết Thanh Toán Hóa Đơn'}
              </h1>
              {hoaDon && (
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  {hoaDon.TenKhu} • Hóa đơn #{hoaDon.MaHD} (Kỳ {hoaDon.NgayTinh})
                  {hoaDon.MaHDT ? ` • Hợp đồng #${hoaDon.MaHDT}` : ''} • Khách đại
                  diện: <strong>{hoaDon.TenKhachThue}</strong>
                </p>
              )}
            </div>

            {loading || !hoaDon ? (
              <div className="py-16 text-center text-sm text-slate-500">
                Đang tải chi tiết hóa đơn & khởi tạo mã QR hợp đồng...
              </div>
            ) : (
              <>
                <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                      <span className="text-xs font-semibold text-slate-500">
                        Tổng tiền hóa đơn
                      </span>
                      <p className="text-lg font-bold text-slate-900 mt-1">
                        {Number(hoaDon.TongTien).toLocaleString('vi-VN')} đ
                      </p>
                    </div>
                    <div className="p-4 rounded-2xl bg-[#00FFCC]/15 border border-teal-200">
                      <span className="text-xs font-semibold text-teal-900">
                        Số tiền đã trả
                      </span>
                      <p className="text-lg font-extrabold text-teal-700 mt-1">
                        {Number(hoaDon.TienDaTra).toLocaleString('vi-VN')} đ
                      </p>
                    </div>
                    <div className="p-4 rounded-2xl bg-red-50 border border-red-200">
                      <span className="text-xs font-semibold text-red-600">
                        Số tiền còn phải thu
                      </span>
                      <p className="text-lg font-extrabold text-red-600 mt-1">
                        {Number(hoaDon.ConNo).toLocaleString('vi-VN')} đ
                      </p>
                    </div>
                  </div>

                  {hoaDon.ConNo <= 0 || autoVerified ? (
                    <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-1.5">
                      <p className="text-base font-bold text-emerald-800">
                        Hóa đơn này đã được thanh toán hoàn tất!
                      </p>
                      <p className="text-xs text-emerald-700">
                        Toàn bộ số tiền đã được xác thực và gạch nợ vào hóa đơn #{hoaDon.MaHD}.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2 border-t border-slate-100">
                      <div className="lg:col-span-5 rounded-2xl border-2 border-[#00FFCC] bg-slate-50 p-5 flex flex-col items-center text-center justify-between space-y-4">
                        <div className="space-y-1">
                          <span className="px-3 py-1 rounded-full bg-[#00FFCC] text-slate-900 text-xs font-bold">
                            Mã QR PayOS Tự Động Xác Thực
                          </span>
                          <p className="text-xs text-slate-600 pt-1">
                            Đã gắn sẵn số tiền & mã đơn hàng #{qrData?.orderCode}. Tự động gạch nợ sau khi quét mã
                          </p>
                        </div>

                        {loadingQR ? (
                          <div className="py-12 text-xs text-slate-500">
                            Đang tạo mã QR PayOS...
                          </div>
                        ) : (
                          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
                            <img
                              src={qrImageUrl}
                              alt="Mã QR Thanh toán Hợp đồng"
                              className="w-56 h-auto mx-auto rounded-lg"
                            />
                          </div>
                        )}

                        {qrData?.payosNote && !qrData?.qrCode && (
                          <div className="w-full p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800 font-medium">
                            Lưu ý PayOS: {qrData.payosNote}
                          </div>
                        )}

                        <div className="w-full text-left text-xs space-y-1.5 bg-white p-3.5 rounded-2xl border border-slate-200">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Ngân hàng:</span>
                            <strong className="text-slate-900">
                              {thongTinNH?.TenNganHang || 'MB Bank'}
                            </strong>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Số tài khoản nhận:</span>
                            <strong className="text-teal-700">{stk}</strong>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Số tiền:</span>
                            <strong className="text-red-600">
                              {Number(qrData?.amount || hoaDon.ConNo).toLocaleString('vi-VN')} đ
                            </strong>
                          </div>
                          <div className="pt-1.5 border-t border-slate-100">
                            <span className="text-slate-500 block mb-1">
                              Nội dung chuyển khoản tự động:
                            </span>
                            <div className="px-2.5 py-1.5 rounded-xl bg-[#00FFCC]/25 text-slate-900 font-bold text-center">
                              {noiDungCK}
                            </div>
                          </div>
                        </div>

                        <div className="w-full text-xs font-bold text-slate-900 bg-[#00FFCC]/30 py-2 px-3 rounded-full">
                          Đang chờ quét mã xác thực tự động từ PayOS...
                        </div>
                      </div>

                      <form
                        onSubmit={handleThuTienMatTrucTiep}
                        className="lg:col-span-7 flex flex-col justify-between space-y-5 bg-slate-50 rounded-2xl border border-slate-200 p-5 sm:p-6"
                      >
                        <div className="space-y-4">
                          <div>
                            <h2 className="text-base font-bold text-slate-900">
                              Xác Nhận Khi Người Thuê Trả Tiền Mặt
                            </h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Dành cho Chủ trọ hoặc Quản lý cơ sở xác nhận trực tiếp khi nhận tiền mặt từ người thuê
                            </p>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">
                              Số tiền mặt thực thu (VNĐ) *
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                min={1000}
                                max={hoaDon.ConNo}
                                required
                                value={soTienThu}
                                onChange={(e) => setSoTienThu(Number(e.target.value))}
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
                              />
                              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                                VNĐ
                              </span>
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">
                              Ghi chú xác nhận trả tiền mặt
                            </label>
                            <input
                              type="text"
                              value={ghiChu}
                              onChange={(e) => setGhiChu(e.target.value)}
                              placeholder="VD: Đã thu đủ tiền mặt trực tiếp tại phòng..."
                              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
                            />
                          </div>
                        </div>

                        <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
                          <Link
                            href="/chuTro/thanhToan"
                            className="px-5 py-2.5 rounded-full border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold no-underline transition"
                          >
                            Hủy
                          </Link>
                          <button
                            type="submit"
                            disabled={submitting}
                            className="px-6 py-2.5 rounded-full bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 border border-teal-300 text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50"
                          >
                            {submitting
                              ? 'Đang xử lý...'
                              : 'Xác Nhận Đã Nhận Tiền Mặt'}
                          </button>
                        </div>
                      </form>
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-4">
                  <h2 className="text-base font-bold text-slate-900">
                    Lịch Sử Giao Dịch Của Hóa Đơn #{hoaDon.MaHD}
                  </h2>

                  {lichSu.length === 0 ? (
                    <p className="text-xs sm:text-sm text-slate-500">
                      Chưa có giao dịch nào được ghi nhận cho hóa đơn này.
                    </p>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {lichSu.map((gd) => (
                        <div
                          key={gd.MaTT}
                          className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-extrabold text-teal-700">
                                {Number(gd.SoTien).toLocaleString('vi-VN')} đ
                              </span>
                              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#00FFCC]/25 text-slate-900 border border-teal-200">
                                {gd.PhuongThuc === 'TienMat'
                                  ? 'Tiền mặt'
                                  : 'Chuyển khoản QR'}
                              </span>
                              {gd.TrangThai === 'ThanhCong' ? (
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  Đã xác nhận
                                </span>
                              ) : gd.TrangThai === 'TuChoi' ? (
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-300">
                                  Đã từ chối
                                </span>
                              ) : (
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                  Chờ xác nhận
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500">
                              {gd.NgayTT} • {gd.GhiChu}
                            </p>
                          </div>

                          {gd.TrangThai === 'ChoXacNhan' && (
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                disabled={submitting}
                                onClick={() => handleDuyetGiaoDich(gd, 'ThanhCong')}
                                className="px-4 py-2 rounded-xl bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 text-xs font-bold transition cursor-pointer"
                              >
                                Xác nhận trả
                              </button>
                              <button
                                type="button"
                                disabled={submitting}
                                onClick={() => handleDuyetGiaoDich(gd, 'TuChoi')}
                                className="px-3.5 py-2 rounded-xl border border-red-200 bg-white hover:bg-red-50 text-red-600 text-xs font-bold transition cursor-pointer"
                              >
                                Từ chối
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </main>
        </div>
      )}
    </ProtectedRoute>
  );
}