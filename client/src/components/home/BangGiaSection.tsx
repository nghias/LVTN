// src/components/home/BangGiaSection.tsx
"use client";

import { GiaDienNuocHome, PhiDichVuItem } from "@/services/home.service";
import { formatVND, formatDateVN } from "./home.data";

interface BangGiaSectionProps {
  giaDienNuoc?: GiaDienNuocHome | null;
  phiDichVuList?: PhiDichVuItem[];
}

export default function BangGiaSection({
  giaDienNuoc,
  phiDichVuList = [],
}: BangGiaSectionProps) {
  const safePhiDichVuList = Array.isArray(phiDichVuList) ? phiDichVuList : [];

  const formattedNgayApDung = giaDienNuoc?.NgayApDung
    ? formatDateVN(giaDienNuoc.NgayApDung).formattedDate
    : "Mới nhất";

  return (
    <section
      id="bang-gia"
      className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-lg"
    >
      <div className="max-w-2xl mx-auto text-center mb-8">
        <span className="inline-block px-3.5 py-1 rounded-full text-xs font-bold bg-[#00FFCC] text-slate-900 mb-3">
          Minh bạch chi phí 100%
        </span>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
          Đơn Giá Điện Nước & Phụ Phí Niêm Yết
        </h2>
        <p suppressHydrationWarning className="text-xs text-slate-500 mt-1.5">
          Áp dụng thống nhất khi tính Hóa đơn tự động hàng tháng trên hệ thống
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Đơn giá Điện
          </span>
          <p
            suppressHydrationWarning
            className="text-2xl font-bold text-slate-900 my-2"
          >
            {formatVND(Number(giaDienNuoc?.GiaDien || 3500))}{" "}
            <span className="text-xs font-normal text-slate-500">/ kWh</span>
          </p>
          <span className="text-[11px] text-slate-500">
            Thu thập chỉ số tự động từ đồng hồ điện tử riêng từng phòng
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Đơn giá Nước
          </span>
          <p
            suppressHydrationWarning
            className="text-2xl font-bold text-slate-900 my-2"
          >
            {formatVND(Number(giaDienNuoc?.GiaNuoc || 15000))}{" "}
            <span className="text-xs font-normal text-slate-500">/ m³</span>
          </p>
          <span className="text-[11px] text-slate-500">
            Cập nhật tự động và lưu trữ lịch sử tiêu thụ hàng tháng
          </span>
        </div>

        {safePhiDichVuList.slice(0, 2).map((dv) => (
          <div
            key={dv.MaDV}
            className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between"
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Phí dịch vụ cố định
            </span>
            <p
              suppressHydrationWarning
              className="text-xl font-bold text-slate-900 my-2"
            >
              {Number(dv.DonGia) === 0
                ? "Miễn phí"
                : `${formatVND(Number(dv.DonGia))} / ${dv.DonViTinh || "tháng"}`}
            </p>
            <span className="text-xs font-bold text-slate-700">{dv.TenDV}</span>
          </div>
        ))}
      </div>
    </section>
  );
}