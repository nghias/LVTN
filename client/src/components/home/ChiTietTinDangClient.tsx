// src/components/home/ChiTietTinDangClient.tsx
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  SyntheticEvent,
} from "react";
import Link from "next/link";

import HomeHeader from "@/components/layout/homeHeader";
import AppFooter from "@/components/layout/AppFooter";
import ContactRoomModal from "@/components/home/ContactRoomModal";
import AiChatbotWidget from "@/components/home/AiChatbotWidget";
import { useAlertModal } from "@/components/common/AlertModalProvider";
import BangGiaSection from "@/components/home/BangGiaSection";

import {
  HomeService,
  TinDangHome,
  TienIchItem,
  GiaDienNuocHome,
  PhiDichVuItem,
  isAvailablePublicTinDang,
} from "@/services/home.service";
import {
  resolveRoomImageUrl,
  DEFAULT_ROOM_FALLBACK_IMAGE,
} from "@/services/phongTro.service";
import {
  KhuTroWithContact,
  TinDangItem,
  extractManagerContact,
  formatVND,
} from "./home.data";
import {
  extractRoomImageList,
  getRoomStatusDisplay,
  isVisiblePublicRoom,
  RoomImageObject,
} from "./TinDangSection";

interface ChiTietTinDangClientProps {
  maTin: number;
}

const DEFAULT_GIA_DIEN_NUOC: GiaDienNuocHome = {
  MaGia: 1,
  GiaDien: 3800,
  GiaNuoc: 18000,
  NgayApDung: "2026-08-01",
};

