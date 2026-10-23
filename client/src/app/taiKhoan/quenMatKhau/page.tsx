'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import QuanLyHeader from '@/components/layout/QuanLyHeader';
import NguoiThueHeader from '@/components/layout/NguoiThueHeader';
import { useAlertModal } from '@/components/common/AlertModalProvider';
import { AuthService } from '@/services/auth.service';
import { UserProfile } from '@/types/auth.type';
import { clearRememberedCredentials } from '@/utils/rememberMe.util';

const STRONG_PASSWORD_REGEX =
  /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]).{8,}$/;

function EyeIcon({ visible }: { visible: boolean }) {
  if (visible) {
    return (
      <svg width="20" height="20" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    );
  }
  return (
    <svg width="20" height="20" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  );
}

export default function QuenMatKhauPage() {
  const router = useRouter();
  const { showSuccess, showError } = useAlertModal();

  // Lưu thông tin user nếu đang đăng nhập (null nếu đi từ trang Login)
  const [user, setUser] = useState<UserProfile | null>(null);

  // 3 bước: 1 = Nhập Email, 2 = Nhập mã OTP, 3 = Đặt mật khẩu mới
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');

  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Kiểm tra nhẹ xem người dùng có đang đăng nhập không (không bắt buộc, lỗi thì bỏ qua)
  useEffect(() => {
    if (typeof document !== 'undefined' && document.cookie.includes('accessToken')) {
      AuthService.getMe()
        .then((res) => {
          if (res?.data?.user) {
            setUser(res.data.user);
          }
        })
        .catch(() => {
          setUser(null);
        });
    }
  }, []);

  // Kiểm tra điều kiện mật khẩu mới theo thời gian thực
  const hasMinLength = /^.{8,}$/.test(newPass);
  const hasUppercase = /[A-Z]/.test(newPass);
  const hasNumber = /\d/.test(newPass);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(newPass);
  const isConfirmMatched = confirmPass.length > 0 && newPass === confirmPass;

  const passwordRules = [
    { id: 'length', label: 'Ít nhất 8 ký tự', passed: hasMinLength },
    { id: 'uppercase', label: 'Ít nhất 1 chữ cái in hoa (A-Z)', passed: hasUppercase },
    { id: 'number', label: 'Ít nhất 1 chữ số (0-9)', passed: hasNumber },
    { id: 'special', label: 'Ít nhất 1 ký tự đặc biệt (!@#$%^&*...)', passed: hasSpecialChar },
  ];

  const passedCount = passwordRules.filter((r) => r.passed).length;
  const isAllValid = STRONG_PASSWORD_REGEX.test(newPass) && isConfirmMatched;

  // Xử lý Bước 1: Gửi mã OTP về Email
  const handleSendOtp = async (e: FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      showError('Vui lòng nhập địa chỉ Email đã đăng ký!');
      return;
    }

    try {
      setSubmitting(true);
      await AuthService.sendForgotPasswordOtp(cleanEmail);
      showSuccess(
        `Đã gửi mã xác thực 6 số tới hộp thư "${cleanEmail}". Vui lòng kiểm tra Email!`,
        'Đã gửi mã OTP',
        2
      );
      setStep(2);
    } catch (err: unknown) {
      showError(
        err instanceof Error ? err.message : 'Không thể gửi mã xác thực lúc này!',
        'Gửi mã thất bại',
        3
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Xử lý Bước 2: Xác thực mã OTP
  const handleVerifyOtp = async (e: FormEvent) => {
    e.preventDefault();
    const cleanOtp = otp.trim();
    if (cleanOtp.length !== 6) {
      showError('Vui lòng nhập đủ 6 chữ số của mã xác thực!');
      return;
    }

    try {
      setSubmitting(true);
      await AuthService.verifyForgotPasswordOtp(email.trim(), cleanOtp);
      showSuccess('Mã xác thực chính xác! Hãy thiết lập mật khẩu mới.', 'Xác thực thành công', 1.5);
      setStep(3);
    } catch (err: unknown) {
      showError(
        err instanceof Error ? err.message : 'Mã xác thực không chính xác!',
        'Xác thực thất bại',
        3
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Xử lý Bước 3: Lưu mật khẩu mới
  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!STRONG_PASSWORD_REGEX.test(newPass)) {
      showError('Mật khẩu mới chưa đáp ứng đủ 4 tiêu chí bảo mật!');
      return;
    }
    if (newPass !== confirmPass) {
      showError('Mật khẩu xác nhận không khớp!');
      return;
    }

    try {
      setSubmitting(true);
      await AuthService.resetPasswordWithOtp({
        email: email.trim(),
        otp: otp.trim(),
        matKhauMoi: newPass,
      });

      clearRememberedCredentials();
      setOtp('');
      setNewPass('');
      setConfirmPass('');
      setStep(1);

      showSuccess(
        'Đã cập nhật mật khẩu mới thành công!',
        'Hoàn tất',
        2,
        () => {
          // Nếu chưa đăng nhập thì chuyển thẳng về trang đăng nhập sau khi đổi xong
          if (!user) {
            router.replace('/auth');
          }
        }
      );
    } catch (err: unknown) {
      showError(
        err instanceof Error ? err.message : 'Không thể đặt lại mật khẩu mới!',
        'Cập nhật thất bại',
        3
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-white text-slate-900">
      {/* Chỉ hiển thị Header nội bộ nếu người dùng đã đăng nhập */}
      {user && (
        user.Quyen === 'KhachThue' ? (
          <NguoiThueHeader user={user} />
        ) : (
          <QuanLyHeader user={user} />
        )
      )}

      <main className="flex-1 max-w-xl w-full mx-auto px-4 py-6 sm:py-10">
        <div className="mb-6 space-y-3">
          <button
            type="button"
            onClick={() => (user ? router.back() : router.push('/auth'))}
            className="text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            ← {user ? 'Quay lại trang trước' : 'Quay lại Đăng nhập'}
          </button>

          {/* Chỉ hiển thị thanh Tab tài khoản nếu đã đăng nhập */}
          {user && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <Link
                href="/taiKhoan/thongTin"
                className="px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap bg-slate-100 text-slate-600 hover:bg-slate-200 no-underline"
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
                className="px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap bg-[#00FFCC] text-slate-900 border border-teal-300 no-underline"
              >
                Quên mật khẩu
              </Link>
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-8 shadow-sm space-y-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              Khôi Phục Mật Khẩu Qua Email
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Nhận mã xác thực OTP qua Email thật để đặt lại mật khẩu mới
            </p>
          </div>

          {/* Thanh tiến trình 3 bước */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs font-bold">
            <div
              className={`py-2 px-2 rounded-xl border ${
                step >= 1
                  ? 'bg-[#00FFCC]/30 border-teal-400 text-slate-900'
                  : 'bg-slate-50 border-slate-200 text-slate-400'
              }`}
            >
              1. Nhập Email
            </div>
            <div
              className={`py-2 px-2 rounded-xl border ${
                step >= 2
                  ? 'bg-[#00FFCC]/30 border-teal-400 text-slate-900'
                  : 'bg-slate-50 border-slate-200 text-slate-400'
              }`}
            >
              2. Nhập Mã OTP
            </div>
            <div
              className={`py-2 px-2 rounded-xl border ${
                step === 3
                  ? 'bg-[#00FFCC]/30 border-teal-400 text-slate-900'
                  : 'bg-slate-50 border-slate-200 text-slate-400'
              }`}
            >
              3. Mật Khẩu Mới
            </div>
          </div>

          {/* BƯỚC 1: NHẬP EMAIL THẬT ĐỂ LẤY MÃ */}
          {step === 1 && (
            <form onSubmit={handleSendOtp} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Địa chỉ Email đã đăng ký *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={submitting}
                  placeholder="Nhập địa chỉ Email của bạn (VD: tenban@gmail.com)..."
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => (user ? router.back() : router.push('/auth'))}
                  disabled={submitting}
                  className="w-full sm:w-auto px-6 py-3 rounded-full border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-auto px-8 py-3 rounded-full bg-[#00FFCC] hover:bg-[#00e6b8] disabled:opacity-50 text-slate-900 text-xs font-bold shadow-xs cursor-pointer"
                >
                  {submitting ? 'Đang gửi mã...' : 'Gửi Mã Xác Thực'}
                </button>
              </div>
            </form>
          )}

          {/* BƯỚC 2: NHẬP MÃ OTP 6 SỐ TỪ EMAIL */}
          {step === 2 && (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div className="p-3.5 rounded-2xl bg-teal-50 border border-teal-200 text-xs text-slate-700">
                Mã xác thực gồm 6 chữ số đã được gửi tới{' '}
                <strong className="text-slate-900">{email}</strong>. Mã có hiệu lực trong 5 phút.
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2 text-center sm:text-left">
                  Nhập mã xác thực (6 chữ số) *
                </label>
                <div className="flex items-center justify-between gap-2 sm:gap-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <input
                      key={index}
                      id={`otp-input-${index}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={otp[index] || ''}
                      disabled={submitting}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        if (!val) return;
                        const otpArray = otp.split('');
                        otpArray[index] = val[val.length - 1];
                        const newOtp = otpArray.join('').slice(0, 6);
                        setOtp(newOtp);

                        // Tự động nhảy sang ô kế tiếp
                        if (index < 5) {
                          document.getElementById(`otp-input-${index + 1}`)?.focus();
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Backspace') {
                          e.preventDefault();
                          const otpArray = otp.split('');
                          if (otpArray[index]) {
                            otpArray[index] = '';
                            setOtp(otpArray.join(''));
                          } else if (index > 0) {
                            otpArray[index - 1] = '';
                            setOtp(otpArray.join(''));
                            document.getElementById(`otp-input-${index - 1}`)?.focus();
                          }
                        }
                      }}
                      onPaste={(e) => {
                        e.preventDefault();
                        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
                        if (pasted) {
                          setOtp(pasted);
                          const focusIndex = Math.min(pasted.length, 5);
                          document.getElementById(`otp-input-${focusIndex}`)?.focus();
                        }
                      }}
                      className="w-full h-12 sm:h-14 border border-slate-300 rounded-xl text-center text-lg sm:text-xl font-bold text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-[#00FFCC] transition"
                    />
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  disabled={submitting}
                  className="w-full sm:w-auto px-5 py-3 rounded-full border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 cursor-pointer"
                >
                  ← Đổi Email / Gửi lại
                </button>
                <button
                  type="submit"
                  disabled={submitting || otp.length !== 6}
                  className="w-full sm:w-auto px-8 py-3 rounded-full bg-[#00FFCC] hover:bg-[#00e6b8] disabled:opacity-50 text-slate-900 text-xs font-bold shadow-xs cursor-pointer"
                >
                  {submitting ? 'Đang kiểm tra...' : 'Xác Nhận Mã'}
                </button>
              </div>
            </form>
          )}

          {/* BƯỚC 3: CẬP NHẬT MẬT KHẨU MỚI */}
          {step === 3 && (
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Mật khẩu mới *
                </label>
                <div className="relative">
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                    disabled={submitting}
                    placeholder="Nhập mật khẩu mới..."
                    className={`w-full pl-4 pr-11 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 transition [&::-ms-reveal]:hidden [&::-ms-clear]:hidden ${
                      newPass.length > 0 && STRONG_PASSWORD_REGEX.test(newPass)
                        ? 'border-emerald-500 bg-emerald-50/20 focus:ring-emerald-400'
                        : 'border-slate-300 focus:ring-[#00FFCC]'
                    }`}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    <EyeIcon visible={showNewPass} />
                  </button>
                </div>

                {/* Khung kiểm tra điều kiện xanh trực quan */}
                <div className="mt-3 p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">
                      Điều kiện độ mạnh mật khẩu:
                    </span>
                    <span
                      className={`text-xs font-bold ${
                        passedCount === passwordRules.length
                          ? 'text-emerald-600'
                          : 'text-slate-500'
                      }`}
                    >
                      Đạt {passedCount}/{passwordRules.length}
                    </span>
                  </div>

                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-300"
                      style={{
                        width: `${(passedCount / passwordRules.length) * 100}%`,
                      }}
                    />
                  </div>

                  <div className="space-y-1.5 pt-1">
                    {passwordRules.map((rule) => (
                      <div
                        key={rule.id}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border text-xs transition-all duration-200 ${
                          rule.passed
                            ? 'bg-emerald-50 border-emerald-400 text-emerald-800 font-bold'
                            : 'bg-white border-slate-200 text-slate-500 font-medium'
                        }`}
                      >
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                            rule.passed
                              ? 'bg-emerald-500 text-white'
                              : 'bg-slate-200 text-slate-400'
                          }`}
                        >
                          {rule.passed ? '✓' : '•'}
                        </span>
                        <span>{rule.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Xác nhận mật khẩu mới *
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPass ? 'text' : 'password'}
                    value={confirmPass}
                    onChange={(e) => setConfirmPass(e.target.value)}
                    disabled={submitting}
                    placeholder="Nhập lại mật khẩu mới..."
                    className={`w-full pl-4 pr-11 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 transition [&::-ms-reveal]:hidden [&::-ms-clear]:hidden ${
                      confirmPass.length === 0
                        ? 'border-slate-300 focus:ring-[#00FFCC]'
                        : isConfirmMatched
                        ? 'border-emerald-500 bg-emerald-50/20 focus:ring-emerald-400'
                        : 'border-red-400 bg-red-50/20 focus:ring-red-300'
                    }`}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    <EyeIcon visible={showConfirmPass} />
                  </button>
                </div>

                {confirmPass.length > 0 && (
                  <div
                    className={`mt-2 flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold ${
                      isConfirmMatched
                        ? 'bg-emerald-50 border-emerald-400 text-emerald-800'
                        : 'bg-red-50 border-red-300 text-red-600'
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] text-white shrink-0 ${
                        isConfirmMatched ? 'bg-emerald-500' : 'bg-red-500'
                      }`}
                    >
                      {isConfirmMatched ? '✓' : '✕'}
                    </span>
                    <span>
                      {isConfirmMatched
                        ? 'Mật khẩu xác nhận trùng khớp'
                        : 'Mật khẩu xác nhận chưa khớp'}
                    </span>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  disabled={submitting}
                  className="w-full sm:w-auto px-6 py-3 rounded-full border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting || !isAllValid}
                  className="w-full sm:w-auto px-8 py-3 rounded-full bg-[#00FFCC] hover:bg-[#00e6b8] disabled:opacity-50 text-slate-900 text-xs font-bold shadow-xs cursor-pointer"
                >
                  {submitting ? 'Đang lưu...' : 'Cập Nhật Mật Khẩu Mới'}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}