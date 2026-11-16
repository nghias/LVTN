// client/src/components/common/FormPageLayout.tsx
'use client';

import React, { ReactNode } from 'react';
import Link from 'next/link';
import ProtectedRoute from './ProtectedRoute';
import QuanLyHeader from '../layout/QuanLyHeader';
import { UserProfile } from '@/types/auth.type';

interface FormPageLayoutProps {
  allowedRoles?: ('ChuTro' | 'QuanLy' | 'KhachThue')[];
  backHref: string;
  backLabel: string;
  title: string;
  subtitle?: string;
  maxWidth?: 'max-w-2xl' | 'max-w-3xl' | 'max-w-4xl';
  loading?: boolean;
  loadingText?: string;
  children: (user: UserProfile) => ReactNode;
}

export default function FormPageLayout({
  allowedRoles = ['ChuTro', 'QuanLy'],
  backHref,
  backLabel,
  title,
  subtitle,
  maxWidth = 'max-w-2xl',
  loading = false,
  loadingText = 'Đang tải dữ liệu...',
  children,
}: FormPageLayoutProps) {
  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      {(user) => (
        <div className="flex-1 flex flex-col bg-white text-slate-900">
          <QuanLyHeader user={user} />

          <main className={`flex-1 ${maxWidth} w-full mx-auto px-4 py-6 sm:py-10`}>
            <div className="mb-6">
              <Link
                href={backHref}
                className="text-xs font-bold text-slate-600 hover:text-slate-900 no-underline inline-flex items-center gap-1"
              >
                ← {backLabel}
              </Link>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-2">
                {title}
              </h1>
              {subtitle && (
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  {subtitle}
                </p>
              )}
            </div>

            {loading ? (
              <div className="py-12 text-center text-sm text-slate-500">
                {loadingText}
              </div>
            ) : (
              children(user)
            )}
          </main>
        </div>
      )}
    </ProtectedRoute>
  );
}