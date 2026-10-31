'use client';

import React, { useEffect, useState } from 'react';
import { hopDongService } from '@/services/hopDong.service';
import { ChiTietHopDongFull } from '@/types/hopDong.type';
import HopDongPdfModal from '@/components/features/hopDong/HopDongPdf';

interface XuatBanCungModalProps {
  maHDT: number | null;
  onClose: () => void;
}

export default function XuatBanCungModal({ maHDT, onClose }: XuatBanCungModalProps) {
  const [chiTietBanCung, setChiTietBanCung] = useState<ChiTietHopDongFull | null>(null);
  const [dangChuanBi, setDangChuanBi] = useState<boolean>(false);

  useEffect(() => {
    if (!maHDT) {
      setChiTietBanCung(null);
      return;
    }

    setDangChuanBi(true);
    hopDongService
      .xemChiTiet(maHDT)
      .then((data) => setChiTietBanCung(data))
      .catch((error: any) => {
        alert(error.message || 'Không thể chuẩn bị file hợp đồng để tải về');
        onClose();
      })
      .finally(() => setDangChuanBi(false));
  }, [maHDT]);

  if (!maHDT) return null;

  if (dangChuanBi) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50">
        <div className="rounded-2xl border border-emerald-200 bg-white px-6 py-4 text-sm font-semibold text-[#059669] shadow-lg">
          Đang chuẩn bị và tải file PDF hợp đồng #{maHDT} về máy...
        </div>
      </div>
    );
  }

  if (!chiTietBanCung) return null;

  return (
    <HopDongPdfModal
      hopDong={chiTietBanCung}
      tuDongTaiPdf={true}
      onClose={() => {
        setChiTietBanCung(null);
        onClose();
      }}
    />
  );
}