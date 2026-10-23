// src/app/page.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
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

  // State cho bộ lọc đa tiêu chí (6 tiêu chí - Đã bỏ thanh tìm kiếm từ khóa)
  const [selectedKhu, setSelectedKhu] = useState<string>("all");
  const [areaRange, setAreaRange] = useState<string>("all");
  const [priceRange, setPriceRange] = useState<string>("all");
  const [utilityFilter, setUtilityFilter] = useState<string>("all");
  const [selectedTienIch, setSelectedTienIch] = useState<number[]>([]);
  const [selectedPhuPhi, setSelectedPhuPhi] = useState<number[]>([]);

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

  // Bật/tắt chọn Tiện ích đi kèm
  const toggleTienIch = (maTI: number) => {
    setSelectedTienIch((prev) =>
      prev.includes(maTI) ? prev.filter((id) => id !== maTI) : [...prev, maTI]
    );
  };

  // Bật/tắt chọn Phí dịch vụ hàng tháng (Phụ phí)
  const togglePhuPhi = (maPP: number) => {
    setSelectedPhuPhi((prev) =>
      prev.includes(maPP) ? prev.filter((id) => id !== maPP) : [...prev, maPP]
    );
  };

  // Đặt lại toàn bộ bộ lọc
  const resetFilters = () => {
    setSelectedKhu("all");
    setAreaRange("all");
    setPriceRange("all");
    setUtilityFilter("all");
    setSelectedTienIch([]);
    setSelectedPhuPhi([]);
  };

  // Xử lý lọc đa tiêu chí
  const filteredTinDang = useMemo(() => {
    return tinDangList.filter((item) => {
      // 1. Lọc theo từng cơ sở (KhuTro)
      const matchKhu =
        selectedKhu === "all" || String(item.MaKhu) === selectedKhu;

      // 2. Lọc theo diện tích phòng (DienTich)
      const dienTich = Number(item.DienTich) || 0;
      let matchArea = true;
      if (areaRange === "duoi-20") matchArea = dienTich < 20;
      else if (areaRange === "20-30")
        matchArea = dienTich >= 20 && dienTich <= 30;
      else if (areaRange === "tren-30") matchArea = dienTich > 30;

      // 3. Lọc theo mức giá thuê (Gia)
      const giaPhong = Number(item.Gia) || 0;
      let matchPrice = true;
      if (priceRange === "duoi-2tr") matchPrice = giaPhong < 2000000;
      else if (priceRange === "2tr-3tr")
        matchPrice = giaPhong >= 2000000 && giaPhong <= 3000000;
      else if (priceRange === "tren-3tr") matchPrice = giaPhong > 3000000;

      // 4. Lọc theo đơn giá điện nước (GiaDienNuoc)
      const donGiaDien = Number(
        (item as any).GiaDien ?? giaDienNuoc?.GiaDien ?? 0
      );
      const donGiaNuoc = Number(
        (item as any).GiaNuoc ?? giaDienNuoc?.GiaNuoc ?? 0
      );
      let matchUtility = true;
      if (utilityFilter === "dien-duoi-4k") {
        matchUtility = donGiaDien > 0 && donGiaDien <= 4000;
      } else if (utilityFilter === "nuoc-duoi-20k") {
        matchUtility = donGiaNuoc > 0 && donGiaNuoc <= 20000;
      } else if (utilityFilter === "dien-nuoc-tiet-kiem") {
        matchUtility = donGiaDien <= 4000 && donGiaNuoc <= 20000;
      }

      // 5. Lọc theo các tiện ích đi kèm (ChiTietTienIch)
      const matchTienIch =
        selectedTienIch.length === 0 ||
        selectedTienIch.every((maTI) =>
          item.DanhSachTienIch?.some((ti) => Number(ti.MaTI) === Number(maTI))
        );

      // 6. Lọc theo các khoản phí dịch vụ hàng tháng (PhuPhi)
      const roomPhuPhi: { MaPP: number }[] | undefined = (item as any)
        .DanhSachPhuPhi;
      const matchPhuPhi =
        selectedPhuPhi.length === 0 ||
        (Array.isArray(roomPhuPhi)
          ? selectedPhuPhi.every((maPP) =>
              roomPhuPhi.some((pp) => Number(pp.MaPP) === Number(maPP))
            )
          : selectedPhuPhi.every((maPP) =>
              phuPhiList.some((pp) => Number(pp.MaPP) === Number(maPP))
            ));

      return (
        matchKhu &&
        matchArea &&
        matchPrice &&
        matchUtility &&
        matchTienIch &&
        matchPhuPhi
      );
    });
  }, [
    tinDangList,
    selectedKhu,
    areaRange,
    priceRange,
    utilityFilter,
    selectedTienIch,
    selectedPhuPhi,
    giaDienNuoc,
    phuPhiList,
  ]);

  const formatVND = (amount: number) =>
    new Intl.NumberFormat("vi-VN").format(Number(amount) || 0) + " đ";

  // Tương tác với AlertModalProvider
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
        {/* HERO BANNER & BỘ LỌC ĐA TIÊU CHÍ */}
        <section className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-lg relative overflow-hidden">
          <div className="max-w-3xl mx-auto text-center">
            <span className="inline-block px-3.5 py-1 rounded-full text-xs font-bold bg-[#00FFCC] text-slate-900 mb-4 shadow-2xs">
              Hệ thống Quản lý Xóm Trọ Thông Minh
            </span>
            <h1 className="text-2xl sm:text-4xl font-bold text-slate-900 leading-snug">
              Tìm Phòng Trọ Nhanh Chóng, Minh Bạch Điện Nước & An Ninh Thẻ Từ
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-3 max-w-2xl mx-auto">
              Tra cứu trực tiếp phòng trống theo từng cơ sở, diện tích, mức giá
              thuê, đơn giá điện nước, các tiện ích đi kèm và các khoản phí dịch
              vụ hàng tháng.
            </p>
          </div>

          {/* Khung lọc đa tiêu chí (6 tiêu chí) */}
          <div className="mt-8 bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4">
            {/* Hàng 1: Cơ sở, Diện tích, Mức giá thuê, Đơn giá điện nước & Nút đặt lại */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
              {/* 1. Lọc theo từng Cơ sở (KhuTro) */}
              <div className="lg:col-span-3">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 px-1">
                  Cơ sở / Khu trọ
                </label>
                <select
                  value={selectedKhu}
                  onChange={(e) => setSelectedKhu(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-800 focus:outline-none focus:border-[#00FFCC] cursor-pointer"
                >
                  <option value="all">
                    Tất cả cơ sở ({khuTroList.length})
                  </option>
                  {khuTroList.map((khu) => (
                    <option key={khu.MaKhu} value={khu.MaKhu.toString()}>
                      {khu.TenKhu}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Lọc theo Diện tích (DienTich) */}
              <div className="lg:col-span-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 px-1">
                  Diện tích phòng
                </label>
                <select
                  value={areaRange}
                  onChange={(e) => setAreaRange(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-800 focus:outline-none focus:border-[#00FFCC] cursor-pointer"
                >
                  <option value="all">Mọi diện tích</option>
                  <option value="duoi-20">Dưới 20m²</option>
                  <option value="20-30">Từ 20m² - 30m²</option>
                  <option value="tren-30">Trên 30m²</option>
                </select>
              </div>

              {/* 3. Lọc theo Mức giá thuê (Gia) */}
              <div className="lg:col-span-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 px-1">
                  Mức giá thuê
                </label>
                <select
                  value={priceRange}
                  onChange={(e) => setPriceRange(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-800 focus:outline-none focus:border-[#00FFCC] cursor-pointer"
                >
                  <option value="all">Mọi mức giá</option>
                  <option value="duoi-2tr">Dưới 2 triệu</option>
                  <option value="2tr-3tr">Từ 2 - 3 triệu</option>
                  <option value="tren-3tr">Trên 3 triệu</option>
                </select>
              </div>

              {/* 4. Lọc theo Đơn giá điện nước (Bảng GiaDienNuoc) */}
              <div className="lg:col-span-3">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 px-1">
                  Đơn giá điện nước
                </label>
                <select
                  value={utilityFilter}
                  onChange={(e) => setUtilityFilter(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-800 focus:outline-none focus:border-[#00FFCC] cursor-pointer"
                >
                  <option value="all">
                    {giaDienNuoc
                      ? `Niêm yết: Điện ${Number(giaDienNuoc.GiaDien).toLocaleString("vi-VN")}đ • Nước ${Number(giaDienNuoc.GiaNuoc).toLocaleString("vi-VN")}đ`
                      : "Tất cả mức giá điện nước"}
                  </option>
                  <option value="dien-duoi-4k">
                    Giá điện ≤ 4.000đ/kWh ({Number(giaDienNuoc.GiaDien).toLocaleString("vi-VN")}đ)
                  </option>
                  <option value="nuoc-duoi-20k">
                    Giá nước ≤ 20.000đ/m³ ({Number(giaDienNuoc.GiaNuoc).toLocaleString("vi-VN")}đ)
                  </option>
                  <option value="dien-nuoc-tiet-kiem">
                    Điện ≤ 4.000đ/kWh & Nước ≤ 20.000đ/m³
                  </option>
                </select>
              </div>

              {/* Nút Đặt lại bộ lọc */}
              <div className="lg:col-span-2 flex items-end">
                <button
                  type="button"
                  onClick={resetFilters}
                  className="w-full px-4 py-2.5 rounded-xl text-xs font-bold bg-white hover:bg-[#00FFCC]/20 text-slate-700 border border-slate-200 transition cursor-pointer"
                >
                  Đặt lại bộ lọc
                </button>
              </div>
            </div>

            {/* Hàng 2: 5. Lọc theo Tiện ích đi kèm (Bảng TienIch) */}
            <div className="pt-3 border-t border-slate-200/80 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold text-slate-500 mr-1">
                Tiện ích đi kèm:
              </span>
              {tienIchList.map((ti) => {
                const isSelected = selectedTienIch.includes(ti.MaTI);
                return (
                  <button
                    key={ti.MaTI}
                    type="button"
                    onClick={() => toggleTienIch(ti.MaTI)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
                      isSelected
                        ? "bg-[#00FFCC] text-slate-900 border border-teal-300 shadow-2xs"
                        : "bg-white text-slate-600 hover:bg-[#00FFCC]/20 border border-slate-200"
                    }`}
                  >
                    {ti.TenTI}
                  </button>
                );
              })}
            </div>

            {/* Hàng 3: 6. Lọc theo Các khoản phí dịch vụ hàng tháng (Bảng PhuPhi) */}
            {phuPhiList && phuPhiList.length > 0 && (
              <div className="pt-3 border-t border-slate-200/80 flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold text-slate-500 mr-1">
                  Phí dịch vụ hàng tháng:
                </span>
                {phuPhiList.map((pp) => {
                  const isSelected = selectedPhuPhi.includes(pp.MaPP);
                  return (
                    <button
                      key={pp.MaPP}
                      type="button"
                      onClick={() => togglePhuPhi(pp.MaPP)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
                        isSelected
                          ? "bg-[#00FFCC] text-slate-900 border border-teal-300 shadow-2xs"
                          : "bg-white text-slate-600 hover:bg-[#00FFCC]/20 border border-slate-200"
                      }`}
                    >
                      {pp.TenPP} (
                      {Number(pp.Gia) === 0
                        ? "Miễn phí"
                        : `${Number(pp.Gia).toLocaleString("vi-VN")}đ/tháng`}
                      )
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* DANH SÁCH TIN ĐĂNG PHÒNG TRỌ (Bảng TinDang + Phong + AnhPhong) */}
        <section id="tin-dang" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold bg-[#00FFCC]/30 text-slate-900 mb-1.5">
                Cập nhật trực tiếp từ CSDL
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                Danh Sách Phòng Đang Mở Cho Thuê ({filteredTinDang.length})
              </h2>
            </div>

            <Link
              href="/nguoiThue/thongKe"
              className="self-start sm:self-auto px-4 py-2 rounded-full text-xs font-bold bg-white hover:bg-[#00FFCC]/20 text-slate-800 border border-slate-200 no-underline transition"
            >
              Đã là cư dân? Vào trang Thống kê →
            </Link>
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
          ) : filteredTinDang.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center max-w-xl mx-auto shadow-xs">
              <span className="inline-block px-3.5 py-1 rounded-full text-xs font-bold bg-[#00FFCC] text-slate-900 mb-3">
                Không có kết quả
              </span>
              <h3 className="text-lg font-bold text-slate-900">
                Không tìm thấy phòng trọ phù hợp với tiêu chí lọc
              </h3>
              <p className="text-xs text-slate-500 mt-1.5">
                Bạn hãy thử chọn lại cơ sở, diện tích, khoảng giá hoặc bỏ bớt
                các thẻ tiện ích đang chọn.
              </p>
              <button
                type="button"
                onClick={resetFilters}
                className="mt-5 px-5 py-2.5 bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 border border-teal-300 text-xs font-bold rounded-full shadow-xs transition cursor-pointer"
              >
                Hiển thị tất cả phòng
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTinDang.map((item) => (
                <div
                  key={item.MaTin}
                  className="group bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs hover:shadow-lg transition flex flex-col"
                >
                  {/* Hình ảnh phòng (Bảng AnhPhong) */}
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

                  {/* Thông tin chi tiết (Bảng TinDang + Phong + KhuTro) */}
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

                      {/* Danh sách tiện ích (Bảng ChiTietTienIch) */}
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

                    {/* Chân Card: Thông tin Chủ trọ (Bảng NguoiDung) */}
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

        {/* DANH SÁCH KHU TRỌ TRỰC THUỘC (Bảng KhuTro) */}
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
                      setSelectedKhu(khu.MaKhu.toString());
                      document
                        .getElementById("tin-dang")
                        ?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="px-4 py-2 rounded-full text-xs font-bold bg-slate-100 hover:bg-[#00FFCC] text-slate-900 transition cursor-pointer"
                  >
                    Lọc phòng khu này
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* BẢNG GIÁ ĐIỆN NƯỚC & PHỤ PHÍ NIÊM YẾT (Bảng GiaDienNuoc & PhuPhi) */}
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

            {/* Danh sách Phụ Phí (Bảng PhuPhi) */}
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