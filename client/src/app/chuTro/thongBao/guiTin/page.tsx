// client/src/app/chuTro/thongBao/guiTin/page.tsx
"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { thongBaoService } from "@/services/thongBao.service";
import QuanLyHeader from "@/components/layout/QuanLyHeader";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import {
  ThongBaoChiTiet,
  ThongBaoItem,
  ThongBaoReplyItem,
} from "@/types/thongBao.type";
import {
  formatTimeAgo,
  getBaseTitle,
  getRoleBadge,
  getSharedSocket,
  resolveCurrentMaND,
} from "../chiTiet/page";

// Kiểm tra xem bản ghi có phải là thông báo phản hồi con hay không
const isReplyItem = (item: ThongBaoItem) => {
  const raw = item as ThongBaoItem & {
    MaTBCha?: number | null;
    MaTBGoc?: number | null;
  };
  if (raw.MaTBCha || raw.MaTBGoc) return true;
  return /^Phản hồi:\s*/i.test((item.TieuDe || "").trim());
};

// Loại bỏ các phản hồi bị trùng lặp (nếu có) trong luồng chat
const dedupeReplies = (replies: ThongBaoReplyItem[] = []): ThongBaoReplyItem[] => {
  const seen = new Set<string>();
  return replies.filter((r) => {
    const key = `${r.MaTB}_${r.NDGui}_${r.NoiDung?.trim()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

// ============================================================================
// 1. COMPONENT FORM GỬI TIN NHẮN / PHẢN HỒI (TÁI SỬ DỤNG)
// ============================================================================
export interface ThongBaoGuiTinProps {
  maTB: number;
  variant?: "modal" | "panel";
  onReplySuccess?: (newReply: ThongBaoReplyItem) => void;
}

export function ThongBaoGuiTin({
  maTB,
  variant = "panel",
  onReplySuccess,
}: ThongBaoGuiTinProps) {
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [replyMessage, setReplyMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!maTB || !replyText.trim()) return;

    try {
      setSendingReply(true);
      setReplyMessage(null);

      const newReply = await thongBaoService.traLoiThongBao(
        maTB,
        replyText.trim(),
      );

      setReplyText("");
      if (variant === "panel") {
        setReplyMessage({
          type: "success",
          text: "Đã gửi tin nhắn phản hồi!",
        });
      }

      if (onReplySuccess) {
        onReplySuccess(newReply);
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Không thể gửi phản hồi lúc này.";
      setReplyMessage({ type: "error", text: message });
    } finally {
      setSendingReply(false);
    }
  };

  return (
    <form
      onSubmit={handleSendReply}
      className="p-4 bg-slate-50 border-t border-slate-200 space-y-2"
    >
      {replyMessage && (
        <p
          className={`text-xs font-semibold ${
            replyMessage.type === "success" ? "text-teal-700" : "text-red-600"
          }`}
        >
          {replyMessage.text}
        </p>
      )}

      <div className="flex items-end gap-2.5">
        <textarea
          rows={2}
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          placeholder={
            variant === "modal"
              ? "Nhập nội dung trả lời thông báo..."
              : "Nhập tin nhắn phản hồi realtime..."
          }
          className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00FFCC] resize-none"
        />
        <button
          type="submit"
          disabled={sendingReply || !replyText.trim()}
          className="px-5 py-2.5 rounded-xl bg-[#00FFCC] hover:bg-[#00e6b8] border border-teal-300 disabled:opacity-50 text-slate-900 text-xs font-bold shrink-0 cursor-pointer shadow-2xs transition"
        >
          {sendingReply
            ? "Đang gửi..."
            : variant === "modal"
              ? "Gửi"
              : "Gửi tin nhắn"}
        </button>
      </div>
    </form>
  );
}

// ============================================================================
// 2. NỘI DUNG TRANG GỬI TIN NHẮN REALTIME (/chuTro/thongBao/guiTin)
// ============================================================================
function GuiTinRealtimeContent() {
  const searchParams = useSearchParams();
  const initialMaTB = searchParams.get("maTB")
    ? Number(searchParams.get("maTB"))
    : null;

  const currentUserId = resolveCurrentMaND();

  const [threads, setThreads] = useState<ThongBaoItem[]>([]);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [selectedDetail, setSelectedDetail] = useState<ThongBaoChiTiet | null>(
    null,
  );
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);

  const loadThreads = useCallback(async () => {
    try {
      setLoadingThreads(true);
      const [sentList, receivedList] = await Promise.all([
        thongBaoService.getDanhSach({ tab: "da_gui" }),
        thongBaoService.getDanhSach({ tab: "da_nhan" }),
      ]);

      // Gộp các bản ghi phản hồi trùng chủ đề về 1 thông báo gốc duy nhất
      const groupMap = new Map<string, ThongBaoItem>();

      for (const item of [...sentList, ...receivedList]) {
        const baseTitle = getBaseTitle(item.TieuDe).toLowerCase();
        const groupKey = `${item.MaLTB ?? item.TenLTB}::${baseTitle}`;
        const existing = groupMap.get(groupKey);

        if (!existing) {
          groupMap.set(groupKey, item);
          continue;
        }

        const existingIsReply = isReplyItem(existing);
        const currentIsReply = isReplyItem(item);

        // Ưu tiên giữ lại thông báo gốc (không có tiền tố "Phản hồi:") làm đại diện
        if (existingIsReply && !currentIsReply) {
          groupMap.set(groupKey, item);
        } else if (!existingIsReply && !currentIsReply) {
          if (item.MaTB < existing.MaTB) {
            groupMap.set(groupKey, item);
          }
        }
      }

      const list = Array.from(groupMap.values());
      setThreads(list);

      const targetId = initialMaTB || list[0]?.MaTB;
      if (targetId) {
        setLoadingDetail(true);
        const detail = await thongBaoService.getChiTiet(targetId);
        setSelectedDetail({
          ...detail,
          dsPhanHoi: dedupeReplies(detail.dsPhanHoi),
        });
        setLoadingDetail(false);
      }
    } catch (error) {
      console.error("Lỗi tải danh sách luồng tin nhắn:", error);
    } finally {
      setLoadingThreads(false);
      setLoadingDetail(false);
    }
  }, [initialMaTB]);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  useEffect(() => {
    const socket = getSharedSocket(currentUserId);
    setSocketConnected(socket.connected);

    const onConnect = () => setSocketConnected(true);
    const onDisconnect = () => setSocketConnected(false);

    const handleNewReply = (payload: {
      rootMaTB: number;
      phanHoi: ThongBaoReplyItem;
    }) => {
      const rootId = Number(payload.rootMaTB);
      setSelectedDetail((prev) => {
        if (!prev || prev.MaTB !== rootId) return prev;
        if (prev.dsPhanHoi.some((r) => r.MaTB === payload.phanHoi.MaTB)) {
          return prev;
        }
        return {
          ...prev,
          dsPhanHoi: dedupeReplies([...prev.dsPhanHoi, payload.phanHoi]),
        };
      });
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("phan_hoi_thong_bao", handleNewReply);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("phan_hoi_thong_bao", handleNewReply);
    };
  }, [currentUserId]);

  const handleSelectThread = async (maTB: number) => {
    try {
      setLoadingDetail(true);
      const detail = await thongBaoService.getChiTiet(maTB);
      setSelectedDetail({
        ...detail,
        dsPhanHoi: dedupeReplies(detail.dsPhanHoi),
      });
    } catch (error) {
      console.error("Lỗi tải chi tiết hội thoại:", error);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleReplySuccess = (newReply: ThongBaoReplyItem) => {
    setSelectedDetail((prev) => {
      if (!prev) return null;
      const exists = prev.dsPhanHoi.some((r) => r.MaTB === newReply.MaTB);
      return {
        ...prev,
        dsPhanHoi: exists
          ? prev.dsPhanHoi
          : dedupeReplies([...prev.dsPhanHoi, newReply]),
      };
    });
  };

  return (
    <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/chuTro/thongBao"
              className="text-xs font-bold text-teal-700 hover:underline no-underline"
            >
              ← Quay lại Thông báo
            </Link>
            <span className="text-slate-300">•</span>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                socketConnected
                  ? "text-teal-700 bg-teal-50 border-teal-200"
                  : "text-amber-700 bg-amber-50 border-amber-200"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  socketConnected ? "bg-teal-500 animate-pulse" : "bg-amber-500"
                }`}
              />
              {socketConnected ? "Realtime Đang Hoạt Động" : "Đang kết nối..."}
            </span>
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900">
            Trả Lời Tin Nhắn
          </h1>
        </div>

        <Link
          href={`/chuTro/thongBao/them/${currentUserId || 0}`}
          className="px-5 py-2.5 rounded-full bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 border border-teal-300 text-xs font-bold shadow-xs transition w-fit no-underline"
        >
          + Tạo Chủ Đề Thông Báo Mới
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Cột trái: Danh sách luồng trao đổi */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
            <span className="text-xs font-bold text-slate-800">
              Chủ đề trao đổi ({threads.length})
            </span>
          </div>

          <div className="divide-y divide-slate-100 max-h-140 overflow-y-auto">
            {loadingThreads ? (
              <div className="p-6 text-center text-xs text-slate-400">
                Đang tải danh sách...
              </div>
            ) : threads.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                Chưa có thông báo nào để trao đổi.
              </div>
            ) : (
              threads.map((item) => {
                const isSelected =
                  selectedDetail?.MaTB === item.MaTB ||
                  (selectedDetail &&
                    getBaseTitle(selectedDetail.TieuDe).toLowerCase() ===
                      getBaseTitle(item.TieuDe).toLowerCase() &&
                    selectedDetail.MaLTB === item.MaLTB);

                return (
                  <div
                    key={item.MaTB}
                    onClick={() => handleSelectThread(item.MaTB)}
                    className={`p-4 cursor-pointer transition ${
                      isSelected
                        ? "bg-[#00FFCC]/25 border-l-4 border-teal-500"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                      {item.TenLTB}
                    </span>
                    <h3 className="text-xs font-bold text-slate-900 mt-1.5 line-clamp-1">
                      {getBaseTitle(item.TieuDe)}
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                      {item.NoiDung}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Cột phải: Khung nhắn tin Realtime */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col min-h-130">
          {loadingDetail ? (
            <div className="flex-1 flex items-center justify-center p-10 text-xs text-slate-400">
              Đang tải cuộc trò chuyện...
            </div>
          ) : !selectedDetail ? (
            <div className="flex-1 flex items-center justify-center p-10 text-xs text-slate-400">
              Chọn một chủ đề bên trái để bắt đầu gửi tin nhắn.
            </div>
          ) : (
            <>
              <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200">
                <h2 className="text-sm sm:text-base font-bold text-slate-900">
                  {getBaseTitle(selectedDetail.TieuDe)}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Người khởi tạo: <strong>{selectedDetail.TenNguoiGui}</strong>{" "}
                  ({getRoleBadge(selectedDetail.QuyenNguoiGui)}) •{" "}
                  {formatTimeAgo(selectedDetail.NgayGui)}
                </p>
              </div>

              <div className="p-5 space-y-4 flex-1 max-h-105 overflow-y-auto">
                <div className="p-4 rounded-2xl bg-[#00FFCC]/15 border border-teal-200">
                  <p className="text-xs text-slate-800 whitespace-pre-line">
                    {selectedDetail.NoiDung}
                  </p>
                </div>

                {selectedDetail.dsPhanHoi?.map((rep) => (
                  <div
                    key={rep.MaTB}
                    className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">
                          {rep.TenNguoiGui}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white border border-slate-200 text-slate-600">
                          {getRoleBadge(rep.QuyenNguoiGui)}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {formatTimeAgo(rep.NgayGui)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 whitespace-pre-line">
                      {rep.NoiDung}
                    </p>
                  </div>
                ))}
              </div>

              <ThongBaoGuiTin
                maTB={selectedDetail.MaTB}
                variant="panel"
                onReplySuccess={handleReplySuccess}
              />
            </>
          )}
        </div>
      </div>
    </main>
  );
}

export default function GuiTinRealtimePage() {
  return (
    <ProtectedRoute allowedRoles={["ChuTro", "QuanLy"]}>
      {(user) => (
        <div className="min-h-screen flex flex-col bg-white text-slate-900">
          <QuanLyHeader user={user} />
          <Suspense
            fallback={
              <div className="p-10 text-center text-xs text-slate-400">
                Đang tải phòng tin nhắn...
              </div>
            }
          >
            <GuiTinRealtimeContent />
          </Suspense>
        </div>
      )}
    </ProtectedRoute>
  );
}