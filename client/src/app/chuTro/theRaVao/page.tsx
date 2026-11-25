// client/src/app/chuTro/theRaVao/page.tsx
"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import QuanLyHeader from "@/components/layout/QuanLyHeader";
import { useAlertModal } from "@/components/common/AlertModalProvider";
import { UserProfile } from "@/types/auth.type";
import {
  theRaVaoService,
  TheRaVaoItem,
  LichSuTheItem,
  KhuTroSimple,
} from "@/services/theRaVao.service";

function ChuTroTheRaVaoContent({ user }: { user: UserProfile }) {
  const { showSuccess, showError, showConfirm } = useAlertModal();
  const isChuTro = user.Quyen === "ChuTro";

  const [tab, setTab] = useState<"THE" | "LICH_SU">("THE");
  const [loading, setLoading] = useState<boolean>(true);

  const [khuTroList, setKhuTroList] = useState<KhuTroSimple[]>([]);
  const [dsThe, setDsThe] = useState<TheRaVaoItem[]>([]);
  const [lichSu, setLichSu] = useState<LichSuTheItem[]>([]);

  // Bộ lọc
  const [selectedMaKhu, setSelectedMaKhu] = useState<string>("");
  const [trangThai, setTrangThai] = useState<string>("");
  const [keyword, setKeyword] = useState<string>("");
  const [tuNgay, setTuNgay] = useState<string>("");
  const [denNgay, setDenNgay] = useState<string>("");

  // Khung xác nhận cấp lại thẻ inline (không cần chuyển trang)
  const [selectedItem, setSelectedItem] = useState<TheRaVaoItem | null>(null);
  const [ghiChuCapLai, setGhiChuCapLai] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [thongBaoESP32, setThongBaoESP32] = useState<string>("");
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  const formatDateVN = (dateStr?: string) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("vi-VN");
  };

  const fetchDanhSachThe = useCallback(
    async (overrides?: { maKhu?: string; trangThai?: string; keyword?: string }) => {
      try {
        setLoading(true);
        const res = await theRaVaoService.getDanhSachThe({
          maKhu: isChuTro ? (overrides?.maKhu ?? selectedMaKhu) : undefined,
          trangThai: overrides?.trangThai ?? trangThai,
          keyword: overrides?.keyword ?? keyword,
        });
        if (res.success) {
          setDsThe(res.data || []);
          if (res.khuTroList) setKhuTroList(res.khuTroList);
        }
      } catch (err: unknown) {
        showError(err instanceof Error ? err.message : "Không thể tải danh sách thẻ.");
      } finally {
        setLoading(false);
      }
    },
    [isChuTro, selectedMaKhu, trangThai, keyword, showError]
  );

  const fetchLichSu = useCallback(
    async (overrides?: {
      maKhu?: string;
      tuNgay?: string;
      denNgay?: string;
      keyword?: string;
    }) => {
      try {
        setLoading(true);
        const res = await theRaVaoService.getLichSuRaVao({
          maKhu: isChuTro ? (overrides?.maKhu ?? selectedMaKhu) : undefined,
          tuNgay: overrides?.tuNgay ?? tuNgay,
          denNgay: overrides?.denNgay ?? denNgay,
          keyword: overrides?.keyword ?? keyword,
        });
        if (res.success) {
          setLichSu(res.data || []);
          if (res.khuTroList) setKhuTroList(res.khuTroList);
        }
      } catch (err: unknown) {
        showError(err instanceof Error ? err.message : "Không thể tải lịch sử mở cửa.");
      } finally {
        setLoading(false);
      }
    },
    [isChuTro, selectedMaKhu, tuNgay, denNgay, keyword, showError]
  );

  useEffect(() => {
    if (tab === "THE") fetchDanhSachThe();
    else fetchLichSu();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, selectedMaKhu]);

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  const handleOpenCapLai = (item: TheRaVaoItem) => {
    setSelectedItem(item);
    setGhiChuCapLai(
      item.TrangThai === "ChoCapLai"
        ? `Duyệt cấp lại thẻ: ${item.GhiChu || "Khách yêu cầu"}`
        : "Cấp lại thẻ do khách thuê quên/mất thẻ"
    );
  };

  const handleConfirmCapLai = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    try {
      setSubmitting(true);
      const res = await theRaVaoService.capLaiThe({
        maND: selectedItem.MaND,
        maTheYeuCau: selectedItem.TrangThai === "ChoCapLai" ? selectedItem.MaThe : undefined,
        ghiChu: ghiChuCapLai,
      });

      setSelectedItem(null);
      setThongBaoESP32(res.message);
      showSuccess("Đã phát lệnh cấp thẻ mới xuống đầu đọc RC522!");
      await fetchDanhSachThe();

      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      let count = 0;
      pollTimerRef.current = setInterval(async () => {
        count++;
        try {
          const check = await theRaVaoService.getDanhSachThe({
            maKhu: isChuTro ? selectedMaKhu : undefined,
            trangThai,
            keyword,
          });
          if (check.success) {
            const list: TheRaVaoItem[] = check.data || [];
            setDsThe(list);
            const done = list.find(
              (t) => t.MaThe === res.maThe && t.TrangThai === "HoatDong"
            );
            if (done) {
              setThongBaoESP32("");
              showSuccess(`Đã nạp và kích hoạt thẻ mới (${done.MaUID}) thành công!`);
              if (pollTimerRef.current) clearInterval(pollTimerRef.current);
            }
          }
        } catch {
          // Bỏ qua lỗi mạng thoáng qua
        }
        if (count >= 20 && pollTimerRef.current) {
          clearInterval(pollTimerRef.current);
        }
      }, 3000);
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : "Gửi lệnh cấp thẻ thất bại.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleKhoaThe = (item: TheRaVaoItem) => {
    showConfirm(
      `Khóa ngay thẻ của "${item.HoTen}" (${item.TenPhong || "—"})? Thẻ sẽ không thể mở cổng sau khi khóa.`,
      "Xác nhận khóa thẻ ra vào",
      async () => {
        try {
          await theRaVaoService.khoaThe(item.MaThe, "Quản lý khóa thẻ");
          showSuccess("Đã khóa thẻ thành công!");
          fetchDanhSachThe();
        } catch (err: unknown) {
          showError(err instanceof Error ? err.message : "Không thể khóa thẻ.");
        }
      },
      "Khóa thẻ",
      "Hủy"
    );
  };

  const renderBadge = (status: string) => {
    switch (status) {
      case "HoatDong":
        return (
          <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
            Đang hoạt động
          </span>
        );
      case "ChoCapLai":
        return (
          <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
            Chờ cấp lại
          </span>
        );
      case "DangGhiThe":
        return (
          <span className="px-2.5 py-1 rounded-full bg-sky-100 text-sky-800 text-xs font-bold animate-pulse">
            Chờ quẹt phôi RC522
          </span>
        );
      case "ThuHoi":
        return (
          <span className="px-2.5 py-1 rounded-full bg-slate-200 text-slate-700 text-xs font-bold">
            Đã thu hồi
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold">
            Đã khóa
          </span>
        );
    }
  };

  const tongHoatDong = dsThe.filter((t) => t.TrangThai === "HoatDong").length;
  const tongChoCapLai = dsThe.filter((t) => t.TrangThai === "ChoCapLai").length;
  const tongBiKhoa = dsThe.filter((t) => ["BiKhoa", "ThuHoi"].includes(t.TrangThai)).length;

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900">
      <QuanLyHeader user={user} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-5">
        {/* Header First Page */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b border-slate-200">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {isChuTro
                ? "Quản Lý Thẻ Ra Vào (Toàn Hệ Thống)"
                : "Quản Lý Thẻ Ra Vào (Cơ Sở Phụ Trách)"}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Cấp lại thẻ từ RFID khi khách thuê quên/mất thẻ và tra cứu lịch sử mở cổng theo cơ sở.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setTab("THE")}
              className={`px-4 py-2.5 rounded-full text-xs font-bold transition cursor-pointer ${
                tab === "THE"
                  ? "bg-[#00FFCC] text-slate-900 border border-teal-400"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              Danh Sách & Cấp Lại Thẻ
            </button>
            <button
              type="button"
              onClick={() => setTab("LICH_SU")}
              className={`px-4 py-2.5 rounded-full text-xs font-bold transition cursor-pointer ${
                tab === "LICH_SU"
                  ? "bg-[#00FFCC] text-slate-900 border border-teal-400"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              Lịch Sử Mở Cửa
            </button>
          </div>
        </div>

        {/* 3 Thẻ chỉ số nhanh (Mobile-first grid) */}
        {tab === "THE" && (
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50">
              <p className="text-[11px] font-bold text-slate-500 uppercase">Đang hoạt động</p>
              <p className="text-xl sm:text-2xl font-extrabold text-emerald-700 mt-1">{tongHoatDong}</p>
            </div>
            <div className="p-3.5 rounded-2xl border border-amber-200 bg-amber-50/70">
              <p className="text-[11px] font-bold text-amber-700 uppercase">Chờ cấp lại</p>
              <p className="text-xl sm:text-2xl font-extrabold text-amber-800 mt-1">{tongChoCapLai}</p>
            </div>
            <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50">
              <p className="text-[11px] font-bold text-slate-500 uppercase">Đã khóa / Thu hồi</p>
              <p className="text-xl sm:text-2xl font-extrabold text-slate-700 mt-1">{tongBiKhoa}</p>
            </div>
          </div>
        )}

        {/* Thanh chọn Cơ sở (Chủ trọ thấy tất cả cơ sở) */}
        {(isChuTro || khuTroList.length > 1) && khuTroList.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {isChuTro && (
              <button
                type="button"
                onClick={() => setSelectedMaKhu("")}
                className={`px-4 py-2 rounded-full text-xs font-bold transition cursor-pointer ${
                  selectedMaKhu === ""
                    ? "bg-[#00FFCC] text-slate-900 border border-teal-400"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Tất cả cơ sở ({khuTroList.length})
              </button>
            )}
            {khuTroList.map((khu) => (
              <button
                key={khu.MaKhu}
                type="button"
                onClick={() => setSelectedMaKhu(String(khu.MaKhu))}
                className={`px-4 py-2 rounded-full text-xs font-bold transition cursor-pointer ${
                  selectedMaKhu === String(khu.MaKhu)
                    ? "bg-[#00FFCC] text-slate-900 border border-teal-400"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {khu.TenKhu}
              </button>
            ))}
          </div>
        )}

        {/* Thông báo chờ đặt phôi thẻ lên RC522 */}
        {thongBaoESP32 && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-xs sm:text-sm font-semibold">{thongBaoESP32}</span>
            <button
              type="button"
              onClick={() => setThongBaoESP32("")}
              className="px-3 py-1.5 rounded-xl bg-amber-200 text-amber-900 text-xs font-bold self-start sm:self-auto cursor-pointer"
            >
              Đóng
            </button>
          </div>
        )}

        {/* Khung xác nhận cấp lại thẻ hiển thị trực tiếp trên trang */}
        {selectedItem && (
          <form
            onSubmit={handleConfirmCapLai}
            className="p-5 rounded-2xl border-2 border-teal-400 bg-teal-50/40 space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900">
                  Cấp lại thẻ từ cho {selectedItem.HoTen} ({selectedItem.TenPhong || "—"} - {selectedItem.TenKhu || "—"})
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  Thẻ cũ sẽ tự động bị khóa và lệnh ghi sẽ gửi xuống đầu đọc RC522. Đặt phôi thẻ trắng lên đầu đọc trong 60 giây.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                Đóng
              </button>
            </div>
            <textarea
              rows={2}
              value={ghiChuCapLai}
              onChange={(e) => setGhiChuCapLai(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
              required
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-700 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 rounded-xl bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 border border-teal-400 text-xs font-bold disabled:opacity-50 cursor-pointer"
              >
                {submitting ? "Đang gửi lệnh..." : "Xác nhận & Gửi lệnh xuống RC522"}
              </button>
            </div>
          </form>
        )}

        {/* Bộ lọc */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (tab === "THE") fetchDanhSachThe();
            else fetchLichSu();
          }}
          className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col lg:flex-row lg:items-end gap-3"
        >
          <div className="flex-1">
            <label className="block text-xs font-bold text-slate-700 mb-1">Tìm kiếm</label>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Tên khách thuê, tên phòng, ghi chú..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
            />
          </div>

          {tab === "THE" ? (
            <div className="w-full lg:w-52">
              <label className="block text-xs font-bold text-slate-700 mb-1">Trạng thái</label>
              <select
                value={trangThai}
                onChange={(e) => {
                  setTrangThai(e.target.value);
                  fetchDanhSachThe({ trangThai: e.target.value });
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-bold"
              >
                <option value="">Tất cả trạng thái</option>
                <option value="ChoCapLai">Chờ cấp lại</option>
                <option value="DangGhiThe">Chờ quẹt phôi RC522</option>
                <option value="HoatDong">Đang hoạt động</option>
                <option value="BiKhoa">Đã khóa</option>
                <option value="ThuHoi">Đã thu hồi</option>
              </select>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Từ ngày</label>
                <input
                  type="date"
                  value={tuNgay}
                  onChange={(e) => setTuNgay(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Đến ngày</label>
                <input
                  type="date"
                  value={denNgay}
                  onChange={(e) => setDenNgay(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-bold"
                />
              </div>
            </>
          )}

          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 border border-teal-300 text-xs font-bold cursor-pointer whitespace-nowrap"
          >
            Lọc dữ liệu
          </button>
        </form>

        {/* Nội dung chính */}
        {loading ? (
          <div className="py-16 text-center text-slate-500 text-sm">Đang tải dữ liệu...</div>
        ) : tab === "THE" ? (
          dsThe.length === 0 ? (
            <div className="p-10 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-sm text-slate-600">
              Chưa có dữ liệu thẻ ra vào phù hợp.
            </div>
          ) : (
            <>
              {/* Mobile-first Cards */}
              <div className="grid grid-cols-1 gap-3 md:hidden">
                {dsThe.map((item) => (
                  <div
                    key={item.MaThe}
                    className="p-4 rounded-2xl border border-slate-200 bg-white space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{item.HoTen}</p>
                        <p className="text-xs text-slate-500">
                          {item.TenPhong || "—"} • {item.TenKhu || "—"}
                        </p>
                      </div>
                      {renderBadge(item.TrangThai)}
                    </div>
                    <p className="text-xs text-slate-600">
                      UID thẻ: <span className="font-mono font-bold text-slate-900">{item.MaUID || "Chưa gán"}</span>
                    </p>
                    {item.GhiChu && <p className="text-xs text-slate-500">{item.GhiChu}</p>}
                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => handleOpenCapLai(item)}
                        className="px-3.5 py-2 rounded-xl bg-[#00FFCC] text-slate-900 text-xs font-bold"
                      >
                        Cấp lại thẻ
                      </button>
                      {item.TrangThai === "HoatDong" && (
                        <button
                          type="button"
                          onClick={() => handleKhoaThe(item)}
                          className="px-3.5 py-2 rounded-xl bg-red-100 text-red-700 text-xs font-bold"
                        >
                          Khóa thẻ
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase">
                      <th className="py-3.5 px-4 font-bold">Khách Thuê</th>
                      <th className="py-3.5 px-4 font-bold">Phòng / Cơ Sở</th>
                      <th className="py-3.5 px-4 font-bold">UID Thẻ</th>
                      <th className="py-3.5 px-4 font-bold">Trạng Thái</th>
                      <th className="py-3.5 px-4 font-bold">Ghi Chú</th>
                      <th className="py-3.5 px-4 font-bold text-right">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs">
                    {dsThe.map((item) => (
                      <tr key={item.MaThe} className="hover:bg-slate-50/80">
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-slate-900">{item.HoTen}</p>
                          <p className="text-[11px] text-slate-500">
                            Cập nhật: {formatDateVN(item.NgayTao)}
                          </p>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-slate-900">{item.TenPhong || "—"}</p>
                          <p className="text-[11px] text-slate-500">{item.TenKhu || "—"}</p>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                          {item.MaUID || "Chưa gán"}
                        </td>
                        <td className="py-3.5 px-4">{renderBadge(item.TrangThai)}</td>
                        <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                          {item.GhiChu || "—"}
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap space-x-2">
                          <button
                            type="button"
                            onClick={() => handleOpenCapLai(item)}
                            className="px-3.5 py-1.5 rounded-xl bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 text-xs font-bold cursor-pointer"
                          >
                            Cấp lại thẻ
                          </button>
                          {item.TrangThai === "HoatDong" && (
                            <button
                              type="button"
                              onClick={() => handleKhoaThe(item)}
                              className="px-3.5 py-1.5 rounded-xl bg-red-100 text-red-700 hover:bg-red-200 text-xs font-bold cursor-pointer"
                            >
                              Khóa thẻ
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )
        ) : lichSu.length === 0 ? (
          <div className="p-10 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-sm text-slate-600">
            Chưa có lịch sử quẹt thẻ mở cổng nào.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase">
                  <th className="py-3.5 px-4 font-bold">Ngày Quẹt</th>
                  <th className="py-3.5 px-4 font-bold">Giờ Mở Cửa</th>
                  <th className="py-3.5 px-4 font-bold">Người Mở Cửa</th>
                  <th className="py-3.5 px-4 font-bold">Phòng</th>
                  <th className="py-3.5 px-4 font-bold">Cơ Sở</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {lichSu.map((ls) => (
                  <tr key={ls.MaLS} className="hover:bg-slate-50/80">
                    <td className="py-3.5 px-4 font-semibold">{formatDateVN(ls.NgayQuetThe)}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-teal-700">
                      {ls.GioQuetThe}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">{ls.HoTen}</td>
                    <td className="py-3.5 px-4">{ls.TenPhong || "—"}</td>
                    <td className="py-3.5 px-4 text-slate-600">{ls.TenKhu || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

export default function ChuTroTheRaVaoPage() {
  return (
    <ProtectedRoute allowedRoles={["ChuTro", "QuanLy"]}>
      {(user) => <ChuTroTheRaVaoContent user={user} />}
    </ProtectedRoute>
  );
}