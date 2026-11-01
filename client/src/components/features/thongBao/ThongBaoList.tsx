// client/src/components/features/thongBao/ThongBaoList.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ThongBaoItem,
  ThongBaoReplyItem,
} from "@/types/thongBao.type";
import ThongBaoDetailModal, {
  formatTimeAgo,
  getRoleBadge,
  getSharedSocket,
} from "./ThongBaoDetailModal";

interface ThongBaoListProps {
  items: ThongBaoItem[];
  loading: boolean;
  currentUserId?: number;
  isSupremeLandlord?: boolean;
  onDelete: (maTB: number, tieuDe: string) => Promise<void> | void;
}

export default function ThongBaoList({
  items,
  loading,
  currentUserId,
  onDelete,
}: ThongBaoListProps) {
  // State quản lý xóa thông báo
  const [deleteTarget, setDeleteTarget] = useState<ThongBaoItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Mã thông báo đang mở trong Modal Xem chi tiết & Trả lời dùng chung
  const [selectedMaTB, setSelectedMaTB] = useState<number | null>(null);

  // State lưu số lượng phản hồi & trạng thái đã đọc cục bộ khi có cập nhật Real-time
  const [replyCountMap, setReplyCountMap] = useState<Record<number, number>>(
    {},
  );
  const [readMap, setReadMap] = useState<Record<number, boolean>>({});

  // Cập nhật số lượng phản hồi từ Modal dùng chung
  const handleReplyCountChange = useCallback((maTB: number, count: number) => {
    setReplyCountMap((prev) => ({
      ...prev,
      [maTB]: count,
    }));
  }, []);

  // Lắng nghe phản hồi mới qua Shared Socket để tăng bộ đếm ngoài thẻ danh sách
  useEffect(() => {
    const socket = getSharedSocket(currentUserId);

    const handleNewReply = (payload: {
      rootMaTB: number;
      phanHoi: ThongBaoReplyItem;
    }) => {
      const rootId = Number(payload.rootMaTB);
      setReplyCountMap((prev) => {
        const baseItem = items.find((i) => i.MaTB === rootId);
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
  }, [currentUserId, items]);

  // Mở Modal xem chi tiết & luồng trả lời
  const handleSelectNotification = (item: ThongBaoItem) => {
    if (item.TrangThai === "ChuaDoc") {
      setReadMap((prev) => ({ ...prev, [item.MaTB]: true }));
    }
    setSelectedMaTB(item.MaTB);
  };

  // Xác nhận xóa thông báo
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      setDeleteError("");
      await onDelete(deleteTarget.MaTB, deleteTarget.TieuDe);
      if (selectedMaTB === deleteTarget.MaTB) {
        setSelectedMaTB(null);
      }
      setDeleteTarget(null);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Xóa thông báo thất bại.";
      setDeleteError(msg);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center text-sm text-slate-500">
        Đang tải danh sách thông báo...
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center space-y-2">
        <p className="text-base font-bold text-slate-800">
          Chưa có thông báo nào phù hợp
        </p>
        <p className="text-xs text-slate-500">
          Hãy thử thay đổi từ khóa tìm kiếm hoặc nhấn &ldquo;Soạn Thông Báo
          Mới&rdquo; để gửi thông báo đầu tiên.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {items.map((tb) => {
          const isUnread =
            tb.TrangThai === "ChuaDoc" && !readMap[tb.MaTB];
          const replyCount =
            replyCountMap[tb.MaTB] ?? tb.SoPhanHoi ?? 0;

          return (
            <div
              key={tb.MaTB}
              onClick={() => handleSelectNotification(tb)}
              className={`bg-white border rounded-3xl p-6 shadow-xs flex flex-col justify-between space-y-4 hover:border-teal-400 hover:shadow-md transition cursor-pointer ${
                isUnread
                  ? "border-teal-300 bg-[#00FFCC]/5"
                  : "border-slate-200"
              }`}
            >
              <div className="space-y-3">
                {/* Hàng Badge: Loại thông báo, Số người nhận, Số phản hồi */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-[#00FFCC]/40 text-slate-900">
                      {tb.TenLTB}
                    </span>

                    {tb.SoNguoiNhan !== undefined && (
                      <span className="text-[11px] font-semibold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200">
                        Đã gửi tới {tb.SoNguoiNhan} người
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border ${
                        replyCount > 0
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-slate-50 text-slate-500 border-slate-200"
                      }`}
                    >
                      💬 {replyCount} phản hồi
                    </span>

                    {isUnread && (
                      <span
                        title="Chưa đọc"
                        className="w-2.5 h-2.5 rounded-full bg-teal-500 shrink-0"
                      />
                    )}
                  </div>
                </div>

                {/* Tiêu đề & Nội dung */}
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 line-clamp-1">
                    {tb.TieuDe}
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed mt-1.5 whitespace-pre-line line-clamp-3">
                    {tb.NoiDung}
                  </p>
                </div>
              </div>

              {/* Footer thẻ: Thông tin người gửi + Nút Trả lời & Xóa */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                <div className="text-[11px] text-slate-500 space-y-0.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-slate-700">
                      Người gửi: {tb.TenNguoiGui}
                    </span>
                    {tb.QuyenNguoiGui && (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 text-slate-600">
                        {getRoleBadge(tb.QuyenNguoiGui)}
                      </span>
                    )}
                  </div>
                  <p>{formatTimeAgo(tb.NgayGui)}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectNotification(tb);
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-teal-800 bg-[#00FFCC]/40 hover:bg-[#00FFCC] border border-teal-300 transition cursor-pointer flex items-center gap-1.5"
                  >
                    <span>Xem & Trả lời</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteError("");
                      setDeleteTarget(tb);
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition cursor-pointer flex items-center gap-1.5"
                  >
                    <span>Xóa thông báo</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Xem Chi Tiết & Trả Lời Thông Báo Dùng Chung */}
      <ThongBaoDetailModal
        maTB={selectedMaTB}
        userId={currentUserId}
        onClose={() => setSelectedMaTB(null)}
        onReplyCountChange={handleReplyCountChange}
      />

      {/* Modal xác nhận xóa thông báo */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                Xác nhận xóa thông báo
              </h3>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="w-8 h-8 rounded-full bg-slate-200/70 hover:bg-slate-300 flex items-center justify-center text-xs font-bold text-slate-700 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              {deleteError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-600 font-medium">
                  {deleteError}
                </div>
              )}

              <p className="text-xs text-slate-600 leading-relaxed">
                Bạn có chắc chắn muốn xóa thông báo{" "}
                <strong className="text-slate-900">
                  &ldquo;{deleteTarget.TieuDe}&rdquo;
                </strong>
                ? Hành động này không thể hoàn tác.
              </p>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  disabled={deleting}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={deleting}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold cursor-pointer transition"
                >
                  {deleting ? "Đang xóa..." : "Xóa vĩnh viễn"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}