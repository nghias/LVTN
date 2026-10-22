'use client';

import { useState } from 'react';

interface NotificationBellProps {
  onOpen?: () => void;
}

export default function NotificationBell({ onOpen }: NotificationBellProps) {
  const [showNotiDropdown, setShowNotiDropdown] = useState(false);

  const [notifications, setNotifications] = useState([
    {
      id: 1,
      title: 'Cập nhật chỉ số điện nước IoT',
      desc: 'Hệ thống đã tự động ghi nhận chỉ số điện nước kỳ này.',
      time: '10 phút trước',
      unread: true,
    },
    {
      id: 2,
      title: 'Kiểm tra thiết bị PCCC định kỳ',
      desc: 'Lịch kiểm tra bình chữa cháy và lối thoát hiểm vào 09:00 Chủ Nhật.',
      time: '2 giờ trước',
      unread: true,
    },
    {
      id: 3,
      title: 'Thông báo gia hạn tạm trú',
      desc: 'Hồ sơ đăng ký tạm trú trực tuyến đã được cập nhật.',
      time: '1 ngày trước',
      unread: false,
    },
  ]);

  const unreadCount = notifications.filter((n) => n.unread).length;

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  const handleToggle = () => {
    const nextState = !showNotiDropdown;
    setShowNotiDropdown(nextState);
    if (nextState && onOpen) {
      onOpen();
    }
  };

  return (
    <div className="relative">
      {/* Nút chuông 1 vòng tròn duy nhất, không bị lồng 2 viền */}
      <button
        type="button"
        onClick={handleToggle}
        title="Thông báo"
        className={`relative w-10 h-10 rounded-full flex items-center justify-center border transition cursor-pointer ${
          showNotiDropdown
            ? 'bg-[#00FFCC] text-slate-900 border-teal-400 shadow-xs'
            : 'bg-slate-100 hover:bg-[#00FFCC]/40 text-slate-700 hover:text-slate-900 border-slate-200'
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
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white shadow-2xs">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Bảng danh sách thông báo */}
      {showNotiDropdown && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setShowNotiDropdown(false)}
          />
          <div className="fixed left-3 right-3 top-[68px] sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-80 md:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-40">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-900">
                Thông báo ({unreadCount} chưa đọc)
              </span>
              <button
                type="button"
                onClick={markAllAsRead}
                className="text-[11px] font-bold text-teal-700 hover:underline shrink-0 cursor-pointer"
              >
                Đánh dấu đã đọc
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
              {notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() =>
                    setNotifications((prev) =>
                      prev.map((n) =>
                        n.id === item.id ? { ...n, unread: false } : n
                      )
                    )
                  }
                  className={`p-3.5 hover:bg-slate-50 transition cursor-pointer ${
                    item.unread ? 'bg-[#00FFCC]/10' : 'bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-bold text-slate-900">
                      {item.title}
                    </p>
                    {item.unread && (
                      <span className="w-2 h-2 rounded-full bg-teal-500 shrink-0 mt-1" />
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {item.desc}
                  </p>
                  <span className="block text-[10px] text-slate-400 mt-1.5">
                    {item.time}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}