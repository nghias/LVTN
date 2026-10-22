'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthService } from '@/services/auth.service';
import { UserProfile } from '@/types/auth.type';
import { useAlertModal } from '@/components/common/AlertModalProvider';
import NotificationBell from './NotificationBell';

interface UserHeaderActionsProps {
  user: UserProfile;
  roleLabel: string;
  mobileMenuOpen: boolean;
  onToggleMobileMenu: () => void;
  onCloseMobileMenu: () => void;
}

export default function UserHeaderActions({
  user,
  roleLabel,
  mobileMenuOpen,
  onToggleMobileMenu,
  onCloseMobileMenu,
}: UserHeaderActionsProps) {
  const router = useRouter();
  const { showConfirm, showSuccess, showError } = useAlertModal();

  const handleLogoutClick = () => {
    showConfirm(
      'Bạn có chắc chắn muốn đăng xuất khỏi phiên làm việc hiện tại không?',
      'Xác nhận đăng xuất',
      async () => {
        try {
          await AuthService.logout();
          showSuccess('Đã đăng xuất khỏi hệ thống an toàn!', 'Thành công', 1.5, () => {
            router.replace('/auth');
          });
        } catch {
          showError('Không thể đăng xuất lúc này, vui lòng thử lại!');
        }
      },
      'Xác nhận',
      'Hủy'
    );
  };

  return (
    <div className="flex items-center gap-2.5 shrink-0">
      {/* 1. Nút Chuông thông báo độc lập */}
      <NotificationBell onOpen={onCloseMobileMenu} />

      {/* 2. Nút Gộp Menu + Tài khoản trên Điện thoại (< 1024px) */}
      <button
        type="button"
        onClick={onToggleMobileMenu}
        aria-label="Mở menu điều hướng và tài khoản"
        className="lg:hidden h-10 px-3 rounded-full bg-slate-100 hover:bg-[#00FFCC]/30 text-slate-900 border border-slate-200 flex items-center gap-1.5 transition cursor-pointer"
      >
        <svg
          width="18"
          height="18"
          className="w-4 h-4 text-teal-700"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>

        {mobileMenuOpen ? (
          <svg width="18" height="18" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg width="18" height="18" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      {/* 3. Menu Tài khoản trên Máy tính (Hover xổ xuống 4 mục riêng biệt) */}
      <div className="hidden lg:block relative group">
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-2xl hover:bg-slate-100 border border-transparent hover:border-slate-200 transition cursor-pointer select-none whitespace-nowrap">
          <div className="text-right">
            <p className="text-xs font-bold text-slate-900 leading-tight whitespace-nowrap">
              {user.HoTen}
            </p>
            <span className="inline-block mt-0.5 px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-[#00FFCC]/40 text-slate-900 whitespace-nowrap">
              {roleLabel}
            </span>
          </div>

          <svg
            width="16"
            height="16"
            className="w-4 h-4 text-slate-500 group-hover:rotate-180 transition-transform duration-200 shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>

        <div className="absolute right-0 top-full pt-2 w-52 invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-150 z-50">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden py-1.5">
            <Link
              href="/taiKhoan/thongTin"
              className="w-full px-4 py-2.5 text-left text-xs font-semibold text-slate-700 hover:bg-[#00FFCC]/25 hover:text-slate-900 flex items-center gap-2.5 transition no-underline whitespace-nowrap"
            >
              <svg width="16" height="16" className="w-4 h-4 text-teal-700 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>Thông tin cá nhân</span>
            </Link>

            <Link
              href="/taiKhoan/doiMatKhau"
              className="w-full px-4 py-2.5 text-left text-xs font-semibold text-slate-700 hover:bg-[#00FFCC]/25 hover:text-slate-900 flex items-center gap-2.5 transition no-underline whitespace-nowrap"
            >
              <svg width="16" height="16" className="w-4 h-4 text-teal-700 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>Đổi mật khẩu</span>
            </Link>

            <Link
              href="/taiKhoan/quenMatKhau"
              className="w-full px-4 py-2.5 text-left text-xs font-semibold text-slate-700 hover:bg-[#00FFCC]/25 hover:text-slate-900 flex items-center gap-2.5 transition no-underline whitespace-nowrap"
            >
              <svg width="16" height="16" className="w-4 h-4 text-teal-700 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Quên mật khẩu</span>
            </Link>

            <div className="my-1 border-t border-slate-100" />

            <button
              type="button"
              onClick={handleLogoutClick}
              className="w-full px-4 py-2.5 text-left text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-2.5 transition cursor-pointer whitespace-nowrap"
            >
              <svg width="16" height="16" className="w-4 h-4 text-red-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Đăng xuất</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}