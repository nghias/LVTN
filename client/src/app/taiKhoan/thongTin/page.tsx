// client/src/app/taiKhoan/thongTin/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import QuanLyHeader from '@/components/layout/QuanLyHeader';
import NguoiThueHeader from '@/components/layout/NguoiThueHeader';
import { useAlertModal } from '@/components/common/AlertModalProvider';
import axiosInstance from 'axios';
import { UserProfile } from '@/types/auth.type';

interface ExtendedProfileForm {
  TenTK: string;
  Quyen: string;
  HoTen: string;
  GioiTinh: string;
  NamSinh: string;
  CCCD: string;
  NgayCap: string;
  NoiCap: string;
  SDT: string;
  Email: string;
  DiaChi: string;
  NgheNghiep: string;
}

function ThongTinCaNhanContent({ user }: { user: UserProfile & Record<string, any> }) {
  const { showSuccess, showError } = useAlertModal();
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState<ExtendedProfileForm>({
    TenTK: user.TenTK || '',
    Quyen: user.Quyen || 'KhachThue',
    HoTen: user.HoTen || '',
    GioiTinh: user.GioiTinh || 'Nam',
    NamSinh: user.NamSinh ? String(user.NamSinh) : '',
    CCCD: user.CCCD || '',
    NgayCap: user.NgayCap ? String(user.NgayCap).slice(0, 10) : '',
    NoiCap: user.NoiCap || 'Cục Cảnh sát QLHC về TTXH',
    SDT: user.SDT || '',
    Email: user.Email || '',
    DiaChi: user.DiaChi || '',
    NgheNghiep: user.NgheNghiep || '',
  });

  useEffect(() => {
    const fetchLatestProfile = async () => {
      try {
        const res = await axiosInstance.get('/auth/profile');
        const p = res.data?.data;
        if (p) {
          setFormData({
            TenTK: p.TenTK || user.TenTK || '',
            Quyen: p.Quyen || user.Quyen || 'KhachThue',
            HoTen: p.HoTen || '',
            GioiTinh: p.GioiTinh || 'Nam',
            NamSinh: p.NamSinh ? String(p.NamSinh) : '',
            CCCD: p.CCCD || '',
            NgayCap: p.NgayCap ? String(p.NgayCap).slice(0, 10) : '',
            NoiCap: p.NoiCap || 'Cục Cảnh sát QLHC về TTXH',
            SDT: p.SDT || '',
            Email: p.Email || '',
            DiaChi: p.DiaChi || '',
            NgheNghiep: p.NgheNghiep || '',
          });
        }
      } catch {
        // Nếu chưa mở endpoint /auth/profile thì vẫn dùng dữ liệu từ phiên đăng nhập hiện tại
      }
    };
    fetchLatestProfile();
  }, [user]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.HoTen.trim() || !formData.SDT.trim()) {
      showError('Vui lòng nhập đầy đủ Họ tên và Số điện thoại!');
      return;
    }

    try {
      setSaving(true);
      await axiosInstance.put('/auth/profile', {
        HoTen: formData.HoTen.trim(),
        GioiTinh: formData.GioiTinh,
        NamSinh: formData.NamSinh ? Number(formData.NamSinh) : null,
        CCCD: formData.CCCD.trim() || null,
        NgayCap: formData.NgayCap || null,
        NoiCap: formData.NoiCap.trim() || 'Cục Cảnh sát QLHC về TTXH',
        SDT: formData.SDT.trim(),
        Email: formData.Email.trim() || null,
        DiaChi: formData.DiaChi.trim() || null,
        NgheNghiep: formData.NgheNghiep.trim() || null,
      });

      showSuccess('Đã cập nhật hồ sơ thông tin cá nhân thành công!');
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        'Không thể cập nhật thông tin cá nhân lúc này!';
      showError(msg);
    } finally {
      setSaving(false);
    }
  };

  const getRoleBadge = (quyen: string) => {
    if (quyen === 'ChuTro') return 'Chủ hệ thống nhà trọ';
    if (quyen === 'QuanLy') return 'Quản lý cơ sở';
    return 'Khách thuê phòng';
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {user.Quyen === 'KhachThue' ? (
        <NguoiThueHeader user={user} />
      ) : (
        <QuanLyHeader user={user} />
      )}

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8">
        {/* Thanh chuyển nhanh giữa các trang Tài khoản */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">
              Hồ Sơ Thông Tin Cá Nhân
            </h1>
            <p className="text-xs font-medium text-slate-500 mt-1">
              Thông tin định danh dùng để liên hệ, lập hợp đồng thuê phòng và khai báo tạm trú
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/taiKhoan/doiMatKhau"
              className="px-4 py-2 rounded-full text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:border-[#00FFCC] no-underline transition"
            >
              Đổi mật khẩu
            </Link>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6"
        >
          {/* Khối 1: Thông tin tài khoản (Bảng NguoiDung - Chỉ đọc) */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">
                Tên tài khoản đăng nhập (TenTK)
              </label>
              <input
                type="text"
                value={formData.TenTK}
                disabled
                readOnly
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-200/70 text-slate-700 text-sm font-bold border border-slate-300 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">
                Phân quyền hệ thống (Quyen)
              </label>
              <div className="h-[42px] px-3.5 rounded-xl bg-[#00FFCC]/20 border border-teal-300 flex items-center">
                <span className="text-xs font-extrabold text-slate-900">
                  {getRoleBadge(formData.Quyen)}
                </span>
              </div>
            </div>
          </div>

          {/* Khối 2: Hồ sơ cá nhân (Bảng ThongTinCaNhan) */}
          <div>
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-700 mb-4 pb-2 border-b border-slate-100">
              Thông tin định danh & Liên hệ
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
              {/* Họ và tên */}
              <div className="sm:col-span-6">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Họ và tên đầy đủ <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="HoTen"
                  value={formData.HoTen}
                  onChange={handleChange}
                  required
                  placeholder="Nhập họ và tên..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold focus:outline-none focus:border-teal-500"
                />
              </div>

              {/* Giới tính */}
              <div className="sm:col-span-3">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Giới tính
                </label>
                <select
                  name="GioiTinh"
                  value={formData.GioiTinh}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold bg-white focus:outline-none focus:border-teal-500"
                >
                  <option value="Nam">Nam</option>
                  <option value="Nữ">Nữ</option>
                  <option value="Khác">Khác</option>
                </select>
              </div>

              {/* Năm sinh */}
              <div className="sm:col-span-3">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Năm sinh
                </label>
                <input
                  type="number"
                  name="NamSinh"
                  value={formData.NamSinh}
                  onChange={handleChange}
                  min={1940}
                  max={2026}
                  placeholder="VD: 2003"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold focus:outline-none focus:border-teal-500"
                />
              </div>

              {/* Số CCCD */}
              <div className="sm:col-span-4">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Số CCCD / Định danh
                </label>
                <input
                  type="text"
                  name="CCCD"
                  value={formData.CCCD}
                  onChange={handleChange}
                  maxLength={20}
                  placeholder="12 chữ số CCCD..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold focus:outline-none focus:border-teal-500"
                />
              </div>

              {/* Ngày cấp CCCD */}
              <div className="sm:col-span-4">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Ngày cấp CCCD
                </label>
                <input
                  type="date"
                  name="NgayCap"
                  value={formData.NgayCap}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold focus:outline-none focus:border-teal-500"
                />
              </div>

              {/* Nơi cấp CCCD */}
              <div className="sm:col-span-4">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Nơi cấp CCCD
                </label>
                <input
                  type="text"
                  name="NoiCap"
                  value={formData.NoiCap}
                  onChange={handleChange}
                  placeholder="Cục Cảnh sát QLHC về TTXH"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold focus:outline-none focus:border-teal-500"
                />
              </div>

              {/* Số điện thoại */}
              <div className="sm:col-span-4">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Số điện thoại <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="SDT"
                  value={formData.SDT}
                  onChange={handleChange}
                  required
                  placeholder="09xxxxxxxx"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold focus:outline-none focus:border-teal-500"
                />
              </div>

              {/* Email */}
              <div className="sm:col-span-4">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Địa chỉ Email
                </label>
                <input
                  type="email"
                  name="Email"
                  value={formData.Email}
                  onChange={handleChange}
                  placeholder="example@gmail.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold focus:outline-none focus:border-teal-500"
                />
              </div>

              {/* Nghề nghiệp */}
              <div className="sm:col-span-4">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Nghề nghiệp hiện tại
                </label>
                <input
                  type="text"
                  name="NgheNghiep"
                  value={formData.NgheNghiep}
                  onChange={handleChange}
                  placeholder="Sinh viên, Nhân viên văn phòng..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold focus:outline-none focus:border-teal-500"
                />
              </div>

              {/* Địa chỉ thường trú */}
              <div className="sm:col-span-12">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Địa chỉ thường trú / Quê quán
                </label>
                <input
                  type="text"
                  name="DiaChi"
                  value={formData.DiaChi}
                  onChange={handleChange}
                  placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-full bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 text-xs font-extrabold border border-teal-300 shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              {saving ? 'Đang lưu hồ sơ...' : 'Lưu thông tin cá nhân'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

export default function ThongTinCaNhanPage() {
  return (
    <ProtectedRoute allowedRoles={['ChuTro', 'QuanLy', 'KhachThue']}>
      {(user) => <ThongTinCaNhanContent user={user} />}
    </ProtectedRoute>
  );
}