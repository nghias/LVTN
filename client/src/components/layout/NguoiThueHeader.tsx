'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AuthService } from '../../services/auth.service';
import { UserProfile } from '../../types/auth.type';
import { useAlertModal } from '../../components/common/AlertModalProvider';

interface NguoiThueHeaderProps {
  user: UserProfile;
}

export default function NguoiThueHeader({ user }: NguoiThueHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { showConfirm, showSuccess, showError } = useAlertModal();

  const navItems = [
    { label: 'Tổng quan', href: '/nguoiThue/thongKe' },
    { label: 'Hợp đồng & Tạm trú', href: '/nguoiThue/hopDong' },
    { label: 'Chỉ số Điện nước', href: '/nguoiThue/dienNuoc' },
    { label: 'Hóa đơn & Thanh toán', href: '/nguoiThue/hoaDon' },
    { label: 'Thông báo & Sự cố', href: '/nguoiThue/thongBao' },
  ];

  const handleLogoutClick = () => {
    showConfirm(
      'Bạn có chắc chắn muốn đăng xuất khỏi tài khoản người thuê không?',
      'Xác nhận đăng xuất',
      async () => {
        try {
          await AuthService.logout();
          showSuccess('Hẹn gặp lại bạn!', 'Đã đăng xuất', 1.5, () => {
            router.replace('/auth');
          });
        } catch {
          showError('Có lỗi xảy ra khi đăng xuất!');
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
          href="/nguoiThue/thongKe"
          className="flex items-center gap-3 no-underline text-slate-900 shrink-0"
        >
          <div className="w-9 h-9 rounded-xl bg-[#00FFCC] text-slate-900 flex items-center justify-center font-extrabold text-sm border border-teal-300">
            XT
          </div>
          <div>
            <span className="font-bold text-base text-slate-900 block leading-none">
              Cư Dân Xóm Trọ
            </span>
            <span className="text-[11px] text-slate-500">
              Cổng thông tin Người thuê
            </span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
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
              Khách thuê phòng
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