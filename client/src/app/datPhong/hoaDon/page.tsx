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

interface WrongAmountAlert {
  amountStatus: 'UNDERPAID' | 'OVERPAID';
  expectedAmount: number;
  paidAmount: number;
  remainingAmount: number;
  overpaidAmount: number;
  warningMessage: string;
}

function extractWrongAmountAlert(data: any): WrongAmountAlert | null {
  if (
    !data?.isWrongAmount ||
    (data?.amountStatus !== 'UNDERPAID' && data?.amountStatus !== 'OVERPAID')
  ) {
    return null;
  }

  return {
    amountStatus: data.amountStatus,
    expectedAmount: Number(data.expectedAmount || 0),
    paidAmount: Number(data.paidAmount || 0),
    remainingAmount: Number(data.remainingAmount || 0),
    overpaidAmount: Number(data.overpaidAmount || 0),
    warningMessage:
      data.warningMessage ||
      'Số tiền chuyển khoản không khớp với mức đặt cọc 15% quy định.',
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
  const [wrongAmountAlert, setWrongAmountAlert] = useState<WrongAmountAlert | null>(null);

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

  // Hàm xử lý khi hết 15 phút: báo Backend hủy đơn & kiểm tra xem khách có lỡ chuyển thiếu/đủ ở giây cuối không
  const handleExpireOrder = useCallback(async () => {
    if (expireHandledRef.current || paidSuccess) return;
    expireHandledRef.current = true;
    setSecondsLeft(0);

    if (activeOrderCode) {
      try {
        const res = await datPhongService.huyDonQuaHan(activeOrderCode);
        const data = res.data as any;
        const alertInfo = extractWrongAmountAlert(data);

        if (alertInfo) {
          setWrongAmountAlert(alertInfo);
        }

        // Trường hợp khách chuyển đủ ở giây cuối 14:59 -> PayOS đã ghi nhận PAID
        if (data?.paid) {
          setPaidSuccess(true);
          const code = data.maTraCuu || maTraCuuParam;
          const token = data.tokenTraCuu || tokenParam;
          const delayMs = alertInfo?.amountStatus === 'OVERPAID' ? 3500 : 800;
          setTimeout(() => redirectToInvoice(code, token), delayMs);
          return;
        }
      } catch {
        // Fallback: Cron Job trên server vẫn tự hủy đơn
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

  // Auto-polling mỗi 3 giây kiểm tra thanh toán & đối chiếu số tiền thực nhận trên PayOS
  useEffect(() => {
    if (loading || !activeOrderCode || isExpired || paidSuccess) return;

    let cancelled = false;
    const poll = async () => {
      try {
        const res = await datPhongService.kiemTraPayOS(activeOrderCode);
        if (cancelled) return;

        const data = res.data as any;
        const alertInfo = extractWrongAmountAlert(data);
        setWrongAmountAlert(alertInfo);

        if (data?.paid) {
          setPaidSuccess(true);
          const code = data.maTraCuu || maTraCuuParam;
          const token = data.tokenTraCuu || tokenParam;
          // Nếu khách chuyển thừa tiền -> giữ 3.5 giây để đọc cảnh báo hoàn tiền thừa
          const delayMs = alertInfo?.amountStatus === 'OVERPAID' ? 3500 : 1000;
          setTimeout(() => {
            redirectToInvoice(code, token);
          }, delayMs);
        } else if (data?.trangThai === 'DaHuy') {
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
  }, [
    loading,
    activeOrderCode,
    isExpired,
    paidSuccess,
    maTraCuuParam,
    tokenParam,
    redirectToInvoice,
  ]);

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
  const requiredAmount = qrResult?.payos?.amount || booking?.SoTienCoc || 0;
  const isUnderpaid = wrongAmountAlert?.amountStatus === 'UNDERPAID';
  const isOverpaid = wrongAmountAlert?.amountStatus === 'OVERPAID';

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
                <div className="space-y-4">
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

                  {/* Cảnh báo nếu khách chuyển thừa tiền */}
                  {isOverpaid && wrongAmountAlert && (
                    <div
                      role="alert"
                      className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-950 space-y-2.5"
                    >
                      <p className="font-bold text-sm text-amber-900">
                        Cảnh báo: Bạn đã chuyển THỪA {formatVND(wrongAmountAlert.overpaidAmount)}!
                      </p>
                      <p className="leading-relaxed">{wrongAmountAlert.warningMessage}</p>
                      <div className="grid grid-cols-3 gap-2 text-center pt-1">
                        <div className="rounded-xl bg-white border border-amber-200 p-2">
                          <span className="block text-[10px] text-slate-500">Yêu cầu (15%)</span>
                          <b className="text-slate-900">
                            {formatVND(wrongAmountAlert.expectedAmount)}
                          </b>
                        </div>
                        <div className="rounded-xl bg-white border border-amber-200 p-2">
                          <span className="block text-[10px] text-slate-500">Đã nhận</span>
                          <b className="text-teal-700">
                            {formatVND(wrongAmountAlert.paidAmount)}
                          </b>
                        </div>
                        <div className="rounded-xl bg-white border border-amber-200 p-2">
                          <span className="block text-[10px] text-slate-500">Chuyển thừa</span>
                          <b className="text-amber-700">
                            {formatVND(wrongAmountAlert.overpaidAmount)}
                          </b>
                        </div>
                      </div>
                      <div className="pt-1 text-center">
                        <button
                          type="button"
                          onClick={() => redirectToInvoice(maTraCuuParam, tokenParam)}
                          className="rounded-xl bg-slate-900 hover:bg-slate-800 px-4 py-2 text-xs font-bold text-white cursor-pointer"
                        >
                          Xem hóa đơn ngay →
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : isExpired ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center space-y-3">
                  <h2 className="text-base font-bold text-rose-800">
                    {isUnderpaid
                      ? 'Đơn đã hết hạn 15 phút (Chuyển thiếu tiền cọc)'
                      : 'Mã QR đã hết hiệu lực sau 15 phút'}
                  </h2>

                  {isUnderpaid && wrongAmountAlert ? (
                    <div className="text-left rounded-2xl border border-rose-300 bg-white p-4 text-xs text-rose-900 space-y-2 max-w-xl mx-auto">
                      <p className="leading-relaxed">{wrongAmountAlert.warningMessage}</p>
                      <div className="grid grid-cols-3 gap-2 text-center pt-1">
                        <div className="rounded-xl bg-slate-50 border border-slate-200 p-2">
                          <span className="block text-[10px] text-slate-500">Yêu cầu (15%)</span>
                          <b className="text-slate-900">
                            {formatVND(wrongAmountAlert.expectedAmount)}
                          </b>
                        </div>
                        <div className="rounded-xl bg-slate-50 border border-slate-200 p-2">
                          <span className="block text-[10px] text-slate-500">Đã nhận</span>
                          <b className="text-teal-700">
                            {formatVND(wrongAmountAlert.paidAmount)}
                          </b>
                        </div>
                        <div className="rounded-xl bg-rose-50 border border-rose-200 p-2">
                          <span className="block text-[10px] text-rose-600">Còn thiếu</span>
                          <b className="text-rose-700">
                            {formatVND(wrongAmountAlert.remainingAmount)}
                          </b>
                        </div>
                      </div>
                      {booking?.SDTQuanLy && (
                        <p className="pt-1 text-slate-700">
                          Liên hệ quản lý hỗ trợ hoàn tiền:{' '}
                          <b>
                            {booking.TenQuanLy || 'Ban quản lý'} — {booking.SDTQuanLy}
                          </b>
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-rose-700 leading-relaxed">
                      Đơn đặt cọc <b>{maTraCuuParam}</b> đã tự động hủy và phòng đã được mở lại trạng thái{' '}
                      <b>Còn trống (không có cọc)</b> để khách hàng khác có thể thuê.
                    </p>
                  )}

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
                  <div
                    className={`flex flex-wrap items-center justify-between gap-2 rounded-2xl border px-4 py-3 ${
                      isUnderpaid
                        ? 'border-rose-300 bg-rose-50'
                        : 'border-teal-200 bg-teal-50/70'
                    }`}
                  >
                    <div
                      className={`flex items-center gap-2 text-xs font-semibold ${
                        isUnderpaid ? 'text-rose-800' : 'text-teal-900'
                      }`}
                    >
                      <span
                        className={`inline-block h-2.5 w-2.5 rounded-full animate-ping ${
                          isUnderpaid ? 'bg-rose-500' : 'bg-teal-500'
                        }`}
                      />
                      <span>
                        {isUnderpaid
                          ? 'Phát hiện chuyển thiếu tiền — Phòng CHƯA được giữ chỗ (đang tiếp tục kiểm tra)...'
                          : 'Đang chờ chuyển khoản (tự kiểm tra mỗi 3 giây)...'}
                      </span>
                    </div>
                    <span className="rounded-lg bg-slate-900 px-3 py-1 text-xs font-bold text-[#00FFCC] tabular-nums">
                      Hết hạn sau {formatCountdown(secondsLeft)}
                    </span>
                  </div>

                  {/* Cảnh báo realtime ngay khi phát hiện chuyển THIẾU tiền */}
                  {isUnderpaid && wrongAmountAlert && (
                    <div
                      role="alert"
                      className="rounded-2xl border-2 border-rose-400 bg-rose-50 p-4 text-xs text-rose-900 space-y-3"
                    >
                      <div className="flex items-start gap-2.5">
                        <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-600 text-[11px] font-bold text-white">
                          !
                        </span>
                        <div className="space-y-1">
                          <p className="font-bold text-sm text-rose-900">
                            Cảnh báo: Bạn đã chuyển THIẾU số tiền đặt cọc!
                          </p>
                          <p className="leading-relaxed">{wrongAmountAlert.warningMessage}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-center">
                        <div className="rounded-xl bg-white border border-rose-200 p-2.5">
                          <span className="block text-[10px] text-slate-500">
                            Cọc quy định (15%)
                          </span>
                          <b className="text-sm text-slate-900">
                            {formatVND(wrongAmountAlert.expectedAmount)}
                          </b>
                        </div>
                        <div className="rounded-xl bg-white border border-rose-200 p-2.5">
                          <span className="block text-[10px] text-slate-500">
                            Hệ thống đã nhận
                          </span>
                          <b className="text-sm text-teal-700">
                            {formatVND(wrongAmountAlert.paidAmount)}
                          </b>
                        </div>
                        <div className="rounded-xl bg-rose-100/80 border border-rose-300 p-2.5">
                          <span className="block text-[10px] font-semibold text-rose-700">
                            Số tiền còn thiếu
                          </span>
                          <b className="text-sm text-rose-700">
                            {formatVND(wrongAmountAlert.remainingAmount)}
                          </b>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                        <span className="text-[11px] text-rose-800">
                          Chuyển bổ sung đúng số tiền còn thiếu với <b>cùng STK và nội dung CK</b> bên dưới để hoàn tất.
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            handleCopy(
                              'REMAINING',
                              String(wrongAmountAlert.remainingAmount)
                            )
                          }
                          className="rounded-lg bg-rose-600 hover:bg-rose-700 px-3 py-1.5 text-[11px] font-bold text-white cursor-pointer"
                        >
                          {copiedField === 'REMAINING'
                            ? 'Đã chép số tiền thiếu'
                            : `Sao chép số tiền thiếu (${formatVND(
                                wrongAmountAlert.remainingAmount
                              )})`}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Cảnh báo cố định nhắc chuyển đúng số tiền (khi chưa phát sinh lỗi chuyển thiếu) */}
                  {!isUnderpaid && (
                    <div
                      role="note"
                      className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-950 leading-relaxed"
                    >
                      <b>Cảnh báo quan trọng:</b> Vui lòng chuyển khoản{' '}
                      <b>đúng số tiền {formatVND(requiredAmount)}</b> (15% giá phòng) và{' '}
                      <b>giữ nguyên nội dung chuyển khoản</b> trên mã QR. Nếu tự ý sửa số tiền
                      thấp hơn, hệ thống sẽ <b>không khóa giữ phòng</b>.
                    </div>
                  )}

                  {qrResult ? (
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                      <div className="md:col-span-5 flex flex-col items-center">
                        <div
                          className={`rounded-2xl border-2 bg-white p-3 shadow-sm ${
                            isUnderpaid ? 'border-rose-400' : 'border-[#00FFCC]'
                          }`}
                        >
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
                          <div className="flex justify-between items-center gap-2">
                            <span className="text-slate-500">Số tiền cọc (15%):</span>
                            <button
                              type="button"
                              onClick={() =>
                                handleCopy('AMOUNT', String(qrResult.payos.amount))
                              }
                              className="text-base font-bold text-teal-700 cursor-pointer"
                            >
                              {formatVND(qrResult.payos.amount)}{' '}
                              <span className="text-[11px] font-semibold text-teal-600 underline">
                                {copiedField === 'AMOUNT' ? 'Đã chép' : 'Sao chép'}
                              </span>
                            </button>
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
                          Lưu ý: Quét mã QR bằng ứng dụng ngân hàng để điền chính xác số tiền và
                          nội dung. Không tự ý chỉnh sửa số tiền chuyển khoản. Nếu không hoàn tất
                          đủ số tiền trong <b>15 phút</b>, giao dịch sẽ tự động hủy để khách khác có
                          thể đặt phòng.
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