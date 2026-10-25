'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import QuanLyHeader from '@/components/layout/QuanLyHeader';
import { KhachThueService } from '@/services/khachThue.service';
import { useAlertModal } from '@/components/common/AlertModalProvider';

export default function SuaKhachThuePage() {
  const params = useParams();
  const router = useRouter();
  const maND = Number(params?.maND);
  const { showSuccess, showError } = useAlertModal();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [resettingPw, setResettingPw] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  const [formData, setFormData] = useState({
    HoTen: '',
    CCCD: '',
    NamSinh: '',
    SDT: '',
    Email: '',
    DiaChi: '',
    TenTK: '',
  });

  useEffect(() => {
    if (!maND) return;
    const loadDetail = async () => {
      try {
        setLoading(true);
        const data = await KhachThueService.getDetail(maND);
        setFormData({
          HoTen: data.HoTen || '',
          CCCD: data.CCCD || '',
          NamSinh: data.NamSinh ? String(data.NamSinh) : '',
          SDT: data.SDT || '',
          Email: data.Email || '',
          DiaChi: data.DiaChi || '',
          TenTK: data.TenTK || '',
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Không tìm thấy khách thuê!';
        showError(msg);
        router.push('/chuTro/khachThue');
      } finally {
        setLoading(false);
      }
    };
    loadDetail();
  }, [maND, router, showError]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleUpdateInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await KhachThueService.update(maND, formData);
      showSuccess('Cập nhật thông tin khách thuê thành công!', 'Thành công', 1.5, () => {
        router.push('/chuTro/khachThue');
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi cập nhật thông tin!';
      showError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.trim().length < 6) {
      showError('Mật khẩu mới phải từ 6 ký tự trở lên!');
      return;
    }
    try {
      setResettingPw(true);
      await KhachThueService.resetPassword(maND, newPassword.trim());
      showSuccess('Cấp lại mật khẩu mới thành công!');
      setNewPassword('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể cấp lại mật khẩu!';
      showError(msg);
    } finally {
      setResettingPw(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['ChuTro', 'QuanLy']}>
      {(user) => (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
          <QuanLyHeader user={user} />

          <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  Sửa Thông Tin Khách Thuê #{maND}
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  Chỉnh sửa thông tin cá nhân hoặc cấp lại mật khẩu đăng nhập
                </p>
              </div>
              <Link
                href="/chuTro/khachThue"
                className="px-4 py-2 rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 no-underline"
              >
                ← Quay lại
              </Link>
            </div>

            {loading ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-500 text-sm">
                Đang tải thông tin khách thuê...
              </div>
            ) : (
              <>
                <form
                  onSubmit={handleUpdateInfo}
                  className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5"
                >
                  <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
                    1. Thông tin hồ sơ & Tài khoản
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Họ và tên *
                      </label>
                      <input
                        type="text"
                        name="HoTen"
                        required
                        value={formData.HoTen}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Số CCCD *
                      </label>
                      <input
                        type="text"
                        name="CCCD"
                        required
                        value={formData.CCCD}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Năm sinh *
                      </label>
                      <input
                        type="number"
                        name="NamSinh"
                        required
                        value={formData.NamSinh}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Số điện thoại *
                      </label>
                      <input
                        type="text"
                        name="SDT"
                        required
                        value={formData.SDT}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        name="Email"
                        required
                        value={formData.Email}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Địa chỉ thường trú
                      </label>
                      <input
                        type="text"
                        name="DiaChi"
                        value={formData.DiaChi}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-6 py-2.5 rounded-full bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 font-bold text-xs shadow-xs transition cursor-pointer"
                    >
                      {submitting ? 'Đang lưu...' : 'Lưu Thay Đổi'}
                    </button>
                  </div>
                </form>

                <form
                  onSubmit={handleResetPassword}
                  className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4"
                >
                  <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
                    2. Cấp lại mật khẩu đăng nhập
                  </h2>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Mật khẩu mới cho tài khoản @{formData.TenTK}
                      </label>
                      <input
                        type="text"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Nhập mật khẩu mới (ít nhất 6 ký tự)..."
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={resettingPw}
                      className="px-6 py-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition cursor-pointer"
                    >
                      {resettingPw ? 'Đang cấp lại...' : 'Cấp Lại Mật Khẩu'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </main>
        </div>
      )}
    </ProtectedRoute>
  );
}