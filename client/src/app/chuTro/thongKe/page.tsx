'use client';

import ProtectedRoute from '../../../components/common/ProtectedRoute';
import QuanLyHeader from '../../../components/layout/QuanLyHeader';
import { useAlertModal } from '../../../components/common/AlertModalProvider';

export default function ThongKeChuTroPage() {
  const { showSuccess, showError, showConfirm } = useAlertModal();

  return (
    <ProtectedRoute allowedRoles={['ChuTro', 'QuanLy']}>
      {(user) => (
        <div className="flex-1 flex flex-col bg-white text-slate-900">
          <QuanLyHeader user={user} />

          <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-12 flex flex-col items-center justify-center text-center">
            <div className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-12 shadow-lg max-w-2xl w-full">
              <span className="inline-block px-3.5 py-1 rounded-full text-xs font-bold bg-[#00FFCC] text-slate-900 mb-4">
                Bảng điều khiển trung tâm
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-snug">
                Xin chào {user.Quyen === 'ChuTro' ? 'Chủ trọ' : 'Quản lý'}{' '}
                {user.HoTen}, chào mừng bạn đến với trang Thống kê!
              </h1>
              <p className="text-sm text-slate-500 mt-3">
                Kiểm tra 3 loại Modal (Thành công xanh lá tự tắt, Thất bại đỏ tự tắt, Xác nhận #00FFCC không đếm ngược):
              </p>

              <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() =>
                    showSuccess('Đã đồng bộ chỉ số điện nước IoT thành công!')
                  }
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-full shadow-xs transition cursor-pointer"
                >
                  Modal Thành công (2s)
                </button>

                <button
                  type="button"
                  onClick={() =>
                    showError('Không thể kết nối đồng hồ phòng P.102!', 'Lỗi kết nối IoT', 3)
                  }
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-full shadow-xs transition cursor-pointer"
                >
                  Modal Thất bại (3s)
                </button>

                <button
                  type="button"
                  onClick={() =>
                    showConfirm(
                      'Bạn có chắc chắn muốn khóa thẻ từ RFID của phòng P.103 không?',
                      'Xác nhận hành động quan trọng',
                      () => showSuccess('Đã khóa thẻ từ phòng P.103 thành công!'),
                      'Xác nhận',
                      'Hủy'
                    )
                  }
                  className="px-5 py-2.5 bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 border border-teal-300 text-xs font-bold rounded-full shadow-xs transition cursor-pointer"
                >
                  Modal Xác nhận (Không đếm ngược)
                </button>
              </div>
            </div>
          </main>
        </div>
      )}
    </ProtectedRoute>
  );
}