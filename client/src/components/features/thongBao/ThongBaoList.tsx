// client/src/components/features/thongBao/ThongBaoList.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import { thongBaoService } from "@/services/thongBao.service";
import {
  ThongBaoChiTiet,
  ThongBaoItem,
  ThongBaoReplyItem,
} from "@/types/thongBao.type";
import {
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

type MergedThongBaoItem = ThongBaoItem & {
  mergedUnreadIds?: number[];
};

// Chuẩn hóa tiêu đề gốc (loại bỏ tiền tố "Phản hồi:" ở đầu)
const getBaseTitle = (title?: string) =>
  (title || "").replace(/^(Phản hồi:\s*)+/i, "").trim();

// Kiểm tra xem bản ghi có phải là thông báo phản hồi con hay không
const isReplyItem = (item: ThongBaoItem) => {
  const raw = item as ThongBaoItem & {
    MaTBCha?: number | null;
    MaTBGoc?: number | null;
  };
  if (raw.MaTBCha || raw.MaTBGoc) return true;
  return /^Phản hồi:\s*/i.test((item.TieuDe || "").trim());
};

export default function ThongBaoList({
  items,
  loading,
  currentUserId,
  onDelete,
}: ThongBaoListProps) {
  // State quản lý xóa thông báo
  const [deleteTarget, setDeleteTarget] = useState<{
    MaTB: number;
    TieuDe: string;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // State chi tiết thông báo & phản hồi (Cột bên phải)
  const [selectedDetail, setSelectedDetail] =
    useState<ThongBaoChiTiet | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [replyMessage, setReplyMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // State lưu số lượng phản hồi & trạng thái đã đọc cục bộ khi cập nhật Real-time
  const [replyCountMap, setReplyCountMap] = useState<Record<number, number>>(
    {},
  );
  const [readMap, setReadMap] = useState<Record<number, boolean>>({});

  // Lọc và gộp các thông báo phản hồi trùng với thông báo gốc
  const filteredItems = useMemo<MergedThongBaoItem[]>(() => {
    const groupMap = new Map<string, MergedThongBaoItem>();

    for (const item of items) {
      const baseTitle = getBaseTitle(item.TieuDe).toLowerCase();
      const groupKey = `${item.MaLTB ?? item.TenLTB}::${baseTitle}`;
      const existing = groupMap.get(groupKey);

      if (!existing) {
        groupMap.set(groupKey, {
          ...item,
          mergedUnreadIds:
            item.TrangThai === "ChuaDoc" ? [item.MaTB] : [],
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

      // Ưu tiên giữ lại thông báo gốc (không có tiền tố "Phản hồi:") làm đại diện hiển thị
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

  // Lắng nghe phản hồi mới & sự kiện xóa qua Shared Socket
  useEffect(() => {
    const socket = getSharedSocket(currentUserId);

    const handleNewReply = (payload: {
      rootMaTB: number;
      phanHoi: ThongBaoReplyItem;
    }) => {
      const rootId = Number(payload.rootMaTB);

      // Cập nhật chi tiết đang mở ở cột phải (nếu trùng thông báo)
      setSelectedDetail((prev) => {
        if (!prev || prev.MaTB !== rootId) return prev;
        if (prev.dsPhanHoi.some((r) => r.MaTB === payload.phanHoi.MaTB)) {
          return prev;
        }
        const updatedReplies = [...prev.dsPhanHoi, payload.phanHoi];
        setReplyCountMap((mapPrev) => ({
          ...mapPrev,
          [rootId]: updatedReplies.length,
        }));
        return {
          ...prev,
          dsPhanHoi: updatedReplies,
        };
      });

      // Cập nhật bộ đếm ở danh sách bên trái nếu đang không mở thông báo đó
      setReplyCountMap((prev) => {
        if (selectedDetail?.MaTB === rootId) return prev;
        const baseItem = filteredItems.find((i) => i.MaTB === rootId);
        const currentCount = prev[rootId] ?? baseItem?.SoPhanHoi ?? 0;
        return {
          ...prev,
          [rootId]: currentCount + 1,
        };
      });
    };

    const handleDeleteNoti = ({ MaTB }: { MaTB: number }) => {
      setSelectedDetail((prev) =>
        prev?.MaTB === Number(MaTB) ? null : prev,
      );
    };

    socket.on("phan_hoi_thong_bao", handleNewReply);
    socket.on("xoa_thong_bao", handleDeleteNoti);

    return () => {
      socket.off("phan_hoi_thong_bao", handleNewReply);
      socket.off("xoa_thong_bao", handleDeleteNoti);
    };
  }, [currentUserId, filteredItems, selectedDetail?.MaTB]);

  // Mở xem chi tiết 1 thông báo ở cột bên phải & đánh dấu đã đọc
  const handleSelectItem = async (item: MergedThongBaoItem) => {
    setDetailLoading(true);
    setReplyMessage(null);
    setReplyText("");

    if (item.TrangThai === "ChuaDoc") {
      setReadMap((prev) => ({ ...prev, [item.MaTB]: true }));
    }

    try {
      const detail = await thongBaoService.getChiTiet(item.MaTB);
      setSelectedDetail(detail);
      if (detail.dsPhanHoi) {
        setReplyCountMap((prev) => ({
          ...prev,
          [item.MaTB]: detail.dsPhanHoi.length,
        }));
      }

      // Đánh dấu đã đọc luôn cho các bản ghi phản hồi con được gộp (nếu có)
      if (item.mergedUnreadIds && item.mergedUnreadIds.length > 0) {
        item.mergedUnreadIds
          .filter((id) => id !== item.MaTB)
          .forEach((id) => {
            thongBaoService.getChiTiet(id).catch(() => {});
          });
      }
    } catch (error) {
      console.error("Lỗi tải chi tiết thông báo:", error);
    } finally {
      setDetailLoading(false);
    }
  };

  // Gửi trả lời trong luồng thông báo
  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDetail || !replyText.trim()) return;

    try {
      setSendingReply(true);
      setReplyMessage(null);
      const newReply = await thongBaoService.traLoiThongBao(
        selectedDetail.MaTB,
        replyText.trim(),
      );

      setSelectedDetail((prev) => {
        if (!prev) return null;
        const exists = prev.dsPhanHoi.some((r) => r.MaTB === newReply.MaTB);
        const updatedReplies = exists
          ? prev.dsPhanHoi
          : [...prev.dsPhanHoi, newReply];

        setReplyCountMap((mapPrev) => ({
          ...mapPrev,
          [prev.MaTB]: updatedReplies.length,
        }));

        return {
          ...prev,
          dsPhanHoi: updatedReplies,
        };
      });

      setReplyText("");
      setReplyMessage({
        type: "success",
        text: "Đã gửi phản hồi thành công!",
      });
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Không thể gửi phản hồi.";
      setReplyMessage({ type: "error", text: msg });
    } finally {
      setSendingReply(false);
    }
  };

  // Xác nhận xóa thông báo
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      setDeleteError("");
      await onDelete(deleteTarget.MaTB, deleteTarget.TieuDe);
      if (selectedDetail?.MaTB === deleteTarget.MaTB) {
        setSelectedDetail(null);
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

  return (
    <>
      {/* Bố cục 2 cột: Danh sách bên trái (5 cột) - Chi tiết & Phản hồi bên phải (7 cột) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Cột trái: Danh sách thông báo (5 cột) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">
              Danh sách ({filteredItems.length})
            </span>
          </div>

          <div className="divide-y divide-slate-100 max-h-160 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400">
                Đang tải danh sách thông báo...
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                Không có thông báo nào phù hợp.
              </div>
            ) : (
              filteredItems.map((item) => {
                const isUnread =
                  item.TrangThai === "ChuaDoc" && !readMap[item.MaTB];
                const isSelected = selectedDetail?.MaTB === item.MaTB;
                const replyCount =
                  replyCountMap[item.MaTB] ?? item.SoPhanHoi ?? 0;

                return (
                  <div
                    key={item.MaTB}
                    onClick={() => handleSelectItem(item)}
                    className={`p-4 cursor-pointer transition ${
                      isSelected
                        ? "bg-[#00FFCC]/25 border-l-4 border-teal-500"
                        : isUnread
                        ? "bg-[#00FFCC]/10 hover:bg-[#00FFCC]/20"
                        : "bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {item.TenLTB}
                        </span>
                        {item.SoNguoiNhan !== undefined && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                            Đã gửi {item.SoNguoiNhan} người
                          </span>
                        )}
                        {replyCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700">
                            {replyCount} phản hồi
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isUnread && (
                          <span
                            title="Chưa đọc"
                            className="w-2.5 h-2.5 rounded-full bg-teal-500 shrink-0"
                          />
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteError("");
                            setDeleteTarget({
                              MaTB: item.MaTB,
                              TieuDe: item.TieuDe,
                            });
                          }}
                          className="px-2 py-0.5 rounded-lg text-[10px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition cursor-pointer"
                        >
                          Xóa
                        </button>
                      </div>
                    </div>

                    <h3
                      className={`text-xs text-slate-900 mt-1.5 line-clamp-1 ${
                        isUnread ? "font-bold" : "font-semibold"
                      }`}
                    >
                      {getBaseTitle(item.TieuDe)}
                    </h3>

                    <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                      {item.NoiDung}
                    </p>

                    <div className="flex items-center justify-between mt-2.5 text-[11px] text-slate-400">
                      <span>
                        Người gửi:{" "}
                        <strong className="text-slate-600">
                          {item.TenNguoiGui}
                        </strong>
                      </span>
                      <span>{formatTimeAgo(item.NgayGui)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Cột phải: Nội dung chi tiết & Trả lời thông báo (7 cột) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col min-h-120">
          {detailLoading ? (
            <div className="flex-1 flex items-center justify-center p-10 text-xs text-slate-400">
              Đang tải chi tiết thông báo...
            </div>
          ) : !selectedDetail ? (
            <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
              <div className="w-12 h-12 rounded-2xl bg-[#00FFCC]/20 border border-[#00FFCC] flex items-center justify-center text-slate-700 mb-3 font-bold">
                🔔
              </div>
              <p className="text-sm font-bold text-slate-800">
                Chọn một thông báo để xem chi tiết
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Bạn có thể xem toàn bộ nội dung thông báo và gửi phản hồi trao
                đổi trực tiếp với khách thuê tại đây.
              </p>
            </div>
          ) : (
            <>
              {/* Header chi tiết */}
              <div className="p-5 bg-slate-50 border-b border-slate-200">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#00FFCC] text-slate-900">
                      {selectedDetail.TenLTB}
                    </span>
                    {selectedDetail.SoNguoiNhan !== undefined && (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-teal-50 text-teal-700 border border-teal-200">
                        Đã gửi tới {selectedDetail.SoNguoiNhan} người
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">
                      Ngày gửi: {formatTimeAgo(selectedDetail.NgayGui)}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteError("");
                        setDeleteTarget({
                          MaTB: selectedDetail.MaTB,
                          TieuDe: selectedDetail.TieuDe,
                        });
                      }}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition cursor-pointer"
                    >
                      Xóa thông báo
                    </button>
                  </div>
                </div>

                <h2 className="text-base font-bold text-slate-900 mt-2">
                  {getBaseTitle(selectedDetail.TieuDe)}
                </h2>
                <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-600">
                  <span>
                    Từ: <strong>{selectedDetail.TenNguoiGui}</strong>
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
                    {getRoleBadge(selectedDetail.QuyenNguoiGui)}
                  </span>
                </div>
              </div>

              {/* Nội dung chính & Danh sách phản hồi */}
              <div className="p-5 space-y-5 flex-1 max-h-105 overflow-y-auto">
                {/* Nội dung gốc */}
                <div className="p-4 rounded-2xl bg-[#00FFCC]/10 border border-teal-200">
                  <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-line leading-relaxed">
                    {selectedDetail.NoiDung}
                  </p>
                </div>

                {/* Luồng trao đổi / Phản hồi */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Trao đổi & Phản hồi (
                    {selectedDetail.dsPhanHoi?.length || 0})
                  </h4>

                  {selectedDetail.dsPhanHoi?.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">
                      Chưa có phản hồi nào cho thông báo này.
                    </p>
                  ) : (
                    selectedDetail.dsPhanHoi.map((rep) => (
                      <div
                        key={rep.MaTB}
                        className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200"
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">
                              {rep.TenNguoiGui}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white border border-slate-200 text-slate-600">
                              {getRoleBadge(rep.QuyenNguoiGui)}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400">
                            {formatTimeAgo(rep.NgayGui)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed">
                          {rep.NoiDung}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Khung nhập trả lời thông báo */}
              <form
                onSubmit={handleReplySubmit}
                className="p-4 bg-slate-50 border-t border-slate-200 space-y-2"
              >
                {replyMessage && (
                  <p
                    className={`text-xs font-semibold ${
                      replyMessage.type === "success"
                        ? "text-teal-700"
                        : "text-red-600"
                    }`}
                  >
                    {replyMessage.text}
                  </p>
                )}

                <div className="flex items-end gap-2.5">
                  <textarea
                    rows={2}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Nhập nội dung phản hồi cho thông báo này..."
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-teal-500 resize-none"
                  />
                  <button
                    type="submit"
                    disabled={sendingReply || !replyText.trim()}
                    className="px-5 py-2.5 rounded-xl bg-[#00FFCC] hover:bg-teal-300 disabled:opacity-50 text-slate-900 text-xs font-bold shrink-0 cursor-pointer transition"
                  >
                    {sendingReply ? "Đang gửi..." : "Gửi trả lời"}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>

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