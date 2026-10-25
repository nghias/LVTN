// src/components/home/KhuTroSection.tsx
"use client";

import { KhuTroWithContact } from "./home.data";

interface KhuTroSectionProps {
  khuTroList: KhuTroWithContact[];
  onSelectKhuAndScroll: (maKhu: string) => void;
}

export default function KhuTroSection({
  khuTroList,
  onSelectKhuAndScroll,
}: KhuTroSectionProps) {
  return (
    <section id="khu-tro" className="space-y-5">
      <div>
        <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold bg-[#00FFCC]/30 text-slate-900 mb-1.5">
          Hệ thống cơ sở Xóm Trọ
        </span>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
          Các Khu Trọ Đang Hoạt Động
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {khuTroList.map((khu) => (
          <div
            key={khu.MaKhu}
            className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col justify-between gap-4"
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-lg font-bold text-slate-900">
                  {khu.TenKhu}
                </h3>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#00FFCC] text-slate-900 shrink-0">
                  Trống {khu.SoPhongTrong}/{khu.TongSoPhong} phòng
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-500">
                📍 {khu.DiaChi}
              </p>
              <p className="text-xs text-slate-600 leading-relaxed pt-1">
                {khu.MoTa}
              </p>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-600">
                ● Đồng bộ đồng hồ IoT & Kiểm soát ra vào
              </span>
              <button
                type="button"
                onClick={() => onSelectKhuAndScroll(String(khu.MaKhu))}
                className="px-4 py-2 rounded-full text-xs font-bold bg-slate-100 hover:bg-[#00FFCC] text-slate-900 transition cursor-pointer"
              >
                Lọc phòng cơ sở này
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}