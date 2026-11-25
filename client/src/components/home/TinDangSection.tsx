// client/src/components/home/TinDangSection.tsx
"use client";

import { useMemo, useState, SyntheticEvent } from "react";
import Link from "next/link";
import {
  resolveRoomImageUrl,
  DEFAULT_ROOM_FALLBACK_IMAGE,
} from "@/services/phongTro.service";
import { TienIchItem } from "@/services/home.service";

import {
  TinDangItem,
  KhuTroWithContact,
  extractManagerContact,
  formatVND,
  formatDateVN,
} from "./home.data";

export interface RoomImageObject {
  MaAnh: number;
  DuongDan: string;
  AnhChinh: number;
}

interface TinDangSectionProps {
  tinDangList: TinDangItem[];
  filteredTinDangList: TinDangItem[];
  khuTroList: KhuTroWithContact[];
  tienIchList: TienIchItem[];
  loading: boolean;
  selectedKhu: string;
  selectedMucGia: string;
  selectedDienTich: string;
  onChangeKhu: (val: string) => void;
  onChangeMucGia: (val: string) => void;
  onChangeDienTich: (val: string) => void;
  onResetFilters: () => void;
  onSelectContactRoom: (tin: TinDangItem) => void;
  onSelectDetailRoom?: (tin: TinDangItem) => void;
}

export type RoomStatusKey = "Trong" | "DaDatCoc" | "DangThue" | "BaoTri";

export interface RoomStatusDisplay {
  key: RoomStatusKey;
  label: string;
  textClass: string;
  badgeClass: string;
  dotClass: string;
  canBook: boolean;
  sortOrder: number;
}

export function formatDateSafe(dateVal?: string | Date | null): string {
  if (!dateVal) return "Cập nhật mới nhất";
  const result = formatDateVN(String(dateVal));
  return result?.formattedDate || "Cập nhật mới nhất";
}

// Xác định trạng thái phòng, màu chữ/badge và quyền đặt cọc
export function getRoomStatusDisplay(tin: TinDangItem): RoomStatusDisplay {
  const anyTin = tin as any;
  const raw = String(
    anyTin?.TrangThaiPhong ??
      anyTin?.PhongTrangThai ??
      (anyTin?.TrangThai !== "DangHienThi" ? anyTin?.TrangThai : "Trong") ??
      "Trong",
  )
    .trim()
    .toLowerCase();

  // 1. Đã cho thuê
  if (["dangthue", "đang thuê", "dachothue", "đã cho thuê"].includes(raw)) {
    return {
      key: "DangThue",
      label: "Đã cho thuê",
      textClass: "text-red-600",
      badgeClass: "bg-red-50 text-red-600 border-red-300",
      dotClass: "bg-red-500",
      canBook: false,
      sortOrder: 3,
    };
  }

  // 2. Đang bảo trì
  if (["baotri", "bảo trì", "đang bảo trì"].includes(raw)) {
    return {
      key: "BaoTri",
      label: "Đang bảo trì",
      textClass: "text-slate-600",
      badgeClass: "bg-slate-100 text-slate-600 border-slate-300",
      dotClass: "bg-slate-400",
      canBook: false,
      sortOrder: 4,
    };
  }

  // 3. Đang được cọc -> Màu cam, không cho đặt cọc
  if (
    ["dadatcoc", "đã đặt cọc", "danggiucho", "đang giữ chỗ"].includes(raw) ||
    anyTin?.CoTheDatCoc === false
  ) {
    return {
      key: "DaDatCoc",
      label: "Đang được cọc",
      textClass: "text-orange-600",
      badgeClass: "bg-orange-50 text-orange-600 border-orange-300",
      dotClass: "bg-orange-500",
      canBook: false,
      sortOrder: 2,
    };
  }

  // 4. Còn trống & chưa đặt cọc -> Màu xanh lá, cho phép đặt cọc
  return {
    key: "Trong",
    label: "Còn trống",
    textClass: "text-emerald-600",
    badgeClass: "bg-emerald-50 text-emerald-600 border-emerald-300",
    dotClass: "bg-emerald-500",
    canBook: true,
    sortOrder: 1,
  };
}

