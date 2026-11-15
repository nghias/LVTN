// thongBao/xoa/page.tsx
"use client";

import { useState } from "react";

export interface DeleteTarget {
  MaTB: number;
  TieuDe: string;
}

export interface ThongBaoXoaModalProps {
  target: DeleteTarget | null;
  onClose: () => void;
  onConfirm: (maTB: number, tieuDe: string) => Promise<void> | void;
}

export function ThongBaoXoaModal({
  target,
  onClose,
  onConfirm,
}: ThongBaoXoaModalProps) {
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  if (!target) return null;

  const handleConfirmDelete = async () => {
    try {
      setDeleting(true);
      setDeleteError("");
      await onConfirm(target.MaTB, target.TieuDe);
      onClose();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Xóa thông báo thất bại.";
      setDeleteError(msg);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">
            Xác nhận xóa thông báo
          </h3>
          <button
            type="button"
            onClick={onClose}
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
              &ldquo;{target.TieuDe}&rdquo;
            </strong>
            ? Hành động này không thể hoàn tác.
          </p>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
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
  );
}

export default ThongBaoXoaModal;