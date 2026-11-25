// client/src/app/chuTro/theRaVao/capMoi/page.tsx
"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import QuanLyHeader from "@/components/layout/QuanLyHeader";
import { useAlertModal } from "@/components/common/AlertModalProvider";
import { UserProfile } from "@/types/auth.type";
import {
  theRaVaoService,
  NguoiChuaCoTheItem,
  KhuTroSimple,
  PhienGhiStatus,
} from "@/services/theRaVao.service";

function CapTheMoiContent({ user }: { user: UserProfile }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showSuccess, showError } = useAlertModal();
  const showErrorRef = useRef(showError);
  const showSuccessRef = useRef(showSuccess);
  showErrorRef.current = showError;
  showSuccessRef.current = showSuccess;

  const isChuTro = user.Quyen === "ChuTro";

  const [loading, setLoading] = useState<boolean>(true);
  const [khuTroList, setKhuTroList] = useState<KhuTroSimple[]>([]);
  const [selectedMaKhu, setSelectedMaKhu] = useState<string>(
    searchParams.get("maKhu") || ""
  );
  const [dsNguoiChuaCoThe, setDsNguoiChuaCoThe] = useState<NguoiChuaCoTheItem[]>([]);
  const [selectedMaND, setSelectedMaND] = useState<string>("");
  const [ghiChu, setGhiChu] = useState<string>("Cấp thẻ ra vào mới");

  // Trạng thái phiên ghi trên RC522
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [sessionId, setSessionId] = useState<string>("");
  const [sessionState, setSessionState] = useState<PhienGhiStatus | null>(null);
  const activeSessionRef = useRef<string>("");
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  const loadCandidates = async (maKhuFilter?: string) => {
    try {
      setLoading(true);
      const res = await theRaVaoService.getNguoiChuaCoThe(
        isChuTro ? maKhuFilter : undefined
      );
      if (res.success) {
        const list: NguoiChuaCoTheItem[] = res.data || [];
        setDsNguoiChuaCoThe(list);
        if (res.khuTroList) setKhuTroList(res.khuTroList);
        if (list.length > 0) {
          setSelectedMaND(String(list[0].MaND));
        } else {
          setSelectedMaND("");
        }
      }
    } catch (err: unknown) {
      showErrorRef.current(
        err instanceof Error ? err.message : "Không thể tải danh sách người chưa có thẻ."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCandidates(selectedMaKhu);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMaKhu]);

  // Tự động hủy phiên đang chờ khi người dùng rời trang hoặc đóng tab
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
    setSessionId("");
    setSessionState(null);
  };

  const handleBatDauCapMoi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMaND) {
      showError("Vui lòng chọn người dùng cần cấp thẻ mới.");
      return;
    }

    try {
      setSubmitting(true);
      stopPolling();

      const res = await theRaVaoService.batDauPhienGhi({
        mode: "NEW",
        maND: Number(selectedMaND),
        ghiChu,
      });

      const sid: string = res.sessionId;
      setSessionId(sid);
      activeSessionRef.current = sid;
      setSessionState({
        sessionId: sid,
        mode: "NEW",
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
              showSuccessRef.current(
                `Đã cấp thẻ mới thành công! Mã UID: ${st.result?.uid || "—"}`
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
      showError(err instanceof Error ? err.message : "Không thể tạo phiên cấp thẻ.");
    } finally {
      setSubmitting(false);
    }
  };

  const selectedPerson = dsNguoiChuaCoThe.find(
    (u) => String(u.MaND) === selectedMaND
  );
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
            Cấp Thẻ Ra Vào Mới
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Chỉ hiển thị những người dùng chưa có thẻ trên hệ thống (mỗi người chỉ được cấp 1 thẻ duy nhất).
          </p>
        </div>

        {/* Bộ lọc chọn cơ sở & người dùng */}
        <form onSubmit={handleBatDauCapMoi} className="space-y-5">
          <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50 space-y-4">
            {isChuTro && khuTroList.length > 0 && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Lọc theo cơ sở
                </label>
                <select
                  value={selectedMaKhu}
                  disabled={isWaiting || isSuccess}
                  onChange={(e) => setSelectedMaKhu(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-bold disabled:opacity-60"
                >
                  <option value="">Tất cả cơ sở</option>
                  {khuTroList.map((k) => (
                    <option key={k.MaKhu} value={k.MaKhu}>
                      {k.TenKhu}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Chọn người được cấp thẻ (Chỉ người chưa có thẻ)
              </label>
              {loading ? (
                <p className="text-xs text-slate-500">Đang tải danh sách...</p>
              ) : dsNguoiChuaCoThe.length === 0 ? (
                <div className="p-4 rounded-xl bg-white border border-dashed border-slate-300 text-xs text-slate-600">
                  Tất cả người dùng thuộc phạm vi cơ sở này đều đã có thẻ ra vào.
                </div>
              ) : (
                <select
                  value={selectedMaND}
                  disabled={isWaiting || isSuccess}
                  onChange={(e) => setSelectedMaND(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-bold disabled:opacity-60"
                  required
                >
                  {dsNguoiChuaCoThe.map((u) => (
                    <option key={u.MaND} value={u.MaND}>
                      {u.HoTen} — {u.TenPhong || u.VaiTroHienThi} ({u.TenKhu || "—"})
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* 2 Khối: Thông tin người được cấp & Thông số thẻ sẽ nạp */}
          {selectedPerson && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-2">
                <h2 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
                  Thông tin người được cấp
                </h2>
                <p className="text-xs text-slate-600">
                  Họ và tên: <b className="text-slate-900">{selectedPerson.HoTen}</b>
                </p>
                <p className="text-xs text-slate-600">
                  Vai trò: <b className="text-slate-900">{selectedPerson.VaiTroHienThi}</b>
                </p>
                <p className="text-xs text-slate-600">
                  Phòng: <b className="text-slate-900">{selectedPerson.TenPhong || "—"}</b>
                </p>
                <p className="text-xs text-slate-600">
                  Cơ sở: <b className="text-slate-900">{selectedPerson.TenKhu || "—"}</b>
                </p>
                <p className="text-xs text-slate-600">
                  Số điện thoại: <b className="text-slate-900">{selectedPerson.SDT || "—"}</b>
                </p>
              </div>

              <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-2">
                <h2 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
                  Thông số thẻ mới
                </h2>
                <p className="text-xs text-slate-600">
                  Chuẩn thẻ: <b className="text-slate-900">RFID 13.56MHz (Mifare S50 1K)</b>
                </p>
                <p className="text-xs text-slate-600">
                  Cơ chế bảo mật: <b className="text-slate-900">UID + Mã bí mật Block 4</b>
                </p>
                <p className="text-xs text-slate-600">
                  UID ghi nhận:{" "}
                  <b className="font-mono text-teal-700">
                    {sessionState?.result?.uid || "Chờ đặt phôi thẻ lên RC522"}
                  </b>
                </p>
                <p className="text-xs text-slate-600">
                  Trạng thái sau cấp:{" "}
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                    Đang hoạt động
                  </span>
                </p>
                <div className="pt-1">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Ghi chú cấp thẻ
                  </label>
                  <input
                    type="text"
                    value={ghiChu}
                    disabled={isWaiting || isSuccess}
                    onChange={(e) => setGhiChu(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs disabled:opacity-60"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Khung trạng thái chờ / thành công / hết hạn */}
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
                    Đang chờ đặt phôi thẻ trắng lên đầu đọc RC522... (Còn {sessionState.remainingSec} giây)
                  </p>
                  <p className="text-xs">
                    Giữ sát phôi thẻ vào đầu đọc cho đến khi màn hình LCD báo thành công. Nếu hủy hoặc rời trang, hệ thống sẽ tự động hủy phiên chờ.
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
                    Cấp thẻ mới thành công!
                  </p>
                  <p className="text-xs">
                    Thẻ của <b>{selectedPerson?.HoTen}</b> đã được kích hoạt với UID{" "}
                    <span className="font-mono font-bold">
                      {sessionState.result?.uid}
                    </span>
                    .
                  </p>
                </>
              )}

              {sessionState.status === "EXPIRED" && (
                <p className="text-xs font-bold">
                  Hết 60 giây chờ đặt thẻ. Bạn có thể bấm nút bên dưới để bắt đầu ghi lại bất kỳ lúc nào.
                </p>
              )}

              {sessionState.status === "ERROR" && (
                <p className="text-xs font-bold">
                  {sessionState.lastError || "Có lỗi xảy ra khi ghi thẻ."}
                </p>
              )}
            </div>
          )}

          {/* Cụm nút hành động */}
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
                  disabled={submitting || !selectedPerson}
                  className="px-6 py-2.5 rounded-xl bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 border border-teal-400 text-xs font-bold disabled:opacity-50 cursor-pointer"
                >
                  {submitting
                    ? "Đang gửi lệnh..."
                    : sessionId
                    ? "Thử ghi thẻ lại"
                    : "Bắt đầu ghi thẻ mới"}
                </button>
              </>
            )}
          </div>
        </form>
      </main>
    </div>
  );
}

export default function CapTheMoiPage() {
  return (
    <ProtectedRoute allowedRoles={["ChuTro", "QuanLy"]}>
      {(user) => <CapTheMoiContent user={user} />}
    </ProtectedRoute>
  );
}