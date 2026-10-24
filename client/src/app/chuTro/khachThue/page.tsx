'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import QuanLyHeader from '@/components/layout/QuanLyHeader';
import { KhachThueService, KhachThueItem } from '@/services/khachThue.service';
import { PhongTroService } from '@/services/phongTro.service';
import { KhuTroItem } from '@/types/phongTro.type';
import { useAlertModal } from '@/components/common/AlertModalProvider';
import { UserProfile } from '@/types/auth.type';

function KhachThueContent({ user }: { user: UserProfile }) {
  const { showSuccess, showError, showConfirm } = useAlertModal();

  const [khuTroList, setKhuTroList] = useState<KhuTroItem[]>([]);
  const [khachThueList, setKhachThueList] = useState<KhachThueItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Bộ lọc
  const [selectedKhu, setSelectedKhu] = useState<string>('ALL');
  const [trangThaiFilter, setTrangThaiFilter] = useState<string>('ALL');
  const [keyword, setKeyword] = useState<string>('');

  // Modal cấp lại mật khẩu nhanh
  const [resetModalUser, setResetModalUser] = useState<KhachThueItem | null>(null);
  const [newPassword, setNewPassword] = useState<string>('');
  const [submittingReset, setSubmittingReset] = useState<boolean>(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [khuRes, tenants] = await Promise.all([
        PhongTroService.getKhuTroList(),
        KhachThueService.getList(),
      ]);
      const khus = khuRes.data || [];
      setKhuTroList(khus);
      setKhachThueList(tenants);

      // Nếu là Quản lý chỉ phụ trách 1 cơ sở, tự động chọn cơ sở đó giống Ảnh 2
      if (user.Quyen === 'QuanLy' && khus.length === 1) {
        setSelectedKhu(String(khus[0].MaKhu));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tải danh sách khách thuê!';
      showError(msg);
    } finally {
      setLoading(false);
    }
  }, [user.Quyen, showError]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const countByKhu = (maKhu: number) =>
    khachThueList.filter((kt) => Number(kt.MaKhu) === Number(maKhu)).length;

  const countChuaCoPhong = useMemo(
    () => khachThueList.filter((kt) => !kt.MaPhong).length,
    [khachThueList]
  );

  const filteredTenants = useMemo(() => {
    return khachThueList.filter((t) => {
      if (selectedKhu === 'CHUA_CO_PHONG') {
        if (t.MaPhong) return false;
      } else if (selectedKhu !== 'ALL') {
        if (Number(t.MaKhu) !== Number(selectedKhu)) return false;
      }

      if (trangThaiFilter === 'DangThue' && !t.MaPhong) return false;
      if (trangThaiFilter === 'ChuaCoPhong' && t.MaPhong) return false;

      if (keyword.trim() !== '') {
        const kw = keyword.trim().toLowerCase();
        const matchName = t.HoTen?.toLowerCase().includes(kw);
        const matchSDT = t.SDT?.toLowerCase().includes(kw);
        const matchCCCD = t.CCCD?.toLowerCase().includes(kw);
        const matchTK = t.TenTK?.toLowerCase().includes(kw);
        const matchRoom = t.TenPhong?.toLowerCase().includes(kw);
        if (!matchName && !matchSDT && !matchCCCD && !matchTK && !matchRoom) {
          return false;
        }
      }

      return true;
    });
  }, [khachThueList, selectedKhu, trangThaiFilter, keyword]);

  const activeKhuInfo = useMemo(() => {
    if (selectedKhu === 'ALL' || selectedKhu === 'CHUA_CO_PHONG') return null;
    return khuTroList.find((k) => Number(k.MaKhu) === Number(selectedKhu)) || null;
  }, [khuTroList, selectedKhu]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModalUser) return;
    if (newPassword.trim().length < 6) {
      showError('Mật khẩu mới phải có tối thiểu 6 ký tự!');
      return;
    }

    try {
      setSubmittingReset(true);
      await KhachThueService.resetPassword(resetModalUser.MaND, newPassword.trim());
      showSuccess(`Đã cấp lại mật khẩu cho "${resetModalUser.HoTen}" thành công!`);
      setResetModalUser(null);
      setNewPassword('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi cấp lại mật khẩu!';
      showError(msg);
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
                      <span className="font-medium text-slate-800 truncate max-w-[190px]">
                        {kt.Email || '—'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Địa chỉ:</span>
                      <span className="font-medium text-slate-800 truncate max-w-[190px]">
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
      {(user) => <KhachThueContent user={user} />}
    </ProtectedRoute>
  );
}