// client/src/components/tienIch/TienIchForm.tsx
'use client';

import React, { useState, useEffect, useMemo, FormEvent } from 'react';
import { FormField, FormActions } from '@/components/common/FormPrimitives';
import { KhuTroOption, PhongOption } from '@/services/tienIch.service';
import {
  Validators,
  useFormValidation,
  inputErrorClass,
} from '@/utils/formValidation';

export interface TienIchFormValues {
  tenTI: string;
  moTa: string;
}

interface TienIchFormProps {
  initialData?: {
    tenTI?: string;
    moTa?: string;
    selectedRoomIds?: number[];
  };
  khuTroList: KhuTroOption[];
  phongList: PhongOption[];
  loadingRooms?: boolean;
  userRole?: string;
  submitting: boolean;
  submitLabel: string;
  submittingLabel?: string;
  onSubmit: (payload: {
    TenTI: string;
    MoTa: string;
    PhongApDung: number[];
  }) => Promise<void>;
}

export default function TienIchForm({
  initialData,
  khuTroList,
  phongList,
  loadingRooms = false,
  userRole = 'ChuTro',
  submitting,
  submitLabel,
  submittingLabel = 'Đang lưu...',
  onSubmit,
}: TienIchFormProps) {
  const [tenTI, setTenTI] = useState<string>(initialData?.tenTI || '');
  const [moTa, setMoTa] = useState<string>(initialData?.moTa || '');
  const [selectedRoomIds, setSelectedRoomIds] = useState<number[]>(
    initialData?.selectedRoomIds || []
  );
  const [activeMaKhu, setActiveMaKhu] = useState<number>(0);

  useEffect(() => {
    if (khuTroList.length === 1) {
      setActiveMaKhu(khuTroList[0].MaKhu);
    }
  }, [khuTroList]);

  useEffect(() => {
    if (!initialData) return;
    if (initialData.tenTI !== undefined) setTenTI(initialData.tenTI);
    if (initialData.moTa !== undefined) setMoTa(initialData.moTa);
    if (initialData.selectedRoomIds !== undefined) {
      setSelectedRoomIds(initialData.selectedRoomIds);
    }
  }, [initialData]);

  // Khai báo bộ luật validation cho Tên tiện ích & Mô tả
  const validationRules = useMemo(
    () => ({
      tenTI: [
        Validators.required('tên tiện ích'),
        Validators.minLength('Tên tiện ích', 2),
        Validators.maxLength('Tên tiện ích', 100),
      ],
      moTa: [Validators.maxLength('Mô tả chi tiết', 500)],
    }),
    []
  );

  const { errors, validateField, validateAll } =
    useFormValidation<TienIchFormValues>(validationRules);

  const filteredRooms =
    activeMaKhu === 0
      ? phongList
      : phongList.filter((p) => Number(p.MaKhu) === Number(activeMaKhu));

  const toggleRoom = (maPhong: number) => {
    setSelectedRoomIds((prev) =>
      prev.includes(maPhong)
        ? prev.filter((id) => id !== maPhong)
        : [...prev, maPhong]
    );
  };

  const selectAllFilteredRooms = () => {
    setSelectedRoomIds((prev) => {
      const next = new Set(prev);
      filteredRooms.forEach((r) => next.add(r.MaPhong));
      return Array.from(next);
    });
  };

  const unselectAllFilteredRooms = () => {
    const filteredIds = new Set(filteredRooms.map((r) => r.MaPhong));
    setSelectedRoomIds((prev) => prev.filter((id) => !filteredIds.has(id)));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Kiểm tra toàn bộ các trường input và hiện thẻ <small> dưới từng ô bị lỗi
    if (!validateAll({ tenTI, moTa })) {
      return;
    }

    await onSubmit({
      TenTI: tenTI.trim(),
      MoTa: moTa.trim(),
      PhongApDung: selectedRoomIds,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-8 shadow-xs space-y-6"
    >
      <FormField label="Tên tiện ích" required error={errors.tenTI}>
        <input
          type="text"
          value={tenTI}
          onChange={(e) => {
            const val = e.target.value;
            setTenTI(val);
            if (errors.tenTI) validateField('tenTI', val);
          }}
          onBlur={() => validateField('tenTI', tenTI)}
          placeholder="VD: Gác lửng, Máy lạnh, Tủ lạnh mini, Giờ giấc tự do..."
          className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none transition ${inputErrorClass(
            errors.tenTI
          )}`}
        />
      </FormField>

      <FormField
        label="Mô tả chi tiết"
        rightText={`${moTa.length}/500 ký tự`}
        error={errors.moTa}
      >
        <textarea
          rows={3}
          value={moTa}
          onChange={(e) => {
            const val = e.target.value;
            setMoTa(val);
            if (errors.moTa || val.length > 500) {
              validateField('moTa', val);
            }
          }}
          onBlur={() => validateField('moTa', moTa)}
          placeholder="VD: Máy lạnh Inverter tiết kiệm điện lắp sẵn trong phòng..."
          className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none transition ${inputErrorClass(
            errors.moTa
          )}`}
        />
      </FormField>

      {/* Khu vực Gán phòng áp dụng */}
      <div className="pt-4 border-t border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900">
              Phòng Trang Bị Tiện Ích Này
            </h2>
            <p className="text-xs text-slate-500">
              Đang chọn{' '}
              <span className="font-bold text-slate-900">
                {selectedRoomIds.length}
              </span>{' '}
              phòng{' '}
              {userRole === 'QuanLy'
                ? 'thuộc cơ sở của bạn'
                : 'trên hệ thống'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={selectAllFilteredRooms}
              className="px-3 py-1.5 rounded-lg bg-[#00FFCC]/30 hover:bg-[#00FFCC]/50 text-slate-900 text-xs font-bold transition cursor-pointer whitespace-nowrap"
            >
              Chọn tất cả phòng đang lọc
            </button>
            <button
              type="button"
              onClick={unselectAllFilteredRooms}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer whitespace-nowrap"
            >
              Bỏ chọn
            </button>
          </div>
        </div>

        {/* Bộ lọc theo Cơ sở */}
        {khuTroList.length > 1 && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveMaKhu(0)}
              className={`px-3.5 py-2 rounded-full text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                activeMaKhu === 0
                  ? 'bg-[#00FFCC] text-slate-900 shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tất cả cơ sở ({phongList.length})
            </button>
            {khuTroList.map((khu) => {
              const countInKhu = phongList.filter(
                (p) => Number(p.MaKhu) === Number(khu.MaKhu)
              ).length;
              return (
                <button
                  key={khu.MaKhu}
                  type="button"
                  onClick={() => setActiveMaKhu(khu.MaKhu)}
                  className={`px-3.5 py-2 rounded-full text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                    activeMaKhu === khu.MaKhu
                      ? 'bg-[#00FFCC] text-slate-900 shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {khu.TenKhu} ({countInKhu})
                </button>
              );
            })}
          </div>
        )}

        {/* Lưới chọn phòng */}
        {loadingRooms ? (
          <p className="text-xs text-slate-500 py-4">
            Đang tải danh sách phòng...
          </p>
        ) : filteredRooms.length === 0 ? (
          <p className="text-xs text-slate-500 py-4">
            Không có phòng nào trong cơ sở này.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-96 overflow-y-auto p-1">
            {filteredRooms.map((room) => {
              const isChecked = selectedRoomIds.includes(room.MaPhong);

              return (
                <div
                  key={room.MaPhong}
                  onClick={() => toggleRoom(room.MaPhong)}
                  className={`p-3 rounded-2xl border transition flex items-center justify-between gap-2 cursor-pointer ${
                    isChecked
                      ? 'bg-[#00FFCC]/20 border-teal-500'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}}
                      className="w-4 h-4 accent-teal-600 cursor-pointer shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {room.TenPhong}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {room.TenKhu}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                      room.TrangThai === 'Trong'
                        ? 'bg-emerald-100 text-emerald-700'
                        : room.TrangThai === 'DangThue'
                        ? 'bg-sky-100 text-sky-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {room.TrangThai === 'Trong'
                      ? 'Trống'
                      : room.TrangThai === 'DangThue'
                      ? 'Đang thuê'
                      : 'Bảo trì'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <FormActions
        cancelHref="/chuTro/tienIch"
        submitLabel={submitLabel}
        submittingLabel={submittingLabel}
        submitting={submitting}
      />
    </form>
  );
}