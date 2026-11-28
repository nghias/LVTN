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
import { isWebNfcSupported, readNfcDoorTag } from "@/utils/webNfc.util";

interface ThongTinThue {
  TenPhong: string;
  TenKhu: string;
  DaCaiDatTheCuaNFC?: boolean;
}

const AUTO_REFRESH_MS = 4000;

function NguoiThueQuanLyRaVaoContent({ user }: { user: UserProfile }) {
  const { showSuccess, showError } = useAlertModal();
  const showErrorRef = useRef(showError);
  showErrorRef.current = showError;

  const [loading, setLoading] = useState<boolean>(true);
  const [dsThe, setDsThe] = useState<TheRaVaoItem[]>([]);
  const [lichSu, setLichSu] = useState<LichSuTheItem[]>([]);
  const [thongTinThue, setThongTinThue] = useState<ThongTinThue | null>(null);
  const [newLogIds, setNewLogIds] = useState<number[]>([]);

  // Trạng thái mở cửa bằng NFC điện thoại
  const [nfcSupported, setNfcSupported] = useState<boolean>(true);
  const [nfcState, setNfcState] = useState<"idle" | "scanning" | "verifying">("idle");
  const nfcAbortRef = useRef<AbortController | null>(null);

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

  useEffect(() => {
    setNfcSupported(isWebNfcSupported());
    return () => {
      nfcAbortRef.current?.abort();
    };
  }, []);

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
        }
      } catch (err: unknown) {
        if (!silent) {
          showErrorRef.current(
            err instanceof Error
              ? err.message
              : "Không thể tải thông tin quản lý ra vào."
          );
        }
      } finally {
        isFetchingRef.current = false;
        if (!silent) setLoading(false);
      }
    },
    []
  );

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

  const handleQuetNfcMoCong = async () => {
    if (!thongTinThue) {
      showError("Bạn cần có hợp đồng thuê còn hiệu lực để sử dụng mở cổng NFC.");
      return;
    }

    const abortController = new AbortController();
    nfcAbortRef.current = abortController;

    try {
      setNfcState("scanning");
      const { code } = await readNfcDoorTag(25000, abortController.signal);

      setNfcState("verifying");
      const res = await theRaVaoService.moCuaBangNFC(code);
      showSuccess(res.message || "Xác thực thành công! Cổng đang mở...");
      await loadData(undefined, true);
    } catch (err: unknown) {
      if (err instanceof Error && err.message === "ABORTED_BY_USER") {
        return;
      }
      showError(
        err instanceof Error ? err.message : "Không thể mở cổng bằng NFC."
      );
    } finally {
      nfcAbortRef.current = null;
      setNfcState("idle");
    }
  };

  const handleHuyQuetNfc = () => {
    nfcAbortRef.current?.abort();
    setNfcState("idle");
  };

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
          <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-bold">
            Đang hoạt động
          </span>
        );
      case "ChoCapLai":
        return (
          <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-bold">
            Chờ cấp lại (Tạm khóa)
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full bg-red-100 text-red-700 border border-red-200 text-[11px] font-bold">
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
              Quản Lý Ra Vào
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              {thongTinThue
                ? `Phòng ${thongTinThue.TenPhong} • ${thongTinThue.TenKhu}`
                : "Mở cổng bằng NFC trên điện thoại, quản lý thẻ từ RFID và lịch sử ra vào của bạn."}
            </p>
          </div>
        </div>

        {/* 1. MỞ CỔNG NHANH BẰNG NFC TRÊN ĐIỆN THOẠI (Nền sáng đồng bộ #00FFCC) */}
        <section className="p-5 sm:p-6 rounded-2xl border-2 border-[#00FFCC] bg-gradient-to-br from-white via-teal-50/50 to-[#00FFCC]/15 text-slate-900 shadow-2xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-[#00FFCC] text-slate-900 border border-teal-300 text-[11px] font-bold">
                  Mở cổng không cần thẻ
                </span>
                {thongTinThue?.DaCaiDatTheCuaNFC === false && (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-semibold">
                    Cơ sở chưa gắn thẻ NFC
                  </span>
                )}
              </div>

              <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                Chạm NFC để mở cổng ngay
              </h2>

              <p className="text-xs text-slate-600 leading-relaxed max-w-xl">
                {nfcState === "scanning"
                  ? "Đang bật cảm biến NFC... Hãy đưa mặt lưng điện thoại chạm sát vào thẻ NFC gắn trên cổng trong 1–2 giây."
                  : nfcState === "verifying"
                  ? "Đã đọc thẻ cổng! Đang xác thực quyền ra vào và gửi lệnh mở khóa..."
                  : "Quên mang thẻ từ? Bấm nút bên cạnh rồi áp mặt lưng điện thoại vào thẻ NFC gắn tại cổng khu trọ."}
              </p>

              {!nfcSupported && (
                <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 inline-block">
                  Trình duyệt hiện tại chưa hỗ trợ Web NFC. Hãy mở trang này bằng{" "}
                  <b>Google Chrome trên điện thoại Android</b> và bật NFC.
                </p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
              {nfcState === "scanning" ? (
                <>
                  <div className="px-5 py-3.5 rounded-xl bg-amber-100 border border-amber-300 text-amber-900 text-sm font-bold text-center animate-pulse flex items-center justify-center gap-2">
                    <span>Đưa điện thoại chạm thẻ...</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleHuyQuetNfc}
                    className="px-4 py-3.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold cursor-pointer transition"
                  >
                    Hủy
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  disabled={
                    nfcState === "verifying" ||
                    !thongTinThue ||
                    thongTinThue.DaCaiDatTheCuaNFC === false
                  }
                  onClick={handleQuetNfcMoCong}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-[#00FFCC] hover:bg-[#00e6b8] active:scale-[0.99] text-slate-900 border border-teal-400 text-sm font-extrabold shadow-xs transition flex items-center justify-center gap-2.5 cursor-pointer disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 disabled:cursor-not-allowed"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M6 8.32a7.43 7.43 0 0 1 0 7.36" />
                    <path d="M9.46 6.21a11.76 11.76 0 0 1 0 11.58" />
                    <path d="M12.91 4.1a15.91 15.91 0 0 1 .01 15.8" />
                    <path d="M16.37 2a20.16 20.16 0 0 1 0 20" />
                  </svg>
                  <span>
                    {nfcState === "verifying"
                      ? "Đang mở cổng..."
                      : "Quét NFC mở cổng"}
                  </span>
                </button>
              )}
            </div>
          </div>
        </section>

        {/* 2. Thông tin thẻ RFID hiện tại & Yêu cầu cấp lại */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Thẻ của tôi (Nền sáng, ẩn hoàn toàn mã UID/hash) */}
          <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-3 shadow-2xs">
            <h2 className="text-base font-bold text-slate-900">
              Thẻ từ RFID của bạn
            </h2>

            {loading ? (
              <p className="text-xs text-slate-500">Đang tải thông tin thẻ...</p>
            ) : theHienTai ? (
              <>
                <div
                  className={`p-4 rounded-xl border space-y-3 ${
                    theHienTai.TrangThai === "HoatDong"
                      ? "bg-teal-50/60 border-teal-200"
                      : "bg-slate-50 border-slate-200"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Thẻ ra vào cá nhân
                    </span>
                    {renderCardStatusBadge(theHienTai.TrangThai)}
                  </div>

                  <div>
                    <p className="text-base font-bold text-slate-900">
                      {user.HoTen}
                    </p>
                    <p className="text-xs text-teal-700 font-semibold mt-0.5">
                      Đã mã hóa bảo mật một chiều
                    </p>
                  </div>

                  <div className="text-xs text-slate-600 flex flex-wrap justify-between gap-2 pt-2.5 border-t border-slate-200/80">
                    <span>
                      Phòng:{" "}
                      <strong className="text-slate-900">
                        {thongTinThue?.TenPhong || "—"}
                      </strong>
                    </span>
                    <span>
                      Ngày cấp:{" "}
                      <strong className="text-slate-900">
                        {formatDateVN(theHienTai.NgayTao)}
                      </strong>
                    </span>
                  </div>
                </div>

                {theHienTai.TrangThai === "ChoCapLai" && (
                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                    <p className="font-bold">
                      Yêu cầu cấp lại thẻ đang chờ Quản lý cơ sở xử lý.
                    </p>
                    <p className="mt-1">
                      Thẻ cũ đã tạm khóa để đảm bảo an ninh. Trong thời gian chờ thẻ mới, bạn vẫn có thể dùng nút{" "}
                      <b>Quét NFC mở cổng</b> ở trên.
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
            className="p-5 rounded-2xl border border-slate-200 bg-white space-y-3 shadow-2xs"
          >
            <h2 className="text-base font-bold text-slate-900">
              Yêu cầu cấp lại thẻ
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Khi báo mất, quên hoặc hỏng thẻ, hệ thống sẽ{" "}
              <b>tự động khóa tạm thẻ hiện tại</b> và gửi yêu cầu tới Quản lý cơ sở để cấp mã mới.
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
              className="w-full py-2.5 rounded-xl bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 border border-teal-400 text-xs font-bold disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 cursor-pointer transition"
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

        {/* 3. Lịch sử ra vào cá nhân (Ẩn hoàn toàn cột UID thẻ) */}
        <section className="p-5 rounded-2xl border border-slate-200 bg-white space-y-4 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Lịch sử mở cổng của bạn
              </h2>
              <p className="text-xs text-slate-500">
                Ghi nhận tự động mỗi khi bạn quẹt thẻ RFID hoặc mở cổng bằng NFC.
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
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
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
              Chưa có lượt mở cổng nào trong khoảng thời gian này.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase">
                    <th className="py-3 px-4 font-bold">Ngày mở cổng</th>
                    <th className="py-3 px-4 font-bold">Giờ mở cổng</th>
                    <th className="py-3 px-4 font-bold">Phòng</th>
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
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          {formatDateVN(ls.NgayQuetThe)}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-teal-700">
                          {ls.GioQuetThe}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-800">
                          {ls.TenPhong || thongTinThue?.TenPhong || "—"}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {ls.TenKhu || thongTinThue?.TenKhu || "—"}
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
      {(user) => <NguoiThueQuanLyRaVaoContent user={user} />}
    </ProtectedRoute>
  );
}