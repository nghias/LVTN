// src/app/page.tsx
"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import HomeHeader from "../components/layout/homeHeader";
import { useAlertModal } from "@/components/common/AlertModalProvider";
import { resolveRoomImageUrl } from "@/services/phongTro.service";
import {
  HomeService,
  TienIchItem,
  PhuPhiItem,
  KhuTroSummary,
  GiaDienNuocHome,
} from "@/services/home.service";

// ============================================================================
// 1. ĐẶT HẰNG SỐ API & KIỂU DỮ LIỆU TIN ĐĂNG Ở NGOÀI COMPONENT
// ============================================================================
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export type TrangThaiTin = "DangHienThi" | "DaAn" | "HetHan";

export interface TinDangItem {
  MaTin: number;
  MaPhong: number;
  MaND: number;
  TieuDe: string;
  MoTa: string | null;
  NgayDang: string;
  NgayHetHan: string | null;
  TrangThai: TrangThaiTin;
  TenPhong: string;
  DienTich: number;
  Gia: number;
  TrangThaiPhong: string;
  MaKhu: number;
  TenKhu: string;
  // Các trường thông tin người quản lý / chủ trọ từ Database trả về
  AnhDaiDien?: string | null;
  TenChuTro?: string | null;
  TenQuanLy?: string | null;
  HoTen?: string | null;
  SDTChuTro?: string | null;
  SDTQuanLy?: string | null;
  SDT?: string | null;
  SoDienThoai?: string | null;
}

// Mở rộng kiểu KhuTroSummary để nhận thêm SĐT và Tên quản lý từ Database nếu có
type KhuTroWithContact = KhuTroSummary & {
  TenQuanLy?: string | null;
  TenChuTro?: string | null;
  HoTen?: string | null;
  SDTQuanLy?: string | null;
  SDTChuTro?: string | null;
  SDT?: string | null;
  SoDienThoai?: string | null;
};

// Kiểu dữ liệu tin nhắn cho hộp thoại AI Chatbot
interface ChatMessage {
  id: string;
  sender: "ai" | "user";
  text: string;
  time: string;
}

// Dữ liệu tĩnh mô tả vòng lặp vận hành khép kín theo mục tiêu luận văn
const VONG_LAP_VAN_HANH = [
  {
    buoc: "01",
    tieuDe: "Tư Vấn AI & Tìm Phòng",
    moTa: "Tra cứu phòng trống đa tiêu chí kết hợp trợ lý ảo AI Chatbot giải đáp quy định, chi phí và gợi ý phòng 24/7.",
    nhan: "AI Chatbot",
  },
  {
    buoc: "02",
    tieuDe: "Số Hóa Hợp Đồng & Tạm Trú",
    moTa: "Cấp tài khoản cư dân nội bộ, tra cứu hợp đồng điện tử minh bạch và khai báo tạm trú - tạm vắng trực tuyến.",
    nhan: "Hồ sơ số",
  },
  {
    buoc: "03",
    tieuDe: "Thu Thập Chỉ Số Điện Nước IoT",
    moTa: "Đồng hồ điện tử IoT tự động ghi nhận và đồng bộ chỉ số tiêu thụ điện, nước theo thời gian thực về máy chủ.",
    nhan: "Thiết bị IoT",
  },
  {
    buoc: "04",
    tieuDe: "Đối Soát QR & Gạch Nợ Tự Động",
    moTa: "Tự động lập hóa đơn hàng tháng, quét mã QR chuyển khoản, xác nhận giao dịch và tổng hợp báo cáo doanh thu.",
    nhan: "Auto Payment",
  },
];

