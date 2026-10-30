'use client';

import React, { useState } from 'react';
import { hopDongService } from '@/services/hopDong.service';
import { HopDongItem } from '@/types/hopDong.type';

interface XoaHopDongModalProps {
  hopDongCanXoa: HopDongItem | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function XoaHopDongModal({
  hopDongCanXoa,
  onClose,
  onSuccess,
}: XoaHopDongModalProps) {
  const [dangXoa, setDangXoa] = useState<boolean>(false);

  if (!hopDongCanXoa) return null;

  const xuLyXacNhanXoa = async () => {
    setDangXoa(true);
    try {
      const res = await hopDongService.xoaHopDong(hopDongCanXoa.MaHDT);
      alert(res.thongBao);
      onSuccess();
      onClose();
    } catch (error: any) {
      alert(error.message || 'Lỗi khi xóa hợp đồng');
    } finally {
      setDangXoa(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl border border-emerald-200 bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-100 text-lg font-bold text-rose-600">
            !
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#0F172A]">Xác Nhận Xóa Hợp Đồng</h3>
            <p className="text-xs text-slate-500">
              Thao tác này sẽ xóa dữ liệu hợp đồng khỏi hệ thống
            </p>
          </div>
        </div>

        <div className="mb-6 rounded-xl border border-emerald-200 bg-[#ECFDF5]/60 p-4 text-sm text-[#0F172A]">
          <p className="mb-1">
            Mã hợp đồng:{' '}
            <strong className="text-[#059669]">
              #{String(hopDongCanXoa.MaHDT).padStart(3, '0')}
            </strong>
          </p>
          <p className="mb-1">
            Phòng thuê: <strong>{hopDongCanXoa.TenPhong}</strong> ({hopDongCanXoa.TenKhu})
          </p>
          <p>
            Người đại diện: <strong>{hopDongCanXoa.TenDaiDien || 'Chưa cập nhật'}</strong>
          </p>
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={dangXoa}
            className="rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={xuLyXacNhanXoa}
            disabled={dangXoa}
            className="rounded-full bg-rose-600 px-5 py-2 text-sm font-bold text-white shadow-xs hover:bg-rose-700 disabled:opacity-50"
          >
            {dangXoa ? 'Đang xóa...' : 'Xác nhận xóa'}
          </button>
        </div>
      </div>
    </div>
  );
}