// client/src/components/layout/NotificationBell.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { thongBaoService } from "@/services/thongBao.service";
import {
  ThongBaoChiTiet,
  ThongBaoItem,
  ThongBaoReplyItem,
} from "@/types/thongBao.type";

interface NotificationBellProps {
  onOpen?: () => void;
  userId?: number;
}

const formatTimeAgo = (dateStr: string) => {
  if (!dateStr) return "";

  const rawDate = new Date(dateStr);
  if (isNaN(rawDate.getTime())) return dateStr;

  // Cộng bù 7 tiếng (7 * 60 * 60 * 1000 ms) do TiDB lưu giờ UTC
  const SEVEN_HOURS_MS = 7 * 60 * 60 * 1000;
  const adjustedTime = rawDate.getTime() + SEVEN_HOURS_MS;

  // Nếu sau khi cộng 7 tiếng mà không vượt quá thời điểm hiện tại thì dùng giờ đã cộng bù
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

const getRoleBadge = (quyen: string) => {
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

export default function NotificationBell({
  onOpen,
  userId,
}: NotificationBellProps) {
  const [showNotiDropdown, setShowNotiDropdown] = useState(false);
  const [notifications, setNotifications] = useState<ThongBaoItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // State cho Modal Xem chi tiết & Trả lời
  const [selectedNoti, setSelectedNoti] = useState<ThongBaoChiTiet | null>(
    null,
  );
  const [detailLoading, setDetailLoading] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [replyError, setReplyError] = useState("");

  // Lấy danh sách thông báo từ API
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const data = await thongBaoService.getThongBaoCuaToi(30);
      setNotifications(data.items || []);
      setUnreadCount(data.unreadCount || 0);
    } catch {
      // Bỏ qua lỗi nếu chưa đăng nhập
    } finally {
      setLoading(false);
    }
  }, []);

  // Khởi tạo dữ liệu & kết nối WebSocket đẩy thông báo Real-time
  useEffect(() => {
    fetchNotifications();

    // Giải mã nhanh maND từ JWT token trong localStorage nếu không truyền prop userId
    let currentMaND = userId;
    if (!currentMaND && typeof window !== "undefined") {
      try {
        const token = localStorage.getItem("token");
        if (token) {
          const payload = JSON.parse(atob(token.split(".")[1]));
          currentMaND = Number(payload.maND ?? payload.MaND);
        }
      } catch {
        // Ignore
      }
    }

    const rawUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
    const socketUrl = rawUrl.replace(/\/api\/?$/, "");

    const socket: Socket = io(socketUrl, {
      withCredentials: true,
      transports: ["websocket", "polling"],
      query: currentMaND ? { maND: String(currentMaND) } : undefined,
    });

    socket.on("connect", () => {
      if (currentMaND) {
        socket.emit("join_user_room", currentMaND);
      }
    });

    // Khi có thông báo mới hoặc phản hồi mới được đẩy về
    socket.on("thong_bao_moi", (newNoti: ThongBaoItem) => {
      setNotifications((prev) => {
        const exists = prev.some((n) => n.MaTB === newNoti.MaTB);
        if (exists) return prev;
        return [{ ...newNoti, TrangThai: "ChuaDoc" }, ...prev];
      });
      setUnreadCount((prev) => prev + 1);
    });

    // Khi đang mở Modal xem chi tiết mà có người trả lời trực tiếp vào luồng đó
    socket.on(
      "phan_hoi_thong_bao",
      (payload: { rootMaTB: number; phanHoi: ThongBaoReplyItem }) => {
        setSelectedNoti((prev) => {
          if (!prev || prev.MaTB !== Number(payload.rootMaTB)) return prev;
          const exists = prev.dsPhanHoi.some(
            (r) => r.MaTB === payload.phanHoi.MaTB,
          );
          if (exists) return prev;
          return {
            ...prev,
            dsPhanHoi: [...prev.dsPhanHoi, payload.phanHoi],
          };
        });
      },
    );

    // Khi thông báo bị xóa
    socket.on("xoa_thong_bao", ({ MaTB }: { MaTB: number }) => {
      setNotifications((prev) => prev.filter((n) => n.MaTB !== Number(MaTB)));
      setSelectedNoti((prev) => (prev?.MaTB === Number(MaTB) ? null : prev));
    });

    return () => {
      socket.disconnect();
    };
  }, [fetchNotifications, userId]);

  // Đánh dấu đã đọc tất cả
  const markAllAsRead = async () => {
    if (unreadCount === 0) return;
    try {
      await thongBaoService.danhDauDaDocTatCa();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, TrangThai: "DaDoc" })),
      );
      setUnreadCount(0);
    } catch (error) {
      console.error("Lỗi đánh dấu đã đọc tất cả:", error);
    }
  };

  // Bấm vào 1 thông báo -> Đánh dấu đã đọc & Mở Modal Xem chi tiết + Trả lời
  const handleSelectNotification = async (item: ThongBaoItem) => {
    setShowNotiDropdown(false);
    setReplyError("");
    setReplyText("");
    setDetailLoading(true);

    // Cập nhật giao diện đã đọc ngay lập tức
    if (item.TrangThai === "ChuaDoc") {
      setNotifications((prev) =>
        prev.map((n) =>
          n.MaTB === item.MaTB ? { ...n, TrangThai: "DaDoc" } : n,
        ),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }

    try {
      const detail = await thongBaoService.getChiTiet(item.MaTB);
      setSelectedNoti(detail);
    } catch (error) {
      console.error("Lỗi tải chi tiết thông báo:", error);
    } finally {
      setDetailLoading(false);
    }
  };

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

      setSelectedNoti((prev) =>
        prev
          ? {
              ...prev,
              dsPhanHoi: [...prev.dsPhanHoi, newReply],
            }
          : null,
      );
      setReplyText("");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Không thể gửi phản hồi lúc này.";
      setReplyError(message);
    } finally {
      setSendingReply(false);
    }
  };

  const handleToggle = () => {
    const nextState = !showNotiDropdown;
    setShowNotiDropdown(nextState);
    if (nextState) {
      fetchNotifications();
      if (onOpen) onOpen();
    }
  };

  return (
    <div className="relative">
      {/* Nút chuông thông báo */}
      <button
        type="button"
        onClick={handleToggle}
        title="Thông báo"
        className={`relative w-10 h-10 rounded-full flex items-center justify-center border transition cursor-pointer ${
          showNotiDropdown
            ? "bg-[#00FFCC] text-slate-900 border-teal-400 shadow-xs"
            : "bg-slate-100 hover:bg-[#00FFCC]/40 text-slate-700 hover:text-slate-900 border-slate-200"
        }`}
      >
        <svg
          width="20"
          height="20"
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white shadow-2xs">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown danh sách thông báo */}
      {showNotiDropdown && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setShowNotiDropdown(false)}
          />
          <div className="fixed left-3 right-3 top-16 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-80 md:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-40">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-900">
                Thông báo ({unreadCount} chưa đọc)
              </span>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="text-[11px] font-bold text-teal-700 hover:underline shrink-0 cursor-pointer"
                >
                  Đánh dấu đã đọc
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
              {loading && notifications.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  Đang tải thông báo...
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  Bạn chưa có thông báo nào.
                </div>
              ) : (
                notifications.map((item) => {
                  const isUnread = item.TrangThai === "ChuaDoc";
                  return (
                    <div
                      key={item.MaTB}
                      onClick={() => handleSelectNotification(item)}
                      className={`p-3.5 hover:bg-slate-50 transition cursor-pointer ${
                        isUnread ? "bg-[#00FFCC]/15" : "bg-white"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 text-slate-700 mb-1">
                            {item.TenLTB}
                          </span>
                          <p
                            className={`text-xs text-slate-900 truncate ${
                              isUnread ? "font-bold" : "font-semibold"
                            }`}
                          >
                            {item.TieuDe}
                          </p>
                        </div>
                        {isUnread && (
                          <span className="w-2.5 h-2.5 rounded-full bg-teal-500 shrink-0 mt-1" />
                        )}
                      </div>

                      <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                        {item.NoiDung}
                      </p>

                      <div className="flex items-center justify-between mt-2 text-[10px] text-slate-400">
                        <span>Từ: {item.TenNguoiGui}</span>
                        <span>{formatTimeAgo(item.NgayGui)}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}

      {/* Modal Xem Chi Tiết & Trả Lời Thông Báo */}
      {(detailLoading || selectedNoti) && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
            {/* Header Modal */}
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#00FFCC] text-slate-900">
                  {selectedNoti?.TenLTB || "Chi tiết thông báo"}
                </span>
                <h3 className="text-sm font-bold text-slate-900 mt-1 truncate">
                  {selectedNoti?.TieuDe || "Đang tải..."}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedNoti(null)}
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
      )}
    </div>
  );
}
