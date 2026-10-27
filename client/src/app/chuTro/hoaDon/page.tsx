'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import QuanLyHeader from '@/components/layout/QuanLyHeader';
import { useAlertModal } from '@/components/common/AlertModalProvider';
import {
  hoaDonService,
  HoaDonItem,
  KhuTroOption,
  PhongOption,
} from '@/services/hoaDon.service';

export default function QuanLyHoaDonPage() {
  const { showSuccess, showError, showConfirm } = useAlertModal();

  const [hoaDonList, setHoaDonList] = useState<HoaDonItem[]>([]);
  const [khuTroList, setKhuTroList] = useState<KhuTroOption[]>([]);
  const [phongList, setPhongList] = useState<PhongOption[]>([]);

  const [selectedMaKhu, setSelectedMaKhu] = useState<number>(0);
  const [selectedMaPhong, setSelectedMaPhong] = useState<number>(0);
  const [thangNam, setThangNam] = useState<string>(() =>
    new Date().toISOString().slice(0, 7)
  );
  const [trangThaiTT, setTrangThaiTT] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  const formatVND = (val: number | string) => {
    const num = Math.round(Number(val) || 0);
    return num.toLocaleString('vi-VN') + ' đ';
  };

  const formatDateVN = (dateStr?: string) => {
    if (!dateStr) return '';
    const parts = dateStr.slice(0, 10).split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
  };

  const fetchDanhSach = useCallback(
    async (filters?: {
      maKhu?: number;
      maPhong?: number;
      thangNam?: string;
      trangThaiTT?: string;
      search?: string;
    }) => {
      try {
        setLoading(true);
        const res = await hoaDonService.getAll({
          maKhu: filters?.maKhu ?? selectedMaKhu,
          maPhong: filters?.maPhong ?? selectedMaPhong,
          thangNam: filters?.thangNam ?? thangNam,
          trangThaiTT: filters?.trangThaiTT ?? trangThaiTT,
          search: filters?.search ?? search,
        });

        if (res.success && res.data) {
          setHoaDonList(res.data.hoaDonList || []);
          const khus: KhuTroOption[] = res.data.khuTroList || [];
          setKhuTroList(khus);
          setPhongList(res.data.phongList || []);

          if (khus.length === 1 && (filters?.maKhu ?? selectedMaKhu) === 0) {
            setSelectedMaKhu(khus[0].MaKhu);
          }
        } else {
          showError('Không thể tải danh sách hóa đơn.');
        }
      } catch {
        showError('Không thể kết nối máy chủ để tải danh sách hóa đơn.');
      } finally {
        setLoading(false);
      }
    },
    [selectedMaKhu, selectedMaPhong, thangNam, trangThaiTT, search, showError]
  );

  useEffect(() => {
    fetchDanhSach();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = (item: HoaDonItem) => {
    if (Number(item.TienDaTra) > 0) {
      showError(
        `Hóa đơn #${item.MaHD} của ${item.TenPhong} đã có thanh toán nên không thể xóa!`
      );
      return;
    }

    showConfirm(
      `Bạn có chắc chắn muốn xóa hóa đơn #${item.MaHD} (${item.TenPhong} - kỳ ${formatDateVN(
        item.NgayTinh
      )}) không?`,
      'Xác nhận xóa hóa đơn',
      async () => {
        try {
          const res = await hoaDonService.delete(item.MaHD);
          if (res.success) {
            showSuccess('Đã xóa hóa đơn thành công!');
            fetchDanhSach();
          } else {
            showError(res.message || 'Không thể xóa hóa đơn này.');
          }
        } catch {
          showError('Không thể thực hiện xóa hóa đơn vào lúc này.');
        }
      },
      'Xác nhận xóa',
      'Hủy'
    );
  };

  const filteredPhongOptions =
    selectedMaKhu === 0
      ? phongList
      : phongList.filter((p) => Number(p.MaKhu) === Number(selectedMaKhu));

  // Thống kê nhanh trên danh sách đang lọc
  const tongPhaiThu = hoaDonList.reduce(
    (sum, item) => sum + Math.round(Number(item.TongTien) || 0),
    0
  );
  const tongDaThu = hoaDonList.reduce(
    (sum, item) => sum + Math.round(Number(item.TienDaTra) || 0),
    0
  );
  const tongConNo = Math.max(0, tongPhaiThu - tongDaThu);

  return (
    <ProtectedRoute allowedRoles={['ChuTro', 'QuanLy']}>
      {(user) => (
        <div className="min-h-screen flex flex-col bg-white text-slate-900">
          <QuanLyHeader user={user} />

          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
            {/* Tiêu đề & Nút Tạo hóa đơn hàng tháng */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  Quản Lý Hóa Đơn Hàng Tháng
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  {user.Quyen === 'ChuTro'
                    ? 'Quản lý hóa đơn tiền phòng, điện nước, dịch vụ và phí phát sinh của tất cả cơ sở.'
                    : 'Quản lý hóa đơn tiền phòng, điện nước, dịch vụ và phí phát sinh thuộc cơ sở của bạn.'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href={`/chuTro/hoaDon/tao?thangNam=${thangNam}`}
                  className="px-5 py-2.5 rounded-full bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 text-xs sm:text-sm font-bold shadow-xs no-underline transition"
                >
                  + Tạo Hóa Đơn Hàng Tháng
                </Link>
              </div>
            </div>

            {/* Tabs chọn Cơ sở (Chủ trọ thấy Tất cả cơ sở, Quản lý chỉ thấy cơ sở của mình) */}
            {khuTroList.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
                {user.Quyen === 'ChuTro' && khuTroList.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMaKhu(0);
                      setSelectedMaPhong(0);
                      fetchDanhSach({ maKhu: 0, maPhong: 0 });
                    }}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition cursor-pointer ${
                      selectedMaKhu === 0
                        ? 'bg-[#00FFCC] text-slate-900 shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Tất cả cơ sở
                  </button>
                )}

                {khuTroList.map((khu) => (
                  <button
                    key={khu.MaKhu}
                    type="button"
                    onClick={() => {
                      setSelectedMaKhu(khu.MaKhu);
                      setSelectedMaPhong(0);
                      fetchDanhSach({ maKhu: khu.MaKhu, maPhong: 0 });
                    }}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition cursor-pointer ${
                      selectedMaKhu === khu.MaKhu
                        ? 'bg-[#00FFCC] text-slate-900 shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {khu.TenKhu}
                  </button>
                ))}
              </div>
            )}

            {/* Thẻ thống kê nhanh */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70">
                <p className="text-xs font-bold text-slate-500">Tổng số hóa đơn</p>
                <p className="text-xl font-bold text-slate-900 mt-1">
                  {hoaDonList.length} hóa đơn
                </p>
              </div>
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70">
                <p className="text-xs font-bold text-slate-500">Tổng tiền phải thu</p>
                <p className="text-xl font-bold text-slate-900 mt-1">
                  {formatVND(tongPhaiThu)}
                </p>
              </div>
              <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/60">
                <p className="text-xs font-bold text-emerald-700">Đã thu</p>
                <p className="text-xl font-bold text-emerald-800 mt-1">
                  {formatVND(tongDaThu)}
                </p>
              </div>
              <div className="p-4 rounded-2xl border border-rose-200 bg-rose-50/60">
                <p className="text-xs font-bold text-rose-700">Còn nợ chưa thu</p>
                <p className="text-xl font-bold text-rose-800 mt-1">
                  {formatVND(tongConNo)}
                </p>
              </div>
            </div>

            {/* Bộ lọc Tìm kiếm, Phòng, Kỳ tháng, Trạng thái */}
            <div className="p-4 sm:p-5 rounded-3xl border border-slate-200 bg-slate-50/50 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 items-end">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Kỳ hóa đơn (Tháng/Năm)
                </label>
                <input
                  type="month"
                  value={thangNam}
                  onChange={(e) => {
                    const val = e.target.value;
                    setThangNam(val);
                    fetchDanhSach({ thangNam: val });
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Phòng trọ
                </label>
                <select
                  value={selectedMaPhong}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setSelectedMaPhong(val);
                    fetchDanhSach({ maPhong: val });
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
                >
                  <option value={0}>-- Tất cả phòng --</option>
                  {filteredPhongOptions.map((p) => (
                    <option key={p.MaPhong} value={p.MaPhong}>
                      {p.TenPhong}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Trạng thái thanh toán
                </label>
                <select
                  value={trangThaiTT}
                  onChange={(e) => {
                    const val = e.target.value;
                    setTrangThaiTT(val);
                    fetchDanhSach({ trangThaiTT: val });
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
                >
                  <option value="">-- Tất cả trạng thái --</option>
                  <option value="ChuaThanhToan">Chưa thanh toán</option>
                  <option value="MotPhan">Đã trả một phần</option>
                  <option value="DaThanhToan">Đã thanh toán đủ</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Tìm nhanh mã HĐ / tên phòng
                </label>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Nhập tên phòng, mã HĐ..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fetchDanhSach()}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-bold cursor-pointer transition"
                >
                  Lọc dữ liệu
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setThangNam('');
                    setSelectedMaPhong(0);
                    setTrangThaiTT('');
                    setSearch('');
                    fetchDanhSach({
                      thangNam: '',
                      maPhong: 0,
                      trangThaiTT: '',
                      search: '',
                    });
                  }}
                  className="px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer transition"
                >
                  Xem hết
                </button>
              </div>
            </div>

            {/* Bảng Danh sách hóa đơn */}
            {loading ? (
              <div className="py-16 text-center text-slate-500 text-sm font-bold">
                Đang tải danh sách hóa đơn...
              </div>
            ) : hoaDonList.length === 0 ? (
              <div className="py-16 text-center border border-dashed border-slate-300 rounded-3xl bg-slate-50/50 space-y-3">
                <p className="text-sm font-bold text-slate-700">
                  Chưa có hóa đơn nào phù hợp với bộ lọc hiện tại.
                </p>
                <Link
                  href={`/chuTro/hoaDon/tao?thangNam=${
                    thangNam || new Date().toISOString().slice(0, 7)
                  }`}
                  className="inline-block px-5 py-2.5 rounded-full bg-[#00FFCC] text-slate-900 text-xs font-bold no-underline"
                >
                  + Tạo hóa đơn cho kỳ này ngay
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-3xl border border-slate-200 shadow-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase tracking-wider">
                      <th className="py-3.5 px-4 font-bold">Mã HĐ</th>
                      <th className="py-3.5 px-4 font-bold">Phòng / Cơ Sở</th>
                      <th className="py-3.5 px-4 font-bold text-right">Tiền Phòng</th>
                      <th className="py-3.5 px-4 font-bold text-right">Điện + Nước</th>
                      <th className="py-3.5 px-4 font-bold text-right">Dịch Vụ</th>
                      <th className="py-3.5 px-4 font-bold text-right">Phát Sinh</th>
                      <th className="py-3.5 px-4 font-bold text-right">Tổng Tiền</th>
                      <th className="py-3.5 px-4 font-bold text-right">Đã Trả / Còn Nợ</th>
                      <th className="py-3.5 px-4 font-bold text-center">Trạng Thái</th>
                      <th className="py-3.5 px-4 font-bold text-right">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs sm:text-sm">
                    {hoaDonList.map((item) => {
                      const dienNuoc =
                        Math.round(Number(item.TienDien) || 0) +
                        Math.round(Number(item.TienNuoc) || 0);

                      return (
                        <tr
                          key={item.MaHD}
                          className="hover:bg-slate-50/80 transition"
                        >
                          <td className="py-4 px-4 font-bold text-slate-900 whitespace-nowrap">
                            #{item.MaHD}
                            <div className="text-[11px] font-semibold text-slate-500">
                              {formatDateVN(item.NgayTinh)}
                            </div>
                          </td>

                          <td className="py-4 px-4">
                            <div className="font-bold text-slate-900">
                              {item.TenPhong}
                            </div>
                            <div className="text-xs font-semibold text-slate-500">
                              {item.TenKhu}
                            </div>
                          </td>

                          <td className="py-4 px-4 text-right font-bold text-slate-800 whitespace-nowrap">
                            {formatVND(item.TienPhong)}
                          </td>

                          <td className="py-4 px-4 text-right whitespace-nowrap">
                            <div className="font-bold text-amber-700">
                              {formatVND(dienNuoc)}
                            </div>
                            <div className="text-[11px] font-semibold text-slate-500">
                              Đ: {item.SoDienCu}→{item.SoDienMoi} | N: {item.SoNuocCu}→
                              {item.SoNuocMoi}
                            </div>
                          </td>

                          <td className="py-4 px-4 text-right font-bold text-teal-700 whitespace-nowrap">
                            {formatVND(item.TienPhuPhi)}
                          </td>

                          <td className="py-4 px-4 text-right font-bold text-purple-700 whitespace-nowrap">
                            {formatVND(item.TienPhatSinh)}
                          </td>

                          <td className="py-4 px-4 text-right font-bold text-slate-900 whitespace-nowrap">
                            {formatVND(item.TongTien)}
                          </td>

                          <td className="py-4 px-4 text-right whitespace-nowrap">
                            <div className="font-bold text-emerald-700">
                              Đã trả: {formatVND(item.TienDaTra)}
                            </div>
                            {item.ConNo > 0 && (
                              <div className="text-xs font-bold text-rose-600">
                                Nợ: {formatVND(item.ConNo)}
                              </div>
                            )}
                          </td>

                          <td className="py-4 px-4 text-center whitespace-nowrap">
                            {item.TrangThaiThanhToan === 'DaThanhToan' ? (
                              <span className="inline-block px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                                Đã thanh toán
                              </span>
                            ) : item.TrangThaiThanhToan === 'MotPhan' ? (
                              <span className="inline-block px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
                                Trả một phần
                              </span>
                            ) : (
                              <span className="inline-block px-3 py-1 rounded-full bg-rose-100 text-rose-700 text-xs font-bold">
                                Chưa trả
                              </span>
                            )}
                          </td>

                          <td className="py-4 px-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5">
                              <Link
                                href={`/chuTro/hoaDon/chiTiet/${item.MaHD}`}
                                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold no-underline"
                              >
                                Chi tiết
                              </Link>
                              <Link
                                href={`/chuTro/hoaDon/sua/${item.MaHD}`}
                                className="px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold no-underline"
                              >
                                Sửa
                              </Link>
                              <button
                                type="button"
                                onClick={() => handleDelete(item)}
                                className="px-3 py-1.5 rounded-xl bg-red-100 hover:bg-red-200 text-red-700 text-xs font-bold cursor-pointer"
                              >
                                Xóa
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </main>
        </div>
      )}
    </ProtectedRoute>
  );
}