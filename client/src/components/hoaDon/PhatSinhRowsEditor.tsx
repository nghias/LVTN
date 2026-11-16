// client/src/components/hoaDon/PhatSinhRowsEditor.tsx
'use client';

import React from 'react';
import CurrencyInput from '@/components/common/CurrencyInput';
import { FormError, inputErrorClass } from '@/utils/formValidation';

export interface PhatSinhDraftItem {
  TenPS: string;
  Gia: string;
  GhiChu: string;
}

export function validatePhatSinhRow(
  ps: PhatSinhDraftItem,
  showValidation: boolean
) {
  const ten = ps.TenPS.trim();
  const giaStr = String(ps.Gia ?? '').trim();
  const giaNum = Number(giaStr);
  const ghiChu = ps.GhiChu || '';

  const isStarted = ten !== '' || giaStr !== '' || ghiChu.trim() !== '';

  let tenError: string | null = null;
  let giaError: string | null = null;
  let ghiChuError: string | null = null;

  if (showValidation || isStarted) {
    if (!ten) {
      tenError = 'Vui lòng nhập tên khoản phát sinh.';
    } else if (ten.length > 100) {
      tenError = 'Tên khoản phát sinh tối đa 100 ký tự.';
    }

    if (giaStr === '' || Number.isNaN(giaNum) || giaNum < 1000) {
      giaError = 'Số tiền phát sinh phải từ 1.000 VNĐ trở lên.';
    }
  }

  if (ghiChu.length > 255) {
    ghiChuError = 'Ghi chú không vượt quá 255 ký tự.';
  }

  return {
    tenError,
    giaError,
    ghiChuError,
    hasError: Boolean(tenError || giaError || ghiChuError),
  };
}

interface PhatSinhRowsEditorProps {
  items: PhatSinhDraftItem[];
  showValidation?: boolean;
  showLabels?: boolean;
  onChange: (
    index: number,
    field: keyof PhatSinhDraftItem,
    value: string
  ) => void;
  onRemove: (index: number) => void;
}

export default function PhatSinhRowsEditor({
  items,
  showValidation = false,
  showLabels = false,
  onChange,
  onRemove,
}: PhatSinhRowsEditorProps) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-3">
      {items.map((ps, idx) => {
        const { tenError, giaError, ghiChuError } = validatePhatSinhRow(
          ps,
          showValidation
        );

        return (
          <div
            key={idx}
            className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-start bg-white p-3 rounded-2xl border border-slate-200"
          >
            {/* 1. Tên khoản phát sinh */}
            <div className="sm:col-span-4">
              {showLabels && (
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Tên khoản phát sinh <span className="text-red-500">*</span>
                </label>
              )}
              <input
                type="text"
                value={ps.TenPS}
                onChange={(e) => onChange(idx, 'TenPS', e.target.value)}
                placeholder="Tên khoản phát sinh (VD: Sửa bóng đèn...)"
                className={`w-full px-3 py-2.5 rounded-xl border text-xs font-bold focus:outline-none transition ${inputErrorClass(
                  tenError
                )}`}
              />
              <FormError message={tenError} />
            </div>

            {/* 2. Số tiền phát sinh */}
            <div className="sm:col-span-3">
              {showLabels && (
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Số tiền (VNĐ) <span className="text-red-500">*</span>
                </label>
              )}
              <CurrencyInput
                value={ps.Gia}
                onChange={(val) => onChange(idx, 'Gia', val)}
                placeholder="VD: 50.000"
                suffix="VNĐ"
                className={
                  giaError
                    ? 'border-red-500 bg-red-50/30 focus:ring-red-300'
                    : ''
                }
              />
              <FormError message={giaError} />
            </div>

            {/* 3. Ghi chú */}
            <div className="sm:col-span-4">
              {showLabels && (
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Ghi chú
                </label>
              )}
              <input
                type="text"
                value={ps.GhiChu}
                onChange={(e) => onChange(idx, 'GhiChu', e.target.value)}
                placeholder="Ghi chú chi tiết..."
                className={`w-full px-3 py-2.5 rounded-xl border text-xs font-bold focus:outline-none transition ${inputErrorClass(
                  ghiChuError
                )}`}
              />
              <FormError message={ghiChuError} />
            </div>

            {/* 4. Nút Bỏ */}
            <div
              className={`sm:col-span-1 text-right ${
                showLabels ? 'sm:pt-5' : ''
              }`}
            >
              <button
                type="button"
                onClick={() => onRemove(idx)}
                className="px-3 py-2.5 rounded-xl bg-red-100 hover:bg-red-200 text-red-700 text-xs font-bold cursor-pointer transition"
              >
                Bỏ
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}