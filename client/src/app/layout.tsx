// client/src/app/layout.tsx
// @ts-ignore
import './globals.css';
import React from 'react';
import { AlertModalProvider } from '@/components/common/AlertModalProvider';
import { GlobalLoadingProvider } from '@/components/common/GlobalLoadingProvider';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className="min-h-screen flex flex-col antialiased bg-white text-slate-900"
      >
        <GlobalLoadingProvider>
          <AlertModalProvider>
            {children}
          </AlertModalProvider>
        </GlobalLoadingProvider>
      </body>
    </html>
  );
}