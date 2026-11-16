'use client';

import React, { useState, useMemo, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import FormPageLayout from '@/components/common/FormPageLayout';
import { FormField, FormActions } from '@/components/common/FormPrimitives';
import CurrencyInput from '@/components/common/CurrencyInput';
import { useAlertModal } from '@/components/common/AlertModalProvider';
import { dichVuService } from '@/services/dichVu.service';
import {
  Validators,
  useFormValidation,
  inputErrorClass,
} from '@/utils/formValidation';

interface PhiDichVuFormValues {
  tenDV: string;
  donGia: string;
  donViTinh: string;
  moTa: string;
}

export default function ThemPhiDichVuPage() {
  const router = useRouter();
  const { showSuccess, showError } = useAlertModal();

  const [tenDV, setTenDV] = useState<string>('');
  const [donGia, setDonGia] = useState<string>('');
  const [donViTinh, setDonViTinh] = useState<string>('Tháng');
  const [moTa, setMoTa] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Khai báo bộ luật validation cho form Thêm Phí Dịch Vụ
  const validationRules = useMemo(
    () => ({
      tenDV: [
        Validators.required('tên phí dịch vụ'),
        Validators.minLength('Tên phí dịch vụ', 2),
        Validators.maxLength('Tên phí dịch vụ', 100),
      ],
      donGia: [
        Validators.required('đơn giá dịch vụ (VNĐ)'),
        Validators.positiveNumber('Đơn giá dịch vụ', 1000),
      ],
      donViTinh: [
        Validators.required('đơn vị tính (VD: Tháng, Xe/Tháng...)'),
        Validators.maxLength('Đơn vị tính', 50),
      ],
      moTa: [Validators.maxLength('Mô tả chi tiết', 500)],
    }),
    []
  );

  const { errors, validateField, validateAll } =
    useFormValidation<PhiDichVuFormValues>(validationRules);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Kiểm tra toàn bộ các trường input và hiển thị thẻ <small> dưới từng ô nếu có lỗi
    if (!validateAll({ tenDV, donGia, donViTinh, moTa })) {
      return;
    }

    try {
      setSubmitting(true);
      const res = await dichVuService.create({
        TenDV: tenDV.trim(),
        DonGia: Number(donGia),
        DonViTinh: donViTinh.trim(),
        MoTa: moTa.trim(),
      });

      if (res.success) {
        showSuccess(
          res.message || 'Thêm phí dịch vụ thành công!',
          'Thành công',
          1.5,
          () => {
            router.push('/chuTro/phiDichVu');
          }
        );
      } else {
        showError(res.message || 'Không thể thêm phí dịch vụ');
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
      backHref="/chuTro/phiDichVu"
      backLabel="Quay lại danh sách Phí dịch vụ"
      title="Thêm Phí Dịch Vụ Mới"
      subtitle="Tạo khoản phí dịch vụ trong danh mục chung để tích chọn khi lập hợp đồng thuê phòng."
      maxWidth="max-w-3xl"
    >
      {() => (
        <form
          onSubmit={handleSubmit}
          noValidate
          className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-8 shadow-xs space-y-6"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1">
              <FormField label="Tên phí dịch vụ" required error={errors.tenDV}>
                <input
                  type="text"
                  value={tenDV}
                  onChange={(e) => {
                    const val = e.target.value;
                    setTenDV(val);
                    if (errors.tenDV) validateField('tenDV', val);
                  }}
                  onBlur={() => validateField('tenDV', tenDV)}
                  placeholder="VD: WiFi tốc độ cao, Giữ xe máy..."
                  className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none transition ${inputErrorClass(
                    errors.tenDV
                  )}`}
                />
              </FormField>
            </div>

            <div>
              <FormField label="Đơn giá (VNĐ)" required error={errors.donGia}>
                <CurrencyInput
                  value={donGia}
                  onChange={(val) => {
                    setDonGia(val);
                    validateField('donGia', val);
                  }}
                  placeholder="VD: 100.000"
                  suffix="VNĐ"
                  className={
                    errors.donGia
                      ? 'border-red-500 bg-red-50/30 focus:ring-red-300'
                      : ''
                  }
                />
              </FormField>
            </div>

            <div>
              <FormField label="Đơn vị tính" required error={errors.donViTinh}>
                <input
                  type="text"
                  list="donViTinhOptions"
                  value={donViTinh}
                  onChange={(e) => {
                    const val = e.target.value;
                    setDonViTinh(val);
                    if (errors.donViTinh) validateField('donViTinh', val);
                  }}
                  onBlur={() => validateField('donViTinh', donViTinh)}
                  placeholder="VD: Tháng, Xe/Tháng..."
                  className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none transition ${inputErrorClass(
                    errors.donViTinh
                  )}`}
                />
                <datalist id="donViTinhOptions">
                  <option value="Tháng" />
                  <option value="Xe/Tháng" />
                  <option value="Người/Tháng" />
                  <option value="Phòng/Tháng" />
                </datalist>
              </FormField>
            </div>
          </div>

          <FormField
            label="Mô tả chi tiết"
            rightText={`${moTa.length}/500 ký tự`}
            error={errors.moTa}
          >
            <textarea
              rows={4}
              value={moTa}
              onChange={(e) => {
                const val = e.target.value;
                setMoTa(val);
                if (errors.moTa || val.length > 500) {
                  validateField('moTa', val);
                }
              }}
              onBlur={() => validateField('moTa', moTa)}
              placeholder="VD: Bãi để xe tầng trệt có camera an ninh..."
              className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none transition ${inputErrorClass(
                errors.moTa
              )}`}
            />
          </FormField>

          <FormActions
            cancelHref="/chuTro/phiDichVu"
            submitLabel="Tạo Phí Dịch Vụ"
            submittingLabel="Đang lưu..."
            submitting={submitting}
          />
        </form>
      )}
    </FormPageLayout>
  );
}