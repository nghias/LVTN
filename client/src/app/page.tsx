// src/app/page.tsx
import type { Metadata } from "next";
import { cache } from "react";
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
import HomePageClient from "@/components/home/HomePageClient";

// Giữ nguyên re-export type để không làm lỗi các file khác đang import từ "@/app/page"
export type { TrangThaiTin, TinDangItem } from "@/components/home/home.data";

const DEFAULT_GIA_DIEN_NUOC: GiaDienNuocHome = {
  MaGia: 1,
  GiaDien: 3500,
  GiaNuoc: 15000,
  NgayApDung: "2026-01-01",
};

// Hàm chuẩn hóa URL khi gọi fetch từ phía Server Next.js
function resolveServerFetchUrl(url: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  const baseUrl =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000";
  return `${baseUrl.replace(/\/$/, "")}/${url.replace(/^\//, "")}`;
}

// Dùng React cache() để generateMetadata và HomePage dùng chung 1 lần gọi API duy nhất
const getServerHomeData = cache(async () => {
  let tinDangList: TinDangItem[] = [];
  let tienIchList: TienIchItem[] = [];
  let phiDichVuList: PhiDichVuItem[] = [];
  let khuTroList: KhuTroWithContact[] = [];
  let giaDienNuoc: GiaDienNuocHome = DEFAULT_GIA_DIEN_NUOC;
  let hasServerData = false;

  try {
    const targetTinDangUrl = resolveServerFetchUrl(PUBLIC_TIN_DANG_URL);

    const [tinDangResponse, homeData] = await Promise.all([
      fetch(targetTinDangUrl, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        next: { revalidate: 60 }, // Cache SEO 60 giây (ISR) giúp tải trang tức thì
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
        tinDangList = (rawList as TinDangItem[]).filter(
          (tin) => !tin.TrangThai || tin.TrangThai === "DangHienThi",
        );
        loadedFromPublicRoute = true;
        hasServerData = true;
      }
    }

    if (!loadedFromPublicRoute && homeData?.tinDang) {
      tinDangList = homeData.tinDang as unknown as TinDangItem[];
      hasServerData = true;
    }

    if (homeData) {
      tienIchList = homeData.tienIch || [];
      phiDichVuList = homeData.phiDichVu || [];
      khuTroList = (homeData.khuTro as KhuTroWithContact[]) || [];
      if (homeData.giaDienNuoc) {
        giaDienNuoc = homeData.giaDienNuoc;
      }
      hasServerData = true;
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

// Tự động tạo Metadata chuẩn SEO dựa trên dữ liệu phòng trống thực tế
export async function generateMetadata(): Promise<Metadata> {
  const { tinDangList, khuTroList, giaDienNuoc } = await getServerHomeData();

  const validRooms = tinDangList.filter(
    (tin) =>
      tin.TrangThaiPhong === "Trong" &&
      (!tin.TrangThai || tin.TrangThai === "DangHienThi"),
  );

  const soPhongTrong = validRooms.length;
  const soKhu = khuTroList.length;

  // Tìm giá thuê thấp nhất để đưa vào thẻ Meta Description kích thích click (CTR)
  const prices = validRooms
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
      : "Hệ Thống Cho Thuê Phòng Trọ Thông Minh - Tra Cứu Phòng Trống Trực Tuyến";

  const description = `Hiện có ${soPhongTrong} phòng trọ đang trống tại ${
    soKhu || "các"
  } cơ sở (${
    tenCacKhu || "hệ thống nhà trọ thông minh"
  }), giá thuê ${minPriceText}. Trang bị đồng hồ điện nước IoT (${Number(
    giaDienNuoc.GiaDien,
  ).toLocaleString("vi-VN")}đ/kWh), khóa vân tay, Wifi tốc độ cao, liên hệ trực tiếp Zalo quản lý.`;

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

  // Schema JSON-LD cấp trang giúp Google nhận diện Hệ thống Khu trọ & Bảng giá
  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    name: "Hệ Thống Quản Lý & Cho Thuê Phòng Trọ Thông Minh",
    description:
      "Hệ thống phòng trọ trang bị đồng hồ điện nước IoT, kiểm soát ra vào vân tay và tra cứu phòng trống trực tuyến.",
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