// src/components/home/TinDangSection.tsx
"use client";

import { useMemo, useState, useEffect, SyntheticEvent } from "react";
import {
  resolveRoomImageUrl,
  DEFAULT_ROOM_FALLBACK_IMAGE,
} from "@/services/phongTro.service";
import { TienIchItem, isAvailablePublicTinDang } from "@/services/home.service";
import {
  TinDangItem,
  KhuTroWithContact,
  extractManagerContact,
} from "./home.data";

interface RoomImageObject {
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
}

// Trích xuất danh sách ảnh theo đúng cấu trúc { MaAnh, DuongDan, AnhChinh } của ChiTietPhongTroPage
// Ưu tiên ảnh có AnhChinh = 1 lên đầu tiên
function extractRoomImageList(tin: TinDangItem): RoomImageObject[] {
  const anyTin = tin as any;
  const rawList: RoomImageObject[] = [];

  // 1. Ưu tiên lấy từ DanhSachAnh hoặc AnhPhongList (mảng object từ bảng AnhPhong)
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

  // 2. Nếu mảng rỗng nhưng có AnhDaiDien thì bổ sung từ AnhDaiDien
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

  // 3. Khử trùng lặp theo URL đã chuẩn hóa và sắp xếp AnhChinh = 1 lên đầu
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
}: TinDangSectionProps) {
  const [selectedDetailTin, setSelectedDetailTin] =
    useState<TinDangItem | null>(null);
  // Dùng activeImageUrl giống hệt ChiTietPhongTroPage
  const [activeImageUrl, setActiveImageUrl] = useState<string>("");

  // Chốt chặn tự chuyển về ảnh dự phòng nếu có ảnh dữ liệu mẫu cũ bị 404
  const handleImageError = (e: SyntheticEvent<HTMLImageElement, Event>) => {
    const target = e.currentTarget;
    if (target.src !== DEFAULT_ROOM_FALLBACK_IMAGE) {
      target.onerror = null;
      target.src = DEFAULT_ROOM_FALLBACK_IMAGE;
    }
  };

  // Mở Modal và gán activeImageUrl giống hệt ChiTietPhongTroPage
  const handleOpenDetailModal = (tin: TinDangItem) => {
    setSelectedDetailTin(tin);
    const images = extractRoomImageList(tin);
    const firstImg = images.length > 0 ? images[0].DuongDan : null;
    setActiveImageUrl(resolveRoomImageUrl(firstImg));
  };

  const handleCloseDetailModal = () => {
    setSelectedDetailTin(null);
    setActiveImageUrl("");
  };

  useEffect(() => {
    if (!selectedDetailTin) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleCloseDetailModal();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedDetailTin]);

  // Chốt chặn lọc chỉ giữ lại phòng Còn trống & tin đăng Đang hiển thị
  const validTotalTinDangList = useMemo(() => {
    return tinDangList.filter((tin) => isAvailablePublicTinDang(tin as any));
  }, [tinDangList]);

  const validFilteredTinDangList = useMemo(() => {
    return filteredTinDangList.filter((tin) =>
      isAvailablePublicTinDang(tin as any),
    );
  }, [filteredTinDangList]);

  // Tạo JSON-LD Structured Data
  const jsonLdSchema = useMemo(() => {
    return {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "Danh Sách Phòng Trọ Đang Mở Cho Thuê",
      description:
        "Danh sách phòng trọ đang trống, cập nhật giá thuê, diện tích và thông tin liên hệ quản lý trực tiếp.",
      numberOfItems: validFilteredTinDangList.length,
      itemListElement: validFilteredTinDangList.map((tin, index) => {
        const roomImageObjs = extractRoomImageList(tin);
        const roomImages =
          roomImageObjs.length > 0
            ? roomImageObjs.map((img) => resolveRoomImageUrl(img.DuongDan))
            : [DEFAULT_ROOM_FALLBACK_IMAGE];

        return {
          "@type": "ListItem",
          position: index + 1,
          item: {
            "@type": "Accommodation",
            "@id": `#phong-tro-${tin.MaTin}`,
            name: `${tin.TieuDe} - Phòng ${tin.TenPhong} (${tin.TenKhu})`,
            description:
              tin.MoTa ||
              `Cho thuê phòng ${tin.TenPhong} tại ${tin.TenKhu}, diện tích ${Number(tin.DienTich)}m².`,
            image: roomImages,
            floorSize: {
              "@type": "QuantitativeValue",
              value: Number(tin.DienTich),
              unitCode: "MTK",
            },
            offers: {
              "@type": "Offer",
              price: Number(tin.Gia),
              priceCurrency: "VND",
              availability: "https://schema.org/InStock",
            },
          },
        };
      }),
    };
  }, [validFilteredTinDangList]);

  const detailImageList = useMemo<RoomImageObject[]>(() => {
    return selectedDetailTin ? extractRoomImageList(selectedDetailTin) : [];
  }, [selectedDetailTin]);

  const detailContact = useMemo(() => {
    return selectedDetailTin
      ? extractManagerContact(selectedDetailTin, khuTroList)
      : null;
  }, [selectedDetailTin, khuTroList]);

  const detailDiaChi = useMemo(() => {
    if (!selectedDetailTin) return "";
    const anyTin = selectedDetailTin as any;
    if (anyTin.DiaChi) return String(anyTin.DiaChi);
    const foundKhu = khuTroList.find(
      (k) => Number(k.MaKhu) === Number(selectedDetailTin.MaKhu),
    );
    return foundKhu?.DiaChi || "Đang cập nhật địa chỉ";
  }, [selectedDetailTin, khuTroList]);

  // Lấy danh sách tiện ích của phòng (TienIch hoặc DanhSachTienIch) giống ChiTietPhongTroPage
  const detailTienIchList = useMemo<TienIchItem[]>(() => {
    if (!selectedDetailTin) return [];
    const anyTin = selectedDetailTin as any;
    if (Array.isArray(anyTin.TienIch) && anyTin.TienIch.length > 0) {
      return anyTin.TienIch;
    }
    if (
      Array.isArray(anyTin.DanhSachTienIch) &&
      anyTin.DanhSachTienIch.length > 0
    ) {
      return anyTin.DanhSachTienIch;
    }
    return tienIchList;
  }, [selectedDetailTin, tienIchList]);

  return (
    <section
      id="tin-dang"
      aria-labelledby="tin-dang-heading"
      className="space-y-6"
    >
      {!loading && validFilteredTinDangList.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdSchema) }}
        />
      )}

      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold bg-[#00FFCC]/30 text-slate-900 mb-1.5">
            Tra cứu phòng trống trực tuyến
          </span>
          <h2
            id="tin-dang-heading"
            className="text-xl sm:text-2xl font-bold text-slate-900"
          >
            Danh Sách Phòng Đang Mở Cho Thuê ({validFilteredTinDangList.length}/
            {validTotalTinDangList.length})
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Hỗ trợ bộ lọc đa tiêu chí theo cơ sở, diện tích, mức giá thuê và xem
            chi tiết toàn bộ hình ảnh thực tế của từng phòng
          </p>
        </div>
      </header>

      {/* Bộ lọc đa tiêu chí */}
      <form
        role="search"
        aria-label="Bộ lọc tìm kiếm phòng trọ"
        onSubmit={(e) => e.preventDefault()}
        className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4"
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="space-y-1">
            <label
              htmlFor="filter-khu-tro"
              className="block text-[11px] font-bold uppercase tracking-wider text-slate-500"
            >
              Cơ sở / Khu trọ
            </label>
            <select
              id="filter-khu-tro"
              name="khu"
              value={selectedKhu}
              onChange={(e) => onChangeKhu(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-500 text-slate-900"
            >
              <option value="ALL">Tất cả cơ sở ({khuTroList.length})</option>
              {khuTroList.map((khu) => (
                <option key={khu.MaKhu} value={String(khu.MaKhu)}>
                  {khu.TenKhu}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label
              htmlFor="filter-muc-gia"
              className="block text-[11px] font-bold uppercase tracking-wider text-slate-500"
            >
              Mức giá thuê / tháng
            </label>
            <select
              id="filter-muc-gia"
              name="gia"
              value={selectedMucGia}
              onChange={(e) => onChangeMucGia(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-500 text-slate-900"
            >
              <option value="ALL">Tất cả mức giá</option>
              <option value="DUOI_25">Dưới 2.500.000 đ</option>
              <option value="TU_25_DEN_40">Từ 2.500.000 đ - 4.000.000 đ</option>
              <option value="TREN_40">Trên 4.000.000 đ</option>
            </select>
          </div>

          <div className="space-y-1">
            <label
              htmlFor="filter-dien-tich"
              className="block text-[11px] font-bold uppercase tracking-wider text-slate-500"
            >
              Diện tích sử dụng
            </label>
            <select
              id="filter-dien-tich"
              name="dientich"
              value={selectedDienTich}
              onChange={(e) => onChangeDienTich(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-500 text-slate-900"
            >
              <option value="ALL">Tất cả diện tích</option>
              <option value="DUOI_20">Dưới 20 m²</option>
              <option value="TU_20_DEN_30">Từ 20 m² - 30 m²</option>
              <option value="TREN_30">Trên 30 m²</option>
            </select>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-500 mr-1">
              Tiện ích tiêu chuẩn tại hệ thống:
            </span>
            <ul className="flex flex-wrap items-center gap-1.5 list-none m-0 p-0">
              {tienIchList.length > 0 ? (
                tienIchList.slice(0, 6).map((ti) => (
                  <li
                    key={ti.MaTI}
                    className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700"
                  >
                    {ti.TenTI}
                  </li>
                ))
              ) : (
                <>
                  <li className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">
                    Đồng hồ IoT riêng
                  </li>
                  <li className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">
                    Wifi tốc độ cao
                  </li>
                  <li className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">
                    Kiểm soát vân tay / RFID
                  </li>
                </>
              )}
            </ul>
          </div>

          {(selectedKhu !== "ALL" ||
            selectedMucGia !== "ALL" ||
            selectedDienTich !== "ALL") && (
            <button
              type="button"
              onClick={onResetFilters}
              className="px-3 py-1 rounded-lg text-xs font-bold bg-slate-100 hover:bg-[#00FFCC] text-slate-900 transition cursor-pointer"
            >
              Đặt lại bộ lọc
            </button>
          )}
        </div>
      </form>

      {/* Lưới danh sách tin đăng */}
      {loading ? (
        <div
          aria-busy="true"
          aria-label="Đang tải danh sách phòng trọ"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="bg-white border border-slate-200 rounded-2xl p-5 h-80 animate-pulse flex flex-col justify-between"
            >
              <div className="h-10 bg-slate-100 rounded-xl" />
              <div className="space-y-3">
                <div className="h-5 bg-slate-100 rounded w-2/3" />
                <div className="h-4 bg-slate-100 rounded w-1/2" />
                <div className="h-16 bg-slate-100 rounded-xl w-full" />
              </div>
              <div className="h-9 bg-slate-100 rounded-xl" />
            </div>
          ))}
        </div>
      ) : validFilteredTinDangList.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center max-w-xl mx-auto shadow-xs">
          <span className="inline-block px-3.5 py-1 rounded-full text-xs font-bold bg-[#00FFCC] text-slate-900 mb-3">
            Không có kết quả phù hợp
          </span>
          <h3 className="text-lg font-bold text-slate-900">
            Hiện chưa tìm thấy phòng trống đang mở tin khớp với tiêu chí lọc
          </h3>
          <p className="text-xs text-slate-500 mt-1.5">
            Bạn có thể đặt lại bộ lọc, hỏi Trợ lý ảo AI Chatbot ở góc màn hình
            hoặc liên hệ trực tiếp chủ trọ để được hỗ trợ.
          </p>
          {validTotalTinDangList.length > 0 && (
            <button
              type="button"
              onClick={onResetFilters}
              className="mt-4 px-4 py-2 bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 border border-teal-300 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              Xem toàn bộ {validTotalTinDangList.length} phòng đang mở
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {validFilteredTinDangList.map((tin, index) => {
            const contact = extractManagerContact(tin, khuTroList);
            const roomImageObjs = extractRoomImageList(tin);
            const firstImgPath =
              roomImageObjs.length > 0 ? roomImageObjs[0].DuongDan : null;
            const imageUrl = resolveRoomImageUrl(firstImgPath);

            const isValidDate =
              tin.NgayDang && !isNaN(new Date(tin.NgayDang).getTime());
            const formattedDate = isValidDate
              ? new Date(tin.NgayDang!).toLocaleDateString("vi-VN")
              : "Mới cập nhật";
            const isoDate = isValidDate
              ? new Date(tin.NgayDang!).toISOString()
              : undefined;

            const seoImageAlt = `Phòng ${tin.TenPhong} - ${tin.TenKhu}`;

            return (
              <article
                key={tin.MaTin}
                id={`phong-tro-${tin.MaTin}`}
                itemScope
                itemType="https://schema.org/Accommodation"
                className="group bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition overflow-hidden flex flex-col"
              >
                <figure
                  onClick={() => handleOpenDetailModal(tin)}
                  className="relative h-48 w-full bg-slate-100 overflow-hidden m-0 cursor-pointer"
                  title="Nhấn để xem thông tin chi tiết và toàn bộ ảnh phòng"
                >
                  <img
                    src={imageUrl}
                    alt={seoImageAlt}
                    onError={handleImageError}
                    itemProp="image"
                    loading={index < 3 ? "eager" : "lazy"}
                    decoding="async"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-3 left-3">
                    <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-900/80 text-[#00FFCC] backdrop-blur-xs">
                      {tin.TenKhu}
                    </span>
                  </div>
                  <div className="absolute top-3 right-3">
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold border bg-emerald-100 text-emerald-800 border-emerald-300">
                      Còn trống
                    </span>
                  </div>
                  <div className="absolute bottom-3 right-3">
                    <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-900/80 text-white backdrop-blur-xs flex items-center gap-1">
                      📷 {roomImageObjs.length || 1} ảnh
                    </span>
                  </div>
                </figure>

                <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-500">
                    Mã tin #{tin.MaTin}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#00FFCC]/25 text-slate-900 border border-teal-200">
                    Đăng ngày:{" "}
                    {isoDate ? (
                      <time dateTime={isoDate}>{formattedDate}</time>
                    ) : (
                      formattedDate
                    )}
                  </span>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-baseline justify-between gap-2">
                        <h3
                          onClick={() => handleOpenDetailModal(tin)}
                          className="text-lg font-bold text-slate-900 hover:text-teal-700 cursor-pointer transition"
                        >
                          Phòng {tin.TenPhong}
                        </h3>
                        <span
                          itemProp="floorSize"
                          itemScope
                          itemType="https://schema.org/QuantitativeValue"
                          className="text-xs font-semibold text-slate-500"
                        >
                          Diện tích:{" "}
                          <span itemProp="value">{Number(tin.DienTich)}</span>{" "}
                          <meta itemProp="unitCode" content="MTK" />
                          m²
                        </span>
                      </div>

                      <p
                        itemProp="offers"
                        itemScope
                        itemType="https://schema.org/Offer"
                        className="mt-1 text-base font-bold text-teal-700"
                      >
                        <meta itemProp="priceCurrency" content="VND" />
                        <meta
                          itemProp="price"
                          content={String(Number(tin.Gia))}
                        />
                        <link
                          itemProp="availability"
                          href="https://schema.org/InStock"
                        />
                        {Number(tin.Gia).toLocaleString("vi-VN")} đ / tháng
                      </p>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-slate-100">
                      <h4
                        itemProp="name"
                        onClick={() => handleOpenDetailModal(tin)}
                        className="text-sm font-bold text-slate-900 line-clamp-2 leading-snug hover:text-teal-700 cursor-pointer transition"
                      >
                        {tin.TieuDe}
                      </h4>
                      <p
                        itemProp="description"
                        className="text-xs text-slate-600 line-clamp-3 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100"
                      >
                        {tin.MoTa || "Chưa có mô tả chi tiết cho bài đăng này."}
                      </p>
                    </div>
                  </div>

                  <footer className="pt-3.5 border-t border-slate-100 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Quản lý {tin.TenKhu}
                        </p>
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {contact.tenQuanLy}
                        </p>
                      </div>

                      {contact.hasPhoneFromDB ? (
                        <a
                          href={`tel:${contact.sdtHienThi.replace(/\s+/g, "")}`}
                          title={`Gọi ngay cho ${contact.tenQuanLy}`}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 shrink-0 transition"
                        >
                          📞 {contact.sdtHienThi}
                        </a>
                      ) : (
                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-800 shrink-0">
                          📞 Chưa cập nhật SĐT
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenDetailModal(tin)}
                        className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 transition text-center shrink-0 cursor-pointer"
                      >
                        Xem chi tiết
                      </button>

                      {contact.hasPhoneFromDB && (
                        <a
                          href={contact.zaloUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-2 rounded-xl text-xs font-bold bg-white hover:bg-blue-50 text-[#0068FF] border border-[#0068FF] transition text-center shrink-0"
                          title={`Nhắn Zalo cho ${contact.tenQuanLy}`}
                        >
                          Zalo
                        </a>
                      )}

                      <button
                        type="button"
                        onClick={() => onSelectContactRoom(tin)}
                        aria-label={`Liên hệ thuê Phòng ${tin.TenPhong} tại ${tin.TenKhu}`}
                        className="flex-1 px-3 py-2 bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 border border-teal-300 text-xs font-bold rounded-xl shadow-2xs transition cursor-pointer"
                      >
                        Liên hệ thuê
                      </button>
                    </div>
                  </footer>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* MODAL XEM CHI TIẾT PHÒNG (Áp dụng thiết kế & cơ chế của ChiTietPhongTroPage) */}
      {selectedDetailTin && detailContact && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-room-detail-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto"
          onClick={handleCloseDetailModal}
        >
          <div
            className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-5xl overflow-hidden my-auto max-h-[92vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div className="px-5 py-4 bg-[#00FFCC] text-slate-900 flex items-center justify-between gap-3 shrink-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[#00FFCC] text-slate-900">
                  {selectedDetailTin.TenKhu}
                </span>
                <h3
                  id="modal-room-detail-title"
                  className="text-base sm:text-lg font-bold"
                >
                  Chi Tiết Phòng {selectedDetailTin.TenPhong}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-900/10 text-slate-900 border border-slate-900/20">
                  Đang trống • Mã tin #{selectedDetailTin.MaTin}
                </span>
              </div>

              <button
                type="button"
                onClick={handleCloseDetailModal}
                aria-label="Đóng cửa sổ chi tiết phòng"
                className="w-8 h-8 rounded-xl bg-slate-900/10 hover:bg-slate-900/20 text-slate-900 flex items-center justify-center font-bold text-sm transition cursor-pointer shrink-0"
              >
                ✕
              </button>
            </div>

            {/* Body Modal (Bố cục 12 cột đồng bộ với ChiTietPhongTroPage) */}
            <div className="p-5 sm:p-8 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Cột trái: Bộ sưu tập toàn bộ ảnh phòng (AnhPhong) */}
              <div className="lg:col-span-7 space-y-3">
                <div className="w-full h-64 sm:h-80 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200">
                  <img
                    src={activeImageUrl || DEFAULT_ROOM_FALLBACK_IMAGE}
                    alt={selectedDetailTin.TenPhong}
                    onError={handleImageError}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Dải toàn bộ ảnh thu nhỏ của phòng giống hệt ChiTietPhongTroPage */}
                {detailImageList.length > 0 && (
                  <div className="flex items-center gap-2.5 overflow-x-auto pb-2 pt-1">
                    {detailImageList.map((img) => {
                      const resolved = resolveRoomImageUrl(img.DuongDan);
                      const isSelected = activeImageUrl === resolved;
                      return (
                        <button
                          key={img.MaAnh}
                          type="button"
                          onClick={() => setActiveImageUrl(resolved)}
                          className={`relative w-20 h-16 rounded-xl overflow-hidden border-2 shrink-0 cursor-pointer transition ${
                            isSelected
                              ? "border-[#00FFCC] scale-105"
                              : "border-slate-200 opacity-75 hover:opacity-100"
                          }`}
                        >
                          <img
                            src={resolved}
                            alt="Thumb"
                            onError={handleImageError}
                            className="w-full h-full object-cover"
                          />
                          {Number(img.AnhChinh) === 1 && (
                            <span className="absolute bottom-0 inset-x-0 bg-[#00FFCC] text-slate-900 text-[9px] font-bold text-center">
                              Ảnh chính
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Mô tả bài đăng */}
                <div className="space-y-1.5 pt-2">
                  <h4 className="text-sm font-bold text-slate-900">
                    {selectedDetailTin.TieuDe}
                  </h4>
                  <div className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-200 whitespace-pre-line">
                    {selectedDetailTin.MoTa ||
                      "Chưa có mô tả chi tiết cho bài đăng này."}
                  </div>
                </div>
              </div>

              {/* Cột phải: Thông số phòng, Tiện ích & Liên hệ */}
              <div className="lg:col-span-5 flex flex-col justify-between space-y-5">
                <div className="space-y-5">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-[#00FFCC] text-slate-900">
                      {selectedDetailTin.TenKhu}
                    </span>
                    <p className="text-xs text-slate-600">{detailDiaChi}</p>
                    <p className="text-2xl font-extrabold text-teal-700 pt-1">
                      {Number(selectedDetailTin.Gia).toLocaleString("vi-VN")} đ
                      / tháng
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3.5 rounded-xl border border-slate-200">
                      <span className="text-slate-500 block">Diện tích</span>
                      <strong className="text-sm text-slate-900">
                        {Number(selectedDetailTin.DienTich)} m²
                      </strong>
                    </div>
                    <div className="p-3.5 rounded-xl border border-slate-200">
                      <span className="text-slate-500 block">Trạng thái</span>
                      <strong className="text-sm text-emerald-700">
                        Đang trống
                      </strong>
                    </div>
                  </div>

                  {/* Danh sách Tiện ích đi kèm đồng bộ từ ChiTietPhongTroPage */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
                      Tiện ích đi kèm ({detailTienIchList.length})
                    </h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {detailTienIchList.length > 0 ? (
                        detailTienIchList.map((ti) => (
                          <div
                            key={ti.MaTI}
                            className="p-3 rounded-xl bg-[#00FFCC]/15 border border-teal-200 flex items-start justify-between gap-2"
                          >
                            <div>
                              <p className="text-xs font-bold text-slate-900">
                                {ti.TenTI}
                              </p>
                              {(ti as any).MoTa && (
                                <p className="text-[11px] text-slate-600 mt-0.5">
                                  {(ti as any).MoTa}
                                </p>
                              )}
                            </div>
                            <span className="text-teal-700 font-bold text-xs">
                              ✓
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-slate-400 italic">
                          Phòng này chưa được cấu hình tiện ích.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Thông tin liên hệ Quản lý & Nút thuê */}
                <div className="pt-4 border-t border-slate-200 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Người phụ trách ({selectedDetailTin.TenKhu})
                      </p>
                      <p className="text-sm font-bold text-slate-900">
                        {detailContact.tenQuanLy}
                      </p>
                    </div>
                    {detailContact.hasPhoneFromDB && (
                      <a
                        href={`tel:${detailContact.sdtHienThi.replace(/\s+/g, "")}`}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-900 transition"
                      >
                        📞 {detailContact.sdtHienThi}
                      </a>
                    )}
                  </div>

                  <div className="flex items-center gap-2.5">
                    {detailContact.hasPhoneFromDB && (
                      <a
                        href={detailContact.zaloUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2.5 rounded-xl text-xs font-bold bg-white hover:bg-blue-50 text-[#0068FF] border border-[#0068FF] transition text-center"
                      >
                        Nhắn Zalo
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        const roomToContact = selectedDetailTin;
                        handleCloseDetailModal();
                        onSelectContactRoom(roomToContact);
                      }}
                      className="flex-1 px-4 py-2.5 bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 border border-teal-300 text-xs font-bold rounded-xl transition cursor-pointer"
                    >
                      Liên hệ thuê phòng này
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
