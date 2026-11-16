// client/src/components/phongTro/PhongTroFormShared.tsx
'use client';

import React, { ChangeEvent } from 'react';
import { AnhPhongItem, TienIchItem } from '@/types/phongTro.type';
import { resolveRoomImageUrl } from '@/services/phongTro.service';
import { FormError } from '@/utils/formValidation';

interface TienIchSelectorProps {
  tienIchList: TienIchItem[];
  selectedIds: number[];
  onToggle: (maTI: number) => void;
}

export function TienIchSelector({
  tienIchList,
  selectedIds,
  onToggle,
}: TienIchSelectorProps) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-700 mb-2">
        Tiện ích trang bị trong phòng
      </label>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {tienIchList.map((ti) => {
          const checked = selectedIds.includes(ti.MaTI);
          return (
            <button
              key={ti.MaTI}
              type="button"
              onClick={() => onToggle(ti.MaTI)}
              className={`p-3 rounded-xl border text-left text-xs font-bold transition cursor-pointer flex items-center justify-between ${
                checked
                  ? 'bg-[#00FFCC]/30 border-teal-500 text-slate-900'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>{ti.TenTI}</span>
              {checked && <span className="text-teal-800">✓</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface RoomImageManagerProps {
  existingImages?: AnhPhongItem[];
  mainMaAnh?: number | null;
  onSelectMainExisting?: (maAnh: number) => void;
  onRemoveExisting?: (maAnh: number) => void;
  newPreviews: string[];
  newMainIndex: number | null;
  onSelectMainNew: (index: number) => void;
  onRemoveNew: (index: number) => void;
  onAddFiles: (files: File[]) => void;
  error?: string | null;
}

export function RoomImageManager({
  existingImages = [],
  mainMaAnh = null,
  onSelectMainExisting,
  onRemoveExisting,
  newPreviews,
  newMainIndex,
  onSelectMainNew,
  onRemoveNew,
  onAddFiles,
  error,
}: RoomImageManagerProps) {
  const totalCount = existingImages.length + newPreviews.length;

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    onAddFiles(Array.from(e.target.files));
    e.target.value = '';
  };

  return (
    <div>
      <label className="block text-xs font-bold text-slate-700 mb-1">
        Hình ảnh phòng trọ ({totalCount} ảnh)
      </label>
      <p className="text-[11px] text-slate-500 mb-3">
        Bấm vào nút <strong>&quot;Đặt làm ảnh chính&quot;</strong> trên bức ảnh bạn muốn hiển thị ở ngoài thẻ phòng.
      </p>

      <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-teal-400 bg-[#00FFCC]/10 hover:bg-[#00FFCC]/25 text-xs font-bold text-slate-900 cursor-pointer transition">
        <span>+ Chọn ảnh từ thiết bị</span>
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileInput}
          className="hidden"
        />
      </label>

      <FormError message={error} />

      {totalCount > 0 && (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {/* 1. Danh sách ảnh đã có trên hệ thống (khi Sửa phòng) */}
          {existingImages.map((img) => {
            const isMain = mainMaAnh === img.MaAnh;
            return (
              <div
                key={`old-${img.MaAnh}`}
                className={`relative rounded-2xl overflow-hidden border-2 ${
                  isMain ? 'border-[#00FFCC] shadow-md' : 'border-slate-200'
                }`}
              >
                <img
                  src={resolveRoomImageUrl(img.DuongDan)}
                  alt="Ảnh phòng"
                  className="w-full h-32 object-cover"
                />
                <div className="p-2 bg-white flex items-center justify-between gap-1">
                  <button
                    type="button"
                    onClick={() => onSelectMainExisting?.(img.MaAnh)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer ${
                      isMain
                        ? 'bg-[#00FFCC] text-slate-900'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {isMain ? '★ Ảnh chính' : 'Đặt làm ảnh chính'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemoveExisting?.(img.MaAnh)}
                    className="px-2 py-1 rounded-lg text-[10px] font-bold bg-red-50 text-red-600 hover:bg-red-100 cursor-pointer"
                  >
                    Xóa
                  </button>
                </div>
              </div>
            );
          })}

          {/* 2. Danh sách ảnh mới chọn từ máy */}
          {newPreviews.map((url, idx) => {
            const isMain = mainMaAnh === null && newMainIndex === idx;
            return (
              <div
                key={`new-${idx}`}
                className={`relative rounded-2xl overflow-hidden border-2 ${
                  isMain ? 'border-[#00FFCC] shadow-md' : 'border-slate-200'
                }`}
              >
                <img
                  src={url}
                  alt={`Ảnh mới ${idx + 1}`}
                  className="w-full h-32 object-cover"
                />
                {existingImages.length > 0 && (
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-slate-900/80 text-[#00FFCC] text-[10px] font-bold">
                    Ảnh mới
                  </span>
                )}
                <div className="p-2 bg-white flex items-center justify-between gap-1">
                  <button
                    type="button"
                    onClick={() => onSelectMainNew(idx)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer ${
                      isMain
                        ? 'bg-[#00FFCC] text-slate-900'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {isMain ? '★ Ảnh chính' : 'Đặt làm ảnh chính'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemoveNew(idx)}
                    className="px-2 py-1 rounded-lg text-[10px] font-bold bg-red-50 text-red-600 hover:bg-red-100 cursor-pointer"
                  >
                    Xóa
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}