// Chỉ cho phép hiển thị phòng Còn trống hoặc Đang được cọc ra ngoài trang chủ
export function isVisiblePublicRoom(tin: TinDangItem): boolean {
  if (!tin) return false;
  const statusKey = getRoomStatusDisplay(tin).key;
  return statusKey === "Trong" || statusKey === "DaDatCoc";
}

export function extractRoomImageList(tin: TinDangItem): RoomImageObject[] {
  const anyTin = tin as any;
  const rawList: RoomImageObject[] = [];

  const sourceArray = Array.isArray(anyTin.DanhSachAnh)
    ? anyTin.DanhSachAnh
    : Array.isArray(anyTin.AnhPhongList)
      ? anyTin.AnhPhongList
      : [];

  sourceArray.forEach((item: any, idx: number) => {
    if (
      item &&
      typeof item === "object" &&
      typeof item.DuongDan === "string" &&
      item.DuongDan.trim()
    ) {
      rawList.push({
        MaAnh: Number(item.MaAnh) || idx + 1,
        DuongDan: item.DuongDan.trim(),
        AnhChinh: Number(item.AnhChinh) === 1 ? 1 : 0,
      });
    } else if (typeof item === "string" && item.trim()) {
      rawList.push({
        MaAnh: idx + 1,
        DuongDan: item.trim(),
        AnhChinh: idx === 0 ? 1 : 0,
      });
    }
  });

  if (
    rawList.length === 0 &&
    typeof tin.AnhDaiDien === "string" &&
    tin.AnhDaiDien.trim()
  ) {
    rawList.push({
      MaAnh: 1,
      DuongDan: tin.AnhDaiDien.trim(),
      AnhChinh: 1,
    });
  }

  const seenUrls = new Set<string>();
  const uniqueList: RoomImageObject[] = [];

  for (const img of rawList) {
    const resolved = resolveRoomImageUrl(img.DuongDan);
    if (!seenUrls.has(resolved)) {
      seenUrls.add(resolved);
      uniqueList.push(img);
    }
  }

  uniqueList.sort((a, b) => Number(b.AnhChinh) - Number(a.AnhChinh));
  return uniqueList;
}

