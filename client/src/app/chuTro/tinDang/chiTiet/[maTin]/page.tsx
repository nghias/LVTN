"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, usePathname, useParams } from "next/navigation";
import ProtectedRoute from "../../../../../components/common/ProtectedRoute";
import QuanLyHeader from "../../../../../components/layout/QuanLyHeader";
import { useAlertModal } from "../../../../../components/common/AlertModalProvider";
import type { TrangThaiTin, TinDangItem } from "../../page";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function ChiTietTinDangPage() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const maTin = Number(params?.maTin);

  const { showSuccess, showError, showConfirm } = useAlertModal();

  // Đường dẫn quay về trang danh sách tinDang
  const baseTinDangPath = useMemo(() => {
    return pathname.replace(/\/chiTiet\/[^/]+\/?$/, "");
  }, [pathname]);

  const [tinDang, setTinDang] = useState<TinDangItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [updatingStatus, setUpdatingStatus] = useState<boolean>(false);

  const getStoredMaND = useCallback((): number | null => {
    if (typeof window === "undefined") return null;

    for (const storage of [window.localStorage, window.sessionStorage]) {
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (!key) continue;

        try {
          const raw = storage.getItem(key);
          if (!raw) continue;

          const parsed = JSON.parse(raw);

          if (!parsed || typeof parsed !== "object") continue;

          const candidates = [parsed.MaND, parsed.user?.MaND];

          for (const value of candidates) {
            const id = Number(value);

            if (
              value !== null &&
              value !== undefined &&
              value !== "" &&
              Number.isSafeInteger(id) &&
              id > 0
            ) {
              return id;
            }
          }
        } catch {
          // Bỏ qua dữ liệu không phải JSON
        }
      }
    }

    return null;
  }, []);

  const fetchDetail = useCallback(async () => {
    try {
      setLoading(true);
      const maND = getStoredMaND();

      const response = await fetch(`${API_BASE_URL}/tin-dang?MaND=${maND}`, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Không thể tải thông tin bài đăng.");
      }

      const list: TinDangItem[] = result.data.tinDangList || [];
      const found = list.find((item) => Number(item.MaTin) === maTin) || null;
      setTinDang(found);
    } catch (err: unknown) {
      if (err instanceof Error) {
        showError(err.message);
      } else {
        showError("Không thể kết nối đến máy chủ.");
      }
    } finally {
      setLoading(false);
    }
  }, [maTin, getStoredMaND, showError]);

  useEffect(() => {
    if (maTin) {
      fetchDetail();
    }
  }, [maTin, fetchDetail]);

  // Đổi nhanh trạng thái tin ngay trên trang Chi tiết
  const handleQuickStatusChange = async (newStatus: TrangThaiTin) => {
    if (!tinDang || tinDang.TrangThai === newStatus) return;

    try {
      setUpdatingStatus(true);
      const response = await fetch(
        `${API_BASE_URL}/tin-dang/${tinDang.MaTin}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            MaPhong: tinDang.MaPhong,
            MaND: tinDang.MaND,
            TieuDe: tinDang.TieuDe,
            MoTa: tinDang.MoTa,
            NgayHetHan: tinDang.NgayHetHan
              ? new Date(tinDang.NgayHetHan).toISOString().split("T")[0]
              : null,
            TrangThai: newStatus,
          }),
        },
      );

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Không thể đổi trạng thái bài đăng.");
      }

      setTinDang({ ...tinDang, TrangThai: newStatus });
      showSuccess("Đã cập nhật trạng thái hiển thị của tin đăng!");
    } catch (err: unknown) {
      if (err instanceof Error) {
        showError(err.message);
      }
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Xóa tin đăng
  const handleDeleteTin = () => {
    if (!tinDang) return;

    showConfirm(
      `Bạn có chắc chắn muốn xóa bài đăng "${tinDang.TieuDe}" của phòng ${tinDang.TenPhong} (${tinDang.TenKhu}) không? Thao tác này không thể hoàn tác.`,
      `Xác nhận xóa Tin đăng #${tinDang.MaTin}`,
      async () => {
        try {
          const response = await fetch(
            `${API_BASE_URL}/tin-dang/${tinDang.MaTin}`,
            {
              method: "DELETE",
            },
          );

          const result = await response.json();
          if (!response.ok || !result.success) {
            throw new Error(result.message || "Xóa tin đăng thất bại.");
          }

          showSuccess(`Đã xóa tin đăng #${tinDang.MaTin} thành công!`);
          router.push(baseTinDangPath);
        } catch (err: unknown) {
          if (err instanceof Error) {
            showError(err.message, "Không thể xóa tin đăng", 3.5);
          }
        }
      },
    );
  };

  const renderStatusBadge = (status: TrangThaiTin) => {
    if (status === "DangHienThi") {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
          Đang hiển thị công khai
        </span>
      );
    }
    if (status === "DaAn") {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
          Đã ẩn tạm thời
        </span>
      );
    }
    return (
      <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-300">
        Đã hết hạn
      </span>
    );
  };

  return (
    <ProtectedRoute allowedRoles={["ChuTro", "QuanLy"]}>
      {(user) => (
        <div className="flex-1 flex flex-col bg-white text-slate-900">
          <QuanLyHeader user={user} />

          <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
            {/* Thanh tiêu đề & Cụm nút thao tác */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                  Chi Tiết Tin Đăng #{maTin}
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Xem đầy đủ nội dung bài viết và thông tin phòng trọ đang liên
                  kết
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => router.push(baseTinDangPath)}
                  className="px-4 py-2.5 rounded-full border border-slate-300 bg-white hover:bg-slate-100 text-xs font-bold text-slate-700 transition cursor-pointer"
                >
                  ← Quay lại danh sách
                </button>

                {tinDang && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        router.push(`${baseTinDangPath}/sua/${tinDang.MaTin}`)
                      }
                      className="px-5 py-2.5 rounded-full bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 border border-teal-300 text-xs font-bold shadow-xs transition cursor-pointer"
                    >
                      Chỉnh sửa tin
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteTin}
                      className="px-4 py-2.5 rounded-full border border-red-200 bg-white hover:bg-red-50 text-red-600 text-xs font-bold transition cursor-pointer"
                    >
                      Xóa tin
                    </button>
                  </>
                )}
              </div>
            </div>

            {loading ? (
              <div className="py-16 text-center text-sm text-slate-500">
                Đang tải chi tiết tin đăng #{maTin}...
              </div>
            ) : !tinDang ? (
              <div className="py-16 text-center bg-slate-50 rounded-2xl border border-slate-200 p-6 space-y-3">
                <p className="text-base font-bold text-slate-700">
                  Không tìm thấy dữ liệu của tin đăng #{maTin}!
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
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Cột trái (2/3): Nội dung bài đăng */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between">
                  <div>
                    <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-900 text-[#00FFCC]">
                          {tinDang.TenKhu}
                        </span>
                        <span className="text-xs font-bold text-slate-400">
                          Mã tin #{tinDang.MaTin}
                        </span>
                      </div>
                      {renderStatusBadge(tinDang.TrangThai)}
                    </div>

                    <div className="p-6 space-y-5">
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Tiêu đề bài đăng
                        </span>
                        <h2 className="text-lg sm:text-xl font-bold text-slate-900 mt-1">
                          {tinDang.TieuDe}
                        </h2>
                      </div>

                      <div className="space-y-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Mô tả chi tiết tiện ích &amp; quy định
                        </span>
                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-700 whitespace-pre-line leading-relaxed">
                          {tinDang.MoTa ||
                            "Chưa có mô tả chi tiết cho bài đăng này."}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                          <span className="text-xs font-semibold text-slate-500 block">
                            Ngày đăng tin
                          </span>
                          <span className="text-sm font-bold text-slate-900">
                            {new Date(tinDang.NgayDang).toLocaleDateString(
                              "vi-VN",
                            )}
                          </span>
                        </div>
                        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                          <span className="text-xs font-semibold text-slate-500 block">
                            Ngày hết hạn hiển thị
                          </span>
                          <span className="text-sm font-bold text-slate-900">
                            {tinDang.NgayHetHan
                              ? new Date(tinDang.NgayHetHan).toLocaleDateString(
                                  "vi-VN",
                                )
                              : "Không giới hạn"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Đổi nhanh trạng thái hiển thị */}
                  <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                    <span className="text-xs font-bold text-slate-600">
                      Đổi nhanh trạng thái:
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      {(
                        [
                          { value: "DangHienThi", label: "Hiển thị công khai" },
                          { value: "DaAn", label: "Tạm ẩn" },
                          { value: "HetHan", label: "Đánh dấu hết hạn" },
                        ] as { value: TrangThaiTin; label: string }[]
                      ).map((st) => (
                        <button
                          key={st.value}
                          type="button"
                          disabled={
                            updatingStatus || tinDang.TrangThai === st.value
                          }
                          onClick={() => handleQuickStatusChange(st.value)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                            tinDang.TrangThai === st.value
                              ? "bg-[#00FFCC] text-slate-900 border border-teal-400"
                              : "bg-white border border-slate-300 text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          {st.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Cột phải (1/3): Thông tin Phòng trọ & Khu trọ */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden h-fit">
                  <div className="px-5 py-4 bg-slate-50 border-b border-slate-200">
                    <h3 className="text-sm font-bold text-slate-900">
                      Thông tin phòng liên kết
                    </h3>
                  </div>

                  <div className="p-5 space-y-4">
                    <div>
                      <span className="text-xs text-slate-500 block">
                        Thuộc khu trọ
                      </span>
                      <p className="text-sm font-bold text-slate-900 mt-0.5">
                        {tinDang.TenKhu} (Mã khu #{tinDang.MaKhu})
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-100">
                      <span className="text-xs text-slate-500 block">
                        Tên phòng
                      </span>
                      <p className="text-base font-extrabold text-slate-900 mt-0.5">
                        Phòng {tinDang.TenPhong} (Mã #{tinDang.MaPhong})
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-100">
                      <span className="text-xs text-slate-500 block">
                        Giá thuê niêm yết
                      </span>
                      <p className="text-lg font-extrabold text-teal-700 mt-0.5">
                        {Number(tinDang.Gia).toLocaleString("vi-VN")} đ / tháng
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs text-slate-500">Diện tích</span>
                      <span className="text-sm font-bold text-slate-900">
                        {Number(tinDang.DienTich)} m²
                      </span>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs text-slate-500">
                        Trạng thái phòng
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-300">
                        {tinDang.TrangThaiPhong === "Trong"
                          ? "Phòng trống"
                          : tinDang.TrangThaiPhong === "DaThue"
                            ? "Đã cho thuê"
                            : tinDang.TrangThaiPhong}
                      </span>
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
