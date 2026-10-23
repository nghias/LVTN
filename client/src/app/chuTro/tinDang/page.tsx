'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ProtectedRoute from '../../../components/common/ProtectedRoute';
import QuanLyHeader from '../../../components/layout/QuanLyHeader';
import { useAlertModal } from '../../../components/common/AlertModalProvider';

// ============================================================================
// KIỂU DỮ LIỆU KHỚP VỚI BẢNG `TinDang`, `Phong`, `KhuTro` TRONG CSDL `qltro`
// ============================================================================
export type TrangThaiTin = 'DangHienThi' | 'DaAn' | 'HetHan';

export interface TinDangItem {
  MaTin: number;
  MaPhong: number;
  MaND: number;
  TieuDe: string;
  MoTa: string | null;
  NgayDang: string;
  NgayHetHan: string | null;
  TrangThai: TrangThaiTin;
  // Thông tin JOIN từ bảng Phong & KhuTro
  TenPhong: string;
  DienTich: number;
  Gia: number;
  TrangThaiPhong: string;
  MaKhu: number;
  TenKhu: string;
}

export interface PhongSelectOption {
  MaPhong: number;
  TenPhong: string;
  DienTich: number;
  Gia: number;
  TrangThai: string;
  MaKhu: number;
  TenKhu: string;
}

