// client/src/app/datPhong/hoaDon/page.tsx
'use client';

import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import HomeHeader from '@/components/layout/homeHeader';
import AppFooter from '@/components/layout/AppFooter';
import { datPhongService } from '@/services/datPhong.service';
import { DatPhongItem, PayOSBookingQrResponse } from '@/types/datPhong.type';

const formatVND = (amount?: number | null) =>
  `${Math.round(Number(amount || 0)).toLocaleString('vi-VN')}đ`;

const formatCountdown = (seconds: number) => {
  const safe = Math.max(0, seconds);
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

interface CachedPaymentSession {
  qrResult: PayOSBookingQrResponse;
  room?: {
    MaPhong: number;
    TenPhong: string;
    TenKhu: string;
    DiaChi: string;
    DienTich?: number;
    Gia?: number;
  };
}

function ThanhToanPayOSContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const maTraCuuParam = (searchParams.get('maTraCuu') || '').trim();
  const tokenParam = (searchParams.get('token') || '').trim();

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [booking, setBooking] = useState<DatPhongItem | null>(null);
  const [qrResult, setQrResult] = useState<PayOSBookingQrResponse | null>(null);
  const [roomBrief, setRoomBrief] = useState<CachedPaymentSession['room'] | null>(null);

  const [secondsLeft, setSecondsLeft] = useState<number>(15 * 60);
  const [isExpired, setIsExpired] = useState(false);
  const [paidSuccess, setPaidSuccess] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const expireHandledRef = useRef(false);

  const redirectToInvoice = useCallback(
    (code: string, token: string) => {
      try {
        localStorage.removeItem(`payos_qr_${code}`);
      } catch {
        // ignore
      }
      const invoiceUrl = `/datPhong/hoaDon/${encodeURIComponent(
        code
      )}?token=${encodeURIComponent(token)}`;
      router.replace(invoiceUrl);
    },
    [router]
  );

  // Tải phiên thanh toán QR từ localStorage và đồng bộ trạng thái thật từ Backend
  useEffect(() => {
    if (!maTraCuuParam || !tokenParam) {
      setErrorMsg('Thiếu thông tin mã đơn thanh toán. Vui lòng tạo lại yêu cầu đặt phòng.');
      setLoading(false);
      return;
    }

    let cached: CachedPaymentSession | null = null;
    try {
      const raw = localStorage.getItem(`payos_qr_${maTraCuuParam}`);
      if (raw) {
        cached = JSON.parse(raw);
        if (cached?.qrResult) setQrResult(cached.qrResult);
        if (cached?.room) setRoomBrief(cached.room);
      }
    } catch {
      // ignore
    }

    datPhongService
      .layHoaDon(maTraCuuParam, { token: tokenParam })
      .then((res) => {
        const data = res.data;
        setBooking(data);

        // Nếu đơn đã thanh toán thành công từ trước -> mở thẳng trang hóa đơn
        if (
          ['DaDatCoc', 'DaHoanCoc_ChotThue', 'DaHoanCoc_KhongThue', 'TrungLapCanHoan'].includes(
            data.TrangThai
          )
        ) {
          setPaidSuccess(true);
          redirectToInvoice(data.MaTraCuu, tokenParam);
          return;
        }

        // Nếu đơn đã hủy / quá hạn
        if (data.TrangThai === 'DaHuy' || data.TrangThai === 'QuaHanMatCoc') {
          setIsExpired(true);
          return;
        }

        // Tính lại thời gian hết hạn chính xác từ DB nếu không có cached expiredAt
        if (!cached?.qrResult && data.ThoiGianHetHanQR) {
          const expMs = new Date(data.ThoiGianHetHanQR.replace(' ', 'T')).getTime();
          const remain = Math.floor((expMs - Date.now()) / 1000);
          if (remain <= 0) {
            setSecondsLeft(0);
            setIsExpired(true);
          } else {
            setSecondsLeft(remain);
          }
        }
      })
      .catch((err: any) => {
        if (!cached?.qrResult) {
          setErrorMsg(err?.message || 'Không tìm thấy đơn thanh toán đặt cọc.');
        }
      })
      .finally(() => setLoading(false));
  }, [maTraCuuParam, tokenParam, redirectToInvoice]);

  // Xác định orderCode và mốc hết hạn (unix seconds)
  const activeOrderCode = qrResult?.orderCode || booking?.OrderCode || 0;
  const expiredAtUnix = qrResult?.payos?.expiredAt
    ? Number(qrResult.payos.expiredAt)
    : booking?.ThoiGianHetHanQR
    ? Math.floor(new Date(booking.ThoiGianHetHanQR.replace(' ', 'T')).getTime() / 1000)
    : 0;

  // Hàm xử lý khi hết 15 phút: báo Backend hủy đơn & mở lại phòng không có cọc
  const handleExpireOrder = useCallback(async () => {
    if (expireHandledRef.current || paidSuccess) return;
    expireHandledRef.current = true;
    setSecondsLeft(0);

    if (activeOrderCode) {
      try {
        const res = await datPhongService.huyDonQuaHan(activeOrderCode);
        // Trường hợp khách chuyển ở giây cuối 14:59 -> PayOS đã ghi nhận PAID
        if (res.data?.paid) {
          setPaidSuccess(true);
          const code = res.data.maTraCuu || maTraCuuParam;
          const token = res.data.tokenTraCuu || tokenParam;
          setTimeout(() => redirectToInvoice(code, token), 800);
          return;
        }
      } catch {
        // Fallback: Cron Job 1 phút trên server vẫn tự hủy đơn
      }
    }

    setIsExpired(true);
    try {
      localStorage.removeItem(`payos_qr_${maTraCuuParam}`);
    } catch {
      // ignore
    }
  }, [activeOrderCode, paidSuccess, maTraCuuParam, tokenParam, redirectToInvoice]);

  // Đồng hồ đếm ngược 15 phút
  useEffect(() => {
    if (loading || !expiredAtUnix || paidSuccess || isExpired) return;

    const tick = () => {
      const remain = Math.floor(expiredAtUnix - Date.now() / 1000);
      if (remain <= 0) {
        handleExpireOrder();
      } else {
        setSecondsLeft(remain);
      }
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [loading, expiredAtUnix, paidSuccess, isExpired, handleExpireOrder]);

  // Auto-polling mỗi 3 giây kiểm tra thanh toán PayOS
  useEffect(() => {
    if (loading || !activeOrderCode || isExpired || paidSuccess) return;

    let cancelled = false;
    const poll = async () => {
      try {
        const res = await datPhongService.kiemTraPayOS(activeOrderCode);
        if (cancelled) return;

        if (res.data?.paid) {
          setPaidSuccess(true);
          const code = res.data.maTraCuu || maTraCuuParam;
          const token = res.data.tokenTraCuu || tokenParam;
          setTimeout(() => {
            redirectToInvoice(code, token);
          }, 1000);
        } else if (res.data?.trangThai === 'DaHuy') {
          setIsExpired(true);
        }
      } catch {
        // Bỏ qua lỗi mạng tạm thời trong lúc polling ngầm
      }
    };

    poll();
    const interval = setInterval(poll, 3000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [loading, activeOrderCode, isExpired, paidSuccess, maTraCuuParam, tokenParam, redirectToInvoice]);

  const handleCopy = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(label);
      setTimeout(() => setCopiedField(null), 1800);
    } catch {
      // ignore
    }
  };

  const qrImageSrc = qrResult?.payos?.qrCode
    ? `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=8&data=${encodeURIComponent(
        qrResult.payos.qrCode
      )}`
    : '';

  const roomName = roomBrief?.TenPhong || booking?.TenPhong || '';
  const khuName = roomBrief?.TenKhu || booking?.TenKhu || '';
  const diaChi = roomBrief?.DiaChi || booking?.DiaChiKhu || '';
  const maPhongGoc = roomBrief?.MaPhong || booking?.MaPhong;

  return (
    <div className="min-h-screen flex flex-col bg-[#F1F5F9] text-slate-900">
      <HomeHeader />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6 sm:py-10 space-y-5">
        <div className="flex items-center justify-between gap-2">
          <Link
            href="/"
            className="text-xs font-bold text-slate-600 hover:text-slate-900 no-underline"
          >
            ← Quay về Trang chủ Xóm Trọ
          </Link>
          {maTraCuuParam && tokenParam && (
            <Link
              href={`/datPhong/hoaDon/${encodeURIComponent(maTraCuuParam)}?token=${encodeURIComponent(
                tokenParam
              )}`}
              className="text-xs font-bold text-teal-700 hover:text-teal-900 no-underline"
            >
              Xem trang hóa đơn →
            </Link>
          )}
        </div>

        {loading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center space-y-3">
            <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-[#00F5C4] border-t-slate-900" />
            <p className="text-sm font-semibold text-slate-600">
              Đang khởi tạo phiên thanh toán PayOS...
            </p>
          </div>
        ) : errorMsg ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-8 text-center space-y-3">
            <h1 className="text-base font-bold text-rose-800">{errorMsg}</h1>
            <Link
              href="/"
              className="inline-block rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white no-underline"
            >
              Quay về trang chủ
            </Link>
          </div>
        ) : (
          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            {/* Banner tiêu đề */}
            <div className="bg-[#00FFCC] px-6 py-5 text-slate-900">
              {khuName && (
                <span className="inline-block rounded-full bg-slate-900/10 px-3 py-0.5 text-[11px] font-bold">
                  {khuName}
                </span>
              )}
              <h1 className="mt-1.5 text-xl sm:text-2xl font-bold">
                Thanh Toán Đặt Cọc Giữ Phòng {roomName}
              </h1>
              <p className="text-xs text-slate-800 mt-1">
                {diaChi ? `${diaChi} • ` : ''}
                Mã tra cứu: <b>{maTraCuuParam}</b>
              </p>
            </div>

            <div className="p-6 sm:p-8">
              {paidSuccess ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center space-y-2.5">
                  <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xl font-bold">
                    ✓
                  </div>
                  <h2 className="text-base font-bold text-emerald-900">
                    Chuyển khoản đặt cọc thành công!
                  </h2>
                  <p className="text-xs text-emerald-700">
                    Hệ thống đã gửi Email hóa đơn kèm thông tin liên hệ quản lý và đang mở trang hóa đơn ({maTraCuuParam})...
                  </p>
                </div>
              ) : isExpired ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center space-y-3">
                  <h2 className="text-base font-bold text-rose-800">
                    Mã QR đã hết hiệu lực sau 15 phút
                  </h2>
                  <p className="text-xs text-rose-700 leading-relaxed">
                    Đơn đặt cọc <b>{maTraCuuParam}</b> đã tự động hủy và phòng đã được mở lại trạng thái{' '}
                    <b>Còn trống (không có cọc)</b> để khách hàng khác có thể thuê.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
                    {maPhongGoc && (
                      <Link
                        href={`/datPhong/${maPhongGoc}`}
                        className="rounded-xl bg-slate-900 hover:bg-slate-800 px-5 py-2.5 text-xs font-bold text-white no-underline"
                      >
                        Đặt cọc lại phòng này
                      </Link>
                    )}
                    <Link
                      href="/"
                      className="rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-5 py-2.5 text-xs font-bold text-slate-700 no-underline"
                    >
                      Xem phòng trống khác
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Thanh trạng thái & đồng hồ 15 phút */}
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-teal-200 bg-teal-50/70 px-4 py-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-teal-900">
                      <span className="inline-block h-2.5 w-2.5 rounded-full bg-teal-500 animate-ping" />
                      <span>Đang chờ chuyển khoản (tự kiểm tra mỗi 3 giây)...</span>
                    </div>
                    <span className="rounded-lg bg-slate-900 px-3 py-1 text-xs font-bold text-[#00FFCC] tabular-nums">
                      Hết hạn sau {formatCountdown(secondsLeft)}
                    </span>
                  </div>

                  {qrResult ? (
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                      <div className="md:col-span-5 flex flex-col items-center">
                        <div className="rounded-2xl border-2 border-[#00FFCC] bg-white p-3 shadow-sm">
                          <img
                            src={qrImageSrc}
                            alt="Mã VietQR PayOS"
                            className="w-60 h-60 object-contain"
                          />
                        </div>
                        <span className="mt-2 text-xs text-slate-500">
                          Mã GD PayOS: <b className="text-slate-900">{qrResult.orderCode}</b>
                        </span>
                      </div>

                      <div className="md:col-span-7 space-y-3 text-xs">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2.5">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-500">Số tiền cọc:</span>
                            <span className="text-base font-bold text-teal-700">
                              {formatVND(qrResult.payos.amount)}
                            </span>
                          </div>
                          <div className="flex justify-between gap-2">
                            <span className="text-slate-500">Chủ tài khoản:</span>
                            <span className="font-bold text-slate-900 text-right">
                              {qrResult.payos.accountName}
                            </span>
                          </div>
                          <div className="flex justify-between gap-2">
                            <span className="text-slate-500">Số tài khoản:</span>
                            <button
                              type="button"
                              onClick={() => handleCopy('STK', qrResult.payos.accountNumber)}
                              className="font-bold text-slate-900 cursor-pointer"
                            >
                              {qrResult.payos.accountNumber}{' '}
                              <span className="text-[11px] text-teal-600 underline">
                                {copiedField === 'STK' ? 'Đã chép' : 'Sao chép'}
                              </span>
                            </button>
                          </div>
                          <div className="flex justify-between gap-2">
                            <span className="text-slate-500">Nội dung CK:</span>
                            <button
                              type="button"
                              onClick={() => handleCopy('DESC', qrResult.payos.description)}
                              className="font-bold text-rose-700 cursor-pointer text-right"
                            >
                              {qrResult.payos.description}{' '}
                              <span className="text-[11px] text-teal-600 underline">
                                {copiedField === 'DESC' ? 'Đã chép' : 'Sao chép'}
                              </span>
                            </button>
                          </div>
                        </div>

                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          Lưu ý: Quét mã QR bằng ứng dụng ngân hàng để điền chính xác số tiền và nội dung.
                          Nếu không hoàn tất trong <b>15 phút</b>, giao dịch sẽ tự động hủy để khách khác có thể đặt phòng.
                        </p>


                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center space-y-2.5">
                      <p className="text-xs font-semibold text-amber-900">
                        Đơn <b>{maTraCuuParam}</b> đang chờ thanh toán trên thiết bị khác hoặc đã bị xóa bộ nhớ tạm QR.
                      </p>
                      <p className="text-xs text-amber-700">
                        Hệ thống vẫn đang tự động kiểm tra giao dịch của bạn. Nếu bạn chưa chuyển khoản, vui lòng tạo yêu cầu mới.
                      </p>
                      {maPhongGoc && (
                        <Link
                          href={`/datPhong/${maPhongGoc}`}
                          className="inline-block rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white no-underline"
                        >
                          Tạo lại mã QR mới
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <AppFooter />
    </div>
  );
}

export default function HoaDonThanhToanPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#F1F5F9] text-sm font-bold text-slate-500">
          Đang tải cổng thanh toán...
        </div>
      }
    >
      <ThanhToanPayOSContent />
    </Suspense>
  );
}