// Dữ liệu mô tả giá trị cốt lõi cho 3 nhóm đối tượng người dùng
const NHOM_DOI_TUONG = [
  {
    vaiTro: "Khách Vãng Lai",
    doiTuong: "Đối với Người tìm phòng",
    moTaChinh:
      "Công cụ tra cứu phòng trống nhanh chóng, trực quan và sát với nhu cầu thực tế mà không qua trung gian rao vặt.",
    diemNhanCongNghe: "Tích hợp Trợ lý ảo AI Chatbot tư vấn tự động",
    tinhNang: [
      "Bộ lọc đa tiêu chí theo từng cơ sở, diện tích, mức giá thuê và tiện ích đi kèm.",
      "Niêm yết công khai đơn giá điện, nước và các khoản phí dịch vụ hàng tháng.",
      "AI Chatbot tự động giải đáp thắc mắc về nội quy, chi phí và gợi ý phòng phù hợp.",
      "Kết nối trực tiếp với chủ trọ để đặt lịch hẹn xem phòng nhanh chóng.",
    ],
  },
  {
    vaiTro: "Cư Dân Nội Bộ",
    doiTuong: "Đối với Người thuê trọ",
    moTaChinh:
      "Không gian quản lý cá nhân minh bạch, tiện lợi trong suốt quá trình cư trú thông qua tài khoản nội bộ được cấp phát.",
    diemNhanCongNghe: "Theo dõi điện nước IoT & Thanh toán QR tự động",
    tinhNang: [
      "Tra cứu chi tiết hợp đồng thuê phòng, danh mục tiện ích và phí dịch vụ đang áp dụng.",
      "Gửi yêu cầu khai báo tạm trú - tạm vắng và báo cáo sự cố cơ sở vật chất trực tuyến.",
      "Theo dõi chỉ số tiêu thụ điện, nước cập nhật tự động từ đồng hồ IoT kèm lịch sử hàng tháng.",
      "Kiểm tra hóa đơn chi tiết và quét mã QR thanh toán chuyển khoản tự động.",
    ],
  },
  {
    vaiTro: "Quản Trị Viên",
    doiTuong: "Đối với Chủ trọ đa cơ sở",
    moTaChinh:
      "Trung tâm điều hành tập trung giúp xóa bỏ hoàn toàn sổ sách giấy tờ thủ công và các file Excel rời rạc.",
    diemNhanCongNghe: "Đồng bộ IoT, Gạch nợ tự động & Báo cáo chuyên sâu",
    tinhNang: [
      "Quản lý đồng bộ nhiều cơ sở, thiết lập linh hoạt diện tích, tiện ích và định giá từng phòng.",
      "Toàn quyền cấp phát tài khoản, quản lý hồ sơ khách thuê, duyệt tạm trú và vòng đời hợp đồng.",
      "Tự động thu thập chỉ số điện nước từ thiết bị IoT về máy chủ và đối soát gạch nợ hóa đơn.",
      "Tổng hợp chính xác báo cáo thống kê doanh thu, công nợ và sản lượng tiêu thụ điện nước.",
    ],
  },
];

const GOI_Y_CAU_HOI_AI = [
  "Hiện có những phòng nào đang trống?",
  "Đơn giá điện nước tính như thế nào?",
  "Cách liên hệ Zalo quản lý khu trọ?",
];

