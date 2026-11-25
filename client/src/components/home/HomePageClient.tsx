// src/components/home/HomePageClient.tsx
"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import HomeHeader from "@/components/layout/homeHeader";
import { useAlertModal } from "@/components/common/AlertModalProvider";
import {
  HomeService,
  TienIchItem,
  PhiDichVuItem,
  GiaDienNuocHome,
} from "@/services/home.service";

import {
  TinDangItem,
  KhuTroWithContact,
} from "@/components/home/home.data";
import HeroSection from "@/components/home/HeroSection";
import TinDangSection, {
  getRoomStatusDisplay,
} from "@/components/home/TinDangSection";
import KhuTroSection from "@/components/home/KhuTroSection";
import BangGiaSection from "@/components/home/BangGiaSection";
import ContactRoomModal from "@/components/home/ContactRoomModal";
import AiChatbotWidget from "@/components/home/AiChatbotWidget";
import Appfooter from "@/components/layout/AppFooter";

export interface HomePageClientProps {
  initialTinDangList: TinDangItem[];
  initialTienIchList: TienIchItem[];
  initialPhiDichVuList: PhiDichVuItem[];
  initialKhuTroList: KhuTroWithContact[];
  initialGiaDienNuoc: GiaDienNuocHome;
  hasServerData: boolean;
}

export default function HomePageClient({
  initialTinDangList,
  initialTienIchList,
  initialPhiDichVuList,
  initialKhuTroList,
  initialGiaDienNuoc,
  hasServerData,
}: HomePageClientProps) {
  const { showSuccess } = useAlertModal();

  const [tinDangList, setTinDangList] =
    useState<TinDangItem[]>(initialTinDangList);
  const [tienIchList, setTienIchList] =
    useState<TienIchItem[]>(initialTienIchList);
  const [phiDichVuList, setPhiDichVuList] =
    useState<PhiDichVuItem[]>(initialPhiDichVuList);
  const [khuTroList, setKhuTroList] =
    useState<KhuTroWithContact[]>(initialKhuTroList);
  const [giaDienNuoc, setGiaDienNuoc] =
    useState<GiaDienNuocHome>(initialGiaDienNuoc);

  const [loading, setLoading] = useState<boolean>(!hasServerData);

  // State bộ lọc đa tiêu chí
  const [selectedKhu, setSelectedKhu] = useState<string>("ALL");
  const [selectedMucGia, setSelectedMucGia] = useState<string>("ALL");
  const [selectedDienTich, setSelectedDienTich] = useState<string>("ALL");

  // State điều khiển Modal liên hệ & Hộp thoại AI
  const [contactRoom, setContactRoom] = useState<TinDangItem | null>(null);
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);

  // Tải toàn bộ danh sách phòng (Còn trống, Đang được cọc, Đã cho thuê) và dữ liệu trang chủ
  const fetchHomeRooms = useCallback(async () => {
    try {
      setLoading(true);
      const homeData = await HomeService.getHomeData();

      if (homeData) {
        setTinDangList((homeData.tinDang as unknown as TinDangItem[]) || []);
        setTienIchList(homeData.tienIch || []);
        setPhiDichVuList(homeData.phiDichVu || []);
        setKhuTroList((homeData.khuTro as KhuTroWithContact[]) || []);
        if (homeData.giaDienNuoc) {
          setGiaDienNuoc(homeData.giaDienNuoc);
        }
      }
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu trang chủ & danh sách phòng:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!hasServerData) {
      fetchHomeRooms();
    }
  }, [hasServerData, fetchHomeRooms]);

  // Đếm chính xác số phòng đang Còn trống (chưa đặt cọc, chưa cho thuê) cho HeroSection
  const soPhongConTrong = useMemo(() => {
    return tinDangList.filter(
      (tin) => getRoomStatusDisplay(tin).key === "Trong"
    ).length;
  }, [tinDangList]);

  // Lọc danh sách phòng theo đa tiêu chí
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
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <HomeHeader />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-12">
        <HeroSection
          soKhuTro={khuTroList.length}
          soPhongMo={soPhongConTrong}
          giaDienNuoc={giaDienNuoc}
          onScrollToSection={scrollToSection}
          onOpenChat={() => setIsChatOpen(true)}
        />

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

        <BangGiaSection
          giaDienNuoc={giaDienNuoc}
          phiDichVuList={phiDichVuList}
        />
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
        onSelectContactRoom={(room) => setContactRoom(room)}
        tinDangList={tinDangList}
        khuTroList={khuTroList}
        giaDienNuoc={giaDienNuoc}
      />

      <Appfooter />
    </div>
  );
}