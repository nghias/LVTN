// client/src/app/chuTro/khachThue/them/page.tsx
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import QuanLyHeader from '@/components/layout/QuanLyHeader';
import { useAlertModal } from '@/components/common/AlertModalProvider';
import { khachThueService } from '@/services/khachThue.service';
import { UserProfile } from '@/types/auth.type';

function ThemKhachThueContent({ user }: { user: UserProfile }) {
  const router = useRouter();
  const { showSuccess, showError } = useAlertModal();
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    TenTK: '',
    MatKhau: '12345678',
    HoTen: '',
    GioiTinh: 'Nam',
    NamSinh: '',
    CCCD: '',
    NgayCap: '',
    NoiCap: 'Cục Cảnh sát QLHC về TTXH',
    SDT: '',
    Email: '',
    DiaChi: '',
    NgheNghiep: 'Sinh viên',
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !formData.HoTen.trim() ||
      !formData.SDT.trim() ||
      !formData.TenTK.trim() ||
      !formData.MatKhau.trim()
    ) {
      showError(
        'Vui lòng nhập đầy đủ Họ tên, Số điện thoại, Tên tài khoản và Mật khẩu!'
      );
      return;
    }

    try {
      setSubmitting(true);
      await khachThueService.create({
        TenTK: formData.TenTK.trim(),
        MatKhau: formData.MatKhau,
        HoTen: formData.HoTen.trim(),
        GioiTinh: formData.GioiTinh,
        NamSinh: formData.NamSinh ? Number(formData.NamSinh) : null,
        CCCD: formData.CCCD.trim() || undefined,
        NgayCap: formData.NgayCap || null,
        NoiCap: formData.NoiCap.trim() || 'Cục Cảnh sát QLHC về TTXH',
        SDT: formData.SDT.trim(),
        Email: formData.Email.trim() || undefined,
        DiaChi: formData.DiaChi.trim() || undefined,
        NgheNghiep: formData.NgheNghiep.trim() || undefined,
      });

      showSuccess('Tạo tài khoản và hồ sơ khách thuê thành công!', 'Thành công', 2, () => {
        router.push('/chuTro/khachThue');
      });
    } catch (err: any) {
      showError(
        err?.response?.data?.message || 'Lỗi khi tạo tài khoản khách thuê!'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <QuanLyHeader user={user} />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">
              Tạo Tài Khoản & Hồ Sơ Khách Thuê Mới
            </h1>
            <p className="text-xs font-semibold text-slate-500 mt-1">
              Hệ thống tự động lưu tài khoản vào bảng NguoiDung và hồ sơ định danh vào bảng ThongTinCaNhan
            </p>
          </div>

          <Link
            href="/chuTro/khachThue"
            className="px-4 py-2 rounded-full text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 no-underline"
          >
            ← Quay lại danh sách
          </Link>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6"
        >
          {/* Phần 1: Bảng NguoiDung */}
          <div>
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-teal-700 mb-4 pb-2 border-b border-slate-100">
              1. Thông tin Tài khoản đăng nhập (Bảng NguoiDung)
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Tên tài khoản (Email hoặc Username) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="TenTK"
                  value={formData.TenTK}
                  onChange={handleChange}
                  required
                  placeholder="VD: minhkhoi.nguyen02@gmail.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Mật khẩu khởi tạo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="MatKhau"
                  value={formData.MatKhau}
                  onChange={handleChange}
                  required
                  minLength={6}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>
          </div>

          {/* Phần 2: Bảng ThongTinCaNhan */}
          <div>
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-teal-700 mb-4 pb-2 border-b border-slate-100">
              2. Hồ sơ Thông tin cá nhân (Bảng ThongTinCaNhan)
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
              <div className="sm:col-span-6">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Họ và tên khách thuê <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="HoTen"
                  value={formData.HoTen}
                  onChange={handleChange}
                  required
                  placeholder="Nguyễn Văn A"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold focus:outline-none focus:border-teal-500"
                />
              </div>

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

              <div className="sm:col-span-3">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Năm sinh
                </label>
                <input
                  type="number"
                  name="NamSinh"
                  value={formData.NamSinh}
                  onChange={handleChange}
                  placeholder="VD: 2004"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="sm:col-span-4">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Số CCCD (12 số)
                </label>
                <input
                  type="text"
                  name="CCCD"
                  value={formData.CCCD}
                  onChange={handleChange}
                  placeholder="07920400xxxx"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold focus:outline-none focus:border-teal-500"
                />
              </div>

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

              <div className="sm:col-span-4">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Nơi cấp CCCD
                </label>
                <input
                  type="text"
                  name="NoiCap"
                  value={formData.NoiCap}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold focus:outline-none focus:border-teal-500"
                />
              </div>

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
                  placeholder="0912xxxxxx"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="sm:col-span-4">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Email liên hệ
                </label>
                <input
                  type="email"
                  name="Email"
                  value={formData.Email}
                  onChange={handleChange}
                  placeholder="email@gmail.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="sm:col-span-4">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Nghề nghiệp
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

              <div className="sm:col-span-12">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Địa chỉ thường trú / Quê quán
                </label>
                <input
                  type="text"
                  name="DiaChi"
                  value={formData.DiaChi}
                  onChange={handleChange}
                  placeholder="Tỉnh/Thành phố, Quận/Huyện..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <Link
              href="/chuTro/khachThue"
              className="px-5 py-2.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 no-underline"
            >
              Hủy
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-full bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 text-xs font-extrabold border border-teal-300 shadow-xs cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Đang tạo...' : 'Tạo khách thuê'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

export default function ThemKhachThuePage() {
  return (
    <ProtectedRoute allowedRoles={['ChuTro', 'QuanLy']}>
      {(user) => <ThemKhachThueContent user={user} />}
    </ProtectedRoute>
  );
}