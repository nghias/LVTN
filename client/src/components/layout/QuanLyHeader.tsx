'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AuthService } from '../../services/auth.service';
import { UserProfile } from '../../types/auth.type';
import { useAlertModal } from '../../components/common/AlertModalProvider';

interface QuanLyHeaderProps {
  user: UserProfile;
}

export default function QuanLyHeader({ user }: QuanLyHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { showConfirm, showSuccess, showError } = useAlertModal();

  const navItems = [
    { label: 'Thống kê', href: '/chuTro/thongKe' },
    { label: 'Cơ sở & Phòng', href: '/chuTro/phongTro' },
    { label: 'Khách thuê', href: '/chuTro/khachThue' },
    { label: 'Hợp đồng', href: '/chuTro/hopDong' },
    { label: 'Điện nước & IoT', href: '/chuTro/dienNuoc' },
    { label: 'Hóa đơn', href: '/chuTro/hoaDon' },
    { label: 'Thông báo', href: '/chuTro/thongBao' },
  ];

  const handleLogoutClick = () => {
    showConfirm(
      'Bạn có chắc chắn muốn đăng xuất khỏi phiên quản trị hiện tại không?',
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        <Link
          href="/chuTro/thongKe"
          className="flex items-center gap-3 no-underline text-slate-900 shrink-0"
        >
          <div className="w-9 h-9 rounded-xl bg-[#00FFCC] text-slate-900 flex items-center justify-center font-extrabold text-sm border border-teal-300">
            XT
          </div>
          <div>
            <span className="font-bold text-base tracking-tight text-slate-900 block leading-none">
              Xóm Trọ Admin
            </span>
            <span className="text-[11px] text-slate-500">
              Hệ thống Quản lý & IoT
            </span>
          </div>
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3.5 py-2 rounded-full text-xs font-bold transition no-underline ${
                  isActive
                    ? 'bg-[#00FFCC] text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-[#00FFCC]/20'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-slate-900 leading-tight">
              {user.HoTen}
            </p>
            <span className="inline-block mt-0.5 px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-[#00FFCC]/30 text-slate-900">
              {user.Quyen === 'ChuTro' ? 'Chủ trọ' : 'Quản lý cơ sở'}
            </span>
          </div>

          <button
            type="button"
            onClick={handleLogoutClick}
            className="px-4 py-2 text-xs font-bold text-slate-900 bg-[#00FFCC] hover:bg-[#00e6b8] rounded-full transition cursor-pointer"
          >
            Đăng xuất
          </button>
        </div>
      </div>
    </header>
  );
}