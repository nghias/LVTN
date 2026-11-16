'use client';

import { useEffect, useState, useMemo, FormEvent, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import FormPageLayout from '@/components/common/FormPageLayout';
import { FormField, FormActions } from '@/components/common/FormPrimitives';
import {
  TienIchSelector,
  RoomImageManager,
} from '@/components/phongTro/PhongTroFormShared';
import CurrencyInput from '@/components/common/CurrencyInput';
import { useAlertModal } from '@/components/common/AlertModalProvider';
import { PhongTroService } from '@/services/phongTro.service';
import { KhuTroItem, RoomStatus, TienIchItem } from '@/types/phongTro.type';
import {
  Validators,
  useFormValidation,
  inputErrorClass,
} from '@/utils/formValidation';

function ThemPhongTroContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedKhu = Number(searchParams.get('maKhu') || 0);
  const { showSuccess, showError } = useAlertModal();

  const [khuTroList, setKhuTroList] = useState<KhuTroItem[]>([]);
  const [tienIchList, setTienIchList] = useState<TienIchItem[]>([]);

  const [maKhu, setMaKhu] = useState<number>(0);
  const [tenPhong, setTenPhong] = useState('');
  const [dienTich, setDienTich] = useState('');
  const [gia, setGia] = useState('');
  const [trangThai, setTrangThai] = useState<RoomStatus>('Trong');
  const [selectedTienIch, setSelectedTienIch] = useState<number[]>([]);

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [mainImageIndex, setMainImageIndex] = useState<number>(0);
  const [imageError, setImageError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const rules = useMemo(
    () => ({
      maKhu: [Validators.positiveNumber('Khu trọ (Cơ sở)', 1)],
      tenPhong: [
        Validators.required('tên phòng / số phòng'),
        Validators.minLength('Tên phòng', 2),
        Validators.maxLength('Tên phòng', 50),
      ],
      dienTich: [
        Validators.required('diện tích phòng'),
        Validators.positiveNumber('Diện tích phòng', 5),
        (val: any) =>
          Number(val) > 200 ? 'Diện tích phòng không được vượt quá 200 m².' : null,
      ],
      gia: [
        Validators.required('giá thuê phòng'),
        Validators.positiveNumber('Giá thuê phòng', 500000),
      ],
    }),
    []
  );

  const { errors, validateField, validateAll } = useFormValidation(rules);

  useEffect(() => {
    Promise.all([PhongTroService.getKhuTroList(), PhongTroService.getAllTienIch()])
      .then(([khuRes, tiRes]) => {
        const khus = khuRes.data || [];
        setKhuTroList(khus);
        setTienIchList(tiRes.data || []);
        if (preselectedKhu && khus.some((k) => k.MaKhu === preselectedKhu)) {
          setMaKhu(preselectedKhu);
        } else if (khus.length > 0) {
          setMaKhu(khus[0].MaKhu);
        }
      })
      .catch((err: unknown) => {
        if (err instanceof Error) showError(err.message);
      });
  }, [preselectedKhu, showError]);

  const handleAddFiles = (filesArr: File[]) => {
    const updated = [...selectedFiles, ...filesArr];
    if (updated.length > 8) {
      setImageError('Chỉ được phép tải lên tối đa 8 hình ảnh cho mỗi phòng.');
      return;
    }
    setImageError(null);
    setSelectedFiles(updated);
    setPreviewUrls((prev) => [...prev, ...filesArr.map((f) => URL.createObjectURL(f))]);
  };

  const handleRemoveFile = (index: number) => {
    const updatedFiles = selectedFiles.filter((_, idx) => idx !== index);
    setSelectedFiles(updatedFiles);
    setPreviewUrls((prev) => prev.filter((_, idx) => idx !== index));
    if (updatedFiles.length <= 8) setImageError(null);
    if (mainImageIndex === index) setMainImageIndex(0);
    else if (mainImageIndex > index) setMainImageIndex(mainImageIndex - 1);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateAll({ maKhu, tenPhong, dienTich, gia }) || imageError) return;

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('MaKhu', String(maKhu));
      formData.append('TenPhong', tenPhong.trim());
      formData.append('DienTich', String(dienTich));
      formData.append('Gia', String(gia));
      formData.append('TrangThai', trangThai);
      formData.append('TienIchIds', JSON.stringify(selectedTienIch));
      formData.append('MainImageIndex', String(mainImageIndex));
      selectedFiles.forEach((file) => formData.append('anhPhong', file));

      await PhongTroService.createPhong(formData);
      showSuccess('Thêm phòng trọ mới thành công!', 'Thành công', 1.5, () => {
        router.push('/chuTro/phongTro');
      });
    } catch (err: unknown) {
      if (err instanceof Error) showError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FormPageLayout
      backHref="/chuTro/phongTro"
      backLabel="Quay lại danh sách Phòng trọ"
      title="Thêm Phòng Trọ Mới"
      maxWidth="max-w-3xl"
    >
      {() => (
        <form
          onSubmit={handleSubmit}
          noValidate
          className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-8 shadow-sm space-y-6"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Thuộc Khu trọ (Cơ sở)" required error={errors.maKhu}>
              <select
                value={maKhu}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setMaKhu(val);
                  validateField('maKhu', val);
                }}
                className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none transition ${inputErrorClass(
                  errors.maKhu
                )}`}
              >
                {khuTroList.map((khu) => (
                  <option key={khu.MaKhu} value={khu.MaKhu}>
                    {khu.TenKhu}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Tên phòng / Số phòng" required error={errors.tenPhong}>
              <input
                type="text"
                value={tenPhong}
                onChange={(e) => {
                  setTenPhong(e.target.value);
                  if (errors.tenPhong) validateField('tenPhong', e.target.value);
                }}
                onBlur={() => validateField('tenPhong', tenPhong)}
                placeholder="VD: P.111, P.212..."
                className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none transition ${inputErrorClass(
                  errors.tenPhong
                )}`}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField label="Diện tích (m²)" required error={errors.dienTich}>
              <CurrencyInput
                value={dienTich}
                onChange={(val) => {
                  setDienTich(val);
                  validateField('dienTich', val);
                }}
                placeholder="VD: 22"
                suffix="m²"
                className={errors.dienTich ? 'border-red-500 bg-red-50/30' : ''}
              />
            </FormField>

            <FormField label="Giá thuê (VNĐ/tháng)" required error={errors.gia}>
              <CurrencyInput
                value={gia}
                onChange={(val) => {
                  setGia(val);
                  validateField('gia', val);
                }}
                placeholder="VD: 2.300.000"
                suffix="VNĐ"
                className={errors.gia ? 'border-red-500 bg-red-50/30' : ''}
              />
            </FormField>

            <FormField label="Trạng thái phòng">
              <select
                value={trangThai}
                onChange={(e) => setTrangThai(e.target.value as RoomStatus)}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
              >
                <option value="Trong">Đang trống</option>
                <option value="DangThue">Đang thuê</option>
                <option value="BaoTri">Đang bảo trì</option>
              </select>
            </FormField>
          </div>

          <TienIchSelector
            tienIchList={tienIchList}
            selectedIds={selectedTienIch}
            onToggle={(maTI) =>
              setSelectedTienIch((prev) =>
                prev.includes(maTI) ? prev.filter((id) => id !== maTI) : [...prev, maTI]
              )
            }
          />

          <RoomImageManager
            newPreviews={previewUrls}
            newMainIndex={mainImageIndex}
            onSelectMainNew={setMainImageIndex}
            onRemoveNew={handleRemoveFile}
            onAddFiles={handleAddFiles}
            error={imageError}
          />

          <FormActions
            cancelHref="/chuTro/phongTro"
            submitLabel="Tạo Phòng Trọ"
            submittingLabel="Đang tải ảnh & lưu..."
            submitting={submitting}
          />
        </form>
      )}
    </FormPageLayout>
  );
}

export default function ThemPhongTroPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white text-slate-500 text-sm font-bold">
          Đang tải trang tạo phòng trọ...
        </div>
      }
    >
      <ThemPhongTroContent />
    </Suspense>
  );
}