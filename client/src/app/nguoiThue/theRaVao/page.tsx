// client/src/app/nguoiThue/theRaVao/page.tsx
"use client";

import React, { useEffect, useState, useCallback } from "react";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import NguoiThueHeader from "@/components/layout/NguoiThueHeader";
import { useAlertModal } from "@/components/common/AlertModalProvider";
import { UserProfile } from "@/types/auth.type";
import {
  theRaVaoService,
  TheRaVaoItem,
  LichSuTheItem,
} from "@/services/theRaVao.service";

interface ThongTinThue {
  TenPhong: string;
  TenKhu: string;
}

function NguoiThueTheRaVaoContent({ user }: { user: UserProfile }) {
  const { showSuccess, showError } = useAlertModal();

  const [loading, setLoading] = useState<boolean>(true);
  const [dsThe, setDsThe] = useState<TheRaVaoItem[]>([]);
  const [lichSu, setLichSu] = useState<LichSuTheItem[]>([]);
  const [thongTinThue, setThongTinThue] = useState<ThongTinThue | null>(null);

  // Form yêu cầu cấp lại thẻ
  const [lyDo, setLyDo] = useState<string>("");
  const [khoaTheCu, setKhoaTheCu] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Bộ lọc lịch sử cá nhân
  const [tuNgay, setTuNgay] = useState<string>("");
  const [denNgay, setDenNgay] = useState<string>("");

  const formatDateVN = (dateStr?: string) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("vi-VN");
  };

  const loadData = useCallback(
    async (overrides?: { tuNgay?: string; denNgay?: string }) => {
      try {
        setLoading(true);
        const res = await theRaVaoService.getTheCuaToi({
          tuNgay: overrides?.tuNgay ?? tuNgay,
          denNgay: overrides?.denNgay ?? denNgay,
        });
        if (res.success && res.data) {
          setDsThe(res.data.dsThe || []);
          setLichSu(res.data.lichSu || []);
          setThongTinThue(res.data.thongTinThue || null);
        }
      } catch (err: unknown) {
        showError(err instanceof Error ? err.message : "Không thể tải thông tin thẻ ra vào.");
      } finally {
        setLoading(false);
      }
    },
    [tuNgay, denNgay, showError]
  );

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleYeuCauCapLai = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lyDo.trim()) return;
    try {
      setSubmitting(true);
      const res = await theRaVaoService.yeuCauCapLai({ lyDo, khoaTheCu });
      showSuccess(res.message || "Đã gửi yêu cầu cấp lại thẻ thành công!");
      setLyDo("");
      await loadData();
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : "Gửi yêu cầu thất bại.");
    } finally {
      setSubmitting(false);
    }
  };

  const theDangHoatDong = dsThe.find((t) => t.TrangThai === "HoatDong");
  const theDangCho = dsThe.find((t) =>
    ["ChoCapLai", "DangGhiThe"].includes(t.TrangThai)
  );

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900">
      <NguoiThueHeader user={user} />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Tiêu đề First Page */}
        <div className="pb-5 border-b border-slate-200">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Thẻ Ra Vào & Lịch Sử Mở Cổng
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {thongTinThue
              ? `Phòng ${thongTinThue.TenPhong} • ${thongTinThue.TenKhu}`
              : "Theo dõi thẻ từ RFID cá nhân, gửi yêu cầu cấp lại thẻ và xem lịch sử ra vào của bạn."}
          </p>
        </div>

        {/* 1. Khu vực Quét NFC mở cổng (triển khai giai đoạn sau) */}
        <div className="p-5 rounded-2xl border border-dashed border-teal-400 bg-teal-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#00FFCC] text-slate-900">
              Sắp ra mắt
            </span>
            <h2 className="text-base font-bold text-slate-900 mt-1.5">
              Quét NFC điện thoại mở cổng
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Chạm điện thoại vào điểm quét NFC tại cổng khu trọ để mở cửa khi quên mang thẻ từ.
            </p>
          </div>
          <button
            type="button"
            disabled
            className="px-5 py-2.5 rounded-xl bg-slate-200 text-slate-500 text-xs font-bold cursor-not-allowed shrink-0"
          >
            Quét NFC mở cổng
          </button>
        </div>

        {/* 2. Thẻ hiện tại & Form Yêu cầu cấp lại thẻ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Thông tin thẻ hiện tại */}
          <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-3">
            <h2 className="text-base font-bold text-slate-900">Thẻ từ RFID của bạn</h2>

            {loading ? (
              <p className="text-xs text-slate-500">Đang tải thông tin thẻ...</p>
            ) : theDangHoatDong ? (
              <div className="p-4 rounded-xl bg-slate-900 text-white space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-wider text-slate-400">
                    Thẻ ra vào hợp lệ
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-[#00FFCC] text-slate-900 text-[11px] font-bold">
                    Đang hoạt động
                  </span>
                </div>
                <p className="text-lg font-mono font-bold tracking-wider text-[#00FFCC]">
                  {theDangHoatDong.MaUID || "Đang đồng bộ"}
                </p>
                <div className="text-xs text-slate-300 flex justify-between pt-2 border-t border-slate-700">
                  <span>{user.HoTen}</span>
                  <span>Cấp ngày: {formatDateVN(theDangHoatDong.NgayTao)}</span>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
                Hiện bạn chưa có thẻ từ nào đang hoạt động.
              </div>
            )}

            {theDangCho && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                <p className="font-bold">
                  {theDangCho.TrangThai === "DangGhiThe"
                    ? "Quản lý đang tiến hành nạp thẻ mới cho bạn trên đầu đọc."
                    : "Yêu cầu cấp lại thẻ của bạn đang chờ Quản lý cơ sở duyệt."}
                </p>
                {theDangCho.GhiChu && (
                  <p className="mt-1 text-amber-800">Lý do: {theDangCho.GhiChu}</p>
                )}
              </div>
            )}
          </div>

          {/* Form yêu cầu cấp lại */}
          <form
            onSubmit={handleYeuCauCapLai}
            className="p-5 rounded-2xl border border-slate-200 bg-white space-y-3"
          >
            <h2 className="text-base font-bold text-slate-900">Yêu cầu cấp lại thẻ</h2>
            <p className="text-xs text-slate-500">
              Báo mất, hỏng hoặc quên thẻ để Quản lý cơ sở khóa thẻ cũ và cấp lại phôi thẻ mới.
            </p>
            <textarea
              rows={3}
              value={lyDo}
              onChange={(e) => setLyDo(e.target.value)}
              placeholder="Nhập lý do (VD: Làm rơi mất thẻ ngoài đường, thẻ quẹt không nhận...)"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
              required
            />
            <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={khoaTheCu}
                onChange={(e) => setKhoaTheCu(e.target.checked)}
                className="rounded border-slate-300"
              />
              Khóa ngay thẻ cũ để đảm bảo an toàn cho khu trọ
            </label>
            <button
              type="submit"
              disabled={submitting || !!theDangCho || !thongTinThue}
              className="w-full py-2.5 rounded-xl bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 border border-teal-400 text-xs font-bold disabled:bg-slate-200 disabled:text-slate-500 disabled:border-slate-200 cursor-pointer"
            >
              {submitting
                ? "Đang gửi yêu cầu..."
                : theDangCho
                ? "Đang có yêu cầu chờ xử lý"
                : "Gửi yêu cầu cấp lại thẻ"}
            </button>
          </form>
        </div>

        {/* 3. Lịch sử ra vào của bản thân */}
        <section className="p-5 rounded-2xl border border-slate-200 bg-white space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Lịch sử ra vào của bạn
              </h2>
              <p className="text-xs text-slate-500">
                Ghi nhận tự động mỗi khi bạn quẹt thẻ mở cổng khu trọ.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                loadData();
              }}
              className="flex flex-wrap items-end gap-2"
            >
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Từ ngày
                </label>
                <input
                  type="date"
                  value={tuNgay}
                  onChange={(e) => setTuNgay(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Đến ngày
                </label>
                <input
                  type="date"
                  value={denNgay}
                  onChange={(e) => setDenNgay(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 border border-teal-400 text-xs font-bold cursor-pointer"
              >
                Lọc
              </button>
              {(tuNgay || denNgay) && (
                <button
                  type="button"
                  onClick={() => {
                    setTuNgay("");
                    setDenNgay("");
                    loadData({ tuNgay: "", denNgay: "" });
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer"
                >
                  Xem hết
                </button>
              )}
            </form>
          </div>

          {loading ? (
            <p className="py-8 text-center text-xs text-slate-500">Đang tải lịch sử...</p>
          ) : lichSu.length === 0 ? (
            <div className="p-8 text-center rounded-xl bg-slate-50 border border-dashed border-slate-300 text-xs text-slate-500">
              Chưa có lượt quẹt thẻ mở cổng nào trong khoảng thời gian này.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase">
                    <th className="py-3 px-4 font-bold">Ngày quẹt</th>
                    <th className="py-3 px-4 font-bold">Giờ mở cổng</th>
                    <th className="py-3 px-4 font-bold">UID thẻ</th>
                    <th className="py-3 px-4 font-bold">Cơ sở</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {lichSu.map((ls) => (
                    <tr key={ls.MaLS} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-semibold">
                        {formatDateVN(ls.NgayQuetThe)}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-teal-700">
                        {ls.GioQuetThe}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700">
                        {ls.MaUID || "—"}
                      </td>
                      <td className="py-3 px-4 text-slate-600">{ls.TenKhu || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default function NguoiThueTheRaVaoPage() {
  return (
    <ProtectedRoute allowedRoles={["KhachThue"]}>
      {(user) => <NguoiThueTheRaVaoContent user={user} />}
    </ProtectedRoute>
  );
}