// client/src/components/features/hopDongNguoiThue/YeuCauHuyHopDongModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import {
  ChiTietHopDongNguoiThue,
  LY_DO_MAU,
  chuanHoaNFC,
} from '@/utils/hopDongNguoiThue.util';

interface YeuCauHuyHopDongModalProps {
  open: boolean;
  chiTiet: ChiTietHopDongNguoiThue | null;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    lyDoHuy: string;
    ngayDuKienTraPhong: string;
    sdtLienHe: string;
    ghiChuThem: string;
    dongYDieuKhoan: boolean;
  }) => void;
}

export default function YeuCauHuyHopDongModal({
  open,
  chiTiet,
  submitting,
  onClose,
  onSubmit,
}: YeuCauHuyHopDongModalProps) {
  const [ngayDuKienTraPhong, setNgayDuKienTraPhong] = useState<string>('');
  const [lyDoHuy, setLyDoHuy] = useState<string>('');
  const [sdtLienHe, setSdtLienHe] = useState<string>('');
  const [ghiChuThem, setGhiChuThem] = useState<string>('');
  const [dongYDieuKhoan, setDongYDieuKhoan] = useState<boolean>(false);

  useEffect(() => {
    if (open) {
      const next30Days = new Date();
      next30Days.setDate(next30Days.getDate() + 30);
      setNgayDuKienTraPhong(next30Days.toISOString().split('T')[0]);
      setLyDoHuy('');
      setGhiChuThem('');
      setDongYDieuKhoan(false);
    }
  }, [open]);

  if (!open || !chiTiet) return null;

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      lyDoHuy,
      ngayDuKienTraPhong,
      sdtLienHe,
      ghiChuThem,
      dongYDieuKhoan,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-xs p-0 sm:p-4">
      <div className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4">
          <div>
            <span className="text-[11px] font-bold uppercase text-rose-600">
              Thông báo chấm dứt thuê phòng
            </span>
            <h3 className="text-base sm:text-lg font-extrabold text-[#0F172A]">
              Yêu cầu hủy Hợp đồng #{chiTiet.MaHDT}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 font-bold text-slate-600 hover:bg-slate-200 cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleFormSubmit} className="p-5 space-y-4">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900 space-y-1">
            <p className="font-bold">Lưu ý về quy trình báo trả phòng:</p>
            <p>
              Yêu cầu của bạn sẽ được gửi trực tiếp qua hệ thống{' '}
              <strong>Thông báo</strong> tới Quản lý khu trọ (
              <strong>{chuanHoaNFC(chiTiet.TenKhu)}</strong>) và Chủ trọ để sắp xếp
              lịch nghiệm thu phòng, chốt chỉ số điện nước và hoàn trả tiền cọc theo
              điều khoản hợp đồng.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">
                Ngày dự kiến trả phòng <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                min={new Date().toISOString().split('T')[0]}
                value={ngayDuKienTraPhong}
                onChange={(e) => setNgayDuKienTraPhong(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs sm:text-sm focus:border-[#00E6B8] focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">
                Số điện thoại liên hệ bàn giao
              </label>
              <input
                type="tel"
                value={sdtLienHe}
                onChange={(e) => setSdtLienHe(e.target.value)}
                placeholder="VD: 0901234567"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs sm:text-sm focus:border-[#00E6B8] focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-700">
              Chọn nhanh lý do phổ biến:
            </label>
            <div className="mb-2.5 flex flex-wrap gap-1.5">
              {LY_DO_MAU.map((mau) => (
                <button
                  key={mau}
                  type="button"
                  onClick={() => setLyDoHuy(mau)}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 transition hover:border-[#00E6B8] hover:bg-[#00F5C4]/20 cursor-pointer"
                >
                  + {mau}
                </button>
              ))}
            </div>

            <label className="mb-1 block text-xs font-bold text-slate-700">
              Lý do xin hủy hợp đồng chi tiết <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              required
              value={lyDoHuy}
              onChange={(e) => setLyDoHuy(e.target.value)}
              placeholder="Nhập rõ lý do bạn muốn chấm dứt hợp đồng thuê phòng..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs sm:text-sm focus:border-[#00E6B8] focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700">
              Ghi chú thêm về thời gian kiểm tra phòng (Tùy chọn)
            </label>
            <input
              type="text"
              value={ghiChuThem}
              onChange={(e) => setGhiChuThem(e.target.value)}
              placeholder="VD: Có thể kiểm tra phòng vào cuối tuần lúc 9h sáng..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs sm:text-sm focus:border-[#00E6B8] focus:bg-white focus:outline-none"
            />
          </div>

          <label className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 p-3 cursor-pointer">
            <input
              type="checkbox"
              checked={dongYDieuKhoan}
              onChange={(e) => setDongYDieuKhoan(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded accent-[#0F172A]"
            />
            <span className="text-xs leading-relaxed text-slate-700">
              Tôi xác nhận gửi thông báo yêu cầu chấm dứt Hợp đồng{' '}
              <strong>#{chiTiet.MaHDT}</strong> (Phòng{' '}
              <strong>{chuanHoaNFC(chiTiet.TenPhong)}</strong>) tới Quản lý khu trọ và
              Chủ trọ.
            </span>
          </label>

          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-200 cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-[#00F5C4] hover:bg-[#00E0B0] disabled:opacity-50 px-5 py-2.5 text-xs font-extrabold text-[#0F172A] shadow-2xs cursor-pointer"
            >
              {submitting ? 'Đang gửi thông báo...' : 'Gửi yêu cầu tới Ban quản lý'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}