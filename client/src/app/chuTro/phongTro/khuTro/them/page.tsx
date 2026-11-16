'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import FormPageLayout from '@/components/common/FormPageLayout';
import KhuTroForm from '@/components/phongTro/khuTro/KhuTroForm';
import { useAlertModal } from '@/components/common/AlertModalProvider';
import { PhongTroService } from '@/services/phongTro.service';
import { QuanLyUserItem } from '@/types/phongTro.type';

export default function ThemKhuTroPage() {
  const router = useRouter();
  const { showSuccess, showError } = useAlertModal();
  const [quanLyList, setQuanLyList] = useState<QuanLyUserItem[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    PhongTroService.getDanhSachQuanLy()
      .then((res) => setQuanLyList(res.data || []))
      .catch(() => {});
  }, []);

  return (
    <FormPageLayout
      allowedRoles={['ChuTro']}
      backHref="/chuTro/phongTro"
      backLabel="Quay lại danh sách Khu trọ & Phòng"
      title="Thêm Khu Trọ (Cơ Sở) Mới"
    >
      {() => (
        <KhuTroForm
          initialData={{ maND: quanLyList[0]?.MaND || 2 }}
          quanLyList={quanLyList}
          submitting={submitting}
          submitLabel="Lưu Khu Trọ"
          onSubmit={async (payload) => {
            try {
              setSubmitting(true);
              await PhongTroService.createKhuTro(payload);
              showSuccess('Thêm khu trọ mới thành công!', 'Thành công', 1.5, () => {
                router.push('/chuTro/phongTro');
              });
            } catch (err: unknown) {
              if (err instanceof Error) showError(err.message);
            } finally {
              setSubmitting(false);
            }
          }}
        />
      )}
    </FormPageLayout>
  );
}