// src/app/page.tsx
"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import HomeHeader from "../components/layout/homeHeader";
import { useAlertModal } from "@/components/common/AlertModalProvider";
import {
  HomeService,
  TienIchItem,
  PhiDichVuItem,
  GiaDienNuocHome,
} from "@/services/home.service";

import {
  PUBLIC_TIN_DANG_URL,
  TinDangItem,
  KhuTroWithContact,
} from "@/components/home/home.data";
import HeroSection from "@/components/home/HeroSection";
import EcosystemSection from "@/components/home/EcosystemSection";
import TinDangSection from "@/components/home/TinDangSection";
import KhuTroSection from "@/components/home/KhuTroSection";
import BangGiaSection from "@/components/home/BangGiaSection";
import ContactRoomModal from "@/components/home/ContactRoomModal";
import AiChatbotWidget from "@/components/home/AiChatbotWidget";

export type { TrangThaiTin, TinDangItem } from "@/components/home/home.data";

export default function HomePage() {
  const { showSuccess } = useAlertModal();

  // State dữ liệu từ API
  const [tinDangList, setTinDangList] = useState<TinDangItem[]>([]);
  const [tienIchList, setTienIchList] = useState<TienIchItem[]>([]);
  const [phiDichVuList, setPhiDichVuList] = useState<PhiDichVuItem[]>([]);
  const [khuTroList, setKhuTroList] = useState<KhuTroWithContact[]>([]);
  const [giaDienNuoc, setGiaDienNuoc] = useState<GiaDienNuocHome>({
    MaGia: 1,
    GiaDien: 3500,
    GiaNuoc: 15000,
    NgayApDung: "2026-01-01",
  });
  const [loading, setLoading] = useState<boolean>(true);

  // State bộ lọc đa tiêu chí
  const [selectedKhu, setSelectedKhu] = useState<string>("ALL");
  const [selectedMucGia, setSelectedMucGia] = useState<string>("ALL");
  const [selectedDienTich, setSelectedDienTich] = useState<string>("ALL");

  // State điều khiển Modal liên hệ & Hộp thoại AI
  const [contactRoom, setContactRoom] = useState<TinDangItem | null>(null);
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);

  // Tải dữ liệu công khai cho Trang chủ
  const fetchHomeAndTinDang = useCallback(async () => {
    try {
      setLoading(true);

      const [tinDangResponse, homeData] = await Promise.all([
        fetch(PUBLIC_TIN_DANG_URL, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        }).catch(() => null),
        HomeService.getHomeData().catch(() => null),
      ]);

      let loadedFromPublicRoute = false;

      if (tinDangResponse && tinDangResponse.ok) {
        const result = await tinDangResponse.json().catch(() => null);
        const rawList =
          result?.data?.tinDangList ||
          (Array.isArray(result?.data) ? result.data : null);

        if (result?.success && Array.isArray(rawList)) {
          const danhSachCongKhai = (rawList as TinDangItem[]).filter(
            (tin) => !tin.TrangThai || tin.TrangThai === "DangHienThi"
          );
          setTinDangList(danhSachCongKhai);
          loadedFromPublicRoute = true;
        }
      }

      if (!loadedFromPublicRoute && homeData?.tinDang) {
        setTinDangList(homeData.tinDang as unknown as TinDangItem[]);
      }

      if (homeData) {
        setTienIchList(homeData.tienIch || []);
        setPhiDichVuList(homeData.phiDichVu || []);
        setKhuTroList((homeData.khuTro as KhuTroWithContact[]) || []);
        if (homeData.giaDienNuoc) {
          setGiaDienNuoc(homeData.giaDienNuoc);
        }
      }
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu trang chủ & tin đăng:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHomeAndTinDang();
  }, [fetchHomeAndTinDang]);

  // Lọc danh sách tin đăng theo đa tiêu chí
  const filteredTinDangList = useMemo(() => {
    return tinDangList.filter((tin) => {
      if (selectedKhu !== "ALL" && String(tin.MaKhu) !== selectedKhu) {
        return false;
      }

      const gia = Number(tin.Gia) || 0;
      if (selectedMucGia === "DUOI_25" && gia >= 2500000) return false;
      if (
        selectedMucGia === "TU_25_DEN_40" &&
        (gia < 2500000 || gia > 4000000)
      ) {
        return false;
      }
      if (selectedMucGia === "TREN_40" && gia <= 4000000) return false;

      const dienTich = Number(tin.DienTich) || 0;
      if (selectedDienTich === "DUOI_20" && dienTich >= 20) return false;
      if (
        selectedDienTich === "TU_20_DEN_30" &&
        (dienTich < 20 || dienTich > 30)
      ) {
        return false;
      }
      if (selectedDienTich === "TREN_30" && dienTich <= 30) return false;

      return true;
    });
  }, [tinDangList, selectedKhu, selectedMucGia, selectedDienTich]);

  const handleResetFilters = () => {
    setSelectedKhu("ALL");
    setSelectedMucGia("ALL");
    setSelectedDienTich("ALL");
  };

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const handleCopyPhone = (phone: string, tenQuanLy: string) => {
    if (!phone) return;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(phone);
    }
    showSuccess(
      `Đã sao chép số điện thoại ${phone} của ${tenQuanLy}!`,
      "Sao chép thành công",
      2
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/60 text-slate-900">
      <HomeHeader />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-12">
        <HeroSection
          soKhuTro={khuTroList.length}
          soPhongMo={tinDangList.length}
          giaDienNuoc={giaDienNuoc}
          onScrollToSection={scrollToSection}
          onOpenChat={() => setIsChatOpen(true)}
        />

        <EcosystemSection onScrollToSection={scrollToSection} />

        <TinDangSection
          tinDangList={tinDangList}
          filteredTinDangList={filteredTinDangList}
          khuTroList={khuTroList}
          tienIchList={tienIchList}
          loading={loading}
          selectedKhu={selectedKhu}
          selectedMucGia={selectedMucGia}
          selectedDienTich={selectedDienTich}
          onChangeKhu={setSelectedKhu}
          onChangeMucGia={setSelectedMucGia}
          onChangeDienTich={setSelectedDienTich}
          onResetFilters={handleResetFilters}
          onSelectContactRoom={setContactRoom}
        />

        <KhuTroSection
          khuTroList={khuTroList}
          onSelectKhuAndScroll={(maKhu) => {
            setSelectedKhu(maKhu);
            scrollToSection("tin-dang");
          }}
        />

        <BangGiaSection giaDienNuoc={giaDienNuoc} phiDichVuList={phiDichVuList} />
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
        tinDangList={tinDangList}
        khuTroList={khuTroList}
        giaDienNuoc={giaDienNuoc}
      />
    </div>
  );
}