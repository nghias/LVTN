'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import QuanLyHeader from '@/components/layout/QuanLyHeader';
import CurrencyInput from '@/components/common/CurrencyInput';
import { useAlertModal } from '@/components/common/AlertModalProvider';
import { dichVuService } from '@/services/dichVu.service';

// Làm sạch đuôi thập phân .00 từ kiểu DECIMAL(18,2) của MySQL
const cleanDecimalString = (val: unknown): string => {
  if (val === null || val === undefined || val === '') return '';
  const num = Math.round(Number(val));
  return Number.isNaN(num) ? '' : String(num);
};

export default function SuaPhiDichVuPage() {
  const params = useParams();
  const router = useRouter();
  const maDV = Number(params?.maDV);
  const { showSuccess, showError } = useAlertModal();

  const [tenDV, setTenDV] = useState<string>('');
  const [donGia, setDonGia] = useState<string>('');
  const [donViTinh, setDonViTinh] = useState<string>('');
  const [moTa, setMoTa] = useState<string>('');
  const [soHopDongApDung, setSoHopDongApDung] = useState<number>(0);

  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!maDV) return;

    const fetchDetail = async () => {
      try {
        setLoading(true);
        const res = await dichVuService.getById(maDV);

        if (res.success && res.data) {
          setTenDV(res.data.TenDV || '');
          setDonGia(cleanDecimalString(res.data.DonGia));
          setDonViTinh(res.data.DonViTinh || '');
          setMoTa(res.data.MoTa || '');
          setSoHopDongApDung(Number(res.data.SoHopDongApDung) || 0);
        } else {
          showError(res.message || 'Không tìm thấy phí dịch vụ cần sửa');
          router.push('/chuTro/phiDichVu');
        }
      } catch {
        showError('Lỗi kết nối khi tải thông tin phí dịch vụ');
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [maDV, router, showError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!tenDV.trim() || !donGia || !donViTinh.trim()) {
      showError('Vui lòng nhập đầy đủ Tên dịch vụ, Đơn giá và Đơn vị tính!');
      return;
    }

    try {
      setSubmitting(true);
      const res = await dichVuService.update(maDV, {
        TenDV: tenDV.trim(),
        DonGia: Number(donGia),
        DonViTinh: donViTinh.trim(),
        MoTa: moTa.trim(),
      });

      if (res.success) {
        showSuccess(
          res.message || 'Cập nhật phí dịch vụ thành công!',
          'Thành công',
          1.5,
          () => {
            router.push('/chuTro/phiDichVu');
          }
        );
      } else {
        showError(res.message || 'Không thể cập nhật phí dịch vụ');
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
              <Link
                href="/chuTro/phiDichVu"
                className="text-xs font-bold text-slate-600 hover:text-slate-900 no-underline"
              >
                ← Quay lại danh sách Phí dịch vụ
              </Link>
              <div className="flex flex-wrap items-center justify-between gap-2 mt-2">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  Chỉnh Sửa Phí Dịch Vụ #{maDV}
                </h1>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#00FFCC]/30 text-slate-900 border border-[#00FFCC]">
                  Đang áp dụng cho {soHopDongApDung} hợp đồng
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Cập nhật tên, đơn giá, đơn vị tính hoặc mô tả cho khoản phí dịch vụ này.
              </p>
            </div>

            {loading ? (
              <div className="py-16 text-center text-slate-500 text-sm font-medium">
                Đang tải thông tin phí dịch vụ...
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-8 shadow-xs space-y-6"
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-1">
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Tên phí dịch vụ <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={tenDV}
                      onChange={(e) => setTenDV(e.target.value)}
                      placeholder="VD: WiFi tốc độ cao, Giữ xe máy..."
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Đơn giá (VNĐ) <span className="text-red-500">*</span>
                    </label>
                    <CurrencyInput
                      value={donGia}
                      onChange={setDonGia}
                      placeholder="VD: 100.000"
                      suffix="VNĐ"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Đơn vị tính <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      list="donViTinhOptions"
                      value={donViTinh}
                      onChange={(e) => setDonViTinh(e.target.value)}
                      placeholder="VD: Tháng, Xe/Tháng..."
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
                      required
                    />
                    <datalist id="donViTinhOptions">
                      <option value="Tháng" />
                      <option value="Xe/Tháng" />
                      <option value="Người/Tháng" />
                      <option value="Phòng/Tháng" />
                    </datalist>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Mô tả chi tiết
                  </label>
                  <textarea
                    rows={4}
                    value={moTa}
                    onChange={(e) => setMoTa(e.target.value)}
                    placeholder="VD: Bãi để xe tầng trệt có camera an ninh..."
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
                  />
                </div>

                {/* Nút Lưu / Hủy */}
                <div className="pt-4 border-t border-slate-100 flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
                  <Link
                    href="/chuTro/phiDichVu"
                    className="w-full sm:w-auto text-center px-6 py-3 rounded-full border border-slate-300 text-slate-700 text-xs font-bold no-underline hover:bg-slate-100"
                  >
                    Hủy
                  </Link>
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