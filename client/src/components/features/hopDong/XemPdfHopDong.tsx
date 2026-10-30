'use client';

import React, { useEffect, useState } from 'react';
import { hopDongService } from '@/services/hopDong.service';
import { ChiTietHopDongFull } from '@/types/hopDong.type';
import HopDongPdfModal from '@/components/features/hopDong/HopDongPdf';

interface XemPdfHopDongModalProps {
  maHDT: number | null;
  onClose: () => void;
}

export default function XemPdfHopDongModal({ maHDT, onClose }: XemPdfHopDongModalProps) {
  const [chiTietPdf, setChiTietPdf] = useState<ChiTietHopDongFull | null>(null);
  const [dangTai, setDangTai] = useState<boolean>(false);

  useEffect(() => {
    if (!maHDT) {
      setChiTietPdf(null);
      return;
    }

    setDangTai(true);
    hopDongService
      .xemChiTiet(maHDT)
      .then((data) => setChiTietPdf(data))
      .catch((error: any) => {
        alert(error.message || 'Không thể mở chi tiết hợp đồng PDF');
        onClose();
      })
      .finally(() => setDangTai(false));
  }, [maHDT]);

  if (!maHDT) return null;

  if (dangTai) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50">
        <div className="rounded-2xl border border-emerald-200 bg-white px-6 py-4 text-sm font-semibold text-[#059669] shadow-lg">
          Đang tải bản xem PDF hợp đồng #{maHDT}...
        </div>
      </div>
    );
  }

  if (!chiTietPdf) return null;

  return (
    <HopDongPdfModal
      hopDong={chiTietPdf}
      tuDongIn={false}
      onClose={() => {
        setChiTietPdf(null);
        onClose();
      }}
    />
  );
}