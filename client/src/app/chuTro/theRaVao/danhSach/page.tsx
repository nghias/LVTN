// client/src/app/chuTro/theRaVao/danhSach/page.tsx
"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import QuanLyHeader from "@/components/layout/QuanLyHeader";
import { useAlertModal } from "@/components/common/AlertModalProvider";
import { UserProfile } from "@/types/auth.type";
import {
  theRaVaoService,
  TheRaVaoItem,
  KhuTroSimple,
} from "@/services/theRaVao.service";

function DanhSachTheContent({ user }: { user: UserProfile }) {
  const router = useRouter();
  const { showSuccess, showError, showConfirm } = useAlertModal();
  const showErrorRef = useRef(showError);
  showErrorRef.current = showError;

  const isChuTro = user.Quyen === "ChuTro";

  const [loading, setLoading] = useState<boolean>(true);
  const [khuTroList, setKhuTroList] = useState<KhuTroSimple[]>([]);
  const [dsThe, setDsThe] = useState<TheRaVaoItem[]>([]);

  const [selectedMaKhu, setSelectedMaKhu] = useState<string>("");
  const [trangThai, setTrangThai] = useState<string>("");
  const [keyword, setKeyword] = useState<string>("");

  const formatDateVN = (dateStr?: string) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("vi-VN");
  };

  const fetchDanhSachThe = useCallback(
    async (overrides?: {
      maKhu?: string;
      trangThai?: string;
      keyword?: string;
    }) => {
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
        showErrorRef.current(
          err instanceof Error ? err.message : "Không thể tải danh sách thẻ."
        );
      } finally {
        setLoading(false);
      }
    },
    [isChuTro, selectedMaKhu, trangThai, keyword]
  );

  useEffect(() => {
    fetchDanhSachThe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMaKhu]);

  const handleKhoaThe = (item: TheRaVaoItem) => {
    showConfirm(
      `Khóa thẻ ra vào của "${item.HoTen}" (${item.TenPhong || "—"})? Sau khi khóa, thẻ sẽ không thể mở cửa.`,
      "Xác nhận khóa thẻ",
      async () => {
        try {
          await theRaVaoService.khoaThe(item.MaThe, "Khóa thẻ bởi quản lý");
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

  const handleXoaThe = (item: TheRaVaoItem) => {
    showConfirm(
      `Xóa vĩnh viễn thẻ đã khóa của "${item.HoTen}"? Lịch sử quẹt của thẻ này cũng sẽ bị xóa và người dùng sẽ trở về danh sách chưa có thẻ.`,
      "Xác nhận xóa thẻ",
      async () => {
        try {
          await theRaVaoService.xoaThe(item.MaThe);
          showSuccess("Đã xóa thẻ thành công!");
          fetchDanhSachThe();
        } catch (err: unknown) {
          showError(err instanceof Error ? err.message : "Không thể xóa thẻ.");
        }
      },
      "Xóa thẻ",
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
  const tongBiKhoa = dsThe.filter((t) =>
    ["BiKhoa", "ThuHoi"].includes(t.TrangThai)
  ).length;

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900">
      <QuanLyHeader user={user} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
          <div>
            <button
              type="button"
              onClick={() => router.push("/chuTro/theRaVao")}
              className="text-xs font-bold text-teal-700 hover:underline mb-1.5 inline-block cursor-pointer"
            >
              ← Quay lại Lịch sử ra vào
            </button>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Danh Sách Thẻ Ra Vào
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Mỗi người dùng sở hữu tối đa 1 thẻ duy nhất. Mã thẻ được mã hóa bảo mật một chiều.
            </p>
          </div>

          <Link
            href={
              selectedMaKhu
                ? `/chuTro/theRaVao/capMoi?maKhu=${selectedMaKhu}`
                : "/chuTro/theRaVao/capMoi"
            }
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 border border-teal-400 text-xs font-bold shadow-xs transition no-underline shrink-0"
          >
            + Cấp thẻ mới
          </Link>
        </div>

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
            <p className="text-[11px] font-bold text-slate-500 uppercase">Đã khóa</p>
            <p className="text-xl sm:text-2xl font-extrabold text-red-700 mt-1">{tongBiKhoa}</p>
          </div>
        </div>

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

        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchDanhSachThe();
          }}
          className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col lg:flex-row lg:items-end gap-3 w-full"
        >
          <div className="flex-1">
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Tìm kiếm
            </label>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Tên người dùng, phòng, ghi chú..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
            />
          </div>

          <div className="w-full lg:w-56">
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Trạng thái thẻ
            </label>
            <select
              value={trangThai}
              onChange={(e) => {
                setTrangThai(e.target.value);
                fetchDanhSachThe({ trangThai: e.target.value });
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-bold"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="HoatDong">Đang hoạt động</option>
              <option value="ChoCapLai">Chờ cấp lại</option>
              <option value="BiKhoa">Đã khóa</option>
              <option value="ThuHoi">Đã thu hồi</option>
            </select>
          </div>

          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 border border-teal-400 text-xs font-bold cursor-pointer whitespace-nowrap"
          >
            Lọc dữ liệu
          </button>
        </form>

        {loading ? (
          <div className="py-16 text-center text-slate-500 text-sm">
            Đang tải danh sách thẻ...
          </div>
        ) : dsThe.length === 0 ? (
          <div className="p-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-sm text-slate-600">
            Chưa có thẻ ra vào nào trong danh sách.
          </div>
        ) : (
          <>
            {/* Mobile Cards */}
            <div className="grid grid-cols-1 gap-3 md:hidden">
              {dsThe.map((item) => {
                const isLocked = ["BiKhoa", "ThuHoi"].includes(item.TrangThai);
                return (
                  <div
                    key={item.MaThe}
                    className="p-4 rounded-2xl border border-slate-200 bg-white space-y-2.5"
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
                      Ngày cấp: <span className="font-semibold text-slate-800">{formatDateVN(item.NgayTao)}</span>
                    </p>
                    {item.GhiChu && (
                      <p className="text-xs text-slate-500">{item.GhiChu}</p>
                    )}
                    <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-slate-100">
                      <Link
                        href={`/chuTro/theRaVao/capLai/${item.MaThe}`}
                        className="px-3.5 py-2 rounded-xl bg-[#00FFCC] text-slate-900 text-xs font-bold no-underline"
                      >
                        Cấp lại thẻ
                      </Link>
                      {!isLocked ? (
                        <button
                          type="button"
                          onClick={() => handleKhoaThe(item)}
                          className="px-3.5 py-2 rounded-xl bg-amber-100 text-amber-900 text-xs font-bold cursor-pointer"
                        >
                          Khóa thẻ
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleXoaThe(item)}
                          className="px-3.5 py-2 rounded-xl bg-red-100 text-red-700 text-xs font-bold cursor-pointer"
                        >
                          Xóa thẻ
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase">
                    <th className="py-3.5 px-4 font-bold">Chủ Thẻ</th>
                    <th className="py-3.5 px-4 font-bold">Phòng / Cơ Sở</th>
                    <th className="py-3.5 px-4 font-bold">Ngày Cấp</th>
                    <th className="py-3.5 px-4 font-bold">Trạng Thái</th>
                    <th className="py-3.5 px-4 font-bold">Ghi Chú</th>
                    <th className="py-3.5 px-4 font-bold text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {dsThe.map((item) => {
                    const isLocked = ["BiKhoa", "ThuHoi"].includes(item.TrangThai);
                    return (
                      <tr key={item.MaThe} className="hover:bg-slate-50/80">
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-slate-900">{item.HoTen}</p>
                          <p className="text-[11px] text-slate-500">
                            {item.VaiTroHienThi || "Cư dân"}
                          </p>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-slate-900">
                            {item.TenPhong || "—"}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {item.TenKhu || "—"}
                          </p>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">
                          {formatDateVN(item.NgayTao)}
                        </td>
                        <td className="py-3.5 px-4">
                          {renderBadge(item.TrangThai)}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                          {item.GhiChu || "—"}
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap space-x-2">
                          <Link
                            href={`/chuTro/theRaVao/capLai/${item.MaThe}`}
                            className="inline-block px-3.5 py-1.5 rounded-xl bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 text-xs font-bold no-underline"
                          >
                            Cấp lại thẻ
                          </Link>
                          {!isLocked ? (
                            <button
                              type="button"
                              onClick={() => handleKhoaThe(item)}
                              className="px-3.5 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold cursor-pointer"
                            >
                              Khóa thẻ
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleXoaThe(item)}
                              className="px-3.5 py-1.5 rounded-xl bg-red-100 hover:bg-red-200 text-red-700 text-xs font-bold cursor-pointer"
                            >
                              Xóa thẻ
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default function DanhSachThePage() {
  return (
    <ProtectedRoute allowedRoles={["ChuTro", "QuanLy"]}>
      {(user) => <DanhSachTheContent user={user} />}
    </ProtectedRoute>
  );
}