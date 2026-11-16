'use client';

import React, { useEffect, useState, useCallback, useMemo, FormEvent } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import QuanLyHeader from '@/components/layout/QuanLyHeader';
import CurrencyInput from '@/components/common/CurrencyInput';
import { FormField } from '@/components/common/FormPrimitives';
import { useAlertModal } from '@/components/common/AlertModalProvider';
import { dienNuocService, GiaDienNuocItem } from '@/services/dienNuoc.service';
import {
  Validators,
  useFormValidation,
  inputErrorClass,
} from '@/utils/formValidation';

const cleanDecimal = (val: unknown): string => {
  if (val === null || val === undefined || val === '') return '';
  const num = Math.round(Number(val));
  return Number.isNaN(num) ? '' : String(num);
};

interface GiaDienNuocFormValues {
  giaDien: string;
  giaNuoc: string;
  ngayApDung: string;
}

export default function CapNhatGiaDienNuocPage() {
  const { showSuccess, showError, showConfirm } = useAlertModal();

  const [lichSuGia, setLichSuGia] = useState<GiaDienNuocItem[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [giaDien, setGiaDien] = useState<string>('3800');
  const [giaNuoc, setGiaNuoc] = useState<string>('18000');
  const [ngayApDung, setNgayApDung] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Khai báo bộ luật validation cho Đơn giá Điện, Nước và Ngày áp dụng
  const validationRules = useMemo(
    () => ({
      giaDien: [
        Validators.required('đơn giá điện (VNĐ/kWh)'),
        Validators.positiveNumber('Đơn giá điện', 1000),
      ],
      giaNuoc: [
        Validators.required('đơn giá nước (VNĐ/m³)'),
        Validators.positiveNumber('Đơn giá nước', 1000),
      ],
      ngayApDung: [Validators.required('ngày bắt đầu áp dụng')],
    }),
    []
  );

  const { errors, setErrors, validateField, validateAll } =
    useFormValidation<GiaDienNuocFormValues>(validationRules);

  const formatVND = (val: number | string) => {
    const num = Math.round(Number(val) || 0);
    return num.toLocaleString('vi-VN') + ' đ';
  };

  const formatDateVN = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
  };

  const fetchGia = useCallback(async () => {
    try {
      setLoading(true);
      const res = await dienNuocService.getGiaList();
      if (res.success && res.data) {
        setLichSuGia(res.data.lichSuGia || []);
        if (res.data.giaHienTai && editingId === null) {
          setGiaDien(cleanDecimal(res.data.giaHienTai.GiaDien));
          setGiaNuoc(cleanDecimal(res.data.giaHienTai.GiaNuoc));
        }
      } else {
        showError(res.message || 'Không thể tải đơn giá điện nước');
      }
    } catch {
      showError('Lỗi kết nối máy chủ');
    } finally {
      setLoading(false);
    }
  }, [editingId, showError]);

  useEffect(() => {
    fetchGia();
  }, [fetchGia]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Kiểm tra toàn bộ các ô input và hiển thị thẻ <small> dưới từng ô nếu có lỗi
    if (!validateAll({ giaDien, giaNuoc, ngayApDung })) {
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        GiaDien: Number(giaDien),
        GiaNuoc: Number(giaNuoc),
        NgayApDung: ngayApDung,
      };

      const res = editingId
        ? await dienNuocService.updateGia(editingId, payload)
        : await dienNuocService.createGia(payload);

      if (res.success) {
        showSuccess(res.message || 'Cập nhật đơn giá điện nước thành công!');
        setEditingId(null);
        setErrors({});
        fetchGia();
      } else {
        showError(res.message || 'Không thể lưu đơn giá điện nước');
      }
    } catch {
      showError('Lỗi kết nối máy chủ');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditItem = (item: GiaDienNuocItem) => {
    setEditingId(item.MaGia);
    setGiaDien(cleanDecimal(item.GiaDien));
    setGiaNuoc(cleanDecimal(item.GiaNuoc));
    setNgayApDung(item.NgayApDung);
    setErrors({});
  };

  const handleDeleteItem = (item: GiaDienNuocItem) => {
    showConfirm(
      `Bạn có chắc chắn muốn xóa mốc giá áp dụng ngày ${formatDateVN(
        item.NgayApDung
      )} không?`,
      'Xác nhận xóa mốc giá',
      async () => {
        try {
          const res = await dienNuocService.deleteGia(item.MaGia);
          if (res.success) {
            showSuccess(res.message || 'Đã xóa mốc giá thành công!');
            fetchGia();
          } else {
            showError(res.message || 'Không thể xóa mốc giá này');
          }
        } catch {
          showError('Lỗi kết nối máy chủ');
        }
      },
      'Xác nhận xóa',
      'Hủy'
    );
  };

  return (
    <ProtectedRoute allowedRoles={['ChuTro', 'QuanLy']}>
      {(user) => (
        <div className="min-h-screen flex flex-col bg-white text-slate-900">
          <QuanLyHeader user={user} />

          <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
            <div className="mb-6">
              <Link
                href="/chuTro/dienNuoc"
                className="text-xs font-bold text-slate-600 hover:text-slate-900 no-underline"
              >
                ← Quay lại Quản lý Chỉ số điện nước
              </Link>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-2 tracking-tight">
                Cập Nhật Đơn Giá Điện Nước
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Thiết lập mức giá điện và giá nước.
              </p>
            </div>

            {/* Biểu mẫu Cập nhật / Thêm mốc giá mới */}
            <form
              onSubmit={handleSubmit}
              noValidate
              className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-8 shadow-xs space-y-5"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-sm sm:text-base font-bold text-slate-900">
                  {editingId
                    ? `Chỉnh sửa mốc giá #${editingId}`
                    : 'Áp dụng bảng giá Điện Nước mới'}
                </h2>
                {editingId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(null);
                      setErrors({});
                      setNgayApDung(new Date().toISOString().split('T')[0]);
                    }}
                    className="text-xs font-bold text-slate-500 hover:text-slate-900 cursor-pointer"
                  >
                    Hủy chế độ sửa
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField
                  label="Đơn giá Điện (VNĐ/kWh)"
                  required
                  error={errors.giaDien}
                >
                  <CurrencyInput
                    value={giaDien}
                    onChange={(val) => {
                      setGiaDien(val);
                      validateField('giaDien', val);
                    }}
                    placeholder="VD: 3.800"
                    suffix="đ/kWh"
                    className={
                      errors.giaDien
                        ? 'border-red-500 bg-red-50/30 focus:ring-red-300'
                        : ''
                    }
                  />
                </FormField>

                <FormField
                  label="Đơn giá Nước (VNĐ/m³)"
                  required
                  error={errors.giaNuoc}
                >
                  <CurrencyInput
                    value={giaNuoc}
                    onChange={(val) => {
                      setGiaNuoc(val);
                      validateField('giaNuoc', val);
                    }}
                    placeholder="VD: 18.000"
                    suffix="đ/m³"
                    className={
                      errors.giaNuoc
                        ? 'border-red-500 bg-red-50/30 focus:ring-red-300'
                        : ''
                    }
                  />
                </FormField>

                <FormField
                  label="Ngày bắt đầu áp dụng"
                  required
                  error={errors.ngayApDung}
                >
                  <input
                    type="date"
                    value={ngayApDung}
                    onChange={(e) => {
                      setNgayApDung(e.target.value);
                      validateField('ngayApDung', e.target.value);
                    }}
                    onBlur={() => validateField('ngayApDung', ngayApDung)}
                    className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none transition ${inputErrorClass(
                      errors.ngayApDung
                    )}`}
                  />
                </FormField>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-7 py-3 rounded-full bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  {submitting
                    ? 'Đang lưu...'
                    : editingId
                    ? 'Lưu Thay Đổi'
                    : 'Áp Dụng'}
                </button>
              </div>
            </form>

            {/* Bảng Lịch sử đơn giá điện nước */}
            <div className="mt-8">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 mb-3">
                Lịch Sử Biến Động Đơn Giá ({lichSuGia.length})
              </h3>

              {loading ? (
                <div className="py-12 text-center text-slate-500 text-sm">
                  Đang tải lịch sử giá điện nước...
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase tracking-wider">
                        <th className="py-3.5 px-4 font-bold">Đơn Giá Điện</th>
                        <th className="py-3.5 px-4 font-bold">Đơn Giá Nước</th>
                        <th className="py-3.5 px-4 font-bold">Ngày Áp Dụng</th>
                        <th className="py-3.5 px-4 font-bold text-center">Trạng Thái</th>
                        <th className="py-3.5 px-4 font-bold text-right">Thao Tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-xs">
                      {lichSuGia.map((item, idx) => (
                        <tr
                          key={item.MaGia}
                          className="hover:bg-slate-50/80 transition"
                        >
                          <td className="py-4 px-4 font-bold text-amber-700">
                            {formatVND(item.GiaDien)} / kWh
                          </td>
                          <td className="py-4 px-4 font-bold text-sky-700">
                            {formatVND(item.GiaNuoc)} / m³
                          </td>
                          <td className="py-4 px-4 font-semibold text-slate-700">
                            {formatDateVN(item.NgayApDung)}
                          </td>
                          <td className="py-4 px-4 text-center">
                            {idx === 0 ? (
                              <span className="inline-block px-3 py-1 rounded-full bg-[#00FFCC]/30 border border-[#00FFCC] text-slate-900 text-xs font-bold">
                                Đang áp dụng
                              </span>
                            ) : (
                              <span className="inline-block px-3 py-1 rounded-full bg-slate-100 text-slate-500 text-xs font-semibold">
                                Lịch sử cũ
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleEditItem(item)}
                                className="px-3.5 py-1.5 rounded-xl bg-amber-100 text-amber-800 text-xs font-bold hover:bg-amber-200 cursor-pointer"
                              >
                                Sửa
                              </button>
                              {lichSuGia.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteItem(item)}
                                  className="px-3.5 py-1.5 rounded-xl bg-red-100 text-red-700 text-xs font-bold hover:bg-red-200 cursor-pointer"
                                >
                                  Xóa
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </main>
        </div>
      )}
    </ProtectedRoute>
  );
}