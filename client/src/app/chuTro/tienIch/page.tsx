'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { tienIchService, TienIchItem } from '@/services/tienIch.service';

export default function QuanLyTienIchPage() {
  const router = useRouter();
  const [danhSach, setDanhSach] = useState<TienIchItem[]>([]);
  const [search, setSearch] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  // State thông báo và hộp thoại xác nhận xóa
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<TienIchItem | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 2500);
  };

  const fetchTienIch = useCallback(async (keyword: string = '') => {
    try {
      setLoading(true);
      const res = await tienIchService.getList(keyword);
      if (res.success) {
        setDanhSach(res.data || []);
      } else {
        showToast('error', res.message || 'Không thể tải danh sách tiện ích');
      }
    } catch {
      showToast('error', 'Lỗi kết nối máy chủ');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTienIch('');
  }, [fetchTienIch]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTienIch(search);
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    try {
      setDeleting(true);
      const res = await tienIchService.delete(confirmDelete.MaTI);
      if (res.success) {
        showToast('success', res.message || 'Xóa tiện ích thành công');
        setConfirmDelete(null);
        fetchTienIch(search);
      } else {
        showToast('error', res.message || 'Không thể xóa tiện ích');
        setConfirmDelete(null);
      }
    } catch {
      showToast('error', 'Lỗi kết nối khi xóa tiện ích');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white p-4 md:p-8 text-slate-800">
      {/* Thông báo nổi */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-xl shadow-lg font-medium transition-all ${
            toast.type === 'success'
              ? 'bg-[#00FFCC] text-slate-900 border border-teal-400'
              : 'bg-red-600 text-white'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">
              Quản Lý Danh Mục Tiện Ích
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Thiết lập các tiện ích đi kèm phòng trọ (Gác lửng, Máy lạnh, Tủ lạnh, Wifi...)
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/chuTro/phongTro')}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-100 transition"
            >
              ← Về Phòng trọ
            </button>
            <button
              onClick={() => router.push('/chuTro/tienIch/them')}
              className="px-5 py-2.5 rounded-xl bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 font-bold shadow-sm transition"
            >
              + Thêm Tiện Ích
            </button>
          </div>
        </div>

        {/* Thanh tìm kiếm & Thống kê nhanh */}
        <div className="mt-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
          <form onSubmit={handleSearchSubmit} className="flex flex-1 gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên tiện ích, mô tả hoặc mã..."
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
            />
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 transition"
            >
              Tìm kiếm
            </button>
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  fetchTienIch('');
                }}
                className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 transition"
              >
                Đặt lại
              </button>
            )}
          </form>

          <div className="text-sm font-semibold text-slate-600">
            Tổng cộng: <span className="text-slate-900 font-bold">{danhSach.length}</span> tiện ích
          </div>
        </div>

        {/* Danh sách tiện ích (Bảng trên Desktop & Card trên Mobile) */}
        {loading ? (
          <div className="py-16 text-center text-slate-500 font-medium">
            Đang tải danh sách tiện ích...
          </div>
        ) : danhSach.length === 0 ? (
          <div className="mt-8 p-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300">
            <p className="text-slate-600 font-medium">Không tìm thấy tiện ích nào phù hợp.</p>
            <button
              onClick={() => router.push('/chuTro/tienIch/them')}
              className="mt-4 px-5 py-2.5 rounded-xl bg-[#00FFCC] text-slate-900 font-bold hover:bg-[#00e6b8] transition"
            >
              + Thêm tiện ích đầu tiên
            </button>
          </div>
        ) : (
          <>
            {/* Bảng trên màn hình lớn */}
            <div className="hidden md:block mt-6 overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 text-sm uppercase">
                    <th className="py-3.5 px-4 font-bold w-20">Mã TI</th>
                    <th className="py-3.5 px-4 font-bold w-64">Tên Tiện Ích</th>
                    <th className="py-3.5 px-4 font-bold">Mô Tả Chi Tiết</th>
                    <th className="py-3.5 px-4 font-bold text-center w-40">Số Phòng Dùng</th>
                    <th className="py-3.5 px-4 font-bold text-right w-44">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {danhSach.map((item) => (
                    <tr key={item.MaTI} className="hover:bg-slate-50/80 transition">
                      <td className="py-4 px-4 font-bold text-slate-900">#{item.MaTI}</td>
                      <td className="py-4 px-4 font-bold text-slate-900 text-base">
                        {item.TenTI}
                      </td>
                      <td className="py-4 px-4 text-slate-600">
                        {item.MoTa || <span className="italic text-slate-400">Chưa có mô tả</span>}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-[#00FFCC]/30 text-slate-900 border border-[#00FFCC]">
                          {item.SoPhongSuDung || 0} phòng
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right space-x-2">
                        <button
                          onClick={() => router.push(`/chuTro/tienIch/sua/${item.MaTI}`)}
                          className="px-3.5 py-1.5 rounded-lg bg-amber-100 text-amber-800 font-semibold hover:bg-amber-200 transition"
                        >
                          Sửa
                        </button>
                        <button
                          onClick={() => setConfirmDelete(item)}
                          className="px-3.5 py-1.5 rounded-lg bg-red-100 text-red-700 font-semibold hover:bg-red-200 transition"
                        >
                          Xóa
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Lưới thẻ (Card) trên màn hình Điện thoại */}
            <div className="grid grid-cols-1 gap-4 mt-6 md:hidden">
              {danhSach.map((item) => (
                <div
                  key={item.MaTI}
                  className="p-4 rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col justify-between gap-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-xs font-bold text-slate-400">Mã #{item.MaTI}</span>
                      <h3 className="text-lg font-bold text-slate-900">{item.TenTI}</h3>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#00FFCC]/30 text-slate-900 border border-[#00FFCC]">
                      {item.SoPhongSuDung || 0} phòng
                    </span>
                  </div>

                  <p className="text-sm text-slate-600">
                    {item.MoTa || 'Chưa có mô tả chi tiết'}
                  </p>

                  <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                      onClick={() => router.push(`/chuTro/tienIch/sua/${item.MaTI}`)}
                      className="px-4 py-2 rounded-xl bg-amber-100 text-amber-800 text-sm font-semibold"
                    >
                      Sửa
                    </button>
                    <button
                      onClick={() => setConfirmDelete(item)}
                      className="px-4 py-2 rounded-xl bg-red-100 text-red-700 text-sm font-semibold"
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Hộp thoại xác nhận Xóa */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-lg font-extrabold text-slate-900">Xác nhận xóa tiện ích</h3>
            <p className="mt-2 text-sm text-slate-600">
              Bạn có chắc chắn muốn xóa tiện ích{' '}
              <span className="font-bold text-slate-900">&quot;{confirmDelete.TenTI}&quot;</span>{' '}
              không?
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                disabled={deleting}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-100"
              >
                Hủy
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="px-5 py-2 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? 'Đang xóa...' : 'Xác nhận xóa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}