"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import QuanLyHeader from "@/components/layout/QuanLyHeader";
import { useAlertModal } from "@/components/common/AlertModalProvider";
import { datPhongService } from "@/services/datPhong.service";
import { DatPhongXoaModal, canDeleteBooking } from "./xoa/page";

import {
  DatPhongItem,
  KetQuaHoanCoc,
  KhuTroBrief,
  PhuongThucHoanCoc,
  ThongKeDatPhong,
  TrangThaiDatPhong,
} from "@/types/datPhong.type";

const formatVND = (amount?: number | null) =>
  `${Math.round(Number(amount || 0)).toLocaleString("vi-VN")}đ`;

const formatDateTime = (raw?: string | null) => {
  if (!raw) return "—";
  const d = new Date(raw.replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const STATUS_BADGE: Record<
  TrangThaiDatPhong,
  { text: string; className: string }
> = {
  ChoThanhToan: {
    text: "Chờ thanh toán QR",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  DaDatCoc: {
    text: "Đang giữ phòng",
    className: "bg-[#00FFCC]/30 text-slate-900 border-teal-300",
  },
  TrungLapCanHoan: {
    text: "Trùng lặp — Cần hoàn 100%",
    className: "bg-rose-50 text-rose-700 border-rose-300 animate-pulse",
  },
  DaHoanCoc_ChotThue: {
    text: "Đã hoàn — Chốt thuê",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  DaHoanCoc_KhongThue: {
    text: "Đã hoàn — Không thuê",
    className: "bg-sky-50 text-sky-700 border-sky-200",
  },
  QuaHanMatCoc: {
    text: "Quá hạn mất cọc",
    className: "bg-slate-200 text-slate-700 border-slate-300",
  },
  DaHuy: {
    text: "Đã hủy (Hết hạn QR)",
    className: "bg-slate-100 text-slate-500 border-slate-200",
  },
};

export default function QuanLyDatPhongPage() {
  const { showSuccess, showError } = useAlertModal();

  const [loading, setLoading] = useState(true);
  const [danhSach, setDanhSach] = useState<DatPhongItem[]>([]);
  const [khuTroList, setKhuTroList] = useState<KhuTroBrief[]>([]);
  const [thongKe, setThongKe] = useState<ThongKeDatPhong>({
    tongDon: 0,
    choThanhToan: 0,
    daDatCoc: 0,
    trungLapCanHoan: 0,
    daHoanCoc: 0,
    quaHanMatCoc: 0,
    daHuy: 0,
  });

  // Bộ lọc
  const [maKhuFilter, setMaKhuFilter] = useState<string>("ALL");
  const [trangThaiFilter, setTrangThaiFilter] = useState<string>("ALL");
  const [keyword, setKeyword] = useState<string>("");
  const [debouncedKeyword, setDebouncedKeyword] = useState<string>("");

  // Modal xác nhận hoàn cọc
  const [refundTarget, setRefundTarget] = useState<{
    item: DatPhongItem;
    ketQua: KetQuaHoanCoc;
  } | null>(null);
  const [phuongThucHoan, setPhuongThucHoan] =
    useState<PhuongThucHoanCoc>("TienMat");
  const [ghiChuHoanCoc, setGhiChuHoanCoc] = useState<string>("");
  const [submittingRefund, setSubmittingRefund] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedKeyword(keyword.trim()), 300);
    return () => clearTimeout(timer);
  }, [keyword]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await datPhongService.layDanhSachQuanLy({
        maKhu: maKhuFilter,
        trangThai: trangThaiFilter,
        keyword: debouncedKeyword,
      });
      setDanhSach(res.data.danhSach || []);
      setThongKe(res.data.thongKe);
      setKhuTroList(res.data.khuTroList || []);
    } catch (err: any) {
      showError(err?.message || "Không thể tải danh sách đặt cọc giữ phòng.");
    } finally {
      setLoading(false);
    }
  }, [maKhuFilter, trangThaiFilter, debouncedKeyword, showError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openRefundModal = (item: DatPhongItem, ketQua: KetQuaHoanCoc) => {
    setRefundTarget({ item, ketQua });
    setPhuongThucHoan(ketQua === "TrungLap" ? "ChuyenKhoan" : "TienMat");
    setGhiChuHoanCoc(
      ketQua === "ChotThue"
        ? `Hoàn 100% cọc giữ chỗ (${formatVND(item.SoTienCoc)}) và lập hợp đồng thuê phòng ${item.TenPhong}`
        : ketQua === "KhongThue"
          ? `Khách xem phòng không thuê, đã hoàn 100% cọc giữ chỗ (${formatVND(item.SoTienCoc)})`
          : `Đã hoàn 100% tiền cọc do giao dịch trùng lặp`,
    );
  };

  const handleConfirmRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundTarget) return;

    try {
      setSubmittingRefund(true);
      const res = await datPhongService.xacNhanHoanCoc(refundTarget.item.MaDP, {
        ketQua: refundTarget.ketQua,
        phuongThucHoan,
        ghiChuHoanCoc: ghiChuHoanCoc.trim(),
      });
      showSuccess(res.message || "Xác nhận hoàn cọc thành công!");
      setRefundTarget(null);
      await loadData();
    } catch (err: any) {
      showError(err?.message || "Không thể xác nhận hoàn cọc.");
    } finally {
      setSubmittingRefund(false);
    }
  };

  const [deleteTarget, setDeleteTarget] = useState<DatPhongItem | null>(null);

  const handleConfirmDelete = async (item: DatPhongItem) => {
    const res = await datPhongService.xoaDatPhong(item.MaDP);
    showSuccess(res.message || `Đã xóa hóa đơn ${item.MaTraCuu}!`);
    await loadData();
  };

  return (
    <ProtectedRoute allowedRoles={["ChuTro", "QuanLy"]}>
      {(user) => (
        <div className="min-h-screen bg-[#F1F5F9] text-slate-900">
          <QuanLyHeader user={user} />

          <main className="mx-auto max-w-7xl px-3 sm:px-6 py-6 space-y-5">
            {/* Tiêu đề trang */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                  Quản Lý Đặt Cọc Giữ Phòng
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Theo dõi giao dịch cọc PayOS VietQR, đối soát biên lai khi
                  khách đến xem phòng và xác nhận hoàn cọc 100%.
                </p>
              </div>
              <button
                type="button"
                onClick={loadData}
                className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2 text-xs font-bold text-slate-700 shadow-2xs cursor-pointer"
              >
                ↻ Làm mới dữ liệu
              </button>
            </div>

            {/* Thẻ thống kê nhanh */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs">
                <span className="text-[11px] font-semibold text-slate-500">
                  Tổng số đơn
                </span>
                <p className="mt-1 text-xl font-bold text-slate-900">
                  {thongKe.tongDon}
                </p>
              </div>
              <div className="rounded-2xl border border-teal-200 bg-[#00FFCC]/15 p-3.5 shadow-2xs">
                <span className="text-[11px] font-semibold text-teal-800">
                  Đang giữ phòng
                </span>
                <p className="mt-1 text-xl font-bold text-teal-900">
                  {thongKe.daDatCoc}
                </p>
              </div>
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3.5 shadow-2xs">
                <span className="text-[11px] font-semibold text-rose-700">
                  Trùng lặp cần hoàn
                </span>
                <p className="mt-1 text-xl font-bold text-rose-700">
                  {thongKe.trungLapCanHoan}
                </p>
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3.5 shadow-2xs">
                <span className="text-[11px] font-semibold text-emerald-700">
                  Đã hoàn cọc
                </span>
                <p className="mt-1 text-xl font-bold text-emerald-800">
                  {thongKe.daHoanCoc}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs">
                <span className="text-[11px] font-semibold text-slate-500">
                  Quá hạn mất cọc
                </span>
                <p className="mt-1 text-xl font-bold text-slate-700">
                  {thongKe.quaHanMatCoc}
                </p>
              </div>
            </div>

            {/* Thanh bộ lọc */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-5">
                <input
                  type="text"
                  placeholder="Tìm nhanh theo Mã tra cứu, SĐT, Họ tên khách hoặc Phòng..."
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 focus:border-teal-500 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="md:col-span-4">
                <select
                  value={maKhuFilter}
                  onChange={(e) => setMaKhuFilter(e.target.value)}
                  disabled={khuTroList.length <= 1}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 disabled:opacity-75"
                >
                  {khuTroList.length > 1 && (
                    <option value="ALL">
                      Tất cả cơ sở ({khuTroList.length})
                    </option>
                  )}
                  {khuTroList.map((k) => (
                    <option key={k.MaKhu} value={k.MaKhu}>
                      {k.TenKhu}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-3">
                <select
                  value={trangThaiFilter}
                  onChange={(e) => setTrangThaiFilter(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs sm:text-sm text-slate-900"
                >
                  <option value="ALL">Tất cả trạng thái</option>
                  <option value="TrungLapCanHoan">Trùng lặp cần hoàn</option>
                  <option value="DaDatCoc">Đang giữ phòng</option>
                  <option value="ChoThanhToan">Chờ thanh toán QR</option>
                  <option value="DaHoanCoc_ChotThue">
                    Đã hoàn — Chốt thuê
                  </option>
                  <option value="DaHoanCoc_KhongThue">
                    Đã hoàn — Không thuê
                  </option>
                  <option value="QuaHanMatCoc">Quá hạn mất cọc</option>
                  <option value="DaHuy">Đã hủy</option>
                </select>
              </div>
            </div>

            {/* Bảng danh sách đơn đặt cọc */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
              {loading ? (
                <div className="p-12 text-center text-sm font-semibold text-slate-500">
                  Đang tải danh sách đặt cọc giữ phòng...
                </div>
              ) : danhSach.length === 0 ? (
                <div className="p-12 text-center text-sm text-slate-500">
                  Chưa có đơn đặt cọc nào khớp bộ lọc hiện tại.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-4 py-3 font-bold">Mã tra cứu / GD</th>
                        <th className="px-4 py-3 font-bold">Phòng & Cơ sở</th>
                        <th className="px-4 py-3 font-bold">Khách đặt phòng</th>
                        <th className="px-4 py-3 font-bold">
                          Lịch hẹn & Hạn giữ
                        </th>
                        <th className="px-4 py-3 font-bold text-right">
                          Tiền cọc
                        </th>
                        <th className="px-4 py-3 font-bold">Trạng thái</th>
                        <th className="px-4 py-3 font-bold text-right">
                          Thao tác
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {danhSach.map((item) => {
                        const badge = STATUS_BADGE[item.TrangThai];
                        return (
                          <tr
                            key={item.MaDP}
                            className="hover:bg-slate-50/70 align-top"
                          >
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              <div className="font-bold text-slate-900">
                                {item.MaTraCuu}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                PayOS: {item.OrderCode}
                              </div>
                            </td>

                            <td className="px-4 py-3.5">
                              <div className="font-bold text-slate-900">
                                {item.TenPhong}
                              </div>
                              <div className="text-[11px] text-slate-500 max-w-44 truncate">
                                {item.TenKhu}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                TT phòng: {item.TrangThaiPhong}
                              </div>
                            </td>

                            <td className="px-4 py-3.5">
                              <div className="font-bold text-slate-900">
                                {item.HoTenKhach}
                              </div>
                              <div className="text-slate-600">{item.SDT}</div>
                              <div className="text-[11px] text-slate-400">
                                {item.Email}
                              </div>
                            </td>

                            <td className="px-4 py-3.5 whitespace-nowrap">
                              <div>
                                <span className="text-slate-400">Hẹn: </span>
                                <b className="text-slate-800">
                                  {formatDateTime(item.NgayHenXem)}
                                </b>
                              </div>
                              {item.ThoiGianHetHanGiu && (
                                <div className="text-[11px] text-rose-600 mt-0.5">
                                  Hạn giữ:{" "}
                                  {formatDateTime(item.ThoiGianHetHanGiu)}
                                </div>
                              )}
                            </td>

                            <td className="px-4 py-3.5 text-right whitespace-nowrap">
                              <div className="font-bold text-teal-700 text-sm">
                                {formatVND(item.SoTienCoc)}
                              </div>
                              {item.SoTienHoan > 0 && (
                                <div className="text-[11px] text-emerald-700">
                                  Đã hoàn: {formatVND(item.SoTienHoan)}
                                </div>
                              )}
                            </td>

                            <td className="px-4 py-3.5">
                              <span
                                className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-bold whitespace-nowrap ${badge.className}`}
                              >
                                {badge.text}
                              </span>
                              {item.GhiChuHoanCoc && (
                                <p className="mt-1 text-[11px] text-slate-500 max-w-52">
                                  {item.GhiChuHoanCoc}
                                </p>
                              )}
                            </td>

                            <td className="px-4 py-3.5 text-right whitespace-nowrap">
                              <div className="flex flex-col items-end gap-1.5">
                                {/* Hàng nút ngang: Xem biên lai + Xóa */}
                                {(item.TokenTraCuu ||
                                  canDeleteBooking(item.TrangThai)) && (
                                  <div className="flex items-center justify-end gap-1.5">
                                    {item.TokenTraCuu && (
                                      <a
                                        href={`/datPhong/hoaDon/${encodeURIComponent(
                                          item.MaTraCuu,
                                        )}?token=${encodeURIComponent(item.TokenTraCuu)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-700 transition"
                                      >
                                        Xem biên lai
                                      </a>
                                    )}

                                    {canDeleteBooking(item.TrangThai) && (
                                      <button
                                        type="button"
                                        onClick={() => setDeleteTarget(item)}
                                        className="inline-flex items-center rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 text-[11px] font-bold text-rose-600 cursor-pointer transition"
                                      >
                                        Xóa
                                      </button>
                                    )}
                                  </div>
                                )}

                                {item.TrangThai === "DaDatCoc" && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        openRefundModal(item, "ChotThue")
                                      }
                                      className="rounded-lg bg-[#00F5C4] hover:bg-[#00E0B0] px-2.5 py-1 text-[11px] font-bold text-slate-900 cursor-pointer"
                                    >
                                      Hoàn cọc — Chốt thuê
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        openRefundModal(item, "KhongThue")
                                      }
                                      className="rounded-lg border border-sky-200 bg-sky-50 hover:bg-sky-100 px-2.5 py-1 text-[11px] font-bold text-sky-800 cursor-pointer"
                                    >
                                      Hoàn cọc — Không thuê
                                    </button>
                                  </>
                                )}

                                {item.TrangThai === "TrungLapCanHoan" && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openRefundModal(item, "TrungLap")
                                    }
                                    className="rounded-lg bg-rose-600 hover:bg-rose-700 px-2.5 py-1 text-[11px] font-bold text-white cursor-pointer"
                                  >
                                    Xác nhận hoàn trùng 100%
                                  </button>
                                )}

                                {item.TrangThai === "DaHoanCoc_ChotThue" &&
                                  item.TrangThaiPhong === "DaDatCoc" && (
                                    <Link
                                      href={`/chuTro/hopDong/them?maPhong=${item.MaPhong}`}
                                      className="rounded-lg bg-[#00FFCC] hover:bg-[#00E0B0] px-2.5 py-1 text-[11px] font-bold text-slate-900 cursor-pointer"
                                    >
                                      Lập Hợp đồng
                                    </Link>
                                  )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </main>

          {/* MODAL XÁC NHẬN HOÀN CỌC */}
          {refundTarget && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
              onClick={() => setRefundTarget(null)}
            >
              <form
                onSubmit={handleConfirmRefund}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4"
              >
                <div className="border-b border-slate-100 pb-3">
                  <span className="inline-block rounded-full bg-[#00FFCC]/30 px-2.5 py-0.5 text-[11px] font-bold text-slate-900">
                    {refundTarget.item.MaTraCuu} • {refundTarget.item.TenPhong}
                  </span>
                  <h3 className="mt-1.5 text-base font-bold text-slate-900">
                    {refundTarget.ketQua === "ChotThue"
                      ? "Xác nhận Hoàn cọc & Chốt thuê"
                      : refundTarget.ketQua === "KhongThue"
                        ? "Xác nhận Hoàn cọc & Mở lại phòng trống"
                        : "Xác nhận Hoàn 100% đơn trùng lặp"}
                  </h3>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-xs space-y-1">
                  <p>
                    Khách hàng: <b>{refundTarget.item.HoTenKhach}</b> (
                    {refundTarget.item.SDT})
                  </p>
                  <p>
                    Số tiền hoàn lại 100%:{" "}
                    <b className="text-teal-700 text-sm">
                      {formatVND(refundTarget.item.SoTienCoc)}
                    </b>
                  </p>
                  <p className="text-[11px] text-slate-500 pt-1">
                    {refundTarget.ketQua === "ChotThue"
                      ? "Trạng thái phòng sẽ giữ nguyên DaDatCoc để bạn sang mục Hợp đồng lập hợp đồng thủ công mà không sợ người khác đặt đè."
                      : refundTarget.ketQua === "KhongThue"
                        ? "Hệ thống sẽ tự động mở lại trạng thái phòng về Trong và gửi Email xác nhận hoàn cọc cho khách."
                        : "Phòng vẫn giữ chỗ cho khách thanh toán trước đó; hệ thống sẽ gửi Email xác nhận đã hoàn tiền cho đơn trùng lặp này."}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Phương thức đã hoàn tiền *
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    {(["TienMat", "ChuyenKhoan"] as PhuongThucHoanCoc[]).map(
                      (method) => (
                        <button
                          key={method}
                          type="button"
                          onClick={() => setPhuongThucHoan(method)}
                          className={`rounded-xl border px-3 py-2.5 text-xs font-bold cursor-pointer transition ${
                            phuongThucHoan === method
                              ? "border-teal-500 bg-[#00FFCC]/25 text-slate-900"
                              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {method === "TienMat"
                            ? "💵 Tiền mặt"
                            : "🏦 Chuyển khoản"}
                        </button>
                      ),
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Ghi chú hoàn cọc
                  </label>
                  <textarea
                    rows={3}
                    value={ghiChuHoanCoc}
                    onChange={(e) => setGhiChuHoanCoc(e.target.value)}
                    placeholder="VD: Đã chuyển khoản hoàn 100% qua MB Bank..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-teal-500 focus:bg-white focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setRefundTarget(null)}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={submittingRefund}
                    className="rounded-xl bg-[#00F5C4] hover:bg-[#00E0B0] px-4 py-2 text-xs font-bold text-slate-900 disabled:opacity-60 cursor-pointer"
                  >
                    {submittingRefund ? "Đang lưu..." : "Xác nhận đã hoàn tiền"}
                  </button>
                </div>
              </form>
            </div>
          )}
          <DatPhongXoaModal
            target={deleteTarget}
            onClose={() => setDeleteTarget(null)}
            onConfirm={handleConfirmDelete}
          />
        </div>
      )}
    </ProtectedRoute>
  );
}
