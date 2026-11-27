// client/src/app/datPhong/hoaDon/[maTraCuu]/page.tsx
'use client';

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { datPhongService } from '@/services/datPhong.service';
import { DatPhongItem, TrangThaiDatPhong } from '@/types/datPhong.type';

const getApiBaseUrl = () => {
  const raw = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
  const trimmed = raw.replace(/\/auth\/?$/, '').replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
};

const getAuthHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (typeof window !== 'undefined') {
    const token =
      localStorage.getItem('token') ||
      localStorage.getItem('accessToken') ||
      sessionStorage.getItem('token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  return headers;
};

const formatVND = (amount?: number | null) =>
  `${Math.round(Number(amount || 0)).toLocaleString('vi-VN')}đ`;

const formatDateTimeVN = (raw?: string | null) => {
  if (!raw) return '—';
  const d = new Date(raw.replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const escapeHtml = (val: unknown) =>
  String(val ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const STATUS_META: Record<
  TrangThaiDatPhong,
  { label: string; badgeClass: string; note: string }
> = {
  ChoThanhToan: {
    label: 'Chờ thanh toán',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-300 shadow-2xs',
    note: 'Đơn đặt cọc chưa ghi nhận thanh toán từ PayOS. Nếu quá 15 phút không hoàn tất, đơn sẽ tự động hủy.',
  },
  DaDatCoc: {
    label: 'Đã đặt cọc — Đang giữ phòng',
    badgeClass: 'bg-white/95 text-teal-900 border-teal-400 shadow-2xs',
    note: 'Phòng đang được giữ chỗ riêng cho bạn. Vui lòng mang mã biên lai này khi đến xem phòng để được hoàn 100% tiền cọc.',
  },
  DaHoanCoc_ChotThue: {
    label: 'Đã hoàn cọc — Chốt thuê phòng',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs',
    note: 'Quản lý đã hoàn lại 100% tiền cọc giữ chỗ và giữ phòng để tiến hành lập hợp đồng thuê.',
  },
  DaHoanCoc_KhongThue: {
    label: 'Đã hoàn 100% tiền cọc',
    badgeClass: 'bg-sky-50 text-sky-800 border-sky-300 shadow-2xs',
    note: 'Khoản tiền cọc giữ chỗ đã được hoàn trả đầy đủ cho khách hàng.',
  },
  TrungLapCanHoan: {
    label: 'Trùng lặp giao dịch — Chờ hoàn 100%',
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-300 shadow-2xs',
    note: 'Phòng đã được khách khác thanh toán ngay trước đó vài giây. Quản lý cơ sở sẽ liên hệ hoàn lại 100% số tiền cọc cho bạn.',
  },
  QuaHanMatCoc: {
    label: 'Quá hạn giữ chỗ (Mất cọc)',
    badgeClass: 'bg-white/90 text-slate-700 border-slate-300 shadow-2xs',
    note: 'Đơn đã quá thời hạn giữ phòng mà khách không đến xem phòng.',
  },
  DaHuy: {
    label: 'Đã hủy (Quá hạn QR)',
    badgeClass: 'bg-white/85 text-slate-600 border-slate-300 shadow-2xs',
    note: 'Đơn đã tự động hủy do quá 15 phút chưa hoàn tất thanh toán. Phòng đã được mở lại trạng thái còn trống.',
  },
};

function HoaDonDatCocContent() {
  const params = useParams();
  const searchParams = useSearchParams();

  const maTraCuuParam = decodeURIComponent(String(params.maTraCuu || '')).trim();
  const tokenParam = (searchParams.get('token') || '').trim();
  const sdtParam = (searchParams.get('sdt') || '').trim();

  const [booking, setBooking] = useState<DatPhongItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isManager, setIsManager] = useState<boolean>(false);

  // Kiểm tra ngầm vai trò người dùng hiện tại (nếu là ChuTro / QuanLy thì đổi link quay về)
  useEffect(() => {
    let isMounted = true;

    const checkManagerRole = async () => {
      try {
        const res = await fetch(`${getApiBaseUrl()}/auth/profile`, {
          method: 'GET',
          headers: getAuthHeaders(),
          credentials: 'include',
          cache: 'no-store',
        });
        if (!res.ok) return;

        const result = await res.json();
        const profile = result?.data?.user || result?.data || result?.user || null;
        const role = String(profile?.Quyen || '').trim();

        if (isMounted && (role === 'ChuTro' || role === 'QuanLy')) {
          setIsManager(true);
        }
      } catch {
        // Khách vãng lai chưa đăng nhập -> giữ mặc định quay về Trang chủ
      }
    };

    checkManagerRole();
    return () => {
      isMounted = false;
    };
  }, []);

  const fetchReceipt = useCallback(
    async (code: string, auth: { token?: string; sdt?: string }) => {
      try {
        setLoading(true);
        setErrorMsg(null);
        const res = await datPhongService.layHoaDon(code, auth);
        setBooking(res.data);
      } catch (err: any) {
        setBooking(null);
        setErrorMsg(err?.message || 'Không tìm thấy biên lai đặt cọc phù hợp.');
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!maTraCuuParam || maTraCuuParam === 'tra-cuu' || (!tokenParam && !sdtParam)) {
      setBooking(null);
      setLoading(false);
      setErrorMsg('Đường dẫn biên lai không hợp lệ hoặc thiếu thông tin xác thực.');
      return;
    }

    fetchReceipt(maTraCuuParam, {
      token: tokenParam || undefined,
      sdt: sdtParam || undefined,
    });
  }, [maTraCuuParam, tokenParam, sdtParam, fetchReceipt]);

  // Nếu muốn quay về trang Tổng quan thống kê thay vì Quản lý đặt phòng, đổi '/chuTro/datPhong' thành '/chuTro/thongKe'
  const backHref = isManager ? '/chuTro/datPhong' : '/';
  const backLabel = isManager
    ? '← Quay về Trang Quản lý'
    : '← Quay về Trang chủ';
  const errorBackLabel = isManager
    ? 'Về Trang Quản lý đặt phòng'
    : 'Về trang chủ Xóm Trọ';

  // Tải trực tiếp file hóa đơn về máy (.html chuẩn in A4, mở offline được trên mọi thiết bị)
  const handleDownloadInvoice = () => {
    if (!booking) return;
    const status = STATUS_META[booking.TrangThai];
    const htmlContent = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <title>HoaDonDatCoc_${escapeHtml(booking.MaTraCuu)}</title>
  <style>
    body { font-family: Arial, Helvetica, sans-serif; background: #f8fafc; color: #0f172a; margin: 0; padding: 24px; }
    .sheet { max-width: 960px; margin: 0 auto; background: #fff; border: 1px solid #cbd5e1; border-radius: 16px; overflow: hidden; }
    .header { background: #00ffcc; color: #0f172a; padding: 24px 28px; border-bottom: 1px solid #5eead4; display: flex; justify-content: space-between; align-items: center; gap: 12px; }
    h1 { margin: 0 0 6px; font-size: 24px; font-weight: 700; letter-spacing: -0.025em; color: #0f172a; }
    .sub { margin: 0; font-size: 13px; color: #1e293b; }
    .badge { background: #ffffff; color: #0f766e; border: 1px solid #2dd4bf; padding: 6px 14px; border-radius: 999px; font-size: 12px; font-weight: bold; white-space: nowrap; }
    .body { padding: 28px; }
    .note { background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 12px; padding: 14px 16px; font-size: 13px; color: #334155; margin-bottom: 20px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
    .card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; font-size: 13px; }
    .card h2 { margin: 0 0 12px; font-size: 11px; text-transform: uppercase; color: #0f766e; letter-spacing: 0.5px; }
    .row { display: flex; justify-content: space-between; gap: 8px; margin: 7px 0; }
    table { width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0; font-size: 13px; }
    td { padding: 12px 16px; border-bottom: 1px solid #e2e8f0; }
    td.label { background: #f8fafc; color: #64748b; width: 45%; }
    td.val { text-align: right; font-weight: bold; }
    tr.total td { background: rgba(0, 255, 204, 0.25); font-size: 15px; color: #0f172a; border-top: 1px solid #5eead4; }
    tr.total td.val { color: #0f766e; font-size: 18px; }
    .footer { margin-top: 20px; padding-top: 14px; border-top: 1px dashed #cbd5e1; display: flex; justify-content: space-between; font-size: 12px; color: #64748b; }
    @media print { body { background: #fff; padding: 0; } .sheet { border: none; max-width: 100%; } }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="header">
      <div>
        <h1>Biên Lai Đặt Cọc Giữ Phòng</h1>
        <p class="sub">Mã tra cứu: <b>${escapeHtml(booking.MaTraCuu)}</b> • Mã GD PayOS: <b>${escapeHtml(booking.OrderCode)}</b></p>
      </div>
      <span class="badge">${escapeHtml(status.label)}</span>
    </div>
    <div class="body">
      <div class="note">${escapeHtml(status.note)}</div>
      <div class="grid">
        <div class="card">
          <h2>Thông tin khách đặt phòng</h2>
          <div class="row"><span>Họ và tên:</span><b>${escapeHtml(booking.HoTenKhach)}</b></div>
          <div class="row"><span>Số điện thoại:</span><b>${escapeHtml(booking.SDT)}</b></div>
          <div class="row"><span>Email:</span><b>${escapeHtml(booking.Email)}</b></div>
          <div class="row"><span>Hẹn xem phòng:</span><b>${escapeHtml(formatDateTimeVN(booking.NgayHenXem))}</b></div>
        </div>
        <div class="card">
          <h2>Thông tin phòng &amp; Quản lý hỗ trợ</h2>
          <div class="row"><span>Phòng:</span><b>${escapeHtml(booking.TenPhong)} (${escapeHtml(booking.DienTich)} m²)</b></div>
          <div class="row"><span>Giá niêm yết:</span><b>${escapeHtml(formatVND(booking.GiaPhong))}/tháng</b></div>
          <div class="row"><span>Cơ sở:</span><b>${escapeHtml(booking.TenKhu)}</b></div>
          <div class="row"><span>Địa chỉ:</span><span>${escapeHtml(booking.DiaChiKhu)}</span></div>
          <div class="row"><span>Quản lý khu:</span><b>${escapeHtml(booking.TenQuanLy || 'Ban quản lý')} — ${escapeHtml(booking.SDTQuanLy || '—')}</b></div>
        </div>
      </div>
      <table>
        <tr><td class="label">Thời gian thanh toán PayOS</td><td class="val">${escapeHtml(formatDateTimeVN(booking.ThoiGianThanhToan))}</td></tr>
        <tr><td class="label">Hạn giữ phòng tối đa</td><td class="val">${escapeHtml(formatDateTimeVN(booking.ThoiGianHetHanGiu))}</td></tr>
        ${
          booking.ThongTinNganHangNhan
            ? `<tr><td class="label">Tài khoản nhận cọc</td><td class="val">${escapeHtml(booking.ThongTinNganHangNhan.TenNganHang)} • ${escapeHtml(booking.ThongTinNganHangNhan.STK)} (${escapeHtml(booking.ThongTinNganHangNhan.ChuTaiKhoan)})</td></tr>`
            : ''
        }
        <tr class="total"><td><b>SỐ TIỀN ĐÃ ĐẶT CỌC</b></td><td class="val">${escapeHtml(formatVND(booking.SoTienCoc))}</td></tr>
      </table>
      <div class="footer">
        <span>Biên lai điện tử có giá trị đối soát trực tiếp tại cơ sở Xóm Trọ.</span>
        <span>Ngày tạo đơn: ${escapeHtml(formatDateTimeVN(booking.ThoiGianTao))}</span>
      </div>
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `HoaDonDatCoc_${booking.MaTraCuu}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const statusMeta = booking ? STATUS_META[booking.TrangThai] : null;
  const cleanManagerPhone = (booking?.SDTQuanLy || '').replace(/[^\d]/g, '');

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8 text-slate-900">
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm;
          }
          body {
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          .print-sheet {
            box-shadow: none !important;
            border: 1px solid #cbd5e1 !important;
            border-radius: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
          }
        }
      `}</style>

      <div className="mx-auto max-w-5xl space-y-6">
        {/* Thanh công cụ phía trên */}
        <div className="no-print flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 shadow-xs">
          <Link
            href={backHref}
            className="text-xs sm:text-sm font-bold text-slate-600 hover:text-teal-700 transition no-underline"
          >
            {backLabel}
          </Link>

          <div className="flex flex-wrap items-center gap-2.5">
            {booking && booking.TrangThai === 'ChoThanhToan' && tokenParam && (
              <Link
                href={`/datPhong/hoaDon?maTraCuu=${encodeURIComponent(
                  booking.MaTraCuu
                )}&token=${encodeURIComponent(tokenParam)}`}
                className="rounded-xl bg-amber-100 hover:bg-amber-200 border border-amber-300 px-4 py-2 text-xs font-bold text-amber-900 shadow-2xs transition no-underline"
              >
                Quay lại quét mã QR →
              </Link>
            )}
            {booking && (
              <>
                <button
                  type="button"
                  onClick={handleDownloadInvoice}
                  className="rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-4 py-2 text-xs font-bold text-slate-800 shadow-2xs transition cursor-pointer"
                >
                  ⬇ Tải hóa đơn về máy
                </button>
              </>
            )}
          </div>
        </div>

        {loading && (
          <div className="rounded-3xl border border-slate-200 bg-white p-14 text-center space-y-3 shadow-xs">
            <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-[#00FFCC]/40 border-t-teal-600" />
            <p className="text-sm font-semibold text-slate-600">
              Đang tải thông tin biên lai đặt cọc...
            </p>
          </div>
        )}

        {!loading && errorMsg && (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-8 text-center space-y-3">
            <p className="text-sm font-bold text-rose-800">{errorMsg}</p>
            <p className="text-xs text-rose-700">
              Vui lòng mở lại trực tiếp từ đường dẫn biên lai trong Email xác nhận hoặc quay lại trang trước.
            </p>
            <Link
              href={backHref}
              className="inline-block rounded-xl bg-[#00FFCC] hover:bg-[#00e6b8] border border-teal-300 px-5 py-2 text-xs font-bold text-slate-900 transition no-underline"
            >
              {errorBackLabel}
            </Link>
          </div>
        )}

        {/* Tờ Biên lai đặt cọc chuẩn in A4 */}
        {!loading && booking && statusMeta && (
          <article className="print-sheet rounded-3xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <div className="border-b border-teal-300 bg-[#00FFCC] px-6 sm:px-8 py-5 sm:py-6 text-slate-900 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight font-[Arial,Helvetica,sans-serif]">
                  Biên Lai Đặt Cọc Giữ Phòng
                </h1>
                <p className="mt-1.5 text-xs sm:text-sm text-slate-800">
                  Mã tra cứu: <b className="text-slate-950">{booking.MaTraCuu}</b> • Mã GD PayOS:{' '}
                  <b className="text-slate-950">{booking.OrderCode}</b>
                </p>
              </div>
              <span
                className={`inline-flex items-center rounded-full border px-3.5 py-1.5 text-xs font-bold ${statusMeta.badgeClass}`}
              >
                {statusMeta.label}
              </span>
            </div>

            <div className="p-6 sm:p-8 space-y-6">
              <div className="rounded-2xl border border-teal-200 bg-[#00FFCC]/10 px-5 py-3.5 text-xs sm:text-sm text-slate-700 leading-relaxed">
                {statusMeta.note}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-2.5 text-xs sm:text-sm">
                  <h2 className="text-[11px] font-bold uppercase tracking-wider text-teal-700">
                    Thông tin khách đặt phòng
                  </h2>
                  <p className="flex justify-between gap-3">
                    <span className="text-slate-500">Họ và tên:</span>
                    <b className="text-slate-900 text-right">{booking.HoTenKhach}</b>
                  </p>
                  <p className="flex justify-between gap-3">
                    <span className="text-slate-500">Số điện thoại:</span>
                    <b className="text-slate-900">{booking.SDT}</b>
                  </p>
                  <p className="flex justify-between gap-3">
                    <span className="text-slate-500">Email:</span>
                    <b className="text-slate-900 text-right break-all">{booking.Email}</b>
                  </p>
                  <p className="flex justify-between gap-3">
                    <span className="text-slate-500">Hẹn xem phòng:</span>
                    <b className="text-teal-700 text-right">
                      {formatDateTimeVN(booking.NgayHenXem)}
                    </b>
                  </p>
                  {booking.GhiChu && (
                    <p className="pt-2 border-t border-slate-100 text-slate-600">
                      <span className="text-slate-400">Ghi chú: </span>
                      {booking.GhiChu}
                    </p>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-2.5 text-xs sm:text-sm">
                  <h2 className="text-[11px] font-bold uppercase tracking-wider text-teal-700">
                    Thông tin phòng &amp; cơ sở
                  </h2>
                  <p className="flex justify-between gap-3">
                    <span className="text-slate-500">Phòng giữ chỗ:</span>
                    <b className="text-slate-900">
                      {booking.TenPhong} ({booking.DienTich} m²)
                    </b>
                  </p>
                  <p className="flex justify-between gap-3">
                    <span className="text-slate-500">Giá thuê niêm yết:</span>
                    <b className="text-slate-900">{formatVND(booking.GiaPhong)}/tháng</b>
                  </p>
                  <p className="flex justify-between gap-3">
                    <span className="text-slate-500">Cơ sở:</span>
                    <b className="text-slate-900 text-right">{booking.TenKhu}</b>
                  </p>
                  <p className="text-slate-600 text-xs pt-0.5">{booking.DiaChiKhu}</p>
                </div>
              </div>

              {/* Khối thông tin liên hệ quản lý để hỗ trợ / giải quyết */}
              <div className="rounded-2xl border border-teal-200 bg-[#00FFCC]/15 p-5 text-xs sm:text-sm flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-teal-900">
                    Thông tin liên hệ Quản lý cơ sở hỗ trợ &amp; giải quyết
                  </p>
                  <p className="text-slate-900">
                    Quản lý: <b>{booking.TenQuanLy || 'Ban quản lý'}</b> • SĐT:{' '}
                    <b>{booking.SDTQuanLy || '—'}</b>
                    {(booking as any).EmailQuanLy ? (
                      <> • Email: <b>{(booking as any).EmailQuanLy}</b></>
                    ) : null}
                  </p>
                </div>
                {cleanManagerPhone && (
                  <div className="no-print flex items-center gap-2.5">
                    <a
                      href={`tel:${cleanManagerPhone}`}
                      className="rounded-xl bg-[#00FFCC] hover:bg-[#00e6b8] border border-teal-300 px-3.5 py-2 text-xs font-bold text-slate-900 transition no-underline"
                    >
                      📞 Gọi quản lý
                    </a>
                    <a
                      href={`https://zalo.me/${cleanManagerPhone}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-xl bg-white hover:bg-blue-50 border border-[#0068FF] px-3.5 py-2 text-xs font-bold text-[#0068FF] transition no-underline"
                    >
                      Nhắn Zalo
                    </a>
                  </div>
                )}
              </div>

              {/* Chi tiết thanh toán */}
              <div className="rounded-2xl border border-slate-200 overflow-hidden">
                <table className="w-full text-xs sm:text-sm">
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="bg-slate-50 px-5 py-3 text-slate-500 font-medium w-1/2">
                        Thời gian thanh toán PayOS
                      </td>
                      <td className="px-5 py-3 font-bold text-slate-900 text-right">
                        {formatDateTimeVN(booking.ThoiGianThanhToan)}
                      </td>
                    </tr>
                    <tr>
                      <td className="bg-slate-50 px-5 py-3 text-slate-500 font-medium">
                        Hạn giữ phòng tối đa
                      </td>
                      <td className="px-5 py-3 font-bold text-rose-700 text-right">
                        {formatDateTimeVN(booking.ThoiGianHetHanGiu)}
                      </td>
                    </tr>
                    {booking.ThongTinNganHangNhan && (
                      <tr>
                        <td className="bg-slate-50 px-5 py-3 text-slate-500 font-medium">
                          Tài khoản nhận cọc
                        </td>
                        <td className="px-5 py-3 font-semibold text-slate-900 text-right">
                          {booking.ThongTinNganHangNhan.TenNganHang} •{' '}
                          {booking.ThongTinNganHangNhan.STK} (
                          {booking.ThongTinNganHangNhan.ChuTaiKhoan})
                        </td>
                      </tr>
                    )}
                    <tr className="bg-[#00FFCC]/25 border-t border-teal-300">
                      <td className="px-5 py-3.5 font-bold text-slate-900 text-sm sm:text-base">
                        SỐ TIỀN ĐÃ ĐẶT CỌC
                      </td>
                      <td className="px-5 py-3.5 font-bold text-teal-900 text-lg sm:text-xl text-right">
                        {formatVND(booking.SoTienCoc)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {booking.ThoiGianHoanCoc && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 space-y-1.5 text-xs sm:text-sm">
                  <h3 className="font-bold text-emerald-900">Thông tin xác nhận hoàn cọc</h3>
                  <p>
                    Số tiền đã hoàn: <b>{formatVND(booking.SoTienHoan)}</b> (
                    {booking.PhuongThucHoan === 'ChuyenKhoan' ? 'Chuyển khoản' : 'Tiền mặt'})
                  </p>
                  <p>
                    Thời gian hoàn: <b>{formatDateTimeVN(booking.ThoiGianHoanCoc)}</b> • Người xử
                    lý: <b>{booking.TenNguoiXuLy || 'Quản lý'}</b>
                  </p>
                  {booking.GhiChuHoanCoc && (
                    <p className="text-emerald-800">Ghi chú: {booking.GhiChuHoanCoc}</p>
                  )}
                </div>
              )}

              <div className="border-t border-dashed border-slate-200 pt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <span>Biên lai điện tử có giá trị đối soát trực tiếp tại cơ sở Xóm Trọ.</span>
                <span>Ngày tạo đơn: {formatDateTimeVN(booking.ThoiGianTao)}</span>
              </div>
            </div>
          </article>
        )}
      </div>
    </div>
  );
}

export default function HoaDonDatCocPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50 text-sm font-bold text-slate-500">
          Đang tải biên lai đặt cọc...
        </div>
      }
    >
      <HoaDonDatCocContent />
    </Suspense>
  );
}