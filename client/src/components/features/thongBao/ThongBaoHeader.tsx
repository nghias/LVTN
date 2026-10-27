// client/src/components/features/thongBao/ThongBaoHeader.tsx
"use client";

import { KhuTroItem } from "../../../types/thongBao.type";

interface ThongBaoHeaderProps {
  isSupremeLandlord: boolean;
  khuTroList: KhuTroItem[];
  socketConnected: boolean;
  onOpenModal: () => void;
}

export default function ThongBaoHeader({
  isSupremeLandlord,
  khuTroList,
  socketConnected,
  onOpenModal,
}: ThongBaoHeaderProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold bg-[#00FFCC] text-slate-900">
            {isSupremeLandlord
              ? "Quyền Chủ Trọ • Toàn Hệ Thống (3 Khu Trọ)"
              : `Quyền Quản Lý • ${khuTroList.map((k) => k.TenKhu).join(", ")}`}
          </span>

          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${
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
            {socketConnected ? "WebSocket Trực Tiếp" : "Đang kết nối lại..."}
          </span>
        </div>

        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
          Quản Lý & Phát Thông Báo Thời Gian Thực
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          {isSupremeLandlord
            ? "Bạn có thể gửi thông báo tới toàn bộ hệ thống (bao gồm cả 3 quản lý và khách thuê) hoặc từng khu trọ riêng biệt."
            : "Bạn chỉ có thể gửi thông báo cho khách thuê đang cư trú tại khu trọ thuộc quyền quản lý của mình."}
        </p>
      </div>

      <button
        type="button"
        onClick={onOpenModal}
        className="px-5 py-3 rounded-2xl bg-slate-900 hover:bg-teal-700 text-white text-xs sm:text-sm font-bold transition cursor-pointer shrink-0 shadow-xs"
      >
        + Soạn Thông Báo Mới
      </button>
    </div>
  );
}