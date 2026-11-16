'use client';

import React, { useEffect, useState, useMemo, FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
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

// Làm sạch đuôi thập phân .00 từ kiểu DECIMAL(18,2) của MySQL
const cleanDecimalString = (val: unknown): string => {
  if (val === null || val === undefined || val === '') return '';
  const num = Math.round(Number(val));
  return Number.isNaN(num) ? '' : String(num);
};

interface SuaPhiDichVuFormValues {
  tenDV: string;
  donGia: string;
  donViTinh: string;
  moTa: string;
}

export default function SuaPhiDichVuPage() {
  const params = useParams();
  const router = useRouter();
  const maDV = Number(params?.maDV);
  const { showSuccess, showError } = useAlertModal();

  const [tenDV, setTenDV] = useState<string>('');
  const [donGia, setDonGia] = useState<string>('');
  const [donViTinh, setDonViTinh] = useState<string>('');
  const [moTa, setMoTa] = useState<string>('');
  const [soHopDongApDung, setSoHopDongApDung] = useState<number>(0);

  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Khai báo bộ luật validation đồng bộ với trang Thêm Phí Dịch Vụ
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
    useFormValidation<SuaPhiDichVuFormValues>(validationRules);

  useEffect(() => {
    if (!maDV) return;

    const fetchDetail = async () => {
      try {
        setLoading(true);
        const res = await dichVuService.getById(maDV);

        if (res.success && res.data) {
          setTenDV(res.data.TenDV || '');
          setDonGia(cleanDecimalString(res.data.DonGia));
          setDonViTinh(res.data.DonViTinh || '');
          setMoTa(res.data.MoTa || '');
          setSoHopDongApDung(Number(res.data.SoHopDongApDung) || 0);
        } else {
          showError(res.message || 'Không tìm thấy phí dịch vụ cần sửa');
          router.push('/chuTro/phiDichVu');
        }
      } catch {
        showError('Lỗi kết nối khi tải thông tin phí dịch vụ');
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [maDV, router, showError]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Kiểm tra toàn bộ các trường input và hiển thị thẻ <small> dưới từng ô nếu có lỗi
    if (!validateAll({ tenDV, donGia, donViTinh, moTa })) {
      return;
    }

    try {
      setSubmitting(true);
      const res = await dichVuService.update(maDV, {
        TenDV: tenDV.trim(),
        DonGia: Number(donGia),
        DonViTinh: donViTinh.trim(),
        MoTa: moTa.trim(),
      });

      if (res.success) {
        showSuccess(
          res.message || 'Cập nhật phí dịch vụ thành công!',
          'Thành công',
          1.5,
          () => {
            router.push('/chuTro/phiDichVu');
          }
        );
      } else {
        showError(res.message || 'Không thể cập nhật phí dịch vụ');
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
      title="Chỉnh Sửa Phí Dịch Vụ"
      subtitle="Cập nhật tên, đơn giá, đơn vị tính hoặc mô tả cho khoản phí dịch vụ này."
      maxWidth="max-w-3xl"
      loading={loading}
      loadingText="Đang tải thông tin phí dịch vụ..."
    >
      {() => (
        <form
          onSubmit={handleSubmit}
          noValidate
          className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-8 shadow-xs space-y-6"
        >
          {/* Huy hiệu thông báo số hợp đồng đang áp dụng */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-600">
              Mã dịch vụ: #{maDV}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#00FFCC]/30 text-slate-900 border border-[#00FFCC]">
              Đang áp dụng cho {soHopDongApDung} hợp đồng
            </span>
          </div>

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
            submitLabel="Lưu Thay Đổi"
            submittingLabel="Đang cập nhật..."
            submitting={submitting}
          />
        </form>
      )}
    </FormPageLayout>
  );
}