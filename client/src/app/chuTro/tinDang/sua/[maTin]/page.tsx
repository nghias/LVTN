"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, usePathname, useParams } from "next/navigation";
import ProtectedRoute from "../../../../../components/common/ProtectedRoute";
import QuanLyHeader from "../../../../../components/layout/QuanLyHeader";
import { useAlertModal } from "../../../../../components/common/AlertModalProvider";
import type {
  TrangThaiTin,
  TinDangItem,
  PhongSelectOption,
} from "../../page";

interface TinDangFormData {
  MaPhong: string;
  MaND: number;
  TieuDe: string;
  MoTa: string;
  NgayHetHan: string;
  TrangThai: TrangThaiTin;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function SuaTinDangPage() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const maTin = Number(params?.maTin);

  const { showSuccess, showError } = useAlertModal();

  // Đường dẫn quay về trang danh sách tinDang
  const baseTinDangPath = useMemo(() => {
    return pathname.replace(/\/sua\/[^/]+\/?$/, "");
  }, [pathname]);

  const [phongOptions, setPhongOptions] = useState<PhongSelectOption[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [notFound, setNotFound] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [formData, setFormData] = useState<TinDangFormData>({
    MaPhong: "",
    MaND: 1,
    TieuDe: "",
    MoTa: "",
    NgayHetHan: "",
    TrangThai: "DangHienThi",
  });

  const getStoredMaND = useCallback((): number => {
    if (typeof window === "undefined") return 1;

    for (const storage of [window.localStorage, window.sessionStorage]) {
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (!key) continue;

        try {
          const parsed = JSON.parse(storage.getItem(key) || "");
          if (parsed && typeof parsed === "object") {
            if (parsed.MaND) return Number(parsed.MaND);
            if (parsed.user?.MaND) return Number(parsed.user.MaND);
          }
        } catch {
          // Bỏ qua
        }
      }
    }
    return 1;
  }, []);

  useEffect(() => {
    const fetchTinDetail = async () => {
      try {
        setLoading(true);
        const maND = getStoredMaND();

        const response = await fetch(`${API_BASE_URL}/tin-dang?MaND=${maND}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        });

        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.message || "Không thể tải dữ liệu tin đăng.");
        }

        const list: TinDangItem[] = result.data.tinDangList || [];
        const rooms: PhongSelectOption[] = result.data.phongList || [];
        setPhongOptions(rooms);

        const targetTin = list.find((item) => Number(item.MaTin) === maTin);
        if (!targetTin) {
          setNotFound(true);
          return;
        }

        setFormData({
          MaPhong: String(targetTin.MaPhong),
          MaND: targetTin.MaND || maND,
          TieuDe: targetTin.TieuDe,
          MoTa: targetTin.MoTa || "",
          NgayHetHan: targetTin.NgayHetHan
            ? new Date(targetTin.NgayHetHan).toISOString().split("T")[0]
            : "",
          TrangThai: targetTin.TrangThai,
        });
      } catch (err: unknown) {
        if (err instanceof Error) {
          showError(err.message);
        } else {
          showError("Không thể kết nối đến máy chủ.");
        }
      } finally {
        setLoading(false);
      }
    };

    if (maTin) {
      fetchTinDetail();
    }
  }, [maTin, getStoredMaND, showError]);

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.MaPhong) {
      setFormError("Vui lòng chọn phòng trọ cần đăng tin.");
      return;
    }
    if (!formData.TieuDe.trim()) {
      setFormError("Vui lòng nhập tiêu đề tin đăng.");
      return;
    }
    if (formData.TieuDe.trim().length > 200) {
      setFormError("Tiêu đề không được vượt quá 200 ký tự.");
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await fetch(`${API_BASE_URL}/tin-dang/${maTin}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
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
        throw new Error(result.message || "Không thể cập nhật bài đăng.");
      }

      showSuccess(`Đã cập nhật tin đăng #${maTin} thành công!`);
      router.push(baseTinDangPath);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setFormError(err.message);
      } else {
        setFormError("Đã xảy ra lỗi khi gửi dữ liệu lên máy chủ.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={["ChuTro", "QuanLy"]}>
      {(user) => (
        <div className="flex-1 flex flex-col bg-white text-slate-900">
          <QuanLyHeader user={user} />

          <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
            {/* Thanh tiêu đề & Nút điều hướng */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                  Chỉnh Sửa Tin Đăng #{maTin}
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Cập nhật nội dung tiêu đề, mô tả, ngày hết hạn hoặc trạng thái
                  hiển thị
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    router.push(`${baseTinDangPath}/chiTiet/${maTin}`)
                  }
                  className="px-4 py-2.5 rounded-full border border-slate-300 bg-white hover:bg-slate-100 text-xs font-bold text-slate-700 transition cursor-pointer"
                >
                  Xem chi tiết
                </button>
                <button
                  type="button"
                  onClick={() => router.push(baseTinDangPath)}
                  className="px-4 py-2.5 rounded-full border border-slate-300 bg-white hover:bg-slate-100 text-xs font-bold text-slate-700 transition cursor-pointer"
                >
                  ← Quay lại danh sách
                </button>
              </div>
            </div>

            {loading ? (
              <div className="py-16 text-center text-sm text-slate-500">
                Đang tải dữ liệu tin đăng #{maTin}...
              </div>
            ) : notFound ? (
              <div className="py-16 text-center bg-slate-50 rounded-2xl border border-slate-200 p-6 space-y-3">
                <p className="text-base font-bold text-slate-700">
                  Không tìm thấy tin đăng #{maTin}!
                </p>
                <button
                  type="button"
                  onClick={() => router.push(baseTinDangPath)}
                  className="px-5 py-2.5 rounded-full bg-[#00FFCC] text-slate-900 text-xs font-bold cursor-pointer"
                >
                  Về danh sách tin đăng
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                  <h2 className="text-sm font-bold text-slate-900">
                    Biểu mẫu cập nhật tin đăng #{maTin}
                  </h2>
                </div>

                <form onSubmit={handleSubmitForm} className="p-6 space-y-5">
                  {formError && (
                    <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs font-bold text-red-600">
                      {formError}
                    </div>
                  )}

                  {/* Chọn Phòng trọ (`MaPhong`) */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Chọn phòng cần đăng tin{" "}
                      <span className="text-red-500">*</span>
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
                          {Number(p.Gia).toLocaleString("vi-VN")}đ -{" "}
                          {p.DienTich}m²)
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
                          setFormData({
                            ...formData,
                            NgayHetHan: e.target.value,
                          })
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
                        <option value="DangHienThi">
                          Đang hiển thị công khai
                        </option>
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
                      rows={5}
                      disabled={isSubmitting}
                      value={formData.MoTa}
                      onChange={(e) =>
                        setFormData({ ...formData, MoTa: e.target.value })
                      }
                      placeholder="Nhập mô tả về giờ giấc, chỗ để xe, nội thất đi kèm..."
                      className="w-full p-3.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
                    />
                  </div>

                  {/* Cụm nút Lưu / Hủy */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => router.push(baseTinDangPath)}
                      className="px-5 py-2.5 rounded-full border border-slate-300 bg-white hover:bg-slate-100 text-xs font-bold text-slate-700 transition cursor-pointer"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-6 py-2.5 rounded-full bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 border border-teal-300 text-xs font-bold shadow-xs transition cursor-pointer"
                    >
                      {isSubmitting ? "Đang lưu..." : "Lưu Thay Đổi"}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </main>
        </div>
      )}
    </ProtectedRoute>
  );
}