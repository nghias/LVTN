'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import FormPageLayout from '@/components/common/FormPageLayout';
import TienIchForm from '@/components/tienIch/TienIchForm';
import { useAlertModal } from '@/components/common/AlertModalProvider';
import {
  tienIchService,
  KhuTroOption,
  PhongOption,
} from '@/services/tienIch.service';

export default function ThemTienIchPage() {
  const router = useRouter();
  const { showSuccess, showError } = useAlertModal();

  const [khuTroList, setKhuTroList] = useState<KhuTroOption[]>([]);
  const [phongList, setPhongList] = useState<PhongOption[]>([]);
  const [loadingRooms, setLoadingRooms] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    const loadOptions = async () => {
      try {
        setLoadingRooms(true);
        const res = await tienIchService.getPhongOptions();
        if (res.success && res.data) {
          setKhuTroList(res.data.khuTroList || []);
          setPhongList(res.data.phongList || []);
        }
      } catch {
        showError('Không thể tải danh sách phòng để gán tiện ích');
      } finally {
        setLoadingRooms(false);
      }
    };
    loadOptions();
  }, [showError]);

  return (
    <FormPageLayout
      allowedRoles={['ChuTro', 'QuanLy']}
      backHref="/chuTro/tienIch"
      backLabel="Quay lại danh sách Tiện ích"
      title="Thêm Tiện Ích Mới"
      subtitle="Thiết lập thông tin tiện ích và gán cho các phòng trang bị tiện ích này."
      maxWidth="max-w-4xl"
    >
      {(user) => (
        <TienIchForm
          khuTroList={khuTroList}
          phongList={phongList}
          loadingRooms={loadingRooms}
          userRole={user.Quyen}
          submitting={submitting}
          submitLabel="Tạo Tiện Ích"
          submittingLabel="Đang lưu..."
          onSubmit={async (payload) => {
            try {
              setSubmitting(true);
              const res = await tienIchService.create(payload);

              if (res.success) {
                showSuccess(
                  res.message || 'Thêm tiện ích mới thành công!',
                  'Thành công',
                  1.5,
                  () => {
                    router.push('/chuTro/tienIch');
                  }
                );
              } else {
                showError(res.message || 'Không thể thêm tiện ích');
              }
            } catch {
              showError('Lỗi kết nối máy chủ');
            } finally {
              setSubmitting(false);
            }
          }}
        />
      )}
    </FormPageLayout>
  );
}