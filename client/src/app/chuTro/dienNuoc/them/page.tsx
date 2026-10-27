'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import QuanLyHeader from '@/components/layout/QuanLyHeader';
import { useAlertModal } from '@/components/common/AlertModalProvider';
import {
  dienNuocService,
  KhuTroOption,
  PhongDienNuocOption,
  GiaDienNuocItem,
} from '@/services/dienNuoc.service';

interface RoomInputState {
  soDienMoi: string;
  soNuocMoi: string;
}

export default function ThemChiSoDienNuocPage() {
  const router = useRouter();
  const { showSuccess, showError } = useAlertModal();

  const [khuTroList, setKhuTroList] = useState<KhuTroOption[]>([]);
  const [phongList, setPhongList] = useState<PhongDienNuocOption[]>([]);
  const [giaHienTai, setGiaHienTai] = useState<GiaDienNuocItem>({
    MaGia: 1,
    GiaDien: 3800,
    GiaNuoc: 18000,
    NgayApDung: '2026-08-01',
  });

  const [selectedMaKhu, setSelectedMaKhu] = useState<string>('');
  const [ngayGhi, setNgayGhi] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [filterMode, setFilterMode] = useState<'CHUA_GHI' | 'DANG_THUE' | 'TAT_CA'>(
    'CHUA_GHI'
  );
  const [searchRoom, setSearchRoom] = useState<string>('');

  const [inputsByRoom, setInputsByRoom] = useState<Record<number, RoomInputState>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const initializedKhuRef = useRef<boolean>(false);
  const thangNam = ngayGhi ? ngayGhi.slice(0, 7) : '';

  // Chỉ gọi API khi tháng/năm (thangNam) thay đổi, tránh vòng lặp re-render
  useEffect(() => {
    let isMounted = true;

    const loadOptions = async () => {
      try {
        setLoading(true);
        const res = await dienNuocService.getOptions(thangNam);
        if (!isMounted) return;

        if (res.success && res.data) {
          const khus: KhuTroOption[] = res.data.khuTroList || [];
          const phongs: PhongDienNuocOption[] = res.data.phongList || [];
          setKhuTroList(khus);
          setPhongList(phongs);
          if (res.data.giaHienTai) setGiaHienTai(res.data.giaHienTai);

          if (!initializedKhuRef.current && khus.length > 0) {
            setSelectedMaKhu(String(khus[0].MaKhu));
            initializedKhuRef.current = true;
          }
        } else {
          showError(res.message || 'Không thể tải danh sách phòng trọ');
        }
      } catch {
        if (isMounted) showError('Lỗi kết nối máy chủ');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadOptions();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thangNam]);

  const handleBackToList = () => {
    router.push('/chuTro/dienNuoc');
  };

  const handleInputChange = (
    maPhong: number,
    field: 'soDienMoi' | 'soNuocMoi',
    value: string
  ) => {
    const cleanVal = value.replace(/\D/g, '');
    setInputsByRoom((prev) => ({
      ...prev,
      [maPhong]: {
        soDienMoi: prev[maPhong]?.soDienMoi ?? '',
        soNuocMoi: prev[maPhong]?.soNuocMoi ?? '',
        [field]: cleanVal,
      },
    }));
  };

  const handleKeepSameAsOld = (room: PhongDienNuocOption) => {
    setInputsByRoom((prev) => ({
      ...prev,
      [room.MaPhong]: {
        soDienMoi: String(room.SoDienGoiY),
        soNuocMoi: String(room.SoNuocGoiY),
      },
    }));
  };

  const handleClearRow = (maPhong: number) => {
    setInputsByRoom((prev) => {
      const next = { ...prev };
      delete next[maPhong];
      return next;
    });
  };

  const handleKeyDownJumpNext = (
    e: React.KeyboardEvent<HTMLInputElement>,
    prefix: 'dien' | 'nuoc',
    currentIndex: number,
    visibleRoomIds: number[]
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      for (let i = currentIndex + 1; i < visibleRoomIds.length; i++) {
        const nextEl = document.getElementById(
          `input-${prefix}-${visibleRoomIds[i]}`
        ) as HTMLInputElement | null;
        if (nextEl && !nextEl.disabled) {
          nextEl.focus();
          nextEl.select();
          break;
        }
      }
    }
  };

  const roomsInKhu = selectedMaKhu
    ? phongList.filter((p) => Number(p.MaKhu) === Number(selectedMaKhu))
    : phongList;

  const displayedRooms = roomsInKhu.filter((room) => {
    if (filterMode === 'CHUA_GHI' && room.DaGhiThangNay) return false;
    if (filterMode === 'DANG_THUE' && room.TrangThai !== 'DangThue') return false;
    if (searchRoom.trim() !== '') {
      const kw = searchRoom.trim().toLowerCase();
      if (
        !room.TenPhong.toLowerCase().includes(kw) &&
        !room.TenKhu.toLowerCase().includes(kw)
      ) {
        return false;
      }
    }
    return true;
  });

  const filledRoomEntries = phongList.filter((room) => {
    if (room.DaGhiThangNay) return false;
    const entry = inputsByRoom[room.MaPhong];
    return entry && entry.soDienMoi !== '' && entry.soNuocMoi !== '';
  });

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (filledRoomEntries.length === 0) {
      showError(
        'Vui lòng nhập đầy đủ cả Số điện mới và Số nước mới cho ít nhất 1 phòng!'
      );
      return;
    }

    for (const room of filledRoomEntries) {
      const entry = inputsByRoom[room.MaPhong];
      const dienMoi = Number(entry.soDienMoi);
      const nuocMoi = Number(entry.soNuocMoi);

      if (dienMoi < room.SoDienGoiY) {
        showError(
          `${room.TenPhong}: Số điện mới (${dienMoi}) không được nhỏ hơn số điện cũ (${room.SoDienGoiY})!`
        );
        return;
      }
      if (nuocMoi < room.SoNuocGoiY) {
        showError(
          `${room.TenPhong}: Số nước mới (${nuocMoi}) không được nhỏ hơn số nước cũ (${room.SoNuocGoiY})!`
        );
        return;
      }
    }

    try {
      setSubmitting(true);
      const payload = {
        NgayGhi: ngayGhi,
        DanhSachChiSo: filledRoomEntries.map((room) => ({
          MaPhong: room.MaPhong,
          SoDienMoi: Number(inputsByRoom[room.MaPhong].soDienMoi),
          SoNuocMoi: Number(inputsByRoom[room.MaPhong].soNuocMoi),
        })),
      };

      const res = await dienNuocService.createBulkChiSo(payload);

      if (res.success) {
        showSuccess(
          res.message || `Đã lưu chỉ số cho ${filledRoomEntries.length} phòng!`,
          'Thành công',
          1.5,
          () => {
            router.push('/chuTro/dienNuoc');
          }
        );
      } else {
        showError(res.message || 'Không thể lưu chỉ số điện nước');
      }
    } catch {
      showError('Lỗi kết nối máy chủ');
    } finally {
      setSubmitting(false);
    }
  };

  const soPhongDaGhiKhu = roomsInKhu.filter((r) => r.DaGhiThangNay).length;
  const soPhongChuaGhiKhu = roomsInKhu.length - soPhongDaGhiKhu;
  const visibleRoomIds = displayedRooms.map((r) => r.MaPhong);

  return (
    <ProtectedRoute allowedRoles={['ChuTro', 'QuanLy']}>
      {(user) => (
        <div className="min-h-screen flex flex-col bg-white text-slate-900">
          <QuanLyHeader user={user} />

          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-200">
              <div>
                <button
                  type="button"
                  onClick={handleBackToList}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition cursor-pointer bg-transparent border-0 p-0"
                >
                  <span>← Quay lại danh sách Chỉ số điện nước</span>
                </button>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1.5 tracking-tight">
                  Bảng Ghi Chỉ Số Điện Nước Nhanh
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Chỉ số cũ được khóa cố định từ kỳ trước để bảo toàn dữ liệu. Bạn có thể nhập nhanh nhiều phòng và nhấn Enter để xuống dòng.
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={handleBulkSubmit}
                  disabled={submitting || filledRoomEntries.length === 0}
                  className="px-6 py-2.5 rounded-full bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50 whitespace-nowrap"
                >
                  {submitting
                    ? 'Đang lưu...'
                    : `Lưu ${filledRoomEntries.length} Phòng Đã Nhập`}
                </button>
              </div>
            </div>

            {/* Chọn Cơ sở (Tab) */}
            {khuTroList.length > 1 && (
              <div className="mt-5 flex flex-wrap items-center gap-2">
                {khuTroList.map((khu) => (
                  <button
                    key={khu.MaKhu}
                    type="button"
                    onClick={() => setSelectedMaKhu(String(khu.MaKhu))}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                      selectedMaKhu === String(khu.MaKhu)
                        ? 'bg-[#00FFCC] text-slate-900 border border-teal-400'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {khu.TenKhu}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setSelectedMaKhu('')}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                    selectedMaKhu === ''
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Tất cả cơ sở ({phongList.length} phòng)
                </button>
              </div>
            )}

            {/* Thanh bộ lọc giãn đều 100% chiều ngang */}
            <div className="mt-5 w-full bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
                {/* Cột 1: Ngày ghi sổ */}
                <div className="w-full">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 whitespace-nowrap">
                    Ngày ghi sổ (Kỳ {thangNam}) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={ngayGhi}
                    onChange={(e) => setNgayGhi(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs sm:text-sm font-bold bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
                    required
                  />
                </div>

                {/* Cột 2: Chế độ hiển thị phòng */}
                <div className="w-full">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 whitespace-nowrap">
                    Chế độ hiển thị phòng
                  </label>
                  <select
                    value={filterMode}
                    onChange={(e) =>
                      setFilterMode(
                        e.target.value as 'CHUA_GHI' | 'DANG_THUE' | 'TAT_CA'
                      )
                    }
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs sm:text-sm font-bold bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
                  >
                    <option value="CHUA_GHI">
                      Chưa ghi kỳ này ({soPhongChuaGhiKhu} phòng)
                    </option>
                    <option value="DANG_THUE">Chỉ phòng Đang thuê</option>
                    <option value="TAT_CA">
                      Tất cả phòng ({roomsInKhu.length} phòng)
                    </option>
                  </select>
                </div>

                {/* Cột 3: Tìm nhanh phòng */}
                <div className="w-full">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 whitespace-nowrap">
                    Tìm nhanh phòng
                  </label>
                  <input
                    type="text"
                    value={searchRoom}
                    onChange={(e) => setSearchRoom(e.target.value)}
                    placeholder="Gõ tên phòng (VD: P.101, P.106)..."
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs sm:text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
                  />
                </div>
              </div>

              {/* Cụm thống kê tiến độ nằm ngang gọn gàng bên phải */}
              <div className="flex items-center gap-2.5 shrink-0 pt-1 lg:pt-0">
                <div className="px-4 py-2.5 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-bold whitespace-nowrap">
                  Đã ghi: {soPhongDaGhiKhu}/{roomsInKhu.length} phòng
                </div>
                <div className="px-4 py-2.5 rounded-xl bg-amber-100 text-amber-800 text-xs font-bold whitespace-nowrap">
                  Đang nhập: {filledRoomEntries.length} phòng
                </div>
              </div>
            </div>

            {/* Bảng nhập chỉ số nhanh */}
            {loading ? (
              <div className="py-16 text-center text-slate-500 text-sm font-medium">
                Đang tải bảng chỉ số các phòng...
              </div>
            ) : displayedRooms.length === 0 ? (
              <div className="mt-6 p-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                <p className="text-sm font-bold text-slate-700">
                  Không có phòng nào trong chế độ lọc hiện tại (hoặc tất cả phòng đã được ghi chỉ số trong kỳ {thangNam}).
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setFilterMode('TAT_CA');
                    setSearchRoom('');
                  }}
                  className="mt-3 px-5 py-2.5 rounded-full bg-slate-900 text-white text-xs font-bold cursor-pointer"
                >
                  Hiển thị tất cả {roomsInKhu.length} phòng
                </button>
              </div>
            ) : (
              <form onSubmit={handleBulkSubmit} className="mt-5">
                <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 text-xs uppercase tracking-wider">
                        <th className="py-3.5 px-4 font-bold whitespace-nowrap w-44">
                          Phòng / Trạng thái
                        </th>
                        <th className="py-3.5 px-3 font-bold whitespace-nowrap w-36 bg-slate-200/70">
                          🔒 Điện Cũ (kWh)
                        </th>
                        <th className="py-3.5 px-3 font-bold whitespace-nowrap w-44 bg-amber-50">
                          ⚡ Điện Mới (kWh) *
                        </th>
                        <th className="py-3.5 px-3 font-bold whitespace-nowrap w-36 bg-slate-200/70">
                          🔒 Nước Cũ (m³)
                        </th>
                        <th className="py-3.5 px-3 font-bold whitespace-nowrap w-44 bg-sky-50">
                          💧 Nước Mới (m³) *
                        </th>
                        <th className="py-3.5 px-4 font-bold whitespace-nowrap">
                          Tiêu Thụ & Tạm Tính
                        </th>
                        <th className="py-3.5 px-4 font-bold text-right whitespace-nowrap w-32">
                          Thao Tác Nhanh
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-xs sm:text-sm">
                      {displayedRooms.map((room, idx) => {
                        const isRecorded = Boolean(room.DaGhiThangNay);
                        const entry = inputsByRoom[room.MaPhong] || {
                          soDienMoi: '',
                          soNuocMoi: '',
                        };

                        const dienCu = room.SoDienGoiY;
                        const nuocCu = room.SoNuocGoiY;

                        const hasDienMoi = entry.soDienMoi !== '';
                        const hasNuocMoi = entry.soNuocMoi !== '';
                        const dienMoiNum = Number(entry.soDienMoi);
                        const nuocMoiNum = Number(entry.soNuocMoi);

                        const errDien = hasDienMoi && dienMoiNum < dienCu;
                        const errNuoc = hasNuocMoi && nuocMoiNum < nuocCu;

                        const dienTieuThu =
                          hasDienMoi && !errDien ? dienMoiNum - dienCu : 0;
                        const nuocTieuThu =
                          hasNuocMoi && !errNuoc ? nuocMoiNum - nuocCu : 0;
                        const tamTinh =
                          dienTieuThu * Number(giaHienTai.GiaDien) +
                          nuocTieuThu * Number(giaHienTai.GiaNuoc);

                        const isRowFilled =
                          hasDienMoi && hasNuocMoi && !errDien && !errNuoc;

                        return (
                          <tr
                            key={room.MaPhong}
                            className={`transition ${
                              isRecorded
                                ? 'bg-slate-50/90 opacity-75'
                                : isRowFilled
                                ? 'bg-teal-50/40'
                                : 'hover:bg-slate-50/60'
                            }`}
                          >
                            {/* Tên phòng & Trạng thái */}
                            <td className="py-3 px-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900 text-sm">
                                  {room.TenPhong}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    room.TrangThai === 'DangThue'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-slate-200 text-slate-700'
                                  }`}
                                >
                                  {room.TrangThai === 'DangThue' ? 'Đang thuê' : 'Trống'}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                {room.TenKhu}
                              </p>
                            </td>

                            {/* Ô Số Điện Cũ - KHÓA CỨNG */}
                            <td className="py-3 px-3 bg-slate-100/80 whitespace-nowrap">
                              <input
                                type="text"
                                value={
                                  isRecorded && room.ChiSoThangNay
                                    ? room.ChiSoThangNay.SoDienCu
                                    : dienCu
                                }
                                disabled
                                readOnly
                                tabIndex={-1}
                                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-200/80 text-slate-600 font-bold text-sm cursor-not-allowed select-none"
                              />
                            </td>

                            {/* Ô Số Điện Mới */}
                            <td className="py-3 px-3 whitespace-nowrap">
                              {isRecorded && room.ChiSoThangNay ? (
                                <input
                                  type="text"
                                  value={room.ChiSoThangNay.SoDienMoi}
                                  disabled
                                  readOnly
                                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-100 text-slate-700 font-bold text-sm cursor-not-allowed"
                                />
                              ) : (
                                <div>
                                  <input
                                    id={`input-dien-${room.MaPhong}`}
                                    type="text"
                                    inputMode="numeric"
                                    value={entry.soDienMoi}
                                    onChange={(e) =>
                                      handleInputChange(
                                        room.MaPhong,
                                        'soDienMoi',
                                        e.target.value
                                      )
                                    }
                                    onKeyDown={(e) =>
                                      handleKeyDownJumpNext(
                                        e,
                                        'dien',
                                        idx,
                                        visibleRoomIds
                                      )
                                    }
                                    placeholder={`>= ${dienCu}`}
                                    className={`w-full px-3 py-2 rounded-xl border text-sm font-bold bg-white focus:outline-none focus:ring-2 ${
                                      errDien
                                        ? 'border-red-500 text-red-600 focus:ring-red-300'
                                        : 'border-slate-300 text-slate-900 focus:ring-[#00FFCC]'
                                    }`}
                                  />
                                  {errDien && (
                                    <span className="block text-[10px] font-bold text-red-600 mt-0.5">
                                      Nhỏ hơn số cũ ({dienCu})!
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>

                            {/* Ô Số Nước Cũ - KHÓA CỨNG */}
                            <td className="py-3 px-3 bg-slate-100/80 whitespace-nowrap">
                              <input
                                type="text"
                                value={
                                  isRecorded && room.ChiSoThangNay
                                    ? room.ChiSoThangNay.SoNuocCu
                                    : nuocCu
                                }
                                disabled
                                readOnly
                                tabIndex={-1}
                                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-200/80 text-slate-600 font-bold text-sm cursor-not-allowed select-none"
                              />
                            </td>

                            {/* Ô Số Nước Mới */}
                            <td className="py-3 px-3 whitespace-nowrap">
                              {isRecorded && room.ChiSoThangNay ? (
                                <input
                                  type="text"
                                  value={room.ChiSoThangNay.SoNuocMoi}
                                  disabled
                                  readOnly
                                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-100 text-slate-700 font-bold text-sm cursor-not-allowed"
                                />
                              ) : (
                                <div>
                                  <input
                                    id={`input-nuoc-${room.MaPhong}`}
                                    type="text"
                                    inputMode="numeric"
                                    value={entry.soNuocMoi}
                                    onChange={(e) =>
                                      handleInputChange(
                                        room.MaPhong,
                                        'soNuocMoi',
                                        e.target.value
                                      )
                                    }
                                    onKeyDown={(e) =>
                                      handleKeyDownJumpNext(
                                        e,
                                        'nuoc',
                                        idx,
                                        visibleRoomIds
                                      )
                                    }
                                    placeholder={`>= ${nuocCu}`}
                                    className={`w-full px-3 py-2 rounded-xl border text-sm font-bold bg-white focus:outline-none focus:ring-2 ${
                                      errNuoc
                                        ? 'border-red-500 text-red-600 focus:ring-red-300'
                                        : 'border-slate-300 text-slate-900 focus:ring-[#00FFCC]'
                                    }`}
                                  />
                                  {errNuoc && (
                                    <span className="block text-[10px] font-bold text-red-600 mt-0.5">
                                      Nhỏ hơn số cũ ({nuocCu})!
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>

                            {/* Tiêu thụ & Thành tiền tạm tính */}
                            <td className="py-3 px-4 whitespace-nowrap">
                              {isRecorded && room.ChiSoThangNay ? (
                                <span className="inline-block px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                                  ✓ Đã ghi kỳ này
                                </span>
                              ) : isRowFilled ? (
                                <div>
                                  <div className="flex items-center gap-2 text-xs font-bold">
                                    <span className="text-amber-700">
                                      +{dienTieuThu} kWh
                                    </span>
                                    <span className="text-slate-300">|</span>
                                    <span className="text-sky-700">
                                      +{nuocTieuThu} m³
                                    </span>
                                  </div>
                                  <p className="text-xs font-bold text-teal-700 mt-0.5">
                                    {Math.round(tamTinh).toLocaleString('vi-VN')} đ
                                  </p>
                                </div>
                              ) : (
                                <span className="text-xs text-slate-400 italic">
                                  Chưa nhập đủ
                                </span>
                              )}
                            </td>

                            {/* Thao tác nhanh */}
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              {isRecorded && room.ChiSoThangNay ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    router.push(
                                      `/chuTro/dienNuoc/sua/${room.ChiSoThangNay?.MaCS}`
                                    )
                                  }
                                  className="px-3 py-1.5 rounded-xl bg-amber-100 text-amber-800 text-xs font-bold hover:bg-amber-200 cursor-pointer"
                                >
                                  Sửa bản ghi
                                </button>
                              ) : (
                                <div className="inline-flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleKeepSameAsOld(room)}
                                    title="Điền nhanh số mới bằng số cũ (Không tiêu thụ)"
                                    className="px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-bold cursor-pointer"
                                  >
                                    = Số cũ
                                  </button>
                                  {(hasDienMoi || hasNuocMoi) && (
                                    <button
                                      type="button"
                                      onClick={() => handleClearRow(room.MaPhong)}
                                      className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-red-100 text-slate-600 hover:text-red-700 text-[11px] font-bold cursor-pointer"
                                    >
                                      Xóa ô
                                    </button>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Thanh tổng kết bên dưới */}
                <div className="mt-6 p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-xs sm:text-sm text-slate-700">
                    Đã nhập hoàn tất:{' '}
                    <strong className="text-slate-900">
                      {filledRoomEntries.length} phòng
                    </strong>{' '}
                    (Các phòng để trống sẽ được bỏ qua, bạn có thể nhập tiếp vào lúc khác).
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                    <button
                      type="button"
                      onClick={handleBackToList}
                      className="px-6 py-3 rounded-full border border-slate-300 bg-white text-slate-700 text-xs font-bold hover:bg-slate-100 transition cursor-pointer"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      disabled={submitting || filledRoomEntries.length === 0}
                      className="px-8 py-3 rounded-full bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      {submitting
                        ? 'Đang lưu dữ liệu...'
                        : `Lưu ${filledRoomEntries.length} Phòng Đã Nhập`}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </main>
        </div>
      )}
    </ProtectedRoute>
  );
}