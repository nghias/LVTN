'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { tienIchService } from '@/services/tienIch.service';

export default function SuaTienIchPage() {
  const router = useRouter();
  const params = useParams();
  const maTI = params?.maTI as string;

  const [tenTI, setTenTI] = useState<string>('');
  const [moTa, setMoTa] = useState<string>('');
  const [soPhongSuDung, setSoPhongSuDung] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        setLoading(true);
        const res = await tienIchService.getById(maTI);
        if (res.success && res.data) {
          setTenTI(res.data.TenTI || '');
          setMoTa(res.data.MoTa || '');
          setSoPhongSuDung(res.data.SoPhongSuDung || 0);
        } else {
          setErrorMsg(res.message || 'Không tìm thấy thông tin tiện ích');
        }
      } catch {
        setErrorMsg('Lỗi kết nối máy chủ khi tải tiện ích');
      } finally {
        setLoading(false);
      }
    };

    if (maTI) fetchDetail();
  }, [maTI]);

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
      const res = await tienIchService.update(maTI, {
        TenTI: tenTI.trim(),
        MoTa: moTa.trim(),
      });

      if (res.success) {
        setSuccessMsg('Cập nhật tiện ích thành công! Đang chuyển hướng...');
        setTimeout(() => {
          router.push('/chuTro/tienIch');
        }, 1200);
      } else {
        setErrorMsg(res.message || 'Không thể cập nhật tiện ích');
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
          <div className="flex items-center justify-between gap-2">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900">
                Sửa Tiện Ích #{maTI}
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Cập nhật tên hoặc mô tả chi tiết cho tiện ích này.
              </p>
            </div>
            <span className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#00FFCC]/30 text-slate-900 border border-[#00FFCC]">
              Đang gắn cho {soPhongSuDung} phòng
            </span>
          </div>

          {loading ? (
            <div className="py-12 text-center text-slate-500">
              Đang tải dữ liệu tiện ích...
            </div>
          ) : (
            <>
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
                    placeholder="Nhập tên tiện ích..."
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
                    placeholder="Nhập mô tả tiện ích..."
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
                    {submitting ? 'Đang cập nhật...' : 'Lưu Thay Đổi'}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}