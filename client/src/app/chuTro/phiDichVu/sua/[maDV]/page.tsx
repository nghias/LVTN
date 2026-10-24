'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import QuanLyHeader from '@/components/layout/QuanLyHeader';
import CurrencyInput from '@/components/common/CurrencyInput';
import { useAlertModal } from '@/components/common/AlertModalProvider';
import { cleanDecimalString } from '@/utils/format.util';
import {
  dichVuService,
  KhuTroOption,
  PhongOption,
} from '@/services/dichVu.service';

export default function SuaPhiDichVuPage() {
  const params = useParams();
  const router = useRouter();
  const maDV = Number(params?.maDV);
  const { showSuccess, showError } = useAlertModal();

  const [tenDV, setTenDV] = useState<string>('');
  const [donGia, setDonGia] = useState<string>('');
  const [donViTinh, setDonViTinh] = useState<string>('');
  const [moTa, setMoTa] = useState<string>('');

  const [khuTroList, setKhuTroList] = useState<KhuTroOption[]>([]);
  const [phongList, setPhongList] = useState<PhongOption[]>([]);
  const [activeMaKhu, setActiveMaKhu] = useState<number>(0);

  const [selectedRooms, setSelectedRooms] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [optionsRes, detailRes] = await Promise.all([
          dichVuService.getPhongOptions(),
          dichVuService.getById(maDV),
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
          const dv = detailRes.data;
          setTenDV(dv.TenDV || '');
          setDonGia(cleanDecimalString(dv.DonGia));
          setDonViTinh(dv.DonViTinh || '');
          setMoTa(dv.MoTa || '');

          const roomMap: Record<number, number> = {};
          (dv.PhongApDung || []).forEach(
            (item: { MaPhong: number; SoLuong: number }) => {
              roomMap[Number(item.MaPhong)] = Number(item.SoLuong) || 1;
            }
          );
          setSelectedRooms(roomMap);
        } else {
          showError(detailRes.message || 'Không tìm thấy phí dịch vụ');
          router.replace('/chuTro/phiDichVu');
        }
      } catch {
        showError('Lỗi kết nối máy chủ khi tải dữ liệu');
      } finally {
        setLoading(false);
      }
    };

    if (maDV) loadData();
  }, [maDV, router, showError]);

  const filteredRooms =
    activeMaKhu === 0
      ? phongList
      : phongList.filter((p) => Number(p.MaKhu) === Number(activeMaKhu));

  const toggleRoom = (maPhong: number) => {
    setSelectedRooms((prev) => {
      const next = { ...prev };
      if (next[maPhong]) {
        delete next[maPhong];
      } else {
        next[maPhong] = 1;
      }
      return next;
    });
  };

  const changeRoomQuantity = (maPhong: number, qty: number) => {
    setSelectedRooms((prev) => ({
      ...prev,
      [maPhong]: Math.max(1, qty),
    }));
  };

  const selectAllFilteredRooms = () => {
    setSelectedRooms((prev) => {
      const next = { ...prev };
      filteredRooms.forEach((r) => {
        if (!next[r.MaPhong]) next[r.MaPhong] = 1;
      });
      return next;
    });
  };

  const unselectAllFilteredRooms = () => {
    setSelectedRooms((prev) => {
      const next = { ...prev };
      filteredRooms.forEach((r) => {
        delete next[r.MaPhong];
      });
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!tenDV.trim() || !donGia || !donViTinh.trim()) {
      showError('Vui lòng nhập đầy đủ Tên dịch vụ, Đơn giá và Đơn vị tính!');
      return;
    }

    const phongApDungPayload = Object.entries(selectedRooms).map(
      ([maPhong, soLuong]) => ({
        MaPhong: Number(maPhong),
        SoLuong: Number(soLuong) || 1,
      })
    );

    try {
      setSubmitting(true);
      const res = await dichVuService.update(maDV, {
        TenDV: tenDV.trim(),
        DonGia: Number(donGia),
        DonViTinh: donViTinh.trim(),
        MoTa: moTa.trim(),
        PhongApDung: phongApDungPayload,
      });

      if (res.success) {
        showSuccess(res.message || 'Cập nhật phí dịch vụ thành công!', 'Thành công', 1.5, () => {
          router.push('/chuTro/phiDichVu');
        });
      } else {
        showError(res.message || 'Không thể cập nhật phí dịch vụ');
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
                href="/chuTro/phiDichVu"
                className="text-xs font-bold text-slate-600 hover:text-slate-900 no-underline"
              >
                ← Quay lại danh sách Phí dịch vụ
              </Link>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-2">
                Chỉnh Sửa Phí Dịch Vụ #{maDV}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                {user.Quyen === 'ChuTro'
                  ? 'Quản lý thông tin dịch vụ và gán phòng áp dụng trên toàn bộ các cơ sở.'
                  : 'Cập nhật phòng áp dụng trong cơ sở bạn quản lý (dữ liệu phòng ở cơ sở khác được giữ nguyên).'}
              </p>
            </div>

            {loading ? (
              <div className="py-12 text-center text-sm text-slate-500">
                Đang tải dữ liệu phí dịch vụ...
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-8 shadow-xs space-y-6"
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-1">
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Tên phí dịch vụ <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={tenDV}
                      onChange={(e) => setTenDV(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Đơn giá (VNĐ) <span className="text-red-500">*</span>
                    </label>
                    <CurrencyInput
                      value={donGia}
                      onChange={setDonGia}
                      placeholder="VD: 3.500"
                      suffix="VNĐ"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Đơn vị tính <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      list="donViTinhOptionsEdit"
                      value={donViTinh}
                      onChange={(e) => setDonViTinh(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
                      required
                    />
                    <datalist id="donViTinhOptionsEdit">
                      <option value="kWh" />
                      <option value="m3" />
                      <option value="Tháng" />
                      <option value="Xe/Tháng" />
                      <option value="Người/Tháng" />
                    </datalist>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Mô tả chi tiết
                  </label>
                  <textarea
                    rows={3}
                    value={moTa}
                    onChange={(e) => setMoTa(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
                  />
                </div>

                {/* Khu vực Gán phòng áp dụng */}
                <div className="pt-4 border-t border-slate-200 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h2 className="text-sm sm:text-base font-bold text-slate-900">
                        Phòng Áp Dụng Phí Dịch Vụ
                      </h2>
                      <p className="text-xs text-slate-500">
                        Đang áp dụng cho{' '}
                        <span className="font-bold text-slate-900">
                          {Object.keys(selectedRooms).length}
                        </span>{' '}
                        phòng {user.Quyen === 'QuanLy' ? 'thuộc cơ sở của bạn' : 'trên hệ thống'}
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-96 overflow-y-auto p-1">
                    {filteredRooms.map((room) => {
                      const isChecked = Boolean(selectedRooms[room.MaPhong]);
                      const soLuong = selectedRooms[room.MaPhong] || 1;

                      return (
                        <div
                          key={room.MaPhong}
                          className={`p-3 rounded-2xl border transition flex items-center justify-between gap-2 ${
                            isChecked
                              ? 'bg-[#00FFCC]/20 border-teal-500'
                              : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <div
                            onClick={() => toggleRoom(room.MaPhong)}
                            className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0"
                          >
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

                          {isChecked && (
                            <div className="flex items-center gap-1 shrink-0">
                              <span className="text-[11px] font-semibold text-slate-600">
                                SL:
                              </span>
                              <input
                                type="number"
                                min={1}
                                value={soLuong}
                                onChange={(e) =>
                                  changeRoomQuantity(
                                    room.MaPhong,
                                    Number(e.target.value)
                                  )
                                }
                                className="w-14 px-2 py-1 rounded-lg border border-teal-500 bg-white text-xs font-bold text-center focus:outline-none"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
                  <Link
                    href="/chuTro/phiDichVu"
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