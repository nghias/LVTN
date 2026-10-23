// src/app/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import HomeHeader from "../components/layout/homeHeader";
import { useAlertModal } from "@/components/common/AlertModalProvider";
import { resolveRoomImageUrl } from "@/services/phongTro.service";
import {
  HomeService,
  TinDangHome,
  TienIchItem,
  PhuPhiItem,
  KhuTroSummary,
  GiaDienNuocHome,
} from "@/services/home.service";

export default function HomePage() {
  const { showSuccess, showConfirm } = useAlertModal();

  const [tinDangList, setTinDangList] = useState<TinDangHome[]>([]);
  const [tienIchList, setTienIchList] = useState<TienIchItem[]>([]);
  const [phuPhiList, setPhuPhiList] = useState<PhuPhiItem[]>([]);
  const [khuTroList, setKhuTroList] = useState<KhuTroSummary[]>([]);
  const [giaDienNuoc, setGiaDienNuoc] = useState<GiaDienNuocHome>({
    MaGia: 1,
    GiaDien: 3500,
    GiaNuoc: 15000,
    NgayApDung: "2026-01-01",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const data = await HomeService.getHomeData();
        setTinDangList(data?.tinDang || []);
        setTienIchList(data?.tienIch || []);
        setPhuPhiList(data?.phuPhi || []);
        setKhuTroList(data?.khuTro || []);
        if (data?.giaDienNuoc) {
          setGiaDienNuoc(data.giaDienNuoc);
        }
      } catch (error) {
        console.error("Lỗi khi tải dữ liệu trang chủ:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const formatVND = (amount: number) =>
    new Intl.NumberFormat("vi-VN").format(Number(amount) || 0) + " đ";

  const handleBookingConfirm = (item: TinDangHome) => {
    showConfirm(
      `Bạn muốn liên hệ chủ trọ ${item.TenChuTro} (${item.SDTChuTro}) để đặt lịch xem phòng ${item.TenPhong} thuộc ${item.TenKhu}?`,
      "Xác nhận liên hệ xem phòng",
      () => {
        if (typeof navigator !== "undefined" && navigator.clipboard) {
          navigator.clipboard.writeText(item.SDTChuTro);
        }
        showSuccess(
          `Đã sao chép SĐT ${item.SDTChuTro} của chủ trọ ${item.TenChuTro}!`,
          "Sẵn sàng liên hệ",
          2
        );
      },
      "Sao chép SĐT",
      "Đóng"
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/60 text-slate-900">
      {/* 1. Header */}
      <HomeHeader />

      {/* 2. Nội dung chính */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-12">
        {/* DANH SÁCH TIN ĐĂNG PHÒNG TRỌ */}
        <section id="tin-dang" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>

              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                Danh Sách Phòng Đang Mở Cho Thuê ({tinDangList.length})
              </h2>
            </div>
      
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="bg-white border border-slate-200 rounded-3xl p-5 h-96 animate-pulse flex flex-col justify-between"
                >
                  <div className="h-44 bg-slate-100 rounded-2xl" />
                  <div className="space-y-2">
                    <div className="h-4 bg-slate-100 rounded w-2/3" />
                    <div className="h-3 bg-slate-100 rounded w-1/2" />
                  </div>
                  <div className="h-9 bg-slate-100 rounded-full" />
                </div>
              ))}
            </div>
          ) : tinDangList.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center max-w-xl mx-auto shadow-xs">
              <span className="inline-block px-3.5 py-1 rounded-full text-xs font-bold bg-[#00FFCC] text-slate-900 mb-3">
                Không có kết quả
              </span>
              <h3 className="text-lg font-bold text-slate-900">
                Hiện chưa có phòng trọ nào đang mở cho thuê
              </h3>
              <p className="text-xs text-slate-500 mt-1.5">
                Vui lòng quay lại sau hoặc liên hệ chủ trọ để biết thêm thông tin.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tinDangList.map((item) => (
                <div
                  key={item.MaTin}
                  className="group bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs hover:shadow-lg transition flex flex-col"
                >
                  {/* Hình ảnh phòng */}
                  <div className="relative h-52 bg-slate-100 overflow-hidden">
                    <img
                      src={
                        item.DanhSachAnh && item.DanhSachAnh.length > 0
                          ? resolveRoomImageUrl(
                              typeof item.DanhSachAnh[0] === "string"
                                ? item.DanhSachAnh[0]
                                : (item.DanhSachAnh[0] as any).DuongDan
                            )
                          : "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&auto=format&fit=crop&q=80"
                      }
                      alt={item.TieuDe}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                      <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-[#00FFCC] text-slate-900 border border-teal-300 shadow-xs">
                        {item.TenPhong}
                      </span>
                      <span
                        className={`px-3 py-1 rounded-full text-[11px] font-bold text-white shadow-xs ${
                          item.TrangThaiPhong === "Trong"
                            ? "bg-emerald-600"
                            : "bg-amber-600"
                        }`}
                      >
                        {item.TrangThaiPhong === "Trong"
                          ? "Phòng trống"
                          : "Đang thuê"}
                      </span>
                    </div>
                    <div className="absolute bottom-3 right-3 px-3.5 py-1.5 rounded-full text-xs font-bold bg-slate-900/90 text-[#00FFCC] backdrop-blur-xs">
                      {formatVND(item.Gia)} / tháng
                    </div>
                  </div>

                  {/* Thông tin chi tiết */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                        <span className="truncate">{item.TenKhu}</span>
                        <span className="shrink-0 font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full">
                          {item.DienTich} m²
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-slate-900 line-clamp-2 leading-snug">
                        {item.TieuDe}
                      </h3>

                      <p className="text-xs text-slate-500 line-clamp-1">
                        📍 {item.DiaChi}
                      </p>

                      {item.MoTa && (
                        <p className="text-xs text-slate-600 line-clamp-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          {item.MoTa}
                        </p>
                      )}

                      {/* Danh sách tiện ích */}
                      {item.DanhSachTienIch?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {item.DanhSachTienIch.map((ti) => (
                            <span
                              key={ti.MaTI}
                              className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#00FFCC]/20 text-slate-800 border border-[#00FFCC]/50"
                            >
                              {ti.TenTI}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Chân Card: Chủ trọ */}
                    <div className="pt-3.5 border-t border-slate-100 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Chủ trọ quản lý
                        </p>
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {item.TenChuTro}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleBookingConfirm(item)}
                        className="px-4 py-2 bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 border border-teal-300 text-xs font-bold rounded-full shadow-2xs transition cursor-pointer shrink-0"
                      >
                        Liên hệ: {item.SDTChuTro}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* DANH SÁCH KHU TRỌ */}
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
                    ● Có kiểm soát thẻ từ RFID (TheRaVao)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      document
                        .getElementById("tin-dang")
                        ?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="px-4 py-2 rounded-full text-xs font-bold bg-slate-100 hover:bg-[#00FFCC] text-slate-900 transition cursor-pointer"
                  >
                    Xem danh sách phòng
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* BẢNG GIÁ ĐIỆN NƯỚC & PHỤ PHÍ */}
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
            <p className="text-xs text-slate-500 mt-1.5">
              Áp dụng thống nhất khi tính Hóa đơn hàng tháng trên hệ thống (Cập
              nhật ngày:{" "}
              {new Date(giaDienNuoc.NgayApDung).toLocaleDateString("vi-VN")})
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Giá Điện */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Đơn giá Điện (Bảng GiaDienNuoc)
              </span>
              <p className="text-2xl font-bold text-slate-900 my-2">
                {formatVND(giaDienNuoc.GiaDien)}{" "}
                <span className="text-xs font-normal text-slate-500">
                  / kWh
                </span>
              </p>
              <span className="text-[11px] text-slate-500">
                Ghi chỉ số tự động theo đồng hồ riêng từng phòng
              </span>
            </div>

            {/* Giá Nước */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Đơn giá Nước (Bảng GiaDienNuoc)
              </span>
              <p className="text-2xl font-bold text-slate-900 my-2">
                {formatVND(giaDienNuoc.GiaNuoc)}{" "}
                <span className="text-xs font-normal text-slate-500">/ m³</span>
              </p>
              <span className="text-[11px] text-slate-500">
                Đối chiếu chỉ số cũ - mới kèm hình ảnh minh bạch
              </span>
            </div>

            {/* Danh sách Phụ Phí */}
            {phuPhiList.slice(0, 2).map((pp) => (
              <div
                key={pp.MaPP}
                className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between"
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Phụ phí cố định (Bảng PhuPhi)
                </span>
                <p className="text-xl font-bold text-slate-900 my-2">
                  {Number(pp.Gia) === 0
                    ? "Miễn phí"
                    : `${formatVND(pp.Gia)} / tháng`}
                </p>
                <span className="text-xs font-bold text-slate-700">
                  {pp.TenPP}
                </span>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}