'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import QuanLyHeader from '@/components/layout/QuanLyHeader';
import NguoiThueHeader from '@/components/layout/NguoiThueHeader';
import { useAlertModal } from '@/components/common/AlertModalProvider';
import { AuthService } from '@/services/auth.service';
import { UserProfile } from '@/types/auth.type';

function ThongTinCaNhanForm({ user }: { user: UserProfile }) {
  const router = useRouter();
  const { showSuccess, showError } = useAlertModal();

  // Không khởi tạo dữ liệu sẵn, để rỗng hoàn toàn chờ dữ liệu từ Server
  const [hoTen, setHoTen] = useState('');
  const [cccd, setCccd] = useState('');
  const [sdt, setSdt] = useState('');
  const [namSinh, setNamSinh] = useState('');
  const [email, setEmail] = useState('');
  const [diaChi, setDiaChi] = useState('');

  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      setLoadFailed(false);
      const res = await AuthService.getProfile();
      const profile = res.data?.user;

      if (!profile) {
        setLoadFailed(true);
        showError(
          'Không thể tải thông tin cá nhân lúc này. Vui lòng thử lại sau!',
          'Không lấy được dữ liệu',
          3
        );
        return;
      }

      setHoTen(profile.HoTen || '');
      setCccd(profile.CCCD || '');
      setSdt(profile.SDT || '');
      setNamSinh(profile.NamSinh ? String(profile.NamSinh) : '');
      setEmail(profile.Email || '');
      setDiaChi(profile.DiaChi || '');
    } catch {
      // Tuyệt đối không hiển thị mã lỗi hay nội dung lỗi từ hệ thống ra Modal
      setLoadFailed(true);
      showError(
        'Không thể tải thông tin cá nhân lúc này. Vui lòng thử lại sau!',
        'Không lấy được dữ liệu',
        3
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!hoTen.trim() || !sdt.trim()) {
      showError('Vui lòng nhập đầy đủ Họ tên và Số điện thoại!');
      return;
    }

    try {
      setSubmitting(true);
      await AuthService.updateProfile({
        HoTen: hoTen.trim(),
        CCCD: cccd.trim(),
        SDT: sdt.trim(),
        NamSinh: namSinh ? Number(namSinh) : null,
        Email: email.trim(),
        DiaChi: diaChi.trim(),
      });

      showSuccess('Đã cập nhật thông tin cá nhân thành công!', 'Thành công', 2);
    } catch {
      // Không hiển thị chi tiết lỗi hệ thống để đảm bảo an toàn bảo mật
      showError(
        'Cập nhật thông tin không thành công. Vui lòng kiểm tra lại dữ liệu và thử lại sau!',
        'Thao tác thất bại',
        3
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-6 sm:py-10">
      <div className="mb-6 space-y-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
        >
          ← Quay lại trang trước
        </button>

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <Link
            href="/taiKhoan/thongTin"
            className="px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap bg-[#00FFCC] text-slate-900 border border-teal-300 no-underline"
          >
            Thông tin cá nhân
          </Link>
          <Link
            href="/taiKhoan/doiMatKhau"
            className="px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap bg-slate-100 text-slate-600 hover:bg-slate-200 no-underline"
          >
            Đổi mật khẩu
          </Link>
          <Link
            href="/taiKhoan/quenMatKhau"
            className="px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap bg-slate-100 text-slate-600 hover:bg-slate-200 no-underline"
          >
            Quên mật khẩu
          </Link>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-8 shadow-sm space-y-5"
      >
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              Thông Tin Cá Nhân
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Xem và cập nhật hồ sơ định danh tài khoản của bạn
            </p>
          </div>

          {loadFailed && (
            <button
              type="button"
              onClick={fetchProfileData}
              className="px-3.5 py-2 rounded-full bg-slate-100 hover:bg-[#00FFCC]/30 text-xs font-bold text-slate-800 transition cursor-pointer shrink-0"
            >
              Tải lại dữ liệu
            </button>
          )}
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900 truncate">
              {hoTen || '---'}
            </p>
            <p className="text-xs text-slate-500 truncate">
              Tài khoản: @{user.TenTK}
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#00FFCC] text-slate-900 whitespace-nowrap shrink-0">
            {user.Quyen === 'ChuTro'
              ? 'Chủ trọ'
              : user.Quyen === 'QuanLy'
              ? 'Quản lý cơ sở'
              : 'Khách thuê phòng'}
          </span>
        </div>

        {loading ? (
          <div className="py-10 text-center text-xs font-semibold text-slate-500">
            Đang tải thông tin cá nhân...
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Họ và tên *
                </label>
                <input
                  type="text"
                  value={hoTen}
                  onChange={(e) => setHoTen(e.target.value)}
                  disabled={loadFailed || submitting}
                  placeholder="Nhập họ và tên..."
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm disabled:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Số CCCD / Định danh (12 số)
                </label>
                <input
                  type="text"
                  value={cccd}
                  onChange={(e) => setCccd(e.target.value)}
                  disabled={loadFailed || submitting}
                  placeholder="Nhập 12 chữ số CCCD..."
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm disabled:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Số điện thoại *
                </label>
                <input
                  type="text"
                  value={sdt}
                  onChange={(e) => setSdt(e.target.value)}
                  disabled={loadFailed || submitting}
                  placeholder="Nhập 10 chữ số SĐT..."
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm disabled:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Năm sinh
                </label>
                <input
                  type="number"
                  value={namSinh}
                  onChange={(e) => setNamSinh(e.target.value)}
                  disabled={loadFailed || submitting}
                  placeholder="VD: 2004"
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm disabled:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Email liên hệ
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loadFailed || submitting}
                placeholder="Nhập địa chỉ email..."
                className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm disabled:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Địa chỉ thường trú
              </label>
              <input
                type="text"
                value={diaChi}
                onChange={(e) => setDiaChi(e.target.value)}
                disabled={loadFailed || submitting}
                placeholder="Nhập địa chỉ thường trú..."
                className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm disabled:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
              />
            </div>

            <div className="pt-4 border-t border-slate-100 flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="w-full sm:w-auto px-6 py-3 rounded-full border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={loadFailed || submitting}
                className="w-full sm:w-auto px-8 py-3 rounded-full bg-[#00FFCC] hover:bg-[#00e6b8] disabled:opacity-50 text-slate-900 text-xs font-bold shadow-xs cursor-pointer"
              >
                {submitting ? 'Đang lưu...' : 'Lưu Cập Nhật'}
              </button>
            </div>
          </>
        )}
      </form>
    </main>
  );
}

export default function ThongTinCaNhanPage() {
  return (
    <ProtectedRoute allowedRoles={['ChuTro', 'QuanLy', 'KhachThue']}>
      {(user) => (
        <div className="flex-1 flex flex-col bg-white text-slate-900">
          {user.Quyen === 'KhachThue' ? (
            <NguoiThueHeader user={user} />
          ) : (
            <QuanLyHeader user={user} />
          )}
          <ThongTinCaNhanForm user={user} />
        </div>
      )}
    </ProtectedRoute>
  );
}