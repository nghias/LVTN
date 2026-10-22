'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AppFooter() {
  const pathname = usePathname();

  // Ẩn hoàn toàn Footer khi ở giao diện quản lý của Chủ trọ, Quản lý và Người thuê
  if (
    pathname.startsWith('/chuTro') ||
    pathname.startsWith('/nguoiThue') ||
    pathname.startsWith('/taiKhoan')
  ) {
    return (
      <footer className="w-full bg-[#DDDDDD] text-slate-300 border-t border-[#00FFCC]/20 mt-auto">
        <div className="border-t border-white/10 bg-[#00FFCC]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-400">
            <p className="text-black text-[12px] text-bold font-semibold">© {new Date().getFullYear()} Xóm Trọ Gia Đình</p>
            <p className="hidden sm:block text-black text-[12px] text-bold font-semibold">Giải pháp cho hộ gia đình thông minh</p>
          </div>
        </div>
      </footer>
    );
  }
  return (
    <footer className="w-full bg-[#DDDDDD] text-slate-300 border-t border-[#00FFCC]/20 mt-auto">
      {/* Phần nội dung chính 5 cột giống ảnh mẫu */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 text-xs">
        
        {/* Cột 1: Hỗ trợ & Liên hệ trực tiếp */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-black font-semibold">
            <svg width="18" height="18" className="w-4 h-4 text-[#00FFCC]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="text-sm font-bold">Hỗ trợ khách hàng</span>
          </div>

          <div className="flex items-center gap-2.5 text-slate-200">
            <svg width="16" height="16" className="w-4 h-4 text-[#00FFCC] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <span className="font-semibold text-black">0903.112.233</span>
          </div>

          <div className="flex items-center gap-2.5 text-slate-300">
            <svg width="16" height="16" className="w-4 h-4 text-[#00FFCC] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span className="truncate text-black">hotro@xomtroiot.vn</span>
          </div>
        </div>

        {/* Cột 2: Giải pháp quản lý */}
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-teal-700 tracking-wide">Giải pháp</h4>
          <ul className="space-y-2 text-slate-400">
            <li><Link href="#" className="hover:text-white text-black transition no-underline">Quản lý đa cơ sở trọ</Link></li>
            <li><Link href="#" className="hover:text-white text-black transition no-underline">Đồng hồ điện nước IoT</Link></li>
            <li><Link href="#" className="hover:text-white text-black transition no-underline">Cổng thanh toán VietQR</Link></li>
            <li><Link href="#" className="hover:text-white text-black transition no-underline">Kiểm soát thẻ từ RFID</Link></li>
            <li><Link href="#" className="hover:text-white text-black transition no-underline">Hợp đồng & Tạm trú số</Link></li>
          </ul>
        </div>

        {/* Cột 4: Tài nguyên & Hướng dẫn */}
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-teal-700 tracking-wide">Tài nguyên</h4>
          <ul className="space-y-2 text-slate-400">
            <li><Link href="#" className="hover:text-white text-black transition no-underline">Hướng dẫn phần cứng IoT</Link></li>
            <li><Link href="#" className="hover:text-white text-black transition no-underline">Cẩm nang cư dân</Link></li>
            <li><Link href="#" className="hover:text-white text-black transition no-underline">Chính sách bảo mật</Link></li>
            <li><Link href="#" className="hover:text-white text-black transition no-underline">Điều khoản dịch vụ</Link></li>
          </ul>
        </div>

        {/* Cột 5: Mạng xã hội & Biểu tượng */}
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-teal-700 tracking-wide">Kết nối</h4>
          <div className="flex items-center gap-3 text-slate-300 pt-1">
            <Link href="#" className="w-8 h-8 rounded-lg bg-white/5 hover:bg-[#00FFCC] hover:text-slate-950 flex items-center justify-center transition border border-black">
              <span className="font-bold text-black">f</span>
            </Link>
            <Link href="#" className="w-8 h-8 rounded-lg bg-white/5 hover:bg-[#00FFCC] hover:text-slate-950 flex items-center justify-center transition border border-black">
              <span className="font-bold text-black">in</span>
            </Link>
            <Link href="#" className="w-8 h-8 rounded-lg bg-white/5 hover:bg-[#00FFCC] hover:text-slate-950 flex items-center justify-center transition border border-black">
              <span className="font-bold text-black">yt</span>
            </Link>
          </div>
        </div>

      </div>

      {/* Phần chân dưới cùng của Footer */}
      <div className="border-t border-white/10 bg-[#00FFCC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-400">
          <p className="text-black text-[12px] text-bold font-semibold">© {new Date().getFullYear()} Xóm Trọ Gia Đình</p>
          <p className="text-black text-[12px] text-bold font-semibold">Giải pháp cho hộ gia đình thông minh</p>
        </div>
      </div>
    </footer>
  );
}

{/** Ảnh 1 là giao diện đăng nhập bạn hãy thay icon ngôi nhà thành logo ở cây thư mục ảnh 3 và làm thêm chức năng ghi nhớ mật khẩu, chỉ ghi nhớ trong 30 ngày và đảm bảo bảo mật. ảnh 2 là thành header bạn cũng thay chữ XT thành logo của ứng dụng, đồng thời xóa nút đăng nhập đó và làm 1 listdown xổ xuống khi hover vào tên người dùng và vai trò ở bên phải, bên trong thanh xổ xuống đó có các tín năng của quản lý tài khoản người dùng như Thông tin cá nhân, quên mật khẩu, đổi mật khẩu, đăng xuất. Bên cạnh tên sẽ có 1 icon thông báo để làm chức năng thông báo */}