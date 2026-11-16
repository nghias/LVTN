// client/src/app/chuTro/thanhToan/thietLap/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import QuanLyHeader from '@/components/layout/QuanLyHeader';
import { useAlertModal } from '@/components/common/AlertModalProvider';
import { thanhToanService } from '@/services/thanhToan.service';

export default function ThietLapThongTinThanhToanPage() {
  const router = useRouter();
  const { showSuccess, showError, showConfirm } = useAlertModal();

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [canEdit, setCanEdit] = useState<boolean>(false);
  const [showSecrets, setShowSecrets] = useState<boolean>(false);

  const [formData, setFormData] = useState({
    MaTT: 1,
    TenNganHang: 'MB Bank',
    STK: '0931493785',
    ChuTaiKhoan: 'TRAN TUAN NGHIA',
    PayosClientId: '',
    PayosApiKey: '',
    PayosChecksumKey: '',
  });

  useEffect(() => {
    const loadInfo = async () => {
      try {
        setLoading(true);
        const res = await thanhToanService.getThongTinThanhToan();
        if (res.success) {
          setCanEdit(Boolean(res.canEdit));
          if (res.data) {
            setFormData({
              MaTT: res.data.MaTT,
              TenNganHang: res.data.TenNganHang || '',
              STK: res.data.STK || '',
              ChuTaiKhoan: res.data.ChuTaiKhoan || '',
              PayosClientId: res.data.PayosClientId || '',
              PayosApiKey: res.data.PayosApiKey || '',
              PayosChecksumKey: res.data.PayosChecksumKey || '',
            });
          }
        }
      } catch {
        showError('Không thể tải thông tin ngân hàng!');
      } finally {
        setLoading(false);
      }
    };
    loadInfo();
  }, [showError]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) {
      showError('Chỉ Chủ trọ mới có quyền thay đổi thông tin thanh toán!');
      return;
    }

    const cId = formData.PayosClientId.trim();
    const aKey = formData.PayosApiKey.trim();
    const csKey = formData.PayosChecksumKey.trim();
    const hasAnyKey = Boolean(cId || aKey || csKey);
    const hasAllKeys = Boolean(cId && aKey && csKey);

    if (hasAnyKey && !hasAllKeys) {
      showError(
        'Nếu cập nhật khóa kết nối PayOS, vui lòng nhập đầy đủ cả 3 khóa: Client ID, API Key và Checksum Key (hoặc xóa trống cả 3 để dùng khóa mặc định của hệ thống)!'
      );
      return;
    }

    showConfirm(
      `Xác nhận cập nhật tài khoản nhận thanh toán sang ${formData.TenNganHang} - STK ${formData.STK} (${formData.ChuTaiKhoan})?`,
      'Xác nhận lưu thông tin thanh toán',
      async () => {
        try {
          setSaving(true);
          const res = await thanhToanService.updateThongTinThanhToan({
            ...formData,
            PayosClientId: cId,
            PayosApiKey: aKey,
            PayosChecksumKey: csKey,
          });
          if (res.success) {
            showSuccess(
              'Đã cập nhật thông tin tài khoản ngân hàng và cấu hình PayOS thành công!',
              'Thành công',
              2,
              () => {
                router.push('/chuTro/thanhToan');
              }
            );
          } else {
            showError(res.message || 'Không thể cập nhật thông tin thanh toán');
          }
        } catch {
          showError('Không thể cập nhật thông tin thanh toán');
        } finally {
          setSaving(false);
        }
      },
      'Xác nhận',
      'Hủy'
    );
  };

  return (
    <ProtectedRoute allowedRoles={['ChuTro', 'QuanLy']}>
      {(user) => (
        <div className="flex-1 flex flex-col bg-white text-slate-900">
          <QuanLyHeader user={user} />

          <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
            <div>
              <Link
                href="/chuTro/thanhToan"
                className="text-xs font-bold text-slate-600 hover:text-slate-900 no-underline inline-flex items-center gap-1"
              >
                ← Quay lại danh sách Thanh toán
              </Link>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-2">
                Thiết Lập Thông Tin Thanh Toán
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Cập nhật tài khoản ngân hàng thụ hưởng và khóa kết nối cổng xác thực tự động PayOS
              </p>
            </div>

            {loading ? (
              <div className="py-16 text-center text-sm text-slate-500">
                Đang tải thông tin thiết lập thanh toán...
              </div>
            ) : !canEdit || user.Quyen !== 'ChuTro' ? (
              <div className="bg-slate-50 rounded-3xl border border-slate-200 p-8 text-center space-y-4">
                <span className="inline-block px-3.5 py-1 rounded-full bg-red-100 text-red-700 border border-red-300 text-xs font-bold">
                  Giới hạn phân quyền
                </span>
                <h2 className="text-lg font-bold text-slate-900">
                  Chỉ Chủ Trọ Mới Được Thay Đổi Thông Tin Thanh Toán
                </h2>
                <p className="text-xs sm:text-sm text-slate-600">
                  Quản lý cơ sở chỉ có quyền xem lịch sử và xác nhận thu tiền mặt, không có quyền thay đổi tài khoản ngân hàng nhận tiền.
                </p>
                <Link
                  href="/chuTro/thanhToan"
                  className="inline-block px-6 py-2.5 rounded-full bg-[#00FFCC] text-slate-900 border border-teal-300 text-xs font-bold no-underline"
                >
                  ← Quay lại trang Quản lý thanh toán
                </Link>
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* PHẦN 1: THÔNG TIN TÀI KHOẢN NGÂN HÀNG HIỂN THỊ */}
                  <div className="space-y-4">
                    <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                      1. Thông tin tài khoản ngân hàng thụ hưởng
                    </h2>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          Ngân hàng thụ hưởng *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.TenNganHang}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              TenNganHang: e.target.value,
                            })
                          }
                          placeholder="VD: MB Bank, Vietcombank, BIDV..."
                          className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          Số tài khoản nhận tiền *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.STK}
                          onChange={(e) =>
                            setFormData({ ...formData, STK: e.target.value })
                          }
                          placeholder="VD: 0931493785"
                          className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Tên chủ tài khoản (In hoa không dấu) *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.ChuTaiKhoan}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            ChuTaiKhoan: e.target.value.toUpperCase(),
                          })
                        }
                        placeholder="VD: TRAN TUAN NGHIA"
                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm uppercase font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
                      />
                    </div>
                  </div>

                  {/* PHẦN 2: BỘ 3 KHÓA KẾT NỐI CỔNG PAYOS */}
                  <div className="pt-5 border-t border-slate-200 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                          2. Cấu hình khóa kết nối cổng PayOS
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Khi đổi sang tài khoản ngân hàng mới, hãy liên kết ngân hàng đó trên{' '}
                          <a
                            href="https://my.payos.vn"
                            target="_blank"
                            rel="noreferrer"
                            className="text-teal-700 font-bold underline"
                          >
                            my.payos.vn
                          </a>{' '}
                          và dán bộ 3 khóa Kênh thanh toán vào dưới đây để hệ thống tự động sinh QR và gạch nợ sang tài khoản mới.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowSecrets(!showSecrets)}
                        className="px-3.5 py-1.5 rounded-full border border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 cursor-pointer transition"
                      >
                        {showSecrets ? 'Ẩn mã khóa' : 'Hiện mã khóa'}
                      </button>
                    </div>

                    <div className="space-y-3.5 bg-slate-50/80 p-4 rounded-2xl border border-slate-200">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          PayOS Client ID
                        </label>
                        <input
                          type={showSecrets ? 'text' : 'password'}
                          value={formData.PayosClientId}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              PayosClientId: e.target.value,
                            })
                          }
                          placeholder="Để trống nếu dùng khóa mặc định của hệ thống"
                          className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          PayOS API Key
                        </label>
                        <input
                          type={showSecrets ? 'text' : 'password'}
                          value={formData.PayosApiKey}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              PayosApiKey: e.target.value,
                            })
                          }
                          placeholder="Để trống nếu dùng khóa mặc định của hệ thống"
                          className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          PayOS Checksum Key
                        </label>
                        <input
                          type={showSecrets ? 'text' : 'password'}
                          value={formData.PayosChecksumKey}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              PayosChecksumKey: e.target.value,
                            })
                          }
                          placeholder="Để trống nếu dùng khóa mặc định của hệ thống"
                          className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                    <Link
                      href="/chuTro/thanhToan"
                      className="px-6 py-2.5 rounded-full border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold no-underline transition"
                    >
                      Hủy
                    </Link>
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-7 py-2.5 rounded-full bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 border border-teal-300 text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50"
                    >
                      {saving ? 'Đang lưu...' : 'Lưu Thông Tin Thanh Toán'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </main>
        </div>
      )}
    </ProtectedRoute>
  );
}