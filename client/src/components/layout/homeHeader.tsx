// src/components/layout/homeHeader.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AuthService } from "@/services/auth.service";
import { UserProfile } from "@/types/auth.type";
import { useAlertModal } from "@/components/common/AlertModalProvider";
import UserHeaderActions from "./UserHeaderActions";

const getApiBaseUrl = () => {
  const raw = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
  const trimmed = raw.replace(/\/auth\/?$/, "").replace(/\/+$/, "");
  return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
};

const getAuthHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (typeof window !== "undefined") {
    const token =
      localStorage.getItem("token") ||
      localStorage.getItem("accessToken") ||
      sessionStorage.getItem("token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }
  return headers;
};

interface HomeHeaderProps {
  initialUser?: UserProfile | null;
}

export default function HomeHeader({ initialUser = null }: HomeHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { showConfirm, showSuccess, showError } = useAlertModal();

  const [user, setUser] = useState<UserProfile | null>(initialUser);
  const [authChecked, setAuthChecked] = useState<boolean>(Boolean(initialUser));
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("#tin-dang");

  const primaryNavItems = [
    { label: "Tìm phòng trống", href: "#tin-dang" },
    { label: "Khu trọ trực thuộc", href: "#khu-tro" },
    { label: "Bảng giá Điện nước", href: "#bang-gia" },
    { label: "Giới thiệu", href: "#gioi-thieu" },
  ];

  useEffect(() => {
    if (initialUser) {
      setUser(initialUser);
      setAuthChecked(true);
      return;
    }

    let isMounted = true;

    const checkAuthSession = async () => {
      try {
        const res = await fetch(`${getApiBaseUrl()}/auth/profile`, {
          method: "GET",
          headers: getAuthHeaders(),
          credentials: "include",
          cache: "no-store",
        });

        if (!res.ok) {
          if (isMounted) setUser(null);
          return;
        }

        const result = await res.json();
        const profile = result?.data?.user || result?.data || result?.user || null;

        if (isMounted && profile && (profile.TenTK || profile.MaND || profile.Quyen)) {
          setUser(profile as UserProfile);
        } else if (isMounted) {
          setUser(null);
        }
      } catch {
        if (isMounted) setUser(null);
      } finally {
        if (isMounted) setAuthChecked(true);
      }
    };

    checkAuthSession();

    return () => {
      isMounted = false;
    };
  }, [initialUser, pathname]);

  const resolveNavHref = (hash: string) => {
    return pathname === "/" ? hash : `/${hash}`;
  };

  const isManager = user?.Quyen === "ChuTro" || user?.Quyen === "QuanLy";

  const roleLabel =
    user?.Quyen === "ChuTro"
      ? "Quản Lý Hệ Thống"
      : user?.Quyen === "QuanLy"
        ? "Quản Lý Cơ Sở"
        : "Khách Thuê Phòng";

  const dashboardHref = isManager ? "/chuTro/thongKe" : "/nguoiThue/thongKe";
  const dashboardLabel = isManager ? "Về trang Quản lý" : "Về trang Người thuê";

  const handleMobileLogout = () => {
    setMobileMenuOpen(false);
    showConfirm(
      "Bạn có chắc chắn muốn đăng xuất khỏi phiên làm việc hiện tại không?",
      "Xác nhận đăng xuất",
      async () => {
        try {
          await AuthService.logout();
          setUser(null);
          showSuccess(
            "Đã đăng xuất khỏi hệ thống an toàn!",
            "Thành công",
            1.5,
            () => {
              router.replace("/auth");
            }
          );
        } catch {
          showError("Không thể đăng xuất lúc này, vui lòng thử lại!");
        }
      },
      "Xác nhận",
      "Hủy"
    );
  };

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
            <span className="font-bold text-base tracking-tight text-slate-900 block leading-none whitespace-nowrap">
              Xóm Trọ
            </span>
            <span className="text-[11px] text-slate-500 whitespace-nowrap">
              {user
                ? isManager
                  ? "Hệ thống Quản lý & IoT"
                  : "Cổng thông tin Người thuê"
                : "Hệ thống Quản lý Nhà trọ"}
            </span>
          </div>
        </Link>

        {/* Điều hướng Desktop */}
        <nav className="hidden lg:flex items-center gap-1.5 shrink-0">
          {primaryNavItems.map((item) => {
            const isActive = pathname === "/" && activeSection === item.href;
            return (
              <a
                key={item.href}
                href={resolveNavHref(item.href)}
                onClick={() => setActiveSection(item.href)}
                className={`px-3.5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition no-underline ${
                  isActive
                    ? "bg-[#00FFCC] text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-[#00FFCC]/20"
                }`}
              >
                {item.label}
              </a>
            );
          })}
        </nav>

        {/* Cụm hành động bên phải */}
        <div className="flex items-center gap-2 shrink-0">
          {!authChecked ? (
            <div className="hidden sm:block w-28 h-9 rounded-full bg-slate-100 animate-pulse" />
          ) : user ? (
            <UserHeaderActions
              user={user}
              roleLabel={roleLabel}
              mobileMenuOpen={mobileMenuOpen}
              onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
              onCloseMobileMenu={() => setMobileMenuOpen(false)}
              dashboardHref={dashboardHref}
              dashboardLabel={dashboardLabel}
            />
          ) : (
            <>
              <Link
                href="/auth"
                className="hidden sm:inline-flex items-center justify-center px-4 py-2 rounded-full text-xs font-bold text-slate-900 bg-[#00FFCC] hover:bg-[#00e6b8] transition no-underline whitespace-nowrap"
              >
                Đăng nhập
              </Link>

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
            </>
          )}
        </div>
      </div>

      {/* Menu Mobile */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-t border-slate-200 px-4 pt-3 pb-5 shadow-xl space-y-4">
          {user ? (
            <>
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

              <Link
                href={dashboardHref}
                onClick={() => setMobileMenuOpen(false)}
                className="w-full px-4 py-2.5 rounded-xl text-xs font-bold bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 border border-teal-300 shadow-2xs transition no-underline flex items-center justify-between"
              >
                <span>{dashboardLabel}</span>
                <span>→</span>
              </Link>
            </>
          ) : (
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">
                  Chào mừng đến với Xóm Trọ
                </p>
                <p className="text-[11px] text-slate-500 truncate">
                  Hệ thống nhà trọ thông minh & thẻ từ RFID
                </p>
              </div>
            </div>
          )}

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">
              Khám phá phòng trọ
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {primaryNavItems.map((item) => (
                <a
                  key={item.href}
                  href={resolveNavHref(item.href)}
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

          {user ? (
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
          ) : (
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
                  Đăng nhập
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </header>
  );
}