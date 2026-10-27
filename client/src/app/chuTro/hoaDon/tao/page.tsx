'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import QuanLyHeader from '@/components/layout/QuanLyHeader';
import CurrencyInput from '@/components/common/CurrencyInput';
import { useAlertModal } from '@/components/common/AlertModalProvider';
import {
  hoaDonService,
  KhuTroOption,
  PhongTinhHoaDonPreview,
} from '@/services/hoaDon.service';

interface DraftPhatSinh {
  TenPS: string;
  Gia: string;
  GhiChu: string;
}

export default function TaoHoaDonThangPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showSuccess, showError } = useAlertModal();

  const [thangNam, setThangNam] = useState<string>(
    () => searchParams.get('thangNam') || new Date().toISOString().slice(0, 7)
  );
  const [ngayTinh, setNgayTinh] = useState<string>(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [selectedMaKhu, setSelectedMaKhu] = useState<number>(0);

  const [khuTroList, setKhuTroList] = useState<KhuTroOption[]>([]);
  const [danhSachPhong, setDanhSachPhong] = useState<PhongTinhHoaDonPreview[]>([]);
  const [selectedRoomIds, setSelectedRoomIds] = useState<number[]>([]);

  // Lưu danh sách phí phát sinh thêm nhanh theo từng phòng: { [MaPhong]: DraftPhatSinh[] }
  const [phatSinhByRoom, setPhatSinhByRoom] = useState<
    Record<number, DraftPhatSinh[]>
  >({});

  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const formatVND = (val: number | string) => {
    const num = Math.round(Number(val) || 0);
    return num.toLocaleString('vi-VN') + ' đ';
  };

  const fetchPreview = useCallback(
    async (kyThang: string, maKhu: number) => {
      try {
        setLoading(true);
        const res = await hoaDonService.getDuLieuTaoThang({
          thangNam: kyThang,
          maKhu,
        });

        if (res.success && res.data) {
          const rooms: PhongTinhHoaDonPreview[] = res.data.danhSachPhong || [];
          const khus: KhuTroOption[] = res.data.khuTroList || [];
          setDanhSachPhong(rooms);
          setKhuTroList(khus);

          // Tự động chọn tất cả các phòng ĐỦ ĐIỀU KIỆN tạo hóa đơn
          const eligibleIds = rooms
            .filter((r) => r.TrangThaiTao === 'DU_DIEU_KIEN')
            .map((r) => r.MaPhong);
          setSelectedRoomIds(eligibleIds);
        } else {
          showError(
            res.message || 'Không thể tải dữ liệu tính hóa đơn tự động.'
          );
        }
      } catch {
        showError('Không thể kết nối máy chủ để lấy dữ liệu chỉ số tháng.');
      } finally {
        setLoading(false);
      }
    },
    [showError]
  );

  useEffect(() => {
    fetchPreview(thangNam, selectedMaKhu);
  }, [thangNam, selectedMaKhu, fetchPreview]);

  const toggleSelectRoom = (maPhong: number) => {
    setSelectedRoomIds((prev) =>
      prev.includes(maPhong)
        ? prev.filter((id) => id !== maPhong)
        : [...prev, maPhong]
    );
  };

  const addPhatSinhRow = (maPhong: number) => {
    setPhatSinhByRoom((prev) => ({
      ...prev,
      [maPhong]: [
        ...(prev[maPhong] || []),
        { TenPS: '', Gia: '', GhiChu: '' },
      ],
    }));
  };

  const updatePhatSinhRow = (
    maPhong: number,
    index: number,
    field: keyof DraftPhatSinh,
    value: string
  ) => {
    setPhatSinhByRoom((prev) => {
      const list = [...(prev[maPhong] || [])];
      list[index] = { ...list[index], [field]: value };
      return { ...prev, [maPhong]: list };
    });
  };

  const removePhatSinhRow = (maPhong: number, index: number) => {
    setPhatSinhByRoom((prev) => {
      const list = [...(prev[maPhong] || [])];
      list.splice(index, 1);
      return { ...prev, [maPhong]: list };
    });
  };

  const getRoomPhatSinhTotal = (maPhong: number) => {
    const list = phatSinhByRoom[maPhong] || [];
    return list.reduce((sum, item) => sum + (Math.round(Number(item.Gia)) || 0), 0);
  };

  const handleCreateInvoices = async (singleRoomId?: number) => {
    const targetIds = singleRoomId ? [singleRoomId] : selectedRoomIds;

    if (targetIds.length === 0) {
      showError('Vui lòng chọn ít nhất 1 phòng đủ điều kiện để tạo hóa đơn!');
      return;
    }

    const payloadRooms = targetIds.map((maPhong) => {
      const psList = (phatSinhByRoom[maPhong] || [])
        .filter((ps) => ps.TenPS.trim() !== '')
        .map((ps) => ({
          TenPS: ps.TenPS.trim(),
          Gia: Math.round(Number(ps.Gia)) || 0,
          GhiChu: ps.GhiChu.trim(),
        }));

      return {
        MaPhong: maPhong,
        PhatSinhList: psList,
      };
    });

    try {
      setSubmitting(true);
      const res = await hoaDonService.createMonthlyInvoices({
        thangNam,
        ngayTinh,
        danhSachPhongTao: payloadRooms,
      });

      if (res.success) {
        showSuccess(
          res.message || 'Tạo hóa đơn hàng tháng thành công!',
          'Thành công',
          1.5,
          () => {
            if (singleRoomId) {
              fetchPreview(thangNam, selectedMaKhu);
            } else {
              router.push(`/chuTro/hoaDon?thangNam=${thangNam}`);
            }
          }
        );
      } else {
        showError(res.message || 'Không thể tạo hóa đơn.');
      }
    } catch {
      showError('Không thể tạo hóa đơn vào lúc này.');
    } finally {
      setSubmitting(false);
    }
  };

  const eligibleRooms = danhSachPhong.filter(
    (r) => r.TrangThaiTao === 'DU_DIEU_KIEN'
  );
  const alreadyCreatedRooms = danhSachPhong.filter(
    (r) => r.TrangThaiTao === 'DA_TAO'
  );
  const missingIndexRooms = danhSachPhong.filter(
    (r) => r.TrangThaiTao === 'CHUA_CO_CHI_SO' || r.TrangThaiTao === 'CHI_SO_LOI'
  );

  return (
    <ProtectedRoute allowedRoles={['ChuTro', 'QuanLy']}>
      {(user) => (
        <div className="min-h-screen flex flex-col bg-white text-slate-900">
          <QuanLyHeader user={user} />

          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <Link
                  href="/chuTro/hoaDon"
                  className="text-xs font-bold text-slate-600 hover:text-slate-900 no-underline"
                >
                  ← Quay lại danh sách Hóa đơn
                </Link>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-2 tracking-tight">
                  Tạo Hóa Đơn Hàng Tháng Tự Động
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Hệ thống tự động lấy chỉ số điện nước, đơn giá, tiền phòng và phí dịch vụ hợp đồng. Không tạo trùng 2 hóa đơn trong 1 tháng.
                </p>
              </div>

              <button
                type="button"
                disabled={submitting || selectedRoomIds.length === 0}
                onClick={() => handleCreateInvoices()}
                className="px-6 py-3 rounded-full bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 text-xs sm:text-sm font-bold shadow-xs cursor-pointer disabled:opacity-50 transition"
              >
                {submitting
                  ? 'Đang tạo hóa đơn...'
                  : `Tạo Hóa Đơn Cho ${selectedRoomIds.length} Phòng Đã Chọn`}
              </button>
            </div>

            {/* Chọn Kỳ tháng, Ngày lập & Cơ sở */}
            <div className="p-5 rounded-3xl border border-slate-200 bg-slate-50/60 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Kỳ tính hóa đơn (Tháng/Năm) <span className="text-red-500">*</span>
                </label>
                <input
                  type="month"
                  value={thangNam}
                  onChange={(e) => setThangNam(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Ngày lập hóa đơn <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={ngayTinh}
                  onChange={(e) => setNgayTinh(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Lọc theo Cơ sở
                </label>
                <select
                  value={selectedMaKhu}
                  onChange={(e) => setSelectedMaKhu(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
                >
                  {user.Quyen === 'ChuTro' && (
                    <option value={0}>-- Tất cả cơ sở --</option>
                  )}
                  {khuTroList.map((k) => (
                    <option key={k.MaKhu} value={k.MaKhu}>
                      {k.TenKhu}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Thống kê điều kiện tạo hóa đơn trong tháng */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/70">
                <p className="text-xs font-bold text-emerald-800">
                  ✅ Đủ điều kiện tạo ngay
                </p>
                <p className="text-lg font-bold text-emerald-900 mt-1">
                  {eligibleRooms.length} phòng
                </p>
                <p className="text-[11px] text-emerald-700 mt-0.5">
                  Đã có chỉ số điện nước & chưa tạo hóa đơn kỳ {thangNam}
                </p>
              </div>

              <div className="p-4 rounded-2xl border border-sky-200 bg-sky-50/70">
                <p className="text-xs font-bold text-sky-800">
                  🔒 Đã tạo hóa đơn trong tháng
                </p>
                <p className="text-lg font-bold text-sky-900 mt-1">
                  {alreadyCreatedRooms.length} phòng
                </p>
                <p className="text-[11px] text-sky-700 mt-0.5">
                  Hệ thống tự khóa để không tạo 2 hóa đơn/tháng
                </p>
              </div>

              <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50/70">
                <p className="text-xs font-bold text-amber-800">
                  ⚠️ Chưa đủ điều kiện (Thiếu chỉ số)
                </p>
                <p className="text-lg font-bold text-amber-900 mt-1">
                  {missingIndexRooms.length} phòng
                </p>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  Cần ghi chỉ số điện nước kỳ {thangNam} trước khi tạo
                </p>
              </div>
            </div>

            {/* Danh sách chi tiết từng phòng */}
            {loading ? (
              <div className="py-16 text-center text-slate-500 text-sm font-bold">
                Đang tự động tổng hợp chỉ số điện nước và phí dịch vụ các phòng...
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm sm:text-base font-bold text-slate-900">
                    Bảng Tính Tiền Hóa Đơn Tự Động Kỳ {thangNam} (
                    {danhSachPhong.length} phòng)
                  </h2>
                  {eligibleRooms.length > 0 && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedRoomIds(eligibleRooms.map((r) => r.MaPhong))
                        }
                        className="px-3 py-1.5 rounded-lg bg-[#00FFCC]/30 text-slate-900 text-xs font-bold cursor-pointer"
                      >
                        Chọn tất cả phòng đủ điều kiện
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedRoomIds([])}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer"
                      >
                        Bỏ chọn
                      </button>
                    </div>
                  )}
                </div>

                {danhSachPhong.map((room) => {
                  const isEligible = room.TrangThaiTao === 'DU_DIEU_KIEN';
                  const isChecked = selectedRoomIds.includes(room.MaPhong);
                  const psList = phatSinhByRoom[room.MaPhong] || [];
                  const tienPhatSinh = getRoomPhatSinhTotal(room.MaPhong);
                  const tongCong = room.TongTienTamTinh + tienPhatSinh;

                  return (
                    <div
                      key={room.MaPhong}
                      className={`p-5 rounded-3xl border transition space-y-4 ${
                        isEligible
                          ? isChecked
                            ? 'border-teal-500 bg-white shadow-xs'
                            : 'border-slate-200 bg-white'
                          : 'border-slate-200 bg-slate-50/80 opacity-85'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          {isEligible ? (
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleSelectRoom(room.MaPhong)}
                              className="w-5 h-5 accent-teal-600 cursor-pointer"
                            />
                          ) : (
                            <span className="w-5 h-5 inline-flex items-center justify-center text-xs font-bold text-slate-400">
                              🔒
                            </span>
                          )}

                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-base font-bold text-slate-900">
                                {room.TenPhong}
                              </span>
                              <span className="text-xs font-semibold text-slate-500">
                                ({room.TenKhu})
                              </span>

                              {room.TrangThaiTao === 'DU_DIEU_KIEN' && (
                                <span className="px-3 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                                  Đủ điều kiện tạo
                                </span>
                              )}
                              {room.TrangThaiTao === 'DA_TAO' && (
                                <span className="px-3 py-0.5 rounded-full bg-sky-100 text-sky-800 text-xs font-bold">
                                  {room.LyDoKhongTheTao}
                                </span>
                              )}
                              {(room.TrangThaiTao === 'CHUA_CO_CHI_SO' ||
                                room.TrangThaiTao === 'CHI_SO_LOI') && (
                                <span className="px-3 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
                                  {room.LyDoKhongTheTao}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Nút hành động riêng từng phòng */}
                        <div className="flex items-center gap-2">
                          {room.TrangThaiTao === 'DU_DIEU_KIEN' && (
                            <>
                              <button
                                type="button"
                                onClick={() => addPhatSinhRow(room.MaPhong)}
                                className="px-3.5 py-1.5 rounded-full border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold cursor-pointer"
                              >
                                + Thêm phí phát sinh
                              </button>
                              <button
                                type="button"
                                disabled={submitting}
                                onClick={() =>
                                  handleCreateInvoices(room.MaPhong)
                                }
                                className="px-4 py-1.5 rounded-full bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 text-xs font-bold cursor-pointer"
                              >
                                Tạo ngay 1 phòng
                              </button>
                            </>
                          )}

                          {room.TrangThaiTao === 'DA_TAO' && room.MaHDDaTao && (
                            <Link
                              href={`/chuTro/hoaDon/chiTiet/${room.MaHDDaTao}`}
                              className="px-4 py-1.5 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold no-underline"
                            >
                              Xem hóa đơn #{room.MaHDDaTao}
                            </Link>
                          )}

                          {room.TrangThaiTao === 'CHUA_CO_CHI_SO' && (
                            <Link
                              href="/chuTro/dienNuoc"
                              className="px-4 py-1.5 rounded-full bg-amber-200 hover:bg-amber-300 text-amber-900 text-xs font-bold no-underline"
                            >
                              Đi tới ghi điện nước →
                            </Link>
                          )}
                        </div>
                      </div>

                      {/* Chi tiết các khoản tiền tự động lấy */}
                      {room.TrangThaiTao !== 'CHUA_CO_CHI_SO' && (
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2 border-t border-slate-100 text-xs">
                          <div className="p-3 rounded-2xl bg-slate-50">
                            <p className="font-bold text-slate-500">1. Tiền phòng</p>
                            <p className="text-sm font-bold text-slate-900 mt-1">
                              {formatVND(room.TienPhong)}
                            </p>
                          </div>

                          <div className="p-3 rounded-2xl bg-amber-50/70">
                            <p className="font-bold text-amber-800">
                              2. Tiền điện ({room.SoDienCu} → {room.SoDienMoi})
                            </p>
                            <p className="text-sm font-bold text-amber-900 mt-1">
                              {formatVND(room.TienDien)}{' '}
                              <span className="text-[11px] font-semibold">
                                ({room.DienTieuThu} kWh)
                              </span>
                            </p>
                          </div>

                          <div className="p-3 rounded-2xl bg-sky-50/70">
                            <p className="font-bold text-sky-800">
                              3. Tiền nước ({room.SoNuocCu} → {room.SoNuocMoi})
                            </p>
                            <p className="text-sm font-bold text-sky-900 mt-1">
                              {formatVND(room.TienNuoc)}{' '}
                              <span className="text-[11px] font-semibold">
                                ({room.NuocTieuThu} m³)
                              </span>
                            </p>
                          </div>

                          <div className="p-3 rounded-2xl bg-teal-50/70">
                            <p className="font-bold text-teal-800">
                              4. Phí dịch vụ ({room.DanhSachDichVu.length})
                            </p>
                            <p className="text-sm font-bold text-teal-900 mt-1">
                              {formatVND(room.TienPhuPhi)}
                            </p>
                          </div>

                          <div className="p-3 rounded-2xl bg-slate-900 text-white">
                            <p className="font-bold text-slate-300">
                              Tổng cộng hóa đơn
                            </p>
                            <p className="text-sm font-bold text-[#00FFCC] mt-1">
                              {formatVND(tongCong)}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Khu vực thêm nhanh Phí phát sinh khi tạo */}
                      {isEligible && psList.length > 0 && (
                        <div className="pt-3 border-t border-slate-200 space-y-2">
                          <p className="text-xs font-bold text-slate-700">
                            Khoản phí phát sinh kèm theo ({psList.length}):
                          </p>
                          {psList.map((ps, idx) => (
                            <div
                              key={idx}
                              className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center"
                            >
                              <div className="sm:col-span-4">
                                <input
                                  type="text"
                                  value={ps.TenPS}
                                  onChange={(e) =>
                                    updatePhatSinhRow(
                                      room.MaPhong,
                                      idx,
                                      'TenPS',
                                      e.target.value
                                    )
                                  }
                                  placeholder="Tên khoản phát sinh (VD: Sửa bóng đèn...)"
                                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold"
                                />
                              </div>
                              <div className="sm:col-span-3">
                                <CurrencyInput
                                  value={ps.Gia}
                                  onChange={(val) =>
                                    updatePhatSinhRow(
                                      room.MaPhong,
                                      idx,
                                      'Gia',
                                      val
                                    )
                                  }
                                  placeholder="Số tiền"
                                  suffix="VNĐ"
                                />
                              </div>
                              <div className="sm:col-span-4">
                                <input
                                  type="text"
                                  value={ps.GhiChu}
                                  onChange={(e) =>
                                    updatePhatSinhRow(
                                      room.MaPhong,
                                      idx,
                                      'GhiChu',
                                      e.target.value
                                    )
                                  }
                                  placeholder="Ghi chú thêm..."
                                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold"
                                />
                              </div>
                              <div className="sm:col-span-1 text-right">
                                <button
                                  type="button"
                                  onClick={() =>
                                    removePhatSinhRow(room.MaPhong, idx)
                                  }
                                  className="px-2.5 py-2 rounded-xl bg-red-100 text-red-700 text-xs font-bold cursor-pointer"
                                >
                                  Bỏ
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </main>
        </div>
      )}
    </ProtectedRoute>
  );
}