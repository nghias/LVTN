'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthService } from '../../services/auth.service';
import { RoleType, UserProfile } from '../../types/auth.type';

interface ProtectedRouteProps {
  allowedRoles: RoleType[];
  children: (user: UserProfile) => React.ReactNode;
}

export default function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    const verifySession = async () => {
      try {
        const res = await AuthService.getMe();
        const currentUser = res.data;

        if (!currentUser) {
          router.replace('/auth');
          return;
        }

        // Nếu truy cập vào trang không đúng quyền thì đẩy về đúng trang của quyền đó
        if (!allowedRoles.includes(currentUser.Quyen)) {
          if (currentUser.Quyen === 'ChuTro' || currentUser.Quyen === 'QuanLy') {
            router.replace('/chuTro/thongKe');
          } else {
            router.replace('/nguoiThue/thongKe');
          }
          return;
        }

        if (isMounted) {
          setUser(currentUser);
          setLoading(false);
        }
      } catch {
        router.replace('/auth');
      }
    };

    verifySession();

    return () => {
      isMounted = false;
    };
  }, [allowedRoles, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600 text-base">Đang kiểm tra phiên đăng nhập bảo mật...</p>
      </div>
    );
  }

  return <>{children(user)}</>;
}