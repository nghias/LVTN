// src/components/home/HeroSection.tsx
"use client";

import { GiaDienNuocHome } from "@/services/home.service";
import { VONG_LAP_VAN_HANH, formatVND } from "./home.data";

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
      className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-xs overflow-hidden"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Cột trái: Thông điệp cốt lõi */}
        <div className="lg:col-span-7 space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-[#00FFCC] text-slate-900">
              Nền tảng Quản lý Nhà trọ Đa cơ sở
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              Tích hợp IoT & Trí tuệ nhân tạo (AI)
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-bold text-slate-900 leading-tight tracking-tight">
            Giải Pháp Chuyển Đổi Số & Vận Hành Nhà Trọ{" "}
            <span className="text-teal-700 underline decoration-[#00FFCC] decoration-4 underline-offset-4">
              Khép Kín Toàn Diện
            </span>
          </h1>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Thay vì một sàn rao vặt đại trà hay quản lý thủ công bằng sổ sách
            giấy tờ, file Excel rời rạc, hệ thống thiết lập vòng lặp quản lý nội
            bộ khép kín cho mô hình hộ kinh doanh nhà trọ đa cơ sở: từ{" "}
            <strong>tra cứu phòng trống minh bạch</strong>,{" "}
            <strong>trợ lý ảo AI tư vấn 24/7</strong>,{" "}
            <strong>số hóa hợp đồng & thủ tục tạm trú</strong>, đến{" "}
            <strong>thu thập chỉ số điện nước tự động qua IoT</strong> và{" "}
            <strong>đối soát thanh toán QR hàng tháng</strong>.
          </p>

          {/* Chỉ số tổng quan thời gian thực */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Cơ sở vận hành
              </p>
              <p className="text-lg font-bold text-slate-900 mt-0.5">
                {soKhuTro > 0 ? `${soKhuTro} khu` : "Đa cơ sở"}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Phòng đang mở
              </p>
              <p className="text-lg font-bold text-teal-700 mt-0.5">
                {soPhongMo} phòng
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Đơn giá điện
              </p>
              <p className="text-lg font-bold text-slate-900 mt-0.5">
                {formatVND(giaDienNuoc.GiaDien)}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Đơn giá nước
              </p>
              <p className="text-lg font-bold text-slate-900 mt-0.5">
                {formatVND(giaDienNuoc.GiaNuoc)}
              </p>
            </div>
          </div>

          {/* Nút điều hướng nhanh */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => onScrollToSection("tin-dang")}
              className="px-5 py-2.5 bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 border border-teal-300 text-xs sm:text-sm font-bold rounded-xl shadow-2xs transition cursor-pointer"
            >
              Tìm phòng trống ngay
            </button>
            <button
              type="button"
              onClick={onOpenChat}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-[#00FFCC] text-xs sm:text-sm font-bold rounded-xl transition cursor-pointer"
            >
              Hỏi Trợ lý ảo AI
            </button>
            <button
              type="button"
              onClick={() => onScrollToSection("bang-gia")}
              className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs sm:text-sm font-semibold rounded-xl transition cursor-pointer"
            >
              Xem bảng giá niêm yết
            </button>
          </div>
        </div>

        {/* Cột phải: Sơ đồ 4 bước Vòng lặp vận hành khép kín */}
        <div className="lg:col-span-5 bg-slate-900 text-white rounded-3xl p-6 sm:p-7 space-y-5 border border-slate-800">
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#00FFCC]">
                Tự động hóa quy trình
              </span>
              <h2 className="text-base sm:text-lg font-bold text-white mt-0.5">
                Vòng Lặp Vận Hành Khép Kín
              </h2>
            </div>
            <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#00FFCC]/15 text-[#00FFCC] border border-[#00FFCC]/30">
              IoT + AI Core
            </span>
          </div>

          <div className="space-y-3.5">
            {VONG_LAP_VAN_HANH.map((item) => (
              <div
                key={item.buoc}
                className="p-3.5 rounded-2xl bg-slate-800/70 border border-slate-700/80 flex items-start gap-3.5"
              >
                <div className="w-9 h-9 rounded-xl bg-[#00FFCC] text-slate-900 font-bold text-xs flex items-center justify-center shrink-0">
                  {item.buoc}
                </div>
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-xs sm:text-sm font-bold text-white">
                      {item.tieuDe}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-900 text-[#00FFCC] border border-slate-700 shrink-0">
                      {item.nhan}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    {item.moTa}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}