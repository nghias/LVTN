// client/src/app/chuTro/thongBao/page.tsx
"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { thongBaoService } from "@/services/thongBao.service";
import QuanLyHeader from "@/components/layout/QuanLyHeader";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import { UserProfile } from "@/types/auth.type";
import {
  KhuTroItem,
  LoaiThongBao,
  ThongBaoItem,
  ThongBaoReplyItem,
} from "@/types/thongBao.type";

import {
  formatTimeAgo,
  getBaseTitle,
  getRoleBadge,
  getSharedSocket,
  resolveCurrentMaND,
} from "./chiTiet/page";
import { DeleteTarget, ThongBaoXoaModal } from "./xoa/page";

const MA_LTB_DAT_COC = 6;

function isDepositNotification(item: Pick<ThongBaoItem, "MaLTB" | "TenLTB">): boolean {
  if (Number(item.MaLTB) === MA_LTB_DAT_COC) return true;
  return (item.TenLTB || "").toLowerCase().includes("đặt cọc");
}

function getDepositBadgeStyle(tieuDe?: string) {
  const title = (tieuDe || "").toLowerCase();
  if (title.includes("trùng cọc")) {
    return {
      cardBorder: "border-l-4 border-l-rose-500",
      badgeClass: "bg-rose-600 text-white",
      label: "Trùng cọc — Cần hoàn 100%",
    };
  }
  if (title.includes("hết hạn")) {
    return {
      cardBorder: "border-l-4 border-l-amber-500",
      badgeClass: "bg-amber-100 text-amber-800 border border-amber-300",
      label: "Hết hạn giữ phòng",
    };
  }
  return {
    cardBorder: "border-l-4 border-l-teal-500",
    badgeClass: "bg-emerald-100 text-emerald-800 border border-emerald-300",
    label: "Đặt cọc giữ phòng",
  };
}

// ============================================================================
// 1. HEADER COMPONENT
// ============================================================================
export interface ThongBaoHeaderProps {
  isSupremeLandlord: boolean;
  khuTroList: KhuTroItem[];
  socketConnected: boolean;
  currentUserId?: number;
}

