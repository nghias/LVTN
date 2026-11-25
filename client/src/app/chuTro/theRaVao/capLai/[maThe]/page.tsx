// client/src/app/chuTro/theRaVao/capLai/[maThe]/page.tsx
"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import QuanLyHeader from "@/components/layout/QuanLyHeader";
import { useAlertModal } from "@/components/common/AlertModalProvider";
import { UserProfile } from "@/types/auth.type";
import {
  theRaVaoService,
  TheRaVaoItem,
  PhienGhiStatus,
} from "@/services/theRaVao.service";

function CapLaiTheContent({ user }: { user: UserProfile }) {
  const params = useParams();
  const router = useRouter();
  const maThe = Number(params?.maThe);

  const { showSuccess, showError } = useAlertModal();
  const showErrorRef = useRef(showError);
  const showSuccessRef = useRef(showSuccess);
  showErrorRef.current = showError;
  showSuccessRef.current = showSuccess;

  const [loading, setLoading] = useState<boolean>(true);
  const [cardInfo, setCardInfo] = useState<TheRaVaoItem | null>(null);
  const [ghiChu, setGhiChu] = useState<string>("Cấp lại thẻ do mất/quên thẻ");

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [sessionState, setSessionState] = useState<PhienGhiStatus | null>(null);
  const activeSessionRef = useRef<string>("");
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  const formatDateVN = (dateStr?: string) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("vi-VN");
  };

  useEffect(() => {
    if (!maThe) return;
    const loadDetail = async () => {
      try {
        setLoading(true);
        const res = await theRaVaoService.getChiTietThe(maThe);
        if (res.success && res.data) {
          setCardInfo(res.data);
          if (res.data.TrangThai === "ChoCapLai" && res.data.GhiChu) {
            setGhiChu(`Cấp lại theo yêu cầu: ${res.data.GhiChu}`);
          }
        }
      } catch (err: unknown) {
        showErrorRef.current(
          err instanceof Error ? err.message : "Không thể tải thông tin thẻ."
        );
      } finally {
        setLoading(false);
      }
    };
    loadDetail();
  }, [maThe]);

  // Tự động hủy phiên chờ nếu rời trang hoặc đóng trình duyệt
  useEffect(() => {
    const cancelIfWaiting = () => {
      if (activeSessionRef.current) {
        const sid = activeSessionRef.current;
        activeSessionRef.current = "";
        theRaVaoService.huyPhienGhi(sid).catch(() => {});
      }
    };

    window.addEventListener("beforeunload", cancelIfWaiting);
    return () => {
      window.removeEventListener("beforeunload", cancelIfWaiting);
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      cancelIfWaiting();
    };
  }, []);

  const stopPolling = () => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  };

  const handleHuyPhien = async () => {
    stopPolling();
    if (activeSessionRef.current) {
      const sid = activeSessionRef.current;
      activeSessionRef.current = "";
      await theRaVaoService.huyPhienGhi(sid).catch(() => {});
    }
    setSessionState(null);
  };

  const handleBatDauCapLai = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardInfo) return;

    try {
      setSubmitting(true);
      stopPolling();

      const res = await theRaVaoService.batDauPhienGhi({
        mode: "REISSUE",
        maThe: cardInfo.MaThe,
        ghiChu,
      });

      const sid: string = res.sessionId;
      activeSessionRef.current = sid;
      setSessionState({
        sessionId: sid,
        mode: "REISSUE",
        status: "WAITING",
        remainingSec: res.timeoutSec || 60,
        lastError: null,
        result: null,
      });

      pollTimerRef.current = setInterval(async () => {
        try {
          const check = await theRaVaoService.getTrangThaiPhienGhi(sid);
          if (check.success && check.data) {
            const st: PhienGhiStatus = check.data;
            setSessionState(st);

            if (st.status === "SUCCESS") {
              stopPolling();
              activeSessionRef.current = "";
              setCardInfo((prev) =>
                prev
                  ? {
                      ...prev,
                      MaUID: st.result?.uid || prev.MaUID,
                      TrangThai: "HoatDong",
                      NgayTao: new Date().toISOString(),
                      GhiChu: ghiChu,
                    }
                  : prev
              );
              showSuccessRef.current(
                `Đã cấp lại mã thẻ thành công! UID mới: ${st.result?.uid || "—"}`
              );
            } else if (["EXPIRED", "CANCELLED", "ERROR"].includes(st.status)) {
              stopPolling();
              activeSessionRef.current = "";
            }
          }
        } catch {
          // Bỏ qua lỗi mạng thoáng qua
        }
      }, 2000);
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : "Không thể gửi lệnh cấp lại thẻ.");
    } finally {
      setSubmitting(false);
    }
  };

  const isWaiting = sessionState?.status === "WAITING";
  const isSuccess = sessionState?.status === "SUCCESS";

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900">
      <QuanLyHeader user={user} />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        <div className="pb-5 border-b border-slate-200">
          <button
            type="button"
            onClick={async () => {
              await handleHuyPhien();
              router.push("/chuTro/theRaVao/danhSach");
            }}
            className="text-xs font-bold text-teal-700 hover:underline mb-1.5 inline-block cursor-pointer"
          >
            ← Quay lại Danh sách thẻ
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Cấp Lại Mã Thẻ Ra Vào
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Ghi mã bảo mật mới trực tiếp vào bản ghi thẻ hiện có (không tạo bản ghi trùng lặp). Nếu hủy mà chưa đặt thẻ, dữ liệu thẻ hiện tại vẫn giữ nguyên.
          </p>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-500 text-sm">
            Đang tải thông tin thẻ...
          </div>
        ) : !cardInfo ? (
          <div className="p-10 text-center rounded-2xl bg-slate-50 border border-dashed border-slate-300 text-sm text-slate-600">
            Không tìm thấy thông tin thẻ cần cấp lại.
          </div>
        ) : (
          <form onSubmit={handleBatDauCapLai} className="space-y-5">
            {/* Thông tin người được cấp & Thông số thẻ hiện tại */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-2">
                <h2 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
                  Thông tin chủ thẻ
                </h2>
                <p className="text-xs text-slate-600">
                  Họ và tên: <b className="text-slate-900">{cardInfo.HoTen}</b>
                </p>
                <p className="text-xs text-slate-600">
                  Vai trò: <b className="text-slate-900">{cardInfo.VaiTroHienThi}</b>
                </p>
                <p className="text-xs text-slate-600">
                  Phòng: <b className="text-slate-900">{cardInfo.TenPhong || "—"}</b>
                </p>
                <p className="text-xs text-slate-600">
                  Cơ sở: <b className="text-slate-900">{cardInfo.TenKhu || "—"}</b>
                </p>
                <p className="text-xs text-slate-600">
                  Số điện thoại: <b className="text-slate-900">{cardInfo.SDT || "—"}</b>
                </p>
              </div>

              <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-2">
                <h2 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
                  Thông số thẻ hiện tại
                </h2>
                <p className="text-xs text-slate-600">
                  UID hiện tại:{" "}
                  <b className="font-mono text-slate-900">{cardInfo.MaUID || "—"}</b>
                </p>
                <p className="text-xs text-slate-600">
                  Trạng thái hiện tại: <b className="text-slate-900">{cardInfo.TrangThai}</b>
                </p>
                <p className="text-xs text-slate-600">
                  Ngày cấp gần nhất: <b className="text-slate-900">{formatDateVN(cardInfo.NgayTao)}</b>
                </p>
                <p className="text-xs text-slate-600">
                  Trạng thái sau khi ghi xong:{" "}
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                    Đang hoạt động
                  </span>
                </p>
                <div className="pt-1">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Ghi chú cấp lại
                  </label>
                  <input
                    type="text"
                    value={ghiChu}
                    disabled={isWaiting || isSuccess}
                    onChange={(e) => setGhiChu(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs disabled:opacity-60"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Khung chờ / kết quả */}
            {sessionState && (
              <div
                className={`p-5 rounded-2xl border space-y-2 ${
                  isSuccess
                    ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                    : isWaiting
                    ? "bg-amber-50 border-amber-300 text-amber-900"
                    : "bg-red-50 border-red-300 text-red-900"
                }`}
              >
                {isWaiting && (
                  <>
                    <p className="text-sm font-bold animate-pulse">
                      Đang chờ đặt phôi thẻ lên đầu đọc RC522 ({cardInfo.TenKhu})... (Còn {sessionState.remainingSec} giây)
                    </p>
                    <p className="text-xs">
                      Đặt phôi thẻ trắng mới (hoặc nạp lại mã lên thẻ cũ) vào đầu đọc. Hệ thống sẽ cập nhật trực tiếp mã mới khi ghi hoàn tất.
                    </p>
                    {sessionState.lastError && (
                      <p className="text-xs font-bold text-red-700 mt-1">
                        Cảnh báo: {sessionState.lastError}
                      </p>
                    )}
                  </>
                )}

                {isSuccess && (
                  <>
                    <p className="text-sm font-bold">
                      Cấp lại thẻ thành công!
                    </p>
                    <p className="text-xs">
                      Thẻ của <b>{cardInfo.HoTen}</b> đã cập nhật UID mới{" "}
                      <span className="font-mono font-bold">
                        {sessionState.result?.uid}
                      </span>{" "}
                      và kích hoạt hoạt động trở lại.
                    </p>
                  </>
                )}

                {sessionState.status === "EXPIRED" && (
                  <p className="text-xs font-bold">
                    Hết 60 giây chờ đặt thẻ. Bạn có thể bấm bắt đầu cấp lại để thử lại ngay.
                  </p>
                )}

                {sessionState.status === "ERROR" && (
                  <p className="text-xs font-bold">
                    {sessionState.lastError || "Cấp lại thẻ thất bại."}
                  </p>
                )}
              </div>
            )}

            {/* Nút thao tác */}
            <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
              {isWaiting ? (
                <button
                  type="button"
                  onClick={handleHuyPhien}
                  className="px-5 py-2.5 rounded-xl bg-red-100 hover:bg-red-200 text-red-700 text-xs font-bold cursor-pointer"
                >
                  Hủy chờ ghi thẻ
                </button>
              ) : isSuccess ? (
                <button
                  type="button"
                  onClick={() => router.push("/chuTro/theRaVao/danhSach")}
                  className="px-6 py-2.5 rounded-xl bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 border border-teal-400 text-xs font-bold cursor-pointer"
                >
                  Hoàn tất & Về danh sách thẻ
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => router.push("/chuTro/theRaVao/danhSach")}
                    className="px-5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-bold cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2.5 rounded-xl bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 border border-teal-400 text-xs font-bold disabled:opacity-50 cursor-pointer"
                  >
                    {submitting
                      ? "Đang gửi lệnh..."
                      : sessionState
                      ? "Thử cấp lại lần nữa"
                      : "Bắt đầu cấp lại thẻ"}
                  </button>
                </>
              )}
            </div>
          </form>
        )}
      </main>
    </div>
  );
}

export default function CapLaiThePage() {
  return (
    <ProtectedRoute allowedRoles={["ChuTro", "QuanLy"]}>
      {(user) => <CapLaiTheContent user={user} />}
    </ProtectedRoute>
  );
}