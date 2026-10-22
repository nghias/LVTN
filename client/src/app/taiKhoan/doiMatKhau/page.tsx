'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import QuanLyHeader from '@/components/layout/QuanLyHeader';
import NguoiThueHeader from '@/components/layout/NguoiThueHeader';
import { useAlertModal } from '@/components/common/AlertModalProvider';
import { AuthService } from '@/services/auth.service';
import { clearRememberedCredentials } from '@/utils/rememberMe.util';

export default function DoiMatKhauPage() {
  const router = useRouter();
  const { showSuccess, showError } = useAlertModal();

  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Kiểm tra từng tiêu chí bảo mật theo thời gian thực
  const hasMinLength = newPass.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPass);
  const hasNumber = /\d/.test(newPass);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(newPass);
  const isDifferentFromOld = Boolean(newPass && oldPass && newPass !== oldPass);

  const isPasswordValid =
    hasMinLength &&
    hasUppercase &&
    hasNumber &&
    hasSpecialChar &&
    isDifferentFromOld;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!oldPass || !newPass || !confirmPass) {
      showError('Vui lòng nhập đầy đủ mật khẩu hiện tại và mật khẩu mới!');
      return;
    }

    if (newPass === oldPass) {
      showError('Mật khẩu mới phải khác mật khẩu hiện tại!');
      return;
    }

    if (!hasMinLength || !hasUppercase || !hasNumber || !hasSpecialChar) {
      showError(
        'Mật khẩu mới phải có ít nhất 8 ký tự, bao gồm chữ in hoa, chữ số và ký tự đặc biệt!'
      );
      return;
    }

    if (newPass !== confirmPass) {
      showError('Mật khẩu xác nhận không khớp với mật khẩu mới!');
      return;
    }

    try {
      setSubmitting(true);
      await AuthService.changePassword({
        matKhauCu: oldPass,
        matKhauMoi: newPass,
      });

      // Xóa mật khẩu cũ đã ghi nhớ trên trình duyệt (nếu có) để đảm bảo an toàn
      clearRememberedCredentials();

      setOldPass('');
      setNewPass('');
      setConfirmPass('');
      showSuccess('Mật khẩu của bạn đã được mã hóa và cập nhật thành công!', 'Thành công', 2);
    } catch (err: unknown) {
      const safeMsg =
        err instanceof Error
          ? err.message
          : 'Không thể đổi mật khẩu lúc này, vui lòng thử lại sau!';
      showError(safeMsg, 'Đổi mật khẩu thất bại', 3);
    } finally {
      setSubmitting(false);
    }
  };

  const passwordRules = [
    { label: 'Ít nhất 8 ký tự', passed: hasMinLength },
    { label: 'Có ít nhất 1 chữ cái in hoa (A-Z)', passed: hasUppercase },
    { label: 'Có ít nhất 1 chữ số (0-9)', passed: hasNumber },
    { label: 'Có ít nhất 1 ký tự đặc biệt (!@#$%^&*...)', passed: hasSpecialChar },
    { label: 'Khác với mật khẩu hiện tại', passed: isDifferentFromOld },
  ];

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
                  disabled={submitting}
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
                  disabled={submitting}
                  placeholder="Nhập mật khẩu mới..."
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
                />

                {/* Bảng kiểm tra tiêu chí mật khẩu trực quan */}
                <div className="mt-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <p className="text-[11px] font-bold text-slate-700 mb-1">
                    Yêu cầu bảo mật mật khẩu mới:
                  </p>
                  {passwordRules.map((rule, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center gap-2 text-xs font-medium transition ${
                        rule.passed ? 'text-teal-700 font-semibold' : 'text-slate-500'
                      }`}
                    >
                      <span
                        className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                          rule.passed
                            ? 'bg-[#00FFCC] text-slate-900'
                            : 'bg-slate-200 text-slate-500'
                        }`}
                      >
                        {rule.passed ? '✓' : '•'}
                      </span>
                      <span>{rule.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Xác nhận mật khẩu mới *
                </label>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={confirmPass}
                  onChange={(e) => setConfirmPass(e.target.value)}
                  disabled={submitting}
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
                  disabled={submitting}
                  className="w-full sm:w-auto px-6 py-3 rounded-full border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting || !isPasswordValid}
                  className="w-full sm:w-auto px-8 py-3 rounded-full bg-[#00FFCC] hover:bg-[#00e6b8] disabled:opacity-50 text-slate-900 text-xs font-bold shadow-xs cursor-pointer transition"
                >
                  {submitting ? 'Đang mã hóa & lưu...' : 'Cập Nhật Mật Khẩu'}
                </button>
              </div>
            </form>
          </main>
        </div>
      )}
    </ProtectedRoute>
  );
}