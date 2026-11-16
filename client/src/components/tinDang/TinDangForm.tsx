// client/src/components/tinDang/TinDangForm.tsx
"use client";

import React, {
  useState,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  FormEvent,
} from "react";
import { FormField, FormActions } from "@/components/common/FormPrimitives";
import {
  Validators,
  useFormValidation,
  FormError,
  inputErrorClass,
} from "@/utils/formValidation";
import type {
  TrangThaiTin,
  PhongSelectOption,
} from "@/app/chuTro/tinDang/page";

export interface TinDangFormData {
  MaPhong: string;
  Gia: string;
  MaND: number;
  TieuDe: string;
  MoTa: string;
  NgayHetHan: string;
  TrangThai: TrangThaiTin;
}

// Định dạng chuỗi số sang dạng có dấu chấm phân cách hàng nghìn
export function formatGiaInput(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// Tính vị trí con trỏ trong chuỗi đã có dấu chấm dựa theo số lượng chữ số đứng trước con trỏ
export function getCaretPositionByDigitIndex(
  formatted: string,
  digitIndex: number
): number {
  if (digitIndex <= 0) return 0;
  let count = 0;
  for (let i = 0; i < formatted.length; i++) {
    if (/\d/.test(formatted[i])) {
      count++;
      if (count === digitIndex) {
        return i + 1;
      }
    }
  }
  return formatted.length;
}

// Lấy chuỗi ngày hiện tại YYYY-MM-DD theo giờ địa phương
export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Chuyển đổi chuỗi ngày bất kỳ về chuẩn YYYY-MM-DD
export function toLocalDateString(dateInput?: string | null): string {
  if (!dateInput) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput.trim())) {
    return dateInput.trim();
  }
  const parsed = new Date(dateInput);
  if (isNaN(parsed.getTime())) return "";
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatDisplayDate(ymd: string): string {
  if (!ymd) return "chưa chọn";
  const parts = ymd.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return ymd;
}

interface TinDangFormProps {
  mode: "create" | "edit";
  initialData: TinDangFormData;
  initialTrangThai?: TrangThaiTin;
  phongOptions: PhongSelectOption[];
  cancelHref: string;
  submitLabel: string;
  submitting: boolean;
  serverError?: string | null;
  onClearServerError?: () => void;
  onSubmit: (payload: {
    MaPhong: number;
    Gia: number;
    MaND: number;
    TieuDe: string;
    MoTa: string | null;
    NgayHetHan: string | null;
    TrangThai: TrangThaiTin;
  }) => Promise<void>;
}

