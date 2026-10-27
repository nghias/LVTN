'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import QuanLyHeader from '@/components/layout/QuanLyHeader';
import { useAlertModal } from '@/components/common/AlertModalProvider';
import { dienNuocService } from '@/services/dienNuoc.service';

export default function SuaChiSoDienNuocPage() {
  const params = useParams();
  const router = useRouter();
  const maCS = Number(params?.maCS);
  const { showSuccess, showError } = useAlertModal();

  const [tenPhong, setTenPhong] = useState<string>('');
  const [tenKhu, setTenKhu] = useState<string>('');
  const [ngayGhi, setNgayGhi] = useState<string>('');
  const [soDienCu, setSoDienCu] = useState<number>(0);
  const [soDienMoi, setSoDienMoi] = useState<string>('0');
  const [soNuocCu, setSoNuocCu] = useState<number>(0);
  const [soNuocMoi, setSoNuocMoi] = useState<string>('0');

  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!maCS) return;
    let isMounted = true;

    const fetchDetail = async () => {
      try {
        setLoading(true);
        const detailRes = await dienNuocService.getById(maCS);
        if (!isMounted) return;

        if (detailRes.success && detailRes.data) {
          const d = detailRes.data;
          setTenPhong(d.TenPhong || `Phòng #${d.MaPhong}`);
          setTenKhu(d.TenKhu || '');
          setNgayGhi(d.NgayGhi || '');
          setSoDienCu(Number(d.SoDienCu) || 0);
          setSoDienMoi(String(d.SoDienMoi ?? 0));
          setSoNuocCu(Number(d.SoNuocCu) || 0);
          setSoNuocMoi(String(d.SoNuocMoi ?? 0));
        } else {
          showError(detailRes.message || 'Không tìm thấy chỉ số điện nước cần sửa');
          router.push('/chuTro/dienNuoc');
        }
      } catch {
        if (isMounted) showError('Lỗi kết nối máy chủ');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchDetail();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maCS]);

  const handleBackToList = () => {
    router.push('/chuTro/dienNuoc');
  };

  const dienTieuThu = Math.max(0, (Number(soDienMoi) || 0) - soDienCu);
  const nuocTieuThu = Math.max(0, (Number(soNuocMoi) || 0) - soNuocCu);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (Number(soDienMoi) < soDienCu) {
      showError(`Số điện mới không được nhỏ hơn số điện cũ cố định (${soDienCu})!`);
      return;
    }

    if (Number(soNuocMoi) < soNuocCu) {
      showError(`Số nước mới không được nhỏ hơn số nước cũ cố định (${soNuocCu})!`);
      return;
    }

    try {
      setSubmitting(true);
      const res = await dienNuocService.updateChiSo(maCS, {
        SoDienMoi: Number(soDienMoi),
        SoNuocMoi: Number(soNuocMoi),
        NgayGhi: ngayGhi,
      });

      if (res.success) {
        showSuccess(
          res.message || 'Cập nhật chỉ số điện nước thành công!',
          'Thành công',
          1.5,
          () => {
            router.push('/chuTro/dienNuoc');
          }
        );
      } else {
        showError(res.message || 'Không thể cập nhật chỉ số điện nước');
      }
    } catch {
      showError('Lỗi kết nối máy chủ');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['ChuTro', 'QuanLy']}>
      {(user) => (
        <div className="min-h-screen flex flex-col bg-white text-slate-900">
          <QuanLyHeader user={user} />

          <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
            <div className="mb-6">
              <button
                type="button"
                onClick={handleBackToList}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition cursor-pointer bg-transparent border-0 p-0"
              >
                <span>← Quay lại danh sách Chỉ số điện nước</span>
              </button>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-2 tracking-tight">
                Sửa Chỉ Số Điện Nước #{maCS}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Đang chỉnh sửa bản ghi chỉ số của <strong>{tenPhong}</strong> ({tenKhu}). Chỉ số cũ đã được khóa để bảo toàn lịch sử dữ liệu.
              </p>
            </div>

            {loading ? (
              <div className="py-16 text-center text-slate-500 text-sm font-medium">
                Đang tải thông tin chỉ số điện nước...
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-8 shadow-xs space-y-6"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      🔒 Phòng trọ (Cố định)
                    </label>
                    <input
                      type="text"
                      value={`${tenPhong} (${tenKhu})`}
                      disabled
                      readOnly
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm bg-slate-100 text-slate-600 font-bold cursor-not-allowed select-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Ngày ghi sổ <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={ngayGhi}
                      onChange={(e) => setNgayGhi(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
                      required
                    />
                  </div>
                </div>

                {/* Khối sửa Chỉ số Điện */}
                <div className="p-5 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-amber-900">
                      1. Chỉ Số Điện Năng (kWh)
                    </h3>
                    <span className="text-xs font-bold text-amber-800">
                      Tiêu thụ: +{dienTieuThu} kWh
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5">
                        🔒 Số điện cũ (kWh) — Đã khóa
                      </label>
                      <input
                        type="text"
                        value={soDienCu}
                        disabled
                        readOnly
                        tabIndex={-1}
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm bg-slate-200/80 text-slate-600 font-bold cursor-not-allowed select-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Số điện mới (kWh) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={soDienMoi}
                        onChange={(e) =>
                          setSoDienMoi(e.target.value.replace(/\D/g, ''))
                        }
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm bg-white font-bold focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Khối sửa Chỉ số Nước */}
                <div className="p-5 rounded-2xl bg-sky-50/60 border border-sky-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-sky-900">
                      2. Chỉ Số Nước Sạch (m³)
                    </h3>
                    <span className="text-xs font-bold text-sky-800">
                      Tiêu thụ: +{nuocTieuThu} m³
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5">
                        🔒 Số nước cũ (m³) — Đã khóa
                      </label>
                      <input
                        type="text"
                        value={soNuocCu}
                        disabled
                        readOnly
                        tabIndex={-1}
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm bg-slate-200/80 text-slate-600 font-bold cursor-not-allowed select-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Số nước mới (m³) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={soNuocMoi}
                        onChange={(e) =>
                          setSoNuocMoi(e.target.value.replace(/\D/g, ''))
                        }
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm bg-white font-bold focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Nút Lưu / Hủy */}
                <div className="pt-4 border-t border-slate-100 flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleBackToList}
                    className="w-full sm:w-auto text-center px-6 py-3 rounded-full border border-slate-300 bg-white text-slate-700 text-xs font-bold hover:bg-slate-100 transition cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full sm:w-auto px-8 py-3 rounded-full bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? 'Đang cập nhật...' : 'Lưu Thay Đổi'}
                  </button>
                </div>
              </form>
            )}
          </main>
        </div>
      )}
    </ProtectedRoute>
  );
}