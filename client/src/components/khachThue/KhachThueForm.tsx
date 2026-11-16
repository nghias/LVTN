// client/src/components/khachThue/KhachThueForm.tsx
'use client';

import React, { useState, useEffect, useMemo, FormEvent } from 'react';
import { FormField, FormActions } from '@/components/common/FormPrimitives';
import { KhachThuePayload } from '@/services/khachThue.service';
import {
  Validators,
  useFormValidation,
  inputErrorClass,
} from '@/utils/formValidation';

export interface KhachThueFormState {
  tenTK: string;
  matKhau: string;
  hoTen: string;
  gioiTinh: string;
  namSinh: string;
  sdt: string;
  cccd: string;
  ngayCap: string;
  noiCap: string;
  email: string;
  ngheNghiep: string;
  diaChi: string;
}

interface KhachThueFormProps {
  mode: 'create' | 'edit';
  initialData?: Partial<KhachThueFormState>;
  submitting: boolean;
  submitLabel: string;
  submittingLabel?: string;
  onSubmit: (payload: KhachThuePayload) => Promise<void>;
}

export default function KhachThueForm({
  mode,
  initialData,
  submitting,
  submitLabel,
  submittingLabel = 'Đang lưu...',
  onSubmit,
}: KhachThueFormProps) {
  const [tenTK, setTenTK] = useState(initialData?.tenTK || '');
  const [matKhau, setMatKhau] = useState(initialData?.matKhau || '');
  const [showPassword, setShowPassword] = useState(false);

  const [hoTen, setHoTen] = useState(initialData?.hoTen || '');
  const [gioiTinh, setGioiTinh] = useState(initialData?.gioiTinh || 'Nam');
  const [namSinh, setNamSinh] = useState(initialData?.namSinh || '');
  const [sdt, setSdt] = useState(initialData?.sdt || '');
  const [cccd, setCccd] = useState(initialData?.cccd || '');
  const [ngayCap, setNgayCap] = useState(initialData?.ngayCap || '');
  const [noiCap, setNoiCap] = useState(
    initialData?.noiCap ??
      (mode === 'create' ? 'Cục Cảnh sát QLHC về TTXH' : '')
  );
  const [email, setEmail] = useState(initialData?.email || '');
  const [ngheNghiep, setNgheNghiep] = useState(initialData?.ngheNghiep || '');
  const [diaChi, setDiaChi] = useState(initialData?.diaChi || '');

  useEffect(() => {
    if (!initialData) return;
    if (initialData.tenTK !== undefined) setTenTK(initialData.tenTK);
    if (initialData.hoTen !== undefined) setHoTen(initialData.hoTen);
    if (initialData.gioiTinh !== undefined) setGioiTinh(initialData.gioiTinh || 'Nam');
    if (initialData.namSinh !== undefined) setNamSinh(initialData.namSinh);
    if (initialData.sdt !== undefined) setSdt(initialData.sdt);
    if (initialData.cccd !== undefined) setCccd(initialData.cccd);
    if (initialData.ngayCap !== undefined) setNgayCap(initialData.ngayCap);
    if (initialData.noiCap !== undefined) setNoiCap(initialData.noiCap);
    if (initialData.email !== undefined) setEmail(initialData.email);
    if (initialData.ngheNghiep !== undefined) setNgheNghiep(initialData.ngheNghiep);
    if (initialData.diaChi !== undefined) setDiaChi(initialData.diaChi);
  }, [initialData]);

  // Khai báo bộ luật validation cho cả 2 chế độ Thêm & Sửa
  const validationRules = useMemo(
    () => ({
      tenTK: [
        Validators.required('tên tài khoản đăng nhập'),
        Validators.minLength('Tên tài khoản', 3),
        Validators.maxLength('Tên tài khoản', 100),
      ],
      matKhau:
        mode === 'create'
          ? [
              Validators.required('mật khẩu khởi tạo'),
              Validators.minLength('Mật khẩu khởi tạo', 6),
              Validators.maxLength('Mật khẩu khởi tạo', 50),
            ]
          : [],
      hoTen: [
        Validators.required('họ và tên đầy đủ của khách thuê'),
        Validators.minLength('Họ và tên', 2),
        Validators.maxLength('Họ và tên', 100),
      ],
      namSinh: [
        (val: any) => {
          const str = String(val ?? '').trim();
          if (!str) return null;
          const year = Number(str);
          const currentYear = new Date().getFullYear();
          if (Number.isNaN(year) || year < 1930 || year > currentYear) {
            return `Năm sinh phải nằm trong khoảng từ 1930 đến ${currentYear}.`;
          }
          return null;
        },
      ],
      sdt: [
        Validators.required('số điện thoại liên hệ'),
        Validators.phoneVN(),
      ],
      cccd: [Validators.cccd12()],
      noiCap: [Validators.maxLength('Nơi cấp CCCD', 150)],
      email: [Validators.email(), Validators.maxLength('Email', 100)],
      ngheNghiep: [Validators.maxLength('Nghề nghiệp', 100)],
      diaChi: [Validators.maxLength('Địa chỉ thường trú', 255)],
    }),
    [mode]
  );

  const { errors, validateField, validateAll } =
    useFormValidation<KhachThueFormState>(validationRules);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const isValid = validateAll({
      tenTK,
      matKhau,
      hoTen,
      gioiTinh,
      namSinh,
      sdt,
      cccd,
      ngayCap,
      noiCap,
      email,
      ngheNghiep,
      diaChi,
    });

    if (!isValid) return;

    await onSubmit({
      TenTK: tenTK.trim(),
      ...(mode === 'create' ? { MatKhau: matKhau.trim() } : {}),
      HoTen: hoTen.trim(),
      GioiTinh: gioiTinh,
      NamSinh: namSinh.trim() ? Number(namSinh.trim()) : null,
      SDT: sdt.trim(),
      CCCD: cccd.trim() || undefined,
      NgayCap: ngayCap || null,
      NoiCap: noiCap.trim() || undefined,
      Email: email.trim() || undefined,
      NgheNghiep: ngheNghiep.trim() || undefined,
      DiaChi: diaChi.trim() || undefined,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-5 sm:p-8 space-y-6"
    >
      {/* 1. Thông tin tài khoản đăng nhập */}
      <div className="space-y-4">
        <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-2.5">
          1. Thông tin tài khoản đăng nhập
        </h2>

        <div
          className={`grid grid-cols-1 ${
            mode === 'create' ? 'sm:grid-cols-2' : ''
          } gap-4`}
        >
          <FormField
            label="Tên tài khoản đăng nhập"
            required
            error={errors.tenTK}
          >
            <input
              type="text"
              value={tenTK}
              onChange={(e) => {
                const val = e.target.value;
                setTenTK(val);
                if (errors.tenTK) validateField('tenTK', val);
              }}
              onBlur={() => validateField('tenTK', tenTK)}
              placeholder="VD: example@gmail.com hoặc SĐT"
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-semibold text-slate-900 focus:outline-none transition ${inputErrorClass(
                errors.tenTK
              )}`}
            />
          </FormField>

          {mode === 'create' && (
            <FormField
              label="Mật khẩu khởi tạo"
              required
              error={errors.matKhau}
            >
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={matKhau}
                  onChange={(e) => {
                    const val = e.target.value;
                    setMatKhau(val);
                    if (errors.matKhau) validateField('matKhau', val);
                  }}
                  onBlur={() => validateField('matKhau', matKhau)}
                  placeholder="Ít nhất 6 ký tự"
                  className={`w-full pl-3.5 pr-16 py-2.5 rounded-xl border text-sm font-semibold text-slate-900 focus:outline-none transition ${inputErrorClass(
                    errors.matKhau
                  )}`}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  {showPassword ? 'Ẩn' : 'Hiện'}
                </button>
              </div>
            </FormField>
          )}
        </div>
      </div>

      {/* 2. Thông tin định danh cá nhân */}
      <div className="space-y-4">
        <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-2.5">
          2. Hồ sơ định danh & Liên hệ cá nhân
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="sm:col-span-2 lg:col-span-2">
            <FormField
              label="Họ và tên đầy đủ"
              required
              error={errors.hoTen}
            >
              <input
                type="text"
                value={hoTen}
                onChange={(e) => {
                  const val = e.target.value;
                  setHoTen(val);
                  if (errors.hoTen) validateField('hoTen', val);
                }}
                onBlur={() => validateField('hoTen', hoTen)}
                placeholder="VD: Nguyễn Văn An"
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-semibold text-slate-900 focus:outline-none transition ${inputErrorClass(
                  errors.hoTen
                )}`}
              />
            </FormField>
          </div>

          <FormField label="Giới tính">
            <select
              value={gioiTinh}
              onChange={(e) => setGioiTinh(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
            >
              <option value="Nam">Nam</option>
              <option value="Nữ">Nữ</option>
              <option value="Khác">Khác</option>
            </select>
          </FormField>

          <FormField label="Năm sinh" error={errors.namSinh}>
            <input
              type="text"
              inputMode="numeric"
              maxLength={4}
              value={namSinh}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '');
                setNamSinh(val);
                if (errors.namSinh) validateField('namSinh', val);
              }}
              onBlur={() => validateField('namSinh', namSinh)}
              placeholder="VD: 2004"
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-semibold text-slate-900 focus:outline-none transition ${inputErrorClass(
                errors.namSinh
              )}`}
            />
          </FormField>

          <FormField label="Số điện thoại" required error={errors.sdt}>
            <input
              type="tel"
              inputMode="numeric"
              maxLength={10}
              value={sdt}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '');
                setSdt(val);
                if (mode === 'create' && (!tenTK || tenTK === sdt)) {
                  setTenTK(val);
                }
                if (errors.sdt) validateField('sdt', val);
              }}
              onBlur={() => validateField('sdt', sdt)}
              placeholder="0901234567"
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-semibold text-slate-900 focus:outline-none transition ${inputErrorClass(
                errors.sdt
              )}`}
            />
          </FormField>

          <FormField label="Số CCCD / Định danh (12 số)" error={errors.cccd}>
            <input
              type="text"
              inputMode="numeric"
              maxLength={12}
              value={cccd}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '');
                setCccd(val);
                if (errors.cccd) validateField('cccd', val);
              }}
              onBlur={() => validateField('cccd', cccd)}
              placeholder="Nhập 12 chữ số CCCD"
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-semibold text-slate-900 focus:outline-none transition ${inputErrorClass(
                errors.cccd
              )}`}
            />
          </FormField>

          <FormField label="Ngày cấp CCCD">
            <input
              type="date"
              value={ngayCap}
              onChange={(e) => setNgayCap(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
            />
          </FormField>

          <div className="sm:col-span-2 lg:col-span-2">
            <FormField label="Nơi cấp CCCD" error={errors.noiCap}>
              <input
                type="text"
                value={noiCap}
                onChange={(e) => {
                  setNoiCap(e.target.value);
                  if (errors.noiCap) validateField('noiCap', e.target.value);
                }}
                onBlur={() => validateField('noiCap', noiCap)}
                placeholder="Cục Cảnh sát QLHC về TTXH"
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-semibold text-slate-900 focus:outline-none transition ${inputErrorClass(
                  errors.noiCap
                )}`}
              />
            </FormField>
          </div>

          <div className="sm:col-span-2 lg:col-span-2">
            <FormField label="Địa chỉ Email" error={errors.email}>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) validateField('email', e.target.value);
                }}
                onBlur={() => validateField('email', email)}
                placeholder="example@gmail.com"
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-semibold text-slate-900 focus:outline-none transition ${inputErrorClass(
                  errors.email
                )}`}
              />
            </FormField>
          </div>

          <FormField label="Nghề nghiệp" error={errors.ngheNghiep}>
            <input
              type="text"
              value={ngheNghiep}
              onChange={(e) => {
                setNgheNghiep(e.target.value);
                if (errors.ngheNghiep)
                  validateField('ngheNghiep', e.target.value);
              }}
              onBlur={() => validateField('ngheNghiep', ngheNghiep)}
              placeholder="VD: Sinh viên, Nhân viên..."
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-semibold text-slate-900 focus:outline-none transition ${inputErrorClass(
                errors.ngheNghiep
              )}`}
            />
          </FormField>

          <div className="sm:col-span-2 lg:col-span-3">
            <FormField
              label="Địa chỉ thường trú / Quê quán"
              error={errors.diaChi}
            >
              <input
                type="text"
                value={diaChi}
                onChange={(e) => {
                  setDiaChi(e.target.value);
                  if (errors.diaChi) validateField('diaChi', e.target.value);
                }}
                onBlur={() => validateField('diaChi', diaChi)}
                placeholder="Nhập địa chỉ thường trú trên CCCD"
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-semibold text-slate-900 focus:outline-none transition ${inputErrorClass(
                  errors.diaChi
                )}`}
              />
            </FormField>
          </div>
        </div>
      </div>

      <FormActions
        cancelHref="/chuTro/khachThue"
        submitLabel={submitLabel}
        submittingLabel={submittingLabel}
        submitting={submitting}
      />
    </form>
  );
}