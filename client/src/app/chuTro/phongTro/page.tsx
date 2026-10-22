'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import ProtectedRoute from '../../../components/common/ProtectedRoute';
import QuanLyHeader from '../../../components/layout/QuanLyHeader';
import { useAlertModal } from '../../../components/common/AlertModalProvider';
import {
  PhongTroService,
  resolveRoomImageUrl,
} from '../../../services/phongTro.service';
import { KhuTroItem, PhongItem } from '../../../types/phongTro.type';

export default function QuanLyKhuTroVaPhongPage() {
  const { showSuccess, showError, showConfirm } = useAlertModal();

  const [khuTroList, setKhuTroList] = useState<KhuTroItem[]>([]);
  const [phongList, setPhongList] = useState<PhongItem[]>([]);
  const [selectedMaKhu, setSelectedMaKhu] = useState<number>(0); // 0 = Tất cả
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [keyword, setKeyword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  const fetchInitialData = useCallback(async () => {
    try {
      setLoading(true);
      const khuRes = await PhongTroService.getKhuTroList();
      const khus = khuRes.data || [];
      setKhuTroList(khus);

      // Nếu là Quản lý chỉ có 1 khu trọ thì tự động chọn luôn khu đó
      const defaultKhu = khus.length === 1 ? khus[0].MaKhu : 0;
      setSelectedMaKhu((prev) => (prev === 0 && khus.length === 1 ? defaultKhu : prev));
    } catch (err: unknown) {
      if (err instanceof Error) showError(err.message);
    } finally {
      setLoading(false);
    }
  }, [showError]);

  const fetchRooms = useCallback(async () => {
    try {
      const phongRes = await PhongTroService.getPhongList({
        maKhu: selectedMaKhu || undefined,
        trangThai: statusFilter || undefined,
        keyword: keyword || undefined,
      });
      setPhongList(phongRes.data || []);
    } catch (err: unknown) {
      if (err instanceof Error) showError(err.message);
    }
  }, [selectedMaKhu, statusFilter, keyword, showError]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  const activeKhu = khuTroList.find((k) => k.MaKhu === selectedMaKhu);

  const handleDeleteKhuTro = (khu: KhuTroItem) => {
    showConfirm(
      `Bạn có chắc chắn muốn xóa "${khu.TenKhu}" không? Hành động này chỉ thực hiện được khi khu trọ chưa có phòng nào.`,
      'Xác nhận xóa Khu trọ',
      async () => {
        try {
          await PhongTroService.deleteKhuTro(khu.MaKhu);
          showSuccess('Đã xóa khu trọ thành công!');
          setSelectedMaKhu(0);
          fetchInitialData();
        } catch (err: unknown) {
          if (err instanceof Error) showError(err.message);
        }
      }
    );
  };

  const handleDeletePhong = (room: PhongItem) => {
    showConfirm(
      `Bạn có chắc chắn muốn xóa phòng "${room.TenPhong}" (${room.TenKhu}) không?`,
      'Xác nhận xóa Phòng trọ',
      async () => {
        try {
          await PhongTroService.deletePhong(room.MaPhong);
          showSuccess(`Đã xóa phòng ${room.TenPhong} thành công!`);
          fetchRooms();
          fetchInitialData();
        } catch (err: unknown) {
          if (err instanceof Error) showError(err.message, 'Không thể xóa phòng', 3.5);
        }
      }
    );
  };

  const renderStatusBadge = (trangThai: string) => {
    if (trangThai === 'Trong') {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
          Đang trống
        </span>
      );
    }
    if (trangThai === 'DangThue') {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">
          Đang thuê
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
        Đang bảo trì
      </span>
    );
  };

  return (
    <ProtectedRoute allowedRoles={['ChuTro', 'QuanLy']}>
      {(user) => (
        <div className="flex-1 flex flex-col bg-white text-slate-900">
          <QuanLyHeader user={user} />

          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
            {/* 1. Tiêu đề trang & Cụm nút Thêm mới (Mở trang mới) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                  Quản Lý Cơ Sở & Phòng Trọ
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  {user.Quyen === 'ChuTro'
                    ? 'Chủ trọ quản lý toàn bộ các khu trọ và danh sách phòng trên hệ thống'
                    : 'Quản lý cơ sở và danh sách phòng trọ thuộc phạm vi phụ trách của bạn'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {user.Quyen === 'ChuTro' && (
                  <Link
                    href="/chuTro/phongTro/khuTro/them"
                    className="flex-1 sm:flex-initial text-center px-4 py-2.5 rounded-full border-2 border-[#00FFCC] bg-white hover:bg-[#00FFCC]/20 text-slate-900 text-xs font-bold transition no-underline"
                  >
                    + Thêm Khu Trọ
                  </Link>
                )}

                <Link
                  href={
                    selectedMaKhu
                      ? `/chuTro/phongTro/them?maKhu=${selectedMaKhu}`
                      : '/chuTro/phongTro/them'
                  }
                  className="flex-1 sm:flex-initial text-center px-5 py-2.5 rounded-full bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 border border-teal-300 text-xs font-bold shadow-xs transition no-underline"
                >
                  + Thêm Phòng Mới
                </Link>
              </div>
            </div>

            {/* 2. Thanh chọn Khu trọ (Tab ngang cuộn mượt trên điện thoại) */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {khuTroList.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setSelectedMaKhu(0)}
                    className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                      selectedMaKhu === 0
                        ? 'bg-[#00FFCC] text-slate-900 border border-teal-400 shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Tất cả cơ sở ({khuTroList.reduce((acc, k) => acc + Number(k.TongSoPhong || 0), 0)})
                  </button>
                )}

                {khuTroList.map((khu) => (
                  <button
                    key={khu.MaKhu}
                    type="button"
                    onClick={() => setSelectedMaKhu(khu.MaKhu)}
                    className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                      selectedMaKhu === khu.MaKhu
                        ? 'bg-[#00FFCC] text-slate-900 border border-teal-400 shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {khu.TenKhu} ({khu.TongSoPhong || 0})
                  </button>
                ))}
              </div>

              {/* Khung thông tin Khu trọ đang chọn */}
              {activeKhu && (
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-bold text-slate-900">
                        {activeKhu.TenKhu}
                      </h2>
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#00FFCC]/40 text-slate-900">
                        Quản lý: {activeKhu.TenQuanLy || 'Chưa gán'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">
                      <strong>Địa chỉ:</strong> {activeKhu.DiaChi}
                    </p>
                    {activeKhu.MoTa && (
                      <p className="text-xs text-slate-500">{activeKhu.MoTa}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={`/chuTro/phongTro/khuTro/sua/${activeKhu.MaKhu}`}
                      className="px-4 py-2 rounded-full bg-white hover:bg-[#00FFCC] text-slate-800 border border-slate-300 text-xs font-bold transition no-underline"
                    >
                      Sửa cơ sở
                    </Link>

                    {user.Quyen === 'ChuTro' && (
                      <button
                        type="button"
                        onClick={() => handleDeleteKhuTro(activeKhu)}
                        className="px-4 py-2 rounded-full bg-white hover:bg-red-50 text-red-600 border border-red-200 text-xs font-bold transition cursor-pointer"
                      >
                        Xóa cơ sở
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 3. Bộ lọc & Tìm kiếm phòng */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="sm:col-span-6">
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Tìm kiếm theo tên phòng (VD: P.101, P.205)..."
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
                />
              </div>

              <div className="sm:col-span-6 flex flex-wrap items-center gap-2">
                {[
                  { value: '', label: 'Tất cả trạng thái' },
                  { value: 'Trong', label: 'Đang trống' },
                  { value: 'DangThue', label: 'Đang thuê' },
                  { value: 'BaoTri', label: 'Bảo trì' },
                ].map((st) => (
                  <button
                    key={st.value}
                    type="button"
                    onClick={() => setStatusFilter(st.value)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                      statusFilter === st.value
                        ? 'bg-[#00FFCC] text-slate-900'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Lưới Thẻ Phòng Trọ (Chỉ hiển thị Ảnh chính AnhChinh = 1) */}
            {loading ? (
              <div className="py-16 text-center text-sm text-slate-500">
                Đang tải danh sách phòng trọ...
              </div>
            ) : phongList.length === 0 ? (
              <div className="py-16 text-center bg-slate-50 rounded-2xl border border-slate-200 p-6">
                <p className="text-base font-bold text-slate-700">
                  Không tìm thấy phòng trọ nào phù hợp!
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Hãy thử thay đổi bộ lọc hoặc bấm &quot;+ Thêm Phòng Mới&quot; để khởi tạo phòng.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {phongList.map((room) => (
                  <div
                    key={room.MaPhong}
                    className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition overflow-hidden flex flex-col"
                  >
                    {/* Ảnh chính (AnhChinh = 1) */}
                    <div className="relative h-48 w-full bg-slate-100 overflow-hidden">
                      <img
                        src={resolveRoomImageUrl(room.AnhDaiDien)}
                        alt={room.TenPhong}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-3 left-3">
                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-900/80 text-[#00FFCC] backdrop-blur-xs">
                          {room.TenKhu}
                        </span>
                      </div>
                      <div className="absolute top-3 right-3">
                        {renderStatusBadge(room.TrangThai)}
                      </div>
                    </div>

                    {/* Thông tin phòng */}
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div>
                        <div className="flex items-baseline justify-between gap-2">
                          <h3 className="text-lg font-bold text-slate-900">
                            Phòng {room.TenPhong}
                          </h3>
                          <span className="text-xs font-semibold text-slate-500">
                            Diện tích: {Number(room.DienTich)} m²
                          </span>
                        </div>

                        <p className="mt-1 text-base font-extrabold text-teal-700">
                          {Number(room.Gia).toLocaleString('vi-VN')} đ / tháng
                        </p>

                        {/* Danh sách Tiện ích */}
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {room.TienIch && room.TienIch.length > 0 ? (
                            room.TienIch.map((ti) => (
                              <span
                                key={ti.MaTI}
                                className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#00FFCC]/25 text-slate-900 border border-teal-200"
                              >
                                {ti.TenTI}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-slate-400 italic">
                              Chưa gắn tiện ích
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Cụm nút điều hướng sang Trang mới */}
                      <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                        <Link
                          href={`/chuTro/phongTro/chiTiet/${room.MaPhong}`}
                          className="flex-1 py-2 text-center rounded-xl bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 text-xs font-bold transition no-underline"
                        >
                          Chi tiết
                        </Link>
                        <Link
                          href={`/chuTro/phongTro/sua/${room.MaPhong}`}
                          className="flex-1 py-2 text-center rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold transition no-underline"
                        >
                          Sửa
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDeletePhong(room)}
                          className="px-3 py-2 rounded-xl border border-red-200 bg-white hover:bg-red-50 text-red-600 text-xs font-bold transition cursor-pointer"
                        >
                          Xóa
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </main>
        </div>
      )}
    </ProtectedRoute>
  );
}