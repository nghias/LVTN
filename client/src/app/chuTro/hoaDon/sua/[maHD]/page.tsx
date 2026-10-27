'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import QuanLyHeader from '@/components/layout/QuanLyHeader';
import CurrencyInput from '@/components/common/CurrencyInput';
import { useAlertModal } from '@/components/common/AlertModalProvider';
import { hoaDonService, HoaDonChiTiet } from '@/services/hoaDon.service';

interface EditablePhatSinh {
  TenPS: string;
  Gia: string;
  GhiChu: string;
}

const cleanDecimalString = (val: unknown): string => {
  if (val === null || val === undefined || val === '') return '0';
  const num = Math.round(Number(val));
  return Number.isNaN(num) ? '0' : String(num);
};

export default function SuaHoaDonPage() {
  const params = useParams();
  const router = useRouter();
  const maHD = Number(params?.maHD);
  const { showSuccess, showError } = useAlertModal();

  const [detail, setDetail] = useState<HoaDonChiTiet | null>(null);
  const [ngayTinh, setNgayTinh] = useState<string>('');
  const [soDienMoi, setSoDienMoi] = useState<string>('0');
  const [soNuocMoi, setSoNuocMoi] = useState<string>('0');
  const [phatSinhList, setPhatSinhList] = useState<EditablePhatSinh[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const formatVND = (val: number | string) => {
    const num = Math.round(Number(val) || 0);
    return num.toLocaleString('vi-VN') + ' đ';
  };

  useEffect(() => {
    if (!maHD) return;
    let isMounted = true;

    const fetchDetail = async () => {
      try {
        setLoading(true);
        const res = await hoaDonService.getById(maHD);
        if (!isMounted) return;

        if (res.success && res.data) {
          const d: HoaDonChiTiet = res.data;
          setDetail(d);
          setNgayTinh(d.NgayTinh ? d.NgayTinh.slice(0, 10) : '');
          setSoDienMoi(String(d.SoDienMoi ?? 0));
          setSoNuocMoi(String(d.SoNuocMoi ?? 0));
          setPhatSinhList(
            (d.DanhSachPhatSinh || []).map((ps) => ({
              TenPS: ps.TenPS || '',
              Gia: cleanDecimalString(ps.Gia),
              GhiChu: ps.GhiChu || '',
            }))
          );
        } else {
          showError('Không tìm thấy thông tin hóa đơn cần sửa.');
          router.push('/chuTro/hoaDon');
        }
      } catch {
        if (isMounted) showError('Không thể tải dữ liệu hóa đơn.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchDetail();
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maHD]);

  const soDienCu = Number(detail?.SoDienCu) || 0;
  const soNuocCu = Number(detail?.SoNuocCu) || 0;
  const giaDien = Math.round(Number(detail?.GiaDien) || 0);
  const giaNuoc = Math.round(Number(detail?.GiaNuoc) || 0);

  const dienTieuThu = Math.max(0, (Number(soDienMoi) || 0) - soDienCu);
  const nuocTieuThu = Math.max(0, (Number(soNuocMoi) || 0) - soNuocCu);

  const tienPhong = Math.round(Number(detail?.TienPhong) || 0);
  const tienPhuPhi = Math.round(Number(detail?.TienPhuPhi) || 0);
  const tienDienMoi = dienTieuThu * giaDien;
  const tienNuocMoi = nuocTieuThu * giaNuoc;
  const tienPhatSinhMoi = phatSinhList.reduce(
    (sum, item) => sum + (Math.round(Number(item.Gia)) || 0),
    0
  );
  const tongTienMoi =
    tienPhong + tienDienMoi + tienNuocMoi + tienPhuPhi + tienPhatSinhMoi;

  const handleAddPhatSinh = () => {
    setPhatSinhList((prev) => [...prev, { TenPS: '', Gia: '', GhiChu: '' }]);
  };

  const handleRemovePhatSinh = (idx: number) => {
    setPhatSinhList((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleChangePhatSinh = (
    idx: number,
    field: keyof EditablePhatSinh,
    value: string
  ) => {
    setPhatSinhList((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (Number(soDienMoi) < soDienCu) {
      showError(
        `Số điện mới (${soDienMoi}) không được nhỏ hơn số điện cũ (${soDienCu})!`
      );
      return;
    }

    if (Number(soNuocMoi) < soNuocCu) {
      showError(
        `Số nước mới (${soNuocMoi}) không được nhỏ hơn số nước cũ (${soNuocCu})!`
      );
      return;
    }

    for (const ps of phatSinhList) {
      if (ps.TenPS.trim() && (ps.Gia === '' || Number(ps.Gia) < 0)) {
        showError(`Vui lòng nhập số tiền hợp lệ cho khoản "${ps.TenPS}"!`);
        return;
      }
    }

    try {
      setSubmitting(true);
      const res = await hoaDonService.update(maHD, {
        SoDienMoi: Number(soDienMoi),
        SoNuocMoi: Number(soNuocMoi),
        NgayTinh: ngayTinh,
        PhatSinhList: phatSinhList
          .filter((ps) => ps.TenPS.trim() !== '')
          .map((ps) => ({
            TenPS: ps.TenPS.trim(),
            Gia: Math.round(Number(ps.Gia)) || 0,
            GhiChu: ps.GhiChu.trim(),
          })),
      });

      if (res.success) {
        showSuccess(
          'Cập nhật hóa đơn thành công!',
          'Thành công',
          1.5,
          () => {
            router.push(`/chuTro/hoaDon/chiTiet/${maHD}`);
          }
        );
      } else {
        showError(res.message || 'Không thể cập nhật hóa đơn.');
      }
    } catch {
      showError('Không thể lưu thay đổi hóa đơn vào lúc này.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['ChuTro', 'QuanLy']}>
      {(user) => (
        <div className="min-h-screen flex flex-col bg-white text-slate-900">
          <QuanLyHeader user={user} />

          <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
            <div className="mb-6">
              <Link
                href="/chuTro/hoaDon"
                className="text-xs font-bold text-slate-600 hover:text-slate-900 no-underline"
              >
                ← Quay lại danh sách Hóa đơn
              </Link>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-2 tracking-tight">
                Sửa Hóa Đơn #{maHD}{' '}
                {detail ? `— ${detail.TenPhong} (${detail.TenKhu})` : ''}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Sửa nhanh chỉ số điện/nước mới hoặc thêm/bỏ các khoản phí phát sinh. Tổng tiền sẽ được hệ thống tính lại tự động.
              </p>
            </div>

            {loading || !detail ? (
              <div className="py-16 text-center text-slate-500 text-sm font-bold">
                Đang tải thông tin hóa đơn...
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-8 shadow-xs space-y-6"
              >
                {/* Thông tin cố định của phòng & ngày tính */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">
                      🔒 Phòng & Cơ sở
                    </label>
                    <input
                      type="text"
                      value={`${detail.TenPhong} (${detail.TenKhu})`}
                      disabled
                      readOnly
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-slate-100 text-sm font-bold text-slate-600 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">
                      🔒 Tiền phòng & Phí dịch vụ cố định
                    </label>
                    <input
                      type="text"
                      value={`${formatVND(tienPhong)} + DV ${formatVND(tienPhuPhi)}`}
                      disabled
                      readOnly
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-slate-100 text-sm font-bold text-slate-600 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Ngày tính hóa đơn <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={ngayTinh}
                      onChange={(e) => setNgayTinh(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
                      required
                    />
                  </div>
                </div>

                {/* Sửa nhanh Chỉ số Điện & Nước */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Khối Điện */}
                  <div className="p-5 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-amber-900">
                        1. Sửa Nhanh Chỉ Số Điện ({formatVND(giaDien)}/kWh)
                      </h3>
                      <span className="text-xs font-bold text-amber-800">
                        +{dienTieuThu} kWh = {formatVND(tienDienMoi)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">
                          🔒 Số điện cũ
                        </label>
                        <input
                          type="text"
                          value={soDienCu}
                          disabled
                          readOnly
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-200/80 text-sm font-bold text-slate-600 cursor-not-allowed"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Số điện mới <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={soDienMoi}
                          onChange={(e) =>
                            setSoDienMoi(e.target.value.replace(/\D/g, ''))
                          }
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Khối Nước */}
                  <div className="p-5 rounded-2xl bg-sky-50/60 border border-sky-200 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-sky-900">
                        2. Sửa Nhanh Chỉ Số Nước ({formatVND(giaNuoc)}/m³)
                      </h3>
                      <span className="text-xs font-bold text-sky-800">
                        +{nuocTieuThu} m³ = {formatVND(tienNuocMoi)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">
                          🔒 Số nước cũ
                        </label>
                        <input
                          type="text"
                          value={soNuocCu}
                          disabled
                          readOnly
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-200/80 text-sm font-bold text-slate-600 cursor-not-allowed"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Số nước mới <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={soNuocMoi}
                          onChange={(e) =>
                            setSoNuocMoi(e.target.value.replace(/\D/g, ''))
                          }
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Khu vực Thêm / Bỏ Phí phát sinh (Bảng PhatSinh) */}
                <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        3. Danh Sách Phí Phát Sinh ({phatSinhList.length} khoản)
                      </h3>
                      <p className="text-xs text-slate-500">
                        Tổng phí phát sinh: <strong>{formatVND(tienPhatSinhMoi)}</strong>
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddPhatSinh}
                      className="px-4 py-2 rounded-full bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 text-xs font-bold cursor-pointer"
                    >
                      + Thêm khoản phát sinh
                    </button>
                  </div>

                  {phatSinhList.length === 0 ? (
                    <p className="text-xs font-semibold text-slate-500 py-2">
                      Không có phí phát sinh nào trong hóa đơn này. Nhấn &ldquo;+ Thêm khoản phát sinh&rdquo; nếu cần cộng thêm chi phí.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {phatSinhList.map((ps, index) => (
                        <div
                          key={index}
                          className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center bg-white p-3 rounded-2xl border border-slate-200"
                        >
                          <div className="sm:col-span-4">
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">
                              Tên khoản phát sinh *
                            </label>
                            <input
                              type="text"
                              value={ps.TenPS}
                              onChange={(e) =>
                                handleChangePhatSinh(
                                  index,
                                  'TenPS',
                                  e.target.value
                                )
                              }
                              placeholder="VD: Thay khóa cửa, Phạt..."
                              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-bold"
                              required
                            />
                          </div>

                          <div className="sm:col-span-3">
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">
                              Số tiền (VNĐ) *
                            </label>
                            <CurrencyInput
                              value={ps.Gia}
                              onChange={(val) =>
                                handleChangePhatSinh(index, 'Gia', val)
                              }
                              placeholder="VD: 50.000"
                              suffix="VNĐ"
                            />
                          </div>

                          <div className="sm:col-span-4">
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">
                              Ghi chú
                            </label>
                            <input
                              type="text"
                              value={ps.GhiChu}
                              onChange={(e) =>
                                handleChangePhatSinh(
                                  index,
                                  'GhiChu',
                                  e.target.value
                                )
                              }
                              placeholder="Ghi chú chi tiết..."
                              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-bold"
                            />
                          </div>

                          <div className="sm:col-span-1 pt-4 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemovePhatSinh(index)}
                              className="px-3 py-2.5 rounded-xl bg-red-100 hover:bg-red-200 text-red-700 text-xs font-bold cursor-pointer"
                            >
                              Bỏ
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Bảng đối chiếu Tổng tiền sau khi sửa */}
                <div className="p-5 rounded-2xl bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1 text-xs">
                    <p className="text-slate-300 font-bold">
                      Tiền phòng ({formatVND(tienPhong)}) + Điện ({formatVND(tienDienMoi)}) + Nước ({formatVND(tienNuocMoi)}) + Dịch vụ ({formatVND(tienPhuPhi)}) + Phát sinh ({formatVND(tienPhatSinhMoi)})
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-300 block">
                      Tổng tiền hóa đơn mới:
                    </span>
                    <span className="text-xl sm:text-2xl font-bold text-[#00FFCC]">
                      {formatVND(tongTienMoi)}
                    </span>
                  </div>
                </div>

                {/* Nút Lưu / Hủy */}
                <div className="pt-2 flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
                  <Link
                    href={`/chuTro/hoaDon/chiTiet/${maHD}`}
                    className="w-full sm:w-auto text-center px-6 py-3 rounded-full border border-slate-300 text-slate-700 text-xs font-bold no-underline hover:bg-slate-100"
                  >
                    Hủy
                  </Link>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full sm:w-auto px-8 py-3 rounded-full bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? 'Đang cập nhật...' : 'Lưu Thay Đổi Hóa Đơn'}
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