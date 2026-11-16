// client/src/utils/formValidation.tsx
'use client';

import React, { useState, useCallback } from 'react';

export type ValidationRule<T = any> = (value: any, allValues?: T) => string | null;
export type ValidationRules<T> = Partial<Record<keyof T, ValidationRule<T>[]>>;

// 1. Thư viện các luật kiểm tra (Validators) dùng chung cho mọi chức năng Thêm / Sửa
export const Validators = {
  required: (fieldName: string): ValidationRule => (val) => {
    if (val === null || val === undefined || String(val).trim() === '') {
      return `Vui lòng nhập ${fieldName}.`;
    }
    return null;
  },

  minLength: (fieldName: string, min: number): ValidationRule => (val) => {
    const str = String(val ?? '').trim();
    if (str.length > 0 && str.length < min) {
      return `${fieldName} phải có ít nhất ${min} ký tự (hiện tại: ${str.length}).`;
    }
    return null;
  },

  maxLength: (fieldName: string, max: number): ValidationRule => (val) => {
    const str = String(val ?? '').trim();
    if (str.length > max) {
      return `${fieldName} không được vượt quá ${max} ký tự (hiện tại: ${str.length}).`;
    }
    return null;
  },

  positiveNumber: (fieldName: string, minVal = 1): ValidationRule => (val) => {
    const num = Number(val);
    if (val === '' || Number.isNaN(num) || num < minVal) {
      return `${fieldName} phải lớn hơn hoặc bằng ${minVal.toLocaleString('vi-VN')}.`;
    }
    return null;
  },

  phoneVN: (): ValidationRule => (val) => {
    const str = String(val ?? '').trim();
    if (str && !/^(0[3|5|7|8|9])+([0-9]{8})$/.test(str)) {
      return 'Số điện thoại không hợp lệ (gồm 10 chữ số, bắt đầu bằng 03, 05, 07, 08, 09).';
    }
    return null;
  },

  cccd12: (): ValidationRule => (val) => {
    const str = String(val ?? '').trim();
    if (str && !/^\d{12}$/.test(str)) {
      return 'Số CCCD / Định danh phải gồm đúng 12 chữ số.';
    }
    return null;
  },

  email: (): ValidationRule => (val) => {
    const str = String(val ?? '').trim();
    if (str && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str)) {
      return 'Địa chỉ Email không đúng định dạng.';
    }
    return null;
  },
};

// 2. Custom Hook quản lý lỗi cho mọi Form Thêm / Sửa
export function useFormValidation<T extends Record<string, any>>(
  rules: ValidationRules<T>
) {
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});

  // Kiểm tra 1 trường đơn lẻ (dùng khi onBlur hoặc đang gõ onChange)
  const validateField = useCallback(
    (field: keyof T, value: any, allValues?: T): string | null => {
      const fieldRules = rules[field];
      if (!fieldRules) return null;

      for (const rule of fieldRules) {
        const errorMsg = rule(value, allValues);
        if (errorMsg) {
          setErrors((prev) => ({ ...prev, [field]: errorMsg }));
          return errorMsg;
        }
      }

      setErrors((prev) => {
        if (!prev[field]) return prev;
        const next = { ...prev };
        delete next[field];
        return next;
      });
      return null;
    },
    [rules]
  );

  // Kiểm tra toàn bộ Form khi bấm nút Lưu (Submit)
  const validateAll = useCallback(
    (values: T): boolean => {
      const newErrors: Partial<Record<keyof T, string>> = {};
      let isValid = true;

      for (const key of Object.keys(rules) as Array<keyof T>) {
        const fieldRules = rules[key];
        if (!fieldRules) continue;

        for (const rule of fieldRules) {
          const errorMsg = rule(values[key], values);
          if (errorMsg) {
            newErrors[key] = errorMsg;
            isValid = false;
            break;
          }
        }
      }

      setErrors(newErrors);
      return isValid;
    },
    [rules]
  );

  // Xóa lỗi của 1 trường
  const clearFieldError = useCallback((field: keyof T) => {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  return {
    errors,
    setErrors,
    validateField,
    validateAll,
    clearFieldError,
  };
}

// 3. Component thẻ <small> hiển thị cảnh báo lỗi ngay dưới ô input
export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <small className="mt-1.5 block text-xs font-semibold text-red-600">
      * {message}
    </small>
  );
}

// 4. Hàm đổi màu viền input sang đỏ khi có lỗi
export function inputErrorClass(hasError?: string | boolean | null) {
  return hasError
    ? 'border-red-500 bg-red-50/30 focus:ring-2 focus:ring-red-300 focus:border-red-500'
    : 'border-slate-300 bg-white focus:ring-2 focus:ring-[#00FFCC]';
}