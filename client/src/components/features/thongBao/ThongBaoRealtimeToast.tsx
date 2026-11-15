// client/src/components/features/thongBao/ThongBaoRealtimeToast.tsx
"use client";

import { ThongBaoItem } from "../../../types/thongBao.type";

interface ThongBaoRealtimeToastProps {
  notification: ThongBaoItem | null;
  onClose: () => void;
}

export default function ThongBaoRealtimeToast({
  notification,
  onClose,
}: ThongBaoRealtimeToastProps) {
  if (!notification) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full bg-slate-900 text-white border border-teal-400/40 rounded-3xl p-5 shadow-2xl space-y-2 animate-bounce">
      <div className="flex items-center justify-between gap-2">
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#00FFCC] text-slate-900">
          🔔 Thông báo mới • {notification.TenLTB}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-slate-400 hover:text-white"
        >
          ✕
        </button>
      </div>
      <h4 className="text-sm font-bold text-white">{notification.TieuDe}</h4>
      <p className="text-xs text-slate-300 line-clamp-2">
        {notification.NoiDung}
      </p>
      <p className="text-[10px] text-teal-300 font-semibold">
        Từ: {notification.TenNguoiGui}
      </p>
    </div>
  );
}