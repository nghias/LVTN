'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import QuanLyHeader from '@/components/layout/QuanLyHeader';
import { useAlertModal } from '@/components/common/AlertModalProvider';
import {
  tienIchService,
  KhuTroOption,
  PhongOption,
} from '@/services/tienIch.service';

export default function SuaTienIchPage() {
  const params = useParams();
  const router = useRouter();
  const maTI = Number(params?.maTI);
  const { showSuccess, showError } = useAlertModal();

  const [tenTI, setTenTI] = useState<string>('');
  const [moTa, setMoTa] = useState<string>('');

  const [khuTroList, setKhuTroList] = useState<KhuTroOption[]>([]);
  const [phongList, setPhongList] = useState<PhongOption[]>([]);
  const [activeMaKhu, setActiveMaKhu] = useState<number>(0);

  const [selectedRoomIds, setSelectedRoomIds] = useState<number[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [optionsRes, detailRes] = await Promise.all([
          tienIchService.getPhongOptions(),
          tienIchService.getById(maTI),
        ]);

        if (optionsRes.success && optionsRes.data) {
          const khus: KhuTroOption[] = optionsRes.data.khuTroList || [];
          setKhuTroList(khus);
          setPhongList(optionsRes.data.phongList || []);
          if (khus.length === 1) {
            setActiveMaKhu(khus[0].MaKhu);
          }
        }

        if (detailRes.success && detailRes.data) {
          const ti = detailRes.data;
          setTenTI(ti.TenTI || '');
          setMoTa(ti.MoTa || '');

          const assignedIds = Array.isArray(ti.PhongApDung)
            ? ti.PhongApDung.map((id: number) => Number(id))
            : [];
          setSelectedRoomIds(assignedIds);
        } else {
          showError(detailRes.message || 'Không tìm thấy tiện ích');
          router.replace('/chuTro/tienIch');
        }
      } catch {
        showError('Lỗi kết nối máy chủ khi tải dữ liệu tiện ích');
      } finally {
        setLoading(false);
      }
    };

    if (maTI) loadData();
  }, [maTI, router, showError]);

  const filteredRooms =
    activeMaKhu === 0
      ? phongList
      : phongList.filter((p) => Number(p.MaKhu) === Number(activeMaKhu));

  const toggleRoom = (maPhong: number) => {
    setSelectedRoomIds((prev) =>
      prev.includes(maPhong)
        ? prev.filter((id) => id !== maPhong)
        : [...prev, maPhong]
    );
  };

  const selectAllFilteredRooms = () => {
    setSelectedRoomIds((prev) => {
      const next = new Set(prev);
      filteredRooms.forEach((r) => next.add(r.MaPhong));
      return Array.from(next);
    });
  };

  const unselectAllFilteredRooms = () => {
    const filteredIds = new Set(filteredRooms.map((r) => r.MaPhong));
    setSelectedRoomIds((prev) => prev.filter((id) => !filteredIds.has(id)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!tenTI.trim()) {
      showError('Vui lòng nhập tên tiện ích!');
      return;
    }

    try {
      setSubmitting(true);
      const res = await tienIchService.update(maTI, {
        TenTI: tenTI.trim(),
        MoTa: moTa.trim(),
        PhongApDung: selectedRoomIds,
      });

      if (res.success) {
        showSuccess(
          res.message || 'Cập nhật tiện ích thành công!',
          'Thành công',
          1.5,
          () => {
            router.push('/chuTro/tienIch');
          }
        );
      } else {
        showError(res.message || 'Không thể cập nhật tiện ích');
      }
    } catch {
      showError('Lỗi kết nối máy chủ');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['ChuTro', 'QuanLy']}>
      {(user) => (
        <div className="min-h-screen flex flex-col bg-white text-slate-900">
          <QuanLyHeader user={user} />

          <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10">
            <div className="mb-6">
              <Link
                href="/chuTro/tienIch"
                className="text-xs font-bold text-slate-600 hover:text-slate-900 no-underline"
              >
                ← Quay lại danh sách Tiện ích
              </Link>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-2">
                Chỉnh Sửa Tiện Ích #{maTI}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                {user.Quyen === 'ChuTro'
                  ? 'Quản lý thông tin tiện ích và gán phòng áp dụng trên toàn bộ các cơ sở.'
                  : 'Cập nhật phòng áp dụng trong cơ sở bạn quản lý (dữ liệu phòng ở cơ sở khác được giữ nguyên).'}
              </p>
            </div>

            {loading ? (
              <div className="py-12 text-center text-sm text-slate-500">
                Đang tải dữ liệu tiện ích...
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-8 shadow-xs space-y-6"
              >
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Tên tiện ích <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={tenTI}
                    onChange={(e) => setTenTI(e.target.value)}
                    placeholder="Nhập tên tiện ích..."
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Mô tả chi tiết
                  </label>
                  <textarea
                    rows={3}
                    value={moTa}
                    onChange={(e) => setMoTa(e.target.value)}
                    placeholder="Nhập mô tả chi tiết cho tiện ích..."
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
                  />
                </div>

                {/* Khu vực Gán phòng áp dụng */}
                <div className="pt-4 border-t border-slate-200 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h2 className="text-sm sm:text-base font-bold text-slate-900">
                        Phòng Trang Bị Tiện Ích Này
                      </h2>
                      <p className="text-xs text-slate-500">
                        Đang áp dụng cho{' '}
                        <span className="font-bold text-slate-900">
                          {selectedRoomIds.length}
                        </span>{' '}
                        phòng{' '}
                        {user.Quyen === 'QuanLy'
                          ? 'thuộc cơ sở của bạn'
                          : 'trên hệ thống'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={selectAllFilteredRooms}
                        className="px-3 py-1.5 rounded-lg bg-[#00FFCC]/30 hover:bg-[#00FFCC]/50 text-slate-900 text-xs font-bold transition cursor-pointer whitespace-nowrap"
                      >
                        Chọn tất cả phòng đang lọc
                      </button>
                      <button
                        type="button"
                        onClick={unselectAllFilteredRooms}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer whitespace-nowrap"
                      >
                        Bỏ chọn
                      </button>
                    </div>
                  </div>

                  {/* Bộ lọc theo Cơ sở */}
                  {khuTroList.length > 1 && (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveMaKhu(0)}
                        className={`px-3.5 py-2 rounded-full text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                          activeMaKhu === 0
                            ? 'bg-[#00FFCC] text-slate-900 shadow-2xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Tất cả cơ sở ({phongList.length})
                      </button>
                      {khuTroList.map((khu) => {
                        const countInKhu = phongList.filter(
                          (p) => Number(p.MaKhu) === Number(khu.MaKhu)
                        ).length;
                        return (
                          <button
                            key={khu.MaKhu}
                            type="button"
                            onClick={() => setActiveMaKhu(khu.MaKhu)}
                            className={`px-3.5 py-2 rounded-full text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                              activeMaKhu === khu.MaKhu
                                ? 'bg-[#00FFCC] text-slate-900 shadow-2xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {khu.TenKhu} ({countInKhu})
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Lưới chọn phòng */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-96 overflow-y-auto p-1">
                    {filteredRooms.map((room) => {
                      const isChecked = selectedRoomIds.includes(room.MaPhong);

                      return (
                        <div
                          key={room.MaPhong}
                          onClick={() => toggleRoom(room.MaPhong)}
                          className={`p-3 rounded-2xl border transition flex items-center justify-between gap-2 cursor-pointer ${
                            isChecked
                              ? 'bg-[#00FFCC]/20 border-teal-500'
                              : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}}
                              className="w-4 h-4 accent-teal-600 cursor-pointer shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 truncate">
                                {room.TenPhong}
                              </p>
                              <p className="text-[11px] text-slate-500 truncate">
                                {room.TenKhu}
                              </p>
                            </div>
                          </div>

                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                              room.TrangThai === 'Trong'
                                ? 'bg-emerald-100 text-emerald-700'
                                : room.TrangThai === 'DangThue'
                                ? 'bg-sky-100 text-sky-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {room.TrangThai === 'Trong'
                              ? 'Trống'
                              : room.TrangThai === 'DangThue'
                              ? 'Đang thuê'
                              : 'Bảo trì'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
                  <Link
                    href="/chuTro/tienIch"
                    className="w-full sm:w-auto text-center px-6 py-3 rounded-full border border-slate-300 text-slate-700 text-xs font-bold no-underline hover:bg-slate-100"
                  >
                    Hủy
                  </Link>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full sm:w-auto px-8 py-3 rounded-full bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? 'Đang cập nhật...' : 'Lưu Thay Đổi'}
                  </button>
                </div>
              </form>
            )}
          </main>
        </div>
      )}
    </ProtectedRoute>
  );
}