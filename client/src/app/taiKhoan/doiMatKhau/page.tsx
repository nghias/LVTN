'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import QuanLyHeader from '@/components/layout/QuanLyHeader';
import NguoiThueHeader from '@/components/layout/NguoiThueHeader';
import { useAlertModal } from '@/components/common/AlertModalProvider';

export default function DoiMatKhauPage() {
  const router = useRouter();
  const { showSuccess, showError } = useAlertModal();

  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!oldPass || !newPass || !confirmPass) {
      showError('Vui lòng nhập đầy đủ mật khẩu hiện tại và mật khẩu mới!');
      return;
    }
    if (newPass.length < 6) {
      showError('Mật khẩu mới phải có độ dài tối thiểu 6 ký tự!');
      return;
    }
    if (newPass !== confirmPass) {
      showError('Mật khẩu xác nhận không khớp với mật khẩu mới!');
      return;
    }

    setOldPass('');
    setNewPass('');
    setConfirmPass('');
    showSuccess('Đổi mật khẩu tài khoản thành công!', 'Thành công', 2);
  };

  return (
    <ProtectedRoute allowedRoles={['ChuTro', 'QuanLy', 'KhachThue']}>
      {(user) => (
        <div className="flex-1 flex flex-col bg-white text-slate-900">
          {user.Quyen === 'KhachThue' ? (
            <NguoiThueHeader user={user} />
          ) : (
            <QuanLyHeader user={user} />
          )}

          <main className="flex-1 max-w-xl w-full mx-auto px-4 py-6 sm:py-10">
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
                  className="px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap bg-slate-100 text-slate-600 hover:bg-slate-200 no-underline"
                >
                  Thông tin cá nhân
                </Link>
                <Link
                  href="/taiKhoan/doiMatKhau"
                  className="px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap bg-[#00FFCC] text-slate-900 border border-teal-300 no-underline"
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
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                  Đổi Mật Khẩu
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Cập nhật mật khẩu định kỳ để bảo vệ tài khoản @{user.TenTK}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Mật khẩu hiện tại *
                </label>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={oldPass}
                  onChange={(e) => setOldPass(e.target.value)}
                  placeholder="Nhập mật khẩu đang sử dụng..."
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Mật khẩu mới *
                </label>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)..."
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Xác nhận mật khẩu mới *
                </label>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={confirmPass}
                  onChange={(e) => setConfirmPass(e.target.value)}
                  placeholder="Nhập lại mật khẩu mới..."
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
                />
              </div>

              <label className="inline-flex items-center gap-2 text-xs sm:text-sm text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showPass}
                  onChange={(e) => setShowPass(e.target.checked)}
                  className="w-4 h-4 accent-teal-600 rounded cursor-pointer"
                />
                <span>Hiện mật khẩu</span>
              </label>

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
                  className="w-full sm:w-auto px-8 py-3 rounded-full bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 text-xs font-bold shadow-xs cursor-pointer"
                >
                  Cập Nhật Mật Khẩu
                </button>
              </div>
            </form>
          </main>
        </div>
      )}
    </ProtectedRoute>
  );
}