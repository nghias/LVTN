'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { tienIchService } from '@/services/tienIch.service';

export default function ThemTienIchPage() {
  const router = useRouter();
  const [tenTI, setTenTI] = useState<string>('');
  const [moTa, setMoTa] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!tenTI.trim()) {
      setErrorMsg('Vui lòng nhập tên tiện ích');
      return;
    }

    try {
      setSubmitting(true);
      const res = await tienIchService.create({
        TenTI: tenTI.trim(),
        MoTa: moTa.trim(),
      });

      if (res.success) {
        setSuccessMsg('Thêm tiện ích mới thành công! Đang chuyển hướng...');
        setTimeout(() => {
          router.push('/chuTro/tienIch');
        }, 1200);
      } else {
        setErrorMsg(res.message || 'Không thể thêm tiện ích');
      }
    } catch {
      setErrorMsg('Lỗi kết nối máy chủ');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white p-4 md:p-8 text-slate-800">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => router.push('/chuTro/tienIch')}
          className="text-sm font-semibold text-slate-600 hover:text-slate-900 mb-4 inline-flex items-center gap-1"
        >
          ← Quay lại danh sách tiện ích
        </button>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm">
          <h1 className="text-2xl font-extrabold text-slate-900">Thêm Tiện Ích Mới</h1>
          <p className="text-sm text-slate-500 mt-1">
            Nhập tên và mô tả tiện ích để gắn cho các phòng trọ trong hệ thống.
          </p>

          {errorMsg && (
            <div className="mt-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="mt-4 p-3.5 rounded-xl bg-[#00FFCC]/30 border border-[#00FFCC] text-slate-900 text-sm font-bold">
              {successMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">
                Tên tiện ích <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={tenTI}
                onChange={(e) => setTenTI(e.target.value)}
                placeholder="VD: Gác lửng, Máy lạnh, Tủ lạnh mini..."
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">
                Mô tả chi tiết
              </label>
              <textarea
                rows={4}
                value={moTa}
                onChange={(e) => setMoTa(e.target.value)}
                placeholder="VD: Máy lạnh Inverter tiết kiệm điện lắp sẵn trong phòng..."
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
              />
            </div>

            <div className="pt-4 flex flex-col-reverse sm:flex-row justify-end gap-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => router.push('/chuTro/tienIch')}
                className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-100 transition"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 rounded-xl bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 font-bold shadow-sm transition disabled:opacity-50"
              >
                {submitting ? 'Đang lưu...' : 'Lưu Tiện Ích'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}