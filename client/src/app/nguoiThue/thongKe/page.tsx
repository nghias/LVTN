// client/src/app/nguoiThue/thongKe/page.tsx
'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import NguoiThueHeader from '@/components/layout/NguoiThueHeader';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import { useAlertModal } from '@/components/common/AlertModalProvider';

const getApiBaseUrl = () => {
  const raw = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
  const trimmed = raw.replace(/\/auth\/?$/, '').replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
};

const getDefaultMonthRange = (monthsCount = 6) => {
  const now = new Date();
  const endY = now.getFullYear();
  const endM = now.getMonth() + 1;

  let startY = endY;
  let startM = endM - (monthsCount - 1);
  while (startM <= 0) {
    startM += 12;
    startY -= 1;
  }

  return {
    tuThang: `${startY}-${String(startM).padStart(2, '0')}`,
    denThang: `${endY}-${String(endM).padStart(2, '0')}`,
  };
};

const formatVND = (val: number) =>
  new Intl.NumberFormat('vi-VN').format(Math.round(Number(val) || 0)) + ' đ';

const formatCompactVND = (val: number) => {
  const num = Number(val) || 0;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)} tr`;
  if (num >= 1_000) return `${Math.round(num / 1_000)}k`;
  return String(num);
};

const formatDateVN = (dateStr?: string | null) => {
  if (!dateStr) return 'Chưa cập nhật';
  const raw = String(dateStr).trim();
  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
  }
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString('vi-VN');
};

const formatMonthVN = (ym?: string) => {
  if (!ym) return '—';
  const parts = String(ym).split('-');
  return parts.length === 2 ? `${parts[1]}/${parts[0]}` : ym;
};

export default function ThongKeNguoiThuePage() {
  const { showError } = useAlertModal();
  const showErrorRef = useRef(showError);
  showErrorRef.current = showError;

  const [loading, setLoading] = useState<boolean>(true);
  const [stats, setStats] = useState<any>(null);

  const [presetMonths, setPresetMonths] = useState<string>('6');
  const [tuThang, setTuThang] = useState<string>(
    () => getDefaultMonthRange(6).tuThang
  );
  const [denThang, setDenThang] = useState<string>(
    () => getDefaultMonthRange(6).denThang
  );

  const fetchTenantStats = useCallback(
    async (paramsObj?: {
      soThang?: string;
      tuThang?: string;
      denThang?: string;
    }) => {
      try {
        setLoading(true);
        let token: string | null = null;
        let storedMaND = '';

        if (typeof window !== 'undefined') {
          token =
            localStorage.getItem('token') ||
            localStorage.getItem('accessToken') ||
            sessionStorage.getItem('token');

          const rawUser =
            localStorage.getItem('user') ||
            localStorage.getItem('userProfile') ||
            sessionStorage.getItem('user');
          if (rawUser) {
            try {
              const parsed = JSON.parse(rawUser);
              const u = parsed?.user || parsed;
              if (u?.MaND || u?.maND) {
                storedMaND = String(u.MaND || u.maND);
              }
            } catch {
              // Bỏ qua nếu không phải JSON
            }
          }
        }

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const query = new URLSearchParams();
        const soThangVal =
          paramsObj?.soThang !== undefined ? paramsObj.soThang : presetMonths;
        const tuVal =
          paramsObj?.tuThang !== undefined ? paramsObj.tuThang : tuThang;
        const denVal =
          paramsObj?.denThang !== undefined ? paramsObj.denThang : denThang;

        if (storedMaND) query.set('maND', storedMaND);
        if (soThangVal) query.set('soThang', soThangVal);
        if (tuVal) query.set('tuThang', tuVal);
        if (denVal) query.set('denThang', denVal);

        const res = await fetch(
          `${getApiBaseUrl()}/thong-ke/nguoi-thue?${query.toString()}`,
          {
            method: 'GET',
            headers,
            credentials: 'include',
          }
        );

        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.message || 'LOAD_FAILED');
        }

        setStats(json.data);
        if (json.data?.boLoc?.tuThang) {
          setTuThang(json.data.boLoc.tuThang);
        }
        if (json.data?.boLoc?.denThang) {
          setDenThang(json.data.boLoc.denThang);
        }
      } catch {
        showErrorRef.current(
          'Không thể tải dữ liệu thống kê phòng thuê lúc này.'
        );
      } finally {
        setLoading(false);
      }
    },
    [presetMonths, tuThang, denThang]
  );

  useEffect(() => {
    const def = getDefaultMonthRange(6);
    fetchTenantStats({
      soThang: '6',
      tuThang: def.tuThang,
      denThang: def.denThang,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectPreset = (monthsCount: string) => {
    const range = getDefaultMonthRange(Number(monthsCount) || 6);
    setPresetMonths(monthsCount);
    setTuThang(range.tuThang);
    setDenThang(range.denThang);
    fetchTenantStats({
      soThang: monthsCount,
      tuThang: range.tuThang,
      denThang: range.denThang,
    });
  };

  const handleApplyCustomRange = (e: React.FormEvent) => {
    e.preventDefault();
    if (tuThang && denThang && tuThang > denThang) {
      showError('Tháng bắt đầu không được lớn hơn tháng kết thúc!');
      return;
    }
    setPresetMonths('');
    fetchTenantStats({
      soThang: '',
      tuThang,
      denThang,
    });
  };

  const tongQuan = stats?.tongQuan || {};
  const coCau = stats?.coCauChiPhi || {};
  const chartChiPhi: any[] = stats?.bieuDoChiPhiTheoThang || [];
  const chartDienNuoc: any[] = stats?.bieuDoDienNuocTheoThang || [];
  const phongList: any[] = stats?.boLoc?.phongList || [];
  const hopDong = stats?.hopDongHienTai || null;
  const phongHienTai = hopDong || phongList[0] || null;

  const maxChiPhi = Math.max(
    1,
    ...chartChiPhi.map((c) => Number(c.tongTien) || 0)
  );
  const maxDien = Math.max(
    1,
    ...chartDienNuoc.map((c) => Number(c.soDien) || 0)
  );
  const maxNuoc = Math.max(
    1,
    ...chartDienNuoc.map((c) => Number(c.soNuoc) || 0)
  );

  return (
    <ProtectedRoute allowedRoles={['KhachThue']}>
      {(user) => (
        <div className="min-h-screen bg-white text-slate-900 flex flex-col">
          <NguoiThueHeader user={user} />

          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
            {/* Tiêu đề, thông tin phòng đang ở & chọn nhanh khoảng thời gian */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                    Tổng Quan Phòng Thuê
                  </h1>
                  {phongHienTai?.TenPhong && (
                    <span className="px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold">
                      {phongHienTai.TenPhong}
                      {phongHienTai.TenKhu ? ` • ${phongHienTai.TenKhu}` : ''}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Theo dõi chi phí hóa đơn, lượng điện nước tiêu thụ và tình trạng hợp đồng phòng bạn đang ở.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {[
                  { label: '3 tháng', val: '3' },
                  { label: '6 tháng', val: '6' },
                  { label: '12 tháng', val: '12' },
                ].map((btn) => (
                  <button
                    key={btn.val}
                    type="button"
                    onClick={() => handleSelectPreset(btn.val)}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition cursor-pointer ${
                      presetMonths === btn.val
                        ? 'bg-[#00FFCC] text-slate-900 border border-teal-300 shadow-2xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Thanh lọc khoảng tháng tùy chỉnh */}
            <form
              onSubmit={handleApplyCustomRange}
              className="bg-slate-50 rounded-2xl border border-slate-200 p-3.5 sm:p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3"
            >
              <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-xs font-bold text-slate-700 whitespace-nowrap">
                    Từ tháng:
                  </span>
                  <input
                    type="month"
                    value={tuThang}
                    onChange={(e) => {
                      const val =
                        e.target.value || getDefaultMonthRange(6).tuThang;
                      setTuThang(val);
                    }}
                    className="flex-1 px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#00FFCC] transition"
                  />
                </div>

                <div className="flex items-center gap-2 flex-1">
                  <span className="text-xs font-bold text-slate-700 whitespace-nowrap">
                    Đến tháng:
                  </span>
                  <input
                    type="month"
                    value={denThang}
                    onChange={(e) => {
                      const val =
                        e.target.value || getDefaultMonthRange(6).denThang;
                      setDenThang(val);
                    }}
                    className="flex-1 px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#00FFCC] transition"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3">
                <span className="text-xs text-slate-600 font-medium whitespace-nowrap">
                  Kỳ xem:{' '}
                  <strong className="font-bold text-slate-900">
                    {formatMonthVN(tuThang)} → {formatMonthVN(denThang)}
                  </strong>
                </span>
                <button
                  type="submit"
                  className="cursor-pointer whitespace-nowrap rounded-full bg-[#00FFCC] border border-teal-300 px-5 py-2 text-xs font-bold text-slate-900 shadow-2xs transition hover:bg-[#00e6b8]"
                >
                  Lọc dữ liệu
                </button>
              </div>
            </form>

            {/* 4 Thẻ chỉ số quan trọng */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
                <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                  Tổng hóa đơn trong kỳ
                </span>
                <div className="text-base sm:text-lg font-bold text-slate-900 mt-2 truncate">
                  {formatVND(tongQuan.tongChiPhiTrongKy || 0)}
                </div>
                <div className="text-xs text-emerald-600 font-semibold mt-1 truncate">
                  Đã thanh toán: {formatVND(tongQuan.tongDaThanhToan || 0)}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
                <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                  Tiền chưa thanh toán
                </span>
                <div
                  className={`text-base sm:text-lg font-bold mt-2 truncate ${
                    (tongQuan.tongCongNoHienTai || 0) > 0
                      ? 'text-red-600'
                      : 'text-emerald-600'
                  }`}
                >
                  {formatVND(tongQuan.tongCongNoHienTai || 0)}
                </div>
                <Link
                  href="/nguoiThue/hoaDon"
                  className="inline-block text-xs font-bold text-teal-700 hover:underline mt-1 no-underline"
                >
                  Xem hóa đơn & Thanh toán →
                </Link>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
                <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                  Điện nước kỳ gần nhất
                </span>
                <div className="text-sm sm:text-base font-bold text-slate-900 mt-2">
                  {tongQuan.dienTieuThuKyGanNhat || 0} kWh •{' '}
                  {tongQuan.nuocTieuThuKyGanNhat || 0} m³
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Ngày ghi: {formatDateVN(tongQuan.kyDienNuocGanNhat)}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
                <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                  Hợp đồng & Tạm trú
                </span>
                <div className="text-sm sm:text-base font-bold text-slate-900 mt-2">
                  {tongQuan.soNgayHopDongConLai !== null &&
                  tongQuan.soNgayHopDongConLai !== undefined
                    ? `Còn ${Math.max(0, tongQuan.soNgayHopDongConLai)} ngày`
                    : 'Đang hiệu lực'}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Tạm trú:{' '}
                  <strong className="text-teal-700">
                    {tongQuan.trangThaiTamTru === 'DaDangKy' ||
                    tongQuan.trangThaiTamTru === '1'
                      ? 'Đã đăng ký'
                      : 'Chưa đăng ký'}
                  </strong>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-sm text-slate-500">
                Đang tải biểu đồ thống kê...
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* 1. Biểu đồ hóa đơn theo tháng */}
                <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs">
                  <div className="mb-4">
                    <h3 className="text-base font-bold text-slate-900">
                      Tổng Tiền Hóa Đơn Theo Tháng
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Số tiền hóa đơn phòng cần đóng qua từng tháng
                    </p>
                  </div>

                  <div className="h-52 flex items-end gap-2 sm:gap-4 pt-6 pb-2 px-1 border-b border-slate-200 overflow-x-auto">
                    {chartChiPhi.map((item) => {
                      const hPct = Math.round(
                        ((Number(item.tongTien) || 0) / maxChiPhi) * 100
                      );
                      return (
                        <div
                          key={item.thangNam}
                          className="flex-1 min-w-[46px] flex flex-col items-center justify-end h-full"
                        >
                          <span className="text-[10px] font-bold text-teal-800 mb-1">
                            {item.tongTien > 0
                              ? formatCompactVND(item.tongTien)
                              : ''}
                          </span>
                          <div
                            style={{
                              height: `${Math.max(
                                hPct,
                                item.tongTien > 0 ? 8 : 2
                              )}%`,
                            }}
                            title={`${item.nhan}: ${formatVND(item.tongTien)}`}
                            className="w-7 sm:w-9 bg-teal-500 hover:bg-teal-600 rounded-t-md transition-all"
                          />
                          <span className="text-xs font-bold text-slate-600 mt-2">
                            {item.nhan}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Biểu đồ tiêu thụ Điện & Nước */}
                <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs">
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        Lượng Điện & Nước Tiêu Thụ
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Số điện (kWh) và số nước (m³) phòng sử dụng theo tháng
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-xs font-semibold text-slate-700 shrink-0">
                      <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 bg-amber-500 inline-block rounded-xs" />
                        Điện (kWh)
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 bg-teal-500 inline-block rounded-xs" />
                        Nước (m³)
                      </span>
                    </div>
                  </div>

                  <div className="h-52 flex items-end gap-2 sm:gap-4 pt-6 pb-2 px-1 border-b border-slate-200 overflow-x-auto">
                    {chartDienNuoc.map((item) => {
                      const hDien = Math.round(
                        ((Number(item.soDien) || 0) / maxDien) * 100
                      );
                      const hNuoc = Math.round(
                        ((Number(item.soNuoc) || 0) / maxNuoc) * 100
                      );
                      return (
                        <div
                          key={item.thangNam}
                          className="flex-1 min-w-[48px] flex flex-col items-center justify-end h-full"
                        >
                          <div className="w-full flex items-end justify-center gap-1 h-full">
                            <div className="flex flex-col items-center justify-end h-full w-4 sm:w-5">
                              <span className="text-[10px] font-bold text-amber-700 mb-1">
                                {item.soDien > 0 ? item.soDien : ''}
                              </span>
                              <div
                                style={{
                                  height: `${Math.max(
                                    hDien,
                                    item.soDien > 0 ? 6 : 2
                                  )}%`,
                                }}
                                className="w-full bg-amber-500 rounded-t-md"
                              />
                            </div>
                            <div className="flex flex-col items-center justify-end h-full w-4 sm:w-5">
                              <span className="text-[10px] font-bold text-teal-700 mb-1">
                                {item.soNuoc > 0 ? item.soNuoc : ''}
                              </span>
                              <div
                                style={{
                                  height: `${Math.max(
                                    hNuoc,
                                    item.soNuoc > 0 ? 6 : 2
                                  )}%`,
                                }}
                                className="w-full bg-teal-500 rounded-t-md"
                              />
                            </div>
                          </div>
                          <span className="text-xs font-bold text-slate-600 mt-2">
                            {item.nhan}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Phân bổ các khoản chi phí */}
                <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Phân Bổ Các Khoản Chi Phí
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Tỷ trọng tiền phòng, điện, nước và dịch vụ trong kỳ đang xem
                    </p>
                  </div>

                  <div className="space-y-3 pt-1">
                    {[
                      {
                        label: 'Tiền thuê phòng',
                        val: coCau.tienPhong || 0,
                        color: 'bg-teal-500',
                      },
                      {
                        label: 'Tiền điện',
                        val: coCau.tienDien || 0,
                        color: 'bg-amber-500',
                      },
                      {
                        label: 'Tiền nước',
                        val: coCau.tienNuoc || 0,
                        color: 'bg-sky-500',
                      },
                      {
                        label: 'Phí dịch vụ cố định',
                        val: coCau.tienPhuPhi || 0,
                        color: 'bg-emerald-500',
                      },
                      {
                        label: 'Chi phí phát sinh',
                        val: coCau.tienPhatSinh || 0,
                        color: 'bg-red-500',
                      },
                    ].map((item) => {
                      const total = Math.max(
                        1,
                        tongQuan.tongChiPhiTrongKy || 1
                      );
                      const pct = Math.round((item.val / total) * 100);
                      return (
                        <div key={item.label} className="space-y-1">
                          <div className="flex justify-between text-xs font-semibold">
                            <span className="text-slate-700">{item.label}</span>
                            <span className="text-slate-900 font-bold">
                              {formatVND(item.val)} ({pct}%)
                            </span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${item.color} rounded-full`}
                              style={{ width: `${Math.min(100, pct)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 4. Hợp đồng thuê phòng hiện tại */}
                <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Hợp Đồng Thuê Phòng Hiện Tại
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5 mb-3">
                      Thông tin phòng đang ở, thời hạn hợp đồng và tiền cọc
                    </p>

                    {!hopDong ? (
                      <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl">
                        Chưa tìm thấy hợp đồng thuê phòng đang hiệu lực.
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                          <div className="text-slate-500">Phòng đang ở</div>
                          <div className="font-bold text-slate-900 mt-1">
                            {hopDong.TenPhong}
                            {hopDong.TenKhu ? ` (${hopDong.TenKhu})` : ''}
                          </div>
                        </div>
                        <div className="p-3 bg-teal-50/60 rounded-xl border border-teal-200">
                          <div className="text-teal-800">Tiền cọc giữ phòng</div>
                          <div className="font-bold text-teal-900 mt-1">
                            {formatVND(hopDong.TienCoc || 0)}
                          </div>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                          <div className="text-slate-500">Ngày bắt đầu</div>
                          <div className="font-bold text-slate-900 mt-1">
                            {formatDateVN(hopDong.NgayBD)}
                          </div>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                          <div className="text-slate-500">Ngày kết thúc</div>
                          <div className="font-bold text-slate-900 mt-1">
                            {formatDateVN(hopDong.NgayKT)}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2.5 pt-3 border-t border-slate-100">
                    <Link
                      href="/nguoiThue/hopDong"
                      className="flex-1 py-2.5 px-4 text-center rounded-full bg-[#00FFCC] hover:bg-[#00e6b8] border border-teal-300 text-slate-900 text-xs font-bold shadow-2xs transition no-underline"
                    >
                      Xem chi tiết Hợp đồng
                    </Link>
                    <Link
                      href="/nguoiThue/dienNuoc"
                      className="flex-1 py-2.5 px-4 text-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition no-underline"
                    >
                      Lịch sử Điện Nước
                    </Link>
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