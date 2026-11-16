// client/src/app/chuTro/khachThue/sua/[maND]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import FormPageLayout from '@/components/common/FormPageLayout';
import KhachThueForm, {
  KhachThueFormState,
} from '@/components/khachThue/KhachThueForm';
import { useAlertModal } from '@/components/common/AlertModalProvider';
import { KhachThueService } from '@/services/khachThue.service';

export default function SuaKhachThuePage() {
  const params = useParams();
  const router = useRouter();
  const maND = params?.maND as string;
  const { showSuccess, showError } = useAlertModal();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [initialData, setInitialData] = useState<Partial<KhachThueFormState>>({});

  useEffect(() => {
    if (!maND) return;
    const fetchDetail = async () => {
      try {
        setLoading(true);
        const data = await KhachThueService.getDetail(maND);
        setInitialData({
          tenTK: data.TenTK || '',
          hoTen: data.HoTen || '',
          gioiTinh: data.GioiTinh || 'Nam',
          namSinh: data.NamSinh ? String(data.NamSinh) : '',
          sdt: data.SDT || '',
          cccd: data.CCCD || '',
          ngayCap: data.NgayCap ? String(data.NgayCap).slice(0, 10) : '',
          noiCap: data.NoiCap || '',
          email: data.Email || '',
          ngheNghiep: data.NgheNghiep || '',
          diaChi: data.DiaChi || '',
        });
      } catch (err: any) {
        showError(err?.message || 'Không thể tải thông tin khách thuê');
        router.push('/chuTro/khachThue');
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [maND, router, showError]);

  return (
    <FormPageLayout
      allowedRoles={['ChuTro', 'QuanLy']}
      backHref="/chuTro/khachThue"
      backLabel="Quay lại danh sách Khách thuê"
      title="Chỉnh Sửa Hồ Sơ Khách Thuê"
      subtitle="Cập nhật thông tin định danh cá nhân và tài khoản khách thuê"
      maxWidth="max-w-4xl"
      loading={loading}
      loadingText="Đang tải thông tin khách thuê..."
    >
      {() => (
        <KhachThueForm
          mode="edit"
          initialData={initialData}
          submitting={submitting}
          submitLabel="Lưu cập nhật"
          submittingLabel="Đang lưu..."
          onSubmit={async (payload) => {
            try {
              setSubmitting(true);
              await KhachThueService.update(maND, payload);
              showSuccess(
                'Cập nhật thông tin khách thuê thành công!',
                'Thành công',
                1.5,
                () => {
                  router.push('/chuTro/khachThue');
                }
              );
            } catch (err: any) {
              showError(err?.message || 'Cập nhật hồ sơ khách thuê thất bại!');
            } finally {
              setSubmitting(false);
            }
          }}
        />
      )}
    </FormPageLayout>
  );
}