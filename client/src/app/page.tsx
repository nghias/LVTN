// client/src/app/page.tsx
import type { Metadata } from "next";
import { cache } from "react";
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
import HomePageClient from "@/components/home/HomePageClient";

export const dynamic = "force-dynamic";

export type { TrangThaiTin, TinDangItem } from "@/components/home/home.data";

const DEFAULT_GIA_DIEN_NUOC: GiaDienNuocHome = {
  MaGia: 1,
  GiaDien: 3800,
  GiaNuoc: 18000,
  NgayApDung: "2026-08-01",
};

const getServerHomeData = cache(async () => {
  let tinDangList: TinDangItem[] = [];
  let tienIchList: TienIchItem[] = [];
  let phiDichVuList: PhiDichVuItem[] = [];
  let khuTroList: KhuTroWithContact[] = [];
  let giaDienNuoc: GiaDienNuocHome = DEFAULT_GIA_DIEN_NUOC;
  let hasServerData = false;

  try {
    const homeData = await HomeService.getHomeData().catch(() => null);

    if (homeData) {
      tinDangList = (homeData.tinDang as unknown as TinDangItem[]) || [];
      tienIchList = homeData.tienIch || [];
      phiDichVuList = homeData.phiDichVu || [];
      khuTroList = (homeData.khuTro as KhuTroWithContact[]) || [];
      if (homeData.giaDienNuoc) {
        giaDienNuoc = homeData.giaDienNuoc;
      }
      // Chỉ coi là đã có dữ liệu SSR đầy đủ khi tải được danh sách phòng
      hasServerData = tinDangList.length > 0;
    }
  } catch (error) {
    console.error("SSR Fetch Error (sẽ fallback sang Client fetch):", error);
  }

  return {
    tinDangList,
    tienIchList,
    phiDichVuList,
    khuTroList,
    giaDienNuoc,
    hasServerData,
  };
});

export async function generateMetadata(): Promise<Metadata> {
  const { tinDangList, khuTroList, giaDienNuoc } = await getServerHomeData();

  const validRooms = tinDangList.filter(
    (tin) => String((tin as any).TrangThaiPhong || "").trim() === "Trong"
  );

  const soPhongTrong = validRooms.length;
  const soKhu = khuTroList.length;

  const prices = tinDangList
    .map((r) => Number(r.Gia))
    .filter((p) => !isNaN(p) && p > 0);
  const minPriceText =
    prices.length > 0
      ? `chỉ từ ${Math.min(...prices).toLocaleString("vi-VN")}đ/tháng`
      : "giá tốt chính chủ";

  const tenCacKhu = khuTroList
    .slice(0, 5)
    .map((k) => k.TenKhu)
    .join(", ");

  const title =
    soPhongTrong > 0
      ? `Cho Thuê Phòng Trọ Chính Chủ (${soPhongTrong} Phòng Đang Trống) | Tra Cứu Trực Tuyến`
      : "Hệ Thống Cho Thuê Phòng Trọ Thông Minh - Tra Cứu Phòng Trực Tuyến";

  const description = `Hiện có ${soPhongTrong} phòng trọ đang trống tại ${
    soKhu || "các"
  } cơ sở (${
    tenCacKhu || "hệ thống nhà trọ thông minh"
  }), giá thuê ${minPriceText}. Trang bị đồng hồ điện nước IoT (${Number(
    giaDienNuoc.GiaDien
  ).toLocaleString("vi-VN")}đ/kWh), khóa thẻ từ, Wifi tốc độ cao.`;

  return {
    title,
    description,
    keywords: [
      "thuê phòng trọ",
      "phòng trọ chính chủ",
      "phòng trọ đang trống",
      "nhà trọ thông minh IoT",
      "tìm phòng trọ giá rẻ",
      ...khuTroList.map((k) => `phòng trọ ${k.TenKhu}`),
    ],
    alternates: {
      canonical: "/",
    },
    openGraph: {
      title,
      description,
      type: "website",
      locale: "vi_VN",
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
  };
}

export default async function HomePage() {
  const {
    tinDangList,
    tienIchList,
    phiDichVuList,
    khuTroList,
    giaDienNuoc,
    hasServerData,
  } = await getServerHomeData();

  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    name: "Hệ Thống Quản Lý & Cho Thuê Phòng Trọ Thông Minh",
    description:
      "Hệ thống phòng trọ trang bị đồng hồ điện nước IoT, kiểm soát ra vào thẻ từ và tra cứu phòng trực tuyến.",
    numberOfEmployees: khuTroList.length || 1,
    areaServed: khuTroList.map((khu) => ({
      "@type": "Place",
      name: khu.TenKhu,
      address: (khu as any).DiaChi || khu.TenKhu,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationJsonLd),
        }}
      />
      <HomePageClient
        initialTinDangList={tinDangList}
        initialTienIchList={tienIchList}
        initialPhiDichVuList={phiDichVuList}
        initialKhuTroList={khuTroList}
        initialGiaDienNuoc={giaDienNuoc}
        hasServerData={hasServerData}
      />
    </>
  );
}