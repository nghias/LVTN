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
              Quản Lý Trọ Thông Minh
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              Tiện nghi • Minh bạch • Hỗ trợ 24/7
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-bold text-slate-900 leading-tight tracking-tight">
            Tìm Phòng Ưng Ý – An Tâm Tận Hưởng Cuộc Sống Số
          </h1>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Chào mừng bạn đến với cổng thông tin chính thức của hệ thống nhà
            trọ. Không còn nỗi lo tin ảo hay chi phí mập mờ, chúng tôi mang đến
            trải nghiệm thuê phòng hiện đại và minh bạch: từ{" "}
            <strong>tra cứu phòng trống thực tế</strong>,{" "}
            <strong>trợ lý ảo hổ trợ tư vấn chọn phòng</strong>,{" "}
            <strong>ký hợp đồng an toàn và bảo mật</strong>, đến{" "}
            <strong>theo dõi chỉ số nước tự động</strong> và{" "}
            <strong>hóa đơn tự động gửi mỗi thanh toán nhanh chóng</strong>
          </p>

          {/* Chỉ số tổng quan thời gian thực */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Hệ thống cơ sở
              </p>
              <p className="text-lg font-bold text-slate-900 mt-0.5">
                3 cơ sở
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Phòng trống
              </p>
              <p className="text-lg font-bold text-teal-700 mt-0.5">
                {soPhongMo} phòng
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Giá điện
              </p>
              <p className="text-lg font-bold text-slate-900 mt-0.5">
                {formatVND(giaDienNuoc.GiaDien)}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Giá nước
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
              Xem phòng ngay
            </button>
            <button
              type="button"
              onClick={onOpenChat}
              className="px-5 py-2.5 bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 border border-teal-300 text-xs sm:text-sm font-bold rounded-xl shadow-2xs transition cursor-pointer"
            >
              Nhờ AI tư vấn chọn phòng
            </button>
            <button
              type="button"
              onClick={() => onScrollToSection("bang-gia")}
              className="px-5 py-2.5 bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 border border-teal-300 text-xs sm:text-sm font-bold rounded-xl shadow-2xs transition cursor-pointer"
            >
              Xem bảng giá dịch vụ
            </button>
          </div>
        </div>

        {/* Cột phải: Quy trình trải nghiệm dành cho khách thuê */}
        <div className="lg:col-span-5 bg-[#F0FDF4] text-slate-900 rounded-3xl p-6 sm:p-7 space-y-5 border border-emerald-200 shadow-sm">
          <div className="flex items-center justify-between gap-2 border-b border-emerald-200 pb-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                Trải nghiệm thuê phòng 4.0
              </span>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 mt-0.5">
                4 Bước Thuê & Ở Thật Dễ Dàng
              </h2>
            </div>

            <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
              Smart Living
            </span>
          </div>

          <div className="space-y-3.5">
            {VONG_LAP_VAN_HANH.map((item) => (
              <div
                key={item.buoc}
                className="p-3.5 rounded-2xl bg-white border border-emerald-100 shadow-sm flex items-start gap-3.5 transition hover:border-emerald-300 hover:shadow-md"
              >
                <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white font-bold text-xs flex items-center justify-center shrink-0">
                  {item.buoc}
                </div>

                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                      {item.tieuDe}
                    </h3>

                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                      {item.nhan}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-600 leading-relaxed">
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