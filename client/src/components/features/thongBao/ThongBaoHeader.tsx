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
              ? "Quyền Chủ Trọ • Toàn Hệ Thống"
              : `Quyền Quản Lý • ${khuTroList.map((k) => k.TenKhu).join(", ")}`}
          </span>

          <span
            className={`inline-flex items-center gap-1.5 rounded-lg text-[11px] font-semibold border ${
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
          </span>
        </div>

        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
          Quản Lý & Phát Thông Báo
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          {isSupremeLandlord
            ? "Bạn có thể gửi thông báo tới toàn bộ hệ thốnghoặc từng khu trọ riêng biệt."
            : "Bạn chỉ có thể gửi thông báo cho khách thuê đang cư trú tại khu trọ thuộc quyền quản lý của mình."}
        </p>
      </div>

      <button
        type="button"
        onClick={onOpenModal}
        className="flex-1 sm:flex-initial text-center px-5 py-2.5 rounded-full bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 border border-teal-300 text-xs font-bold shadow-xs transition no-underline whitespace-nowrap"
      >
        Soạn Thông Báo Mới
      </button>
    </div>
  );
}