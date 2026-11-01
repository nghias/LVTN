// client/src/components/features/thongBao/ThongBaoDetailModal.tsx
"use client";

import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { thongBaoService } from "@/services/thongBao.service";
import {
  ThongBaoChiTiet,
  ThongBaoReplyItem,
} from "@/types/thongBao.type";

// Quản lý 1 kết nối Socket duy nhất (Singleton) để tránh lỗi ngắt kết nối sớm khi re-render/StrictMode
let sharedSocket: Socket | null = null;
let currentJoinedRoom: number | null = null;

export const resolveCurrentMaND = (userId?: number): number | undefined => {
  if (userId) return userId;
  if (typeof window !== "undefined") {
    try {
      const token = localStorage.getItem("token");
      if (token) {
        const payload = JSON.parse(atob(token.split(".")[1]));
        return Number(payload.maND ?? payload.MaND);
      }
    } catch {
      // Bỏ qua lỗi giải mã token
    }
  }
  return undefined;
};

export const getSharedSocket = (userId?: number): Socket => {
  const activeMaND = resolveCurrentMaND(userId);
  const rawUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
  const socketUrl = rawUrl.replace(/\/api\/?$/, "");

  if (!sharedSocket) {
    sharedSocket = io(socketUrl, {
      withCredentials: true,
      // Ưu tiên polling trước rồi nâng cấp lên websocket giúp tránh cảnh báo đóng kết nối sớm
      transports: ["polling", "websocket"],
      query: activeMaND ? { maND: String(activeMaND) } : undefined,
    });

    sharedSocket.on("connect", () => {
      const maND = resolveCurrentMaND(userId);
      if (maND) {
        sharedSocket?.emit("join_user_room", maND);
        currentJoinedRoom = maND;
      }
    });
  } else if (activeMaND && sharedSocket.connected && currentJoinedRoom !== activeMaND) {
    sharedSocket.emit("join_user_room", activeMaND);
    currentJoinedRoom = activeMaND;
  }

  return sharedSocket;
};

