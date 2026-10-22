'use client';

import { useEffect, useState, FormEvent, ChangeEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import QuanLyHeader from '@/components/layout/QuanLyHeader';
import { useAlertModal } from '@/components/common/AlertModalProvider';
import { PhongTroService } from '@/services/phongTro.service';
import { KhuTroItem, RoomStatus, TienIchItem } from '@/types/phongTro.type';
import CurrencyInput from '@/components/common/CurrencyInput';

export default function ThemPhongTroPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedKhu = Number(searchParams.get('maKhu') || 0);
  const { showSuccess, showError } = useAlertModal();

  const [khuTroList, setKhuTroList] = useState<KhuTroItem[]>([]);
  const [tienIchList, setTienIchList] = useState<TienIchItem[]>([]);

  const [maKhu, setMaKhu] = useState<number>(0);
  const [tenPhong, setTenPhong] = useState('');
  const [dienTich, setDienTich] = useState('');
  const [gia, setGia] = useState('');
  const [trangThai, setTrangThai] = useState<RoomStatus>('Trong');
  const [selectedTienIch, setSelectedTienIch] = useState<number[]>([]);

  // Quản lý file ảnh tải lên & chọn Ảnh chính
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [mainImageIndex, setMainImageIndex] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([PhongTroService.getKhuTroList(), PhongTroService.getAllTienIch()])
      .then(([khuRes, tiRes]) => {
        const khus = khuRes.data || [];
        setKhuTroList(khus);
        setTienIchList(tiRes.data || []);

        if (preselectedKhu && khus.some((k) => k.MaKhu === preselectedKhu)) {
          setMaKhu(preselectedKhu);
        } else if (khus.length > 0) {
          setMaKhu(khus[0].MaKhu);
        }
      })
      .catch((err: unknown) => {
        if (err instanceof Error) showError(err.message);
      });
  }, [preselectedKhu, showError]);

  const toggleTienIch = (maTI: number) => {
    setSelectedTienIch((prev) =>
      prev.includes(maTI) ? prev.filter((id) => id !== maTI) : [...prev, maTI]
    );
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const filesArray = Array.from(e.target.files);
    const updatedFiles = [...selectedFiles, ...filesArray];
    setSelectedFiles(updatedFiles);

    const newPreviews = filesArray.map((file) => URL.createObjectURL(file));
    setPreviewUrls((prev) => [...prev, ...newPreviews]);
  };

  const handleRemoveFile = (index: number) => {
    const updatedFiles = selectedFiles.filter((_, idx) => idx !== index);
    const updatedPreviews = previewUrls.filter((_, idx) => idx !== index);
    setSelectedFiles(updatedFiles);
    setPreviewUrls(updatedPreviews);

    if (mainImageIndex === index) {
      setMainImageIndex(0);
    } else if (mainImageIndex > index) {
      setMainImageIndex(mainImageIndex - 1);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!maKhu || !tenPhong.trim() || !dienTich || !gia) {
      showError('Vui lòng nhập đầy đủ khu trọ, tên phòng, diện tích và giá thuê!');
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('MaKhu', String(maKhu));
      formData.append('TenPhong', tenPhong.trim());
      formData.append('DienTich', String(dienTich));
      formData.append('Gia', String(gia));
      formData.append('TrangThai', trangThai);
      formData.append('TienIchIds', JSON.stringify(selectedTienIch));
      formData.append('MainImageIndex', String(mainImageIndex));

      selectedFiles.forEach((file) => {
        formData.append('anhPhong', file);
      });

      await PhongTroService.createPhong(formData);
      showSuccess('Thêm phòng trọ mới thành công!', 'Thành công', 1.5, () => {
        router.push('/chuTro/phongTro');
      });
    } catch (err: unknown) {
      if (err instanceof Error) showError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['ChuTro', 'QuanLy']}>
      {(user) => (
        <div className="flex-1 flex flex-col bg-white text-slate-900">
          <QuanLyHeader user={user} />

          <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-6 sm:py-10">
            <div className="mb-6">
              <Link
                href="/chuTro/phongTro"
                className="text-xs font-bold text-slate-600 hover:text-slate-900 no-underline"
              >
                ← Quay lại danh sách Phòng trọ
              </Link>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-2">
                Thêm Phòng Trọ Mới
              </h1>
            </div>

            <form
              onSubmit={handleSubmit}
              className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-8 shadow-sm space-y-6"
            >
              {/* Khu trọ & Tên phòng */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Thuộc Khu trọ (Cơ sở) *
                  </label>
                  <select
                    value={maKhu}
                    onChange={(e) => setMaKhu(Number(e.target.value))}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
                  >
                    {khuTroList.map((khu) => (
                      <option key={khu.MaKhu} value={khu.MaKhu}>
                        {khu.TenKhu}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Tên phòng / Số phòng *
                  </label>
                  <input
                    type="text"
                    value={tenPhong}
                    onChange={(e) => setTenPhong(e.target.value)}
                    placeholder="VD: P.111, P.212..."
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
                  />
                </div>
              </div>

              {/* Diện tích, Giá thuê & Trạng thái */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Diện tích (m²) *
                  </label>
                  <CurrencyInput
                    value={dienTich}
                    onChange={setDienTich}
                    placeholder="VD: 22"
                    suffix="m²"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Giá thuê (VNĐ/tháng) *
                  </label>
                  <CurrencyInput
                    value={gia}
                    onChange={setGia}
                    placeholder="VD: 2.300.000"
                    suffix="VNĐ"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Trạng thái phòng
                  </label>
                  <select
                    value={trangThai}
                    onChange={(e) => setTrangThai(e.target.value as RoomStatus)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
                  >
                    <option value="Trong">Đang trống</option>
                    <option value="DangThue">Đang thuê</option>
                    <option value="BaoTri">Đang bảo trì</option>
                  </select>
                </div>
              </div>

              {/* Chọn Tiện ích đi kèm (ChiTietTienIch) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Tiện ích trang bị trong phòng
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {tienIchList.map((ti) => {
                    const checked = selectedTienIch.includes(ti.MaTI);
                    return (
                      <button
                        key={ti.MaTI}
                        type="button"
                        onClick={() => toggleTienIch(ti.MaTI)}
                        className={`p-3 rounded-xl border text-left text-xs font-bold transition cursor-pointer flex items-center justify-between ${
                          checked
                            ? 'bg-[#00FFCC]/30 border-teal-500 text-slate-900'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <span>{ti.TenTI}</span>
                        {checked && <span className="text-teal-800">✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tải ảnh phòng lên Cloudinary & Chọn Ảnh chính (AnhChinh = 1) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Hình ảnh phòng trọ (Tải lên Cloudinary)
                </label>
                <p className="text-[11px] text-slate-500 mb-3">
                  Bấm vào nút <strong>&quot;Đặt làm ảnh chính&quot;</strong> trên bức ảnh bạn muốn hiển thị ở ngoài thẻ phòng.
                </p>

                <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-teal-400 bg-[#00FFCC]/10 hover:bg-[#00FFCC]/25 text-xs font-bold text-slate-900 cursor-pointer transition">
                  <span>+ Chọn ảnh từ thiết bị</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>

                {previewUrls.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {previewUrls.map((url, idx) => {
                      const isMain = idx === mainImageIndex;
                      return (
                        <div
                          key={idx}
                          className={`relative rounded-2xl overflow-hidden border-2 ${
                            isMain ? 'border-[#00FFCC] shadow-md' : 'border-slate-200'
                          }`}
                        >
                          <img
                            src={url}
                            alt={`Preview ${idx}`}
                            className="w-full h-32 object-cover"
                          />
                          <div className="p-2 bg-white flex items-center justify-between gap-1">
                            <button
                              type="button"
                              onClick={() => setMainImageIndex(idx)}
                              className={`px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer ${
                                isMain
                                  ? 'bg-[#00FFCC] text-slate-900'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              {isMain ? '★ Ảnh chính' : 'Đặt làm ảnh chính'}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleRemoveFile(idx)}
                              className="px-2 py-1 rounded-lg text-[10px] font-bold bg-red-50 text-red-600 hover:bg-red-100 cursor-pointer"
                            >
                              Xóa
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Nút Lưu / Hủy */}
              <div className="pt-4 border-t border-slate-100 flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
                <Link
                  href="/chuTro/phongTro"
                  className="w-full sm:w-auto text-center px-6 py-3 rounded-full border border-slate-300 text-slate-700 text-xs font-bold no-underline hover:bg-slate-100"
                >
                  Hủy
                </Link>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-auto px-8 py-3 rounded-full bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 text-xs font-bold shadow-xs cursor-pointer"
                >
                  {submitting ? 'Đang tải ảnh & lưu...' : 'Tạo Phòng Trọ'}
                </button>
              </div>
            </form>
          </main>
        </div>
      )}
    </ProtectedRoute>
  );
}