export default function ChiTietTinDangClient({
  maTin,
}: ChiTietTinDangClientProps) {
  const { showSuccess } = useAlertModal();

  const [loading, setLoading] = useState<boolean>(true);
  const [currentTin, setCurrentTin] = useState<TinDangHome | null>(null);
  const [allTinDang, setAllTinDang] = useState<TinDangHome[]>([]);
  const [khuTroList, setKhuTroList] = useState<KhuTroWithContact[]>([]);
  const [systemTienIch, setSystemTienIch] = useState<TienIchItem[]>([]);
  const [giaDienNuoc, setGiaDienNuoc] = useState<GiaDienNuocHome>(
    DEFAULT_GIA_DIEN_NUOC,
  );
  const [phiDichVuList, setPhiDichVuList] = useState<PhiDichVuItem[]>([]);
  const [activeImageUrl, setActiveImageUrl] = useState<string>("");
  const [relatedFilter, setRelatedFilter] = useState<"ALL" | "SAME_KHU">("ALL");
  const [contactRoom, setContactRoom] = useState<TinDangItem | null>(null);
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);

  const handleImageError = (e: SyntheticEvent<HTMLImageElement, Event>) => {
    const target = e.currentTarget;
    if (target.src !== DEFAULT_ROOM_FALLBACK_IMAGE) {
      target.onerror = null;
      target.src = DEFAULT_ROOM_FALLBACK_IMAGE;
    }
  };

  const handleCopyPhone = (phone: string, tenNguoiLienHe: string) => {
    if (!phone) return;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(phone);
    }
    showSuccess(
      `Đã sao chép số điện thoại ${phone} của ${tenNguoiLienHe}!`,
      "Sao chép thành công",
      2,
    );
  };

  const fetchDetailAndRelated = useCallback(async () => {
    if (!maTin || isNaN(maTin)) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const homePayload = await HomeService.getHomeData();
      const validList = (homePayload.tinDang || []).filter((t) =>
        isAvailablePublicTinDang(t),
      );

      setAllTinDang(validList);
      setKhuTroList((homePayload.khuTro || []) as KhuTroWithContact[]);
      setSystemTienIch(homePayload.tienIch || []);
      if (homePayload.giaDienNuoc) {
        setGiaDienNuoc(homePayload.giaDienNuoc);
      }
      setPhiDichVuList(homePayload.phiDichVu || []);

      const matchedTin =
        validList.find(
          (t) =>
            Number(t.MaPhong) === Number(maTin) ||
            Number(t.MaTin) === Number(maTin),
        ) || null;

      setCurrentTin(matchedTin);

      if (matchedTin) {
        const imgs = extractRoomImageList(matchedTin as unknown as TinDangItem);
        const firstPath = imgs.length > 0 ? imgs[0].DuongDan : null;
        setActiveImageUrl(resolveRoomImageUrl(firstPath));
      }
    } catch (err) {
      console.error("Lỗi khi tải trang chi tiết phòng:", err);
    } finally {
      setLoading(false);
    }
  }, [maTin]);

  useEffect(() => {
    fetchDetailAndRelated();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [fetchDetailAndRelated]);

  const currentStatus = useMemo(() => {
    if (!currentTin) return null;
    return getRoomStatusDisplay(currentTin as unknown as TinDangItem);
  }, [currentTin]);

  const detailImageList = useMemo<RoomImageObject[]>(() => {
    if (!currentTin) return [];
    return extractRoomImageList(currentTin as unknown as TinDangItem);
  }, [currentTin]);

  const detailContact = useMemo(() => {
    if (!currentTin) return null;
    return extractManagerContact(
      currentTin as unknown as TinDangItem,
      khuTroList,
    );
  }, [currentTin, khuTroList]);

  const detailDiaChi = useMemo(() => {
    if (!currentTin) return "";
    if (currentTin.DiaChi) return String(currentTin.DiaChi);
    const foundKhu = khuTroList.find(
      (k) => Number(k.MaKhu) === Number(currentTin.MaKhu),
    );
    return foundKhu?.DiaChi || "Đang cập nhật địa chỉ";
  }, [currentTin, khuTroList]);

  const detailTienIchList = useMemo<TienIchItem[]>(() => {
    if (!currentTin) return [];
    const anyTin = currentTin as any;
    if (Array.isArray(anyTin.TienIch) && anyTin.TienIch.length > 0) {
      return anyTin.TienIch;
    }
    if (
      Array.isArray(currentTin.DanhSachTienIch) &&
      currentTin.DanhSachTienIch.length > 0
    ) {
      return currentTin.DanhSachTienIch;
    }
    return systemTienIch;
  }, [currentTin, systemTienIch]);

  const phongTrongCount = useMemo(() => {
    return allTinDang.filter(
      (t) => getRoomStatusDisplay(t as unknown as TinDangItem).key === "Trong",
    ).length;
  }, [allTinDang]);

  const otherTinDangList = useMemo(() => {
    if (!currentTin) {
      return allTinDang.filter((item) =>
        isVisiblePublicRoom(item as unknown as TinDangItem),
      );
    }

    const others = allTinDang.filter(
      (item) =>
        Number(item.MaPhong) !== Number(currentTin.MaPhong) &&
        isVisiblePublicRoom(item as unknown as TinDangItem),
    );

    others.sort((a, b) => {
      const aOrder = getRoomStatusDisplay(
        a as unknown as TinDangItem,
      ).sortOrder;
      const bOrder = getRoomStatusDisplay(
        b as unknown as TinDangItem,
      ).sortOrder;
      if (aOrder !== bOrder) return aOrder - bOrder;

      const aSameKhu = Number(a.MaKhu) === Number(currentTin.MaKhu) ? 1 : 0;
      const bSameKhu = Number(b.MaKhu) === Number(currentTin.MaKhu) ? 1 : 0;
      return bSameKhu - aSameKhu;
    });

    if (relatedFilter === "SAME_KHU") {
      return others.filter(
        (item) => Number(item.MaKhu) === Number(currentTin.MaKhu),
      );
    }

    return others;
  }, [allTinDang, currentTin, relatedFilter]);

  const visibleOtherCount = useMemo(() => {
    if (!currentTin) return 0;
    return allTinDang.filter(
      (item) =>
        Number(item.MaPhong) !== Number(currentTin.MaPhong) &&
        isVisiblePublicRoom(item as unknown as TinDangItem),
    ).length;
  }, [allTinDang, currentTin]);

  const sameKhuCount = useMemo(() => {
    if (!currentTin) return 0;
    return allTinDang.filter(
      (item) =>
        Number(item.MaPhong) !== Number(currentTin.MaPhong) &&
        Number(item.MaKhu) === Number(currentTin.MaKhu) &&
        isVisiblePublicRoom(item as unknown as TinDangItem),
    ).length;
  }, [allTinDang, currentTin]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <HomeHeader
        {...({
          khuTroCount: khuTroList.length,
          phongTrongCount,
        } as any)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-12">
        <nav
          aria-label="Breadcrumb"
          className="flex flex-wrap items-center justify-between gap-3 bg-white px-4 py-3 rounded-2xl border border-slate-200 shadow-2xs"
        >
          <ol className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500 list-none m-0 p-0">
            <li>
              <Link href="/" className="hover:text-teal-700 transition">
                Trang chủ
              </Link>
            </li>
            <li>/</li>
            <li>
              <Link
                href="/#tin-dang"
                className="hover:text-teal-700 transition"
              >
                Danh sách phòng trọ
              </Link>
            </li>
            {currentTin && (
              <>
                <li>/</li>
                <li className="text-slate-900 font-bold truncate max-w-xs sm:max-w-md">
                  Phòng {currentTin.TenPhong} ({currentTin.TenKhu})
                </li>
              </>
            )}
          </ol>

          <Link
            href="/"
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-[#00FFCC] text-slate-900 transition"
          >
            ← Quay lại trang chủ
          </Link>
        </nav>

        {loading ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs animate-pulse grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 space-y-4">
              <div className="w-full h-80 sm:h-96 bg-slate-100 rounded-2xl" />
              <div className="h-36 bg-slate-100 rounded-2xl" />
            </div>
            <div className="lg:col-span-5 space-y-5">
              <div className="h-28 bg-slate-100 rounded-2xl" />
              <div className="h-48 bg-slate-100 rounded-2xl" />
            </div>
          </div>
        ) : !currentTin || !detailContact || !currentStatus ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center max-w-xl mx-auto shadow-xs space-y-4">
            <span className="inline-block px-3.5 py-1 rounded-full text-xs font-bold bg-[#00FFCC] text-slate-900">
              Không tìm thấy phòng
            </span>
            <h1 className="text-xl font-bold text-slate-900">
              Không tìm thấy thông tin phòng trọ này trong hệ thống
            </h1>
            <Link
              href="/#tin-dang"
              className="inline-block px-5 py-2.5 bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 border border-teal-300 text-xs font-bold rounded-xl transition"
            >
              Xem toàn bộ phòng tại trang chủ
            </Link>
          </div>
        ) : (
          <article className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-5 sm:px-8 py-4 bg-[#00FFCC] text-slate-900 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="px-3 py-1 rounded-xl text-xs font-bold bg-slate-900 text-[#00FFCC]">
                  {currentTin.TenKhu}
                </span>
                <h1 className="text-lg sm:text-xl font-bold">
                  Chi Tiết Phòng {currentTin.TenPhong}
                </h1>
              </div>

              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${currentStatus.badgeClass}`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${currentStatus.dotClass}`}
                />
                {currentStatus.label}
              </span>
            </div>

            <div className="p-5 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-7 space-y-5">
                <div className="relative w-full h-72 sm:h-96 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200">
                  <img
                    src={activeImageUrl || DEFAULT_ROOM_FALLBACK_IMAGE}
                    alt={`Phòng ${currentTin.TenPhong} - ${currentTin.TenKhu}`}
                    onError={handleImageError}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-3 right-3">
                    <span className="px-3 py-1 rounded-xl text-xs font-bold bg-slate-900/80 text-white backdrop-blur-xs">
                      📷 {detailImageList.length || 1} hình ảnh thực tế
                    </span>
                  </div>
                </div>

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
                          className={`relative w-24 h-16 rounded-xl overflow-hidden border-2 shrink-0 cursor-pointer transition ${
                            isSelected
                              ? "border-[#00FFCC] scale-105 shadow-xs"
                              : "border-slate-200 opacity-75 hover:opacity-100"
                          }`}
                        >
                          <img
                            src={resolved}
                            alt="Ảnh thu nhỏ phòng"
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

                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <h2 className="text-base sm:text-lg font-bold text-slate-900">
                    {currentTin.TieuDe}
                  </h2>
                  <div className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 whitespace-pre-line">
                    {currentTin.MoTa ||
                      "Phòng sạch sẽ, thoáng mát, an ninh đảm bảo 24/7."}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5 flex flex-col justify-between space-y-6">
                <div className="space-y-5">
                  <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-[#00FFCC] text-slate-900">
                        {currentTin.TenKhu}
                      </span>
                      <span
                        className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${currentStatus.badgeClass}`}
                      >
                        ● {currentStatus.label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 pt-1">
                      📍 Địa chỉ: <strong>{detailDiaChi}</strong>
                    </p>
                    <p
                      suppressHydrationWarning
                      className="text-2xl sm:text-3xl font-extrabold text-teal-700 pt-1"
                    >
                      {formatVND(currentTin.Gia)}{" "}
                      <span className="text-sm font-semibold text-slate-500">
                        / tháng
                      </span>
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                      <span className="text-slate-500 block">Diện tích</span>
                      <strong className="text-sm text-slate-900">
                        {Number(currentTin.DienTich)} m<sup>2</sup>
                      </strong>
                    </div>
                    <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                      <span className="text-slate-500 block">Giá điện</span>
                      <strong
                        suppressHydrationWarning
                        className="text-sm text-slate-900"
                      >
                        {formatVND(giaDienNuoc.GiaDien)}/kWh
                      </strong>
                    </div>
                    <div className="p-3.5 rounded-xl border border-slate-200 bg-white col-span-2 sm:col-span-1">
                      <span className="text-slate-500 block">Giá nước</span>
                      <strong
                        suppressHydrationWarning
                        className="text-sm text-slate-900"
                      >
                        {formatVND(giaDienNuoc.GiaNuoc)}/m³
                      </strong>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
                      Tiện ích đi kèm ({detailTienIchList.length})
                    </h3>
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {detailTienIchList.map((ti) => (
                        <div
                          key={ti.MaTI}
                          className="p-3 rounded-xl bg-[#00FFCC]/15 border border-teal-200 flex items-start justify-between gap-2"
                        >
                          <div>
                            <p className="text-xs font-bold text-slate-900">
                              {ti.TenTI}
                            </p>
                            {ti.MoTa && (
                              <p className="text-[11px] text-slate-600 mt-0.5">
                                {ti.MoTa}
                              </p>
                            )}
                          </div>
                          <span className="text-teal-700 font-bold text-xs">
                            ✓
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Người phụ trách ({currentTin.TenKhu})
                      </p>
                      <p className="text-sm font-bold text-slate-900">
                        {detailContact.tenQuanLy}
                      </p>
                    </div>
                    {detailContact.hasPhoneFromDB && (
                      <a
                        href={`tel:${detailContact.sdtHienThi.replace(/\s+/g, "")}`}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-slate-100 text-slate-900 border border-slate-200 transition"
                      >
                        📞 {detailContact.sdtHienThi}
                      </a>
                    )}
                  </div>

                  {/* Nút Đặt cọc theo đúng trạng thái */}
                  {currentStatus.canBook ? (
                    <Link
                      href={`/datPhong/${currentTin.MaPhong}`}
                      className="block w-full px-4 py-3 bg-[#00FFCC] text-black text-xs sm:text-sm font-bold rounded-xl transition text-center no-underline shadow-xs"
                    >
                      Đặt cọc giữ phòng ngay
                    </Link>
                  ) : currentStatus.key === "DaDatCoc" ? (
                    <div className="w-full px-4 py-3 bg-orange-50 text-orange-600 border border-orange-200 text-xs font-bold rounded-xl text-center">
                      Phòng đang được cọc giữ chỗ — không thể đặt cọc thêm
                    </div>
                  ) : currentStatus.key === "DangThue" ? (
                    <div className="w-full px-4 py-3 bg-red-50 text-red-600 border border-red-200 text-xs font-bold rounded-xl text-center">
                      Phòng đã cho thuê — không cho phép đặt cọc
                    </div>
                  ) : (
                    <div className="w-full px-4 py-3 bg-slate-100 text-slate-500 border border-slate-200 text-xs font-bold rounded-xl text-center">
                      Phòng đang bảo trì
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2.5">
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
                      onClick={() =>
                        setContactRoom(currentTin as unknown as TinDangItem)
                      }
                      className="flex-1 px-4 py-2.5 bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 border border-teal-300 text-xs font-bold rounded-xl transition text-center cursor-pointer"
                    >
                      Liên hệ quản lý
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </article>
        )}

        <BangGiaSection
          giaDienNuoc={giaDienNuoc}
          phiDichVuList={phiDichVuList}
        />

        {/* DANH SÁCH CÁC PHÒNG KHÁC Ở BÊN DƯỚI */}
        <section className="space-y-6 pt-4 border-t border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold bg-[#00FFCC]/30 text-slate-900 mb-1.5">
                Tham khảo thêm
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                Các Phòng Trọ Khác Trong Hệ Thống ({otherTinDangList.length})
              </h2>
            </div>

            {currentTin && sameKhuCount > 0 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setRelatedFilter("ALL")}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                    relatedFilter === "ALL"
                      ? "bg-[#00FFCC] text-slate-900 border-teal-300"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  Tất cả phòng khác ({visibleOtherCount})
                </button>
                <button
                  type="button"
                  onClick={() => setRelatedFilter("SAME_KHU")}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                    relatedFilter === "SAME_KHU"
                      ? "bg-[#00FFCC] text-slate-900 border-teal-300"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  Cùng {currentTin.TenKhu} ({sameKhuCount})
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {otherTinDangList.map((tin) => {
              const statusCfg = getRoomStatusDisplay(
                tin as unknown as TinDangItem,
              );
              const roomImageObjs = extractRoomImageList(
                tin as unknown as TinDangItem,
              );
              const firstImgPath =
                roomImageObjs.length > 0 ? roomImageObjs[0].DuongDan : null;
              const imageUrl = resolveRoomImageUrl(firstImgPath);
              const itemHref = `/tinDang/${tin.MaPhong || tin.MaTin}`;

              return (
                <article
                  key={tin.MaPhong || tin.MaTin}
                  className="group relative bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md hover:border-teal-300 transition overflow-hidden flex flex-col cursor-pointer"
                >
                  {/* Lớp phủ toàn thẻ: bấm vào ảnh hoặc chữ đều xem chi tiết phòng */}
                  <Link
                    href={itemHref}
                    aria-label={`Xem chi tiết Phòng ${tin.TenPhong} - ${tin.TenKhu}`}
                    className="absolute inset-0 z-10"
                  />

                  <div className="relative h-48 w-full bg-slate-100 overflow-hidden">
                    <img
                      src={imageUrl}
                      alt={`Phòng ${tin.TenPhong}`}
                      onError={handleImageError}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-3 left-3 max-w-[58%]">
                      <span className="inline-block truncate max-w-full px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-900/80 text-[#00FFCC]">
                        {tin.TenKhu}
                      </span>
                    </div>
                    <div className="absolute top-3 right-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${statusCfg.badgeClass}`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${statusCfg.dotClass}`}
                        />
                        {statusCfg.label}
                      </span>
                    </div>
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-baseline justify-between gap-2">
                        <h3 className="text-lg font-bold text-slate-900 group-hover:text-teal-700 transition">
                          Phòng {tin.TenPhong}
                        </h3>
                        <span
                          className={`text-xs font-extrabold ${statusCfg.textClass}`}
                        >
                          {statusCfg.label}
                        </span>
                      </div>
                      <div className="mt-1 flex items-baseline justify-between gap-2">
                        <p
                          suppressHydrationWarning
                          className="text-base font-bold text-teal-700"
                        >
                          {formatVND(tin.Gia)} / tháng
                        </p>
                        <span className="text-xs font-semibold text-slate-500">
                          {Number(tin.DienTich)} m²
                        </span>
                      </div>
                    </div>

                    <footer className="pt-3 border-t border-slate-100 flex items-center gap-2">
                      <span className="px-2.5 py-2 rounded-xl text-xs font-bold bg-slate-100 group-hover:bg-slate-200 text-slate-800 border border-slate-200 transition text-center whitespace-nowrap shrink-0">
                        Chi tiết
                      </span>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setContactRoom(tin as unknown as TinDangItem);
                        }}
                        className="relative z-20 flex-1 px-2.5 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-100 text-slate-900 border border-slate-300 transition text-center whitespace-nowrap cursor-pointer shadow-2xs"
                      >
                        Liên hệ
                      </button>

                      {statusCfg.canBook ? (
                        <Link
                          href={`/datPhong/${tin.MaPhong}`}
                          onClick={(e) => e.stopPropagation()}
                          className="relative z-20 flex-1 px-2.5 py-2 bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 border border-teal-300 text-xs font-bold rounded-xl text-center no-underline whitespace-nowrap transition shadow-2xs"
                        >
                          Đặt cọc
                        </Link>
                      ) : statusCfg.key === "DaDatCoc" ? (
                        <span
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          className="relative z-20 flex-1 px-2.5 py-2 bg-orange-50 text-orange-600 border border-orange-200 text-xs font-bold rounded-xl text-center whitespace-nowrap cursor-not-allowed select-none"
                        >
                          Đang được cọc
                        </span>
                      ) : (
                        <span
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          className="relative z-20 flex-1 px-2.5 py-2 bg-red-50 text-red-600 border border-red-200 text-xs font-bold rounded-xl text-center whitespace-nowrap cursor-not-allowed select-none"
                        >
                          Đã cho thuê
                        </span>
                      )}
                    </footer>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </main>

      <ContactRoomModal
        contactRoom={contactRoom}
        khuTroList={khuTroList}
        onClose={() => setContactRoom(null)}
        onCopyPhone={handleCopyPhone}
      />

      <AiChatbotWidget
        isOpen={isChatOpen}
        onToggleOpen={() => setIsChatOpen((prev) => !prev)}
        onClose={() => setIsChatOpen(false)}
        tinDangList={allTinDang as unknown as TinDangItem[]}
        khuTroList={khuTroList}
        giaDienNuoc={giaDienNuoc}
        onSelectContactRoom={(room) => setContactRoom(room)}
      />

      <AppFooter />
    </div>
  );
}