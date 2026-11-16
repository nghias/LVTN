// client/src/app/chuTro/khachThue/them/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import FormPageLayout from '@/components/common/FormPageLayout';
import KhachThueForm from '@/components/khachThue/KhachThueForm';
import { useAlertModal } from '@/components/common/AlertModalProvider';
import { KhachThueService } from '@/services/khachThue.service';

export default function ThemKhachThuePage() {
  const router = useRouter();
  const { showSuccess, showError } = useAlertModal();
  const [submitting, setSubmitting] = useState(false);

  return (
    <FormPageLayout
      allowedRoles={['ChuTro', 'QuanLy']}
      backHref="/chuTro/khachThue"
      backLabel="Quay lại danh sách Khách thuê"
      title="Tạo Tài Khoản & Hồ Sơ Khách Thuê"
      subtitle="Khởi tạo tài khoản đăng nhập và hồ sơ định danh cá nhân"
      maxWidth="max-w-4xl"
    >
      {() => (
        <KhachThueForm
          mode="create"
          submitting={submitting}
          submitLabel="Tạo tài khoản khách thuê"
          submittingLabel="Đang tạo..."
          onSubmit={async (payload) => {
            try {
              setSubmitting(true);
              await KhachThueService.create(payload);
              showSuccess(
                'Tạo tài khoản và hồ sơ khách thuê thành công!',
                'Thành công',
                1.5,
                () => {
                  router.push('/chuTro/khachThue');
                }
              );
            } catch (err: any) {
              showError(err?.message || 'Tạo tài khoản khách thuê thất bại!');
            } finally {
              setSubmitting(false);
            }
          }}
        />
      )}
    </FormPageLayout>
  );
}