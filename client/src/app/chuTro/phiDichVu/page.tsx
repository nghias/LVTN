'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import QuanLyHeader from '@/components/layout/QuanLyHeader';
import { useAlertModal } from '@/components/common/AlertModalProvider';
import { dichVuService, DichVuItem } from '@/services/dichVu.service';

export default function QuanLyPhiDichVuPage() {
  const router = useRouter();
  const { showConfirm, showSuccess, showError } = useAlertModal();

  const [danhSach, setDanhSach] = useState<DichVuItem[]>([]);
  const [search, setSearch] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  const formatVND = (val: number | string) => {
    const num = Math.round(Number(val) || 0);
    return num.toLocaleString('vi-VN') + ' đ';
  };

  const fetchDichVu = useCallback(
    async (keyword: string = '') => {
      try {
        setLoading(true);
        const res = await dichVuService.getList(keyword);
        if (res.success) {
          setDanhSach(res.data || []);
        } else {
          showError(res.message || 'Không thể tải danh sách phí dịch vụ');
        }
      } catch {
        showError('Lỗi kết nối máy chủ');
      } finally {
        setLoading(false);
      }
    },
    [showError]
  );

  useEffect(() => {
    fetchDichVu('');
  }, [fetchDichVu]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDichVu(search);
  };

  const handleDelete = (item: DichVuItem) => {
    showConfirm(
      `Bạn có chắc chắn muốn xóa phí dịch vụ "${item.TenDV}" không?`,
      'Xác nhận xóa phí dịch vụ',
      async () => {
        try {
          const res = await dichVuService.delete(item.MaDV);
          if (res.success) {
            showSuccess(res.message || 'Đã xóa phí dịch vụ thành công!');
            fetchDichVu(search);
          } else {
            showError(res.message || 'Không thể xóa phí dịch vụ');
          }
        } catch {
          showError('Lỗi kết nối khi xóa phí dịch vụ');
        }
      },
      'Xác nhận xóa',
      'Hủy'
    );
  };

  return (
    <ProtectedRoute allowedRoles={['ChuTro', 'QuanLy']}>
      {(user) => (
        <div className="min-h-screen flex flex-col bg-white text-slate-900">
          <QuanLyHeader user={user} />

          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            {/* Tiêu đề trang */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  Quản Lý Phí Dịch Vụ
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Thiết lập danh mục và đơn giá các dịch vụ (WiFi, Máy giặt chung, Vệ sinh & Rác, Giữ xe...) để chọn khi lập hợp đồng thuê.
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => router.push('/chuTro/phiDichVu/them')}
                  className="px-5 py-2.5 rounded-full bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 text-xs font-bold shadow-xs transition cursor-pointer whitespace-nowrap"
                >
                  + Thêm Phí Dịch Vụ
                </button>
              </div>
            </div>

            {/* Thanh tìm kiếm */}
            <div className="mt-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <form onSubmit={handleSearchSubmit} className="flex flex-1 gap-2">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm theo tên dịch vụ, đơn vị tính, mô tả..."
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
                />
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition cursor-pointer whitespace-nowrap"
                >
                  Tìm kiếm
                </button>
                {search && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch('');
                      fetchDichVu('');
                    }}
                    className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-600 text-xs font-semibold hover:bg-slate-100 transition cursor-pointer whitespace-nowrap"
                  >
                    Đặt lại
                  </button>
                )}
              </form>

              <div className="text-xs font-semibold text-slate-600 whitespace-nowrap">
                Tổng cộng:{' '}
                <span className="text-slate-900 font-bold">{danhSach.length}</span> dịch vụ
              </div>
            </div>

            {/* Danh sách phí dịch vụ */}
            {loading ? (
              <div className="py-16 text-center text-slate-500 text-sm font-medium">
                Đang tải danh sách phí dịch vụ...
              </div>
            ) : danhSach.length === 0 ? (
              <div className="mt-8 p-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                <p className="text-sm text-slate-600 font-medium">
                  Không tìm thấy khoản phí dịch vụ nào.
                </p>
                <button
                  type="button"
                  onClick={() => router.push('/chuTro/phiDichVu/them')}
                  className="mt-4 px-5 py-2.5 rounded-full bg-[#00FFCC] text-slate-900 text-xs font-bold hover:bg-[#00e6b8] transition cursor-pointer"
                >
                  + Thêm phí dịch vụ đầu tiên
                </button>
              </div>
            ) : (
              <>
                {/* Bảng trên Máy tính */}
                <div className="hidden md:block mt-6 overflow-x-auto rounded-2xl border border-slate-200 shadow-xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase tracking-wider">
                        <th className="py-3.5 px-4 font-bold whitespace-nowrap w-20">Mã DV</th>
                        <th className="py-3.5 px-4 font-bold whitespace-nowrap w-52">Tên Dịch Vụ</th>
                        <th className="py-3.5 px-4 font-bold whitespace-nowrap w-36">Đơn Giá</th>
                        <th className="py-3.5 px-4 font-bold whitespace-nowrap w-32">Đơn Vị Tính</th>
                        <th className="py-3.5 px-4 font-bold">Mô Tả</th>
                        <th className="py-3.5 px-4 font-bold text-center whitespace-nowrap w-40">
                          Hợp Đồng Áp Dụng
                        </th>
                        <th className="py-3.5 px-4 font-bold text-right whitespace-nowrap w-36">
                          Thao Tác
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-xs sm:text-sm">
                      {danhSach.map((item) => (
                        <tr key={item.MaDV} className="hover:bg-slate-50/80 transition">
                          <td className="py-4 px-4 font-bold text-slate-900 whitespace-nowrap">
                            #{item.MaDV}
                          </td>
                          <td className="py-4 px-4 font-bold text-slate-900 whitespace-nowrap">
                            {item.TenDV}
                          </td>
                          <td className="py-4 px-4 font-bold text-teal-700 whitespace-nowrap">
                            {formatVND(item.DonGia)}
                          </td>
                          <td className="py-4 px-4 whitespace-nowrap">
                            <span className="inline-block px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold">
                              {item.DonViTinh}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-slate-600 text-xs leading-relaxed">
                            {item.MoTa || (
                              <span className="italic text-slate-400">Chưa có mô tả</span>
                            )}
                          </td>
                          <td className="py-4 px-4 text-center whitespace-nowrap">
                            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-[#00FFCC]/30 text-slate-900 border border-[#00FFCC] whitespace-nowrap">
                              {item.SoHopDongApDung || 0} hợp đồng
                            </span>
                          </td>
                          <td className="py-4 px-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => router.push(`/chuTro/phiDichVu/sua/${item.MaDV}`)}
                                className="px-3.5 py-1.5 rounded-xl bg-amber-100 text-amber-800 text-xs font-bold hover:bg-amber-200 transition cursor-pointer whitespace-nowrap"
                              >
                                Sửa
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(item)}
                                className="px-3.5 py-1.5 rounded-xl bg-red-100 text-red-700 text-xs font-bold hover:bg-red-200 transition cursor-pointer whitespace-nowrap"
                              >
                                Xóa
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Thẻ Card trên Điện thoại */}
                <div className="grid grid-cols-1 gap-4 mt-6 md:hidden">
                  {danhSach.map((item) => (
                    <div
                      key={item.MaDV}
                      className="p-4 rounded-2xl border border-slate-200 bg-white shadow-xs flex flex-col justify-between gap-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-xs font-bold text-slate-400">Mã #{item.MaDV}</span>
                          <h3 className="text-base font-bold text-slate-900">{item.TenDV}</h3>
                          <p className="text-sm font-bold text-teal-700 mt-0.5">
                            {formatVND(item.DonGia)}{' '}
                            <span className="text-xs font-semibold text-slate-500">
                              / {item.DonViTinh}
                            </span>
                          </p>
                        </div>
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#00FFCC]/30 text-slate-900 border border-[#00FFCC] whitespace-nowrap shrink-0">
                          {item.SoHopDongApDung || 0} hợp đồng
                        </span>
                      </div>

                      <p className="text-xs text-slate-600">
                        {item.MoTa || 'Chưa có mô tả chi tiết'}
                      </p>

                      <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => router.push(`/chuTro/phiDichVu/sua/${item.MaDV}`)}
                          className="px-4 py-2 rounded-xl bg-amber-100 text-amber-800 text-xs font-bold cursor-pointer"
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item)}
                          className="px-4 py-2 rounded-xl bg-red-100 text-red-700 text-xs font-bold cursor-pointer"
                        >
                          Xóa
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </main>
        </div>
      )}
    </ProtectedRoute>
  );
}