'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AuthService } from '../../services/auth.service';
import { RoleType, UserProfile } from '../../types/auth.type';

interface ProtectedRouteProps {
  allowedRoles: RoleType[];
  children: (user: UserProfile) => React.ReactNode;
}

export default function ProtectedRoute({
  allowedRoles,
  children,
}: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Giữ allowedRoles trong useRef để khi gõ chữ ở các ô input trang con re-render không kích hoạt lại useEffect
  const allowedRolesRef = useRef<RoleType[]>(allowedRoles);
  allowedRolesRef.current = allowedRoles;

  useEffect(() => {
    let isMounted = true;

    const verifySession = async () => {
      try {
        if (!user) {
          setLoading(true);
        }

        const res = await AuthService.getMe();
        const currentUser =
          res.data?.user || (res.data as unknown as UserProfile);

        if (!isMounted) return;

        if (!currentUser || !currentUser.Quyen) {
          router.replace('/auth');
          return;
        }

        // Nếu truy cập vào trang không đúng quyền thì đẩy về đúng trang của quyền đó
        if (!allowedRolesRef.current.includes(currentUser.Quyen)) {
          if (
            currentUser.Quyen === 'ChuTro' ||
            currentUser.Quyen === 'QuanLy'
          ) {
            router.replace('/chuTro/thongKe');
          } else {
            router.replace('/nguoiThue/thongKe');
          }
          return;
        }

        setUser(currentUser);
        setLoading(false);
      } catch {
        if (isMounted) {
          router.replace('/auth');
        }
      }
    };

    verifySession();

    return () => {
      isMounted = false;
    };
    // Chỉ kiểm tra khi chuyển đường dẫn trang (pathname), tuyệt đối không chạy lại khi gõ phím
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600 text-base">
          Đang kiểm tra phiên đăng nhập bảo mật...
        </p>
      </div>
    );
  }

  return <>{children(user)}</>;
}