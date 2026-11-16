'use client';

import { useEffect, useState, useMemo, FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import FormPageLayout from '@/components/common/FormPageLayout';
import { FormField, FormActions } from '@/components/common/FormPrimitives';
import {
  TienIchSelector,
  RoomImageManager,
} from '@/components/phongTro/PhongTroFormShared';
import CurrencyInput from '@/components/common/CurrencyInput';
import { useAlertModal } from '@/components/common/AlertModalProvider';
import { cleanDecimalString } from '@/utils/format.util';
import { PhongTroService } from '@/services/phongTro.service';
import {
  AnhPhongItem,
  KhuTroItem,
  RoomStatus,
  TienIchItem,
} from '@/types/phongTro.type';
import {
  Validators,
  useFormValidation,
  inputErrorClass,
} from '@/utils/formValidation';

export default function SuaPhongTroPage() {
  const params = useParams();
  const router = useRouter();
  const maPhong = Number(params.maPhong);
  const { showSuccess, showError } = useAlertModal();

  const [khuTroList, setKhuTroList] = useState<KhuTroItem[]>([]);
  const [tienIchList, setTienIchList] = useState<TienIchItem[]>([]);

  const [maKhu, setMaKhu] = useState<number>(0);
  const [tenPhong, setTenPhong] = useState('');
  const [dienTich, setDienTich] = useState('');
  const [gia, setGia] = useState('');
  const [trangThai, setTrangThai] = useState<RoomStatus>('Trong');
  const [selectedTienIch, setSelectedTienIch] = useState<number[]>([]);

  const [existingImages, setExistingImages] = useState<AnhPhongItem[]>([]);
  const [deletedMaAnhs, setDeletedMaAnhs] = useState<number[]>([]);
  const [mainMaAnh, setMainMaAnh] = useState<number | null>(null);

  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);
  const [newMainIndex, setNewMainIndex] = useState<number | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
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
    const loadRoomData = async () => {
      try {
        const [khuRes, tiRes, roomRes] = await Promise.all([
          PhongTroService.getKhuTroList(),
          PhongTroService.getAllTienIch(),
          PhongTroService.getPhongDetail(maPhong),
        ]);

        setKhuTroList(khuRes.data || []);
        setTienIchList(tiRes.data || []);

        const room = roomRes.data;
        if (room) {
          setMaKhu(room.MaKhu);
          setTenPhong(room.TenPhong || '');
          setDienTich(cleanDecimalString(room.DienTich));
          setGia(cleanDecimalString(room.Gia));
          setTrangThai(room.TrangThai);
          setSelectedTienIch((room.TienIch || []).map((t) => t.MaTI));

          const imgs = room.DanhSachAnh || [];
          setExistingImages(imgs);
          const currentMain = imgs.find((i) => Number(i.AnhChinh) === 1);
          setMainMaAnh(currentMain ? currentMain.MaAnh : imgs[0]?.MaAnh ?? null);
        }
      } catch (err: unknown) {
        if (err instanceof Error) showError(err.message);
        router.replace('/chuTro/phongTro');
      } finally {
        setLoading(false);
      }
    };
    if (maPhong) loadRoomData();
  }, [maPhong, router, showError]);

  const handleRemoveExistingImage = (maAnh: number) => {
    const remaining = existingImages.filter((img) => img.MaAnh !== maAnh);
    setExistingImages(remaining);
    setDeletedMaAnhs((prev) => [...prev, maAnh]);

    if (mainMaAnh === maAnh) {
      if (remaining.length > 0) setMainMaAnh(remaining[0].MaAnh);
      else if (newFiles.length > 0) {
        setMainMaAnh(null);
        setNewMainIndex(0);
      } else setMainMaAnh(null);
    }
  };

  const handleAddNewFiles = (filesArr: File[]) => {
    const updated = [...newFiles, ...filesArr];
    if (updated.length > 8) {
      setImageError('Chỉ được tải thêm tối đa 8 ảnh mới trong một lần cập nhật.');
      return;
    }
    setImageError(null);
    setNewFiles(updated);
    setNewPreviews((prev) => [...prev, ...filesArr.map((f) => URL.createObjectURL(f))]);
    if (existingImages.length === 0 && newMainIndex === null) setNewMainIndex(0);
  };

  const handleRemoveNewFile = (idx: number) => {
    const updated = newFiles.filter((_, i) => i !== idx);
    setNewFiles(updated);
    setNewPreviews((prev) => prev.filter((_, i) => i !== idx));
    if (updated.length <= 8) setImageError(null);
    if (newMainIndex === idx) {
      setNewMainIndex(null);
      if (existingImages.length > 0) setMainMaAnh(existingImages[0].MaAnh);
    }
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
      formData.append('DeletedMaAnhs', JSON.stringify(deletedMaAnhs));

      if (mainMaAnh) formData.append('MainMaAnh', String(mainMaAnh));
      else if (newMainIndex !== null) formData.append('NewMainIndex', String(newMainIndex));

      newFiles.forEach((file) => formData.append('anhPhong', file));

      await PhongTroService.updatePhong(maPhong, formData);
      showSuccess('Cập nhật thông tin phòng thành công!', 'Thành công', 1.5, () => {
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
      title={`Chỉnh Sửa Phòng Trọ ${tenPhong}`}
      maxWidth="max-w-3xl"
      loading={loading}
      loadingText="Đang tải dữ liệu phòng trọ..."
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

            <FormField label="Tên phòng" required error={errors.tenPhong}>
              <input
                type="text"
                value={tenPhong}
                onChange={(e) => {
                  setTenPhong(e.target.value);
                  if (errors.tenPhong) validateField('tenPhong', e.target.value);
                }}
                onBlur={() => validateField('tenPhong', tenPhong)}
                placeholder="VD: P.101, P.205..."
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
                placeholder="VD: 20"
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
                placeholder="VD: 2.200.000"
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
            existingImages={existingImages}
            mainMaAnh={mainMaAnh}
            onSelectMainExisting={(maAnh) => {
              setMainMaAnh(maAnh);
              setNewMainIndex(null);
            }}
            onRemoveExisting={handleRemoveExistingImage}
            newPreviews={newPreviews}
            newMainIndex={newMainIndex}
            onSelectMainNew={(idx) => {
              setMainMaAnh(null);
              setNewMainIndex(idx);
            }}
            onRemoveNew={handleRemoveNewFile}
            onAddFiles={handleAddNewFiles}
            error={imageError}
          />

          <FormActions
            cancelHref="/chuTro/phongTro"
            submitLabel="Lưu Thay Đổi"
            submittingLabel="Đang cập nhật..."
            submitting={submitting}
          />
        </form>
      )}
    </FormPageLayout>
  );
}