'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  MessageCircle,
  Phone,
  Mail,
  Layers,
  Building2,
  Zap,
  QrCode,
  KeyRound,
  FileText,
  BookOpen,
  Cpu,
  Users,
  ShieldCheck,
  ScrollText,
  Share2,
  Globe,
  Play,
  Sparkles,
} from 'lucide-react';

export default function AppFooter() {
  const pathname = usePathname();

  // Ẩn hoàn toàn Footer khi ở giao diện quản lý của Chủ trọ, Quản lý và Người thuê
  if (
    pathname.startsWith('/chuTro') ||
    pathname.startsWith('/nguoiThue') ||
    pathname.startsWith('/taiKhoan')
  ) {
    return (
      <footer className="w-full bg-[#DDDDDD] text-slate-700 border-t border-slate-300 mt-auto">
        <div className="border-t border-teal-400/40 bg-[#00FFCC]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 sm:py-4 flex flex-col sm:flex-row items-center justify-between gap-1.5 sm:gap-3 text-center sm:text-left text-xs">
            <p className="inline-flex items-center gap-1.5 text-slate-900 text-[12px] font-bold tracking-tight">
              <Building2 className="w-3.5 h-3.5 shrink-0" />
              <span>© {new Date().getFullYear()} Xóm Trọ Gia Đình</span>
            </p>
            <p className="hidden sm:inline-flex items-center gap-1.5 text-slate-900 text-[12px] font-semibold">
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>Giải pháp cho hộ gia đình thông minh</span>
            </p>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="w-full bg-[#DDDDDD] text-slate-700 border-t border-slate-300/80 mt-auto">
      {/* Phần nội dung chính */}
      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-7 sm:py-10 lg:py-12 grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-5 lg:gap-8 text-xs items-stretch">
        {/* Cột 1: Hỗ trợ & Liên hệ trực tiếp */}
        <div className="bg-[#DDDDDD] lg:bg-transparent p-3.5 sm:p-5 lg:p-0 flex flex-col justify-start space-y-3 sm:space-y-3.5 min-w-0">
          <div className="flex items-center gap-2 text-slate-900 font-bold pb-2.5 border-b border-slate-300/70">
            <span className="w-6 h-6 rounded-lg bg-[#00FFCC] flex items-center justify-center text-slate-900 shrink-0 shadow-2xs">
              <MessageCircle className="w-3.5 h-3.5" />
            </span>
            <span className="text-xs font-bold leading-snug truncate">
              Hỗ trợ khách hàng
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 pt-0.5">
            <span className="w-6 h-6 rounded-lg bg-[#00FFCC] flex items-center justify-center text-slate-900 shrink-0 shadow-2xs">
              <Phone className="w-3.5 h-3.5" />
            </span>
            <span className="font-bold text-slate-900 text-xs sm:text-[13px] truncate">
              0903.112.233
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <span className="w-6 h-6 rounded-lg bg-[#00FFCC] flex items-center justify-center text-slate-900 shrink-0 shadow-2xs">
              <Mail className="w-3.5 h-3.5" />
            </span>
            <span className="truncate text-slate-800 font-medium text-[11px] sm:text-xs">
              hotro@xomtroiot.vn
            </span>
          </div>
        </div>

        {/* Cột 2: Giải pháp */}
        <div className="bg-[#DDDDDD] lg:bg-transparent p-3.5 sm:p-5 lg:p-0 flex flex-col justify-start space-y-3 min-w-0">
          <h4 className="flex items-center gap-1.5 text-xs font-bold text-teal-800 tracking-wide pb-2.5 border-b border-slate-300/70">
            <Layers className="w-3.5 h-3.5 shrink-0" />
            <span>Giải pháp</span>
          </h4>
          <ul className="space-y-2 text-slate-700">
            <li>
              <Link
                href="#"
                className="inline-flex items-center gap-1.5 hover:text-teal-700 text-slate-800 font-medium transition no-underline leading-snug"
              >
                <Building2 className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                <span>Quản lý đa cơ sở trọ</span>
              </Link>
            </li>
            <li>
              <Link
                href="#"
                className="inline-flex items-center gap-1.5 hover:text-teal-700 text-slate-800 font-medium transition no-underline leading-snug"
              >
                <Zap className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                <span>Đồng hồ điện nước IoT</span>
              </Link>
            </li>
            <li>
              <Link
                href="#"
                className="inline-flex items-center gap-1.5 hover:text-teal-700 text-slate-800 font-medium transition no-underline leading-snug"
              >
                <QrCode className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                <span>Cổng thanh toán VietQR</span>
              </Link>
            </li>
            <li>
              <Link
                href="#"
                className="inline-flex items-center gap-1.5 hover:text-teal-700 text-slate-800 font-medium transition no-underline leading-snug"
              >
                <KeyRound className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                <span>Kiểm soát thẻ từ RFID</span>
              </Link>
            </li>
            <li>
              <Link
                href="#"
                className="inline-flex items-center gap-1.5 hover:text-teal-700 text-slate-800 font-medium transition no-underline leading-snug"
              >
                <FileText className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                <span>Hợp đồng & Tạm trú số</span>
              </Link>
            </li>
          </ul>
        </div>

        {/* Cột 3: Tài nguyên */}
        <div className="bg-[#DDDDDD] lg:bg-transparent p-3.5 sm:p-5 lg:p-0 flex flex-col justify-start space-y-3 min-w-0">
          <h4 className="flex items-center gap-1.5 text-xs font-bold text-teal-800 tracking-wide pb-2.5 border-b border-slate-300/70">
            <BookOpen className="w-3.5 h-3.5 shrink-0" />
            <span>Tài nguyên</span>
          </h4>
          <ul className="space-y-2 text-slate-700">
            <li>
              <Link
                href="#"
                className="inline-flex items-center gap-1.5 hover:text-teal-700 text-slate-800 font-medium transition no-underline leading-snug"
              >
                <Cpu className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                <span>Hướng dẫn phần cứng IoT</span>
              </Link>
            </li>
            <li>
              <Link
                href="#"
                className="inline-flex items-center gap-1.5 hover:text-teal-700 text-slate-800 font-medium transition no-underline leading-snug"
              >
                <Users className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                <span>Cẩm nang cư dân</span>
              </Link>
            </li>
            <li>
              <Link
                href="#"
                className="inline-flex items-center gap-1.5 hover:text-teal-700 text-slate-800 font-medium transition no-underline leading-snug"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                <span>Chính sách bảo mật</span>
              </Link>
            </li>
            <li>
              <Link
                href="#"
                className="inline-flex items-center gap-1.5 hover:text-teal-700 text-slate-800 font-medium transition no-underline leading-snug"
              >
                <ScrollText className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                <span>Điều khoản dịch vụ</span>
              </Link>
            </li>
          </ul>
        </div>

        {/* Cột 4: Kết nối */}
        <div className="bg-[#DDDDDD] lg:bg-transparent p-3.5 sm:p-5 lg:p-0 shadow-2xs lg:shadow-none flex flex-col justify-start space-y-3 min-w-0">
          <h4 className="flex items-center gap-1.5 text-xs font-bold text-teal-800 tracking-wide pb-2.5 border-b border-slate-300/70">
            <Share2 className="w-3.5 h-3.5 shrink-0" />
            <span>Kết nối</span>
          </h4>
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 pt-1">
            <Link
              href="#"
              aria-label="Website / Cộng đồng"
              className="group w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 flex items-center justify-center transition shadow-xs border border-teal-600 shrink-0"
            >
              <Globe className="w-4 h-4" />
            </Link>
            <Link
              href="#"
              aria-label="Hỗ trợ trực tuyến"
              className="group w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 flex items-center justify-center transition shadow-xs border border-teal-600 shrink-0"
            >
              <MessageCircle className="w-4 h-4" />
            </Link>
            <Link
              href="#"
              aria-label="Kênh video hướng dẫn"
              className="group w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 flex items-center justify-center transition shadow-xs border border-teal-600 shrink-0"
            >
              <Play className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Phần chân dưới cùng */}
      <div className="border-t border-teal-400/40 bg-[#00FFCC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 sm:py-4 flex flex-col sm:flex-row items-center justify-between gap-1 sm:gap-3 text-center sm:text-left text-xs">
          <p className="inline-flex items-center gap-1.5 text-slate-900 text-[12px] font-bold tracking-tight">
            <Building2 className="w-3.5 h-3.5 shrink-0" />
            <span>© {new Date().getFullYear()} Xóm Trọ Gia Đình</span>
          </p>
          <p className="inline-flex items-center gap-1.5 text-slate-900 text-[12px] font-semibold">
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span>Giải pháp cho hộ gia đình thông minh</span>
          </p>
        </div>
      </div>
    </footer>
  );
}