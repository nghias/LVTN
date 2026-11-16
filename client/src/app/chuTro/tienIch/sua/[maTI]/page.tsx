'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import FormPageLayout from '@/components/common/FormPageLayout';
import TienIchForm from '@/components/tienIch/TienIchForm';
import { useAlertModal } from '@/components/common/AlertModalProvider';
import {
  tienIchService,
  KhuTroOption,
  PhongOption,
} from '@/services/tienIch.service';

export default function SuaTienIchPage() {
  const params = useParams();
  const router = useRouter();
  const maTI = Number(params?.maTI);
  const { showSuccess, showError } = useAlertModal();

  const [initialData, setInitialData] = useState<{
    tenTI: string;
    moTa: string;
    selectedRoomIds: number[];
  }>({
    tenTI: '',
    moTa: '',
    selectedRoomIds: [],
  });

  const [khuTroList, setKhuTroList] = useState<KhuTroOption[]>([]);
  const [phongList, setPhongList] = useState<PhongOption[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [optionsRes, detailRes] = await Promise.all([
          tienIchService.getPhongOptions(),
          tienIchService.getById(maTI),
        ]);

        if (optionsRes.success && optionsRes.data) {
          setKhuTroList(optionsRes.data.khuTroList || []);
          setPhongList(optionsRes.data.phongList || []);
        }

        if (detailRes.success && detailRes.data) {
          const ti = detailRes.data;
          const assignedIds = Array.isArray(ti.PhongApDung)
            ? ti.PhongApDung.map((id: number) => Number(id))
            : [];

          setInitialData({
            tenTI: ti.TenTI || '',
            moTa: ti.MoTa || '',
            selectedRoomIds: assignedIds,
          });
        } else {
          showError(detailRes.message || 'Không tìm thấy tiện ích');
          router.replace('/chuTro/tienIch');
        }
      } catch {
        showError('Lỗi kết nối máy chủ khi tải dữ liệu tiện ích');
      } finally {
        setLoading(false);
      }
    };

    if (maTI) loadData();
  }, [maTI, router, showError]);

  return (
    <FormPageLayout
      allowedRoles={['ChuTro', 'QuanLy']}
      backHref="/chuTro/tienIch"
      backLabel="Quay lại danh sách Tiện ích"
      title="Chỉnh Sửa Tiện Ích"
      subtitle="Quản lý thông tin tiện ích và cập nhật danh sách các phòng trang bị tiện ích này."
      maxWidth="max-w-4xl"
      loading={loading}
      loadingText="Đang tải dữ liệu tiện ích..."
    >
      {(user) => (
        <TienIchForm
          initialData={initialData}
          khuTroList={khuTroList}
          phongList={phongList}
          userRole={user.Quyen}
          submitting={submitting}
          submitLabel="Lưu Thay Đổi"
          submittingLabel="Đang cập nhật..."
          onSubmit={async (payload) => {
            try {
              setSubmitting(true);
              const res = await tienIchService.update(maTI, payload);

              if (res.success) {
                showSuccess(
                  res.message || 'Cập nhật tiện ích thành công!',
                  'Thành công',
                  1.5,
                  () => {
                    router.push('/chuTro/tienIch');
                  }
                );
              } else {
                showError(res.message || 'Không thể cập nhật tiện ích');
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