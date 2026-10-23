// src/components/layout/homeHeader.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function HomeHeader() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('#tin-dang');

  const primaryNavItems = [
    { label: 'Tìm phòng trống', href: '#tin-dang' },
    { label: 'Khu trọ trực thuộc', href: '#khu-tro' },
    { label: 'Bảng giá Điện nước', href: '#bang-gia' },
  ];

  const portalNavItems = [
    { label: 'Cổng thông tin Người thuê', href: '/nguoiThue/thongKe' },
    { label: 'Bảng điều khiển Chủ trọ', href: '/chuTro' },
    { label: 'Quản lý Tài khoản', href: '/taiKhoan/thongTin' },
  ];

  return (
    <header className="w-full bg-white text-slate-900 border-b-2 border-[#00FFCC] shadow-xs sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        {/* Logo Xóm Trọ */}
        <Link
          href="/"
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
            <span className="font-bold text-base text-slate-900 block leading-none whitespace-nowrap">
              Xóm Trọ
            </span>
            <span className="text-[11px] text-slate-500 whitespace-nowrap">
              Hệ thống Quản lý Nhà trọ
            </span>
          </div>
        </Link>

        {/* Điều hướng Desktop */}
        <nav className="hidden lg:flex items-center gap-1.5 shrink-0">
          {primaryNavItems.map((item) => {
            const isActive = activeSection === item.href;
            return (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setActiveSection(item.href)}
                className={`px-3.5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition no-underline ${
                  isActive
                    ? 'bg-[#00FFCC] text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-[#00FFCC]/20'
                }`}
              >
                {item.label}
              </a>
            );
          })}

          {/* Dropdown Phân quyền Cổng thông tin */}
          <div className="relative group">
            <button
              type="button"
              className="px-3.5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 cursor-pointer text-slate-600 hover:text-slate-900 hover:bg-[#00FFCC]/20"
            >
              <span>Cổng cư dân & Quản lý</span>
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

            <div className="absolute left-0 top-full pt-2 w-56 invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-150 z-50">
              <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden py-1.5">
                {portalNavItems.map((item) => {
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
                      <span>→</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </nav>

        {/* Cụm nút Đăng nhập / Cổng cư dân bên phải */}
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/auth"
            className="hidden sm:inline-flex items-center justify-center px-4 py-2 rounded-full text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-[#00FFCC]/20 border border-slate-200 transition no-underline"
          >
            Đăng nhập
          </Link>
       

          {/* Nút bật/tắt Menu Mobile */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 hover:bg-[#00FFCC]/20 cursor-pointer"
            aria-label="Mở menu"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {mobileMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Menu Mobile đồng bộ thiết kế NguoiThueHeader */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-t border-slate-200 px-4 pt-3 pb-5 shadow-xl space-y-4">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate">
                Chào mừng đến với Xóm Trọ
              </p>
              <p className="text-[11px] text-slate-500 truncate">
                Hệ thống nhà trọ thông minh & thẻ từ RFID
              </p>
            </div>
            <span className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-[#00FFCC] text-slate-900 shrink-0">
              Khách xem phòng
            </span>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">
              Khám phá phòng trọ
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {primaryNavItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => {
                    setActiveSection(item.href);
                    setMobileMenuOpen(false);
                  }}
                  className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-slate-50 text-slate-700 hover:bg-[#00FFCC]/20 border border-slate-200/80 transition no-underline flex items-center justify-between"
                >
                  <span>{item.label}</span>
                  <span>•</span>
                </a>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">
              Truy cập hệ thống
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/auth"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-[#00FFCC] text-slate-900 border border-teal-300 text-center no-underline"
              >
                Đăng nhập / Đăng ký
              </Link>
              <Link
                href="/nguoiThue/thongKe"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-slate-50 text-slate-700 hover:bg-[#00FFCC]/20 border border-slate-200/80 text-center no-underline"
              >
                Cổng Người thuê
              </Link>
              <Link
                href="/chuTro"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-slate-50 text-slate-700 hover:bg-[#00FFCC]/20 border border-slate-200/80 text-center no-underline col-span-2"
              >
                Bảng điều khiển Chủ trọ & Quản lý
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}