interface TinDangFormData {
  MaPhong: string;
  MaND: number;
  TieuDe: string;
  MoTa: string;
  NgayHetHan: string;
  TrangThai: TrangThaiTin;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function QuanLyTinDangPage() {
  const { showSuccess, showError, showConfirm } = useAlertModal();

  // 1. State dữ liệu từ API
  const [tinDangList, setTinDangList] = useState<TinDangItem[]>([]);
  const [phongOptions, setPhongOptions] = useState<PhongSelectOption[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // 2. State bộ lọc (Khu trọ, Trạng thái, Từ khóa) giống QuanLyKhuTroVaPhongPage
  const [selectedMaKhu, setSelectedMaKhu] = useState<number>(0); // 0 = Tất cả
  const [statusFilter, setStatusFilter] = useState<string>(''); // '' = Tất cả
  const [keyword, setKeyword] = useState<string>('');

  // 3. State Modal Đăng tin mới / Sửa tin
  const [isFormModalOpen, setIsFormModalOpen] = useState<boolean>(false);
  const [editingTin, setEditingTin] = useState<TinDangItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [formData, setFormData] = useState<TinDangFormData>({
    MaPhong: '',
    MaND: 1,
    TieuDe: '',
    MoTa: '',
    NgayHetHan: '',
    TrangThai: 'DangHienThi',
  });

  // Tải danh sách Tin đăng & danh sách Phòng từ Server
  const fetchTinDangData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/tin-dang`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error(
          `Không thể tải danh sách tin đăng (Mã lỗi: ${response.status}).`
        );
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Lỗi tải dữ liệu từ máy chủ.');
      }

      setTinDangList(result.data.tinDangList || []);
      setPhongOptions(result.data.phongList || []);
    } catch (err: unknown) {
      if (err instanceof Error) {
        showError(err.message);
      } else {
        showError('Không thể kết nối đến máy chủ dữ liệu.');
      }
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    fetchTinDangData();
  }, [fetchTinDangData]);

  // Tổng hợp danh sách Khu trọ từ dữ liệu phòng và tin đăng để tạo Tab ngang
  const khuTroTabs = useMemo(() => {
    const map = new Map<number, { MaKhu: number; TenKhu: string; SoTin: number }>();

    phongOptions.forEach((p) => {
      if (!map.has(p.MaKhu)) {
        map.set(p.MaKhu, { MaKhu: p.MaKhu, TenKhu: p.TenKhu, SoTin: 0 });
      }
    });

    tinDangList.forEach((t) => {
      const existing = map.get(t.MaKhu);
      if (existing) {
        existing.SoTin += 1;
      } else {
        map.set(t.MaKhu, { MaKhu: t.MaKhu, TenKhu: t.TenKhu, SoTin: 1 });
      }
    });

    return Array.from(map.values());
  }, [phongOptions, tinDangList]);

  // Lọc danh sách tin theo Khu trọ, Trạng thái và Từ khóa
  const filteredTinDang = useMemo(() => {
    return tinDangList.filter((item) => {
      const matchKhu =
        selectedMaKhu === 0 || Number(item.MaKhu) === Number(selectedMaKhu);
      const matchStatus =
        !statusFilter || item.TrangThai === statusFilter;
      const kw = keyword.toLowerCase().trim();
      const matchKeyword =
        !kw ||
        item.TieuDe.toLowerCase().includes(kw) ||
        item.TenPhong.toLowerCase().includes(kw) ||
        item.TenKhu.toLowerCase().includes(kw);

      return matchKhu && matchStatus && matchKeyword;
    });
  }, [tinDangList, selectedMaKhu, statusFilter, keyword]);

  // Tính toán 3 chỉ số KPI
  const countDangHienThi = tinDangList.filter(
    (t) => t.TrangThai === 'DangHienThi'
  ).length;
  const countDaAn = tinDangList.filter((t) => t.TrangThai === 'DaAn').length;
  const countHetHan = tinDangList.filter(
    (t) => t.TrangThai === 'HetHan'
  ).length;

  // Mở Modal Đăng tin mới
  const handleOpenCreateModal = (maND?: number) => {
    setEditingTin(null);
    setFormError(null);

    const availableRooms = selectedMaKhu
      ? phongOptions.filter((p) => p.MaKhu === selectedMaKhu)
      : phongOptions;

    setFormData({
      MaPhong:
        availableRooms.length > 0
          ? String(availableRooms[0].MaPhong)
          : phongOptions.length > 0
          ? String(phongOptions[0].MaPhong)
          : '',
      MaND: maND || 1,
      TieuDe: '',
      MoTa: '',
      NgayHetHan: '',
      TrangThai: 'DangHienThi',
    });
    setIsFormModalOpen(true);
  };

  // Mở Modal Sửa tin đã đăng
  const handleOpenEditModal = (tin: TinDangItem) => {
    setEditingTin(tin);
    setFormError(null);
    setFormData({
      MaPhong: String(tin.MaPhong),
      MaND: tin.MaND,
      TieuDe: tin.TieuDe,
      MoTa: tin.MoTa || '',
      NgayHetHan: tin.NgayHetHan
        ? new Date(tin.NgayHetHan).toISOString().split('T')[0]
        : '',
      TrangThai: tin.TrangThai,
    });
    setIsFormModalOpen(true);
  };

  // Xử lý Lưu (Đăng tin mới hoặc Cập nhật tin)
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.MaPhong) {
      setFormError('Vui lòng chọn phòng trọ cần đăng tin.');
      return;
    }
    if (!formData.TieuDe.trim()) {
      setFormError('Vui lòng nhập tiêu đề tin đăng.');
      return;
    }
    if (formData.TieuDe.trim().length > 200) {
      setFormError('Tiêu đề không được vượt quá 200 ký tự.');
      return;
    }

    try {
      setIsSubmitting(true);

      const url = editingTin
        ? `${API_BASE_URL}/tin-dang/${editingTin.MaTin}`
        : `${API_BASE_URL}/tin-dang`;
      const method = editingTin ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          MaPhong: Number(formData.MaPhong),
          MaND: formData.MaND,
          TieuDe: formData.TieuDe.trim(),
          MoTa: formData.MoTa.trim() || null,
          NgayHetHan: formData.NgayHetHan || null,
          TrangThai: formData.TrangThai,
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Không thể lưu thông tin bài đăng.');
      }

      setIsFormModalOpen(false);
      await fetchTinDangData();
      showSuccess(
        editingTin
          ? `Đã cập nhật tin đăng #${editingTin.MaTin} thành công!`
          : 'Đã đăng tin tìm khách thuê mới thành công!'
      );
    } catch (err: unknown) {
      if (err instanceof Error) {
        setFormError(err.message);
      } else {
        setFormError('Đã xảy ra lỗi khi gửi dữ liệu lên máy chủ.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Xử lý Xóa tin bằng showConfirm của AlertModalProvider
  const handleDeleteTin = (tin: TinDangItem) => {
    showConfirm(
      `Bạn có chắc chắn muốn xóa bài đăng "${tin.TieuDe}" của phòng ${tin.TenPhong} (${tin.TenKhu}) không? Thao tác này không thể hoàn tác.`,
      `Xác nhận xóa Tin đăng #${tin.MaTin}`,
      async () => {
        try {
          const response = await fetch(
            `${API_BASE_URL}/tin-dang/${tin.MaTin}`,
            {
              method: 'DELETE',
            }
          );

          const result = await response.json();
          if (!response.ok || !result.success) {
            throw new Error(result.message || 'Xóa tin đăng thất bại.');
          }

          showSuccess(`Đã xóa tin đăng "${tin.TieuDe}" thành công!`);
          fetchTinDangData();
        } catch (err: unknown) {
          if (err instanceof Error) {
            showError(err.message, 'Không thể xóa tin đăng', 3.5);
          }
        }
      }
    );
  };

  // Render Badge Trạng thái đồng bộ kiểu dáng với QuanLyKhuTroVaPhongPage
  const renderStatusBadge = (status: TrangThaiTin) => {
    if (status === 'DangHienThi') {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
          Đang hiển thị
        </span>
      );
    }
    if (status === 'DaAn') {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
          Đã ẩn tạm thời
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-300">
        Đã hết hạn
      </span>
    );
  };

  return (
    <ProtectedRoute allowedRoles={['ChuTro', 'QuanLy']}>
      {(user) => (
        <div className="flex-1 flex flex-col bg-white text-slate-900">
          <QuanLyHeader user={user} />

          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
            {/* 1. Tiêu đề trang & Cụm nút Thao tác */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                  Quản Lý Tin Đăng Tìm Khách Thuê
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Đăng bài giới thiệu phòng trống, cập nhật nội dung hoặc gỡ các tin đã cho thuê
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={fetchTinDangData}
                  className="flex-1 sm:flex-initial text-center px-4 py-2.5 rounded-full border-2 border-[#00FFCC] bg-white hover:bg-[#00FFCC]/20 text-slate-900 text-xs font-bold transition cursor-pointer"
                >
                  Làm mới dữ liệu
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleOpenCreateModal(
                      (user as { MaND?: number })?.MaND || 1
                    )
                  }
                  className="flex-1 sm:flex-initial text-center px-5 py-2.5 rounded-full bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 border border-teal-300 text-xs font-bold shadow-xs transition cursor-pointer"
                >
                  + Đăng Tin Mới
                </button>
              </div>
            </div>

            {/* 2. 3 Thẻ KPI Tóm tắt */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Tin đang hiển thị
                  </span>
                  <p className="text-2xl font-extrabold text-teal-700">
                    {countDangHienThi} tin
                  </p>
                  <p className="text-xs text-slate-500">
                    Xuất hiện công khai trên trang tìm phòng
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Công khai
                </span>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Tin đang ẩn tạm thời
                  </span>
                  <p className="text-2xl font-extrabold text-amber-600">
                    {countDaAn} tin
                  </p>
                  <p className="text-xs text-slate-500">
                    Tạm ẩn hoặc chờ khách đặt cọc giữ phòng
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                  Tạm ẩn
                </span>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Tin đã hết hạn
                  </span>
                  <p className="text-2xl font-extrabold text-red-600">
                    {countHetHan} tin
                  </p>
                  <p className="text-xs text-slate-500">
                    Cần gia hạn ngày hiển thị hoặc gỡ bỏ
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-300">
                  Hết hạn
                </span>
              </div>
            </div>

            {/* 3. Thanh chọn Khu trọ (Tab ngang cuộn mượt giống QuanLyKhuTroVaPhongPage) */}
            {khuTroTabs.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                <button
                  type="button"
                  onClick={() => setSelectedMaKhu(0)}
                  className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                    selectedMaKhu === 0
                      ? 'bg-[#00FFCC] text-slate-900 border border-teal-400 shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Tất cả cơ sở ({tinDangList.length})
                </button>

                {khuTroTabs.map((khu) => (
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
                    {khu.TenKhu} ({khu.SoTin})
                  </button>
                ))}
              </div>
            )}

            {/* 4. Bộ lọc & Tìm kiếm tin đăng */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="sm:col-span-6">
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Tìm theo tiêu đề tin, tên phòng hoặc khu trọ..."
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
                />
              </div>

              <div className="sm:col-span-6 flex flex-wrap items-center gap-2">
                {[
                  { value: '', label: `Tất cả (${tinDangList.length})` },
                  { value: 'DangHienThi', label: `Đang hiển thị (${countDangHienThi})` },
                  { value: 'DaAn', label: `Đã ẩn (${countDaAn})` },
                  { value: 'HetHan', label: `Hết hạn (${countHetHan})` },
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

            {/* 5. Lưới Thẻ Tin Đăng */}
            {loading ? (
              <div className="py-16 text-center text-sm text-slate-500">
                Đang tải danh sách tin đăng...
              </div>
            ) : filteredTinDang.length === 0 ? (
              <div className="py-16 text-center bg-slate-50 rounded-2xl border border-slate-200 p-6">
                <p className="text-base font-bold text-slate-700">
                  Không tìm thấy tin đăng nào phù hợp!
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Hãy thử thay đổi bộ lọc hoặc bấm &quot;+ Đăng Tin Mới&quot; để tạo bài đăng tìm khách thuê.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTinDang.map((tin) => (
                  <div
                    key={tin.MaTin}
                    className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition overflow-hidden flex flex-col"
                  >
                    {/* Phần đầu thẻ: Nhãn Khu trọ & Trạng thái tin */}
                    <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-900 text-[#00FFCC]">
                          {tin.TenKhu}
                        </span>
                        <span className="text-xs font-bold text-slate-400">
                          #{tin.MaTin}
                        </span>
                      </div>
                      {renderStatusBadge(tin.TrangThai)}
                    </div>

                    {/* Nội dung chính của thẻ */}
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div className="space-y-3">
                        {/* Tên phòng, diện tích & Giá */}
                        <div>
                          <div className="flex items-baseline justify-between gap-2">
                            <h3 className="text-lg font-bold text-slate-900">
                              Phòng {tin.TenPhong}
                            </h3>
                            <span className="text-xs font-semibold text-slate-500">
                              Diện tích: {Number(tin.DienTich)} m²
                            </span>
                          </div>

                          <p className="mt-1 text-base font-extrabold text-teal-700">
                            {Number(tin.Gia).toLocaleString('vi-VN')} đ / tháng
                          </p>
                        </div>

                        {/* Tiêu đề & Mô tả bài đăng */}
                        <div className="space-y-1.5 pt-2 border-t border-slate-100">
                          <h4 className="text-sm font-bold text-slate-900 line-clamp-2">
                            {tin.TieuDe}
                          </h4>
                          <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                            {tin.MoTa || 'Chưa có mô tả chi tiết cho bài đăng này.'}
                          </p>
                        </div>

                        {/* Thông tin ngày đăng & hết hạn */}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#00FFCC]/25 text-slate-900 border border-teal-200">
                            Đăng ngày: {new Date(tin.NgayDang).toLocaleDateString('vi-VN')}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            Hết hạn:{' '}
                            {tin.NgayHetHan
                              ? new Date(tin.NgayHetHan).toLocaleDateString('vi-VN')
                              : 'Không giới hạn'}
                          </span>
                        </div>
                      </div>

                      {/* Cụm nút hành động cuối thẻ */}
                      <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(tin)}
                          className="flex-1 py-2 text-center rounded-xl bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 text-xs font-bold transition cursor-pointer"
                        >
                          Chỉnh sửa
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTin(tin)}
                          className="px-4 py-2 rounded-xl border border-red-200 bg-white hover:bg-red-50 text-red-600 text-xs font-bold transition cursor-pointer"
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

          {/* =====================================================================
              MODAL THÊM MỚI / SỬA TIN ĐĂNG (Đồng bộ chuẩn #00FFCC & rounded-2xl)
             ===================================================================== */}
          {isFormModalOpen && (
            <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full overflow-hidden shadow-xl">
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                  <h2 className="text-base sm:text-lg font-bold text-slate-900">
                    {editingTin
                      ? `Chỉnh Sửa Tin Đăng #${editingTin.MaTin}`
                      : 'Đăng Tin Tìm Khách Thuê Mới'}
                  </h2>
                  <button
                    type="button"
                    onClick={() => setIsFormModalOpen(false)}
                    className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 text-xs font-bold cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleSubmitForm} className="p-6 space-y-4">
                  {formError && (
                    <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs font-bold text-red-600">
                      {formError}
                    </div>
                  )}

                  {/* Chọn Phòng trọ (`MaPhong`) */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Chọn phòng cần đăng tin <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.MaPhong}
                      onChange={(e) =>
                        setFormData({ ...formData, MaPhong: e.target.value })
                      }
                      disabled={isSubmitting}
                      className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
                    >
                      <option value="">-- Chọn phòng trong cơ sở --</option>
                      {phongOptions.map((p) => (
                        <option key={p.MaPhong} value={String(p.MaPhong)}>
                          {p.TenKhu} - Phòng {p.TenPhong} (
                          {Number(p.Gia).toLocaleString('vi-VN')}đ - {p.DienTich}m²)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Tiêu đề tin đăng (`TieuDe`) */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Tiêu đề bài đăng <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      disabled={isSubmitting}
                      value={formData.TieuDe}
                      onChange={(e) =>
                        setFormData({ ...formData, TieuDe: e.target.value })
                      }
                      placeholder="VD: Cho thuê phòng Studio có gác lửng, máy lạnh..."
                      className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
                    />
                  </div>

                  {/* Ngày hết hạn (`NgayHetHan`) & Trạng thái (`TrangThai`) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700">
                        Ngày hết hạn hiển thị
                      </label>
                      <input
                        type="date"
                        disabled={isSubmitting}
                        value={formData.NgayHetHan}
                        onChange={(e) =>
                          setFormData({ ...formData, NgayHetHan: e.target.value })
                        }
                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700">
                        Trạng thái hiển thị
                      </label>
                      <select
                        disabled={isSubmitting}
                        value={formData.TrangThai}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            TrangThai: e.target.value as TrangThaiTin,
                          })
                        }
                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
                      >
                        <option value="DangHienThi">Đang hiển thị công khai</option>
                        <option value="DaAn">Tạm ẩn bài đăng</option>
                        <option value="HetHan">Đã hết hạn</option>
                      </select>
                    </div>
                  </div>

                  {/* Mô tả chi tiết (`MoTa`) */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Mô tả chi tiết tiện ích &amp; quy định
                    </label>
                    <textarea
                      rows={4}
                      disabled={isSubmitting}
                      value={formData.MoTa}
                      onChange={(e) =>
                        setFormData({ ...formData, MoTa: e.target.value })
                      }
                      placeholder="Nhập mô tả về giờ giấc, chỗ để xe, nội thất đi kèm..."
                      className="w-full p-3.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
                    />
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => setIsFormModalOpen(false)}
                      className="px-5 py-2.5 rounded-full border border-slate-300 bg-white hover:bg-slate-100 text-xs font-bold text-slate-700 transition cursor-pointer"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-6 py-2.5 rounded-full bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 border border-teal-300 text-xs font-bold shadow-xs transition cursor-pointer"
                    >
                      {isSubmitting
                        ? 'Đang lưu...'
                        : editingTin
                        ? 'Lưu Thay Đổi'
                        : 'Đăng Tin Ngay'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </ProtectedRoute>
  );
}