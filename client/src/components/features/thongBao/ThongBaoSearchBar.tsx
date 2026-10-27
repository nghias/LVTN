// client/src/components/features/thongBao/ThongBaoSearchBar.tsx
"use client";

import { LoaiThongBao } from "../../../types/thongBao.type";

interface ThongBaoSearchBarProps {
  keyword: string;
  maLTB: string;
  activeTab: "da_gui" | "da_nhan";
  loaiThongBaoList: LoaiThongBao[];
  onKeywordChange: (val: string) => void;
  onMaLTBChange: (val: string) => void;
  onTabChange: (tab: "da_gui" | "da_nhan") => void;
}

export default function ThongBaoSearchBar({
  keyword,
  maLTB,
  activeTab,
  loaiThongBaoList,
  onKeywordChange,
  onMaLTBChange,
  onTabChange,
}: ThongBaoSearchBarProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Chuyển Tab */}
        <div className="inline-flex p-1 rounded-2xl bg-slate-100 border border-slate-200 w-fit">
          <button
            type="button"
            onClick={() => onTabChange("da_gui")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === "da_gui"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Thông báo đã phát
          </button>
          <button
            type="button"
            onClick={() => onTabChange("da_nhan")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === "da_nhan"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Hộp thư nhận
          </button>
        </div>

        {/* Bộ lọc tìm kiếm */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1 max-w-2xl">
          <div className="relative flex-1">
            <input
              type="text"
              value={keyword}
              onChange={(e) => onKeywordChange(e.target.value)}
              placeholder="Tìm theo tiêu đề, nội dung hoặc người gửi..."
              className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-teal-600 focus:bg-white transition"
            />
            {keyword && (
              <button
                type="button"
                onClick={() => onKeywordChange("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            )}
          </div>

          <select
            value={maLTB}
            onChange={(e) => onMaLTBChange(e.target.value)}
            className="px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs sm:text-sm font-semibold text-slate-700 focus:outline-none focus:border-teal-600"
          >
            <option value="">Tất cả loại thông báo</option>
            {loaiThongBaoList.map((ltb) => (
              <option key={ltb.MaLTB} value={ltb.MaLTB}>
                {ltb.TenLTB}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}