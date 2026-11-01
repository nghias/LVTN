// client/src/components/layout/NotificationBell.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { thongBaoService } from "@/services/thongBao.service";
import { ThongBaoItem } from "@/types/thongBao.type";
import ThongBaoDetailModal, {
  formatTimeAgo,
  getSharedSocket,
} from "@/components/features/thongBao/ThongBaoDetailModal";

interface NotificationBellProps {
  onOpen?: () => void;
  userId?: number;
}

export default function NotificationBell({
  onOpen,
  userId,
}: NotificationBellProps) {
  const [showNotiDropdown, setShowNotiDropdown] = useState(false);
  const [notifications, setNotifications] = useState<ThongBaoItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Lưu mã thông báo đang mở trong Modal dùng chung
  const [selectedMaTB, setSelectedMaTB] = useState<number | null>(null);

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

  // Khởi tạo dữ liệu & lắng nghe sự kiện qua Shared Socket
  useEffect(() => {
    fetchNotifications();

    const socket = getSharedSocket(userId);

    const handleNewNoti = (newNoti: ThongBaoItem) => {
      setNotifications((prev) => {
        const exists = prev.some((n) => n.MaTB === newNoti.MaTB);
        if (exists) return prev;
        return [{ ...newNoti, TrangThai: "ChuaDoc" }, ...prev];
      });
      setUnreadCount((prev) => prev + 1);
    };

    const handleDeleteNoti = ({ MaTB }: { MaTB: number }) => {
      setNotifications((prev) => prev.filter((n) => n.MaTB !== Number(MaTB)));
      setSelectedMaTB((prev) => (prev === Number(MaTB) ? null : prev));
    };

    socket.on("thong_bao_moi", handleNewNoti);
    socket.on("xoa_thong_bao", handleDeleteNoti);

    return () => {
      socket.off("thong_bao_moi", handleNewNoti);
      socket.off("xoa_thong_bao", handleDeleteNoti);
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

  // Bấm vào 1 thông báo -> Đánh dấu đã đọc & Mở Modal dùng chung
  const handleSelectNotification = (item: ThongBaoItem) => {
    setShowNotiDropdown(false);

    if (item.TrangThai === "ChuaDoc") {
      setNotifications((prev) =>
        prev.map((n) =>
          n.MaTB === item.MaTB ? { ...n, TrangThai: "DaDoc" } : n,
        ),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }

    setSelectedMaTB(item.MaTB);
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

      {/* Modal Xem Chi Tiết & Trả Lời Thông Báo Dùng Chung */}
      <ThongBaoDetailModal
        maTB={selectedMaTB}
        userId={userId}
        onClose={() => setSelectedMaTB(null)}
      />
    </div>
  );
}