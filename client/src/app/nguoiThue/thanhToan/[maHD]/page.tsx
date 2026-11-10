// client/src/app/nguoiThue/thanhToan/[maHD]/page.tsx
'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '@/components/common/ProtectedRoute';

import { useAlertModal } from '@/components/common/AlertModalProvider';
import { thanhToanService, PayOSQrData } from '@/services/thanhToan.service';

export default function NguoiThueThanhToanHoaDonPage() {
  const params = useParams();
  const maHD = Number(params.maHD);
  const { showSuccess, showError, showConfirm } = useAlertModal();

  const [loading, setLoading] = useState<boolean>(true);
  const [hoaDon, setHoaDon] = useState<any>(null);
  const [thongTinNH, setThongTinNH] = useState<any>(null);

  const [phuongThuc, setPhuongThuc] = useState<'ChuyenKhoan' | 'TienMat'>('ChuyenKhoan');
  const [qrData, setQrData] = useState<PayOSQrData | null>(null);
  const [creatingQR, setCreatingQR] = useState<boolean>(false);
  const [autoVerified, setAutoVerified] = useState<boolean>(false);
  const [cashNote, setCashNote] = useState<string>('');
  const [sendingCash, setSendingCash] = useState<boolean>(false);

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

          if (hd.ConNo > 0 && !qrInitializedRef.current) {
            qrInitializedRef.current = true;
            setCreatingQR(true);
            const qrRes = await thanhToanService.taoLinkPayOS({
              MaHD: maHD,
              SoTien: hd.ConNo,
            });
            if (qrRes.success && qrRes.data) {
              setQrData(qrRes.data);
            }
            setCreatingQR(false);
          }
        } else if (res.message) {
          showError(res.message);
        }
      } catch {
        showError('Không thể tải thông tin hóa đơn lúc này!');
      } finally {
        if (showInitialSpinner) setLoading(false);
      }
    },
    [maHD]
  );

  useEffect(() => {
    qrInitializedRef.current = false;
    if (maHD) {
      loadInvoiceData(true);
    }
  }, [maHD, loadInvoiceData]);

  // Kiểm tra xác thực chuyển khoản ngầm mỗi 4 giây (Không bật màn hình Loading)
  useEffect(() => {
    if (!qrData?.MaTT || autoVerified || !hoaDon || hoaDon.ConNo <= 0) return;

    const timer = setInterval(async () => {
      try {
        const res = await thanhToanService.kiemTraPayOS(qrData.MaTT);
        if (res.success && res.paid) {
          setAutoVerified(true);
          clearInterval(timer);
          showSuccess('Thanh toán chuyển khoản thành công! Hóa đơn đã được gạch nợ tự động.');
          await loadInvoiceData(false);
        }
      } catch {
        // Bỏ qua lỗi mạng tạm thời
      }
    }, 4000);

    return () => clearInterval(timer);
  }, [qrData?.MaTT, autoVerified, hoaDon?.ConNo, loadInvoiceData]);

  const handleBaoTraTienMat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cashNote.trim()) {
      showError('Vui lòng nhập ghi chú thời gian hoặc người nhận tiền mặt!');
      return;
    }

    showConfirm(
      `Xác nhận gửi thông báo bạn đã trả ${Number(hoaDon?.ConNo || 0).toLocaleString('vi-VN')} đ tiền mặt cho Chủ trọ / Quản lý?`,
      'Xác nhận báo trả tiền mặt',
      async () => {
        try {
          setSendingCash(true);
          const res = await thanhToanService.guiYeuCauTienMat({
            MaHD: maHD,
            SoTien: hoaDon.ConNo,
            GhiChu: cashNote.trim(),
          });
          if (res.success) {
            showSuccess(
              res.message ||
                'Đã gửi yêu cầu xác nhận trả tiền mặt thành công!'
            );
            setCashNote('');
            await loadInvoiceData(false);
          } else {
            showError(res.message || 'Lỗi khi gửi yêu cầu xác nhận tiền mặt');
          }
        } catch {
          showError('Lỗi kết nối khi gửi yêu cầu');
        } finally {
          setSendingCash(false);
        }
      },
      'Xác nhận',
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

  // ƯU TIÊN HIỂN THỊ MÃ QR ĐỘNG CỦA PAYOS
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
    <ProtectedRoute allowedRoles={['KhachThue']}>
      {(user) => (
        <div className="flex-1 flex flex-col bg-white text-slate-900">
          <main className="flex-1 max-w-2xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
            <div>
              <Link
                href="/nguoiThue/hoaDon"
                className="text-xs font-bold text-slate-600 hover:text-slate-900 no-underline"
              >
                ← Quay lại danh sách Hóa đơn
              </Link>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-2">
                {hoaDon
                  ? `Thanh Toán Hóa Đơn #${hoaDon.MaHD} — Phòng ${hoaDon.TenPhong}`
                  : 'Thanh Toán Hóa Đơn'}
              </h1>
              {hoaDon && (
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  {hoaDon.TenKhu} • Kỳ {hoaDon.NgayTinh}
                  {hoaDon.MaHDT ? ` • Hợp đồng #${hoaDon.MaHDT}` : ''}
                </p>
              )}
            </div>

            {loading || !hoaDon ? (
              <div className="py-16 text-center text-sm text-slate-500">
                Đang tải thông tin thanh toán hóa đơn...
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                    <span className="text-xs font-semibold text-slate-500">
                      Tổng hóa đơn
                    </span>
                    <p className="text-base font-bold text-slate-900 mt-0.5">
                      {Number(hoaDon.TongTien).toLocaleString('vi-VN')} đ
                    </p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-[#00FFCC]/20 border border-teal-200">
                    <span className="text-xs font-semibold text-teal-900">
                      Đã trả
                    </span>
                    <p className="text-base font-extrabold text-teal-700 mt-0.5">
                      {Number(hoaDon.TienDaTra).toLocaleString('vi-VN')} đ
                    </p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200">
                    <span className="text-xs font-semibold text-red-600">
                      Cần thanh toán
                    </span>
                    <p className="text-base font-extrabold text-red-600 mt-0.5">
                      {Number(hoaDon.ConNo).toLocaleString('vi-VN')} đ
                    </p>
                  </div>
                </div>

                {hoaDon.ConNo <= 0 || autoVerified ? (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center space-y-2">
                    <h2 className="text-lg font-bold text-emerald-800">
                      Đã xác thực thanh toán thành công!
                    </h2>
                    <p className="text-xs text-emerald-700">
                      Hệ thống đã tự động gạch nợ cho hóa đơn của bạn.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setPhuongThuc('ChuyenKhoan')}
                        className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs transition cursor-pointer ${
                          phuongThuc === 'ChuyenKhoan'
                            ? 'bg-[#00FFCC] text-slate-900'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Chuyển khoản QR (Tự động xác nhận)
                      </button>
                      <button
                        type="button"
                        onClick={() => setPhuongThuc('TienMat')}
                        className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs transition cursor-pointer ${
                          phuongThuc === 'TienMat'
                            ? 'bg-[#00FFCC] text-slate-900'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Trả tiền mặt (Chờ xác nhận)
                      </button>
                    </div>

                    {phuongThuc === 'ChuyenKhoan' ? (
                      <div className="rounded-2xl border-2 border-[#00FFCC] bg-slate-50 p-5 text-center space-y-4">
                        {creatingQR ? (
                          <p className="py-8 text-xs text-slate-500">
                            Đang tải mã QR PayOS...
                          </p>
                        ) : (
                          <>
                            <div className="inline-block p-3 bg-white border border-slate-200 rounded-2xl shadow-2xs">
                              <img
                                src={qrImageUrl}
                                alt="VietQR PayOS"
                                className="w-60 h-auto mx-auto rounded-lg"
                              />
                            </div>

                            <div className="text-xs space-y-1.5 bg-white p-4 rounded-2xl border border-slate-200 text-left">
                              <p>
                                Ngân hàng:{' '}
                                <strong>{thongTinNH?.TenNganHang || 'MB Bank'}</strong>
                              </p>
                              <p>
                                Số tài khoản:{' '}
                                <strong className="text-teal-700">{stk}</strong>
                              </p>
                              <p>
                                Chủ tài khoản: <strong>{chuTK}</strong>
                              </p>
                              <p>
                                Số tiền:{' '}
                                <strong className="text-red-600">
                                  {Number(qrData?.amount || hoaDon.ConNo).toLocaleString('vi-VN')} đ
                                </strong>
                              </p>
                              <p>
                                Nội dung CK (Đã gắn sẵn trong QR):{' '}
                                <strong className="bg-[#00FFCC]/30 px-2 py-0.5 rounded text-slate-900">
                                  {noiDungCK}
                                </strong>
                              </p>
                            </div>

                            <div className="text-xs font-bold text-slate-900 bg-[#00FFCC]/30 py-2.5 px-4 rounded-full">
                              Quét mã trên ứng dụng Ngân hàng — Hệ thống tự động xác nhận sau 3 giây!
                            </div>
                          </>
                        )}
                      </div>
                    ) : (
                      <form
                        onSubmit={handleBaoTraTienMat}
                        className="border border-slate-200 rounded-2xl p-5 space-y-4 bg-slate-50"
                      >
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">
                            Ghi chú trả tiền mặt (Thời gian trả, người nhận...) *
                          </label>
                          <input
                            type="text"
                            required
                            value={cashNote}
                            onChange={(e) => setCashNote(e.target.value)}
                            placeholder="VD: Đã gửi tiền mặt cho quản lý Tuấn Nghĩa lúc 18h"
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={sendingCash}
                          className="w-full py-2.5 rounded-full bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 border border-teal-300 text-xs font-bold transition cursor-pointer"
                        >
                          {sendingCash
                            ? 'Đang gửi yêu cầu...'
                            : 'Gửi Yêu Cầu Xác Nhận Trả Tiền Mặt'}
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      )}
    </ProtectedRoute>
  );
}