// client/src/app/chuTro/khachThue/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import QuanLyHeader from '@/components/layout/QuanLyHeader';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import { useAlertModal } from '@/components/common/AlertModalProvider';
import {
  KhachThueItem,
  KhachThueService,
} from '@/services/khachThue.service';

interface KhuTroItem {
  MaKhu: number;
  TenKhu: string;
}

const getApiBaseUrl = () => {
  const raw = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
  const trimmed = raw.replace(/\/auth\/?$/, '').replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
};

export default function QuanLyKhachThuePage() {
  const { showSuccess, showError, showConfirm } = useAlertModal();

  const [khachThueList, setKhachThueList] = useState<KhachThueItem[]>([]);
  const [khuTroList, setKhuTroList] = useState<KhuTroItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [selectedFilter, setSelectedFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modal cấp lại mật khẩu
  const [resetModalUser, setResetModalUser] = useState<KhachThueItem | null>(null);
  const [newPassword, setNewPassword] = useState<string>('');
  const [submittingReset, setSubmittingReset] = useState<boolean>(false);

  const fetchAllData = async () => {
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

      const [khachRes, khuRes] = await Promise.all([
        KhachThueService.getList(),
        fetch(`${getApiBaseUrl()}/phong-tro/khu-tro`, {
          method: 'GET',
          headers,
          credentials: 'include',
        })
          .then((r) => (r.ok ? r.json() : { data: [] }))
          .catch(() => ({ data: [] })),
      ]);

      setKhachThueList(khachRes);
      const listKhu = Array.isArray(khuRes?.data)
        ? khuRes.data
        : Array.isArray(khuRes)
        ? khuRes
        : [];
      setKhuTroList(listKhu);
    } catch {
      showError('Không thể tải danh sách khách thuê lúc này.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const filteredList = useMemo(() => {
    // Khử trùng lặp theo MaND (nếu có bản ghi trùng, ưu tiên giữ bản ghi đang có MaPhong)
    const uniqueMap = new Map<number, KhachThueItem>();
    for (const item of khachThueList) {
      const existing = uniqueMap.get(item.MaND);
      if (!existing || (!existing.MaPhong && item.MaPhong)) {
        uniqueMap.set(item.MaND, item);
      }
    }

    return Array.from(uniqueMap.values()).filter((item) => {
      if (selectedFilter === 'UNASSIGNED') {
        if (item.MaPhong) return false;
      } else if (selectedFilter !== 'ALL') {
        if (String(item.MaKhu) !== selectedFilter) return false;
      }

      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase().trim();
      return (
        (item.HoTen || '').toLowerCase().includes(q) ||
        (item.SDT || '').toLowerCase().includes(q) ||
        (item.CCCD || '').toLowerCase().includes(q) ||
        (item.NgheNghiep || '').toLowerCase().includes(q) ||
        (item.TenTK || '').toLowerCase().includes(q) ||
        (item.TenPhong || '').toLowerCase().includes(q)
      );
    });
  }, [khachThueList, selectedFilter, searchTerm]);

  const handleDelete = (item: KhachThueItem) => {
    showConfirm(
      `Bạn có chắc chắn muốn xóa tài khoản khách thuê "${item.HoTen || item.TenTK}" không?`,
      'Xác nhận xóa tài khoản',
      () => {
        void (async () => {
          try {
            await KhachThueService.delete(item.MaND);
            showSuccess('Xóa tài khoản khách thuê thành công!');
            fetchAllData();
          } catch {
            showError('Không thể xóa tài khoản khách thuê lúc này.');
          }
        })();
      },
      'Xóa',
      'Hủy'
    );
  };

  const handleConfirmResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModalUser) return;
    if (!newPassword || newPassword.trim().length < 6) {
      showError('Mật khẩu mới phải có ít nhất 6 ký tự!');
      return;
    }
    try {
      setSubmittingReset(true);
      await KhachThueService.resetPassword(
        resetModalUser.MaND,
        newPassword.trim()
      );
      showSuccess(`Đã cấp lại mật khẩu cho "${resetModalUser.HoTen}"!`);
      setResetModalUser(null);
      setNewPassword('');
    } catch {
      showError('Không thể cấp lại mật khẩu lúc này.');
    } finally {
      setSubmittingReset(false);
    }
  };

  const handleDeleteTenant = (tenant: KhachThueItem) => {
    showConfirm(
      `Bạn có chắc chắn muốn xóa tài khoản của khách thuê "${tenant.HoTen}" (@${tenant.TenTK}) không?`,
      'Xóa tài khoản khách thuê',
      async () => {
        try {
          await KhachThueService.delete(tenant.MaND);
          showSuccess('Đã xóa tài khoản khách thuê thành công!');
          fetchData();
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Không thể xóa tài khoản khách thuê này!';
          showError(msg);
        }
      },
      'Xóa tài khoản',
      'Hủy'
    );
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      <QuanLyHeader user={user} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        {/* Header Tiêu đề + Nút Tạo tài khoản */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Quản Lý Khách Thuê</h1>
            <p className="text-sm text-slate-500 mt-1">
              {user.Quyen === 'ChuTro'
                ? 'Chủ trọ quản lý toàn bộ tài khoản và hồ sơ khách thuê trên hệ thống'
                : 'Quản lý cơ sở và danh sách khách thuê thuộc phạm vi phụ trách của bạn'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/chuTro/khachThue/them"
              className="px-5 py-2.5 rounded-full bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 font-bold text-xs sm:text-sm shadow-xs transition no-underline flex items-center gap-1.5"
            >
              <span>+ Tạo Tài Khoản Mới</span>
            </Link>
          </div>
        </div>

        {/* Dải Tab Chọn Cơ Sở (Giống Ảnh 2 & Ảnh 3) */}
        <div className="flex flex-wrap items-center gap-2.5 mb-6">
          {user.Quyen === 'ChuTro' && (
            <button
              type="button"
              onClick={() => setSelectedKhu('ALL')}
              className={`px-4 py-2 rounded-full text-xs font-bold transition cursor-pointer ${
                selectedKhu === 'ALL'
                  ? 'bg-[#00FFCC] text-slate-900 shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tất cả cơ sở ({khachThueList.length})
            </button>
          )}

          {khuTroList.map((khu) => (
            <button
              type="button"
              key={khu.MaKhu}
              onClick={() => setSelectedKhu(String(khu.MaKhu))}
              className={`px-4 py-2 rounded-full text-xs font-bold transition cursor-pointer ${
                selectedKhu === String(khu.MaKhu)
                  ? 'bg-[#00FFCC] text-slate-900 shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {khu.TenKhu} ({countByKhu(khu.MaKhu)})
            </button>
          ))}

          <button
            type="button"
            onClick={() => setSelectedKhu('CHUA_CO_PHONG')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition cursor-pointer ${
              selectedKhu === 'CHUA_CO_PHONG'
                ? 'bg-[#00FFCC] text-slate-900 shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Chưa xếp phòng ({countChuaCoPhong})
          </button>
        </div>

        {/* Khung Thông Tin Cơ Sở Đang Chọn (Giống Ảnh 2) */}
        {activeKhuInfo && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-xs">
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-base font-bold text-slate-900">
                  {activeKhuInfo.TenKhu}
                </h2>
                <span className="px-3 py-0.5 rounded-full bg-[#00FFCC]/30 text-slate-900 text-xs font-bold">
                  Quản lý: {activeKhuInfo.TenQuanLy || user.HoTen}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                Địa chỉ: {activeKhuInfo.DiaChi}
              </p>
              {activeKhuInfo.MoTa && (
                <p className="text-xs text-slate-400 mt-0.5">{activeKhuInfo.MoTa}</p>
              )}
            </div>
          </div>
        )}

        {/* Thanh Tìm Kiếm & Lọc Trạng Thái */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-6 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 shadow-xs">
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Tìm kiếm theo họ tên, SĐT, CCCD, tài khoản hoặc phòng (VD: P.101)..."
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
          />

          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'ALL', label: 'Tất cả trạng thái' },
              { id: 'DangThue', label: 'Đang thuê' },
              { id: 'ChuaCoPhong', label: 'Chưa có phòng' },
            ].map((tab) => (
              <button
                type="button"
                key={tab.id}
                onClick={() => setTrangThaiFilter(tab.id)}
                className={`px-4 py-2 rounded-full text-xs font-bold transition cursor-pointer ${
                  trangThaiFilter === tab.id
                    ? 'bg-[#00FFCC] text-slate-900'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Danh Sách Thẻ Khách Thuê */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 text-sm">
            Đang tải danh sách khách thuê...
          </div>
        ) : filteredTenants.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 text-sm">
            Không tìm thấy khách thuê nào phù hợp.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredTenants.map((kt) => (
              <div
                key={kt.MaND}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="px-3 py-1 rounded-full bg-slate-800 text-white text-[11px] font-semibold truncate">
                      {kt.TenKhu || 'Chưa gán cơ sở'}
                    </span>
                    {kt.TenPhong ? (
                      <span className="px-3 py-1 rounded-full bg-[#00FFCC]/30 text-slate-900 text-xs font-bold shrink-0">
                        Phòng {kt.TenPhong}
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold shrink-0">
                        Chưa thuê phòng
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-bold text-slate-900">{kt.HoTen}</h3>
                  <p className="text-xs text-teal-700 font-semibold mb-3">
                    Tài khoản: <span className="font-bold">@{kt.TenTK}</span> • Mã ND: #{kt.MaND}
                  </p>

                  <div className="space-y-1.5 text-xs text-slate-600 border-t border-slate-100 pt-3">
                    <div className="flex justify-between">
                      <span className="text-slate-400">CCCD:</span>
                      <span className="font-semibold text-slate-800">{kt.CCCD}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Năm sinh:</span>
                      <span className="font-semibold text-slate-800">{kt.NamSinh || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Số điện thoại:</span>
                      <span className="font-bold text-slate-900">{kt.SDT}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Email:</span>
                      <span className="font-medium text-slate-800 truncate max-w-47.5">
                        {kt.Email || '—'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Địa chỉ:</span>
                      <span className="font-medium text-slate-800 truncate max-w-47.5">
                        {kt.DiaChi || '—'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3 Nút: Sửa thông tin, Cấp lại mật khẩu, Xóa */}
                <div className="grid grid-cols-3 gap-2 mt-5 pt-3 border-t border-slate-100">
                  <Link
                    href={`/chuTro/khachThue/sua/${kt.MaND}`}
                    className="py-2 rounded-full bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 font-bold text-xs text-center transition no-underline"
                  >
                    Sửa
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setResetModalUser(kt);
                      setNewPassword('');
                    }}
                    className="py-2 rounded-full border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition cursor-pointer"
                  >
                    Cấp lại MK
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteTenant(kt)}
                    className="py-2 rounded-full border border-red-200 hover:bg-red-50 text-red-600 font-bold text-xs transition cursor-pointer"
                  >
                    Xóa
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal Cấp lại mật khẩu nhanh */}
        {resetModalUser && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
              <h3 className="text-lg font-bold text-slate-900 mb-1">
                Cấp Lại Mật Khẩu
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Đặt mật khẩu mới cho khách thuê{' '}
                <span className="font-bold text-slate-800">{resetModalUser.HoTen}</span> (@
                {resetModalUser.TenTK})
              </p>

              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mật khẩu mới *
                  </label>
                  <input
                    type="text"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)..."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setResetModalUser(null)}
                    className="px-4 py-2 rounded-full border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={submittingReset}
                    className="px-5 py-2 rounded-full bg-[#00FFCC] hover:bg-[#00e6b8] text-xs font-bold text-slate-900 cursor-pointer"
                  >
                    {submittingReset ? 'Đang lưu...' : 'Xác nhận cấp lại'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function QuanLyKhachThuePage() {

  return (
    <ProtectedRoute allowedRoles={['ChuTro', 'QuanLy']}>
      {(user) => (
        <div className="min-h-screen bg-slate-50/60 flex flex-col">
          <QuanLyHeader user={user} />

          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
            {/* Tiêu đề & Nút tạo mới */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  Quản Lý Hồ Sơ & Tài Khoản Khách Thuê
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Quản lý tài khoản đăng nhập (NguoiDung) và hồ sơ định danh cá nhân (ThongTinCaNhan)
                </p>
              </div>

              <Link
                href="/chuTro/khachThue/them"
                className="inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 font-bold text-xs sm:text-sm shadow-xs transition no-underline whitespace-nowrap"
              >
                + Tạo tài khoản khách thuê
              </Link>
            </div>

            {/* Các nút lọc theo cơ sở */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedFilter('ALL')}
                className={`px-4 py-2 rounded-full text-xs font-bold transition cursor-pointer ${
                  selectedFilter === 'ALL'
                    ? 'bg-[#00FFCC] text-slate-900 shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                Tất cả trong quyền
              </button>

              {khuTroList.map((khu) => (
                <button
                  key={khu.MaKhu}
                  type="button"
                  onClick={() => setSelectedFilter(String(khu.MaKhu))}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition cursor-pointer ${
                    selectedFilter === String(khu.MaKhu)
                      ? 'bg-[#00FFCC] text-slate-900 shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {khu.TenKhu}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setSelectedFilter('UNASSIGNED')}
                className={`px-4 py-2 rounded-full text-xs font-bold transition cursor-pointer ${
                  selectedFilter === 'UNASSIGNED'
                    ? 'bg-[#00FFCC] text-slate-900 shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                Chưa xếp phòng
              </button>
            </div>

            {/* Thanh tìm kiếm */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-4 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm theo Họ tên, SĐT, CCCD, Nghề nghiệp, Tên tài khoản hoặc Phòng..."
                className="flex-1 px-4 py-2.5 rounded-full border border-slate-200 text-xs sm:text-sm text-slate-800 bg-slate-50/60 focus:bg-white focus:outline-none focus:border-teal-500 transition"
              />
              <div className="text-xs text-slate-600 font-medium px-2 whitespace-nowrap">
                Tổng số:{' '}
                <strong className="font-bold text-slate-900">
                  {filteredList.length}
                </strong>{' '}
                khách thuê
              </div>
            </div>

            {/* Bảng danh sách */}
            {loading ? (
              <div className="bg-white rounded-2xl border border-slate-200/80 p-10 text-center text-sm text-slate-500">
                Đang tải danh sách khách thuê...
              </div>
            ) : filteredList.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200/80 p-10 text-center text-xs sm:text-sm font-semibold text-slate-500">
                Không tìm thấy khách thuê nào phù hợp với bộ lọc hiện tại.
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-600 tracking-wider">
                        <th className="py-3.5 px-4 whitespace-nowrap">Khách thuê</th>
                        <th className="py-3.5 px-4 whitespace-nowrap">Tài khoản</th>
                        <th className="py-3.5 px-4 whitespace-nowrap">Liên hệ & CCCD</th>
                        <th className="py-3.5 px-4 whitespace-nowrap">Phòng / Cơ sở</th>
                        <th className="py-3.5 px-4 text-right whitespace-nowrap">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                      {filteredList.map((item) => (
                        <tr key={item.MaND} className="hover:bg-slate-50/80 transition">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900">
                              {item.HoTen || 'Chưa cập nhật'}
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">
                              {item.GioiTinh || '—'}{' '}
                              {item.NamSinh ? `• Sinh năm ${item.NamSinh}` : ''}
                              {item.NgheNghiep ? ` • ${item.NgheNghiep}` : ''}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-800 font-semibold text-xs">
                              {item.TenTK}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-800">
                              {item.SDT || '—'}
                            </div>
                            <div className="text-xs text-slate-500">
                              CCCD: {item.CCCD || 'Chưa cập nhật'}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {item.MaPhong ? (
                              <div>
                                <span className="px-2.5 py-1 rounded-full bg-teal-50 text-teal-800 border border-teal-200 font-bold text-xs">
                                  {item.TenPhong}
                                </span>
                                <div className="text-xs text-slate-500 mt-1">
                                  {item.TenKhu}
                                </div>
                              </div>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-semibold text-xs">
                                Chưa xếp phòng
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center justify-end gap-2">
                              <Link
                                href={`/chuTro/khachThue/sua/${item.MaND}`}
                                className="px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition no-underline"
                              >
                                Sửa
                              </Link>
                              <button
                                type="button"
                                onClick={() => {
                                  setResetModalUser(item);
                                  setNewPassword('');
                                }}
                                className="px-3 py-1.5 rounded-full bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 font-bold text-xs transition cursor-pointer"
                              >
                                Cấp lại MK
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(item)}
                                className="px-3 py-1.5 rounded-full bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold text-xs transition cursor-pointer"
                              >
                                Xóa
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </main>

          {/* Modal Cấp lại mật khẩu */}
          {resetModalUser && (
            <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
                <h3 className="text-base font-bold text-slate-900">
                  Cấp lại mật khẩu cho {resetModalUser.HoTen}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Tài khoản: <strong>{resetModalUser.TenTK}</strong>
                </p>

                <form onSubmit={handleConfirmResetPassword} className="mt-4 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Mật khẩu mới *
                    </label>
                    <input
                      type="text"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Nhập mật khẩu mới (ít nhất 6 ký tự)"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setResetModalUser(null)}
                      className="px-4 py-2 rounded-full border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      disabled={submittingReset}
                      className="px-5 py-2 rounded-full bg-[#00FFCC] hover:bg-[#00e6b8] text-xs font-bold text-slate-900 cursor-pointer disabled:opacity-50"
                    >
                      {submittingReset ? 'Đang lưu...' : 'Lưu mật khẩu mới'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </ProtectedRoute>
  );
}