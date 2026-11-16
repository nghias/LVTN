'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import FormPageLayout from '@/components/common/FormPageLayout';
import KhuTroForm, { KhuTroFormValues } from '@/components/phongTro/khuTro/KhuTroForm';
import { useAlertModal } from '@/components/common/AlertModalProvider';
import { PhongTroService } from '@/services/phongTro.service';
import { QuanLyUserItem } from '@/types/phongTro.type';

export default function SuaKhuTroPage() {
  const params = useParams();
  const router = useRouter();
  const maKhu = Number(params.maKhu);
  const { showSuccess, showError } = useAlertModal();

  const [initialData, setInitialData] = useState<KhuTroFormValues>({
    tenKhu: '',
    diaChi: '',
    moTa: '',
    maND: 1,
  });
  const [quanLyList, setQuanLyList] = useState<QuanLyUserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [khuRes, qlRes] = await Promise.all([
          PhongTroService.getKhuTroDetail(maKhu),
          PhongTroService.getDanhSachQuanLy(),
        ]);
        if (khuRes.data) {
          setInitialData({
            tenKhu: khuRes.data.TenKhu || '',
            diaChi: khuRes.data.DiaChi || '',
            moTa: khuRes.data.MoTa || '',
            maND: Number(khuRes.data.MaND) || 1,
          });
        }
        setQuanLyList(qlRes.data || []);
      } catch (err: unknown) {
        if (err instanceof Error) showError(err.message, 'Không có quyền truy cập', 2);
        router.replace('/chuTro/phongTro');
      } finally {
        setLoading(false);
      }
    };
    if (maKhu) loadData();
  }, [maKhu, router, showError]);

  return (
    <FormPageLayout
      allowedRoles={['ChuTro', 'QuanLy']}
      backHref="/chuTro/phongTro"
      backLabel="Quay lại danh sách Khu trọ & Phòng"
      title="Chỉnh Sửa Thông Tin Khu Trọ"
      loading={loading}
      loadingText="Đang tải thông tin khu trọ..."
    >
      {(user) => (
        <KhuTroForm
          initialData={initialData}
          quanLyList={quanLyList}
          canChangeManager={user.Quyen === 'ChuTro'}
          submitting={submitting}
          submitLabel="Lưu Thay Đổi"
          onSubmit={async (payload) => {
            try {
              setSubmitting(true);
              await PhongTroService.updateKhuTro(maKhu, payload);
              showSuccess('Cập nhật thông tin khu trọ thành công!', 'Thành công', 1.5, () => {
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