'use client';

import React, { ChangeEvent } from 'react';
import { formatVNDInput, parseVNDInput } from '@/utils/format.util';

interface CurrencyInputProps {
  id?: string;
  value: string | number;
  onChange: (cleanValue: string) => void;
  placeholder?: string;
  suffix?: string; // Đơn vị hiển thị bên phải (VD: "VNĐ" hoặc "m²")
  disabled?: boolean;
  className?: string;
}

export default function CurrencyInput({
  id,
  value,
  onChange,
  placeholder = '0',
  suffix = 'VNĐ',
  disabled = false,
  className = '',
}: CurrencyInputProps) {
  const displayValue = formatVNDInput(value);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const cleanNumber = parseVNDInput(e.target.value);
    onChange(cleanNumber);
  };

  return (
    <div className="relative flex items-center">
      <input
        id={id}
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full px-4 py-3 pr-14 border border-slate-300 rounded-xl text-sm text-slate-900 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00FFCC] transition ${className}`}
      />
      {suffix && (
        <span className="absolute right-3.5 text-xs font-bold text-slate-500 pointer-events-none select-none">
          {suffix}
        </span>
      )}
    </div>
  );
}