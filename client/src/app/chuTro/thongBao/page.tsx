// client/src/app/chuTro/thongBao/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import {
  CreateThongBaoPayload,
  ThongBaoItem,
  ThongBaoMetadata,
} from "../../../types/thongBao.type";
import { thongBaoService } from "@/services/thongBao.service";
import { connectSocket } from "@/utils/socket.until";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import QuanLyHeader from "@/components/layout/QuanLyHeader";
import { UserProfile } from "@/types/auth.type";
import ThongBaoHeader from "@/components/features/thongBao/ThongBaoHeader";
import ThongBaoSearchBar from "@/components/features/thongBao/ThongBaoSearchBar";
import ThongBaoList from "@/components/features/thongBao/ThongBaoList";
import ThongBaoFormModal from "@/components/features/thongBao/ThongBaoFormModal";
import ThongBaoRealtimeToast from "@/components/features/thongBao/ThongBaoRealtimeToast";

function ThongBaoContent({ user }: { user: UserProfile }) {
  const [metadata, setMetadata] = useState<ThongBaoMetadata | null>(null);
  const [danhSach, setDanhSach] = useState<ThongBaoItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [keyword, setKeyword] = useState("");
  const [maLTB, setMaLTB] = useState("");
  const [activeTab, setActiveTab] = useState<"da_gui" | "da_nhan">("da_gui");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [realtimeToast, setRealtimeToast] = useState<ThongBaoItem | null>(null);

  // State Xóa thông báo
  const [deleteTarget, setDeleteTarget] = useState<ThongBaoItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Lấy MaND hiện tại từ localStorage (hoặc AuthContext của bạn)
  const currentUserId =
    typeof window !== "undefined"
      ? Number(JSON.parse(localStorage.getItem("user") || "{}")?.MaND || 1)
      : 1;

  const fetchDanhSach = useCallback(async () => {
    setLoading(true);
    try {
      const list = await thongBaoService.getDanhSach({
        keyword,
        maLTB,
        tab: activeTab,
      });
      setDanhSach(list);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [keyword, maLTB, activeTab]);

  // 1. Tải cấu hình phân quyền KhuTrọ & Loại Thông Báo
  useEffect(() => {
    thongBaoService
      .getMetadata()
      .then(setMetadata)
      .catch((err) => console.error("Lỗi metadata:", err));
  }, []);

  // 2. Tìm kiếm thông báo (có debounce 300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDanhSach();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchDanhSach]);

  // 3. Khởi tạo kết nối WebSocket thời gian thực
  useEffect(() => {
    if (!currentUserId) return;
    const socket = connectSocket(currentUserId);

    const onConnect = () => setSocketConnected(true);
    const onDisconnect = () => setSocketConnected(false);

    // Khi nhận thông báo trực tiếp từ Chủ trọ hoặc hệ thống
    const onNewNotification = (newTb: ThongBaoItem) => {
      setRealtimeToast(newTb);
      if (activeTab === "da_nhan") {
        setDanhSach((prev) => [newTb, ...prev]);
      }
    };

    // Khi có thông báo bị xóa
    const onDeleteNotification = ({ MaTB }: { MaTB: number }) => {
      setDanhSach((prev) => prev.filter((item) => item.MaTB !== Number(MaTB)));
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("NEW_NOTIFICATION", onNewNotification);
    socket.on("DELETE_NOTIFICATION", onDeleteNotification);

    if (socket.connected) setSocketConnected(true);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("NEW_NOTIFICATION", onNewNotification);
      socket.off("DELETE_NOTIFICATION", onDeleteNotification);
    };
  }, [currentUserId, activeTab]);

  

  // Xử lý gửi thông báo mới
  const handleCreateThongBao = async (payload: CreateThongBaoPayload) => {
    const res = await thongBaoService.taoThongBao(payload);
    if (activeTab === "da_gui") {
      setDanhSach((prev) => [res.data, ...prev]);
    }
  };

  // Xử lý xóa thông báo
  const handleDeleteThongBao = async (maTB: number, tieuDe: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa thông báo "${tieuDe}"?`)) {
      return;
    }
    try {
      await thongBaoService.xoaThongBao(maTB);
      setDanhSach((prev) => prev.filter((item) => item.MaTB !== maTB));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Xóa thất bại");
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      <QuanLyHeader user={user} />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        <ThongBaoHeader
          isSupremeLandlord={metadata?.isSupremeLandlord ?? false}
          khuTroList={metadata?.khuTroList ?? []}
          socketConnected={socketConnected}
          onOpenModal={() => setIsModalOpen(true)}
        />

        <ThongBaoSearchBar
          keyword={keyword}
          maLTB={maLTB}
          activeTab={activeTab}
          loaiThongBaoList={metadata?.loaiThongBaoList ?? []}
          onKeywordChange={setKeyword}
          onMaLTBChange={setMaLTB}
          onTabChange={setActiveTab}
        />

        <ThongBaoList
          items={danhSach}
          loading={loading}
          currentUserId={currentUserId}
          isSupremeLandlord={metadata?.isSupremeLandlord ?? false}
          onDelete={handleDeleteThongBao}
        />

        <ThongBaoFormModal
          isOpen={isModalOpen}
          isSupremeLandlord={metadata?.isSupremeLandlord ?? false}
          khuTroList={metadata?.khuTroList ?? []}
          phongList={metadata?.phongList ?? []}
          loaiThongBaoList={metadata?.loaiThongBaoList ?? []}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleCreateThongBao}
        />

        <ThongBaoRealtimeToast
          notification={realtimeToast}
          onClose={() => setRealtimeToast(null)}
        />
      </main>
    </div>
  );
}
export default function QuanLyThongBaoPage() {
  return (
    <ProtectedRoute allowedRoles={["ChuTro", "QuanLy"]}>
      {(user) => <ThongBaoContent user={user} />}
    </ProtectedRoute>
  );
}
