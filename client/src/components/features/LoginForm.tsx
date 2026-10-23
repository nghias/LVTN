'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthService } from '@/services/auth.service';
import { useAlertModal } from '@/components/common/AlertModalProvider';
import {
  saveRememberedCredentials,
  getRememberedCredentials,
  clearRememberedCredentials,
} from '@/utils/rememberMe.util';

export default function LoginForm() {
  const router = useRouter();
  const { showSuccess, showError } = useAlertModal();

  const [tenTK, setTenTK] = useState('');
  const [matKhau, setMatKhau] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [infoPanel, setInfoPanel] = useState<'support' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Tự động nạp thông tin đã mã hóa nếu còn trong hạn 30 ngày
  useEffect(() => {
    getRememberedCredentials().then((saved) => {
      if (saved) {
        setTenTK(saved.tenTK);
        setMatKhau(saved.matKhau);
        setRememberMe(true);
      }
    });
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setInfoPanel(null);

    const cleanTenTK = tenTK.trim();
    if (!cleanTenTK || !matKhau) {
      showError('Vui lòng nhập đầy đủ tài khoản và mật khẩu!');
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await AuthService.login({
        TenTK: cleanTenTK,
        MatKhau: matKhau,
      });

      const user = response.data?.user;
      if (!user) {
        showError('Không lấy được thông tin tài khoản!');
        return;
      }

      // Xử lý lưu hoặc xóa ghi nhớ mật khẩu 30 ngày (Mã hóa AES-GCM)
      if (rememberMe) {
        await saveRememberedCredentials(cleanTenTK, matKhau);
      } else {
        clearRememberedCredentials();
      }

      const targetUrl =
        user.Quyen === 'ChuTro' || user.Quyen === 'QuanLy'
          ? '/chuTro/thongKe'
          : '/nguoiThue/thongKe';

      showSuccess(
        `Xin chào ${user.HoTen}, đang chuyển vào hệ thống...`,
        'Đăng nhập thành công!',
        1.5,
        () => {
          router.replace(targetUrl);
        }
      );
    } catch (error: unknown) {
      if (error instanceof Error) {
        showError(error.message, 'Đăng nhập thất bại!', 2.5);
      } else {
        showError('Không thể kết nối đến máy chủ, vui lòng thử lại!');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-[960px]">
      <div className="w-full bg-white text-slate-900 rounded-[28px] p-6 sm:p-10 md:p-12 shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-slate-200 grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12">
        
        {/* CỘT TRÁI: Logo từ /img/logo.png + Tiêu đề lớn */}
        <div className="md:col-span-6 flex flex-col justify-between">
          <div>
            <div className="w-16 h-16 rounded-2xl bg-[#00FFCC]/20 border border-[#00FFCC] p-1.5 flex items-center justify-center mb-6 shadow-xs overflow-hidden">
              <img
                src="/img/logo.png"
                alt="Logo Xóm Trọ"
                className="w-full h-full object-contain"
              />
            </div>

            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900">
              Đăng nhập
            </h1>
            <p className="mt-3 text-base text-slate-600 leading-relaxed">
              Sử dụng Tài khoản{' '}
              <span className="px-2 py-0.5 rounded-md bg-[#00FFCC]/30 text-slate-900 font-bold">
                Xóm Trọ
              </span>{' '}
              của bạn để tiếp tục tới Hệ thống Quản lý Nhà trọ & IoT
            </p>
          </div>

          {/* Hộp thông tin Liên hệ hỗ trợ */}
          <div className="mt-6">
            {infoPanel === 'support' && (
              <div className="p-4 rounded-2xl bg-[#00FFCC]/15 border border-[#00FFCC] text-xs text-slate-700 leading-relaxed space-y-1">
                <div className="flex items-center justify-between font-bold text-slate-900 text-sm mb-1">
                  <span>Hỗ trợ trực tuyến</span>
                  <button
                    type="button"
                    onClick={() => setInfoPanel(null)}
                    className="text-slate-500 hover:text-slate-900 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
                <p>
                  <strong className="text-slate-900">Chủ trọ (Quỳnh Dư):</strong> 0903.112.233
                </p>
                <p>
                  <strong className="text-slate-900">Quản lý Cơ sở 1 (Tuấn Nghĩa):</strong> 0931.493.785
                </p>
                <p>
                  <strong className="text-slate-900">Quản lý Cơ sở 2 (Nhật Nguyên):</strong> 0383.193.961
                </p>
                <p>
                  <strong className="text-slate-900">Quản lý Cơ sở 3 (Hoàng Nam):</strong> 0908451236
                </p>
              </div>
            )}
          </div>
        </div>

        {/* CỘT PHẢI: Form nhập liệu */}
        <div className="md:col-span-6 flex flex-col justify-center">
          <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off">
            <div>
              <label
                htmlFor="tenTK"
                className="block text-xs font-bold text-slate-700 mb-1.5 ml-1"
              >
                Email, số điện thoại hoặc tên tài khoản
              </label>
              <input
                id="tenTK"
                type="text"
                value={tenTK}
                onChange={(e) => setTenTK(e.target.value)}
                placeholder="Nhập tài khoản của bạn"
                disabled={isSubmitting}
                className="w-full px-4 py-3.5 bg-white border border-slate-300 rounded-xl text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-[#00FFCC] transition"
              />
            </div>

            <div>
              <label
                htmlFor="matKhau"
                className="block text-xs font-bold text-slate-700 mb-1.5 ml-1"
              >
                Nhập mật khẩu của bạn
              </label>
              <input
                id="matKhau"
                type={showPassword ? 'text' : 'password'}
                value={matKhau}
                onChange={(e) => setMatKhau(e.target.value)}
                placeholder="Nhập mật khẩu"
                disabled={isSubmitting}
                className="w-full px-4 py-3.5 bg-white border border-slate-300 rounded-xl text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-[#00FFCC] transition"
              />

              {/* Hàng tùy chọn: Hiện mật khẩu + Ghi nhớ 30 ngày + Quên mật khẩu */}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-4">
                  <label className="inline-flex items-center gap-2 text-xs sm:text-sm text-slate-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={showPassword}
                      onChange={(e) => setShowPassword(e.target.checked)}
                      className="w-4 h-4 accent-teal-600 rounded cursor-pointer"
                    />
                    <span>Hiện mật khẩu</span>
                  </label>

                  <label className="inline-flex items-center gap-2 text-xs sm:text-sm text-slate-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 accent-teal-600 rounded cursor-pointer"
                    />
                    <span>Ghi nhớ mật khẩu</span>
                  </label>
                </div>

                <button
                  type="button"
                  onClick={() => router.push('/taiKhoan/quenMatKhau')}
                  className="text-xs sm:text-sm font-bold text-teal-700 hover:underline cursor-pointer"
                >
                  Bạn quên mật khẩu?
                </button>
              </div>
            </div>

            {/* Cụm nút dưới đáy */}
            <div className="pt-4 flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() =>
                  setInfoPanel(infoPanel === 'support' ? null : 'support')
                }
                className="px-4 py-2.5 rounded-full text-sm font-bold text-slate-700 hover:bg-[#00FFCC]/25 transition cursor-pointer"
              >
                Liên hệ hỗ trợ
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-7 py-2.5 rounded-full bg-[#00FFCC] hover:bg-[#00e6b8] disabled:opacity-50 text-slate-900 font-bold text-sm shadow-sm border border-teal-300 transition cursor-pointer"
              >
                {isSubmitting ? 'Đang xử lý...' : 'Đăng nhập'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Thanh chân Card */}
      <div className="mt-4 px-4 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
        <Link
          href="/"
          className="text-slate-600 hover:text-slate-900 font-semibold transition no-underline"
        >
          ← Quay về Trang chủ
        </Link>

        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={() => setInfoPanel('support')}
            className="hover:text-slate-900 transition cursor-pointer"
          >
            Trợ giúp
          </button>
          <span>Bảo mật</span>
          <span>Điều khoản</span>
        </div>
      </div>
    </div>
  );
}