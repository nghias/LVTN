// client/src/app/chuTro/theRaVao/page.tsx
"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import QuanLyHeader from "@/components/layout/QuanLyHeader";
import { useAlertModal } from "@/components/common/AlertModalProvider";
import { UserProfile } from "@/types/auth.type";
import {
  theRaVaoService,
  LichSuTheItem,
  KhuTroSimple,
} from "@/services/theRaVao.service";

const AUTO_REFRESH_MS = 4000;

function LichSuRaVaoContent({ user }: { user: UserProfile }) {
  const { showError } = useAlertModal();
  const showErrorRef = useRef(showError);
  showErrorRef.current = showError;

  const isChuTro = user.Quyen === "ChuTro";

  const [loading, setLoading] = useState<boolean>(true);
  const [khuTroList, setKhuTroList] = useState<KhuTroSimple[]>([]);
  const [lichSu, setLichSu] = useState<LichSuTheItem[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [newLogIds, setNewLogIds] = useState<number[]>([]);

  // Giá trị trên các ô lọc
  const [selectedMaKhu, setSelectedMaKhu] = useState<string>("");
  const [keyword, setKeyword] = useState<string>("");
  const [tuNgay, setTuNgay] = useState<string>("");
  const [denNgay, setDenNgay] = useState<string>("");

  // Bộ lọc đang áp dụng cho các lượt tải ngầm (tránh làm nhảy dữ liệu khi đang gõ)
  const appliedFiltersRef = useRef({
    maKhu: "",
    tuNgay: "",
    denNgay: "",
    keyword: "",
  });
  const isFetchingRef = useRef<boolean>(false);
  const initializedRef = useRef<boolean>(false);
  const knownLogIdsRef = useRef<Set<number>>(new Set());

  const formatDateVN = (dateStr?: string) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("vi-VN");
  };

  const fetchLichSu = useCallback(
    async (
      overrides?: {
        maKhu?: string;
        tuNgay?: string;
        denNgay?: string;
        keyword?: string;
      },
      silent = false
    ) => {
      if (silent && isFetchingRef.current) return;

      const current = appliedFiltersRef.current;
      const params = {
        maKhu: isChuTro ? (overrides?.maKhu ?? current.maKhu) : undefined,
        tuNgay: overrides?.tuNgay ?? current.tuNgay,
        denNgay: overrides?.denNgay ?? current.denNgay,
        keyword: overrides?.keyword ?? current.keyword,
      };

      try {
        isFetchingRef.current = true;
        if (!silent) setLoading(true);

        const res = await theRaVaoService.getLichSuRaVao(params, { silent });
        if (res.success) {
          const nextLogs: LichSuTheItem[] = res.data || [];

          if (initializedRef.current && silent) {
            const addedIds = nextLogs
              .map((l) => l.MaLS)
              .filter((id) => !knownLogIdsRef.current.has(id));
            if (addedIds.length > 0) {
              setNewLogIds(addedIds);
              setTimeout(() => setNewLogIds([]), 4000);
            }
          }

          knownLogIdsRef.current = new Set(nextLogs.map((l) => l.MaLS));
          initializedRef.current = true;

          setLichSu(nextLogs);
          if (res.khuTroList) setKhuTroList(res.khuTroList);
          setLastUpdated(
            new Date().toLocaleTimeString("vi-VN", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })
          );
        }
      } catch (err: unknown) {
        if (!silent) {
          showErrorRef.current(
            err instanceof Error
              ? err.message
              : "Không thể tải lịch sử ra vào."
          );
        }
      } finally {
        isFetchingRef.current = false;
        if (!silent) setLoading(false);
      }
    },
    [isChuTro]
  );

  // Tải khi đổi cơ sở
  useEffect(() => {
    appliedFiltersRef.current = {
      ...appliedFiltersRef.current,
      maKhu: selectedMaKhu,
    };
    initializedRef.current = false;
    fetchLichSu({ maKhu: selectedMaKhu }, false);
  }, [selectedMaKhu, fetchLichSu]);

  // Tự động cập nhật ngầm mỗi 4 giây mà không load lại trang
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchLichSu(undefined, true);
      }
    }, AUTO_REFRESH_MS);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchLichSu(undefined, true);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [fetchLichSu]);

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    appliedFiltersRef.current = {
      maKhu: selectedMaKhu,
      tuNgay,
      denNgay,
      keyword,
    };
    initializedRef.current = false;
    fetchLichSu(appliedFiltersRef.current, false);
  };

  const handleClearFilter = () => {
    setTuNgay("");
    setDenNgay("");
    setKeyword("");
    appliedFiltersRef.current = {
      maKhu: selectedMaKhu,
      tuNgay: "",
      denNgay: "",
      keyword: "",
    };
    initializedRef.current = false;
    fetchLichSu(appliedFiltersRef.current, false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900">
      <QuanLyHeader user={user} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-5">
        {/* Header + Trạng thái cập nhật trực tiếp + Nút Thẻ ra vào */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {isChuTro
                ? "Quản Lý Ra Vào (Toàn Hệ Thống)"
                : "Quản Lý Ra Vào (Cơ Sở Phụ Trách)"}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Bảng ghi nhận lịch sử quẹt thẻ mở cổng tự động đồng bộ trực tiếp.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-bold text-emerald-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Trực tiếp{lastUpdated ? ` • ${lastUpdated}` : ""}</span>
            </div>

            <Link
              href="/chuTro/theRaVao/danhSach"
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 border border-teal-400 text-xs font-bold shadow-xs transition no-underline"
            >
              Thẻ ra vào
            </Link>
          </div>
        </div>

        {/* Thanh chọn Cơ sở */}
        {(isChuTro || khuTroList.length > 1) && khuTroList.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {isChuTro && (
              <button
                type="button"
                onClick={() => setSelectedMaKhu("")}
                className={`px-4 py-2 rounded-full text-xs font-bold transition cursor-pointer ${
                  selectedMaKhu === ""
                    ? "bg-[#00FFCC] text-slate-900 border border-teal-400"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Tất cả cơ sở ({khuTroList.length})
              </button>
            )}
            {khuTroList.map((khu) => (
              <button
                key={khu.MaKhu}
                type="button"
                onClick={() => setSelectedMaKhu(String(khu.MaKhu))}
                className={`px-4 py-2 rounded-full text-xs font-bold transition cursor-pointer ${
                  selectedMaKhu === String(khu.MaKhu)
                    ? "bg-[#00FFCC] text-slate-900 border border-teal-400"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {khu.TenKhu}
              </button>
            ))}
          </div>
        )}

        {/* Bộ lọc lịch sử */}
        <form
          onSubmit={handleFilterSubmit}
          className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col lg:flex-row lg:items-end gap-3 w-full"
        >
          <div className="flex-1">
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Tìm kiếm
            </label>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Tên người mở cửa, tên phòng, UID thẻ..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Từ ngày
            </label>
            <input
              type="date"
              value={tuNgay}
              onChange={(e) => setTuNgay(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Đến ngày
            </label>
            <input
              type="date"
              value={denNgay}
              onChange={(e) => setDenNgay(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-bold"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 border border-teal-400 text-xs font-bold cursor-pointer whitespace-nowrap"
            >
              Lọc lịch sử
            </button>
            {(tuNgay || denNgay || keyword) && (
              <button
                type="button"
                onClick={handleClearFilter}
                className="px-4 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-700 text-xs font-bold cursor-pointer whitespace-nowrap"
              >
                Xóa lọc
              </button>
            )}
          </div>
        </form>

        {/* Bảng ghi nhận lịch sử ra vào */}
        {loading ? (
          <div className="py-16 text-center text-slate-500 text-sm">
            Đang tải lịch sử ra vào...
          </div>
        ) : lichSu.length === 0 ? (
          <div className="p-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-sm text-slate-600">
            Chưa có lượt quẹt thẻ mở cửa nào được ghi nhận.
          </div>
        ) : (
          <>
            {/* Mobile Cards */}
            <div className="grid grid-cols-1 gap-3 md:hidden">
              {lichSu.map((ls) => {
                const isNew = newLogIds.includes(ls.MaLS);
                return (
                  <div
                    key={ls.MaLS}
                    className={`p-4 rounded-2xl border flex items-center justify-between gap-3 transition-colors duration-700 ${
                      isNew
                        ? "border-emerald-400 bg-emerald-50"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <div>
                      <p className="font-bold text-slate-900 text-sm">
                        {ls.HoTen}
                      </p>
                      <p className="text-xs text-slate-500">
                        {ls.TenPhong || "—"} • {ls.TenKhu || "—"}
                      </p>
                      <p className="text-[11px] font-mono text-slate-400 mt-1">
                        UID: {ls.MaUID || "—"}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-mono font-bold text-teal-700 text-sm">
                        {ls.GioQuetThe}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatDateVN(ls.NgayQuetThe)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase">
                    <th className="py-3.5 px-4 font-bold">Ngày Quẹt</th>
                    <th className="py-3.5 px-4 font-bold">Giờ Mở Cửa</th>
                    <th className="py-3.5 px-4 font-bold">Người Mở Cửa</th>
                    <th className="py-3.5 px-4 font-bold">Phòng</th>
                    <th className="py-3.5 px-4 font-bold">Cơ Sở</th>
                    <th className="py-3.5 px-4 font-bold">UID Thẻ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {lichSu.map((ls) => {
                    const isNew = newLogIds.includes(ls.MaLS);
                    return (
                      <tr
                        key={ls.MaLS}
                        className={`transition-colors duration-700 ${
                          isNew ? "bg-emerald-50" : "hover:bg-slate-50/80"
                        }`}
                      >
                        <td className="py-3.5 px-4 font-semibold">
                          {formatDateVN(ls.NgayQuetThe)}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-teal-700">
                          {ls.GioQuetThe}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          {ls.HoTen}
                        </td>
                        <td className="py-3.5 px-4">{ls.TenPhong || "—"}</td>
                        <td className="py-3.5 px-4 text-slate-600">
                          {ls.TenKhu || "—"}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-700">
                          {ls.MaUID || "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default function QuanLyRaVaoPage() {
  return (
    <ProtectedRoute allowedRoles={["ChuTro", "QuanLy"]}>
      {(user) => <LichSuRaVaoContent user={user} />}
    </ProtectedRoute>
  );
}