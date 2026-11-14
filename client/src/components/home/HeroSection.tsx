// src/components/home/HeroSection.tsx
"use client";

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
  return (
    <section
      id="gioi-thieu"
      className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs overflow-hidden"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
        {/* Cột trái: Tiêu đề, 2 câu giới thiệu tóm tắt & nút hành động */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-[#00FFCC] text-slate-900">
              Hệ Thống Quản Lý Nhà Trọ Đa Cơ Sở
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              AI Tư Vấn 24/7 • Đồng Hồ IoT • Thanh Toán QR
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 leading-tight tracking-tight">
            Tìm Phòng Ưng Ý – An Tâm Tận Hưởng Cuộc Sống Số
          </h1>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Hệ thống quản lý tập trung nhiều cơ sở, minh bạch diện tích, tiện
            ích từng phòng (gác lửng, máy lạnh, quạt, phí rác, wifi) cùng 
              Trợ lý ảo AI Chatbot tư vấn 24/7 
            giúp bạn tra cứu và chọn ngay phòng trống phù hợp nhất. Mọi thủ tục 
              hợp đồng, tạm trú - tạm vắng & báo sự cố đều trực tuyến và mã hóa
              bảo mật 
            , kết hợp 
              đồng hồ điện tử IoT tự động chốt điện nước 
            chính xác và 
              thanh toán mã QR gạch nợ tức thì 
            .
          </p>

          {/* Nút điều hướng nhanh */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => onScrollToSection("tin-dang")}
              className="px-5 py-2.5 bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 border border-teal-300 text-xs font-bold rounded-xl shadow-2xs transition cursor-pointer"
            >
              Xem phòng ngay
            </button>
            <button
              type="button"
              onClick={onOpenChat}
              className="px-5 py-2.5 bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 border border-teal-300 text-xs font-bold rounded-xl shadow-2xs transition cursor-pointer"
            >
              Nhờ AI tư vấn chọn phòng
            </button>
            <button
              type="button"
              onClick={() => onScrollToSection("bang-gia")}
              className="px-5 py-2.5 bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 border border-teal-300 text-xs font-bold rounded-xl shadow-2xs transition cursor-pointer"
            >
              Xem bảng giá dịch vụ
            </button>
          </div>
        </div>

        {/* Cột phải: 4 chỉ số thực tế để khách nắm nhanh thông tin cốt lõi */}
        <div className="lg:col-span-5 xl:col-span-4 grid grid-cols-2 gap-3">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Hệ thống cơ sở
            </p>
            <p className="text-lg sm:text-xl font-bold text-slate-900 mt-1">
              {soKhuTro > 0 ? `${soKhuTro} cơ sở` : "3 cơ sở"}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#00FFCC]/15 border border-teal-300">
            <p className="text-[10px] font-bold uppercase tracking-wider text-teal-800">
              Phòng đang trống
            </p>
            <p className="text-lg sm:text-xl font-bold text-teal-700 mt-1">
              {soPhongMo} phòng
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Giá điện
            </p>
            <p className="text-lg sm:text-xl font-bold text-slate-900 mt-1">
              {formatVND(giaDienNuoc.GiaDien)}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Giá nước
            </p>
            <p className="text-lg sm:text-xl font-bold text-slate-900 mt-1">
              {formatVND(giaDienNuoc.GiaNuoc)}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}