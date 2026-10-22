'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import QuanLyHeader from '@/components/layout/QuanLyHeader';
import { useAlertModal } from '@/components/common/AlertModalProvider';
import {
  PhongTroService,
  resolveRoomImageUrl,
} from '@/services/phongTro.service';
import { PhongItem } from '@/types/phongTro.type';

export default function ChiTietPhongTroPage() {
  const params = useParams();
  const router = useRouter();
  const maPhong = Number(params.maPhong);
  const { showError } = useAlertModal();

  const [room, setRoom] = useState<PhongItem | null>(null);
  const [activeImageUrl, setActiveImageUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!maPhong) return;
    PhongTroService.getPhongDetail(maPhong)
      .then((res) => {
        const data = res.data;
        if (data) {
          setRoom(data);
          const firstImg =
            data.DanhSachAnh && data.DanhSachAnh.length > 0
              ? data.DanhSachAnh[0].DuongDan
              : null;
          setActiveImageUrl(resolveRoomImageUrl(firstImg));
        }
      })
      .catch((err: unknown) => {
        if (err instanceof Error) showError(err.message);
        router.replace('/chuTro/phongTro');
      })
      .finally(() => setLoading(false));
  }, [maPhong, router, showError]);

  return (
    <ProtectedRoute allowedRoles={['ChuTro', 'QuanLy']}>
      {(user) => (
        <div className="flex-1 flex flex-col bg-white text-slate-900">
          <QuanLyHeader user={user} />

          <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6 sm:py-10">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <div>
                <Link
                  href="/chuTro/phongTro"
                  className="text-xs font-bold text-slate-600 hover:text-slate-900 no-underline"
                >
                  ← Quay lại danh sách Phòng trọ
                </Link>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
                  Chi Tiết Phòng {room?.TenPhong}
                </h1>
              </div>

              {room && (
                <Link
                  href={`/chuTro/phongTro/sua/${room.MaPhong}`}
                  className="px-5 py-2.5 rounded-full bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 text-xs font-bold no-underline shadow-xs"
                >
                  Chỉnh sửa phòng này
                </Link>
              )}
            </div>

            {loading || !room ? (
              <p className="text-sm text-slate-500">Đang tải thông tin chi tiết phòng...</p>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 bg-white border border-slate-200 rounded-3xl p-5 sm:p-8 shadow-sm">
                {/* Cột trái: Bộ sưu tập toàn bộ ảnh phòng (AnhPhong) */}
                <div className="lg:col-span-7 space-y-3">
                  <div className="w-full h-64 sm:h-80 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200">
                    <img
                      src={activeImageUrl}
                      alt={room.TenPhong}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Dải toàn bộ ảnh của phòng */}
                  {room.DanhSachAnh && room.DanhSachAnh.length > 0 && (
                    <div className="flex items-center gap-2.5 overflow-x-auto pb-2">
                      {room.DanhSachAnh.map((img) => {
                        const resolved = resolveRoomImageUrl(img.DuongDan);
                        const isSelected = activeImageUrl === resolved;
                        return (
                          <button
                            key={img.MaAnh}
                            type="button"
                            onClick={() => setActiveImageUrl(resolved)}
                            className={`relative w-20 h-16 rounded-xl overflow-hidden border-2 shrink-0 cursor-pointer transition ${
                              isSelected ? 'border-[#00FFCC] scale-105' : 'border-slate-200 opacity-75'
                            }`}
                          >
                            <img
                              src={resolved}
                              alt="Thumb"
                              className="w-full h-full object-cover"
                            />
                            {Number(img.AnhChinh) === 1 && (
                              <span className="absolute bottom-0 inset-x-0 bg-[#00FFCC] text-slate-900 text-[9px] font-bold text-center">
                                Ảnh chính
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Cột phải: Thông số phòng & Tiện ích */}
                <div className="lg:col-span-5 space-y-5">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-[#00FFCC] text-slate-900">
                      {room.TenKhu}
                    </span>
                    <p className="text-xs text-slate-600">{room.DiaChi}</p>
                    <p className="text-2xl font-extrabold text-teal-700 pt-1">
                      {Number(room.Gia).toLocaleString('vi-VN')} đ / tháng
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3.5 rounded-xl border border-slate-200">
                      <span className="text-slate-500 block">Diện tích</span>
                      <strong className="text-sm text-slate-900">
                        {Number(room.DienTich)} m²
                      </strong>
                    </div>
                    <div className="p-3.5 rounded-xl border border-slate-200">
                      <span className="text-slate-500 block">Trạng thái</span>
                      <strong className="text-sm text-slate-900">
                        {room.TrangThai === 'Trong'
                          ? 'Đang trống'
                          : room.TrangThai === 'DangThue'
                          ? 'Đang thuê'
                          : 'Đang bảo trì'}
                      </strong>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
                      Tiện ích đi kèm ({room.TienIch?.length || 0})
                    </h3>
                    <div className="space-y-2">
                      {room.TienIch && room.TienIch.length > 0 ? (
                        room.TienIch.map((ti) => (
                          <div
                            key={ti.MaTI}
                            className="p-3 rounded-xl bg-[#00FFCC]/15 border border-teal-200 flex items-start justify-between gap-2"
                          >
                            <div>
                              <p className="text-xs font-bold text-slate-900">{ti.TenTI}</p>
                              {ti.MoTa && (
                                <p className="text-[11px] text-slate-600 mt-0.5">{ti.MoTa}</p>
                              )}
                            </div>
                            <span className="text-teal-700 font-bold text-xs">✓</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-slate-400 italic">
                          Phòng này chưa được cấu hình tiện ích.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      )}
    </ProtectedRoute>
  );
}