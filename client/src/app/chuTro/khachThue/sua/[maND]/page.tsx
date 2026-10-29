// client/src/app/chuTro/khachThue/sua/[maND]/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import QuanLyHeader from '@/components/layout/QuanLyHeader';
import { useAlertModal } from '@/components/common/AlertModalProvider';
import { khachThueService } from '@/services/khachThue.service';
import { UserProfile } from '@/types/auth.type';

function SuaKhachThueContent({ user }: { user: UserProfile }) {
  const params = useParams();
  const router = useRouter();
  const maND = Number(params?.maND);
  const { showSuccess, showError } = useAlertModal();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    TenTK: '',
    HoTen: '',
    GioiTinh: 'Nam',
    NamSinh: '',
    CCCD: '',
    NgayCap: '',
    NoiCap: 'Cục Cảnh sát QLHC về TTXH',
    SDT: '',
    Email: '',
    DiaChi: '',
    NgheNghiep: '',
  });

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        setLoading(true);
        const data = await khachThueService.getDetail(maND);
        setFormData({
          TenTK: data.TenTK || '',
          HoTen: data.HoTen || '',
          GioiTinh: data.GioiTinh || 'Nam',
          NamSinh: data.NamSinh ? String(data.NamSinh) : '',
          CCCD: data.CCCD || '',
          NgayCap: data.NgayCap ? String(data.NgayCap).slice(0, 10) : '',
          NoiCap: data.NoiCap || 'Cục Cảnh sát QLHC về TTXH',
          SDT: data.SDT || '',
          Email: data.Email || '',
          DiaChi: data.DiaChi || '',
          NgheNghiep: data.NgheNghiep || '',
        });
      } catch (err: any) {
        showError(
          err?.response?.data?.message || 'Không tìm thấy thông tin khách thuê!',
          'Lỗi truy cập',
          2
        );
      } finally {
        setLoading(false);
      }
    };

    if (maND) fetchDetail();
  }, [maND, router, showError]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.HoTen.trim() || !formData.SDT.trim() || !formData.TenTK.trim()) {
      showError('Họ tên, Số điện thoại và Tên tài khoản không được để trống!');
      return;
    }

    try {
      setSubmitting(true);
      await khachThueService.update(maND, {
        TenTK: formData.TenTK.trim(),
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

      showSuccess('Cập nhật hồ sơ khách thuê thành công!', 'Thành công', 2, () => {
        router.push('/chuTro/khachThue');
      });
    } catch (err: any) {
      showError(
        err?.response?.data?.message || 'Lỗi khi cập nhật thông tin khách thuê!'
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
              Chỉnh Sửa Hồ Sơ Khách Thuê #{maND}
            </h1>
            <p className="text-xs font-semibold text-slate-500 mt-1">
              Cập nhật đồng bộ thông tin tài khoản (NguoiDung) và định danh cá nhân (ThongTinCaNhan)
            </p>
          </div>

          <Link
            href="/chuTro/khachThue"
            className="px-4 py-2 rounded-full text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 no-underline"
          >
            ← Quay lại danh sách
          </Link>
        </div>

        {loading ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center text-sm font-bold text-slate-500">
            Đang tải hồ sơ khách thuê...
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6"
          >
            {/* Phần 1: Bảng NguoiDung */}
            <div>
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-teal-700 mb-4 pb-2 border-b border-slate-100">
                1. Tài khoản đăng nhập (Bảng NguoiDung)
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Tên tài khoản (TenTK) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="TenTK"
                    value={formData.TenTK}
                    onChange={handleChange}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>
            </div>

            {/* Phần 2: Bảng ThongTinCaNhan */}
            <div>
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-teal-700 mb-4 pb-2 border-b border-slate-100">
                2. Hồ sơ cá nhân (Bảng ThongTinCaNhan)
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                <div className="sm:col-span-6">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Họ và tên <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="HoTen"
                    value={formData.HoTen}
                    onChange={handleChange}
                    required
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
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div className="sm:col-span-4">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Số CCCD
                  </label>
                  <input
                    type="text"
                    name="CCCD"
                    value={formData.CCCD}
                    onChange={handleChange}
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
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div className="sm:col-span-4">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    name="Email"
                    value={formData.Email}
                    onChange={handleChange}
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
                {submitting ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}

export default function SuaKhachThuePage() {
  return (
    <ProtectedRoute allowedRoles={['ChuTro', 'QuanLy']}>
      {(user) => <SuaKhachThueContent user={user} />}
    </ProtectedRoute>
  );
}