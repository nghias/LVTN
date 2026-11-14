// src/components/home/ChiTietTinDangClient.tsx
"use client";

import { useEffect, useMemo, useState, SyntheticEvent } from "react";
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
  formatDateVN,
} from "./home.data";
import {
  extractRoomImageList,
  RoomImageObject,
} from "./TinDangSection";

interface ChiTietTinDangClientProps {
  maTin: number;
}

const DEFAULT_GIA_DIEN_NUOC: GiaDienNuocHome = {
  MaGia: 1,
  GiaDien: 3500,
  GiaNuoc: 15000,
  NgayApDung: "2026-01-01",
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
    DEFAULT_GIA_DIEN_NUOC
  );
    const [phiDichVuList, setPhiDichVuList] =
    useState<PhiDichVuItem[]>([]);
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
      2
    );
  };

  useEffect(() => {
    let isMounted = true;

    async function fetchDetailAndRelated() {
      if (!maTin || isNaN(maTin)) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const homePayload = await HomeService.getHomeData();
        if (!isMounted) return;

        const validList = (homePayload.tinDang || []).filter((t) =>
          isAvailablePublicTinDang(t)
        );
        setAllTinDang(validList);
        setKhuTroList((homePayload.khuTro || []) as KhuTroWithContact[]);
        setSystemTienIch(homePayload.tienIch || []);
        if (homePayload.giaDienNuoc) {
          setGiaDienNuoc(homePayload.giaDienNuoc);
        }

        setPhiDichVuList(homePayload.phiDichVu || []);

        const matchedTin =
          validList.find((t) => Number(t.MaTin) === Number(maTin)) || null;

        setCurrentTin(matchedTin);

        if (matchedTin) {
          const imgs = extractRoomImageList(
            matchedTin as unknown as TinDangItem
          );
          const firstPath = imgs.length > 0 ? imgs[0].DuongDan : null;
          setActiveImageUrl(resolveRoomImageUrl(firstPath));
        }
      } catch (err) {
        console.error("Lỗi khi tải trang chi tiết tin đăng:", err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchDetailAndRelated();
    window.scrollTo({ top: 0, behavior: "smooth" });

    return () => {
      isMounted = false;
    };
  }, [maTin]);

  const detailImageList = useMemo<RoomImageObject[]>(() => {
    if (!currentTin) return [];
    return extractRoomImageList(currentTin as unknown as TinDangItem);
  }, [currentTin]);

  const detailContact = useMemo(() => {
    if (!currentTin) return null;
    return extractManagerContact(
      currentTin as unknown as TinDangItem,
      khuTroList
    );
  }, [currentTin, khuTroList]);

  const detailDiaChi = useMemo(() => {
    if (!currentTin) return "";
    if (currentTin.DiaChi) return String(currentTin.DiaChi);
    const foundKhu = khuTroList.find(
      (k) => Number(k.MaKhu) === Number(currentTin.MaKhu)
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

  const otherTinDangList = useMemo(() => {
    if (!currentTin) return allTinDang;

    const others = allTinDang.filter(
      (item) => Number(item.MaTin) !== Number(currentTin.MaTin)
    );

    others.sort((a, b) => {
      const aSameKhu = Number(a.MaKhu) === Number(currentTin.MaKhu) ? 1 : 0;
      const bSameKhu = Number(b.MaKhu) === Number(currentTin.MaKhu) ? 1 : 0;
      return bSameKhu - aSameKhu;
    });

    if (relatedFilter === "SAME_KHU") {
      return others.filter(
        (item) => Number(item.MaKhu) === Number(currentTin.MaKhu)
      );
    }

    return others;
  }, [allTinDang, currentTin, relatedFilter]);

  const sameKhuCount = useMemo(() => {
    if (!currentTin) return 0;
    return allTinDang.filter(
      (item) =>
        Number(item.MaTin) !== Number(currentTin.MaTin) &&
        Number(item.MaKhu) === Number(currentTin.MaKhu)
    ).length;
  }, [allTinDang, currentTin]);

  const formattedNgayDang = useMemo(() => {
    return formatDateVN(currentTin?.NgayDang).formattedDate;
  }, [currentTin]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <HomeHeader
        {...({
          khuTroCount: khuTroList.length,
          phongTrongCount: allTinDang.length,
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
              <Link href="/#tin-dang" className="hover:text-teal-700 transition">
                Danh sách phòng mở thuê
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
        ) : !currentTin || !detailContact ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center max-w-xl mx-auto shadow-xs space-y-4">
            <span className="inline-block px-3.5 py-1 rounded-full text-xs font-bold bg-[#00FFCC] text-slate-900">
              Tin đăng không khả dụng
            </span>
            <h1 className="text-xl font-bold text-slate-900">
              Không tìm thấy thông tin phòng trọ này hoặc phòng đã được thuê
            </h1>
            <Link
              href="/#tin-dang"
              className="inline-block px-5 py-2.5 bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 border border-teal-300 text-xs font-bold rounded-xl transition"
            >
              Xem toàn bộ phòng trống tại trang chủ
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
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-900/10 text-slate-900 border border-slate-900/20">
                  Còn trống • Mã tin #{currentTin.MaTin}
                </span>
              </div>
              <span
                suppressHydrationWarning
                className="text-xs font-bold text-slate-800"
              >
                Ngày đăng: {formattedNgayDang}
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
                  <div className="text-xs sm:text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 whitespace-pre-line">
                    {currentTin.MoTa ||
                      "Chưa có mô tả chi tiết cho bài đăng này."}
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
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                        ● Đang mở cho thuê
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
                      Liên hệ thuê phòng này
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

        {/* DANH SÁCH CÁC TIN ĐĂNG KHÁC Ở BÊN DƯỚI */}
        <section className="space-y-6 pt-4 border-t border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold bg-[#00FFCC]/30 text-slate-900 mb-1.5">
                Gợi ý phòng trống dành cho bạn
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                Các Tin Đăng Phòng Trống Khác ({otherTinDangList.length})
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
                  Tất cả phòng khác ({allTinDang.length - 1})
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
              const contact = extractManagerContact(
                tin as unknown as TinDangItem,
                khuTroList
              );
              const roomImageObjs = extractRoomImageList(
                tin as unknown as TinDangItem
              );
              const firstImgPath =
                roomImageObjs.length > 0 ? roomImageObjs[0].DuongDan : null;
              const imageUrl = resolveRoomImageUrl(firstImgPath);
              const itemHref = `/tinDang/${tin.MaTin}`;

              return (
                <article
                  key={tin.MaTin}
                  className="group bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition overflow-hidden flex flex-col"
                >
                  <Link
                    href={itemHref}
                    className="relative h-48 w-full bg-slate-100 overflow-hidden block"
                  >
                    <img
                      src={imageUrl}
                      alt={`Phòng ${tin.TenPhong}`}
                      onError={handleImageError}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-3 left-3">
                      <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-900/80 text-[#00FFCC]">
                        {tin.TenKhu}
                      </span>
                    </div>
                  </Link>

                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-baseline justify-between gap-2">
                        <h3 className="text-lg font-bold text-slate-900">
                          <Link href={itemHref} className="hover:text-teal-700">
                            Phòng {tin.TenPhong}
                          </Link>
                        </h3>
                        <span className="text-xs font-semibold text-slate-500">
                          {Number(tin.DienTich)} m²
                        </span>
                      </div>
                      <p
                        suppressHydrationWarning
                        className="mt-1 text-base font-bold text-teal-700"
                      >
                        {formatVND(tin.Gia)} / tháng
                      </p>
                      <h4 className="mt-2 text-sm font-bold text-slate-900 line-clamp-2">
                        <Link href={itemHref} className="hover:text-teal-700">
                          {tin.TieuDe}
                        </Link>
                      </h4>
                    </div>

                    <footer className="pt-3 border-t border-slate-100 flex items-center gap-2">
                      <Link
                        href={itemHref}
                        className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800"
                      >
                        Xem chi tiết
                      </Link>
                      {contact.hasPhoneFromDB && (
                        <a
                          href={contact.zaloUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-2 rounded-xl text-xs font-bold bg-white text-[#0068FF] border border-[#0068FF]"
                        >
                          Zalo
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          setContactRoom(tin as unknown as TinDangItem)
                        }
                        className="flex-1 px-3 py-2 bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 text-xs font-bold rounded-xl cursor-pointer"
                      >
                        Liên hệ thuê
                      </button>
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