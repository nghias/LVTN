// client/src/components/common/FormPrimitives.tsx
'use client';

import React, { ReactNode } from 'react';
import Link from 'next/link';
import { FormError } from '@/utils/formValidation';

interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string | null;
  rightText?: string;
  children: ReactNode;
}

export function FormField({
  label,
  required = false,
  error,
  rightText,
  children,
}: FormFieldProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-xs font-bold text-slate-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        {rightText && (
          <small className="text-[11px] text-slate-400">{rightText}</small>
        )}
      </div>
      {children}
      <FormError message={error} />
    </div>
  );
}

interface FormActionsProps {
  cancelHref: string;
  submitLabel: string;
  submittingLabel?: string;
  submitting?: boolean;
}

export function FormActions({
  cancelHref,
  submitLabel,
  submittingLabel = 'Đang lưu...',
  submitting = false,
}: FormActionsProps) {
  return (
    <div className="pt-4 border-t border-slate-100 flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
      <Link
        href={cancelHref}
        className="w-full sm:w-auto text-center px-6 py-3 rounded-full border border-slate-300 text-slate-700 text-xs font-bold no-underline hover:bg-slate-100 transition"
      >
        Hủy
      </Link>
      <button
        type="submit"
        disabled={submitting}
        className="w-full sm:w-auto px-8 py-3 rounded-full bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 text-xs font-bold shadow-xs cursor-pointer transition disabled:opacity-50"
      >
        {submitting ? submittingLabel : submitLabel}
      </button>
    </div>
  );
}