export const formatTimeAgo = (dateStr: string) => {
  if (!dateStr) return "";

  const rawDate = new Date(dateStr);
  if (isNaN(rawDate.getTime())) return dateStr;

  // Cộng bù 7 tiếng (7 * 60 * 60 * 1000 ms) do TiDB lưu giờ UTC
  const SEVEN_HOURS_MS = 7 * 60 * 60 * 1000;
  const adjustedTime = rawDate.getTime() + SEVEN_HOURS_MS;

  const finalDate =
    adjustedTime <= Date.now() + 60 * 1000
      ? new Date(adjustedTime)
      : rawDate;

  return finalDate.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const getRoleBadge = (quyen?: string) => {
  switch (quyen) {
    case "ChuTro":
    case "Admin":
      return "Chủ trọ";
    case "QuanLy":
      return "Quản lý cơ sở";
    default:
      return "Khách thuê";
  }
};

interface ThongBaoDetailModalProps {
  maTB: number | null;
  userId?: number;
  onClose: () => void;
  onReplyCountChange?: (maTB: number, count: number) => void;
}

export default function ThongBaoDetailModal({
  maTB,
  userId,
  onClose,
  onReplyCountChange,
}: ThongBaoDetailModalProps) {
  const [selectedNoti, setSelectedNoti] = useState<ThongBaoChiTiet | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [replyError, setReplyError] = useState("");

  // Tải chi tiết thông báo khi maTB thay đổi
  useEffect(() => {
    if (!maTB) {
      setSelectedNoti(null);
      setReplyText("");
      setReplyError("");
      return;
    }

    let isMounted = true;
    const fetchDetail = async () => {
      try {
        setDetailLoading(true);
        setReplyError("");
        setReplyText("");
        const detail = await thongBaoService.getChiTiet(maTB);
        if (!isMounted) return;
        setSelectedNoti(detail);
        if (detail.dsPhanHoi && onReplyCountChange) {
          onReplyCountChange(maTB, detail.dsPhanHoi.length);
        }
      } catch (error) {
        console.error("Lỗi tải chi tiết thông báo:", error);
      } finally {
        if (isMounted) setDetailLoading(false);
      }
    };

    fetchDetail();
    return () => {
      isMounted = false;
    };
  }, [maTB]);

  // Lắng nghe phản hồi Real-time & sự kiện xóa thông báo cho Modal đang mở
  useEffect(() => {
    if (!maTB) return;

    const socket = getSharedSocket(userId);

    const handleNewReply = (payload: {
      rootMaTB: number;
      phanHoi: ThongBaoReplyItem;
    }) => {
      const rootId = Number(payload.rootMaTB);
      if (rootId !== maTB) return;

      setSelectedNoti((prev) => {
        if (!prev || prev.MaTB !== rootId) return prev;
        const exists = prev.dsPhanHoi.some(
          (r) => r.MaTB === payload.phanHoi.MaTB,
        );
        if (exists) return prev;

        const updatedReplies = [...prev.dsPhanHoi, payload.phanHoi];
        if (onReplyCountChange) {
          onReplyCountChange(rootId, updatedReplies.length);
        }

        return {
          ...prev,
          dsPhanHoi: updatedReplies,
        };
      });
    };

    const handleDeleteNoti = ({ MaTB }: { MaTB: number }) => {
      if (Number(MaTB) === maTB) {
        onClose();
      }
    };

    socket.on("phan_hoi_thong_bao", handleNewReply);
    socket.on("xoa_thong_bao", handleDeleteNoti);

    return () => {
      socket.off("phan_hoi_thong_bao", handleNewReply);
      socket.off("xoa_thong_bao", handleDeleteNoti);
    };
  }, [maTB, userId, onClose, onReplyCountChange]);

  // Gửi trả lời trong Modal
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNoti || !replyText.trim()) return;

    try {
      setSendingReply(true);
      setReplyError("");
      const newReply = await thongBaoService.traLoiThongBao(
        selectedNoti.MaTB,
        replyText.trim(),
      );

      setSelectedNoti((prev) => {
        if (!prev) return null;
        const exists = prev.dsPhanHoi.some((r) => r.MaTB === newReply.MaTB);
        const updatedReplies = exists
          ? prev.dsPhanHoi
          : [...prev.dsPhanHoi, newReply];

        if (onReplyCountChange) {
          onReplyCountChange(prev.MaTB, updatedReplies.length);
        }

        return {
          ...prev,
          dsPhanHoi: updatedReplies,
        };
      });

      setReplyText("");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Không thể gửi phản hồi lúc này.";
      setReplyError(message);
    } finally {
      setSendingReply(false);
    }
  };

  if (!maTB && !detailLoading && !selectedNoti) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header Modal */}
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#00FFCC] text-slate-900">
                {selectedNoti?.TenLTB || "Chi tiết thông báo"}
              </span>
              {selectedNoti?.SoNguoiNhan !== undefined && (
                <span className="text-[10px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                  Đã gửi tới {selectedNoti.SoNguoiNhan} người
                </span>
              )}
            </div>
            <h3 className="text-sm font-bold text-slate-900 mt-1 truncate">
              {selectedNoti?.TieuDe || "Đang tải..."}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-200/70 hover:bg-slate-300 flex items-center justify-center text-slate-700 text-xs font-bold cursor-pointer shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Body chi tiết + Luồng phản hồi */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {detailLoading || !selectedNoti ? (
            <div className="py-10 text-center text-xs text-slate-500">
              Đang tải nội dung thông báo...
            </div>
          ) : (
            <>
              {/* Nội dung thông báo gốc */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">
                      {selectedNoti.TenNguoiGui}
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-teal-100 text-teal-800">
                      {getRoleBadge(selectedNoti.QuyenNguoiGui)}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    {formatTimeAgo(selectedNoti.NgayGui)}
                  </span>
                </div>
                <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed">
                  {selectedNoti.NoiDung}
                </p>
              </div>

              {/* Danh sách các phản hồi (Replies) */}
              <div className="space-y-2.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Phản hồi ({selectedNoti.dsPhanHoi?.length || 0})
                </p>

                {selectedNoti.dsPhanHoi?.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">
                    Chưa có phản hồi nào. Hãy nhập bên dưới để trao đổi.
                  </p>
                ) : (
                  selectedNoti.dsPhanHoi.map((rep) => (
                    <div
                      key={rep.MaTB}
                      className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-900">
                            {rep.TenNguoiGui}
                          </span>
                          <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-slate-100 text-slate-600">
                            {getRoleBadge(rep.QuyenNguoiGui)}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {formatTimeAgo(rep.NgayGui)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed">
                        {rep.NoiDung}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>

        {/* Form Trả lời thông báo */}
        {selectedNoti && (
          <form
            onSubmit={handleSendReply}
            className="p-4 bg-slate-50 border-t border-slate-200 space-y-2"
          >
            {replyError && (
              <p className="text-[11px] text-red-600 font-medium">
                {replyError}
              </p>
            )}
            <div className="flex items-end gap-2">
              <textarea
                rows={2}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Nhập nội dung trả lời thông báo..."
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-teal-500 resize-none"
              />
              <button
                type="submit"
                disabled={sendingReply || !replyText.trim()}
                className="px-4 py-2.5 rounded-xl bg-[#00FFCC] hover:bg-teal-300 disabled:opacity-50 text-slate-900 text-xs font-bold shrink-0 cursor-pointer transition"
              >
                {sendingReply ? "Đang gửi..." : "Gửi"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}