export default function HomePage() {
  const { showSuccess } = useAlertModal();

  // ============================================================================
  // 2. KHAI BÁO STATE BÊN TRONG COMPONENT
  // ============================================================================
  const [tinDangList, setTinDangList] = useState<TinDangItem[]>([]);
  const [tienIchList, setTienIchList] = useState<TienIchItem[]>([]);
  const [phuPhiList, setPhuPhiList] = useState<PhuPhiItem[]>([]);
  const [khuTroList, setKhuTroList] = useState<KhuTroWithContact[]>([]);
  const [giaDienNuoc, setGiaDienNuoc] = useState<GiaDienNuocHome>({
    MaGia: 1,
    GiaDien: 3500,
    GiaNuoc: 15000,
    NgayApDung: "2026-01-01",
  });
  const [loading, setLoading] = useState<boolean>(true);

  // State phục vụ bộ lọc đa tiêu chí cho Người tìm phòng
  const [selectedKhu, setSelectedKhu] = useState<string>("ALL");
  const [selectedMucGia, setSelectedMucGia] = useState<string>("ALL");
  const [selectedDienTich, setSelectedDienTich] = useState<string>("ALL");

  // State điều khiển Modal Liên hệ thuê phòng (Zalo / SĐT từ Database)
  const [contactRoom, setContactRoom] = useState<TinDangItem | null>(null);

  // State điều khiển hộp thoại AI Chatbot góc phải dưới
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [chatInput, setChatInput] = useState<string>("");
  const [isAiTyping, setIsAiTyping] = useState<boolean>(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-ai",
      sender: "ai",
      text: "Xin chào! Tôi là Trợ lý ảo AI của hệ thống nhà trọ. Bạn cần tìm phòng trống theo mức giá, hỏi về đơn giá điện nước IoT hay thông tin liên hệ quản lý khu trọ?",
      time: "Bây giờ",
    },
  ]);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // ============================================================================
  // 3. ĐẶT HÀM TẢI TIN ĐĂNG TỪ TRANG ĐĂNG TIN & DỮ LIỆU TRANG CHỦ TẠI ĐÂY
  // ============================================================================
  const fetchHomeAndTinDang = useCallback(async () => {
    try {
      setLoading(true);

      const [tinDangResponse, homeData] = await Promise.all([
        fetch(`${API_BASE_URL}/tin-dang`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        }).catch(() => null),
        HomeService.getHomeData().catch(() => null),
      ]);

      if (tinDangResponse && tinDangResponse.ok) {
        const result = await tinDangResponse.json();
        if (result.success && result.data?.tinDangList) {
          const danhSachCongKhai = (
            result.data.tinDangList as TinDangItem[]
          ).filter((tin) => tin.TrangThai === "DangHienThi");
          setTinDangList(danhSachCongKhai);
        }
      } else if (homeData?.tinDang) {
        setTinDangList(homeData.tinDang as unknown as TinDangItem[]);
      }

      if (homeData) {
        setTienIchList(homeData.tienIch || []);
        setPhuPhiList(homeData.phuPhi || []);
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

  // Tự động cuộn xuống tin nhắn mới nhất khi mở hoặc nhắn trong AI Chatbox
  useEffect(() => {
    if (isChatOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, isChatOpen, isAiTyping]);

  const formatVND = (amount: number) =>
    new Intl.NumberFormat("vi-VN").format(Number(amount) || 0) + " đ";

  // ============================================================================
  // 4. HÀM TRÍCH XUẤT SĐT & TÊN NGƯỜI QUẢN LÝ KHU TRỌ TỪ DATABASE
  // ============================================================================
  const getManagerContact = useCallback(
    (tin: TinDangItem) => {
      // Tìm khu trọ tương ứng của phòng này trong danh sách khu trọ từ DB
      const khu = khuTroList.find(
        (k) => Number(k.MaKhu) === Number(tin.MaKhu)
      );

      // Ưu tiên lấy Tên người quản lý từ bản ghi TinĐăng hoặc KhuTrọ trong DB
      const tenQuanLy =
        tin.TenQuanLy ||
        tin.TenChuTro ||
        tin.HoTen ||
        khu?.TenQuanLy ||
        khu?.TenChuTro ||
        khu?.HoTen ||
        `Quản lý ${tin.TenKhu}`;

      // Ưu tiên lấy SĐT người quản lý từ bản ghi TinĐăng hoặc KhuTrọ trong DB
      const rawPhone =
        tin.SDTQuanLy ||
        tin.SDTChuTro ||
        tin.SDT ||
        tin.SoDienThoai ||
        khu?.SDTQuanLy ||
        khu?.SDTChuTro ||
        khu?.SDT ||
        khu?.SoDienThoai ||
        "";

      // Làm sạch chuỗi SĐT để gắn vào link Zalo (https://zalo.me/...) và link gọi điện (tel:...)
      const cleanPhone = rawPhone.replace(/[^0-9]/g, "");

      return {
        tenQuanLy,
        sdtHienThi: rawPhone.trim(),
        cleanPhone,
        hasPhoneFromDB: cleanPhone.length > 0,
        zaloUrl: cleanPhone ? `https://zalo.me/${cleanPhone}` : "#",
        telUrl: cleanPhone ? `tel:${cleanPhone}` : "#",
      };
    },
    [khuTroList]
  );

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

  // ============================================================================
  // 5. HÀM XỬ LÝ GỬI TIN NHẮN TRONG HỘP THOẠI AI CHATBOX (DỄ DÀNG GẮN API SAU NÀY)
  // ============================================================================
  const handleSendAiMessage = async (customQuestion?: string) => {
    const content = (customQuestion ?? chatInput).trim();
    if (!content || isAiTyping) return;

    const currentTime = new Date().toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: content,
      time: currentTime,
    };

    setChatMessages((prev) => [...prev, userMsg]);
    if (!customQuestion) setChatInput("");
    setIsAiTyping(true);

    try {
      // ----------------------------------------------------------------------
      // TODO: KHI BẠN TÍCH HỢP BACKEND AI, CHỈ CẦN MỞ COMMENT ĐOẠN FETCH DƯỚI ĐÂY:
      // ----------------------------------------------------------------------
      /*
      const response = await fetch(`${API_BASE_URL}/ai-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content }),
      });
      const data = await response.json();
      const aiReplyText = data.reply;
      */

      // Phản hồi tạm thời dựa trên dữ liệu thực tế đang có trên trang chủ
      await new Promise((resolve) => setTimeout(resolve, 600));

      const lower = content.toLowerCase();
      let aiReplyText =
        "Cảm ơn bạn đã nhắn tin! Hệ thống AI đang ghi nhận câu hỏi của bạn. Bạn có thể dùng bộ lọc phía trên hoặc bấm vào nút 'Liên hệ thuê phòng' để chat Zalo trực tiếp với quản lý khu trọ.";

      if (lower.includes("phòng") || lower.includes("trống")) {
        aiReplyText =
          tinDangList.length > 0
            ? `Hiện hệ thống đang mở cho thuê ${tinDangList.length} phòng thuộc ${khuTroList.length || "các"} cơ sở. Giá thuê dao động từ ${formatVND(
                Math.min(...tinDangList.map((t) => Number(t.Gia) || 0))
              )}/tháng. Bạn có thể bấm chọn cơ sở ở bộ lọc để xem chi tiết!`
            : "Hiện tại các phòng trên hệ thống đều đã kín hoặc đang cập nhật. Bạn vui lòng liên hệ trực tiếp quản lý khu trọ để được báo khi có phòng trống nhé!";
      } else if (
        lower.includes("điện") ||
        lower.includes("nước") ||
        lower.includes("giá")
      ) {
        aiReplyText = `Đơn giá niêm yết hiện tại: Điện ${formatVND(
          giaDienNuoc.GiaDien
        )}/kWh và Nước ${formatVND(
          giaDienNuoc.GiaNuoc
        )}/m³. Chỉ số được thu thập tự động qua đồng hồ IoT riêng từng phòng, minh bạch 100%.`;
      } else if (
        lower.includes("zalo") ||
        lower.includes("liên hệ") ||
        lower.includes("số điện thoại")
      ) {
        aiReplyText =
          "Ở mỗi thẻ phòng trọ đều có nút 'Liên hệ thuê phòng'. Khi bấm vào, bạn có thể chọn 'Nhắn qua Zalo' hoặc 'Gọi điện trực tiếp' tới đúng số điện thoại của người quản lý khu trọ đó.";
      }

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: "ai",
        text: aiReplyText,
        time: new Date().toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      setChatMessages((prev) => [...prev, aiMsg]);
    } catch (error) {
      console.error("Lỗi khi gọi AI Chatbot:", error);
    } finally {
      setIsAiTyping(false);
    }
  };

  // Lọc danh sách tin đăng theo đa tiêu chí (Cơ sở, Mức giá, Diện tích)
  const filteredTinDangList = useMemo(() => {
    return tinDangList.filter((tin) => {
      // 1. Lọc theo cơ sở (khu trọ)
      if (selectedKhu !== "ALL" && String(tin.MaKhu) !== selectedKhu) {
        return false;
      }

      // 2. Lọc theo mức giá thuê
      const gia = Number(tin.Gia) || 0;
      if (selectedMucGia === "DUOI_25" && gia >= 2500000) return false;
      if (
        selectedMucGia === "TU_25_DEN_40" &&
        (gia < 2500000 || gia > 4000000)
      ) {
        return false;
      }
      if (selectedMucGia === "TREN_40" && gia <= 4000000) return false;

      // 3. Lọc theo diện tích
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

  // Thông tin người quản lý của phòng đang được mở trong Modal liên hệ
  const selectedRoomContact = contactRoom
    ? getManagerContact(contactRoom)
    : null;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/60 text-slate-900">
      {/* 1. Header */}
      <HomeHeader />

      {/* 2. Nội dung chính */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-12">
        {/* =====================================================================
            PHẦN GIỚI THIỆU 1: HERO BANNER & VÒNG LẶP VẬN HÀNH KHÉP KÍN IoT - AI
           ===================================================================== */}
        <section
          id="gioi-thieu"
          className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-xs overflow-hidden"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Cột trái: Thông điệp cốt lõi & Định hướng chuyển đổi số */}
            <div className="lg:col-span-7 space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-[#00FFCC] text-slate-900">
                  Nền tảng Quản lý Nhà trọ Đa cơ sở
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                  Tích hợp IoT & Trí tuệ nhân tạo (AI)
                </span>
              </div>

              <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 leading-tight">
                Giải Pháp Chuyển Đổi Số & Vận Hành Nhà Trọ{" "}
                <span className="text-teal-700 underline decoration-[#00FFCC] decoration-4 underline-offset-4">
                  Khép Kín Toàn Diện
                </span>
              </h1>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Thay vì một sàn rao vặt đại trà hay quản lý thủ công bằng sổ
                sách giấy tờ, file Excel rời rạc, hệ thống thiết lập vòng lặp
                quản lý nội bộ khép kín cho mô hình hộ kinh doanh nhà trọ đa cơ
                sở: từ <strong>tra cứu phòng trống minh bạch</strong>,{" "}
                <strong>trợ lý ảo AI tư vấn 24/7</strong>,{" "}
                <strong>số hóa hợp đồng & thủ tục tạm trú</strong>, đến{" "}
                <strong>thu thập chỉ số điện nước tự động qua IoT</strong> và{" "}
                <strong>đối soát thanh toán QR hàng tháng</strong>.
              </p>

              {/* Chỉ số tổng quan thời gian thực từ hệ thống */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Cơ sở vận hành
                  </p>
                  <p className="text-lg font-extrabold text-slate-900 mt-0.5">
                    {khuTroList.length > 0
                      ? `${khuTroList.length} khu`
                      : "Đa cơ sở"}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Phòng đang mở
                  </p>
                  <p className="text-lg font-extrabold text-teal-700 mt-0.5">
                    {tinDangList.length} phòng
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Đơn giá điện
                  </p>
                  <p className="text-lg font-extrabold text-slate-900 mt-0.5">
                    {formatVND(giaDienNuoc.GiaDien)}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Đơn giá nước
                  </p>
                  <p className="text-lg font-extrabold text-slate-900 mt-0.5">
                    {formatVND(giaDienNuoc.GiaNuoc)}
                  </p>
                </div>
              </div>

              {/* Nút điều hướng nhanh */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => scrollToSection("tin-dang")}
                  className="px-5 py-2.5 bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 border border-teal-300 text-xs sm:text-sm font-bold rounded-xl shadow-2xs transition cursor-pointer"
                >
                  Tìm phòng trống ngay
                </button>
                <button
                  type="button"
                  onClick={() => setIsChatOpen(true)}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-[#00FFCC] text-xs sm:text-sm font-bold rounded-xl transition cursor-pointer"
                >
                  Hỏi Trợ lý ảo AI
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection("bang-gia")}
                  className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs sm:text-sm font-semibold rounded-xl transition cursor-pointer"
                >
                  Xem bảng giá niêm yết
                </button>
              </div>
            </div>

            {/* Cột phải: Sơ đồ 4 bước Vòng lặp quản lý vận hành khép kín */}
            <div className="lg:col-span-5 bg-slate-900 text-white rounded-3xl p-6 sm:p-7 space-y-5 border border-slate-800">
              <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-4">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#00FFCC]">
                    Tự động hóa quy trình
                  </span>
                  <h2 className="text-base sm:text-lg font-bold text-white mt-0.5">
                    Vòng Lặp Vận Hành Khép Kín
                  </h2>
                </div>
                <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#00FFCC]/15 text-[#00FFCC] border border-[#00FFCC]/30">
                  IoT + AI Core
                </span>
              </div>

              <div className="space-y-3.5">
                {VONG_LAP_VAN_HANH.map((item) => (
                  <div
                    key={item.buoc}
                    className="p-3.5 rounded-2xl bg-slate-800/70 border border-slate-700/80 flex items-start gap-3.5"
                  >
                    <div className="w-9 h-9 rounded-xl bg-[#00FFCC] text-slate-900 font-extrabold text-xs flex items-center justify-center shrink-0">
                      {item.buoc}
                    </div>
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-xs sm:text-sm font-bold text-white">
                          {item.tieuDe}
                        </h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-900 text-[#00FFCC] border border-slate-700 shrink-0">
                          {item.nhan}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        {item.moTa}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================================
            PHẦN GIỚI THIỆU 2: GIÁ TRỊ SỬ DỤNG CHO 3 NHÓM ĐỐI TƯỢNG NGƯỜI DÙNG
           ===================================================================== */}
        <section id="he-sinh-thai" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold bg-[#00FFCC]/30 text-slate-900 mb-1.5">
                Tối ưu hóa trải nghiệm & nghiệp vụ
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                Giải Pháp Chuyên Biệt Cho 3 Nhóm Đối Tượng
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Đáp ứng trọn vẹn và liền mạch nhu cầu từ khâu tìm phòng, cư trú
                cho đến quản trị vận hành đa cơ sở
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {NHOM_DOI_TUONG.map((nhom, idx) => (
              <div
                key={nhom.vaiTro}
                className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col justify-between space-y-5"
              >
                <div className="space-y-4">
                  {/* Đầu thẻ */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#00FFCC] text-slate-900">
                      0{idx + 1}. {nhom.vaiTro}
                    </span>
                    <span className="text-[11px] font-semibold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200">
                      Luồng khép kín
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      {nhom.doiTuong}
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed mt-1">
                      {nhom.moTaChinh}
                    </p>
                  </div>

                  {/* Điểm nhấn công nghệ */}
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Điểm nhấn công nghệ
                    </p>
                    <p className="text-xs font-bold text-slate-900 mt-0.5">
                      ✦ {nhom.diemNhanCongNghe}
                    </p>
                  </div>

                  {/* Danh sách quyền lợi / tính năng */}
                  <ul className="space-y-2.5 pt-1">
                    {nhom.tinhNang.map((tn) => (
                      <li
                        key={tn}
                        className="flex items-start gap-2.5 text-xs text-slate-700 leading-relaxed"
                      >
                        <span className="w-4 h-4 rounded-full bg-[#00FFCC]/40 text-slate-900 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                          ✓
                        </span>
                        <span>{tn}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-400">
                    Chuẩn hóa quy trình số
                  </span>
                  <button
                    type="button"
                    onClick={() => scrollToSection("tin-dang")}
                    className="text-xs font-bold text-teal-700 hover:text-slate-900 transition cursor-pointer"
                  >
                    Trải nghiệm ngay →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* =====================================================================
            PHẦN 3: DANH SÁCH TIN ĐĂNG PHÒNG TRỌ & BỘ LỌC ĐA TIÊU CHÍ
           ===================================================================== */}
        <section id="tin-dang" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold bg-[#00FFCC]/30 text-slate-900 mb-1.5">
                Tra cứu phòng trống trực tuyến
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                Danh Sách Phòng Đang Mở Cho Thuê ({filteredTinDangList.length}/
                {tinDangList.length})
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Hỗ trợ bộ lọc đa tiêu chí theo cơ sở, diện tích, mức giá thuê và
                kết nối trực tiếp Zalo / SĐT quản lý từng khu trọ
              </p>
            </div>
          </div>

          {/* Bộ lọc đa tiêu chí phục vụ Người tìm phòng (Khách vãng lai) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* Lọc theo Cơ sở / Khu trọ */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Cơ sở / Khu trọ
                </label>
                <select
                  value={selectedKhu}
                  onChange={(e) => setSelectedKhu(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-500 text-slate-900"
                >
                  <option value="ALL">
                    Tất cả cơ sở ({khuTroList.length})
                  </option>
                  {khuTroList.map((khu) => (
                    <option key={khu.MaKhu} value={String(khu.MaKhu)}>
                      {khu.TenKhu}
                    </option>
                  ))}
                </select>
              </div>

              {/* Lọc theo Mức giá thuê */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Mức giá thuê / tháng
                </label>
                <select
                  value={selectedMucGia}
                  onChange={(e) => setSelectedMucGia(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-500 text-slate-900"
                >
                  <option value="ALL">Tất cả mức giá</option>
                  <option value="DUOI_25">Dưới 2.500.000 đ</option>
                  <option value="TU_25_DEN_40">
                    Từ 2.500.000 đ - 4.000.000 đ
                  </option>
                  <option value="TREN_40">Trên 4.000.000 đ</option>
                </select>
              </div>

              {/* Lọc theo Diện tích */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Diện tích sử dụng
                </label>
                <select
                  value={selectedDienTich}
                  onChange={(e) => setSelectedDienTich(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-500 text-slate-900"
                >
                  <option value="ALL">Tất cả diện tích</option>
                  <option value="DUOI_20">Dưới 20 m²</option>
                  <option value="TU_20_DEN_30">Từ 20 m² - 30 m²</option>
                  <option value="TREN_30">Trên 30 m²</option>
                </select>
              </div>
            </div>

            {/* Dòng trạng thái bộ lọc & tiện ích đi kèm */}
            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-semibold text-slate-500 mr-1">
                  Tiện ích tiêu chuẩn tại hệ thống:
                </span>
                {tienIchList.length > 0 ? (
                  tienIchList.slice(0, 6).map((ti) => (
                    <span
                      key={ti.MaTI}
                      className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700"
                    >
                      {ti.TenTI}
                    </span>
                  ))
                ) : (
                  <>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">
                      Đồng hồ IoT riêng
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">
                      Wifi tốc độ cao
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">
                      Kiểm soát vân tay / RFID
                    </span>
                  </>
                )}
              </div>

              {(selectedKhu !== "ALL" ||
                selectedMucGia !== "ALL" ||
                selectedDienTich !== "ALL") && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-3 py-1 rounded-lg text-xs font-bold bg-slate-100 hover:bg-[#00FFCC] text-slate-900 transition cursor-pointer"
                >
                  Đặt lại bộ lọc
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
          ) : filteredTinDangList.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center max-w-xl mx-auto shadow-xs">
              <span className="inline-block px-3.5 py-1 rounded-full text-xs font-bold bg-[#00FFCC] text-slate-900 mb-3">
                Không có kết quả phù hợp
              </span>
              <h3 className="text-lg font-bold text-slate-900">
                Hiện chưa tìm thấy phòng trọ khớp với tiêu chí lọc
              </h3>
              <p className="text-xs text-slate-500 mt-1.5">
                Bạn có thể đặt lại bộ lọc, hỏi Trợ lý ảo AI Chatbot ở góc màn
                hình hoặc liên hệ trực tiếp chủ trọ để được hỗ trợ.
              </p>
              {tinDangList.length > 0 && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="mt-4 px-4 py-2 bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 border border-teal-300 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Xem toàn bộ {tinDangList.length} phòng đang mở
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTinDangList.map((tin) => {
                const contact = getManagerContact(tin);

                return (
                  <div
                    key={tin.MaTin}
                    className="group bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition overflow-hidden flex flex-col"
                  >
                    {/* Hình ảnh phòng */}
                    <div className="relative h-48 w-full bg-slate-100 overflow-hidden">
                      <img
                        src={
                          tin.AnhDaiDien
                            ? resolveRoomImageUrl(tin.AnhDaiDien)
                            : "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&auto=format&fit=crop&q=80"
                        }
                        alt={tin.TieuDe}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute top-3 left-3">
                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-900/80 text-[#00FFCC] backdrop-blur-xs">
                          {tin.TenKhu}
                        </span>
                      </div>
                      <div className="absolute top-3 right-3">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                            tin.TrangThaiPhong === "Trong"
                              ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                              : "bg-amber-100 text-amber-800 border-amber-300"
                          }`}
                        >
                          {tin.TrangThaiPhong === "Trong"
                            ? "Đang trống"
                            : "Đang thuê"}
                        </span>
                      </div>
                    </div>

                    {/* Phần đầu thẻ: Mã tin & Ngày đăng */}
                    <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-500">
                        Mã tin #{tin.MaTin}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#00FFCC]/25 text-slate-900 border border-teal-200">
                        Đăng ngày:{" "}
                        {new Date(tin.NgayDang).toLocaleDateString("vi-VN")}
                      </span>
                    </div>

                    {/* Nội dung chi tiết của phòng & bài đăng */}
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div className="space-y-3">
                        {/* Tên phòng, diện tích & Giá thuê */}
                        <div>
                          <div className="flex items-baseline justify-between gap-2">
                            <h3 className="text-lg font-bold text-slate-900">
                              Phòng {tin.TenPhong}
                            </h3>
                            <span className="text-xs font-semibold text-slate-500">
                              Diện tích: {Number(tin.DienTich)} m²
                            </span>
                          </div>

                          <p className="mt-1 text-base font-extrabold text-teal-700">
                            {Number(tin.Gia).toLocaleString("vi-VN")} đ / tháng
                          </p>
                        </div>

                        {/* Tiêu đề & Mô tả từ trang đăng tin */}
                        <div className="space-y-1.5 pt-2 border-t border-slate-100">
                          <h4 className="text-sm font-bold text-slate-900 line-clamp-2 leading-snug">
                            {tin.TieuDe}
                          </h4>
                          <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                            {tin.MoTa ||
                              "Chưa có mô tả chi tiết cho bài đăng này."}
                          </p>
                        </div>
                      </div>

                      {/* Chân thẻ: Thông tin Quản lý Khu trọ từ DB & Nút Liên hệ (Zalo / SĐT) */}
                      <div className="pt-3.5 border-t border-slate-100 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              Quản lý {tin.TenKhu}
                            </p>
                            <p className="text-xs font-bold text-slate-900 truncate">
                              {contact.tenQuanLy}
                            </p>
                          </div>

                          <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-800 shrink-0">
                            📞{" "}
                            {contact.hasPhoneFromDB
                              ? contact.sdtHienThi
                              : "Chưa cập nhật SĐT"}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {contact.hasPhoneFromDB && (
                            <a
                              href={contact.zaloUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-[#00FFCC] transition text-center shrink-0"
                              title={`Nhắn Zalo cho ${contact.tenQuanLy}`}
                            >
                              Chat Zalo
                            </a>
                          )}

                          <button
                            type="button"
                            onClick={() => setContactRoom(tin)}
                            className="flex-1 px-4 py-2 bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 border border-teal-300 text-xs font-bold rounded-xl shadow-2xs transition cursor-pointer"
                          >
                            Liên hệ thuê phòng
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* =====================================================================
            PHẦN 4: DANH SÁCH KHU TRỌ ĐANG HOẠT ĐỘNG
           ===================================================================== */}
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
                    ● Đồng bộ đồng hồ IoT & Kiểm soát ra vào
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedKhu(String(khu.MaKhu));
                      scrollToSection("tin-dang");
                    }}
                    className="px-4 py-2 rounded-full text-xs font-bold bg-slate-100 hover:bg-[#00FFCC] text-slate-900 transition cursor-pointer"
                  >
                    Lọc phòng cơ sở này
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* =====================================================================
            PHẦN 5: BẢNG GIÁ ĐIỆN NƯỚC & PHỤ PHÍ NIÊM YẾT
           ===================================================================== */}
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
              Áp dụng thống nhất khi tính Hóa đơn tự động hàng tháng trên hệ
              thống (Cập nhật ngày:{" "}
              {new Date(giaDienNuoc.NgayApDung).toLocaleDateString("vi-VN")})
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Giá Điện */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Đơn giá Điện (Đồng hồ IoT)
              </span>
              <p className="text-2xl font-bold text-slate-900 my-2">
                {formatVND(giaDienNuoc.GiaDien)}{" "}
                <span className="text-xs font-normal text-slate-500">
                  / kWh
                </span>
              </p>
              <span className="text-[11px] text-slate-500">
                Thu thập chỉ số tự động từ đồng hồ điện tử riêng từng phòng
              </span>
            </div>

            {/* Giá Nước */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Đơn giá Nước (Đồng hồ IoT)
              </span>
              <p className="text-2xl font-bold text-slate-900 my-2">
                {formatVND(giaDienNuoc.GiaNuoc)}{" "}
                <span className="text-xs font-normal text-slate-500">/ m³</span>
              </p>
              <span className="text-[11px] text-slate-500">
                Cập nhật tự động và lưu trữ lịch sử tiêu thụ hàng tháng
              </span>
            </div>

            {/* Danh sách Phụ Phí */}
            {phuPhiList.slice(0, 2).map((pp) => (
              <div
                key={pp.MaPP}
                className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between"
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Phụ phí dịch vụ cố định
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

      {/* =======================================================================
          MODAL LIÊN HỆ THUÊ PHÒNG QUA ZALO / SỐ ĐIỆN THOẠI NGƯỜI QUẢN LÝ TỪ DB
         ======================================================================= */}
      {contactRoom && selectedRoomContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#00FFCC] text-slate-900 mb-1">
                  {contactRoom.TenKhu}
                </span>
                <h3 className="text-lg font-extrabold text-slate-900">
                  Liên Hệ Thuê Phòng {contactRoom.TenPhong}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setContactRoom(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Thông tin phòng & Người quản lý lấy từ Database */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Giá thuê:</span>
                <span className="font-extrabold text-teal-700">
                  {formatVND(contactRoom.Gia)} / tháng ({contactRoom.DienTich}{" "}
                  m²)
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">
                  Người quản lý:
                </span>
                <span className="font-bold text-slate-900">
                  {selectedRoomContact.tenQuanLy}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">
                  Số điện thoại / Zalo:
                </span>
                <span className="font-extrabold text-slate-900 bg-[#00FFCC]/40 px-2.5 py-0.5 rounded-lg">
                  {selectedRoomContact.hasPhoneFromDB
                    ? selectedRoomContact.sdtHienThi
                    : "Chưa cập nhật trong CSDL"}
                </span>
              </div>
            </div>

            {/* Các phương thức liên hệ trực tiếp */}
            {selectedRoomContact.hasPhoneFromDB ? (
              <div className="space-y-2.5">
                <a
                  href={selectedRoomContact.zaloUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-[#00FFCC] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition"
                >
                  <span>💬 Nhắn tin qua Zalo ({selectedRoomContact.sdtHienThi})</span>
                </a>

                <div className="grid grid-cols-2 gap-2.5">
                  <a
                    href={selectedRoomContact.telUrl}
                    className="py-2.5 px-4 rounded-xl bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 border border-teal-300 font-bold text-xs flex items-center justify-center gap-1.5 transition"
                  >
                    <span>📞 Gọi điện ngay</span>
                  </a>

                  <button
                    type="button"
                    onClick={() =>
                      handleCopyPhone(
                        selectedRoomContact.cleanPhone,
                        selectedRoomContact.tenQuanLy
                      )
                    }
                    className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <span>📋 Sao chép SĐT</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
                Số điện thoại của người quản lý khu trọ này chưa được cập nhật
                trên cơ sở dữ liệu. Vui lòng kiểm tra cột <strong>SDT</strong>{" "}
                trong bảng <strong>NguoiDung / KhuTro</strong>.
              </div>
            )}

            <button
              type="button"
              onClick={() => setContactRoom(null)}
              className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition cursor-pointer"
            >
              Đóng cửa sổ
            </button>
          </div>
        </div>
      )}

      {/* =======================================================================
          HỘP THOẠI AI CHATBOX NỔI Ở GÓC DƯỚI BÊN PHẢI (SẴN SÀNG TÍCH HỢP AI)
         ======================================================================= */}
      <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end">
        {/* Cửa sổ Chat khi mở */}
        {isChatOpen && (
          <div className="mb-3 w-[340px] sm:w-[380px] bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            {/* Đầu hộp thoại AI */}
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-[#00FFCC] text-slate-900 font-extrabold text-xs flex items-center justify-center shrink-0">
                  AI
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-xs sm:text-sm font-bold text-white">
                      Trợ Lý Ảo AI Nhà Trọ
                    </h3>
                    <span className="w-2 h-2 rounded-full bg-[#00FFCC] animate-pulse" />
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Tư vấn phòng trống, quy định & chi phí 24/7
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsChatOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center justify-center cursor-pointer"
                title="Thu gọn hộp thoại"
              >
                ✕
              </button>
            </div>

            {/* Danh sách tin nhắn */}
            <div className="p-4 h-80 overflow-y-auto bg-slate-50/80 space-y-3">
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.sender === "user" ? "items-end" : "items-start"
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                      msg.sender === "user"
                        ? "bg-slate-900 text-[#00FFCC] font-medium rounded-br-xs"
                        : "bg-white text-slate-800 border border-slate-200 shadow-2xs rounded-bl-xs"
                    }`}
                  >
                    {msg.text}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 px-1">
                    {msg.time}
                  </span>
                </div>
              ))}

              {isAiTyping && (
                <div className="flex items-start">
                  <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-xs px-3.5 py-2 text-xs text-slate-500">
                    AI đang soạn câu trả lời...
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Gợi ý câu hỏi nhanh */}
            <div className="px-3.5 py-2 bg-white border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto">
              {GOI_Y_CAU_HOI_AI.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => handleSendAiMessage(q)}
                  className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 hover:bg-[#00FFCC]/40 text-slate-700 whitespace-nowrap transition cursor-pointer shrink-0"
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Ô nhập tin nhắn */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendAiMessage();
              }}
              className="p-3 bg-white border-t border-slate-200 flex items-center gap-2"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Nhập câu hỏi cần AI tư vấn..."
                className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-500 text-slate-900"
              />
              <button
                type="submit"
                disabled={!chatInput.trim() || isAiTyping}
                className="px-4 py-2 rounded-xl bg-[#00FFCC] hover:bg-[#00e6b8] disabled:opacity-50 text-slate-900 border border-teal-300 text-xs font-bold transition cursor-pointer shrink-0"
              >
                Gửi
              </button>
            </form>
          </div>
        )}

        {/* Nút bấm mở/đóng AI Chatbot nổi ở góc phải */}
        <button
          type="button"
          onClick={() => setIsChatOpen((prev) => !prev)}
          className="flex items-center gap-2.5 px-4 py-3 rounded-full bg-slate-900 hover:bg-slate-800 text-white border-2 border-[#00FFCC] shadow-xl transition cursor-pointer"
        >
          <span className="w-7 h-7 rounded-full bg-[#00FFCC] text-slate-900 font-extrabold text-xs flex items-center justify-center">
            AI
          </span>
          <span className="text-xs font-bold text-[#00FFCC] pr-1">
            {isChatOpen ? "Đóng Trợ lý AI" : "Chat tư vấn AI 24/7"}
          </span>
        </button>
      </div>
    </div>
  );
}