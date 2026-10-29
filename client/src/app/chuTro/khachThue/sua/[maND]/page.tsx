// client/src/app/chuTro/khachThue/sua/[maND]/page.tsx
'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import QuanLyHeader from '@/components/layout/QuanLyHeader';
import { useAlertModal } from '@/components/common/AlertModalProvider';
import { KhachThueService } from '@/services/khachThue.service';

export default function SuaKhachThuePage() {
  const params = useParams();
  const router = useRouter();
  const maND = params?.maND as string;
  const { showSuccess, showError } = useAlertModal();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [tenTK, setTenTK] = useState('');
  const [hoTen, setHoTen] = useState('');
  const [gioiTinh, setGioiTinh] = useState('Nam');
  const [namSinh, setNamSinh] = useState('');
  const [sdt, setSdt] = useState('');
  const [cccd, setCccd] = useState('');
  const [ngayCap, setNgayCap] = useState('');
  const [noiCap, setNoiCap] = useState('');
  const [email, setEmail] = useState('');
  const [ngheNghiep, setNgheNghiep] = useState('');
  const [diaChi, setDiaChi] = useState('');

  useEffect(() => {
    if (!maND) return;
    const fetchDetail = async () => {
      try {
        setLoading(true);
        const data = await KhachThueService.getDetail(maND);
        setTenTK(data.TenTK || '');
        setHoTen(data.HoTen || '');
        setGioiTinh(data.GioiTinh || 'Nam');
        setNamSinh(data.NamSinh ? String(data.NamSinh) : '');
        setSdt(data.SDT || '');
        setCccd(data.CCCD || '');
        setNgayCap(data.NgayCap ? String(data.NgayCap).slice(0, 10) : '');
        setNoiCap(data.NoiCap || '');
        setEmail(data.Email || '');
        setNgheNghiep(data.NgheNghiep || '');
        setDiaChi(data.DiaChi || '');
      } catch (err: any) {
        showError(err?.message || 'Không thể tải thông tin khách thuê');
        router.push('/chuTro/khachThue');
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [maND]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!hoTen.trim()) {
      showError('Vui lòng nhập họ và tên khách thuê!');
      return;
    }
    if (!sdt.trim()) {
      showError('Vui lòng nhập số điện thoại!');
      return;
    }

    try {
      setSubmitting(true);
      await KhachThueService.update(maND, {
        TenTK: tenTK.trim(),
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
      });

      showSuccess('Cập nhật thông tin khách thuê thành công!');
      router.push('/chuTro/khachThue');
    } catch (err: any) {
      showError(err?.message || 'Cập nhật hồ sơ khách thuê thất bại!');
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
                  Chỉnh Sửa Hồ Sơ & Tài Khoản Khách Thuê
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Cập nhật thông tin định danh cá nhân và tài khoản khách thuê #{maND}
                </p>
              </div>

              <Link
                href="/chuTro/khachThue"
                className="inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs sm:text-sm transition no-underline whitespace-nowrap"
              >
                ← Quay lại danh sách
              </Link>
            </div>

            {loading ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center text-sm text-slate-500">
                Đang tải thông tin khách thuê...
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-5 sm:p-8 space-y-6"
              >
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Tên tài khoản đăng nhập (TenTK) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={tenTK}
                    onChange={(e) => setTenTK(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 font-bold text-sm focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div className="space-y-4">
                  <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-2.5">
                    Thông tin định danh & Liên hệ
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
                        onChange={(e) => setSdt(e.target.value)}
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
                    {submitting ? 'Đang lưu...' : 'Lưu cập nhật'}
                  </button>
                </div>
              </form>
            )}
          </main>
        </div>
      )}
    </ProtectedRoute>
  );
}