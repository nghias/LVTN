// src/components/home/EcosystemSection.tsx
"use client";

import { NHOM_DOI_TUONG } from "./home.data";

interface EcosystemSectionProps {
  onScrollToSection: (id: string) => void;
}

export default function EcosystemSection({
  onScrollToSection,
}: EcosystemSectionProps) {
  return (
    <section id="he-sinh-thai" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold bg-[#00FFCC]/30 text-slate-900 mb-1.5">
            Tối ưu hóa trải nghiệm & nghiệp vụ
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
            Giải Pháp Chuyên Biệt Cho 3 Nhóm Đối Tượng
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Đáp ứng trọn vẹn và liền mạch nhu cầu từ khâu tìm phòng, cư trú cho
            đến quản trị vận hành đa cơ sở
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {NHOM_DOI_TUONG.map((nhom, idx) => (
          <div
            key={nhom.vaiTro}
            className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col justify-between space-y-5"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#00FFCC] text-slate-900">
                  0{idx + 1}. {nhom.vaiTro}
                </span>
                <span className="text-[11px] font-semibold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200">
                  Luồng khép kín
                </span>
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {nhom.doiTuong}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed mt-1">
                  {nhom.moTaChinh}
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Điểm nhấn công nghệ
                </p>
                <p className="text-xs font-bold text-slate-900 mt-0.5">
                  ✦ {nhom.diemNhanCongNghe}
                </p>
              </div>

              <ul className="space-y-2.5 pt-1">
                {nhom.tinhNang.map((tn) => (
                  <li
                    key={tn}
                    className="flex items-start gap-2.5 text-xs text-slate-700 leading-relaxed"
                  >
                    <span className="w-4 h-4 rounded-full bg-[#00FFCC]/40 text-slate-900 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                      ✓
                    </span>
                    <span>{tn}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-400">
                Chuẩn hóa quy trình số
              </span>
              <button
                type="button"
                onClick={() => onScrollToSection("tin-dang")}
                className="text-xs font-bold text-teal-700 hover:text-slate-900 transition cursor-pointer"
              >
                Trải nghiệm ngay →
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}