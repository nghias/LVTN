import './globals.css';
import type { Metadata } from 'next';
import { AlertModalProvider } from '../components/common/AlertModalProvider';
import AppFooter from '../components/layout/AppFooter';

export const metadata: Metadata = {
  title: 'Hệ thống Quản lý Nhà trọ Xóm Trọ',
  description: 'Nền tảng quản lý nhà trọ kết hợp thiết bị IoT tự động',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className="min-h-screen flex flex-col antialiased bg-white text-slate-900">
        <AlertModalProvider>
          <div className="flex-1 flex flex-col bg-white">{children}</div>
          <AppFooter />
        </AlertModalProvider>
      </body>
    </html>
  );
}