// client/src/app/chuTro/thanhToan/thietLap/page.tsx
'use client';

import React, { useEffect, useState, useMemo, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import FormPageLayout from '@/components/common/FormPageLayout';
import { FormField, FormActions } from '@/components/common/FormPrimitives';
import { useAlertModal } from '@/components/common/AlertModalProvider';
import { thanhToanService } from '@/services/thanhToan.service';
import {
  Validators,
  useFormValidation,
  inputErrorClass,
} from '@/utils/formValidation';

interface ThietLapThanhToanFormValues {
  TenNganHang: string;
  STK: string;
  ChuTaiKhoan: string;
  PayosClientId: string;
  PayosApiKey: string;
  PayosChecksumKey: string;
}

export default function ThietLapThongTinThanhToanPage() {
  const router = useRouter();
  const { showSuccess, showError, showConfirm } = useAlertModal();

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [canEdit, setCanEdit] = useState<boolean>(false);
  const [showSecrets, setShowSecrets] = useState<boolean>(false);

  const [maTT, setMaTT] = useState<number>(1);
  const [formData, setFormData] = useState<ThietLapThanhToanFormValues>({
    TenNganHang: '',
    STK: '',
    ChuTaiKhoan: '',
    PayosClientId: '',
    PayosApiKey: '',
    PayosChecksumKey: '',
  });

  // Khai báo bộ luật validation cho cả Thông tin Ngân hàng & Bộ 3 khóa PayOS
  const validationRules = useMemo(
    () => ({
      TenNganHang: [
        Validators.required('tên ngân hàng thụ hưởng'),
        Validators.minLength('Tên ngân hàng', 2),
        Validators.maxLength('Tên ngân hàng', 100),
      ],
      STK: [
        Validators.required('số tài khoản nhận tiền'),
        Validators.minLength('Số tài khoản', 6),
        Validators.maxLength('Số tài khoản', 25),
        (val: any) => {
          const str = String(val ?? '').trim();
          if (str && !/^[a-zA-Z0-9]+$/.test(str)) {
            return 'Số tài khoản chỉ được chứa chữ cái và chữ số (không chứa khoảng trắng hoặc ký tự đặc biệt).';
          }
          return null;
        },
      ],
      ChuTaiKhoan: [
        Validators.required('tên chủ tài khoản (in hoa không dấu)'),
        Validators.minLength('Tên chủ tài khoản', 3),
        Validators.maxLength('Tên chủ tài khoản', 100),
      ],
      PayosClientId: [
        (val: any, allValues?: ThietLapThanhToanFormValues) => {
          const cId = String(val ?? '').trim();
          const aKey = String(allValues?.PayosApiKey ?? '').trim();
          const csKey = String(allValues?.PayosChecksumKey ?? '').trim();
          if ((aKey || csKey) && !cId) {
            return 'Vui lòng nhập PayOS Client ID (hoặc xóa trống cả 3 khóa để dùng mặc định).';
          }
          return null;
        },
      ],
      PayosApiKey: [
        (val: any, allValues?: ThietLapThanhToanFormValues) => {
          const aKey = String(val ?? '').trim();
          const cId = String(allValues?.PayosClientId ?? '').trim();
          const csKey = String(allValues?.PayosChecksumKey ?? '').trim();
          if ((cId || csKey) && !aKey) {
            return 'Vui lòng nhập PayOS API Key (hoặc xóa trống cả 3 khóa để dùng mặc định).';
          }
          return null;
        },
      ],
      PayosChecksumKey: [
        (val: any, allValues?: ThietLapThanhToanFormValues) => {
          const csKey = String(val ?? '').trim();
          const cId = String(allValues?.PayosClientId ?? '').trim();
          const aKey = String(allValues?.PayosApiKey ?? '').trim();
          if ((cId || aKey) && !csKey) {
            return 'Vui lòng nhập PayOS Checksum Key (hoặc xóa trống cả 3 khóa để dùng mặc định).';
          }
          if (csKey && csKey.length < 32) {
            return 'PayOS Checksum Key không hợp lệ (thường gồm 64 ký tự hex).';
          }
          return null;
        },
      ],
    }),
    []
  );

  const { errors, validateField, validateAll } =
    useFormValidation<ThietLapThanhToanFormValues>(validationRules);

  useEffect(() => {
    const loadInfo = async () => {
      try {
        setLoading(true);
        const res = await thanhToanService.getThongTinThanhToan();
        if (res.success) {
          setCanEdit(Boolean(res.canEdit));
          if (res.data) {
            setMaTT(res.data.MaTT || 1);
            setFormData({
              TenNganHang: res.data.TenNganHang || '',
              STK: res.data.STK || '',
              ChuTaiKhoan: res.data.ChuTaiKhoan || '',
              PayosClientId: res.data.PayosClientId || '',
              PayosApiKey: res.data.PayosApiKey || '',
              PayosChecksumKey: res.data.PayosChecksumKey || '',
            });
          }
        }
      } catch {
        showError('Không thể tải thông tin ngân hàng!');
      } finally {
        setLoading(false);
      }
    };
    loadInfo();
  }, [showError]);

  const handleFieldChange = (
    field: keyof ThietLapThanhToanFormValues,
    value: string
  ) => {
    const nextData = { ...formData, [field]: value };
    setFormData(nextData);
    if (errors[field]) {
      validateField(field, value, nextData);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!canEdit) {
      showError('Chỉ Chủ trọ mới có quyền thay đổi thông tin thanh toán!');
      return;
    }

    // Kiểm tra toàn bộ các ô input và hiện thẻ <small> dưới từng ô bị lỗi
    if (!validateAll(formData)) {
      return;
    }

    const cId = formData.PayosClientId.trim();
    const aKey = formData.PayosApiKey.trim();
    const csKey = formData.PayosChecksumKey.trim();

    showConfirm(
      `Xác nhận cập nhật tài khoản nhận thanh toán sang ${formData.TenNganHang.trim()} - STK ${formData.STK.trim()} (${formData.ChuTaiKhoan.trim()})?`,
      'Xác nhận lưu thông tin thanh toán',
      async () => {
        try {
          setSaving(true);
          const res = await thanhToanService.updateThongTinThanhToan({
            MaTT: maTT,
            TenNganHang: formData.TenNganHang.trim(),
            STK: formData.STK.trim(),
            ChuTaiKhoan: formData.ChuTaiKhoan.trim().toUpperCase(),
            PayosClientId: cId,
            PayosApiKey: aKey,
            PayosChecksumKey: csKey,
          });
          if (res.success) {
            showSuccess(
              'Đã cập nhật thông tin tài khoản ngân hàng và cấu hình PayOS thành công!',
              'Thành công',
              2,
              () => {
                router.push('/chuTro/thanhToan');
              }
            );
          } else {
            showError(res.message || 'Không thể cập nhật thông tin thanh toán');
          }
        } catch {
          showError('Không thể cập nhật thông tin thanh toán');
        } finally {
          setSaving(false);
        }
      },
      'Xác nhận',
      'Hủy'
    );
  };

  return (
    <FormPageLayout
      allowedRoles={['ChuTro', 'QuanLy']}
      backHref="/chuTro/thanhToan"
      backLabel="Quay lại danh sách Thanh toán"
      title="Thiết Lập Thông Tin Thanh Toán"
      subtitle="Cập nhật tài khoản ngân hàng thụ hưởng và khóa kết nối cổng xác thực tự động PayOS"
      maxWidth="max-w-3xl"
      loading={loading}
      loadingText="Đang tải thông tin thiết lập thanh toán..."
    >
      {(user) =>
        !canEdit || user.Quyen !== 'ChuTro' ? (
          <div className="bg-slate-50 rounded-3xl border border-slate-200 p-8 text-center space-y-4">
            <span className="inline-block px-3.5 py-1 rounded-full bg-red-100 text-red-700 border border-red-300 text-xs font-bold">
              Giới hạn phân quyền
            </span>
            <h2 className="text-lg font-bold text-slate-900">
              Chỉ Chủ Trọ Mới Được Thay Đổi Thông Tin Thanh Toán
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Quản lý cơ sở chỉ có quyền xem lịch sử và xác nhận thu tiền mặt, không có quyền thay đổi tài khoản ngân hàng nhận tiền.
            </p>
            <Link
              href="/chuTro/thanhToan"
              className="inline-block px-6 py-2.5 rounded-full bg-[#00FFCC] text-slate-900 border border-teal-300 text-xs font-bold no-underline"
            >
              ← Quay lại trang Quản lý thanh toán
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs">
            <form onSubmit={handleSubmit} noValidate className="space-y-6">
              {/* PHẦN 1: THÔNG TIN TÀI KHOẢN NGÂN HÀNG HIỂN THỊ */}
              <div className="space-y-4">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  1. Thông tin tài khoản ngân hàng thụ hưởng
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    label="Ngân hàng thụ hưởng"
                    required
                    error={errors.TenNganHang}
                  >
                    <input
                      type="text"
                      value={formData.TenNganHang}
                      onChange={(e) =>
                        handleFieldChange('TenNganHang', e.target.value)
                      }
                      onBlur={() =>
                        validateField('TenNganHang', formData.TenNganHang, formData)
                      }
                      placeholder="VD: MB Bank, Vietcombank, BIDV..."
                      className={`w-full px-4 py-2.5 border rounded-xl text-sm text-slate-900 focus:outline-none transition ${inputErrorClass(
                        errors.TenNganHang
                      )}`}
                    />
                  </FormField>

                  <FormField
                    label="Số tài khoản nhận tiền"
                    required
                    error={errors.STK}
                  >
                    <input
                      type="text"
                      value={formData.STK}
                      onChange={(e) =>
                        handleFieldChange('STK', e.target.value.trim())
                      }
                      onBlur={() =>
                        validateField('STK', formData.STK, formData)
                      }
                      placeholder="VD: 0931493785"
                      className={`w-full px-4 py-2.5 border rounded-xl text-sm font-bold text-slate-900 focus:outline-none transition ${inputErrorClass(
                        errors.STK
                      )}`}
                    />
                  </FormField>
                </div>

                <FormField
                  label="Tên chủ tài khoản (In hoa không dấu)"
                  required
                  error={errors.ChuTaiKhoan}
                >
                  <input
                    type="text"
                    value={formData.ChuTaiKhoan}
                    onChange={(e) =>
                      handleFieldChange(
                        'ChuTaiKhoan',
                        e.target.value.toUpperCase()
                      )
                    }
                    onBlur={() =>
                      validateField(
                        'ChuTaiKhoan',
                        formData.ChuTaiKhoan,
                        formData
                      )
                    }
                    placeholder="VD: TRAN TUAN NGHIA"
                    className={`w-full px-4 py-2.5 border rounded-xl text-sm uppercase font-bold text-slate-900 focus:outline-none transition ${inputErrorClass(
                      errors.ChuTaiKhoan
                    )}`}
                  />
                </FormField>
              </div>

              {/* PHẦN 2: BỘ 3 KHÓA KẾT NỐI CỔNG PAYOS */}
              <div className="pt-5 border-t border-slate-200 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                      2. Cấu hình khóa kết nối cổng PayOS
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Khi đổi sang tài khoản ngân hàng mới, hãy liên kết ngân hàng đó trên{' '}
                      <a
                        href="https://my.payos.vn"
                        target="_blank"
                        rel="noreferrer"
                        className="text-teal-700 font-bold underline"
                      >
                        my.payos.vn
                      </a>{' '}
                      và dán bộ 3 khóa Kênh thanh toán vào dưới đây để hệ thống tự động sinh QR và gạch nợ sang tài khoản mới.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowSecrets(!showSecrets)}
                    className="px-3.5 py-1.5 rounded-full border border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 cursor-pointer transition"
                  >
                    {showSecrets ? 'Ẩn mã khóa' : 'Hiện mã khóa'}
                  </button>
                </div>

                <div className="space-y-3.5 bg-slate-50/80 p-4 rounded-2xl border border-slate-200">
                  <FormField
                    label="PayOS Client ID"
                    error={errors.PayosClientId}
                  >
                    <input
                      type={showSecrets ? 'text' : 'password'}
                      value={formData.PayosClientId}
                      onChange={(e) =>
                        handleFieldChange('PayosClientId', e.target.value)
                      }
                      onBlur={() =>
                        validateField(
                          'PayosClientId',
                          formData.PayosClientId,
                          formData
                        )
                      }
                      placeholder="Để trống nếu dùng khóa mặc định của hệ thống"
                      className={`w-full px-4 py-2.5 border rounded-xl text-xs sm:text-sm font-mono text-slate-900 focus:outline-none transition ${inputErrorClass(
                        errors.PayosClientId
                      )}`}
                    />
                  </FormField>

                  <FormField label="PayOS API Key" error={errors.PayosApiKey}>
                    <input
                      type={showSecrets ? 'text' : 'password'}
                      value={formData.PayosApiKey}
                      onChange={(e) =>
                        handleFieldChange('PayosApiKey', e.target.value)
                      }
                      onBlur={() =>
                        validateField(
                          'PayosApiKey',
                          formData.PayosApiKey,
                          formData
                        )
                      }
                      placeholder="Để trống nếu dùng khóa mặc định của hệ thống"
                      className={`w-full px-4 py-2.5 border rounded-xl text-xs sm:text-sm font-mono text-slate-900 focus:outline-none transition ${inputErrorClass(
                        errors.PayosApiKey
                      )}`}
                    />
                  </FormField>

                  <FormField
                    label="PayOS Checksum Key"
                    error={errors.PayosChecksumKey}
                  >
                    <input
                      type={showSecrets ? 'text' : 'password'}
                      value={formData.PayosChecksumKey}
                      onChange={(e) =>
                        handleFieldChange('PayosChecksumKey', e.target.value)
                      }
                      onBlur={() =>
                        validateField(
                          'PayosChecksumKey',
                          formData.PayosChecksumKey,
                          formData
                        )
                      }
                      placeholder="Để trống nếu dùng khóa mặc định của hệ thống"
                      className={`w-full px-4 py-2.5 border rounded-xl text-xs sm:text-sm font-mono text-slate-900 focus:outline-none transition ${inputErrorClass(
                        errors.PayosChecksumKey
                      )}`}
                    />
                  </FormField>
                </div>
              </div>

              <FormActions
                cancelHref="/chuTro/thanhToan"
                submitLabel="Lưu Thông Tin Thanh Toán"
                submittingLabel="Đang lưu..."
                submitting={saving}
              />
            </form>
          </div>
        )
      }
    </FormPageLayout>
  );
}