'use client';

import React, { useEffect, useState, useMemo, FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import FormPageLayout from '@/components/common/FormPageLayout';
import { FormField, FormActions } from '@/components/common/FormPrimitives';
import { useAlertModal } from '@/components/common/AlertModalProvider';
import { dienNuocService } from '@/services/dienNuoc.service';
import {
  Validators,
  useFormValidation,
  inputErrorClass,
} from '@/utils/formValidation';

interface SuaChiSoFormValues {
  ngayGhi: string;
  soDienMoi: string;
  soNuocMoi: string;
}

export default function SuaChiSoDienNuocPage() {
  const params = useParams();
  const router = useRouter();
  const maCS = Number(params?.maCS);
  const { showSuccess, showError } = useAlertModal();

  const [tenPhong, setTenPhong] = useState<string>('');
  const [tenKhu, setTenKhu] = useState<string>('');
  const [ngayGhi, setNgayGhi] = useState<string>('');
  const [soDienCu, setSoDienCu] = useState<number>(0);
  const [soDienMoi, setSoDienMoi] = useState<string>('0');
  const [soNuocCu, setSoNuocCu] = useState<number>(0);
  const [soNuocMoi, setSoNuocMoi] = useState<string>('0');

  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Khai báo bộ luật validation phụ thuộc vào soDienCu và soNuocCu
  const validationRules = useMemo(
    () => ({
      ngayGhi: [Validators.required('ngày ghi sổ')],
      soDienMoi: [
        Validators.required('số điện mới (kWh)'),
        (val: any) =>
          Number(val) < soDienCu
            ? `Số điện mới (${val}) không được nhỏ hơn số điện cũ cố định (${soDienCu}).`
            : null,
      ],
      soNuocMoi: [
        Validators.required('số nước mới (m³)'),
        (val: any) =>
          Number(val) < soNuocCu
            ? `Số nước mới (${val}) không được nhỏ hơn số nước cũ cố định (${soNuocCu}).`
            : null,
      ],
    }),
    [soDienCu, soNuocCu]
  );

  const { errors, validateField, validateAll } =
    useFormValidation<SuaChiSoFormValues>(validationRules);

  useEffect(() => {
    if (!maCS) return;
    let isMounted = true;

    const fetchDetail = async () => {
      try {
        setLoading(true);
        const detailRes = await dienNuocService.getById(maCS);
        if (!isMounted) return;

        if (detailRes.success && detailRes.data) {
          const d = detailRes.data;
          setTenPhong(d.TenPhong || ``);
          setTenKhu(d.TenKhu || '');
          setNgayGhi(d.NgayGhi || '');
          setSoDienCu(Number(d.SoDienCu) || 0);
          setSoDienMoi(String(d.SoDienMoi ?? 0));
          setSoNuocCu(Number(d.SoNuocCu) || 0);
          setSoNuocMoi(String(d.SoNuocMoi ?? 0));
        } else {
          showError(
            detailRes.message || 'Không tìm thấy chỉ số điện nước cần sửa'
          );
          router.push('/chuTro/dienNuoc');
        }
      } catch {
        if (isMounted) showError('Lỗi kết nối máy chủ');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchDetail();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maCS]);

  const dienTieuThu = Math.max(0, (Number(soDienMoi) || 0) - soDienCu);
  const nuocTieuThu = Math.max(0, (Number(soNuocMoi) || 0) - soNuocCu);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Kiểm tra toàn bộ các ô input và hiển thị thẻ <small> dưới từng ô nếu có lỗi
    if (!validateAll({ ngayGhi, soDienMoi, soNuocMoi })) {
      return;
    }

    try {
      setSubmitting(true);
      const res = await dienNuocService.updateChiSo(maCS, {
        SoDienMoi: Number(soDienMoi),
        SoNuocMoi: Number(soNuocMoi),
        NgayGhi: ngayGhi,
      });

      if (res.success) {
        showSuccess(
          res.message || 'Cập nhật chỉ số điện nước thành công!',
          'Thành công',
          1.5,
          () => {
            router.push('/chuTro/dienNuoc');
          }
        );
      } else {
        showError(res.message || 'Không thể cập nhật chỉ số điện nước');
      }
    } catch {
      showError('Lỗi kết nối máy chủ');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FormPageLayout
      allowedRoles={['ChuTro', 'QuanLy']}
      backHref="/chuTro/dienNuoc"
      backLabel="Quay lại danh sách Chỉ số điện nước"
      title="Sửa Chỉ Số Điện Nước"
      subtitle={`Đang chỉnh sửa bản ghi chỉ số của ${tenPhong} (${tenKhu})`}
      maxWidth="max-w-3xl"
      loading={loading}
      loadingText="Đang tải thông tin chỉ số điện nước..."
    >
      {() => (
        <form
          onSubmit={handleSubmit}
          noValidate
          className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-8 shadow-xs space-y-6"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Phòng trọ">
              <input
                type="text"
                value={`${tenPhong} (${tenKhu})`}
                disabled
                readOnly
                className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm bg-slate-100 text-slate-600 font-bold cursor-not-allowed select-none"
              />
            </FormField>

            <FormField label="Ngày ghi sổ" required error={errors.ngayGhi}>
              <input
                type="date"
                value={ngayGhi}
                onChange={(e) => {
                  setNgayGhi(e.target.value);
                  validateField('ngayGhi', e.target.value);
                }}
                onBlur={() => validateField('ngayGhi', ngayGhi)}
                className={`w-full px-4 py-3 border rounded-xl text-sm font-bold focus:outline-none transition ${inputErrorClass(
                  errors.ngayGhi
                )}`}
              />
            </FormField>
          </div>

          {/* Khối sửa Chỉ số Điện */}
          <div className="p-5 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-amber-900">
                1. Chỉ Số Điện Năng (kWh)
              </h3>
              <span className="text-xs font-bold text-amber-800">
                Tiêu thụ: +{dienTieuThu} kWh
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Số điện cũ (kWh)">
                <input
                  type="text"
                  value={soDienCu}
                  disabled
                  readOnly
                  tabIndex={-1}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm bg-slate-200/80 text-slate-600 font-bold cursor-not-allowed select-none"
                />
              </FormField>

              <FormField
                label="Số điện mới (kWh)"
                required
                error={errors.soDienMoi}
              >
                <input
                  type="text"
                  inputMode="numeric"
                  value={soDienMoi}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/\D/g, '');
                    setSoDienMoi(clean);
                    validateField('soDienMoi', clean);
                  }}
                  onBlur={() => validateField('soDienMoi', soDienMoi)}
                  placeholder={`>= ${soDienCu}`}
                  className={`w-full px-4 py-3 border rounded-xl text-sm font-bold focus:outline-none transition ${inputErrorClass(
                    errors.soDienMoi
                  )}`}
                />
              </FormField>
            </div>
          </div>

          {/* Khối sửa Chỉ số Nước */}
          <div className="p-5 rounded-2xl bg-sky-50/60 border border-sky-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-sky-900">
                2. Chỉ Số Nước Sạch (m³)
              </h3>
              <span className="text-xs font-bold text-sky-800">
                Tiêu thụ: +{nuocTieuThu} m³
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Số nước cũ (m³)">
                <input
                  type="text"
                  value={soNuocCu}
                  disabled
                  readOnly
                  tabIndex={-1}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm bg-slate-200/80 text-slate-600 font-bold cursor-not-allowed select-none"
                />
              </FormField>

              <FormField
                label="Số nước mới (m³)"
                required
                error={errors.soNuocMoi}
              >
                <input
                  type="text"
                  inputMode="numeric"
                  value={soNuocMoi}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/\D/g, '');
                    setSoNuocMoi(clean);
                    validateField('soNuocMoi', clean);
                  }}
                  onBlur={() => validateField('soNuocMoi', soNuocMoi)}
                  placeholder={`>= ${soNuocCu}`}
                  className={`w-full px-4 py-3 border rounded-xl text-sm font-bold focus:outline-none transition ${inputErrorClass(
                    errors.soNuocMoi
                  )}`}
                />
              </FormField>
            </div>
          </div>

          <FormActions
            cancelHref="/chuTro/dienNuoc"
            submitLabel="Lưu Thay Đổi"
            submittingLabel="Đang cập nhật..."
            submitting={submitting}
          />
        </form>
      )}
    </FormPageLayout>
  );
}