export default function TinDangSection({
  tinDangList,
  filteredTinDangList,
  khuTroList,
  tienIchList,
  loading,
  selectedKhu,
  selectedMucGia,
  selectedDienTich,
  onChangeKhu,
  onChangeMucGia,
  onChangeDienTich,
  onResetFilters,
  onSelectContactRoom,
  onSelectDetailRoom,
}: TinDangSectionProps) {
  const [selectedTrangThai, setSelectedTrangThai] = useState<
    "ALL" | "Trong" | "DaDatCoc"
  >("ALL");

  const handleImageError = (e: SyntheticEvent<HTMLImageElement, Event>) => {
    const target = e.currentTarget;
    if (target.src !== DEFAULT_ROOM_FALLBACK_IMAGE) {
      target.onerror = null;
      target.src = DEFAULT_ROOM_FALLBACK_IMAGE;
    }
  };

  // Thống kê chỉ tính phòng Còn trống và Đang được cọc (ẩn hoàn toàn Đang thuê & Bảo trì)
  const roomCounts = useMemo(() => {
    const counts = {
      total: 0,
      Trong: 0,
      DaDatCoc: 0,
    };

    (tinDangList || []).forEach((room) => {
      const st = getRoomStatusDisplay(room);
      if (st.key === "Trong") {
        counts.Trong += 1;
        counts.total += 1;
      } else if (st.key === "DaDatCoc") {
        counts.DaDatCoc += 1;
        counts.total += 1;
      }
    });

    return counts;
  }, [tinDangList]);

  // Chỉ giữ phòng Còn trống & Đang được cọc, sắp xếp: Còn trống -> Đang được cọc
  const displayRooms = useMemo(() => {
    const list = (filteredTinDangList || []).filter((room) => {
      if (!isVisiblePublicRoom(room)) return false;
      if (selectedTrangThai === "ALL") return true;
      return getRoomStatusDisplay(room).key === selectedTrangThai;
    });

    return [...list].sort((a, b) => {
      const orderDiff =
        getRoomStatusDisplay(a).sortOrder - getRoomStatusDisplay(b).sortOrder;
      if (orderDiff !== 0) return orderDiff;
      if (Number(a.MaKhu) !== Number(b.MaKhu)) {
        return Number(a.MaKhu) - Number(b.MaKhu);
      }
      return Number(a.MaPhong) - Number(b.MaPhong);
    });
  }, [filteredTinDangList, selectedTrangThai]);

  const handleResetAll = () => {
    setSelectedTrangThai("ALL");
    onResetFilters();
  };

  const hasActiveFilter =
    selectedKhu !== "ALL" ||
    selectedMucGia !== "ALL" ||
    selectedDienTich !== "ALL" ||
    selectedTrangThai !== "ALL";

  return (
    <section id="tin-dang" className="space-y-6">
      {/* Tiêu đề & thống kê trạng thái phòng */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold bg-[#00FFCC]/30 text-slate-900 mb-2">
            Hệ thống phòng trọ trực tuyến
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Danh Sách Phòng Đang Mở ({displayRooms.length}/{roomCounts.total})
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Hiển thị các phòng{" "}
            <strong className="text-emerald-600">Còn trống</strong> và{" "}
            <strong className="text-orange-600">Đang được cọc</strong> — chỉ
            phòng <strong className="text-emerald-600">Còn trống</strong> mới hỗ
            trợ đặt cọc giữ chỗ.
          </p>
        </div>

        {/* Các nút lọc nhanh (chỉ giữ Tất cả / Còn trống / Đang được cọc) */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedTrangThai("ALL")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
              selectedTrangThai === "ALL"
                ? "bg-slate-900 text-[#00FFCC] border-slate-900"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
            }`}
          >
            Tất cả ({roomCounts.total})
          </button>

          <button
            type="button"
            onClick={() => setSelectedTrangThai("Trong")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
              selectedTrangThai === "Trong"
                ? "bg-emerald-600 text-white border-emerald-600"
                : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
            }`}
          >
            Còn trống ({roomCounts.Trong})
          </button>

          <button
            type="button"
            onClick={() => setSelectedTrangThai("DaDatCoc")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
              selectedTrangThai === "DaDatCoc"
                ? "bg-orange-500 text-white border-orange-500"
                : "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100"
            }`}
          >
            Đang được cọc ({roomCounts.DaDatCoc})
          </button>
        </div>
      </div>

      {/* Bộ lọc đa tiêu chí */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
            Cơ sở / Khu trọ
          </label>
          <select
            value={selectedKhu}
            onChange={(e) => onChangeKhu(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
          >
            <option value="ALL">Tất cả cơ sở ({khuTroList.length})</option>
            {khuTroList.map((khu) => (
              <option key={khu.MaKhu} value={String(khu.MaKhu)}>
                {khu.TenKhu}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
            Mức giá thuê
          </label>
          <select
            value={selectedMucGia}
            onChange={(e) => onChangeMucGia(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
          >
            <option value="ALL">Tất cả mức giá</option>
            <option value="DUOI_25">Dưới 2.500.000 đ</option>
            <option value="TU_25_DEN_40">Từ 2.500.000 - 4.000.000 đ</option>
            <option value="TREN_40">Trên 4.000.000 đ</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
            Diện tích phòng
          </label>
          <select
            value={selectedDienTich}
            onChange={(e) => onChangeDienTich(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
          >
            <option value="ALL">Tất cả diện tích</option>
            <option value="DUOI_20">Dưới 20 m²</option>
            <option value="TU_20_DEN_30">Từ 20 m² - 30 m²</option>
            <option value="TREN_30">Trên 30 m²</option>
          </select>
        </div>

        <div className="flex items-end">
          <button
            type="button"
            onClick={handleResetAll}
            disabled={!hasActiveFilter}
            className={`w-full px-4 py-2.5 rounded-xl text-xs font-bold border transition ${
              hasActiveFilter
                ? "bg-slate-900 hover:bg-slate-800 text-[#00FFCC] border-slate-900 cursor-pointer"
                : "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
            }`}
          >
            Đặt lại bộ lọc
          </button>
        </div>
      </div>

      {/* Danh sách thẻ phòng */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((idx) => (
            <div
              key={idx}
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden animate-pulse"
            >
              <div className="h-48 bg-slate-200" />
              <div className="p-5 space-y-3">
                <div className="h-5 bg-slate-200 rounded w-1/2" />
                <div className="h-4 bg-slate-200 rounded w-1/3" />
                <div className="h-10 bg-slate-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : displayRooms.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-3">
          <p className="text-base font-bold text-slate-800">
            Không tìm thấy phòng trọ nào khớp với bộ lọc hiện tại
          </p>
          <p className="text-xs text-slate-500">
            Vui lòng thử chọn lại cơ sở, mức giá, diện tích hoặc đặt lại bộ lọc.
          </p>
          {hasActiveFilter && (
            <button
              type="button"
              onClick={handleResetAll}
              className="px-4 py-2 rounded-xl bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 text-xs font-bold border border-teal-300 transition cursor-pointer"
            >
              Xem tất cả phòng đang mở
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayRooms.map((tin) => {
            const statusCfg = getRoomStatusDisplay(tin);
            const contact = extractManagerContact(tin, khuTroList);
            const roomImages = extractRoomImageList(tin);
            const mainImage = resolveRoomImageUrl(
              roomImages.length > 0 ? roomImages[0].DuongDan : tin.AnhDaiDien,
            );

            const roomTienIch: TienIchItem[] =
              Array.isArray((tin as any).TienIch) &&
              (tin as any).TienIch.length > 0
                ? (tin as any).TienIch
                : Array.isArray((tin as any).DanhSachTienIch) &&
                    (tin as any).DanhSachTienIch.length > 0
                  ? (tin as any).DanhSachTienIch
                  : [];

            const detailHref = `/tinDang/${tin.MaPhong || tin.MaTin}`;

            return (
              <article
                key={tin.MaPhong || tin.MaTin}
                className="group relative bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md hover:border-teal-300 transition overflow-hidden flex flex-col cursor-pointer"
              >
                {/* Lớp phủ toàn thẻ: bấm vào ảnh hoặc bất kỳ chữ nào bên dưới đều mở chi tiết phòng */}
                {onSelectDetailRoom ? (
                  <button
                    type="button"
                    onClick={() => onSelectDetailRoom(tin)}
                    aria-label={`Xem chi tiết Phòng ${tin.TenPhong} - ${tin.TenKhu}`}
                    className="absolute inset-0 z-10 cursor-pointer bg-transparent border-0 p-0"
                  />
                ) : (
                  <Link
                    href={detailHref}
                    aria-label={`Xem chi tiết Phòng ${tin.TenPhong} - ${tin.TenKhu}`}
                    className="absolute inset-0 z-10"
                  />
                )}

                {/* Ảnh phòng & nhãn khu trọ + trạng thái */}
                <div className="relative h-52 w-full bg-slate-100 overflow-hidden">
                  <img
                    src={mainImage}
                    alt={`Phòng ${tin.TenPhong} - ${tin.TenKhu}`}
                    onError={handleImageError}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />

                  {/* Khu trọ */}
                  <div className="absolute top-3 left-3 max-w-[58%]">
                    <span className="inline-block truncate max-w-full px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-900/80 text-[#00FFCC] backdrop-blur-xs">
                      {tin.TenKhu}
                    </span>
                  </div>

                  {/* Badge trạng thái: Xanh lá (Còn trống) / Cam (Đang được cọc) */}
                  <div className="absolute top-3 right-3">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border shadow-2xs ${statusCfg.badgeClass}`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${statusCfg.dotClass}`}
                      />
                      {statusCfg.label}
                    </span>
                  </div>

                  {/* Số lượng ảnh */}
                  <div className="absolute bottom-3 right-3">
                    <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-900/75 text-white">
                      {roomImages.length || 1} ảnh
                    </span>
                  </div>
                </div>

                {/* Nội dung thông tin phòng */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    {/* Tên phòng + Trạng thái chữ màu */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="text-lg font-bold text-slate-900 group-hover:text-teal-700 transition">
                          Phòng {tin.TenPhong}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                          {(tin as any).DiaChi || tin.TenKhu}
                        </p>
                      </div>

                      <span
                        className={`text-xs font-bold whitespace-nowrap pt-1 ${statusCfg.textClass}`}
                      >
                        {statusCfg.label}
                      </span>
                    </div>

                    {/* Giá & diện tích */}
                    <div className="flex items-baseline justify-between gap-2 pt-2 border-t border-slate-100">
                      <p
                        suppressHydrationWarning
                        className="text-lg font-bold text-teal-700"
                      >
                        {formatVND(Number(tin.Gia))}
                        <span className="text-xs font-medium text-slate-500">
                          {" "}
                          / tháng
                        </span>
                      </p>
                      <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                        {Number(tin.DienTich)} m²
                      </span>
                    </div>

                    {/* Tiện ích nổi bật */}
                    <div className="flex flex-wrap gap-1.5">
                      {roomTienIch.length > 0 ? (
                        <>
                          {roomTienIch.slice(0, 4).map((ti) => (
                            <span
                              key={ti.MaTI}
                              className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#00FFCC]/20 text-slate-800 border border-teal-200"
                            >
                              {ti.TenTI}
                            </span>
                          ))}
                          {roomTienIch.length > 4 && (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600">
                              +{roomTienIch.length - 4}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">
                          Đầy đủ tiện ích tiêu chuẩn ({tienIchList.length})
                        </span>
                      )}
                    </div>

                    {/* Thông tin quản lý cơ sở */}
                    <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 gap-2">
                      <span className="truncate">
                        Quản lý:{" "}
                        <strong className="text-slate-700">
                          {contact.tenQuanLy}
                        </strong>
                      </span>
                      {contact.hasPhoneFromDB && (
                        <span className="font-semibold text-slate-700 shrink-0">
                          {contact.sdtHienThi}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Thanh nút hành động: Chi tiết | Liên hệ | Đặt cọc (nhỏ gọn) */}
                  <footer className="pt-3 border-t border-slate-100 flex items-center gap-2">
                    <span className="px-2.5 py-2 rounded-xl text-xs font-bold bg-slate-100 group-hover:bg-slate-200 text-slate-800 border border-slate-200 transition text-center whitespace-nowrap shrink-0">
                      Chi tiết
                    </span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onSelectContactRoom(tin);
                      }}
                      aria-label={`Liên hệ thuê Phòng ${tin.TenPhong} tại ${tin.TenKhu}`}
                      className="relative z-20 flex-1 px-2.5 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-100 text-slate-900 border border-slate-300 transition text-center whitespace-nowrap cursor-pointer shadow-2xs"
                    >
                      Liên hệ
                    </button>

                    {/* Chỉ cho đặt cọc khi phòng Còn trống và chưa đặt cọc */}
                    {statusCfg.canBook ? (
                      <Link
                        href={`/datPhong/${tin.MaPhong}`}
                        onClick={(e) => e.stopPropagation()}
                        className="relative z-20 flex-1 px-2.5 py-2 rounded-xl bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 border border-teal-300 text-xs font-bold transition text-center no-underline whitespace-nowrap shadow-2xs"
                      >
                        Đặt cọc
                      </Link>
                    ) : (
                      <span
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        className="relative z-20 flex-1 px-2.5 py-2 rounded-xl bg-orange-50 text-orange-600 border border-orange-200 text-xs font-bold text-center whitespace-nowrap cursor-not-allowed select-none"
                      >
                        Đang được cọc
                      </span>
                    )}
                  </footer>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}