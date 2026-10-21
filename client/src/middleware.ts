import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('accessToken')?.value;
  const { pathname } = request.nextUrl;

  const isProtectedPage =
    pathname.startsWith('/chuTro') || pathname.startsWith('/nguoiThue');

  // Nếu chưa có Cookie đăng nhập mà cố vào trang Thống kê -> Chuyển về /auth
  if (isProtectedPage && !token) {
    return NextResponse.redirect(new URL('/auth', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/chuTro/:path*', '/nguoiThue/:path*'],
};