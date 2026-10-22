'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import QuanLyHeader from '@/components/layout/QuanLyHeader';
import NguoiThueHeader from '@/components/layout/NguoiThueHeader';
import { useAlertModal } from '@/components/common/AlertModalProvider';

export default function QuenMatKhauPage() {
  const router = useRouter();
  const { showSuccess, showError } = useAlertModal();
  const [contactInfo, setContactInfo] = useState('');
  const [note, setNote] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!contactInfo.trim()) {
      showError('Vui lòng nhập Email hoặc Số điện thoại đã đăng ký!');
      return;
    }
    showSuccess(
      `Đã gửi yêu cầu hỗ trợ cấp lại mật khẩu cho "${contactInfo}"!`,
      'Đã gửi yêu cầu',
      2.5
    );
    setContactInfo('');
    setNote('');
  };

  return (
    <ProtectedRoute allowedRoles={['ChuTro', 'QuanLy', 'KhachThue']}>
      {(user) => (
        <div className="flex-1 flex flex-col bg-white text-slate-900">
          {user.Quyen === 'KhachThue' ? (
            <NguoiThueHeader user={user} />
          ) : (
            <QuanLyHeader user={user} />
          )}

          <main className="flex-1 max-w-xl w-full mx-auto px-4 py-6 sm:py-10">
            <div className="mb-6 space-y-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                ← Quay lại trang trước
              </button>

              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <Link
                  href="/taiKhoan/thongTin"
                  className="px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap bg-slate-100 text-slate-600 hover:bg-slate-200 no-underline"
                >
                  Thông tin cá nhân
                </Link>
                <Link
                  href="/taiKhoan/doiMatKhau"
                  className="px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap bg-slate-100 text-slate-600 hover:bg-slate-200 no-underline"
                >
                  Đổi mật khẩu
                </Link>
                <Link
                  href="/taiKhoan/quenMatKhau"
                  className="px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap bg-[#00FFCC] text-slate-900 border border-teal-300 no-underline"
                >
                  Quên mật khẩu
                </Link>
              </div>
            </div>

            <form
              onSubmit={handleSubmit}
              className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-8 shadow-sm space-y-5"
            >
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                  Yêu Cầu Cấp Lại Mật Khẩu
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Gửi thông tin xác minh để Chủ trọ hoặc Quản lý hỗ trợ đặt lại mật khẩu
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Email hoặc Số điện thoại đăng ký *
                </label>
                <input
                  type="text"
                  value={contactInfo}
                  onChange={(e) => setContactInfo(e.target.value)}
                  placeholder="Nhập Email hoặc SĐT của bạn..."
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Ghi chú xác minh (Số phòng / Khu trọ)
                </label>
                <textarea
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="VD: Phòng P.101 - Cơ sở 1 Tạ Quang Bửu..."
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
                />
              </div>

              <div className="p-4 rounded-2xl bg-[#00FFCC]/15 border border-[#00FFCC] text-xs text-slate-700 space-y-1">
                <p className="font-bold text-slate-900 mb-1">
                  Liên hệ hỗ trợ trực tiếp:
                </p>
                <p>• Chủ trọ (Nguyễn Thị Quỳnh Dư): 0903.112.233</p>
                <p>• Quản lý Cơ sở 1 (Tuấn Nghĩa): 0931.493.785</p>
                <p>• Quản lý Cơ sở 2 (Nhật Nguyên): 0383.193.961</p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="w-full sm:w-auto px-6 py-3 rounded-full border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-8 py-3 rounded-full bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 text-xs font-bold shadow-xs cursor-pointer"
                >
                  Gửi Yêu Cầu
                </button>
              </div>
            </form>
          </main>
        </div>
      )}
    </ProtectedRoute>
  );
}