export default function TinDangForm({
  mode,
  initialData,
  initialTrangThai = "DangHienThi",
  phongOptions,
  cancelHref,
  submitLabel,
  submitting,
  serverError,
  onClearServerError,
  onSubmit,
}: TinDangFormProps) {
  const giaInputRef = useRef<HTMLInputElement | null>(null);
  const pendingCaretDigitIndexRef = useRef<number | null>(null);

  const [formData, setFormData] = useState<TinDangFormData>(initialData);

  useEffect(() => {
    setFormData(initialData);
  }, [initialData]);

  // Khôi phục chính xác vị trí con trỏ sau mỗi lần giá trị Gia thay đổi
  useLayoutEffect(() => {
    if (pendingCaretDigitIndexRef.current === null || !giaInputRef.current) {
      return;
    }
    const formatted = formatGiaInput(formData.Gia);
    const nextPos = getCaretPositionByDigitIndex(
      formatted,
      pendingCaretDigitIndexRef.current
    );
    giaInputRef.current.setSelectionRange(nextPos, nextPos);
    pendingCaretDigitIndexRef.current = null;
  }, [formData.Gia]);

  const selectedRoomInfo = useMemo(() => {
    return phongOptions.find(
      (p) => String(p.MaPhong) === String(formData.MaPhong)
    );
  }, [phongOptions, formData.MaPhong]);

  const giaGoc = useMemo(() => {
    if (!selectedRoomInfo || selectedRoomInfo.Gia === undefined) return "";
    return String(Math.round(Number(selectedRoomInfo.Gia)));
  }, [selectedRoomInfo]);

  // Khai báo bộ luật validation cho form Tin Đăng
  const validationRules = useMemo(
    () => ({
      MaPhong: [Validators.required("phòng trọ cần đăng tin")],
      Gia: [
        Validators.required("giá niêm yết phòng (VNĐ/tháng)"),
        Validators.positiveNumber("Giá niêm yết phòng", 500000),
      ],
      TieuDe: [
        Validators.required("tiêu đề bài đăng"),
        Validators.minLength("Tiêu đề bài đăng", 10),
        Validators.maxLength("Tiêu đề bài đăng", 200),
      ],
      NgayHetHan: [
        (val: any, allValues?: TinDangFormData) => {
          const trangThai = allValues?.TrangThai || formData.TrangThai;
          if (trangThai !== "DangHienThi") return null;

          const currentToday = getTodayDateString();
          const selectedDate = toLocalDateString(val);

          if (selectedDate && selectedDate <= currentToday) {
            return `Trạng thái đang là "Đang hiển thị công khai", ngày hết hạn (${formatDisplayDate(
              selectedDate
            )}) phải lớn hơn ngày hiện tại (${formatDisplayDate(currentToday)}).`;
          }

          if (
            mode === "edit" &&
            initialTrangThai === "HetHan" &&
            !selectedDate
          ) {
            return "Khi mở lại tin đăng đã hết hạn sang hiển thị công khai, vui lòng chọn ngày hết hạn mới lớn hơn hôm nay.";
          }

          return null;
        },
      ],
      MoTa: [Validators.maxLength("Mô tả chi tiết", 2000)],
    }),
    [formData.TrangThai, initialTrangThai, mode]
  );

  const { errors, validateField, validateAll } =
    useFormValidation<TinDangFormData>(validationRules);

  const handlePhongChange = (newMaPhong: string) => {
    onClearServerError?.();
    const foundRoom = phongOptions.find(
      (p) => String(p.MaPhong) === String(newMaPhong)
    );
    pendingCaretDigitIndexRef.current = null;
    const nextGia =
      foundRoom?.Gia !== undefined
        ? String(Math.round(Number(foundRoom.Gia)))
        : mode === "edit"
        ? formData.Gia
        : "";

    const nextState = {
      ...formData,
      MaPhong: newMaPhong,
      Gia: nextGia,
    };
    setFormData(nextState);
    validateField("MaPhong", newMaPhong, nextState);
    if (nextGia) validateField("Gia", nextGia, nextState);
  };

  const updateGiaWithCaret = (
    nextRawDigits: string,
    caretDigitIndex: number
  ) => {
    onClearServerError?.();
    const cleaned = nextRawDigits.replace(/\D/g, "").slice(0, 12);
    pendingCaretDigitIndexRef.current = Math.max(
      0,
      Math.min(caretDigitIndex, cleaned.length)
    );

    setFormData((prev) => {
      if (prev.Gia === cleaned && giaInputRef.current) {
        const formatted = formatGiaInput(cleaned);
        const pos = getCaretPositionByDigitIndex(
          formatted,
          pendingCaretDigitIndexRef.current ?? formatted.length
        );
        giaInputRef.current.setSelectionRange(pos, pos);
        pendingCaretDigitIndexRef.current = null;
      }
      const next = { ...prev, Gia: cleaned };
      if (errors.Gia) validateField("Gia", cleaned, next);
      return next;
    });
  };

  const handleGiaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputEl = e.target;
    const selectionStart = inputEl.selectionStart ?? inputEl.value.length;
    const digitsBeforeCursor = inputEl.value
      .slice(0, selectionStart)
      .replace(/\D/g, "").length;
    const rawDigits = inputEl.value.replace(/\D/g, "").slice(0, 12);

    updateGiaWithCaret(rawDigits, digitsBeforeCursor);
  };

  const handleGiaKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const inputEl = e.currentTarget;
    const start = inputEl.selectionStart ?? 0;
    const end = inputEl.selectionEnd ?? 0;
    const val = inputEl.value;

    if (
      e.key === "Backspace" &&
      start === end &&
      start > 0 &&
      val[start - 1] === "."
    ) {
      e.preventDefault();
      const digitsBeforeDot = val.slice(0, start - 1).replace(/\D/g, "");
      if (digitsBeforeDot.length === 0) return;
      const deleteIdx = digitsBeforeDot.length - 1;
      const allDigits = val.replace(/\D/g, "");
      const nextRaw =
        allDigits.slice(0, deleteIdx) + allDigits.slice(deleteIdx + 1);
      updateGiaWithCaret(nextRaw, deleteIdx);
      return;
    }

    if (
      e.key === "Delete" &&
      start === end &&
      start < val.length &&
      val[start] === "."
    ) {
      e.preventDefault();
      const deleteIdx = val.slice(0, start).replace(/\D/g, "").length;
      const allDigits = val.replace(/\D/g, "");
      if (deleteIdx >= allDigits.length) return;
      const nextRaw =
        allDigits.slice(0, deleteIdx) + allDigits.slice(deleteIdx + 1);
      updateGiaWithCaret(nextRaw, deleteIdx);
      return;
    }

    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      const allDigits = val.replace(/\D/g, "");
      const currentNum = Number(allDigits || 0);
      const rawDigitsToRight = val.slice(start).replace(/\D/g, "").length;
      const digitsToRight =
        allDigits.length > 0
          ? Math.min(rawDigitsToRight, allDigits.length - 1)
          : 0;
      const step = Math.pow(10, digitsToRight);
      const delta = e.key === "ArrowUp" ? step : -step;
      const nextNum = Math.max(0, currentNum + delta);
      const nextRaw = nextNum > 0 ? String(nextNum).slice(0, 12) : "0";
      const nextCaretDigitIdx = Math.max(0, nextRaw.length - digitsToRight);
      updateGiaWithCaret(nextRaw, nextCaretDigitIdx);
    }
  };

  const handleGiaBlur = () => {
    const currentNum = Number(formData.Gia);
    let finalGia = formData.Gia;
    if (!formData.Gia.trim() || isNaN(currentNum) || currentNum <= 0) {
      finalGia = giaGoc || "";
    } else {
      finalGia = String(Math.round(currentNum));
    }
    const nextState = { ...formData, Gia: finalGia };
    setFormData(nextState);
    validateField("Gia", finalGia, nextState);
  };

  const handleTrangThaiChange = (newStatus: TrangThaiTin) => {
    onClearServerError?.();
    const currentToday = getTodayDateString();
    const nextNgayHetHan =
      newStatus === "HetHan" ? currentToday : formData.NgayHetHan;
    const nextState = {
      ...formData,
      TrangThai: newStatus,
      NgayHetHan: nextNgayHetHan,
    };
    setFormData(nextState);
    validateField("NgayHetHan", nextNgayHetHan, nextState);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    onClearServerError?.();

    const parsedInputGia = Number(formData.Gia);
    const finalGiaStr =
      formData.Gia.trim() && !isNaN(parsedInputGia) && parsedInputGia > 0
        ? String(Math.round(parsedInputGia))
        : giaGoc;

    const dataToValidate: TinDangFormData = {
      ...formData,
      Gia: finalGiaStr,
    };

    if (!validateAll(dataToValidate)) {
      return;
    }

    const currentToday = getTodayDateString();
    const selectedDate = toLocalDateString(formData.NgayHetHan);
    const finalNgayHetHan =
      formData.TrangThai === "HetHan" ? currentToday : selectedDate || null;

    await onSubmit({
      MaPhong: Number(formData.MaPhong),
      Gia: Number(finalGiaStr),
      MaND: formData.MaND,
      TieuDe: formData.TieuDe.trim(),
      MoTa: formData.MoTa.trim() || null,
      NgayHetHan: finalNgayHetHan,
      TrangThai: formData.TrangThai,
    });
  };

  const parsedGia = Number(formData.Gia);
  const effectiveGia =
    formData.Gia.trim() && !isNaN(parsedGia) && parsedGia > 0
      ? parsedGia
      : Number(giaGoc || 0);
  const isGiaChanged = Boolean(
    giaGoc &&
      formData.Gia.trim() &&
      !isNaN(parsedGia) &&
      parsedGia > 0 &&
      Math.round(parsedGia) !== Math.round(Number(giaGoc))
  );

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
        <h2 className="text-sm font-bold text-slate-900">
          {mode === "create"
            ? "Thông tin bài đăng"
            : "Biểu mẫu cập nhật tin đăng"}
        </h2>
      </div>

      <form onSubmit={handleSubmit} noValidate className="p-6 space-y-5">
        {serverError && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200">
            <FormError message={serverError} />
          </div>
        )}

        {mode === "create" && phongOptions.length === 0 && (
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs font-bold text-amber-700">
            Hiện tại không còn phòng trống nào chưa đăng tin trong cơ sở của bạn.
          </div>
        )}

        {/* 1. Chọn Phòng trọ & Giá niêm yết */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
          <FormField
            label="Chọn phòng cần đăng tin"
            required
            error={errors.MaPhong}
          >
            <select
              value={formData.MaPhong}
              onChange={(e) => handlePhongChange(e.target.value)}
              disabled={
                submitting || (mode === "create" && phongOptions.length === 0)
              }
              className={`w-full px-4 py-2.5 border rounded-xl text-sm text-slate-900 focus:outline-none transition ${inputErrorClass(
                errors.MaPhong
              )}`}
            >
              <option value="">-- Chọn phòng trong cơ sở --</option>
              {phongOptions.map((p) => (
                <option key={p.MaPhong} value={String(p.MaPhong)}>
                  Phòng {p.TenPhong} - {p.TenKhu} (
                  {Number(p.Gia).toLocaleString("vi-VN")}đ - {p.DienTich}m²)
                </option>
              ))}
            </select>
          </FormField>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Giá niêm yết phòng (VNĐ/tháng){" "}
                <span className="text-red-500">*</span>
              </label>
              {isGiaChanged && (
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    pendingCaretDigitIndexRef.current = null;
                    const nextState = { ...formData, Gia: giaGoc };
                    setFormData(nextState);
                    validateField("Gia", giaGoc, nextState);
                  }}
                  className="text-[11px] font-bold text-teal-700 hover:text-teal-900 underline cursor-pointer"
                >
                  ↺ Về giá cũ ({Number(giaGoc).toLocaleString("vi-VN")}đ)
                </button>
              )}
            </div>

            <div className="relative">
              <input
                ref={giaInputRef}
                type="text"
                inputMode="numeric"
                disabled={submitting || !formData.MaPhong}
                value={formatGiaInput(formData.Gia)}
                onChange={handleGiaChange}
                onKeyDown={handleGiaKeyDown}
                onBlur={handleGiaBlur}
                placeholder={
                  giaGoc
                    ? `Mặc định: ${Number(giaGoc).toLocaleString("vi-VN")}đ`
                    : "VD: 3.500.000"
                }
                className={`w-full pl-4 pr-16 py-2.5 border rounded-xl text-sm font-semibold text-teal-700 placeholder:text-slate-400 focus:outline-none transition ${inputErrorClass(
                  errors.Gia
                )}`}
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                đ/tháng
              </span>
            </div>
            <FormError message={errors.Gia} />
          </div>
        </div>

        {/* Khung xem nhanh thông tin phòng đã chọn */}
        {selectedRoomInfo && (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-900 text-[#00FFCC]">
                {selectedRoomInfo.TenKhu}
              </span>
              <p className="text-sm font-bold text-slate-900 pt-1">
                Phòng {selectedRoomInfo.TenPhong} — Diện tích:{" "}
                {Number(selectedRoomInfo.DienTich)} m²
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-500 block">
                {isGiaChanged
                  ? "Giá niêm yết mới sau cập nhật"
                  : "Giá niêm yết công khai"}
              </span>
              <div className="flex items-baseline justify-end gap-2">
                {isGiaChanged && (
                  <span className="text-xs text-slate-400 line-through">
                    {Number(giaGoc).toLocaleString("vi-VN")}đ
                  </span>
                )}
                <span className="text-base font-extrabold text-teal-700">
                  {effectiveGia.toLocaleString("vi-VN")} đ / tháng
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 2. Tiêu đề bài đăng */}
        <FormField
          label="Tiêu đề bài đăng"
          required
          rightText={`${formData.TieuDe.length}/200 ký tự`}
          error={errors.TieuDe}
        >
          <input
            type="text"
            disabled={submitting}
            value={formData.TieuDe}
            onChange={(e) => {
              onClearServerError?.();
              const val = e.target.value;
              const nextState = { ...formData, TieuDe: val };
              setFormData(nextState);
              if (errors.TieuDe || val.length > 200) {
                validateField("TieuDe", val, nextState);
              }
            }}
            onBlur={() => validateField("TieuDe", formData.TieuDe, formData)}
            placeholder="VD: Cho thuê phòng Studio có gác lửng, máy lạnh..."
            className={`w-full px-4 py-2.5 border rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none transition ${inputErrorClass(
              errors.TieuDe
            )}`}
          />
        </FormField>

        {/* 3. Ngày hết hạn & Trạng thái hiển thị */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Ngày hết hạn hiển thị" error={errors.NgayHetHan}>
            <input
              type="date"
              disabled={submitting}
              value={formData.NgayHetHan}
              onChange={(e) => {
                onClearServerError?.();
                const val = e.target.value;
                const nextState = { ...formData, NgayHetHan: val };
                setFormData(nextState);
                validateField("NgayHetHan", val, nextState);
              }}
              onBlur={() =>
                validateField("NgayHetHan", formData.NgayHetHan, formData)
              }
              className={`w-full px-4 py-2.5 border rounded-xl text-sm text-slate-900 focus:outline-none transition ${inputErrorClass(
                errors.NgayHetHan
              )}`}
            />
          </FormField>

          <FormField label="Trạng thái hiển thị">
            <select
              disabled={submitting}
              value={formData.TrangThai}
              onChange={(e) =>
                handleTrangThaiChange(e.target.value as TrangThaiTin)
              }
              className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
            >
              <option value="DangHienThi">Đang hiển thị công khai</option>
              <option value="DaAn">Tạm ẩn bài đăng</option>
              <option value="HetHan">Đã hết hạn</option>
            </select>
          </FormField>
        </div>

        {/* 4. Mô tả chi tiết */}
        <FormField
          label="Mô tả chi tiết tiện ích & quy định"
          rightText={`${formData.MoTa.length}/2000 ký tự`}
          error={errors.MoTa}
        >
          <textarea
            rows={5}
            disabled={submitting}
            value={formData.MoTa}
            onChange={(e) => {
              onClearServerError?.();
              const val = e.target.value;
              const nextState = { ...formData, MoTa: val };
              setFormData(nextState);
              if (errors.MoTa || val.length > 2000) {
                validateField("MoTa", val, nextState);
              }
            }}
            onBlur={() => validateField("MoTa", formData.MoTa, formData)}
            placeholder="Nhập mô tả về giờ giấc, chỗ để xe, nội thất đi kèm..."
            className={`w-full p-3.5 border rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none transition ${inputErrorClass(
              errors.MoTa
            )}`}
          />
        </FormField>

        <FormActions
          cancelHref={cancelHref}
          submitLabel={submitLabel}
          submittingLabel="Đang lưu..."
          submitting={
            submitting || (mode === "create" && phongOptions.length === 0)
          }
        />
      </form>
    </div>
  );
}