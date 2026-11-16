'use client';

import React, { useEffect, useState, useMemo, FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import FormPageLayout from '@/components/common/FormPageLayout';
import { FormField, FormActions } from '@/components/common/FormPrimitives';
import PhatSinhRowsEditor, {
  PhatSinhDraftItem,
  validatePhatSinhRow,
} from '@/components/hoaDon/PhatSinhRowsEditor';
import { useAlertModal } from '@/components/common/AlertModalProvider';
import { hoaDonService, HoaDonChiTiet } from '@/services/hoaDon.service';
import {
  Validators,
  useFormValidation,
  inputErrorClass,
} from '@/utils/formValidation';

const cleanDecimalString = (val: unknown): string => {
  if (val === null || val === undefined || val === '') return '0';
  const num = Math.round(Number(val));
  return Number.isNaN(num) ? '0' : String(num);
};

interface SuaHoaDonFormValues {
  ngayTinh: string;
  soDienMoi: string;
  soNuocMoi: string;
}

export default function SuaHoaDonPage() {
  const params = useParams();
  const router = useRouter();
  const maHD = Number(params?.maHD);
  const { showSuccess, showError } = useAlertModal();

  const [detail, setDetail] = useState<HoaDonChiTiet | null>(null);
  const [ngayTinh, setNgayTinh] = useState<string>('');
  const [soDienMoi, setSoDienMoi] = useState<string>('0');
  const [soNuocMoi, setSoNuocMoi] = useState<string>('0');
  const [phatSinhList, setPhatSinhList] = useState<PhatSinhDraftItem[]>([]);
  const [attemptedSubmit, setAttemptedSubmit] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const soDienCu = Number(detail?.SoDienCu) || 0;
  const soNuocCu = Number(detail?.SoNuocCu) || 0;
  const giaDien = Math.round(Number(detail?.GiaDien) || 0);
  const giaNuoc = Math.round(Number(detail?.GiaNuoc) || 0);

  // Khai báo bộ luật validation cho form Sửa Hóa Đơn
  const validationRules = useMemo(
    () => ({
      ngayTinh: [Validators.required('ngày tính hóa đơn')],
      soDienMoi: [
        Validators.required('số điện mới (kWh)'),
        (val: any) =>
          Number(val) < soDienCu
            ? `Số điện mới (${val}) không được nhỏ hơn số điện cũ (${soDienCu}).`
            : null,
      ],
      soNuocMoi: [
        Validators.required('số nước mới (m³)'),
        (val: any) =>
          Number(val) < soNuocCu
            ? `Số nước mới (${val}) không được nhỏ hơn số nước cũ (${soNuocCu}).`
            : null,
      ],
    }),
    [soDienCu, soNuocCu]
  );

  const { errors, validateField, validateAll } =
    useFormValidation<SuaHoaDonFormValues>(validationRules);

  const formatVND = (val: number | string) => {
    const num = Math.round(Number(val) || 0);
    return num.toLocaleString('vi-VN') + ' đ';
  };

  useEffect(() => {
    if (!maHD) return;
    let isMounted = true;

    const fetchDetail = async () => {
      try {
        setLoading(true);
        const res = await hoaDonService.getById(maHD);
        if (!isMounted) return;

        if (res.success && res.data) {
          const d: HoaDonChiTiet = res.data;
          setDetail(d);
          setNgayTinh(d.NgayTinh ? d.NgayTinh.slice(0, 10) : '');
          setSoDienMoi(String(d.SoDienMoi ?? 0));
          setSoNuocMoi(String(d.SoNuocMoi ?? 0));
          setPhatSinhList(
            (d.DanhSachPhatSinh || []).map((ps) => ({
              TenPS: ps.TenPS || '',
              Gia: cleanDecimalString(ps.Gia),
              GhiChu: ps.GhiChu || '',
            }))
          );
        } else {
          showError('Không tìm thấy thông tin hóa đơn cần sửa.');
          router.push('/chuTro/hoaDon');
        }
      } catch {
        if (isMounted) showError('Không thể tải dữ liệu hóa đơn.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchDetail();
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maHD]);

  const dienTieuThu = Math.max(0, (Number(soDienMoi) || 0) - soDienCu);
  const nuocTieuThu = Math.max(0, (Number(soNuocMoi) || 0) - soNuocCu);

  const tienPhong = Math.round(Number(detail?.TienPhong) || 0);
  const tienPhuPhi = Math.round(Number(detail?.TienPhuPhi) || 0);
  const tienDienMoi = dienTieuThu * giaDien;
  const tienNuocMoi = nuocTieuThu * giaNuoc;
  const tienPhatSinhMoi = phatSinhList.reduce(
    (sum, item) => sum + (Math.round(Number(item.Gia)) || 0),
    0
  );
  const tongTienMoi =
    tienPhong + tienDienMoi + tienNuocMoi + tienPhuPhi + tienPhatSinhMoi;

  const handleAddPhatSinh = () => {
    setPhatSinhList((prev) => [...prev, { TenPS: '', Gia: '', GhiChu: '' }]);
  };

  const handleRemovePhatSinh = (idx: number) => {
    setPhatSinhList((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleChangePhatSinh = (
    idx: number,
    field: keyof PhatSinhDraftItem,
    value: string
  ) => {
    setPhatSinhList((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setAttemptedSubmit(true);

    // 1. Kiểm tra Ngày tính, Số điện mới và Số nước mới
    const isBasicValid = validateAll({ ngayTinh, soDienMoi, soNuocMoi });

    // 2. Kiểm tra từng dòng Phí phát sinh (nếu có)
    const hasPhatSinhError = phatSinhList.some(
      (ps) => validatePhatSinhRow(ps, true).hasError
    );

    if (!isBasicValid || hasPhatSinhError) {
      return;
    }

    try {
      setSubmitting(true);
      const res = await hoaDonService.update(maHD, {
        SoDienMoi: Number(soDienMoi),
        SoNuocMoi: Number(soNuocMoi),
        NgayTinh: ngayTinh,
        PhatSinhList: phatSinhList
          .filter((ps) => ps.TenPS.trim() !== '')
          .map((ps) => ({
            TenPS: ps.TenPS.trim(),
            Gia: Math.round(Number(ps.Gia)) || 0,
            GhiChu: ps.GhiChu.trim(),
          })),
      });

      if (res.success) {
        showSuccess(
          'Cập nhật hóa đơn thành công!',
          'Thành công',
          1.5,
          () => {
            router.push(`/chuTro/hoaDon/chiTiet/${maHD}`);
          }
        );
      } else {
        showError(res.message || 'Không thể cập nhật hóa đơn.');
      }
    } catch {
      showError('Không thể lưu thay đổi hóa đơn vào lúc này.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FormPageLayout
      allowedRoles={['ChuTro', 'QuanLy']}
      backHref="/chuTro/hoaDon"
      backLabel="Quay lại danh sách Hóa đơn"
      title={`Sửa Hóa Đơn ${
        detail ? `— ${detail.TenPhong} (${detail.TenKhu})` : ''
      }`}
      subtitle="Sửa nhanh chỉ số điện/nước mới hoặc thêm/bỏ các khoản phí phát sinh. Tổng tiền sẽ được hệ thống tính lại tự động."
      maxWidth="max-w-4xl"
      loading={loading || !detail}
      loadingText="Đang tải thông tin hóa đơn..."
    >
      {() => (
        <form
          onSubmit={handleSubmit}
          noValidate
          className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-8 shadow-xs space-y-6"
        >
          {/* Thông tin cố định của phòng & ngày tính */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField label="Phòng & Cơ sở">
              <input
                type="text"
                value={`${detail?.TenPhong} (${detail?.TenKhu})`}
                disabled
                readOnly
                className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-slate-100 text-sm font-bold text-slate-600 cursor-not-allowed"
              />
            </FormField>

            <FormField label="Tiền phòng & Phí dịch vụ cố định">
              <input
                type="text"
                value={`${formatVND(tienPhong)} + DV ${formatVND(tienPhuPhi)}`}
                disabled
                readOnly
                className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-slate-100 text-sm font-bold text-slate-600 cursor-not-allowed"
              />
            </FormField>

            <FormField
              label="Ngày tính hóa đơn"
              required
              error={errors.ngayTinh}
            >
              <input
                type="date"
                value={ngayTinh}
                onChange={(e) => {
                  setNgayTinh(e.target.value);
                  validateField('ngayTinh', e.target.value);
                }}
                onBlur={() => validateField('ngayTinh', ngayTinh)}
                className={`w-full px-4 py-3 rounded-xl border text-sm font-bold focus:outline-none transition ${inputErrorClass(
                  errors.ngayTinh
                )}`}
              />
            </FormField>
          </div>

          {/* Sửa nhanh Chỉ số Điện & Nước */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Khối Điện */}
            <div className="p-5 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-amber-900">
                  1. Chỉ Số Điện ({formatVND(giaDien)}/kWh)
                </h3>
                <span className="text-xs font-bold text-amber-800">
                  +{dienTieuThu} kWh = {formatVND(tienDienMoi)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="Số điện cũ">
                  <input
                    type="text"
                    value={soDienCu}
                    disabled
                    readOnly
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-200/80 text-sm font-bold text-slate-600 cursor-not-allowed"
                  />
                </FormField>

                <FormField
                  label="Số điện mới"
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
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-bold focus:outline-none transition ${inputErrorClass(
                      errors.soDienMoi
                    )}`}
                  />
                </FormField>
              </div>
            </div>

            {/* Khối Nước */}
            <div className="p-5 rounded-2xl bg-sky-50/60 border border-sky-200 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-sky-900">
                  2. Chỉ Số Nước ({formatVND(giaNuoc)}/m³)
                </h3>
                <span className="text-xs font-bold text-sky-800">
                  +{nuocTieuThu} m³ = {formatVND(tienNuocMoi)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="Số nước cũ">
                  <input
                    type="text"
                    value={soNuocCu}
                    disabled
                    readOnly
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-200/80 text-sm font-bold text-slate-600 cursor-not-allowed"
                  />
                </FormField>

                <FormField
                  label="Số nước mới"
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
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-bold focus:outline-none transition ${inputErrorClass(
                      errors.soNuocMoi
                    )}`}
                  />
                </FormField>
              </div>
            </div>
          </div>

          {/* Khu vực Thêm / Bỏ Phí phát sinh (Tái sử dụng PhatSinhRowsEditor) */}
          <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  3. Danh Sách Phí Phát Sinh ({phatSinhList.length} khoản)
                </h3>
                <p className="text-xs text-slate-500">
                  Tổng phí phát sinh: <strong>{formatVND(tienPhatSinhMoi)}</strong>
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddPhatSinh}
                className="px-4 py-2 rounded-full bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 text-xs font-bold cursor-pointer"
              >
                + Thêm khoản phát sinh
              </button>
            </div>

            {phatSinhList.length === 0 ? (
              <p className="text-xs font-semibold text-slate-500 py-2">
                Không có phí phát sinh nào trong hóa đơn này. Nhấn &ldquo;+ Thêm khoản phát sinh&rdquo; nếu cần cộng thêm chi phí.
              </p>
            ) : (
              <PhatSinhRowsEditor
                items={phatSinhList}
                showLabels
                showValidation={attemptedSubmit}
                onChange={handleChangePhatSinh}
                onRemove={handleRemovePhatSinh}
              />
            )}
          </div>

          {/* Bảng đối chiếu Tổng tiền sau khi sửa */}
          <div className="p-5 rounded-2xl bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1 text-xs">
              <p className="text-slate-300 font-bold">
                Tiền phòng ({formatVND(tienPhong)}) + Điện ({formatVND(tienDienMoi)}) + Nước ({formatVND(tienNuocMoi)}) + Dịch vụ ({formatVND(tienPhuPhi)}) + Phát sinh ({formatVND(tienPhatSinhMoi)})
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-slate-300 block">
                Tổng tiền hóa đơn mới:
              </span>
              <span className="text-xl sm:text-2xl font-bold text-[#00FFCC]">
                {formatVND(tongTienMoi)}
              </span>
            </div>
          </div>

          <FormActions
            cancelHref={`/chuTro/hoaDon/chiTiet/${maHD}`}
            submitLabel="Lưu Thay Đổi Hóa Đơn"
            submittingLabel="Đang cập nhật..."
            submitting={submitting}
          />
        </form>
      )}
    </FormPageLayout>
  );
}