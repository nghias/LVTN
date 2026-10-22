'use client';

import { useEffect, useState, FormEvent, ChangeEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import QuanLyHeader from '@/components/layout/QuanLyHeader';
import CurrencyInput from '@/components/common/CurrencyInput';
import { useAlertModal } from '@/components/common/AlertModalProvider';
import { cleanDecimalString } from '@/utils/format.util';
import {
  PhongTroService,
  resolveRoomImageUrl,
} from '@/services/phongTro.service';
import {
  AnhPhongItem,
  KhuTroItem,
  RoomStatus,
  TienIchItem,
} from '@/types/phongTro.type';

export default function SuaPhongTroPage() {
  const params = useParams();
  const router = useRouter();
  const maPhong = Number(params.maPhong);
  const { showSuccess, showError } = useAlertModal();

  const [khuTroList, setKhuTroList] = useState<KhuTroItem[]>([]);
  const [tienIchList, setTienIchList] = useState<TienIchItem[]>([]);

  const [maKhu, setMaKhu] = useState<number>(0);
  const [tenPhong, setTenPhong] = useState('');
  const [dienTich, setDienTich] = useState('');
  const [gia, setGia] = useState('');
  const [trangThai, setTrangThai] = useState<RoomStatus>('Trong');
  const [selectedTienIch, setSelectedTienIch] = useState<number[]>([]);

  const [existingImages, setExistingImages] = useState<AnhPhongItem[]>([]);
  const [deletedMaAnhs, setDeletedMaAnhs] = useState<number[]>([]);
  const [mainMaAnh, setMainMaAnh] = useState<number | null>(null);

  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);
  const [newMainIndex, setNewMainIndex] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadRoomData = async () => {
      try {
        const [khuRes, tiRes, roomRes] = await Promise.all([
          PhongTroService.getKhuTroList(),
          PhongTroService.getAllTienIch(),
          PhongTroService.getPhongDetail(maPhong),
        ]);

        setKhuTroList(khuRes.data || []);
        setTienIchList(tiRes.data || []);

        const room = roomRes.data;
        if (room) {
          setMaKhu(room.MaKhu);
          setTenPhong(room.TenPhong);
          // Bỏ hoàn toàn đuôi .00 khi nạp dữ liệu từ Database
          setDienTich(cleanDecimalString(room.DienTich));
          setGia(cleanDecimalString(room.Gia));
          setTrangThai(room.TrangThai);
          setSelectedTienIch((room.TienIch || []).map((t) => t.MaTI));

          const imgs = room.DanhSachAnh || [];
          setExistingImages(imgs);
          const currentMain = imgs.find((i) => Number(i.AnhChinh) === 1);
          if (currentMain) {
            setMainMaAnh(currentMain.MaAnh);
          } else if (imgs.length > 0) {
            setMainMaAnh(imgs[0].MaAnh);
          }
        }
      } catch (err: unknown) {
        if (err instanceof Error) showError(err.message);
        router.replace('/chuTro/phongTro');
      } finally {
        setLoading(false);
      }
    };
    if (maPhong) loadRoomData();
  }, [maKhu, maPhong, router, showError]);

  const toggleTienIch = (maTI: number) => {
    setSelectedTienIch((prev) =>
      prev.includes(maTI) ? prev.filter((id) => id !== maTI) : [...prev, maTI]
    );
  };

  const handleRemoveExistingImage = (maAnh: number) => {
    const remaining = existingImages.filter((img) => img.MaAnh !== maAnh);
    setExistingImages(remaining);
    setDeletedMaAnhs((prev) => [...prev, maAnh]);

    if (mainMaAnh === maAnh) {
      if (remaining.length > 0) {
        setMainMaAnh(remaining[0].MaAnh);
      } else if (newFiles.length > 0) {
        setMainMaAnh(null);
        setNewMainIndex(0);
      } else {
        setMainMaAnh(null);
      }
    }
  };

  const handleNewFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const filesArr = Array.from(e.target.files);
    setNewFiles((prev) => [...prev, ...filesArr]);

    const urls = filesArr.map((f) => URL.createObjectURL(f));
    setNewPreviews((prev) => [...prev, ...urls]);

    if (existingImages.length === 0 && newMainIndex === null) {
      setNewMainIndex(0);
    }
  };

  const handleRemoveNewFile = (idx: number) => {
    setNewFiles((prev) => prev.filter((_, i) => i !== idx));
    setNewPreviews((prev) => prev.filter((_, i) => i !== idx));
    if (newMainIndex === idx) {
      setNewMainIndex(null);
      if (existingImages.length > 0) setMainMaAnh(existingImages[0].MaAnh);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!tenPhong.trim() || !dienTich || !gia) {
      showError('Vui lòng nhập đầy đủ tên phòng, diện tích và giá thuê!');
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
      formData.append('DeletedMaAnhs', JSON.stringify(deletedMaAnhs));

      if (mainMaAnh) {
        formData.append('MainMaAnh', String(mainMaAnh));
      } else if (newMainIndex !== null) {
        formData.append('NewMainIndex', String(newMainIndex));
      }

      newFiles.forEach((file) => {
        formData.append('anhPhong', file);
      });

      await PhongTroService.updatePhong(maPhong, formData);
      showSuccess('Cập nhật thông tin phòng thành công!', 'Thành công', 1.5, () => {
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
                Chỉnh Sửa Phòng Trọ {tenPhong}
              </h1>
            </div>

            {loading ? (
              <p className="text-sm text-slate-500">Đang tải dữ liệu phòng trọ...</p>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-8 shadow-sm space-y-6"
              >
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
                      Tên phòng *
                    </label>
                    <input
                      type="text"
                      value={tenPhong}
                      onChange={(e) => setTenPhong(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
                    />
                  </div>
                </div>

                {/* Diện tích & Giá thuê định dạng chuẩn VN (Không có ,00) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Diện tích (m²) *
                    </label>
                    <CurrencyInput
                      value={dienTich}
                      onChange={setDienTich}
                      placeholder="VD: 20"
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
                      placeholder="VD: 2.200.000"
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

                {/* Chọn Tiện ích */}
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

                {/* Quản lý Ảnh */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Quản lý Hình ảnh Phòng trọ (Ảnh chính hiển thị ngoài thẻ)
                  </label>
                  <p className="text-[11px] text-slate-500 mb-3">
                    Các ảnh bị xóa sẽ tự động được dọn dẹp khỏi Cloudinary sau khi bấm Lưu.
                  </p>

                  <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-teal-400 bg-[#00FFCC]/10 hover:bg-[#00FFCC]/25 text-xs font-bold text-slate-900 cursor-pointer transition">
                    <span>+ Tải thêm ảnh mới</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleNewFileChange}
                      className="hidden"
                    />
                  </label>

                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {existingImages.map((img) => {
                      const isMain = mainMaAnh === img.MaAnh;
                      return (
                        <div
                          key={img.MaAnh}
                          className={`relative rounded-2xl overflow-hidden border-2 ${
                            isMain ? 'border-[#00FFCC] shadow-md' : 'border-slate-200'
                          }`}
                        >
                          <img
                            src={resolveRoomImageUrl(img.DuongDan)}
                            alt="Room"
                            className="w-full h-32 object-cover"
                          />
                          <div className="p-2 bg-white flex items-center justify-between gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setMainMaAnh(img.MaAnh);
                                setNewMainIndex(null);
                              }}
                              className={`px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer ${
                                isMain
                                  ? 'bg-[#00FFCC] text-slate-900'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              {isMain ? '★ Ảnh chính' : 'Đặt ảnh chính'}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleRemoveExistingImage(img.MaAnh)}
                              className="px-2 py-1 rounded-lg text-[10px] font-bold bg-red-50 text-red-600 hover:bg-red-100 cursor-pointer"
                            >
                              Xóa
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {newPreviews.map((url, idx) => {
                      const isMain = mainMaAnh === null && newMainIndex === idx;
                      return (
                        <div
                          key={`new-${idx}`}
                          className={`relative rounded-2xl overflow-hidden border-2 ${
                            isMain ? 'border-[#00FFCC] shadow-md' : 'border-slate-200'
                          }`}
                        >
                          <img
                            src={url}
                            alt="New Preview"
                            className="w-full h-32 object-cover"
                          />
                          <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-slate-900/80 text-[#00FFCC] text-[10px] font-bold">
                            Ảnh mới
                          </span>
                          <div className="p-2 bg-white flex items-center justify-between gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setMainMaAnh(null);
                                setNewMainIndex(idx);
                              }}
                              className={`px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer ${
                                isMain
                                  ? 'bg-[#00FFCC] text-slate-900'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              {isMain ? '★ Ảnh chính' : 'Đặt ảnh chính'}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleRemoveNewFile(idx)}
                              className="px-2 py-1 rounded-lg text-[10px] font-bold bg-red-50 text-red-600 hover:bg-red-100 cursor-pointer"
                            >
                              Xóa
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

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