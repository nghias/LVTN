'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AuthService } from '@/services/auth.service';
import { UserProfile } from '@/types/auth.type';
import { useAlertModal } from '@/components/common/AlertModalProvider';
import UserHeaderActions from './UserHeaderActions';

interface QuanLyHeaderProps {
  user: UserProfile;
}

export default function QuanLyHeader({ user }: QuanLyHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { showConfirm, showSuccess, showError } = useAlertModal();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const roleLabel = user.Quyen === 'ChuTro' ? 'Chủ trọ' : 'Quản lý cơ sở';

  const primaryNavItems = [
    { label: 'Thống kê', href: '/chuTro/thongKe' },
    { label: 'Cơ sở & Phòng', href: '/chuTro/phongTro' },
    { label: 'Đăng Tin', href: '/chuTro/tinDang' },
    { label: 'Khách thuê', href: '/chuTro/khachThue' },
    { label: 'Hợp đồng', href: '/chuTro/hopDong' },
  ];

  const moreNavItems = [
    { label: 'Điện nước & IoT', href: '/chuTro/dienNuoc' },
    { label: 'Hóa đơn', href: '/chuTro/hoaDon' },
    { label: 'Thông báo', href: '/chuTro/thongBao' },
  ];

  const allNavItems = [...primaryNavItems, ...moreNavItems];
  const activeMoreItem = moreNavItems.find((item) =>
    pathname.startsWith(item.href)
  );

  const handleMobileLogout = () => {
    setMobileMenuOpen(false);
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
    <header className="w-full bg-white text-slate-900 border-b-2 border-[#00FFCC] shadow-xs sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        <Link
          href="/chuTro/thongKe"
          className="flex items-center gap-2.5 no-underline text-slate-900 shrink-0 whitespace-nowrap"
        >
          <div className="w-10 h-10 rounded-xl bg-[#00FFCC]/20 border border-[#00FFCC] p-1 flex items-center justify-center overflow-hidden shrink-0">
            <img
              src="/img/logo.png"
              alt="Logo Xóm Trọ"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <span className="font-bold text-base tracking-tight text-slate-900 block leading-none whitespace-nowrap">
              Xóm Trọ
            </span>
            <span className="text-[11px] text-slate-500 whitespace-nowrap">
              Hệ thống Quản lý & IoT
            </span>
          </div>
        </Link>

        {/* Menu điều hướng trên Máy tính */}
        <nav className="hidden lg:flex items-center gap-1.5 shrink-0">
          {primaryNavItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3.5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition no-underline ${
                  isActive
                    ? 'bg-[#00FFCC] text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-[#00FFCC]/20'
                }`}
              >
                {item.label}
              </Link>
            );
          })}

          {/* Dropdown "Khác" */}
          <div className="relative group">
            <button
              type="button"
              className={`px-3.5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 cursor-pointer ${
                activeMoreItem
                  ? 'bg-[#00FFCC] text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-[#00FFCC]/20'
              }`}
            >
              <span>{activeMoreItem ? activeMoreItem.label : 'Khác'}</span>
              <svg
                width="14"
                height="14"
                className="w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-200"
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
            </button>

            <div className="absolute left-0 top-full pt-2 w-48 invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-150 z-50">
              <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden py-1.5">
                {moreNavItems.map((item) => {
                  const isActive = pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`w-full px-4 py-2.5 text-left text-xs font-bold whitespace-nowrap flex items-center justify-between transition no-underline ${
                        isActive
                          ? 'bg-[#00FFCC]/40 text-slate-900'
                          : 'text-slate-700 hover:bg-[#00FFCC]/20 hover:text-slate-900'
                      }`}
                    >
                      <span>{item.label}</span>
                      {isActive && <span>•</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </nav>

        <UserHeaderActions
          user={user}
          roleLabel={roleLabel}
          mobileMenuOpen={mobileMenuOpen}
          onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
          onCloseMobileMenu={() => setMobileMenuOpen(false)}
        />
      </div>

      {/* Menu tổng hợp trên Điện thoại */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-t border-slate-200 px-4 pt-3 pb-5 shadow-xl space-y-4">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate">
                {user.HoTen}
              </p>
              <p className="text-[11px] text-slate-500 truncate">
                @{user.TenTK}
              </p>
            </div>
            <span className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-[#00FFCC] text-slate-900 shrink-0">
              {roleLabel}
            </span>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">
              Danh mục quản lý
            </p>
            <div className="grid grid-cols-2 gap-2">
              {allNavItems.map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition no-underline flex items-center justify-between ${
                      isActive
                        ? 'bg-[#00FFCC] text-slate-900 border border-teal-300 shadow-2xs'
                        : 'bg-slate-50 text-slate-700 hover:bg-[#00FFCC]/20 border border-slate-200/80'
                    }`}
                  >
                    <span>{item.label}</span>
                    {isActive && <span>•</span>}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">
              Tài khoản cá nhân
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/taiKhoan/thongTin"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-slate-50 text-slate-700 hover:bg-[#00FFCC]/20 border border-slate-200/80 no-underline"
              >
                Thông tin cá nhân
              </Link>
              <Link
                href="/taiKhoan/doiMatKhau"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-slate-50 text-slate-700 hover:bg-[#00FFCC]/20 border border-slate-200/80 no-underline"
              >
                Đổi mật khẩu
              </Link>
              <Link
                href="/taiKhoan/quenMatKhau"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-slate-50 text-slate-700 hover:bg-[#00FFCC]/20 border border-slate-200/80 no-underline"
              >
                Quên mật khẩu
              </Link>
              <button
                type="button"
                onClick={handleMobileLogout}
                className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 text-left cursor-pointer"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}