export function ThongBaoHeader({
  isSupremeLandlord,
  khuTroList,
  socketConnected,
  currentUserId,
}: ThongBaoHeaderProps) {
  const defaultKhuQuery =
    !isSupremeLandlord && khuTroList.length === 1
      ? `?maKhu=${khuTroList[0].MaKhu}`
      : "";

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold bg-[#00FFCC] text-slate-900">
            {isSupremeLandlord
              ? "Quyền Chủ Trọ • Toàn Hệ Thống (3 Khu Trọ)"
              : `Quyền Quản Lý • ${khuTroList.map((k) => k.TenKhu).join(", ")}`}
          </span>

          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${
              socketConnected
                ? "text-teal-700 bg-teal-50 border-teal-200"
                : "text-amber-700 bg-amber-50 border-amber-200"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                socketConnected ? "bg-teal-500 animate-pulse" : "bg-amber-500"
              }`}
            />
            {socketConnected ? "WebSocket Trực Tiếp" : "Đang kết nối lại..."}
          </span>
        </div>

        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
          Quản Lý & Phát Thông Báo Thời Gian Thực
        </h1>
        <p className="text-xs text-slate-500">
          {isSupremeLandlord
            ? "Nhận thông báo đặt cọc giữ phòng, phản ánh cư dân và phát thông báo tới toàn hệ thống hoặc từng cơ sở."
            : "Nhận thông báo đặt cọc giữ phòng tại cơ sở phụ trách và trao đổi trực tiếp với khách thuê."}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2.5 shrink-0">

        <Link
          href="/chuTro/thongBao/guiTin"
          className="px-5 py-3 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-900 text-xs font-bold transition no-underline"
        >
          Trả Lời Phản Hồi
        </Link>

        <Link
          href={`/chuTro/thongBao/them/${currentUserId || 0}${defaultKhuQuery}`}
          className="px-6 py-3 rounded-full bg-[#00ffd5] hover:bg-[#00e6c0] text-slate-900 text-xs font-bold transition shadow-xs no-underline"
        >
          Soạn Thông Báo Mới
        </Link>
      </div>
    </div>
  );
}

// ============================================================================
// 2. SEARCH BAR COMPONENT
// ============================================================================
export interface ThongBaoSearchBarProps {
  keyword: string;
  maLTB: string;
  activeTab: "da_gui" | "da_nhan";
  loaiThongBaoList: LoaiThongBao[];
  unreadCount?: number;
  onKeywordChange: (val: string) => void;
  onMaLTBChange: (val: string) => void;
  onTabChange: (tab: "da_gui" | "da_nhan") => void;
  onMarkAllRead?: () => void;
}

export function ThongBaoSearchBar({
  keyword,
  maLTB,
  activeTab,
  loaiThongBaoList,
  unreadCount = 0,
  onKeywordChange,
  onMaLTBChange,
  onTabChange,
  onMarkAllRead,
}: ThongBaoSearchBarProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-xs space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex p-1 rounded-2xl bg-slate-100 border border-slate-200 w-fit">
            <button
              type="button"
              onClick={() => onTabChange("da_nhan")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === "da_nhan"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <span>Hộp thư nhận</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white">
                  {unreadCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => onTabChange("da_gui")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === "da_gui"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Thông báo đã gửi
            </button>
          </div>

          {/* Nút lọc nhanh riêng cho Đặt cọc giữ phòng (MaLTB = 6) */}
          <button
            type="button"
            onClick={() =>
              onMaLTBChange(
                maLTB === String(MA_LTB_DAT_COC) ? "" : String(MA_LTB_DAT_COC)
              )
            }
            className={`px-3.5 py-2 rounded-2xl text-xs font-bold border transition cursor-pointer ${
              maLTB === String(MA_LTB_DAT_COC)
                ? "bg-[#00FFCC] text-slate-900 border-teal-400 shadow-2xs"
                : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-[#00FFCC]/20"
            }`}
          >
            Chỉ xem Đặt cọc giữ phòng
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1 max-w-2xl">
          <div className="relative flex-1">
            <input
              type="text"
              value={keyword}
              onChange={(e) => onKeywordChange(e.target.value)}
              placeholder="Tìm theo mã tra cứu DC..., phòng, tiêu đề, nội dung..."
              className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs text-slate-900 focus:outline-none focus:border-teal-600 focus:bg-white transition"
            />
            {keyword && (
              <button
                type="button"
                onClick={() => onKeywordChange("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          <select
            value={maLTB}
            onChange={(e) => onMaLTBChange(e.target.value)}
            className="px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700 focus:outline-none focus:border-teal-600"
          >
            <option value="">Tất cả loại thông báo</option>
            {loaiThongBaoList.map((ltb) => (
              <option key={ltb.MaLTB} value={String(ltb.MaLTB)}>
                {ltb.TenLTB}
              </option>
            ))}
          </select>

          {activeTab === "da_nhan" && unreadCount > 0 && onMarkAllRead && (
            <button
              type="button"
              onClick={onMarkAllRead}
              className="px-3.5 py-2.5 rounded-2xl border border-teal-200 bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-bold whitespace-nowrap cursor-pointer transition"
            >
              Đọc tất cả
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 3. REALTIME TOAST COMPONENT
// ============================================================================
export interface ThongBaoRealtimeToastProps {
  notification: ThongBaoItem | null;
  onClose: () => void;
}

export function ThongBaoRealtimeToast({
  notification,
  onClose,
}: ThongBaoRealtimeToastProps) {
  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(onClose, 8000);
    return () => clearTimeout(timer);
  }, [notification, onClose]);

  if (!notification) return null;

  const isDeposit = isDepositNotification(notification);
  const labelLTB =
    notification.TenLTB ||
    (isDeposit ? "Đặt cọc giữ phòng" : "Thông báo mới");
  const senderName = isDeposit
    ? "Hệ thống Đặt cọc tự động"
    : notification.TenNguoiGui || "Hệ thống Xóm Trọ";

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full bg-slate-900 text-white border border-teal-400/40 rounded-3xl p-5 shadow-2xl space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#00FFCC] text-slate-900">
          🔔 {labelLTB}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-slate-400 hover:text-white cursor-pointer"
        >
          ✕
        </button>
      </div>
      <h4 className="text-sm font-bold text-white">{notification.TieuDe}</h4>
      <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed">
        {notification.NoiDung}
      </p>
      <div className="flex items-center justify-between gap-2 pt-1">
        <p className="text-[10px] text-teal-300 font-semibold">
          Từ: {senderName}
        </p>
        {isDeposit && (
          <Link
            href="/chuTro/datPhong"
            onClick={onClose}
            className="px-3 py-1 rounded-full bg-[#00FFCC] text-slate-900 text-[11px] font-bold no-underline"
          >
            Xem đơn đặt cọc →
          </Link>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// 4. DANH SÁCH THÔNG BÁO TOÀN CHIỀU RỘNG
// ============================================================================
export interface ThongBaoListProps {
  items: ThongBaoItem[];
  loading: boolean;
  currentUserId?: number;
  isSupremeLandlord?: boolean;
  onDelete: (maTB: number, tieuDe: string) => Promise<void> | void;
  onMarkedRead?: (maTB: number) => void;
}

type MergedThongBaoItem = ThongBaoItem & {
  mergedUnreadIds?: number[];
};

const isReplyItem = (item: ThongBaoItem) => {
  const raw = item as ThongBaoItem & {
    MaTBCha?: number | null;
    MaTBGoc?: number | null;
  };
  if (raw.MaTBCha || raw.MaTBGoc) return true;
  return /^Phản hồi:\s*/i.test((item.TieuDe || "").trim());
};

export function ThongBaoList({
  items,
  loading,
  currentUserId,
  onDelete,
  onMarkedRead,
}: ThongBaoListProps) {
  const router = useRouter();
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [replyCountMap, setReplyCountMap] = useState<Record<number, number>>(
    {},
  );
  const [readMap, setReadMap] = useState<Record<number, boolean>>({});

  const filteredItems = useMemo<MergedThongBaoItem[]>(() => {
    const groupMap = new Map<string, MergedThongBaoItem>();

    for (const item of items) {
      // Thông báo Đặt cọc (MaLTB = 6) luôn giữ riêng từng bản ghi theo MaTB để không bị gộp nhầm
      const isDeposit = isDepositNotification(item);
      const baseTitle = getBaseTitle(item.TieuDe).toLowerCase();
      const groupKey = isDeposit
        ? `deposit::${item.MaTB}`
        : `${item.MaLTB ?? item.TenLTB}::${baseTitle}`;

      const existing = groupMap.get(groupKey);

      if (!existing) {
        groupMap.set(groupKey, {
          ...item,
          mergedUnreadIds: item.TrangThai === "ChuaDoc" ? [item.MaTB] : [],
        });
        continue;
      }

      const existingIsReply = isReplyItem(existing);
      const currentIsReply = isReplyItem(item);

      const mergedUnreadIds = [
        ...(existing.mergedUnreadIds || []),
        ...(item.TrangThai === "ChuaDoc" ? [item.MaTB] : []),
      ];

      const mergedTrangThai =
        existing.TrangThai === "ChuaDoc" || item.TrangThai === "ChuaDoc"
          ? "ChuaDoc"
          : "DaDoc";

      const mergedSoPhanHoi = Math.max(
        existing.SoPhanHoi ?? 0,
        item.SoPhanHoi ?? 0,
      );

      if (existingIsReply && !currentIsReply) {
        groupMap.set(groupKey, {
          ...item,
          TrangThai: mergedTrangThai,
          SoPhanHoi: mergedSoPhanHoi,
          mergedUnreadIds,
        });
      } else {
        groupMap.set(groupKey, {
          ...existing,
          TrangThai: mergedTrangThai,
          SoPhanHoi: mergedSoPhanHoi,
          mergedUnreadIds,
        });
      }
    }

    return Array.from(groupMap.values());
  }, [items]);

  // Cập nhật số lượng phản hồi Real-time
  useEffect(() => {
    const socket = getSharedSocket(currentUserId);

    const handleNewReply = (payload: {
      rootMaTB: number;
      phanHoi: ThongBaoReplyItem;
    }) => {
      const rootId = Number(payload.rootMaTB);
      setReplyCountMap((prev) => {
        const baseItem = filteredItems.find((i) => i.MaTB === rootId);
        const currentCount = prev[rootId] ?? baseItem?.SoPhanHoi ?? 0;
        return {
          ...prev,
          [rootId]: currentCount + 1,
        };
      });
    };

    socket.on("phan_hoi_thong_bao", handleNewReply);
    return () => {
      socket.off("phan_hoi_thong_bao", handleNewReply);
    };
  }, [currentUserId, filteredItems]);

  const markItemRead = (item: MergedThongBaoItem) => {
    if (item.TrangThai === "ChuaDoc" && !readMap[item.MaTB]) {
      setReadMap((prev) => ({ ...prev, [item.MaTB]: true }));
      onMarkedRead?.(item.MaTB);
      thongBaoService.danhDauDaDoc(item.MaTB).catch(() => {});
    }
  };

  const handleGoToChat = (item: MergedThongBaoItem) => {
    markItemRead(item);
    router.push(`/chuTro/thongBao/guiTin?maTB=${item.MaTB}`);
  };

  const handleGoToDatPhong = (item: MergedThongBaoItem) => {
    markItemRead(item);
    router.push("/chuTro/datPhong");
  };

  const handleConfirmDelete = async (maTB: number, tieuDe: string) => {
    await onDelete(maTB, tieuDe);
  };

  return (
    <>
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800">
            Danh sách thông báo ({filteredItems.length})
          </span>
        </div>

        <div className="divide-y divide-slate-200">
          {loading ? (
            <div className="p-10 text-center text-xs text-slate-400">
              Đang tải danh sách thông báo...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-400">
              Không có thông báo nào phù hợp.
            </div>
          ) : (
            filteredItems.map((item) => {
              const isUnread =
                item.TrangThai === "ChuaDoc" && !readMap[item.MaTB];
              const replyCount =
                replyCountMap[item.MaTB] ?? item.SoPhanHoi ?? 0;
              const isDeposit = isDepositNotification(item);
              const depositMeta = isDeposit
                ? getDepositBadgeStyle(item.TieuDe)
                : null;

              return (
                <div
                  key={item.MaTB}
                  className={`p-5 sm:p-6 transition ${
                    depositMeta ? depositMeta.cardBorder : ""
                  } ${
                    isUnread
                      ? "bg-[#00FFCC]/10"
                      : "bg-white hover:bg-slate-50/60"
                  }`}
                >
                  {/* Hàng 1: Badges + Nút thao tác */}
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          depositMeta
                            ? depositMeta.badgeClass
                            : "bg-[#00FFCC] text-slate-900"
                        }`}
                      >
                        {item.TenLTB || depositMeta?.label || "Thông báo"}
                      </span>

                      {item.SoNguoiNhan !== undefined && (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                          Đã gửi {item.SoNguoiNhan} người
                        </span>
                      )}

                      {replyCount > 0 && (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                          {replyCount} phản hồi
                        </span>
                      )}

                      {isUnread && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-600 text-white">
                          Mới
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      {isUnread && (
                        <button
                          type="button"
                          onClick={() => markItemRead(item)}
                          className="px-3.5 py-1.5 rounded-full text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 transition cursor-pointer"
                        >
                          Đã đọc
                        </button>
                      )}

                      {isDeposit ? (
                        <button
                          type="button"
                          onClick={() => handleGoToDatPhong(item)}
                          className="px-4 py-1.5 rounded-full text-xs font-bold text-slate-900 bg-[#00ffd5] hover:bg-[#00e6c0] transition cursor-pointer shadow-xs"
                        >
                          Xử lý đặt cọc
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleGoToChat(item)}
                          className="px-4 py-1.5 rounded-full text-xs font-bold text-slate-900 bg-[#00ffd5] hover:bg-[#00e6c0] transition cursor-pointer shadow-xs"
                        >
                          Phản Hồi
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          setDeleteTarget({
                            MaTB: item.MaTB,
                            TieuDe: item.TieuDe,
                          })
                        }
                        className="px-4 py-1.5 rounded-2xl text-xs font-bold text-red-600 bg-white border border-red-200 hover:bg-red-50 transition cursor-pointer"
                      >
                        Xóa
                      </button>
                    </div>
                  </div>

                  {/* Hàng 2: Tiêu đề đầy đủ */}
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 mt-3">
                    {getBaseTitle(item.TieuDe)}
                  </h3>

                  {/* Hàng 3: Thông tin người gửi & Thời gian */}
                  <div className="flex items-center justify-between gap-2 flex-wrap mt-1.5 text-xs text-slate-500">
                    <div className="flex items-center gap-2">
                      <span>
                        Người gửi:{" "}
                        <strong className="text-slate-800">
                          {isDeposit
                            ? "Hệ thống Đặt cọc tự động"
                            : item.TenNguoiGui}
                        </strong>
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {isDeposit
                          ? "Tự động (PayOS)"
                          : getRoleBadge(item.QuyenNguoiGui)}
                      </span>
                    </div>
                    <span>Ngày gửi: {formatTimeAgo(item.NgayGui)}</span>
                  </div>

                  {/* Hàng 4: Nội dung chi tiết thông báo hiển thị trực tiếp */}
                  <div className="mt-3.5 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                    <p className="text-xs text-slate-800 whitespace-pre-line leading-relaxed">
                      {item.NoiDung}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <ThongBaoXoaModal
        target={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}

// ============================================================================
// 5. NỘI DUNG TRANG CHÍNH (NHẬN user TRỰC TIẾP TỪ ProtectedRoute)
// ============================================================================
function ThongBaoPageContent({ user }: { user: UserProfile }) {
  const [items, setItems] = useState<ThongBaoItem[]>([]);
  const [loading, setLoading] = useState(true);
  // Mặc định mở "da_nhan" để Chủ trọ & Quản lý khu thấy ngay thông báo đặt cọc mới
  const [activeTab, setActiveTab] = useState<"da_gui" | "da_nhan">("da_nhan");
  const [keyword, setKeyword] = useState("");
  const [maLTB, setMaLTB] = useState("");

  const [isSupremeLandlord, setIsSupremeLandlord] = useState(false);
  const [khuTroList, setKhuTroList] = useState<KhuTroItem[]>([]);
  const [loaiThongBaoList, setLoaiThongBaoList] = useState<LoaiThongBao[]>([]);

  const [socketConnected, setSocketConnected] = useState(false);
  const [realtimeToast, setRealtimeToast] = useState<ThongBaoItem | null>(null);

  const activeUserId = Number(user?.MaND) || resolveCurrentMaND();

  const unreadCount = useMemo(
    () => items.filter((item) => item.TrangThai === "ChuaDoc").length,
    [items],
  );

  const fetchMetadata = useCallback(async () => {
    try {
      const meta = await thongBaoService.getMetadata();
      setIsSupremeLandlord(Boolean(meta.isSupremeLandlord));
      setKhuTroList(meta.khuTroList || []);
      setLoaiThongBaoList(meta.loaiThongBaoList || []);
    } catch (error) {
      console.error("Lỗi tải metadata thông báo:", error);
    }
  }, []);

  const fetchList = useCallback(async () => {
    try {
      setLoading(true);
      const data = await thongBaoService.getDanhSach({
        tab: activeTab,
        keyword: keyword.trim() || undefined,
        maLTB: maLTB || undefined,
      });
      setItems(data);
    } catch (error) {
      console.error("Lỗi tải danh sách thông báo:", error);
    } finally {
      setLoading(false);
    }
  }, [activeTab, keyword, maLTB]);

  useEffect(() => {
    fetchMetadata();
  }, [fetchMetadata]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  useEffect(() => {
    if (!activeUserId) return;
    const socket = getSharedSocket(activeUserId);
    setSocketConnected(socket.connected);

    const onConnect = () => setSocketConnected(true);
    const onDisconnect = () => setSocketConnected(false);

    const onNewNotification = (newNoti: ThongBaoItem) => {
      setRealtimeToast(newNoti);
      fetchList();
    };

    const onDeletedNotification = ({ MaTB }: { MaTB: number }) => {
      setItems((prev) => prev.filter((item) => item.MaTB !== Number(MaTB)));
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("thong_bao_moi", onNewNotification);
    socket.on("xoa_thong_bao", onDeletedNotification);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("thong_bao_moi", onNewNotification);
      socket.off("xoa_thong_bao", onDeletedNotification);
    };
  }, [activeUserId, fetchList]);

  const handleDeleteThongBao = async (maTB: number) => {
    await thongBaoService.xoaThongBao(maTB);
    setItems((prev) => prev.filter((item) => item.MaTB !== maTB));
  };

  const handleMarkedRead = (maTB: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.MaTB === maTB ? { ...item, TrangThai: "DaDoc" } : item,
      ),
    );
  };

  const handleMarkAllRead = async () => {
    try {
      await thongBaoService.danhDauDaDocTatCa();
      setItems((prev) => prev.map((item) => ({ ...item, TrangThai: "DaDoc" })));
    } catch (error) {
      console.error("Lỗi đánh dấu đã đọc tất cả:", error);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900">
      <QuanLyHeader user={user} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        <ThongBaoHeader
          isSupremeLandlord={isSupremeLandlord}
          khuTroList={khuTroList}
          socketConnected={socketConnected}
          currentUserId={activeUserId}
        />

        <ThongBaoSearchBar
          keyword={keyword}
          maLTB={maLTB}
          activeTab={activeTab}
          loaiThongBaoList={loaiThongBaoList}
          unreadCount={activeTab === "da_nhan" ? unreadCount : 0}
          onKeywordChange={setKeyword}
          onMaLTBChange={setMaLTB}
          onTabChange={setActiveTab}
          onMarkAllRead={handleMarkAllRead}
        />

        <ThongBaoList
          items={items}
          loading={loading}
          currentUserId={activeUserId}
          isSupremeLandlord={isSupremeLandlord}
          onDelete={handleDeleteThongBao}
          onMarkedRead={handleMarkedRead}
        />
      </main>

      <ThongBaoRealtimeToast
        notification={realtimeToast}
        onClose={() => setRealtimeToast(null)}
      />
    </div>
  );
}

export default function ThongBaoPage() {
  return (
    <ProtectedRoute allowedRoles={["ChuTro", "QuanLy"]}>
      {(user) => <ThongBaoPageContent user={user} />}
    </ProtectedRoute>
  );
}