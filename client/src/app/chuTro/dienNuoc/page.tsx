'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import QuanLyHeader from '@/components/layout/QuanLyHeader';
import { useAlertModal } from '@/components/common/AlertModalProvider';
import {
  dienNuocService,
  ChiSoDienNuocItem,
  GiaDienNuocItem,
  KhuTroOption,
  PhongDienNuocOption,
} from '@/services/dienNuoc.service';

export default function QuanLyDienNuocPage() {
  const router = useRouter();
  const { showConfirm, showSuccess, showError } = useAlertModal();

  const getCurrentMonth = () => new Date().toISOString().slice(0, 7);

  const [danhSach, setDanhSach] = useState<ChiSoDienNuocItem[]>([]);
  const [khuTroList, setKhuTroList] = useState<KhuTroOption[]>([]);
  const [phongList, setPhongList] = useState<PhongDienNuocOption[]>([]);
  const [giaHienTai, setGiaHienTai] = useState<GiaDienNuocItem>({
    MaGia: 1,
    GiaDien: 3800,
    GiaNuoc: 18000,
    NgayApDung: '2026-08-01',
  });

  const [selectedMaKhu, setSelectedMaKhu] = useState<string>('');
  const [selectedMaPhong, setSelectedMaPhong] = useState<string>('');
  // Khởi tạo chuẩn YYYY-MM giống trang Hóa đơn để không bị lỗi hiển thị "---------- ----"
  const [thangNam, setThangNam] = useState<string>(() => getCurrentMonth());
  const [search, setSearch] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  const formatVND = (val: number | string) => {
    const num = Math.round(Number(val) || 0);
    return num.toLocaleString('vi-VN') + ' đ';
  };

  const formatDateVN = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
  };

  const fetchDanhSach = async (filters?: {
    maKhu?: string;
    maPhong?: string;
    thangNam?: string;
    search?: string;
  }) => {
    try {
      setLoading(true);
      const res = await dienNuocService.getList({
        maKhu: filters?.maKhu ?? selectedMaKhu,
        maPhong: filters?.maPhong ?? selectedMaPhong,
        thangNam: filters?.thangNam ?? thangNam,
        search: filters?.search ?? search,
      });

      if (res.success) {
        setDanhSach(res.data || []);
        if (res.khuTroList) setKhuTroList(res.khuTroList);
        if (res.phongList) setPhongList(res.phongList);
        if (res.giaHienTai) setGiaHienTai(res.giaHienTai);
      } else {
        showError('Không thể tải danh sách chỉ số điện nước.');
      }
    } catch {
      showError('Lỗi kết nối máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDanhSach({ maKhu: '', maPhong: '', thangNam: '', search: '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectKhu = (maKhu: string) => {
    setSelectedMaKhu(maKhu);
    setSelectedMaPhong('');
    fetchDanhSach({ maKhu, maPhong: '', thangNam, search });
  };

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDanhSach({
      maKhu: selectedMaKhu,
      maPhong: selectedMaPhong,
      thangNam,
      search,
    });
  };

  const handleResetFilters = () => {
    const currentMonth = getCurrentMonth();
    setSelectedMaKhu('');
    setSelectedMaPhong('');
    setThangNam(currentMonth);
    setSearch('');
    fetchDanhSach({ maKhu: '', maPhong: '', thangNam: '', search: '' });
  };

  const handleDelete = (item: ChiSoDienNuocItem) => {
    showConfirm(
      `Bạn có chắc chắn muốn xóa chỉ số điện nước của "${item.TenPhong}" (${item.TenKhu}) ghi ngày ${formatDateVN(item.NgayGhi)} không?`,
      'Xác nhận xóa chỉ số điện nước',
      async () => {
        try {
          const res = await dienNuocService.deleteChiSo(item.MaCS);
          if (res.success) {
            showSuccess('Đã xóa chỉ số điện nước thành công!');
            fetchDanhSach();
          } else {
            showError('Không thể xóa chỉ số điện nước.');
          }
        } catch {
          showError('Lỗi kết nối khi xóa chỉ số điện nước.');
        }
      },
      'Xác nhận xóa',
      'Hủy'
    );
  };

  const filteredPhongOptions = selectedMaKhu
    ? phongList.filter((p) => Number(p.MaKhu) === Number(selectedMaKhu))
    : phongList;

  return (
    <ProtectedRoute allowedRoles={['ChuTro', 'QuanLy']}>
      {(user) => (
        <div className="min-h-screen flex flex-col bg-white text-slate-900">
          <QuanLyHeader user={user} />

          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            {/* Tiêu đề & Cụm nút thao tác */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-6 border-b border-slate-200">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  Quản Lý Chỉ Số & Đơn Giá Điện Nước
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Ghi nhận, tra cứu lịch sử chỉ số tiêu thụ điện (kWh), nước (m³) từng phòng và quản lý đơn giá điện nước.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => router.push('/chuTro/dienNuoc/giaDienNuoc')}
                  className="px-5 py-2.5 rounded-full border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold transition cursor-pointer whitespace-nowrap"
                >
                  ⚙ Cập Nhật Giá Điện Nước
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/chuTro/dienNuoc/them')}
                  className="px-5 py-2.5 rounded-full bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 text-xs font-bold shadow-xs transition cursor-pointer whitespace-nowrap"
                >
                  + Thêm Chỉ Số Điện Nước
                </button>
              </div>
            </div>

            {/* Banner hiển thị Đơn giá Điện & Nước đang áp dụng */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-amber-800 uppercase">
                    Đơn giá Điện hiện hành
                  </span>
                  <p className="text-lg sm:text-xl font-bold text-slate-900 mt-1">
                    {formatVND(giaHienTai.GiaDien)}{' '}
                    <span className="text-xs font-semibold text-slate-500">/ kWh</span>
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
                  Điện năng
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-sky-800 uppercase">
                    Đơn giá Nước hiện hành
                  </span>
                  <p className="text-lg sm:text-xl font-bold text-slate-900 mt-1">
                    {formatVND(giaHienTai.GiaNuoc)}{' '}
                    <span className="text-xs font-semibold text-slate-500">/ m³</span>
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full bg-sky-100 text-sky-800 text-xs font-bold">
                  Nước sạch
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-600 uppercase">
                    Ngày bắt đầu áp dụng
                  </span>
                  <p className="text-base sm:text-lg font-bold text-slate-900 mt-1">
                    {formatDateVN(giaHienTai.NgayApDung)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => router.push('/chuTro/dienNuoc/giaDienNuoc')}
                  className="text-xs font-bold text-teal-700 hover:underline cursor-pointer"
                >
                  Đổi đơn giá →
                </button>
              </div>
            </div>

            {/* Thanh chọn nhanh Cơ sở (Khu trọ) */}
            {khuTroList.length > 1 && (
              <div className="mt-6 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectKhu('')}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                    selectedMaKhu === ''
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Tất cả cơ sở ({khuTroList.length})
                </button>
                {khuTroList.map((khu) => (
                  <button
                    key={khu.MaKhu}
                    type="button"
                    onClick={() => handleSelectKhu(String(khu.MaKhu))}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                      selectedMaKhu === String(khu.MaKhu)
                        ? 'bg-[#00FFCC] text-slate-900 border border-teal-400'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {khu.TenKhu}
                  </button>
                ))}
              </div>
            )}

            {/* Bộ lọc giãn đều 100% chiều ngang */}
            <form
              onSubmit={handleFilterSubmit}
              className="mt-4 w-full bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 flex flex-col lg:flex-row lg:items-end justify-between gap-4"
            >
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
                <div className="w-full">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Lọc theo phòng
                  </label>
                  <select
                    value={selectedMaPhong}
                    onChange={(e) => {
                      setSelectedMaPhong(e.target.value);
                      fetchDanhSach({
                        maKhu: selectedMaKhu,
                        maPhong: e.target.value,
                        thangNam,
                        search,
                      });
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
                  >
                    <option value="">-- Tất cả phòng --</option>
                    {filteredPhongOptions.map((p) => (
                      <option key={p.MaPhong} value={p.MaPhong}>
                        {p.TenPhong} {khuTroList.length > 1 ? `(${p.TenKhu})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Kỳ ghi (Tháng/Năm)
                  </label>
                  <input
                    type="month"
                    value={thangNam}
                    onChange={(e) => {
                      const val = e.target.value;
                      const safeMonth = val || getCurrentMonth();
                      setThangNam(safeMonth);
                      try {
                        fetchDanhSach({
                          maKhu: selectedMaKhu,
                          maPhong: selectedMaPhong,
                          thangNam: val,
                          search,
                        });
                      } catch {
                        showError('Không thể tải dữ liệu theo kỳ ghi đã chọn.');
                      }
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
                  />
                </div>

                <div className="w-full">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Từ khóa tìm kiếm
                  </label>
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Tìm theo tên phòng, tên khu trọ, mã CS..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition cursor-pointer whitespace-nowrap"
                >
                  Lọc dữ liệu
                </button>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-bold hover:bg-slate-100 transition cursor-pointer whitespace-nowrap"
                >
                  Xem hết
                </button>
              </div>
            </form>

            {/* Danh sách chỉ số điện nước */}
            {loading ? (
              <div className="py-16 text-center text-slate-500 text-sm font-medium">
                Đang tải danh sách chỉ số điện nước...
              </div>
            ) : danhSach.length === 0 ? (
              <div className="mt-8 p-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                <p className="text-sm text-slate-600 font-medium">
                  Chưa có bản ghi chỉ số điện nước nào phù hợp với bộ lọc.
                </p>
                <button
                  type="button"
                  onClick={() => router.push('/chuTro/dienNuoc/them')}
                  className="mt-4 px-5 py-2.5 rounded-full bg-[#00FFCC] text-slate-900 text-xs font-bold hover:bg-[#00e6b8] transition cursor-pointer"
                >
                  + Ghi chỉ số điện nước mới
                </button>
              </div>
            ) : (
              <>
                {/* Bảng trên Máy tính */}
                <div className="hidden md:block mt-6 overflow-x-auto rounded-2xl border border-slate-200 shadow-xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase tracking-wider">
                        <th className="py-3.5 px-4 font-bold whitespace-nowrap">Mã CS</th>
                        <th className="py-3.5 px-4 font-bold whitespace-nowrap">Phòng / Cơ Sở</th>
                        <th className="py-3.5 px-4 font-bold whitespace-nowrap">Ngày Ghi</th>
                        <th className="py-3.5 px-4 font-bold whitespace-nowrap">
                          Chỉ Số Điện (kWh)
                        </th>
                        <th className="py-3.5 px-4 font-bold whitespace-nowrap">
                          Chỉ Số Nước (m³)
                        </th>
                        <th className="py-3.5 px-4 font-bold whitespace-nowrap text-right">
                          Thành Tiền Tạm Tính
                        </th>
                        <th className="py-3.5 px-4 font-bold whitespace-nowrap text-right">
                          Thao Tác
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-xs sm:text-sm">
                      {danhSach.map((item) => (
                        <tr key={item.MaCS} className="hover:bg-slate-50/80 transition">
                          <td className="py-4 px-4 font-bold text-slate-900 whitespace-nowrap">
                            #{item.MaCS}
                          </td>
                          <td className="py-4 px-4 whitespace-nowrap">
                            <p className="font-bold text-slate-900">{item.TenPhong}</p>
                            <p className="text-xs text-slate-500">{item.TenKhu}</p>
                          </td>
                          <td className="py-4 px-4 font-semibold text-slate-700 whitespace-nowrap">
                            {formatDateVN(item.NgayGhi)}
                          </td>
                          <td className="py-4 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span className="text-slate-500">{item.SoDienCu}</span>
                              <span className="text-slate-400">→</span>
                              <span className="font-bold text-slate-900">{item.SoDienMoi}</span>
                              <span className="ml-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-xs font-bold">
                                +{item.SoDienTieuThu} kWh
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              Tiền điện: {formatVND(item.TienDienTamTinh)}
                            </p>
                          </td>
                          <td className="py-4 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span className="text-slate-500">{item.SoNuocCu}</span>
                              <span className="text-slate-400">→</span>
                              <span className="font-bold text-slate-900">{item.SoNuocMoi}</span>
                              <span className="ml-1 px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 text-xs font-bold">
                                +{item.SoNuocTieuThu} m³
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              Tiền nước: {formatVND(item.TienNuocTamTinh)}
                            </p>
                          </td>
                          <td className="py-4 px-4 text-right whitespace-nowrap">
                            <span className="font-bold text-teal-700 text-sm">
                              {formatVND(item.TongTienDienNuoc)}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => router.push(`/chuTro/dienNuoc/sua/${item.MaCS}`)}
                                className="px-3.5 py-1.5 rounded-xl bg-amber-100 text-amber-800 text-xs font-bold hover:bg-amber-200 transition cursor-pointer"
                              >
                                Sửa
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(item)}
                                className="px-3.5 py-1.5 rounded-xl bg-red-100 text-red-700 text-xs font-bold hover:bg-red-200 transition cursor-pointer"
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
                      key={item.MaCS}
                      className="p-4 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-xs font-bold text-slate-400">
                            Mã CS #{item.MaCS} • {formatDateVN(item.NgayGhi)}
                          </span>
                          <h3 className="text-base font-bold text-slate-900 mt-0.5">
                            {item.TenPhong}
                          </h3>
                          <p className="text-xs text-slate-500">{item.TenKhu}</p>
                        </div>
                        <span className="text-sm font-bold text-teal-700">
                          {formatVND(item.TongTienDienNuoc)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                        <div className="p-2.5 rounded-xl bg-amber-50/70">
                          <span className="text-slate-500 block">Điện (kWh)</span>
                          <span className="font-bold text-slate-900">
                            {item.SoDienCu} → {item.SoDienMoi} (+{item.SoDienTieuThu})
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-sky-50/70">
                          <span className="text-slate-500 block">Nước (m³)</span>
                          <span className="font-bold text-slate-900">
                            {item.SoNuocCu} → {item.SoNuocMoi} (+{item.SoNuocTieuThu})
                          </span>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => router.push(`/chuTro/dienNuoc/sua/${item.MaCS}`)}
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