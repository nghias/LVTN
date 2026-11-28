// src/components/home/BangGiaSection.tsx
"use client";

import {
  BadgeCheck,
  Zap,
  Droplets,
  Wifi,
  Trash2,
  Bike,
  Shield,
  Receipt,
} from "lucide-react";
import { GiaDienNuocHome, PhiDichVuItem } from "@/services/home.service";
import { formatVND, formatDateVN } from "./home.data";

interface BangGiaSectionProps {
  giaDienNuoc?: GiaDienNuocHome | null;
  phiDichVuList?: PhiDichVuItem[];
}

function renderDichVuIcon(tenDV?: string) {
  const name = (tenDV || "").toLowerCase();
  if (name.includes("wifi") || name.includes("mạng") || name.includes("internet")) {
    return (
      <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600 shrink-0">
        <Wifi className="w-4.5 h-4.5" />
      </div>
    );
  }
  if (name.includes("rác") || name.includes("vệ sinh")) {
    return (
      <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
        <Trash2 className="w-4.5 h-4.5" />
      </div>
    );
  }
  if (name.includes("xe") || name.includes("bãi")) {
    return (
      <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shrink-0">
        <Bike className="w-4.5 h-4.5" />
      </div>
    );
  }
  if (name.includes("an ninh") || name.includes("bảo vệ") || name.includes("thẻ")) {
    return (
      <div className="w-9 h-9 rounded-xl bg-violet-50 border border-violet-200 flex items-center justify-center text-violet-600 shrink-0">
        <Shield className="w-4.5 h-4.5" />
      </div>
    );
  }
  return (
    <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 shrink-0">
      <Receipt className="w-4.5 h-4.5" />
    </div>
  );
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
        <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold bg-[#00FFCC] text-slate-900 mb-3">
          <BadgeCheck className="w-4 h-4 shrink-0" />
          <span>Minh bạch chi phí 100%</span>
        </span>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
          Đơn Giá Điện Nước & Phụ Phí Niêm Yết
        </h2>
        <p suppressHydrationWarning className="text-xs text-slate-500 mt-1.5">
          Áp dụng thống nhất khi tính Hóa đơn tự động hàng tháng trên hệ thống
          {formattedNgayApDung ? ` (Cập nhật: ${formattedNgayApDung})` : ""}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Đơn giá Điện */}
        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Đơn giá Điện
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
              <Zap className="w-4.5 h-4.5" />
            </div>
          </div>
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

        {/* Đơn giá Nước */}
        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Đơn giá Nước
            </span>
            <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600 shrink-0">
              <Droplets className="w-4.5 h-4.5" />
            </div>
          </div>
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

        {/* Phí dịch vụ cố định */}
        {safePhiDichVuList.slice(0, 2).map((dv) => (
          <div
            key={dv.MaDV}
            className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Phí dịch vụ cố định
              </span>
              {renderDichVuIcon(dv.TenDV)}
            </div>
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