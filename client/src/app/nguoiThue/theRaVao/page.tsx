// client/src/app/nguoiThue/theRaVao/page.tsx
"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import NguoiThueHeader from "@/components/layout/NguoiThueHeader";
import { useAlertModal } from "@/components/common/AlertModalProvider";
import { UserProfile } from "@/types/auth.type";
import {
  theRaVaoService,
  TheRaVaoItem,
  LichSuTheItem,
} from "@/services/theRaVao.service";

interface ThongTinThue {
  TenPhong: string;
  TenKhu: string;
}

const AUTO_REFRESH_MS = 4000;

function NguoiThueTheRaVaoContent({ user }: { user: UserProfile }) {
  const { showSuccess, showError } = useAlertModal();
  const showErrorRef = useRef(showError);
  showErrorRef.current = showError;

  const [loading, setLoading] = useState<boolean>(true);
  const [dsThe, setDsThe] = useState<TheRaVaoItem[]>([]);
  const [lichSu, setLichSu] = useState<LichSuTheItem[]>([]);
  const [thongTinThue, setThongTinThue] = useState<ThongTinThue | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [newLogIds, setNewLogIds] = useState<number[]>([]);

  // Form yêu cầu cấp lại thẻ
  const [lyDo, setLyDo] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Bộ lọc lịch sử cá nhân
  const [tuNgay, setTuNgay] = useState<string>("");
  const [denNgay, setDenNgay] = useState<string>("");

  const appliedFiltersRef = useRef<{ tuNgay: string; denNgay: string }>({
    tuNgay: "",
    denNgay: "",
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

  const loadData = useCallback(
    async (
      overrides?: { tuNgay?: string; denNgay?: string },
      silent = false
    ) => {
      if (silent && isFetchingRef.current) return;

      const filterParams = {
        tuNgay: overrides?.tuNgay ?? appliedFiltersRef.current.tuNgay,
        denNgay: overrides?.denNgay ?? appliedFiltersRef.current.denNgay,
      };

      try {
        isFetchingRef.current = true;
        if (!silent) setLoading(true);

        const res = await theRaVaoService.getTheCuaToi(filterParams, { silent });
        if (res.success && res.data) {
          const nextLogs: LichSuTheItem[] = res.data.lichSu || [];

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

          setDsThe(res.data.dsThe || []);
          setLichSu(nextLogs);
          setThongTinThue(res.data.thongTinThue || null);
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
              : "Không thể tải thông tin thẻ ra vào."
          );
        }
      } finally {
        isFetchingRef.current = false;
        if (!silent) setLoading(false);
      }
    },
    []
  );

  // Tải lần đầu + tự động cập nhật ngầm mỗi 4 giây (không load lại trang)
  useEffect(() => {
    loadData(undefined, false);

    const timer = setInterval(() => {
      if (document.visibilityState === "visible") {
        loadData(undefined, true);
      }
    }, AUTO_REFRESH_MS);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        loadData(undefined, true);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [loadData]);

  const handleYeuCauCapLai = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lyDo.trim()) return;
    try {
      setSubmitting(true);
      const res = await theRaVaoService.yeuCauCapLai({ lyDo: lyDo.trim() });
      showSuccess(
        res.message || "Đã gửi yêu cầu cấp lại thẻ và tạm khóa thẻ cũ."
      );
      setLyDo("");
      await loadData(undefined, true);
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : "Gửi yêu cầu thất bại.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleApplyFilter = (e: React.FormEvent) => {
    e.preventDefault();
    appliedFiltersRef.current = { tuNgay, denNgay };
    initializedRef.current = false;
    loadData({ tuNgay, denNgay }, false);
  };

  const handleResetFilter = () => {
    setTuNgay("");
    setDenNgay("");
    appliedFiltersRef.current = { tuNgay: "", denNgay: "" };
    initializedRef.current = false;
    loadData({ tuNgay: "", denNgay: "" }, false);
  };

  const theHienTai = dsThe[0] || null;

  const renderCardStatusBadge = (status: string) => {
    switch (status) {
      case "HoatDong":
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-[#00FFCC] text-slate-900 text-[11px] font-bold">
            Đang hoạt động
          </span>
        );
      case "ChoCapLai":
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-amber-300 text-slate-900 text-[11px] font-bold">
            Chờ cấp lại (Tạm khóa)
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-red-500 text-white text-[11px] font-bold">
            Đã khóa
          </span>
        );
    }
  };

  const canRequestReissue =
    !!thongTinThue && !!theHienTai && theHienTai.TrangThai !== "ChoCapLai";

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900">
      <NguoiThueHeader user={user} />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Tiêu đề trang */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-200">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Thẻ Ra Vào & Lịch Sử Mở Cổng
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              {thongTinThue
                ? `Phòng ${thongTinThue.TenPhong} • ${thongTinThue.TenKhu}`
                : "Theo dõi thẻ từ RFID cá nhân, gửi yêu cầu cấp lại thẻ và xem lịch sử ra vào của bạn."}
            </p>
          </div>
        </div>

        {/* 1. Thông tin thẻ hiện tại & Yêu cầu cấp lại */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Thẻ của tôi */}
          <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-3">
            <h2 className="text-base font-bold text-slate-900">
              Thẻ từ RFID của bạn
            </h2>

            {loading ? (
              <p className="text-xs text-slate-500">Đang tải thông tin thẻ...</p>
            ) : theHienTai ? (
              <>
                <div
                  className={`p-4 rounded-xl space-y-2 ${
                    theHienTai.TrangThai === "HoatDong"
                      ? "bg-slate-900 text-white"
                      : "bg-slate-800/90 text-slate-100"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] uppercase tracking-wider text-slate-400">
                      Thẻ ra vào cá nhân
                    </span>
                    {renderCardStatusBadge(theHienTai.TrangThai)}
                  </div>
                  <p className="text-lg font-mono font-bold tracking-wider text-[#00FFCC]">
                    {theHienTai.MaUID || "Chưa gán UID"}
                  </p>
                  <div className="text-xs text-slate-300 flex justify-between pt-2 border-t border-slate-700">
                    <span>{user.HoTen}</span>
                    <span>Cấp ngày: {formatDateVN(theHienTai.NgayTao)}</span>
                  </div>
                </div>

                {theHienTai.TrangThai === "ChoCapLai" && (
                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                    <p className="font-bold">
                      Yêu cầu cấp lại thẻ đang chờ Quản lý cơ sở xử lý.
                    </p>
                    <p className="mt-1">
                      Thẻ cũ đã tạm khóa để đảm bảo an ninh và sẽ hoạt động lại ngay sau khi Quản lý nạp mã thẻ mới.
                    </p>
                    {theHienTai.GhiChu && (
                      <p className="mt-1 text-amber-800">
                        Lý do: {theHienTai.GhiChu}
                      </p>
                    )}
                  </div>
                )}

                {["BiKhoa", "ThuHoi"].includes(theHienTai.TrangThai) && (
                  <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800">
                    <p className="font-bold">
                      Thẻ hiện đang bị khóa và không thể mở cổng.
                    </p>
                    {theHienTai.GhiChu && (
                      <p className="mt-1">Ghi chú: {theHienTai.GhiChu}</p>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="p-4 rounded-xl bg-slate-50 border border-dashed border-slate-300 text-xs text-slate-600 leading-relaxed">
                Bạn chưa được cấp thẻ từ ra vào. Vui lòng liên hệ Quản lý cơ sở để được cấp thẻ mới.
              </div>
            )}
          </div>

          {/* Form yêu cầu cấp lại */}
          <form
            onSubmit={handleYeuCauCapLai}
            className="p-5 rounded-2xl border border-slate-200 bg-white space-y-3"
          >
            <h2 className="text-base font-bold text-slate-900">
              Yêu cầu cấp lại thẻ
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Khi báo mất, quên hoặc hỏng thẻ, hệ thống sẽ <b>tự động khóa tạm thẻ hiện tại</b> và gửi yêu cầu tới Quản lý cơ sở để nạp lại mã mới.
            </p>
            <textarea
              rows={3}
              value={lyDo}
              onChange={(e) => setLyDo(e.target.value)}
              disabled={!canRequestReissue || submitting}
              placeholder="Nhập lý do (VD: Làm rơi mất thẻ, quên thẻ, thẻ quẹt không nhận...)"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#00FFCC] disabled:bg-slate-50 disabled:text-slate-400"
              required
            />
            <button
              type="submit"
              disabled={!canRequestReissue || submitting}
              className="w-full py-2.5 rounded-xl bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 border border-teal-400 text-xs font-bold disabled:bg-slate-200 disabled:text-slate-500 disabled:border-slate-200 cursor-pointer"
            >
              {submitting
                ? "Đang gửi yêu cầu..."
                : !theHienTai
                ? "Chưa có thẻ để yêu cầu cấp lại"
                : theHienTai.TrangThai === "ChoCapLai"
                ? "Đã gửi yêu cầu — Đang chờ Quản lý cấp lại"
                : "Gửi yêu cầu cấp lại thẻ"}
            </button>
          </form>
        </div>

        {/* 2. Lịch sử ra vào cá nhân (tự động cập nhật không load lại trang) */}
        <section className="p-5 rounded-2xl border border-slate-200 bg-white space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Lịch sử ra vào của bạn
              </h2>
              <p className="text-xs text-slate-500">
                Ghi nhận tự động mỗi khi bạn quẹt thẻ mở cổng khu trọ.
              </p>
            </div>

            <form
              onSubmit={handleApplyFilter}
              className="flex flex-wrap items-end gap-2"
            >
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Từ ngày
                </label>
                <input
                  type="date"
                  value={tuNgay}
                  onChange={(e) => setTuNgay(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Đến ngày
                </label>
                <input
                  type="date"
                  value={denNgay}
                  onChange={(e) => setDenNgay(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 border border-teal-400 text-xs font-bold cursor-pointer"
              >
                Lọc
              </button>
              {(tuNgay || denNgay) && (
                <button
                  type="button"
                  onClick={handleResetFilter}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer"
                >
                  Xem hết
                </button>
              )}
            </form>
          </div>

          {loading ? (
            <p className="py-8 text-center text-xs text-slate-500">
              Đang tải lịch sử...
            </p>
          ) : lichSu.length === 0 ? (
            <div className="p-8 text-center rounded-xl bg-slate-50 border border-dashed border-slate-300 text-xs text-slate-500">
              Chưa có lượt quẹt thẻ mở cổng nào trong khoảng thời gian này.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase">
                    <th className="py-3 px-4 font-bold">Ngày quẹt</th>
                    <th className="py-3 px-4 font-bold">Giờ mở cổng</th>
                    <th className="py-3 px-4 font-bold">UID thẻ</th>
                    <th className="py-3 px-4 font-bold">Cơ sở</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {lichSu.map((ls) => {
                    const isNew = newLogIds.includes(ls.MaLS);
                    return (
                      <tr
                        key={ls.MaLS}
                        className={`transition-colors duration-700 ${
                          isNew ? "bg-emerald-50" : "hover:bg-slate-50/70"
                        }`}
                      >
                        <td className="py-3 px-4 font-semibold">
                          {formatDateVN(ls.NgayQuetThe)}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-teal-700">
                          {ls.GioQuetThe}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-700">
                          {ls.MaUID || "—"}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {ls.TenKhu || "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default function NguoiThueTheRaVaoPage() {
  return (
    <ProtectedRoute allowedRoles={["KhachThue"]}>
      {(user) => <NguoiThueTheRaVaoContent user={user} />}
    </ProtectedRoute>
  );
}