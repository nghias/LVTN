// src/components/home/HeroSection.tsx
"use client";

import {
  Sparkles,
  Lock,
  ShieldCheck,
  Search,
  MessageCircle,
  Receipt,
  Building2,
  DoorOpen,
  Zap,
  Droplets,
} from "lucide-react";
import { GiaDienNuocHome } from "@/services/home.service";
import { formatVND } from "./home.data";

interface HeroSectionProps {
  soKhuTro: number;
  soPhongMo: number;
  giaDienNuoc: GiaDienNuocHome;
  onScrollToSection: (id: string) => void;
  onOpenChat: () => void;
}

export default function HeroSection({
  soKhuTro,
  soPhongMo,
  giaDienNuoc,
  onScrollToSection,
  onOpenChat,
}: HeroSectionProps) {
  const tongCoSo = soKhuTro > 0 ? soKhuTro : 3;

  return (
    <section
      id="gioi-thieu"
      className="relative bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 lg:p-10 shadow-xs overflow-hidden"
    >
      {/* Điểm nhấn nền nhẹ phía sau */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-[#00FFCC]/15 blur-3xl"
      />

      <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Cột trái: Thông điệp ngắn gọn, 3 điểm nhấn & cụm nút CTA */}
        <div className="lg:col-span-7 space-y-5">
          {/* Nhãn định vị ngắn */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#00FFCC]/25 text-slate-900 border border-teal-300/70">
            <span className="w-2 h-2 rounded-full bg-teal-600 animate-pulse" />
            <span>Hệ thống quản lý trọ</span>
          </div>

          {/* Tiêu đề chính */}
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 leading-tight tracking-tight">
            Chọn Phòng Ưng Ý,{" "}
            <span className="text-teal-700">Cuộc sống tiện nghi</span>
          </h1>

          {/* Mô tả súc tích 2 câu */}
          <p className="text-sm text-slate-600 leading-relaxed max-w-xl">
            Không gian sạch đẹp, công khai rõ ràng giá thuê và tiện ích từng
            phòng. Mọi thao tác từ tra cứu, ký hợp đồng đến thanh toán đều gọn
            nhẹ ngay trên điện thoại.
          </p>

          {/* 3 ưu điểm cốt lõi kèm Lucide icon */}
          <div className="flex flex-wrap items-center gap-2.5 pt-0.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700">
              <Sparkles className="w-4 h-4 text-teal-600 shrink-0" />
              AI tư vấn 24/7
            </span>

            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700">
              <Lock className="w-4 h-4 text-indigo-600 shrink-0" />
              Khóa cửa ra vào thông minh
            </span>

            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700">
              <ShieldCheck className="w-4 h-4 text-sky-600 shrink-0" />
              Hợp đồng số & QR tức thì
            </span>
          </div>

          {/* Cụm nút hành động */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => onScrollToSection("tin-dang")}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 border border-teal-300 text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
            >
              <Search className="w-4 h-4 shrink-0" />
              <span>Xem phòng trống</span>
            </button>

            <button
              type="button"
              onClick={onOpenChat}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#00FFCC] hover:bg-[#00e6b8] text-black border border-teal-300 text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 shrink-0" />
              <span>Nhờ AI chọn phòng</span>
            </button>

            <button
              type="button"
              onClick={() => onScrollToSection("bang-gia")}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 hover:border-slate-300 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              <Receipt className="w-4 h-4 text-slate-500 shrink-0" />
              <span>Bảng giá dịch vụ</span>
            </button>
          </div>
        </div>

        {/* Cột phải: Hình ảnh không gian phòng + 4 chỉ số có Lucide icon */}
        <div className="lg:col-span-5 space-y-3">
          {/* Khung ảnh giới thiệu */}
          <div className="relative h-44 sm:h-52 w-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shadow-xs group">
            <img
              src="/img/phongTro.png"
              alt="Không gian phòng trọ tiện nghi tại hệ thống Xóm Trọ"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-slate-900/15 to-transparent" />

            {/* Badge trạng thái góc trên ảnh */}
            <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/95 backdrop-blur-xs text-[11px] font-bold text-slate-900 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Còn {soPhongMo} phòng trống</span>
            </div>

            {/* Chú thích đáy ảnh */}
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 text-white">
              <div>
                <p className="text-xs font-bold leading-snug">
                  Không gian thực tế • An ninh 24/7
                </p>
                <p className="text-[11px] text-slate-200">
                  Khóa thẻ từ • Wifi tốc độ cao • Chốt số tự động
                </p>
              </div>
            </div>
          </div>

          {/* 4 thẻ thông số cốt lõi kèm Lucide icon */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
                <Building2 className="w-4.5 h-4.5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Cơ sở
                </p>
                <p className="text-sm sm:text-base font-bold text-slate-900 truncate">
                  {tongCoSo} khu trọ
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#00FFCC]/15 border border-teal-300 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#00FFCC] flex items-center justify-center text-slate-900 shrink-0">
                <DoorOpen className="w-4.5 h-4.5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-teal-800">
                  Đang trống
                </p>
                <p className="text-sm sm:text-base font-bold text-teal-700 truncate">
                  {soPhongMo} phòng
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
                <Zap className="w-4.5 h-4.5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Giá điện
                </p>
                <p
                  suppressHydrationWarning
                  className="text-sm sm:text-base font-bold text-slate-900 truncate"
                >
                  {formatVND(giaDienNuoc.GiaDien)}
                  <span className="text-[10px] font-medium text-slate-400">
                    /kWh
                  </span>
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600 shrink-0">
                <Droplets className="w-4.5 h-4.5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Giá nước
                </p>
                <p
                  suppressHydrationWarning
                  className="text-sm sm:text-base font-bold text-slate-900 truncate"
                >
                  {formatVND(giaDienNuoc.GiaNuoc)}
                  <span className="text-[10px] font-medium text-slate-400">
                    /m³
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}