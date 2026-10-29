// client/src/app/chuTro/khachThue/them/page.tsx
'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import QuanLyHeader from '@/components/layout/QuanLyHeader';
import { useAlertModal } from '@/components/common/AlertModalProvider';
import { KhachThueService } from '@/services/khachThue.service';

export default function ThemKhachThuePage() {
  const router = useRouter();
  const { showSuccess, showError } = useAlertModal();

  const [hoTen, setHoTen] = useState('');
  const [gioiTinh, setGioiTinh] = useState('Nam');
  const [namSinh, setNamSinh] = useState('');
  const [sdt, setSdt] = useState('');
  const [cccd, setCccd] = useState('');
  const [ngayCap, setNgayCap] = useState('');
  const [noiCap, setNoiCap] = useState('Cục Cảnh sát QLHC về TTXH');
  const [email, setEmail] = useState('');
  const [ngheNghiep, setNgheNghiep] = useState('');
  const [diaChi, setDiaChi] = useState('');

  const [tenTK, setTenTK] = useState('');
  const [matKhau, setMatKhau] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!hoTen.trim()) {
      showError('Vui lòng nhập họ và tên khách thuê!');
      return;
    }
    if (!sdt.trim()) {
      showError('Vui lòng nhập số điện thoại liên hệ!');
      return;
    }
    if (!tenTK.trim()) {
      showError('Vui lòng nhập tên tài khoản đăng nhập!');
      return;
    }
    if (!matKhau || matKhau.trim().length < 6) {
      showError('Mật khẩu khởi tạo phải có ít nhất 6 ký tự!');
      return;
    }

    try {
      setSubmitting(true);
      await KhachThueService.create({
        HoTen: hoTen.trim(),
        GioiTinh: gioiTinh,
        NamSinh: namSinh ? Number(namSinh) : null,
        SDT: sdt.trim(),
        CCCD: cccd.trim() || undefined,
        NgayCap: ngayCap || null,
        NoiCap: noiCap.trim() || undefined,
        Email: email.trim() || undefined,
        NgheNghiep: ngheNghiep.trim() || undefined,
        DiaChi: diaChi.trim() || undefined,
        TenTK: tenTK.trim(),
        MatKhau: matKhau.trim(),
      });

      showSuccess('Tạo tài khoản và hồ sơ khách thuê thành công!');
      router.push('/chuTro/khachThue');
    } catch (err: any) {
      showError(err?.message || 'Tạo tài khoản khách thuê thất bại!');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['ChuTro', 'QuanLy']}>
      {(user) => (
        <div className="min-h-screen bg-slate-50/60 flex flex-col">
          <QuanLyHeader user={user} />

          <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  Tạo Tài Khoản & Hồ Sơ Khách Thuê
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Khởi tạo tài khoản đăng nhập (NguoiDung) và hồ sơ định danh cá nhân (ThongTinCaNhan)
                </p>
              </div>

              <Link
                href="/chuTro/khachThue"
                className="inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs sm:text-sm transition no-underline whitespace-nowrap"
              >
                ← Quay lại danh sách
              </Link>
            </div>

            <form
              onSubmit={handleSubmit}
              className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-5 sm:p-8 space-y-6"
            >
              {/* 1. Thông tin tài khoản đăng nhập */}
              <div className="space-y-4">
                <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-2.5">
                  1. Thông tin tài khoản đăng nhập (Bảng NguoiDung)
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Tên tài khoản (TenTK) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={tenTK}
                      onChange={(e) => setTenTK(e.target.value)}
                      placeholder="VD: khachthue_an hoặc SĐT/Email"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Mật khẩu khởi tạo <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={matKhau}
                      onChange={(e) => setMatKhau(e.target.value)}
                      placeholder="Ít nhất 6 ký tự"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Thông tin định danh cá nhân */}
              <div className="space-y-4">
                <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-2.5">
                  2. Hồ sơ định danh cá nhân (Bảng ThongTinCaNhan)
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="sm:col-span-2 lg:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Họ và tên đầy đủ <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={hoTen}
                      onChange={(e) => setHoTen(e.target.value)}
                      placeholder="VD: Nguyễn Văn An"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Giới tính
                    </label>
                    <select
                      value={gioiTinh}
                      onChange={(e) => setGioiTinh(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 bg-white focus:outline-none focus:border-teal-500"
                    >
                      <option value="Nam">Nam</option>
                      <option value="Nữ">Nữ</option>
                      <option value="Khác">Khác</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Năm sinh
                    </label>
                    <input
                      type="number"
                      value={namSinh}
                      onChange={(e) => setNamSinh(e.target.value)}
                      placeholder="VD: 2004"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Số điện thoại <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={sdt}
                      onChange={(e) => {
                        setSdt(e.target.value);
                        if (!tenTK) setTenTK(e.target.value);
                      }}
                      placeholder="VD: 0901234567"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Số CCCD / Định danh
                    </label>
                    <input
                      type="text"
                      value={cccd}
                      onChange={(e) => setCccd(e.target.value)}
                      placeholder="Nhập 12 chữ số CCCD"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Ngày cấp CCCD
                    </label>
                    <input
                      type="date"
                      value={ngayCap}
                      onChange={(e) => setNgayCap(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div className="sm:col-span-2 lg:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Nơi cấp CCCD
                    </label>
                    <input
                      type="text"
                      value={noiCap}
                      onChange={(e) => setNoiCap(e.target.value)}
                      placeholder="Cục Cảnh sát QLHC về TTXH"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div className="sm:col-span-2 lg:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Địa chỉ Email
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="example@gmail.com"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Nghề nghiệp
                    </label>
                    <input
                      type="text"
                      value={ngheNghiep}
                      onChange={(e) => setNgheNghiep(e.target.value)}
                      placeholder="VD: Sinh viên, Nhân viên..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div className="sm:col-span-2 lg:col-span-3">
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Địa chỉ thường trú / Quê quán
                    </label>
                    <input
                      type="text"
                      value={diaChi}
                      onChange={(e) => setDiaChi(e.target.value)}
                      placeholder="Nhập địa chỉ thường trú trên CCCD"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <Link
                  href="/chuTro/khachThue"
                  className="px-5 py-2.5 rounded-full border border-slate-300 text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-100 transition no-underline"
                >
                  Hủy
                </Link>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-7 py-2.5 rounded-full bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 font-bold text-xs sm:text-sm shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Đang tạo...' : '+ Tạo tài khoản khách thuê'}
                </button>
              </div>
            </form>
          </main>
        </div>
      )}
    </ProtectedRoute>
  );
}