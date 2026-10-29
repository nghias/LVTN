// client/src/app/taiKhoan/thongTin/page.tsx
'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import QuanLyHeader from '@/components/layout/QuanLyHeader';
import NguoiThueHeader from '@/components/layout/NguoiThueHeader';
import { useAlertModal } from '@/components/common/AlertModalProvider';
import { UserProfile } from '@/types/auth.type';

const getApiBaseUrl = () => {
  const raw = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
  const trimmed = raw.replace(/\/auth\/?$/, '').replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
};

function ThongTinCaNhanContent({ user }: { user: UserProfile }) {
  const router = useRouter();
  const { showSuccess, showError } = useAlertModal();

  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const [tenTK, setTenTK] = useState<string>(user.TenTK || '');
  const [quyen, setQuyen] = useState<string>(user.Quyen || '');
  const [hoTen, setHoTen] = useState<string>(user.HoTen || '');
  const [gioiTinh, setGioiTinh] = useState<string>('Nam');
  const [namSinh, setNamSinh] = useState<string>('');
  const [cccd, setCccd] = useState<string>('');
  const [ngayCap, setNgayCap] = useState<string>('');
  const [noiCap, setNoiCap] = useState<string>('');
  const [sdt, setSdt] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [ngheNghiep, setNgheNghiep] = useState<string>('');
  const [diaChi, setDiaChi] = useState<string>('');

  const getAuthHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (typeof window !== 'undefined') {
      const token =
        localStorage.getItem('token') ||
        localStorage.getItem('accessToken') ||
        sessionStorage.getItem('token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }
    return headers;
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${getApiBaseUrl()}/auth/profile`, {
          method: 'GET',
          headers: getAuthHeaders(),
          credentials: 'include',
        });

        if (res.ok) {
          const result = await res.json();
          const u = result.data?.user || result.data || result.user || result;
          setTenTK(u.TenTK || user.TenTK || '');
          setQuyen(u.Quyen || user.Quyen || '');
          setHoTen(u.HoTen || user.HoTen || '');
          setGioiTinh(u.GioiTinh || 'Nam');
          setNamSinh(u.NamSinh ? String(u.NamSinh) : '');
          setCccd(u.CCCD || '');
          if (u.NgayCap) {
            setNgayCap(String(u.NgayCap).slice(0, 10));
          }
          setNoiCap(u.NoiCap || '');
          setSdt(u.SDT || '');
          setEmail(u.Email || '');
          setNgheNghiep(u.NgheNghiep || '');
          setDiaChi(u.DiaChi || '');
        }
      } catch {
        // Giữ thông tin cơ bản từ phiên đăng nhập nếu chưa tải được chi tiết
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const formatRoleLabel = (role: string) => {
    if (role === 'ChuTro') return 'Chủ trọ';
    if (role === 'QuanLy') return 'Quản lý cơ sở';
    return 'Khách thuê';
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!hoTen.trim()) {
      showError('Vui lòng nhập họ và tên đầy đủ!');
      return;
    }
    if (!sdt.trim()) {
      showError('Vui lòng nhập số điện thoại liên hệ!');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        HoTen: hoTen.trim(),
        GioiTinh: gioiTinh,
        NamSinh: namSinh ? Number(namSinh) : null,
        CCCD: cccd.trim() || null,
        NgayCap: ngayCap || null,
        NoiCap: noiCap.trim() || null,
        SDT: sdt.trim(),
        Email: email.trim() || null,
        NgheNghiep: ngheNghiep.trim() || null,
        DiaChi: diaChi.trim() || null,
      };

      const res = await fetch(`${getApiBaseUrl()}/auth/profile`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showError(data.message || 'Cập nhật hồ sơ thông tin cá nhân không thành công!');
        return;
      }

      showSuccess('Cập nhật hồ sơ thông tin cá nhân thành công!');
    } catch {
      showError('Không thể cập nhật thông tin cá nhân lúc này.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header trang */}
        <button
          type="button"
          onClick={() => router.back()}
          className="text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
        >
          ← Quay lại trang trước
        </button>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Hồ Sơ Thông Tin Cá Nhân
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Thông tin định danh dùng để liên hệ, lập hợp đồng thuê phòng và khai báo tạm trú
          </p>
        </div>
      </div>

      {/* Khung biểu mẫu */}
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-5 sm:p-8 space-y-6"
      >
        {/* Khối thông tin tài khoản (Khóa chỉnh sửa) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">
              Tên tài khoản đăng nhập (TenTK)
            </label>
            <input
              type="text"
              value={tenTK}
              disabled
              readOnly
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-700 font-bold text-sm cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">
              Phân quyền hệ thống (Quyen)
            </label>
            <div className="h-[42px] flex items-center">
              <span className="inline-flex items-center px-4 py-2 rounded-full bg-[#00FFCC]/30 border border-teal-300 text-slate-900 font-bold text-xs">
                {formatRoleLabel(quyen)}
              </span>
            </div>
          </div>
        </div>

        {/* Khối thông tin định danh & liên hệ */}
        <div className="space-y-4">
          <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-2.5">
            Thông tin định danh & Liên hệ
          </h2>

          {loading ? (
            <div className="py-8 text-center text-sm text-slate-500">
              Đang tải thông tin cá nhân...
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Họ và tên */}
              <div className="sm:col-span-2 lg:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Họ và tên đầy đủ <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={hoTen}
                  onChange={(e) => setHoTen(e.target.value)}
                  placeholder="Nhập họ và tên đầy đủ"
                  className="w-full min-w-0 px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 bg-white focus:outline-none focus:border-teal-500"
                />
              </div>

              {/* Giới tính */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Giới tính
                </label>
                <select
                  value={gioiTinh}
                  onChange={(e) => setGioiTinh(e.target.value)}
                  className="w-full min-w-0 px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 bg-white focus:outline-none focus:border-teal-500"
                >
                  <option value="Nam">Nam</option>
                  <option value="Nữ">Nữ</option>
                  <option value="Khác">Khác</option>
                </select>
              </div>

              {/* Năm sinh */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Năm sinh
                </label>
                <input
                  type="number"
                  value={namSinh}
                  onChange={(e) => setNamSinh(e.target.value)}
                  placeholder="VD: 2004"
                  className="w-full min-w-0 px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 bg-white focus:outline-none focus:border-teal-500"
                />
              </div>

              {/* Số điện thoại */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Số điện thoại <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={sdt}
                  onChange={(e) => setSdt(e.target.value)}
                  placeholder="VD: 0931493785"
                  className="w-full min-w-0 px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 bg-white focus:outline-none focus:border-teal-500"
                />
              </div>

              {/* Số CCCD */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Số CCCD / Định danh
                </label>
                <input
                  type="text"
                  value={cccd}
                  onChange={(e) => setCccd(e.target.value)}
                  placeholder="Nhập 12 số CCCD"
                  className="w-full min-w-0 px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 bg-white focus:outline-none focus:border-teal-500"
                />
              </div>

              {/* Ngày cấp CCCD */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Ngày cấp CCCD
                </label>
                <input
                  type="date"
                  value={ngayCap}
                  onChange={(e) => setNgayCap(e.target.value)}
                  className="w-full min-w-0 px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 bg-white focus:outline-none focus:border-teal-500"
                />
              </div>

              {/* Nơi cấp CCCD */}
              <div className="sm:col-span-2 lg:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Nơi cấp CCCD
                </label>
                <input
                  type="text"
                  value={noiCap}
                  onChange={(e) => setNoiCap(e.target.value)}
                  placeholder="VD: Cục Cảnh sát QLHC về TTXH"
                  className="w-full min-w-0 px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 bg-white focus:outline-none focus:border-teal-500"
                />
              </div>

              {/* Địa chỉ Email */}
              <div className="sm:col-span-2 lg:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Địa chỉ Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@gmail.com"
                  className="w-full min-w-0 px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 bg-white focus:outline-none focus:border-teal-500"
                />
              </div>

              {/* Nghề nghiệp hiện tại */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Nghề nghiệp hiện tại
                </label>
                <input
                  type="text"
                  value={ngheNghiep}
                  onChange={(e) => setNgheNghiep(e.target.value)}
                  placeholder="VD: Sinh viên, Nhân viên..."
                  className="w-full min-w-0 px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 bg-white focus:outline-none focus:border-teal-500"
                />
              </div>

              {/* Địa chỉ thường trú / Quê quán */}
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Địa chỉ thường trú / Quê quán
                </label>
                <input
                  type="text"
                  value={diaChi}
                  onChange={(e) => setDiaChi(e.target.value)}
                  placeholder="Nhập địa chỉ thường trú đầy đủ trên CCCD"
                  className="w-full min-w-0 px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 bg-white focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Nút lưu */}
        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button
            type="submit"
            disabled={submitting || loading}
            className="px-7 py-3 rounded-full bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 font-bold text-xs sm:text-sm shadow-xs transition cursor-pointer disabled:opacity-50"
          >
            {submitting ? 'Đang lưu...' : 'Lưu thông tin cá nhân'}
          </button>
        </div>
      </form>
    </main>
  );
}

export default function ThongTinCaNhanPage() {
  return (
    <ProtectedRoute allowedRoles={['ChuTro', 'QuanLy', 'KhachThue']}>
      {(user) => (
        <div className="min-h-screen bg-slate-50/60 flex flex-col">
          {user.Quyen === 'KhachThue' ? (
            <NguoiThueHeader user={user} />
          ) : (
            <QuanLyHeader user={user} />
          )}
          <ThongTinCaNhanContent user={user} />
        </div>
      )}
    </ProtectedRoute>
  );
}