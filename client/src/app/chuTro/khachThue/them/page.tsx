'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import QuanLyHeader from '@/components/layout/QuanLyHeader';
import { KhachThueService } from '@/services/khachThue.service';
import { useAlertModal } from '@/components/common/AlertModalProvider';

export default function ThemKhachThuePage() {
  const router = useRouter();
  const { showSuccess, showError } = useAlertModal();

  const [formData, setFormData] = useState({
    HoTen: '',
    CCCD: '',
    NamSinh: '',
    SDT: '',
    Email: '',
    DiaChi: '',
    TenTK: '',
    MatKhau: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await KhachThueService.create(formData);
      showSuccess('Tạo tài khoản khách thuê mới thành công!', 'Thành công', 1.5, () => {
        router.push('/chuTro/khachThue');
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi tạo tài khoản khách thuê!';
      showError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['ChuTro', 'QuanLy']}>
      {(user) => (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
          <QuanLyHeader user={user} />

          <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-8">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Tạo Tài Khoản Khách Thuê</h1>
                <p className="text-sm text-slate-500 mt-1">
                  Nhập thông tin cá nhân và tài khoản đăng nhập cho khách thuê mới
                </p>
              </div>
              <Link
                href="/chuTro/khachThue"
                className="px-4 py-2 rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 no-underline"
              >
                ← Quay lại
              </Link>
            </div>

            <form
              onSubmit={handleSubmit}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Họ và tên khách thuê *
                  </label>
                  <input
                    type="text"
                    name="HoTen"
                    required
                    value={formData.HoTen}
                    onChange={handleChange}
                    placeholder="VD: Nguyễn Minh Khôi"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Số CCCD (12 số) *
                  </label>
                  <input
                    type="text"
                    name="CCCD"
                    required
                    value={formData.CCCD}
                    onChange={handleChange}
                    placeholder="VD: 079202000005"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Năm sinh *
                  </label>
                  <input
                    type="number"
                    name="NamSinh"
                    required
                    min={1940}
                    max={2026}
                    value={formData.NamSinh}
                    onChange={handleChange}
                    placeholder="VD: 2002"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Số điện thoại *
                  </label>
                  <input
                    type="text"
                    name="SDT"
                    required
                    value={formData.SDT}
                    onChange={handleChange}
                    placeholder="VD: 0912000005"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    name="Email"
                    required
                    value={formData.Email}
                    onChange={handleChange}
                    placeholder="VD: minhkhoi.nguyen02@gmail.com"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Địa chỉ thường trú *
                  </label>
                  <input
                    type="text"
                    name="DiaChi"
                    required
                    value={formData.DiaChi}
                    onChange={handleChange}
                    placeholder="VD: Tiền Giang"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mật khẩu khởi tạo *
                  </label>
                  <input
                    type="text"
                    name="MatKhau"
                    required
                    minLength={6}
                    value={formData.MatKhau}
                    onChange={handleChange}
                    placeholder="Nhập mật khẩu (ít nhất 6 ký tự)"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Link
                  href="/chuTro/khachThue"
                  className="px-5 py-2.5 rounded-full border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 no-underline"
                >
                  Hủy
                </Link>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-full bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 font-bold text-xs shadow-xs transition cursor-pointer"
                >
                  {submitting ? 'Đang tạo...' : 'Tạo Tài Khoản'}
                </button>
              </div>
            </form>
          </main>
        </div>
      )}
    </ProtectedRoute>
  );
}