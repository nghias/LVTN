// client/src/app/chuTro/thongKe/page.tsx
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import QuanLyHeader from '@/components/layout/QuanLyHeader';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import { useAlertModal } from '@/components/common/AlertModalProvider';

interface KhuTroItem {
  MaKhu: number;
  TenKhu: string;
}

type ActiveTab = 'TONG_QUAN' | 'DOANH_THU_NO' | 'PHONG_KHACH' | 'DIEN_NUOC';

const getApiBaseUrl = () => {
  const raw = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
  const trimmed = raw.replace(/\/auth\/?$/, '').replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
};

const formatVND = (val: number) =>
  new Intl.NumberFormat('vi-VN').format(Math.round(Number(val) || 0)) + ' đ';

const formatCompactVND = (val: number) => {
  const num = Number(val) || 0;
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)} tỷ`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)} tr`;
  if (num >= 1_000) return `${Math.round(num / 1_000)}k`;
  return String(num);
};

export default function ThongKeChuTroPage() {
  const { showError } = useAlertModal();

  const [loading, setLoading] = useState<boolean>(true);
  const [stats, setStats] = useState<any>(null);

  // Bộ lọc cơ sở và khoảng thời gian
  const [selectedMaKhu, setSelectedMaKhu] = useState<string>('ALL');
  const [presetMonths, setPresetMonths] = useState<string>('6');
  const [tuThang, setTuThang] = useState<string>('');
  const [denThang, setDenThang] = useState<string>('');
  const [activeTab, setActiveTab] = useState<ActiveTab>('TONG_QUAN');

  const fetchStatistics = useCallback(
    async (paramsObj?: {
      maKhu?: string;
      soThang?: string;
      tuThang?: string;
      denThang?: string;
    }) => {
      try {
        setLoading(true);
        const token =
          typeof window !== 'undefined'
            ? localStorage.getItem('token') ||
              localStorage.getItem('accessToken') ||
              sessionStorage.getItem('token')
            : null;

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const query = new URLSearchParams();
        const khuVal =
          paramsObj?.maKhu !== undefined ? paramsObj.maKhu : selectedMaKhu;
        const soThangVal =
          paramsObj?.soThang !== undefined ? paramsObj.soThang : presetMonths;
        const tuVal =
          paramsObj?.tuThang !== undefined ? paramsObj.tuThang : tuThang;
        const denVal =
          paramsObj?.denThang !== undefined ? paramsObj.denThang : denThang;

        if (khuVal && khuVal !== 'ALL') query.set('maKhu', khuVal);
        if (soThangVal) query.set('soThang', soThangVal);
        if (tuVal) query.set('tuThang', tuVal);
        if (denVal) query.set('denThang', denVal);

        const res = await fetch(
          `${getApiBaseUrl()}/thong-ke/quan-ly?${query.toString()}`,
          {
            method: 'GET',
            headers,
            credentials: 'include',
          }
        );

        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error('LOAD_FAILED');
        }

        setStats(json.data);
        if (!tuVal && json.data?.boLoc?.tuThang) {
          setTuThang(json.data.boLoc.tuThang);
        }
        if (!denVal && json.data?.boLoc?.denThang) {
          setDenThang(json.data.boLoc.denThang);
        }
      } catch {
        showError('Không thể tải dữ liệu thống kê lúc này.');
      } finally {
        setLoading(false);
      }
    },
    [selectedMaKhu, presetMonths, tuThang, denThang, showError]
  );

  useEffect(() => {
    fetchStatistics({ maKhu: 'ALL', soThang: '6', tuThang: '', denThang: '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectKhu = (maKhuVal: string) => {
    setSelectedMaKhu(maKhuVal);
    fetchStatistics({
      maKhu: maKhuVal,
      soThang: presetMonths,
      tuThang,
      denThang,
    });
  };

  const handleSelectPreset = (monthsCount: string) => {
    setPresetMonths(monthsCount);
    setTuThang('');
    setDenThang('');
    fetchStatistics({
      maKhu: selectedMaKhu,
      soThang: monthsCount,
      tuThang: '',
      denThang: '',
    });
  };

  const handleApplyCustomRange = (e: React.FormEvent) => {
    e.preventDefault();
    if (tuThang && denThang && tuThang > denThang) {
      showError('Tháng bắt đầu không được lớn hơn tháng kết thúc!');
      return;
    }
    setPresetMonths('');
    fetchStatistics({
      maKhu: selectedMaKhu,
      soThang: '',
      tuThang,
      denThang,
    });
  };

  const doanhThu = stats?.thongKeDoanhThu || {};
  const congNo = stats?.thongKeCongNo || {};
  const phong = stats?.thongKePhong || {};
  const nguoiThue = stats?.thongKeNguoiThue || {};
  const dienNuoc = stats?.thongKeDienNuoc || {};
  const vanHanh = stats?.tienDoVanHanh || {};
  const khuTroList: KhuTroItem[] = stats?.boLoc?.khuTroList || [];

  const chartDoanhThuList: any[] = doanhThu.bieuDoTheoThang || [];
  const maxMoneyChart = Math.max(
    1,
    ...chartDoanhThuList.map((d) =>
      Math.max(
        Number(d.thucThu) || 0,
        Number(d.congNo) || 0,
        Number(d.phaiThu) || 0
      )
    )
  );

  const chartDienNuocList: any[] = dienNuoc.bieuDoTheoThang || [];
  const maxDienChart = Math.max(
    1,
    ...chartDienNuocList.map((d) => Number(d.soDien) || 0)
  );
  const maxNuocChart = Math.max(
    1,
    ...chartDienNuocList.map((d) => Number(d.soNuoc) || 0)
  );

  return (
    <ProtectedRoute allowedRoles={['ChuTro', 'QuanLy']}>
      {(user) => (
        <div className="min-h-screen bg-slate-50/60 flex flex-col">
          <QuanLyHeader user={user} />

          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
            {/* Tiêu đề & Nút chọn nhanh khoảng thời gian */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  Thống Kê & Báo Cáo Vận Hành
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  {user.Quyen === 'ChuTro'
                    ? 'Theo dõi doanh thu, công nợ, tình trạng phòng, khách thuê và tiêu thụ điện nước toàn hệ thống.'
                    : 'Theo dõi chỉ số vận hành, công nợ, phòng trọ và điện nước tại cơ sở phụ trách.'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
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
                        ? 'bg-[#00FFCC] text-slate-900 shadow-xs'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Các nút lọc theo cơ sở (Giống trang Quản lý Khách thuê) */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleSelectKhu('ALL')}
                className={`px-4 py-2 rounded-full text-xs font-bold transition cursor-pointer ${
                  selectedMaKhu === 'ALL'
                    ? 'bg-[#00FFCC] text-slate-900 shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                Tất cả trong quyền ({khuTroList.length})
              </button>

              {khuTroList.map((khu) => (
                <button
                  key={khu.MaKhu}
                  type="button"
                  onClick={() => handleSelectKhu(String(khu.MaKhu))}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition cursor-pointer ${
                    selectedMaKhu === String(khu.MaKhu)
                      ? 'bg-[#00FFCC] text-slate-900 shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {khu.TenKhu}
                </button>
              ))}
            </div>

            {/* Thanh lọc khoảng tháng tùy chỉnh */}
            <form
              onSubmit={handleApplyCustomRange}
              className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-4 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3"
            >
              <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-xs font-bold text-slate-600 whitespace-nowrap">
                    Từ tháng:
                  </span>
                  <input
                    type="month"
                    value={tuThang}
                    onChange={(e) => setTuThang(e.target.value)}
                    className="flex-1 px-3.5 py-2 rounded-full border border-slate-200 text-xs text-slate-800 bg-slate-50/60 focus:bg-white focus:outline-none focus:border-teal-500 transition"
                  />
                </div>

                <div className="flex items-center gap-2 flex-1">
                  <span className="text-xs font-bold text-slate-600 whitespace-nowrap">
                    Đến tháng:
                  </span>
                  <input
                    type="month"
                    value={denThang}
                    onChange={(e) => setDenThang(e.target.value)}
                    className="flex-1 px-3.5 py-2 rounded-full border border-slate-200 text-xs text-slate-800 bg-slate-50/60 focus:bg-white focus:outline-none focus:border-teal-500 transition"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3">
                <span className="text-xs text-slate-500 font-medium whitespace-nowrap">
                  Kỳ xem:{' '}
                  <strong className="font-bold text-slate-900">
                    {stats?.boLoc?.tuThang || '—'} → {stats?.boLoc?.denThang || '—'}
                  </strong>
                </span>
                <button
                  type="submit"
                  className="cursor-pointer whitespace-nowrap rounded-full bg-[#00FFCC] px-5 py-2 text-xs font-bold text-slate-900 shadow-2xs transition hover:bg-[#00e6b8]"
                >
                  Lọc theo kỳ
                </button>
              </div>
            </form>

            {/* 5 Thẻ thống kê cốt lõi (Bắt buộc) */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
              {/* 1. Doanh thu */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                    Doanh thu thu
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[10px]">
                    {doanhThu.tyLeThuHoi ?? 100}%
                  </span>
                </div>
                <div className="text-base sm:text-lg font-bold text-emerald-600 mt-2 truncate">
                  {formatVND(doanhThu.tongThucThu || 0)}
                </div>
                <div className="text-xs text-slate-500 mt-1 truncate">
                  Phải thu: {formatVND(doanhThu.tongPhaiThu || 0)}
                </div>
              </div>

              {/* 2. Công nợ */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                    Công nợ
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200 font-bold text-[10px]">
                    {congNo.soPhongDangNo || 0} phòng
                  </span>
                </div>
                <div className="text-base sm:text-lg font-bold text-red-600 mt-2 truncate">
                  {formatVND(congNo.tongCongNo || 0)}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {congNo.soHoaDonNo || 0} hóa đơn chưa trả đủ
                </div>
              </div>

              {/* 3. Tình trạng phòng */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                    Tình trạng phòng
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200 font-bold text-[10px]">
                    {phong.tyLeLapDay || 0}%
                  </span>
                </div>
                <div className="text-base sm:text-lg font-bold text-slate-900 mt-2">
                  {phong.phongDangThue || 0} / {phong.tongSoPhong || 0} phòng
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Trống: <strong className="text-slate-800">{phong.phongTrong || 0}</strong> • Bảo trì:{' '}
                  <strong className="text-slate-800">{phong.phongBaoTri || 0}</strong>
                </div>
              </div>

              {/* 4. Người thuê */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                    Người thuê
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-semibold text-[10px]">
                    +{nguoiThue.khachMoiTrongKy || 0} mới
                  </span>
                </div>
                <div className="text-base sm:text-lg font-bold text-slate-900 mt-2">
                  {nguoiThue.tongKhachDangO || 0} khách đang ở
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Chưa ĐK tạm trú:{' '}
                  <strong className="text-red-600">
                    {nguoiThue?.tamTru?.chuaDangKy || 0}
                  </strong>
                </div>
              </div>

              {/* 5. Tiêu thụ Điện & Nước */}
              <div className="col-span-2 lg:col-span-1 bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                    Điện & Nước
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200 font-bold text-[10px]">
                    IoT
                  </span>
                </div>
                <div className="text-sm sm:text-base font-bold text-slate-900 mt-2 truncate">
                  {dienNuoc.tongDienTieuThu || 0} kWh • {dienNuoc.tongNuocTieuThu || 0} m³
                </div>
                <div className="text-xs text-slate-500 mt-1 truncate">
                  Thành tiền:{' '}
                  {formatVND(
                    (dienNuoc.tongTienDienTrongKy || 0) +
                      (dienNuoc.tongTienNuocTrongKy || 0)
                  )}
                </div>
              </div>
            </div>

            {/* Khung Tiến độ vận hành tháng hiện tại (Nền sáng đồng bộ hệ thống) */}
            <div className="bg-white rounded-2xl border border-teal-200 p-4 sm:p-5 shadow-2xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-[#00FFCC] text-slate-900 font-bold text-xs">
                    Kỳ {vanHanh.kyHienTai || 'hiện tại'}
                  </span>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900">
                    Tiến Độ Vận Hành Hàng Tháng
                  </h2>
                </div>
                <span className="text-xs text-slate-500">
                  Bấm vào từng mục để chuyển nhanh đến trang xử lý
                </span>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Link
                  href="/chuTro/dienNuoc"
                  className="p-3.5 rounded-xl bg-slate-50/80 hover:bg-teal-50/60 border border-slate-200 transition no-underline"
                >
                  <div className="text-xs text-slate-500">Chốt chỉ số Điện Nước</div>
                  <div className="text-sm sm:text-base font-bold text-slate-900 mt-1">
                    {vanHanh.soPhongDaGhiDienNuoc || 0} /{' '}
                    {vanHanh.tongPhongDangThue || 0} phòng
                  </div>
                </Link>

                <Link
                  href="/chuTro/hoaDon"
                  className="p-3.5 rounded-xl bg-slate-50/80 hover:bg-teal-50/60 border border-slate-200 transition no-underline"
                >
                  <div className="text-xs text-slate-500">Lập hóa đơn kỳ này</div>
                  <div className="text-sm sm:text-base font-bold text-slate-900 mt-1">
                    {vanHanh.soPhongDaLapHoaDon || 0} /{' '}
                    {vanHanh.tongPhongDangThue || 0} phòng
                  </div>
                </Link>

                <Link
                  href="/chuTro/hopDong"
                  className="p-3.5 rounded-xl bg-amber-50/60 hover:bg-amber-50 border border-amber-200 transition no-underline"
                >
                  <div className="text-xs text-amber-800">HĐ sắp hết hạn (30 ngày)</div>
                  <div className="text-sm sm:text-base font-bold text-amber-700 mt-1">
                    {nguoiThue?.hopDong?.soHopDongSapHetHan || 0} hợp đồng
                  </div>
                </Link>

                <Link
                  href="/chuTro/thanhToan"
                  className="p-3.5 rounded-xl bg-teal-50/60 hover:bg-teal-50 border border-teal-200 transition no-underline"
                >
                  <div className="text-xs text-teal-800">Giao dịch chờ xác nhận</div>
                  <div className="text-sm sm:text-base font-bold text-teal-800 mt-1">
                    {vanHanh.giaoDichChoDuyet || 0} giao dịch
                  </div>
                </Link>
              </div>
            </div>

            {/* Thanh chọn nhóm biểu đồ (Tối ưu vuốt ngang trên điện thoại) */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {[
                { id: 'TONG_QUAN', label: 'Tất cả thống kê' },
                { id: 'DOANH_THU_NO', label: 'Doanh thu & Công nợ' },
                { id: 'PHONG_KHACH', label: 'Tình trạng phòng & Khách thuê' },
                { id: 'DIEN_NUOC', label: 'Tiêu thụ Điện & Nước' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as ActiveTab)}
                  className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                    activeTab === tab.id
                      ? 'bg-[#00FFCC] text-slate-900 shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="bg-white rounded-2xl border border-slate-200/80 p-10 text-center text-sm text-slate-500">
                Đang tải dữ liệu thống kê...
              </div>
            ) : (
              <div className="space-y-5">
                {/* NHÓM 1: BIỂU ĐỒ DOANH THU & CÔNG NỢ */}
                {(activeTab === 'TONG_QUAN' || activeTab === 'DOANH_THU_NO') && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    {/* Biểu đồ cột đôi Thực thu & Công nợ */}
                    <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-2xs">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                        <div>
                          <h3 className="text-base font-bold text-slate-900">
                            Biểu Đồ Doanh Thu & Công Nợ Theo Tháng
                          </h3>
                          <p className="text-xs text-slate-500 mt-0.5">
                            So sánh số tiền đã thực thu và công nợ chưa thu qua từng tháng
                          </p>
                        </div>
                        <div className="flex items-center gap-4 text-xs font-semibold text-slate-700">
                          <span className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded-xs bg-emerald-500 inline-block" />
                            Thực thu
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded-xs bg-red-500 inline-block" />
                            Công nợ
                          </span>
                        </div>
                      </div>

                      <div className="h-56 sm:h-64 flex items-end gap-2 sm:gap-4 pt-6 pb-2 px-1 border-b border-slate-200 overflow-x-auto">
                        {chartDoanhThuList.map((item) => {
                          const hThu = Math.round(
                            ((Number(item.thucThu) || 0) / maxMoneyChart) * 100
                          );
                          const hNo = Math.round(
                            ((Number(item.congNo) || 0) / maxMoneyChart) * 100
                          );
                          return (
                            <div
                              key={item.thangNam}
                              className="flex-1 min-w-[50px] flex flex-col items-center h-full justify-end"
                            >
                              <div className="w-full flex items-end justify-center gap-1 sm:gap-1.5 h-full">
                                <div className="flex flex-col items-center justify-end h-full w-4 sm:w-6">
                                  <span className="text-[10px] font-bold text-emerald-700 mb-1">
                                    {item.thucThu > 0
                                      ? formatCompactVND(item.thucThu)
                                      : ''}
                                  </span>
                                  <div
                                    style={{
                                      height: `${Math.max(
                                        hThu,
                                        item.thucThu > 0 ? 6 : 2
                                      )}%`,
                                    }}
                                    title={`Thực thu ${item.nhan}: ${formatVND(item.thucThu)}`}
                                    className="w-full bg-emerald-500 hover:bg-emerald-600 rounded-t-md transition-all"
                                  />
                                </div>

                                <div className="flex flex-col items-center justify-end h-full w-4 sm:w-6">
                                  <span className="text-[10px] font-bold text-red-600 mb-1">
                                    {item.congNo > 0
                                      ? formatCompactVND(item.congNo)
                                      : ''}
                                  </span>
                                  <div
                                    style={{
                                      height: `${Math.max(
                                        hNo,
                                        item.congNo > 0 ? 6 : 2
                                      )}%`,
                                    }}
                                    title={`Công nợ ${item.nhan}: ${formatVND(item.congNo)}`}
                                    className="w-full bg-red-500 hover:bg-red-600 rounded-t-md transition-all"
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

                    {/* Cơ cấu nguồn thu */}
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
                      <div>
                        <h3 className="text-base font-bold text-slate-900">
                          Cơ Cấu Nguồn Thu
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5 mb-4">
                          Tỷ trọng các khoản mục trong hóa đơn kỳ đã chọn
                        </p>

                        <div className="space-y-3">
                          {[
                            {
                              label: 'Tiền thuê phòng',
                              val: doanhThu?.coCauDoanhThu?.tienPhong || 0,
                              color: 'bg-teal-500',
                            },
                            {
                              label: 'Tiền điện (IoT)',
                              val: doanhThu?.coCauDoanhThu?.tienDien || 0,
                              color: 'bg-amber-500',
                            },
                            {
                              label: 'Tiền nước (IoT)',
                              val: doanhThu?.coCauDoanhThu?.tienNuoc || 0,
                              color: 'bg-sky-500',
                            },
                            {
                              label: 'Phí dịch vụ cố định',
                              val: doanhThu?.coCauDoanhThu?.tienPhuPhi || 0,
                              color: 'bg-emerald-500',
                            },
                            {
                              label: 'Chi phí phát sinh',
                              val: doanhThu?.coCauDoanhThu?.tienPhatSinh || 0,
                              color: 'bg-red-500',
                            },
                          ].map((item) => {
                            const total = Math.max(1, doanhThu.tongPhaiThu || 1);
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

                      <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-500">
                          Tổng phải thu:
                        </span>
                        <strong className="text-sm font-bold text-slate-900">
                          {formatVND(doanhThu.tongPhaiThu || 0)}
                        </strong>
                      </div>
                    </div>
                  </div>
                )}

                {/* BẢNG DANH SÁCH CÔNG NỢ (ĐỒNG BỘ BẢNG KHÁCH THUÊ) */}
                {(activeTab === 'TONG_QUAN' || activeTab === 'DOANH_THU_NO') && (
                  <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
                    <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h3 className="text-base font-bold text-slate-900">
                          Danh Sách Hóa Đơn Còn Công Nợ ({congNo.soHoaDonNo || 0})
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Theo dõi các phòng chưa thanh toán đủ trong khoảng thời gian đã chọn
                        </p>
                      </div>
                      <Link
                        href="/chuTro/hoaDon"
                        className="px-4 py-2 rounded-full bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 font-bold text-xs transition no-underline self-start sm:self-auto"
                      >
                        Quản lý hóa đơn
                      </Link>
                    </div>

                    {!congNo.danhSachCongNo ||
                    congNo.danhSachCongNo.length === 0 ? (
                      <div className="p-8 text-center text-xs font-semibold text-slate-500">
                        Không có hóa đơn nào còn công nợ trong kỳ đã chọn.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-600 tracking-wider">
                              <th className="py-3.5 px-4 whitespace-nowrap">
                                Phòng / Cơ sở
                              </th>
                              <th className="py-3.5 px-4 whitespace-nowrap">
                                Khách đại diện
                              </th>
                              <th className="py-3.5 px-4 whitespace-nowrap">
                                Kỳ hóa đơn
                              </th>
                              <th className="py-3.5 px-4 whitespace-nowrap">
                                Tổng tiền & Đã trả
                              </th>
                              <th className="py-3.5 px-4 whitespace-nowrap">
                                Còn nợ
                              </th>
                              <th className="py-3.5 px-4 text-right whitespace-nowrap">
                                Thao tác
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs">
                            {congNo.danhSachCongNo.slice(0, 10).map((item: any) => (
                              <tr
                                key={item.MaHD}
                                className="hover:bg-slate-50/80 transition"
                              >
                                <td className="py-3.5 px-4 whitespace-nowrap">
                                  <span className="px-2.5 py-1 rounded-full bg-teal-50 text-teal-800 border border-teal-200 font-bold text-xs">
                                    {item.TenPhong}
                                  </span>
                                  <div className="text-xs text-slate-500 mt-1">
                                    {item.TenKhu}
                                  </div>
                                </td>

                                <td className="py-3.5 px-4">
                                  <div className="font-bold text-slate-900">
                                    {item.TenKhachDaiDien}
                                  </div>
                                  <div className="text-xs text-slate-500 mt-0.5">
                                    SĐT: {item.SDTKhach || '—'}
                                  </div>
                                </td>

                                <td className="py-3.5 px-4 whitespace-nowrap">
                                  <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-800 font-semibold text-xs">
                                    {item.KyThang}
                                  </span>
                                </td>

                                <td className="py-3.5 px-4 whitespace-nowrap">
                                  <div className="font-semibold text-slate-800">
                                    Tổng: {formatVND(item.TongTien)}
                                  </div>
                                  <div className="text-xs text-emerald-600">
                                    Đã trả: {formatVND(item.TienDaTra)}
                                  </div>
                                </td>

                                <td className="py-3.5 px-4 whitespace-nowrap">
                                  <span className="px-2.5 py-1 rounded-full bg-red-50 text-red-600 border border-red-200 font-bold text-xs">
                                    {formatVND(item.ConNo)}
                                  </span>
                                </td>

                                <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                  <div className="inline-flex items-center justify-end gap-2">
                                    {item.SDTKhach && (
                                      <a
                                        href={`tel:${item.SDTKhach}`}
                                        className="px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition no-underline"
                                      >
                                        Gọi điện
                                      </a>
                                    )}
                                    <Link
                                      href="/chuTro/thanhToan"
                                      className="px-3 py-1.5 rounded-full bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 font-bold text-xs transition no-underline"
                                    >
                                      Thu tiền
                                    </Link>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* NHÓM 2: TÌNH TRẠNG PHÒNG & NGƯỜI THUÊ */}
                {(activeTab === 'TONG_QUAN' || activeTab === 'PHONG_KHACH') && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {/* Biểu đồ Tình trạng phòng */}
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-2xs space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-base font-bold text-slate-900">
                            Thống Kê Tình Trạng Phòng
                          </h3>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Tỷ lệ lấp đầy và phân bổ trạng thái phòng
                          </p>
                        </div>
                        <Link
                          href="/chuTro/phongTro"
                          className="px-3.5 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition no-underline"
                        >
                          Xem phòng
                        </Link>
                      </div>

                      <div className="flex flex-col sm:flex-row items-center gap-6 py-2">
                        {(() => {
                          const total = Math.max(1, phong.tongSoPhong || 1);
                          const pThue = Math.round(
                            ((phong.phongDangThue || 0) / total) * 100
                          );
                          const pTrong = Math.round(
                            ((phong.phongTrong || 0) / total) * 100
                          );
                          const stop1 = pThue;
                          const stop2 = Math.min(100, pThue + pTrong);

                          return (
                            <div
                              className="w-36 h-36 rounded-full flex items-center justify-center shrink-0"
                              style={{
                                background: `conic-gradient(#10b981 0% ${stop1}%, #14b8a6 ${stop1}% ${stop2}%, #f59e0b ${stop2}% 100%)`,
                              }}
                            >
                              <div className="w-24 h-24 rounded-full bg-white flex flex-col items-center justify-center text-center">
                                <span className="text-xl font-bold text-slate-900">
                                  {phong.tyLeLapDay || 0}%
                                </span>
                                <span className="text-[10px] font-bold text-slate-500 uppercase">
                                  Lấp đầy
                                </span>
                              </div>
                            </div>
                          );
                        })()}

                        <div className="flex-1 w-full space-y-2.5">
                          <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                            <span className="text-xs font-bold text-emerald-800">
                              Đang thuê
                            </span>
                            <span className="text-xs font-bold text-emerald-800">
                              {phong.phongDangThue || 0} phòng
                            </span>
                          </div>
                          <div className="flex items-center justify-between p-2.5 rounded-xl bg-teal-50 border border-teal-200">
                            <span className="text-xs font-bold text-teal-800">
                              Đang trống
                            </span>
                            <span className="text-xs font-bold text-teal-800">
                              {phong.phongTrong || 0} phòng
                            </span>
                          </div>
                          <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50 border border-amber-200">
                            <span className="text-xs font-bold text-amber-800">
                              Đang bảo trì
                            </span>
                            <span className="text-xs font-bold text-amber-800">
                              {phong.phongBaoTri || 0} phòng
                            </span>
                          </div>
                        </div>
                      </div>

                      {phong.theoKhu && phong.theoKhu.length > 0 && (
                        <div className="pt-3 border-t border-slate-100 space-y-2.5">
                          <div className="text-xs font-bold text-slate-600 uppercase">
                            Chi tiết theo cơ sở
                          </div>
                          {phong.theoKhu.map((k: any) => (
                            <div key={k.MaKhu} className="space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className="font-semibold text-slate-800">
                                  {k.TenKhu}
                                </span>
                                <span className="text-slate-600">
                                  <strong className="text-slate-900">
                                    {k.DangThue}
                                  </strong>
                                  /{k.TongPhong} phòng ({k.TyLeLapDay}%)
                                </span>
                              </div>
                              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-teal-500 rounded-full"
                                  style={{ width: `${k.TyLeLapDay}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Thống kê Người thuê, Tạm trú & Hợp đồng */}
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-2xs space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-base font-bold text-slate-900">
                            Thống Kê Người Thuê & Tạm Trú
                          </h3>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Hồ sơ cư trú, tiền cọc và cảnh báo hợp đồng sắp hết hạn
                          </p>
                        </div>
                        <Link
                          href="/chuTro/khachThue"
                          className="px-3.5 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition no-underline"
                        >
                          Khách thuê
                        </Link>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                        <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200">
                          <div className="text-[11px] font-semibold text-emerald-800">
                            Đã ĐK tạm trú
                          </div>
                          <div className="text-base font-bold text-emerald-700 mt-1">
                            {nguoiThue?.tamTru?.daDangKy || 0} người
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-red-50/70 border border-red-200">
                          <div className="text-[11px] font-semibold text-red-700">
                            Chưa ĐK tạm trú
                          </div>
                          <div className="text-base font-bold text-red-600 mt-1">
                            {nguoiThue?.tamTru?.chuaDangKy || 0} người
                          </div>
                        </div>

                        <div className="col-span-2 sm:col-span-1 p-3 rounded-xl bg-slate-50 border border-slate-200">
                          <div className="text-[11px] font-semibold text-slate-500">
                            Giới tính
                          </div>
                          <div className="text-sm font-bold text-slate-900 mt-1">
                            Nam: {nguoiThue?.gioiTinh?.nam || 0} • Nữ:{' '}
                            {nguoiThue?.gioiTinh?.nu || 0}
                          </div>
                        </div>
                      </div>

                      <div className="p-3.5 rounded-xl bg-teal-50/70 border border-teal-200 flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-teal-900">
                            Tổng tiền cọc đang giữ (
                            {nguoiThue?.hopDong?.soHopDongHieuLuc || 0} HĐ hiệu lực)
                          </div>
                          <div className="text-[11px] text-teal-700 mt-0.5">
                            Đối soát khi gia hạn hoặc thanh lý hợp đồng
                          </div>
                        </div>
                        <span className="text-sm sm:text-base font-bold text-teal-900">
                          {formatVND(nguoiThue?.hopDong?.tongTienCocDangGiu || 0)}
                        </span>
                      </div>

                      <div className="space-y-2">
                        <div className="text-xs font-bold text-slate-600 uppercase">
                          Hợp đồng sắp hết hạn trong 30 ngày (
                          {nguoiThue?.hopDong?.soHopDongSapHetHan || 0})
                        </div>
                        {!nguoiThue?.hopDong?.danhSachSapHetHan ||
                        nguoiThue.hopDong.danhSachSapHetHan.length === 0 ? (
                          <div className="text-xs text-slate-500 py-3 text-center bg-slate-50 rounded-xl">
                            Không có hợp đồng nào sắp hết hạn trong 30 ngày tới.
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                            {nguoiThue.hopDong.danhSachSapHetHan.map(
                              (hd: any) => (
                                <div
                                  key={hd.MaHDT}
                                  className="flex items-center justify-between p-2.5 rounded-xl border border-amber-200 bg-amber-50/50 text-xs"
                                >
                                  <div>
                                    <span className="font-bold text-slate-900">
                                      {hd.TenPhong} ({hd.TenKhu})
                                    </span>
                                    <div className="text-[11px] text-slate-600 mt-0.5">
                                      Đại diện: {hd.TenDaiDien || '—'} • Hết hạn:{' '}
                                      {hd.NgayKT}
                                    </div>
                                  </div>
                                  <span className="px-2.5 py-1 rounded-full font-bold bg-amber-100 text-amber-800 border border-amber-200 whitespace-nowrap">
                                    Còn {hd.SoNgayConLai} ngày
                                  </span>
                                </div>
                              )
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* NHÓM 3: BIỂU ĐỒ TIÊU THỤ ĐIỆN NƯỚC */}
                {(activeTab === 'TONG_QUAN' || activeTab === 'DIEN_NUOC') && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-2xs">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                        <div>
                          <h3 className="text-base font-bold text-slate-900">
                            Biểu Đồ Tiêu Thụ Điện (kWh) & Nước (m³)
                          </h3>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Sản lượng điện nước ghi nhận qua các tháng trong kỳ
                          </p>
                        </div>
                        <div className="flex items-center gap-4 text-xs font-semibold text-slate-700">
                          <span className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded-xs bg-amber-500 inline-block" />
                            Điện (kWh)
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded-xs bg-teal-500 inline-block" />
                            Nước (m³)
                          </span>
                        </div>
                      </div>

                      <div className="h-56 sm:h-64 flex items-end gap-2 sm:gap-4 pt-6 pb-2 px-1 border-b border-slate-200 overflow-x-auto">
                        {chartDienNuocList.map((item) => {
                          const hDien = Math.round(
                            ((Number(item.soDien) || 0) / maxDienChart) * 100
                          );
                          const hNuoc = Math.round(
                            ((Number(item.soNuoc) || 0) / maxNuocChart) * 100
                          );
                          return (
                            <div
                              key={item.thangNam}
                              className="flex-1 min-w-[50px] flex flex-col items-center h-full justify-end"
                            >
                              <div className="w-full flex items-end justify-center gap-1 sm:gap-1.5 h-full">
                                <div className="flex flex-col items-center justify-end h-full w-4 sm:w-6">
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
                                    title={`Điện ${item.nhan}: ${item.soDien} kWh`}
                                    className="w-full bg-amber-500 hover:bg-amber-600 rounded-t-md transition-all"
                                  />
                                </div>

                                <div className="flex flex-col items-center justify-end h-full w-4 sm:w-6">
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
                                    title={`Nước ${item.nhan}: ${item.soNuoc} m³`}
                                    className="w-full bg-teal-500 hover:bg-teal-600 rounded-t-md transition-all"
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

                    {/* Top phòng tiêu thụ điện nước cao nhất */}
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
                      <div>
                        <h3 className="text-base font-bold text-slate-900">
                          Top Phòng Tiêu Thụ Cao Nhất
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5 mb-4">
                          Hỗ trợ kiểm soát thiết bị hao điện hoặc rò rỉ nước
                        </p>

                        {!dienNuoc.topPhongTieuThu ||
                        dienNuoc.topPhongTieuThu.length === 0 ? (
                          <div className="text-xs text-slate-500 py-6 text-center bg-slate-50 rounded-xl">
                            Chưa có dữ liệu chỉ số điện nước trong kỳ này.
                          </div>
                        ) : (
                          <div className="space-y-2.5">
                            {dienNuoc.topPhongTieuThu.map(
                              (rm: any, idx: number) => (
                                <div
                                  key={rm.MaPhong}
                                  className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-2"
                                >
                                  <div>
                                    <span className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200 font-bold text-xs">
                                      #{idx + 1} {rm.TenPhong}
                                    </span>
                                    <span className="ml-1.5 text-xs text-slate-500">
                                      {rm.TenKhu}
                                    </span>
                                    <div className="text-xs text-slate-600 mt-1">
                                      Điện: <strong>{rm.SoDien} kWh</strong> • Nước:{' '}
                                      <strong>{rm.SoNuoc} m³</strong>
                                    </div>
                                  </div>
                                  <span className="text-xs font-bold text-slate-900 whitespace-nowrap">
                                    {formatVND(rm.TongTienDienNuoc)}
                                  </span>
                                </div>
                              )
                            )}
                          </div>
                        )}
                      </div>

                      <Link
                        href="/chuTro/dienNuoc"
                        className="mt-4 w-full py-2.5 text-center rounded-full bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 text-xs font-bold shadow-2xs transition no-underline"
                      >
                        Quản lý chỉ số Điện Nước
                      </Link>
                    </div>
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