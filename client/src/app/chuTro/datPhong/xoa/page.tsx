// client/src/app/chuTro/datPhong/xoa/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DatPhongItem, TrangThaiDatPhong } from '@/types/datPhong.type';

export const DELETABLE_BOOKING_STATUSES: TrangThaiDatPhong[] = [
  'DaHuy',
  'QuaHanMatCoc',
];

export function canDeleteBooking(trangThai?: TrangThaiDatPhong | string): boolean {
  if (!trangThai) return false;
  return DELETABLE_BOOKING_STATUSES.includes(trangThai as TrangThaiDatPhong);
}

const formatVND = (amount?: number | null) =>
  `${Math.round(Number(amount || 0)).toLocaleString('vi-VN')}đ`;

export interface DatPhongXoaModalProps {
  target: DatPhongItem | null;
  onClose: () => void;
  onConfirm: (item: DatPhongItem) => Promise<void> | void;
}

export function DatPhongXoaModal({
  target,
  onClose,
  onConfirm,
}: DatPhongXoaModalProps) {
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    setDeleteError('');
    setDeleting(false);
  }, [target?.MaDP]);

  if (!target) return null;

  const isExpired = target.TrangThai === 'QuaHanMatCoc';
  const statusLabel = isExpired ? 'Quá hạn mất cọc' : 'Đã hủy (Hết hạn QR)';

  const handleConfirmDelete = async () => {
    try {
      setDeleting(true);
      setDeleteError('');
      await onConfirm(target);
      onClose();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Xóa hóa đơn đặt cọc thất bại.';
      setDeleteError(msg);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={() => !deleting && onClose()}
    >
      <div
        className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center font-extrabold text-sm">
              !
            </span>
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
              Xác nhận xóa hóa đơn đặt cọc
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="w-8 h-8 rounded-full bg-slate-200/70 hover:bg-slate-300 flex items-center justify-center text-xs font-bold text-slate-700 cursor-pointer disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {deleteError && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold">
              {deleteError}
            </div>
          )}

          <p className="text-xs text-slate-600 leading-relaxed">
            Bạn có chắc chắn muốn xóa vĩnh viễn hóa đơn đặt cọc này khỏi hệ thống?
            Hành động này <strong className="text-rose-600">không thể hoàn tác</strong>.
          </p>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs space-y-1.5">
            <div className="flex justify-between gap-2">
              <span className="text-slate-500">Mã tra cứu:</span>
              <strong className="text-slate-900">{target.MaTraCuu}</strong>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-500">Phòng / Cơ sở:</span>
              <strong className="text-slate-900 text-right">
                {target.TenPhong} — {target.TenKhu}
              </strong>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-500">Khách đặt:</span>
              <strong className="text-slate-900 text-right">
                {target.HoTenKhach} ({target.SDT})
              </strong>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-500">Số tiền cọc:</span>
              <strong className="text-teal-700">{formatVND(target.SoTienCoc)}</strong>
            </div>
            <div className="flex justify-between gap-2 pt-1 border-t border-slate-200/80">
              <span className="text-slate-500">Trạng thái:</span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-200 text-slate-700">
                {statusLabel}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={deleting}
              className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-xs font-bold text-slate-700 cursor-pointer disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold cursor-pointer transition shadow-2xs"
            >
              {deleting ? 'Đang xóa...' : 'Xóa vĩnh viễn'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Default export an toàn cho Next.js App Router nếu người dùng truy cập trực tiếp /chuTro/datPhong/xoa
export default function XoaDatPhongFallbackPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/chuTro/datPhong');
  }, [router]);

  return null;
}