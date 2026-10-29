// client/src/app/chuTro/khachThue/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import QuanLyHeader from '@/components/layout/QuanLyHeader';
import { useAlertModal } from '@/components/common/AlertModalProvider';
import { khachThueService, KhachThueItem } from '@/services/khachThue.service';
import axiosInstance from 'axios';
import { UserProfile } from '@/types/auth.type';

interface KhuTroTab {
  MaKhu: number;
  TenKhu: string;
}

function QuanLyKhachThueContent({ user }: { user: UserProfile }) {
  const { showSuccess, showError, showConfirm } = useAlertModal();

  const [khuTroList, setKhuTroList] = useState<KhuTroTab[]>([]);
  const [selectedKhu, setSelectedKhu] = useState<string>('ALL');
  const [keyword, setKeyword] = useState<string>('');
  const [tenants, setTenants] = useState<KhachThueItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // State cho hộp nhập cấp lại mật khẩu nhanh
  const [resetModalUser, setResetModalUser] = useState<KhachThueItem | null>(null);
  const [newPassword, setNewPassword] = useState<string>('');
  const [resetting, setResetting] = useState<boolean>(false);

  const fetchKhuTro = useCallback(async () => {
    try {
      const res = await axiosInstance.get('/phong-tro/khu-tro');
      const list: KhuTroTab[] = res.data?.data || [];
      setKhuTroList(list);
      if (user.Quyen === 'QuanLy' && list.length === 1) {
        setSelectedKhu(String(list[0].MaKhu));
      }
    } catch {
      // Bỏ qua nếu lỗi nhẹ
    }
  }, [user.Quyen]);

  const fetchTenants = useCallback(async () => {
    try {
      setLoading(true);
      const params: { maKhu?: string; keyword?: string } = {};
      if (selectedKhu !== 'ALL') {
        params.maKhu = selectedKhu;
      }
      if (keyword.trim() !== '') {
        params.keyword = keyword.trim();
      }
      const data = await khachThueService.getList(params);
      setTenants(data || []);
    } catch (err: any) {
      showError(
        err?.response?.data?.message || 'Không thể tải danh sách khách thuê!'
      );
    } finally {
      setLoading(false);
    }
  }, [selectedKhu, keyword, showError]);

  useEffect(() => {
    fetchKhuTro();
  }, [fetchKhuTro]);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  const handleDelete = (item: KhachThueItem) => {
    showConfirm(
      `Bạn có chắc chắn muốn xóa tài khoản và hồ sơ của khách thuê "${item.HoTen}" (@${item.TenTK}) không?`,
      'Xác nhận xóa khách thuê',
      async () => {
        try {
          await khachThueService.delete(item.MaND);
          showSuccess('Đã xóa khách thuê thành công!');
          fetchTenants();
        } catch (err: any) {
          showError(
            err?.response?.data?.message || 'Không thể xóa khách thuê này!'
          );
        }
      },
      'Xóa tài khoản',
      'Hủy'
    );
  };

  const handleConfirmResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModalUser) return;
    if (newPassword.trim().length < 6) {
      showError('Mật khẩu mới phải có tối thiểu 6 ký tự!');
      return;
    }

    try {
      setResetting(true);
      await khachThueService.resetPassword(resetModalUser.MaND, newPassword.trim());
      showSuccess(`Đã cấp lại mật khẩu mới cho ${resetModalUser.HoTen}!`);
      setResetModalUser(null);
      setNewPassword('');
    } catch (err: any) {
      showError(
        err?.response?.data?.message || 'Lỗi khi cấp lại mật khẩu!'
      );
    } finally {
      setResetting(false);
    }
  };

  const formatDateVN = (dateStr?: string | null) => {
    if (!dateStr) return 'Chưa cập nhật';
    const d = dateStr.slice(0, 10).split('-');
    if (d.length !== 3) return dateStr;
    return `${d[2]}/${d[1]}/${d[0]}`;
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <QuanLyHeader user={user} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Tiêu đề & Nút Tạo tài khoản khách thuê */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">
              Quản Lý Hồ Sơ & Tài Khoản Khách Thuê
            </h1>
            <p className="text-xs font-semibold text-slate-500 mt-1">
              Quản lý tài khoản đăng nhập (NguoiDung) và hồ sơ định danh cá nhân (ThongTinCaNhan)
            </p>
          </div>

          <Link
            href="/chuTro/khachThue/them"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 text-xs font-extrabold border border-teal-300 shadow-xs no-underline transition shrink-0"
          >
            + Tạo tài khoản khách thuê
          </Link>
        </div>

        {/* Thanh Tab chọn Cơ sở (Khu trọ) */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedKhu('ALL')}
            className={`px-4 py-2 rounded-full text-xs font-extrabold transition cursor-pointer ${
              selectedKhu === 'ALL'
                ? 'bg-[#00FFCC] text-slate-900 border border-teal-400 shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            {user.Quyen === 'ChuTro' ? 'Tất cả cơ sở' : 'Tất cả trong quyền'}
          </button>

          {khuTroList.map((khu) => (
            <button
              key={khu.MaKhu}
              type="button"
              onClick={() => setSelectedKhu(String(khu.MaKhu))}
              className={`px-4 py-2 rounded-full text-xs font-extrabold transition cursor-pointer ${
                selectedKhu === String(khu.MaKhu)
                  ? 'bg-[#00FFCC] text-slate-900 border border-teal-400 shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {khu.TenKhu}
            </button>
          ))}

          <button
            type="button"
            onClick={() => setSelectedKhu('chua-co-phong')}
            className={`px-4 py-2 rounded-full text-xs font-extrabold transition cursor-pointer ${
              selectedKhu === 'chua-co-phong'
                ? 'bg-amber-300 text-slate-900 border border-amber-400 shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            Chưa xếp phòng
          </button>
        </div>

        {/* Thanh tìm kiếm */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-xs">
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Tìm theo Họ tên, SĐT, CCCD, Nghề nghiệp, Tên tài khoản hoặc Phòng..."
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-none focus:border-teal-500"
          />
          <div className="text-xs font-bold text-slate-500 shrink-0 px-2">
            Tổng số: <span className="text-slate-900 font-extrabold">{tenants.length}</span> khách thuê
          </div>
        </div>

        {/* Danh sách khách thuê */}
        {loading ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center text-sm font-bold text-slate-500">
            Đang tải danh sách hồ sơ khách thuê...
          </div>
        ) : tenants.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center text-sm font-bold text-slate-500">
            Không tìm thấy khách thuê nào phù hợp với bộ lọc hiện tại.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tenants.map((item) => (
              <div
                key={item.MaND}
                className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex flex-col justify-between gap-4 hover:border-teal-400 transition"
              >
                <div className="space-y-3">
                  {/* Đầu thẻ: Họ tên, Giới tính, Phòng đang thuê */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-extrabold text-slate-900">
                          {item.HoTen}
                        </h3>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                            item.GioiTinh === 'Nữ'
                              ? 'bg-pink-50 text-pink-700 border border-pink-200'
                              : 'bg-sky-50 text-sky-700 border border-sky-200'
                          }`}
                        >
                          {item.GioiTinh || 'Nam'}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-500 mt-0.5">
                        TK: <span className="text-slate-700">{item.TenTK}</span>
                      </p>
                    </div>

                    {item.MaPhong ? (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                        {item.TenPhong}
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                        Chưa có phòng
                      </span>
                    )}
                  </div>

                  {/* Chi tiết Hồ sơ ThongTinCaNhan */}
                  <div className="text-xs space-y-1.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500 font-semibold">SĐT:</span>
                      <span className="font-extrabold text-slate-800">{item.SDT}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500 font-semibold">Năm sinh / Nghề:</span>
                      <span className="font-bold text-slate-800">
                        {item.NamSinh || '---'} • {item.NgheNghiep || 'Chưa rõ'}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500 font-semibold">CCCD:</span>
                      <span className="font-bold text-slate-800">
                        {item.CCCD || 'Chưa cập nhật'}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500 font-semibold">Cấp ngày:</span>
                      <span className="font-semibold text-slate-700 text-right">
                        {formatDateVN(item.NgayCap)} ({item.NoiCap || 'Cục CS QLHC'})
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500 font-semibold">Quê quán:</span>
                      <span className="font-semibold text-slate-700 text-right truncate max-w-[180px]">
                        {item.DiaChi || 'Chưa cập nhật'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Các nút thao tác */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  <Link
                    href={`/chuTro/khachThue/sua/${item.MaND}`}
                    className="flex-1 text-center py-2 rounded-xl text-xs font-extrabold bg-[#00FFCC]/30 hover:bg-[#00FFCC] text-slate-900 no-underline transition"
                  >
                    Sửa hồ sơ
                  </Link>

                  <button
                    type="button"
                    onClick={() => {
                      setResetModalUser(item);
                      setNewPassword('');
                    }}
                    className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                  >
                    Đổi MK
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(item)}
                    className="px-3 py-2 rounded-xl text-xs font-bold bg-red-50 hover:bg-red-100 text-red-600 transition cursor-pointer"
                  >
                    Xóa
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Hộp nhập mật khẩu mới khi bấm "Đổi MK" */}
      {resetModalUser && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleConfirmResetPassword}
            className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-xl border border-slate-200"
          >
            <h3 className="text-base font-extrabold text-slate-900">
              Cấp lại mật khẩu cho {resetModalUser.HoTen}
            </h3>
            <p className="text-xs font-semibold text-slate-500">
              Tài khoản: <span className="text-slate-800">{resetModalUser.TenTK}</span>
            </p>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Mật khẩu mới (tối thiểu 6 ký tự)
              </label>
              <input
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nhập mật khẩu mới..."
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold focus:outline-none focus:border-teal-500"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setResetModalUser(null)}
                className="px-4 py-2 rounded-full text-xs font-bold bg-slate-100 text-slate-700 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={resetting}
                className="px-5 py-2 rounded-full text-xs font-extrabold bg-[#00FFCC] text-slate-900 border border-teal-300 cursor-pointer"
              >
                {resetting ? 'Đang lưu...' : 'Lưu mật khẩu mới'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default function QuanLyKhachThuePage() {
  return (
    <ProtectedRoute allowedRoles={['ChuTro', 'QuanLy']}>
      {(user) => <QuanLyKhachThueContent user={user} />}
    </ProtectedRoute>
  );
}