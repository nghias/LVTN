// client/src/components/phongTro/KhuTroForm.tsx
'use client';

import React, { useState, useEffect, useMemo, FormEvent } from 'react';
import { QuanLyUserItem } from '@/types/phongTro.type';
import { FormField, FormActions } from '@/components/common/FormPrimitives';
import {
  Validators,
  useFormValidation,
  inputErrorClass,
} from '@/utils/formValidation';

export interface KhuTroFormValues {
  tenKhu: string;
  diaChi: string;
  maND: number;
  moTa: string;
}

interface KhuTroFormProps {
  initialData?: Partial<KhuTroFormValues>;
  quanLyList: QuanLyUserItem[];
  canChangeManager?: boolean;
  submitting: boolean;
  submitLabel: string;
  onSubmit: (values: {
    TenKhu: string;
    DiaChi: string;
    MoTa: string;
    MaND: number;
  }) => Promise<void>;
}

export default function KhuTroForm({
  initialData,
  quanLyList,
  canChangeManager = true,
  submitting,
  submitLabel,
  onSubmit,
}: KhuTroFormProps) {
  const [tenKhu, setTenKhu] = useState(initialData?.tenKhu || '');
  const [diaChi, setDiaChi] = useState(initialData?.diaChi || '');
  const [moTa, setMoTa] = useState(initialData?.moTa || '');
  const [maND, setMaND] = useState<number>(initialData?.maND || 2);

  useEffect(() => {
    if (initialData) {
      if (initialData.tenKhu !== undefined) setTenKhu(initialData.tenKhu);
      if (initialData.diaChi !== undefined) setDiaChi(initialData.diaChi);
      if (initialData.moTa !== undefined) setMoTa(initialData.moTa);
      if (initialData.maND !== undefined && initialData.maND > 0) {
        setMaND(initialData.maND);
      }
    }
  }, [initialData]);

  const rules = useMemo(
    () => ({
      tenKhu: [
        Validators.required('tên khu trọ / cơ sở'),
        Validators.minLength('Tên khu trọ', 3),
        Validators.maxLength('Tên khu trọ', 100),
      ],
      diaChi: [
        Validators.required('địa chỉ chi tiết của khu trọ'),
        Validators.minLength('Địa chỉ chi tiết', 10),
        Validators.maxLength('Địa chỉ chi tiết', 255),
      ],
      maND: [Validators.positiveNumber('Người quản lý phụ trách', 1)],
      moTa: [Validators.maxLength('Mô tả khu trọ', 500)],
    }),
    []
  );

  const { errors, validateField, validateAll } =
    useFormValidation<KhuTroFormValues>(rules);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateAll({ tenKhu, diaChi, maND: maND || 1, moTa })) return;

    await onSubmit({
      TenKhu: tenKhu.trim(),
      DiaChi: diaChi.trim(),
      MoTa: moTa.trim(),
      MaND: maND,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-5"
    >
      <FormField label="Tên khu trọ / Cơ sở" required error={errors.tenKhu}>
        <input
          type="text"
          value={tenKhu}
          onChange={(e) => {
            setTenKhu(e.target.value);
            if (errors.tenKhu) validateField('tenKhu', e.target.value);
          }}
          onBlur={() => validateField('tenKhu', tenKhu)}
          placeholder="VD: Xóm Trọ Cơ sở 4 - Quận 7"
          className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none transition ${inputErrorClass(
            errors.tenKhu
          )}`}
        />
      </FormField>

      <FormField label="Địa chỉ chi tiết" required error={errors.diaChi}>
        <input
          type="text"
          value={diaChi}
          onChange={(e) => {
            setDiaChi(e.target.value);
            if (errors.diaChi) validateField('diaChi', e.target.value);
          }}
          onBlur={() => validateField('diaChi', diaChi)}
          placeholder="Nhập số nhà, tên đường, phường/xã, quận/huyện..."
          className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none transition ${inputErrorClass(
            errors.diaChi
          )}`}
        />
      </FormField>

      {canChangeManager && (
        <FormField
          label="Người Quản lý phụ trách khu trọ"
          required
          error={errors.maND}
        >
          <select
            value={maND}
            onChange={(e) => {
              const val = Number(e.target.value);
              setMaND(val);
              validateField('maND', val);
            }}
            className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none transition ${inputErrorClass(
              errors.maND
            )}`}
          >
            {quanLyList.map((ql) => (
              <option key={ql.MaND} value={ql.MaND}>
                {ql.HoTen} ({ql.Email})
              </option>
            ))}
          </select>
        </FormField>
      )}

      <FormField
        label="Mô tả khu trọ"
        rightText={`${moTa.length}/500 ký tự`}
        error={errors.moTa}
      >
        <textarea
          rows={4}
          value={moTa}
          onChange={(e) => {
            setMoTa(e.target.value);
            if (errors.moTa || e.target.value.length > 500) {
              validateField('moTa', e.target.value);
            }
          }}
          onBlur={() => validateField('moTa', moTa)}
          placeholder="Mô tả đặc điểm khu trọ, vị trí gần trường/chợ..."
          className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none transition ${inputErrorClass(
            errors.moTa
          )}`}
        />
      </FormField>

      <FormActions
        cancelHref="/chuTro/phongTro"
        submitLabel={submitLabel}
        submitting={submitting}
      />
    </form>
  );
}