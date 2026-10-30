"use client";

import React, { useEffect, useMemo, useState } from "react";
import QuanLyHeader from "@/components/layout/QuanLyHeader";
import { AuthService } from "@/services/auth.service";
import { UserProfile } from "@/types/auth.type";
import { hopDongService } from "@/services/hopDong.service";
import { HopDongItem, PhiDichVuItem } from "@/types/hopDong.type";
import { dinhDangNgayVN, dinhDangTienVN } from "@/utils/soThanhChu.util";

import SuaHopDongModal from "@/components/features/hopDong/SuaHopDong";
import XoaHopDongModal from "@/components/features/hopDong/XoaHopDong";
import XemPdfHopDongModal from "@/components/features/hopDong/XemPdfHopDong";
import XuatBanCungModal from "@/components/features/hopDong/XuatBanCung";

const DEFAULT_USER: UserProfile = {
  MaND: 0,
  HoTen: "Quản lý cơ sở",
  TenTK: "quanly",
  Quyen: "QuanLy",
} as UserProfile;

export default function QuanLyHopDongPage() {
  const [user, setUser] = useState<UserProfile>(DEFAULT_USER);
  const [danhSachHopDongGoc, setDanhSachHopDongGoc] = useState<HopDongItem[]>(
    [],
  );
  const [danhSachHopDong, setDanhSachHopDong] = useState<HopDongItem[]>([]);
  const [dangTai, setDangTai] = useState<boolean>(true);

  // Bộ lọc Tìm kiếm
  const [tuKhoa, setTuKhoa] = useState<string>("");
  const [trangThaiLoc, setTrangThaiLoc] = useState<string>("");
  const [maKhuLoc, setMaKhuLoc] = useState<string>("");
  const [maPhongLoc, setMaPhongLoc] = useState<string>("");

  // Dữ liệu danh mục dùng cho Bộ lọc & Modal Sửa / Tạo
  const [danhSachPhong, setDanhSachPhong] = useState<any[]>([]);
  const [danhSachKhachThue, setDanhSachKhachThue] = useState<any[]>([]);
  const [danhSachPhiDichVu, setDanhSachPhiDichVu] = useState<PhiDichVuItem[]>(
    [],
  );
  const [danhSachHopDongCu, setDanhSachHopDongCu] = useState<any[]>([]);

  // State điều khiển 4 Modal con
  const [moModalSua, setMoModalSua] = useState<boolean>(false);
  const [maHDTDangSua, setMaHDTDangSua] = useState<number | null>(null);
  const [hopDongCanXoa, setHopDongCanXoa] = useState<HopDongItem | null>(null);
  const [maHDTXemPdf, setMaHDTXemPdf] = useState<number | null>(null);
  const [maHDTXuatBanCung, setMaHDTXuatBanCung] = useState<number | null>(null);

  const taiThongTinUser = async () => {
    try {
      const authAny = AuthService as any;
      if (typeof authAny.getCurrentUser === "function") {
        const u = await authAny.getCurrentUser();
        if (u) return setUser(u);
      }
      if (typeof authAny.getProfile === "function") {
        const u = await authAny.getProfile();
        if (u) return setUser(u);
      }
      if (typeof authAny.me === "function") {
        const u = await authAny.me();
        if (u) return setUser(u);
      }
      const storedUser =
        localStorage.getItem("user") || localStorage.getItem("userProfile");
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error("Không thể tải thông tin người dùng:", error);
    }
  };

  // Gọi API lấy danh sách hợp đồng theo bộ lọc
  const taiDanhSachHopDong = async (customFilter?: {
    tuKhoa?: string;
    trangThai?: string;
    maKhu?: string;
    maPhong?: string;
  }) => {
    setDangTai(true);
    try {
      const filterParams = {
        tuKhoa:
          customFilter?.tuKhoa !== undefined ? customFilter.tuKhoa : tuKhoa,
        trangThai:
          customFilter?.trangThai !== undefined
            ? customFilter.trangThai
            : trangThaiLoc,
        maKhu:
          customFilter?.maKhu !== undefined ? customFilter.maKhu : maKhuLoc,
        maPhong:
          customFilter?.maPhong !== undefined
            ? customFilter.maPhong
            : maPhongLoc,
      };

      const ds = await hopDongService.layDanhSach({
        tuKhoa: filterParams.tuKhoa.trim(),
        trangThai: filterParams.trangThai,
        maKhu: filterParams.maKhu,
        maPhong: filterParams.maPhong,
      });

      setDanhSachHopDong(ds);

      // Lưu lại danh sách gốc khi không có bộ lọc để giữ số đếm tổng quan chính xác
      if (
        !filterParams.tuKhoa.trim() &&
        !filterParams.trangThai &&
        !filterParams.maKhu &&
        !filterParams.maPhong
      ) {
        setDanhSachHopDongGoc(ds);
      }
    } catch (error: any) {
      alert(error.message || "Lỗi khi tải danh sách hợp đồng");
    } finally {
      setDangTai(false);
    }
  };

  const taiDuLieuDanhMuc = async () => {
    try {
      const data = await hopDongService.layDuLieuTaoMoi();
      setDanhSachPhong(data.danhSachPhong || []);
      setDanhSachKhachThue(data.danhSachKhachThue || []);
      setDanhSachPhiDichVu(data.danhSachPhiDichVu || []);
      setDanhSachHopDongCu(data.danhSachHopDongCu || []);
    } catch (error) {
      console.error("Lỗi tải dữ liệu danh mục:", error);
    }
  };

  useEffect(() => {
    taiThongTinUser();
    taiDanhSachHopDong();
    taiDuLieuDanhMuc();
  }, []);

  // Trích xuất danh sách Khu trọ duy nhất từ danhSachPhong và danhSachHopDongGoc
  const danhSachKhuTro = useMemo(() => {
    const mapKhu = new Map<number, string>();
    danhSachPhong.forEach((p) => {
      if (p.MaKhu && p.TenKhu) mapKhu.set(Number(p.MaKhu), p.TenKhu);
    });
    danhSachHopDongGoc.forEach((hd: any) => {
      if (hd.MaKhu && hd.TenKhu) mapKhu.set(Number(hd.MaKhu), hd.TenKhu);
    });
    return Array.from(mapKhu.entries()).map(([MaKhu, TenKhu]) => ({
      MaKhu,
      TenKhu,
    }));
  }, [danhSachPhong, danhSachHopDongGoc]);

  // Lọc danh sách phòng trong dropdown theo Khu trọ đang chọn
  const danhSachPhongTheoKhu = useMemo(() => {
    if (!maKhuLoc) return danhSachPhong;
    return danhSachPhong.filter((p) => String(p.MaKhu) === String(maKhuLoc));
  }, [danhSachPhong, maKhuLoc]);

  // Xử lý khi chọn Phòng
  const xuLyChonPhong = (maPhongMoi: string) => {
    setMaPhongLoc(maPhongMoi);
    taiDanhSachHopDong({
      tuKhoa,
      trangThai: trangThaiLoc,
      maKhu: maKhuLoc,
      maPhong: maPhongMoi,
    });
  };

  // Xử lý khi chọn Trạng thái
  const xuLyChonTrangThai = (trangThaiMoi: string) => {
    setTrangThaiLoc(trangThaiMoi);
    taiDanhSachHopDong({
      tuKhoa,
      trangThai: trangThaiMoi,
      maKhu: maKhuLoc,
      maPhong: maPhongLoc,
    });
  };

  // Đặt lại toàn bộ bộ lọc
  const datLaiBoLoc = () => {
    setTuKhoa("");
    setTrangThaiLoc("");
    setMaKhuLoc("");
    setMaPhongLoc("");
    taiDanhSachHopDong({
      tuKhoa: "",
      trangThai: "",
      maKhu: "",
      maPhong: "",
    });
  };

  const coBoLocDangBat = Boolean(
    tuKhoa.trim() || trangThaiLoc || maKhuLoc || maPhongLoc,
  );

  const moFormTaoMoi = () => {
    setMaHDTDangSua(null);
    setMoModalSua(true);
  };

  const moFormSua = (maHDT: number) => {
    setMaHDTDangSua(maHDT);
    setMoModalSua(true);
  };

  const lamMoiDuLieu = () => {
    taiDanhSachHopDong();
    taiDuLieuDanhMuc();
  };

  // Đếm số lượng theo trạng thái
  const soConHieuLuc = danhSachHopDong.filter(
    (h) => h.TrangThai === "ConHieuLuc",
  ).length;
  const soHetHan = danhSachHopDong.filter(
    (h) => h.TrangThai === "HetHan",
  ).length;
  const soDaHuy = danhSachHopDong.filter((h) => h.TrangThai === "DaHuy").length;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900">
      {/* Thanh Header Quản Lý trên cùng */}
      <QuanLyHeader user={user} />

      {/* Mở rộng max-w-[1440px] để bảng 8 cột hiển thị trọn vẹn không cần kéo ngang */}
      <main className="mx-auto max-w-[1440px] px-3 py-6 sm:px-5 lg:px-6">
        {/* 1. Tiêu đề trang & Nút Thêm Hợp Đồng */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Quản Lý Hợp Đồng Thuê Phòng
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Thiết lập tạo mới, chỉnh sửa, tra cứu, xem PDF và xuất hợp đồng
              bản cứng tự động điền thông tin.
            </p>
          </div>
          <button
            onClick={moFormTaoMoi}
            className="cursor-pointer whitespace-nowrap rounded-full bg-[#00FFCC] px-5 py-2.5 text-xs font-bold text-slate-900 shadow-2xs transition hover:bg-[#00e6b8]"
          >
            + Thêm Hợp Đồng
          </button>
        </div>

        {/* 2. Khung Tìm kiếm & Bộ lọc */}
        <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs">
          <div className="grid grid-cols-1 gap-2.5 md:grid-cols-12 md:items-center">
            {/* Ô tìm kiếm - mở rộng */}
            <div className="relative md:col-span-7">
              <input
                type="text"
                placeholder="Tìm mã HĐ, tên phòng, khu trọ, họ tên / CCCD / SĐT..."
                value={tuKhoa}
                onChange={(e) => setTuKhoa(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && taiDanhSachHopDong()}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2.5 pr-8 pl-3.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-[#00FFCC] focus:bg-white focus:outline-none sm:text-sm"
              />

              {tuKhoa && (
                <button
                  type="button"
                  onClick={() => {
                    setTuKhoa("");
                    taiDanhSachHopDong({ tuKhoa: "" });
                  }}
                  title="Xóa từ khóa"
                  className="absolute top-1/2 right-2.5 -translate-y-1/2 cursor-pointer text-xs font-bold text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Lọc theo phòng */}
            <div className="md:col-span-2">
              <select
                value={maPhongLoc}
                onChange={(e) => xuLyChonPhong(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2.5 text-xs font-medium text-slate-700 focus:border-[#00FFCC] focus:bg-white focus:outline-none sm:text-sm"
              >
                <option value="">-- Tất cả phòng --</option>
                {danhSachPhongTheoKhu.map((phong) => (
                  <option key={phong.MaPhong} value={String(phong.MaPhong)}>
                    {phong.TenPhong}{" "}
                    {!maKhuLoc && phong.TenKhu ? `(${phong.TenKhu})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Lọc theo trạng thái */}
            <div className="md:col-span-2">
              <select
                value={trangThaiLoc}
                onChange={(e) => xuLyChonTrangThai(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2.5 text-xs font-medium text-slate-700 focus:border-[#00FFCC] focus:bg-white focus:outline-none sm:text-sm"
              >
                <option value="">-- Trạng thái --</option>
                <option value="ConHieuLuc">Còn hiệu lực</option>
                <option value="HetHan">Hết hạn</option>
                <option value="DaHuy">Đã hủy</option>
              </select>
            </div>

            {/* Nút tìm kiếm và đặt lại */}
            <div className="flex items-center justify-end gap-2 md:col-span-1">
              <button
                type="button"
                onClick={() => taiDanhSachHopDong()}
                className="w-full cursor-pointer whitespace-nowrap rounded-xl bg-[#0F172A] px-3 py-2.5 text-xs font-bold text-white transition hover:bg-slate-800"
              >
                Tìm kiếm
              </button>

              {coBoLocDangBat && (
                <button
                  type="button"
                  onClick={datLaiBoLoc}
                  title="Đặt lại bộ lọc"
                  className="cursor-pointer whitespace-nowrap rounded-xl border border-slate-200 bg-slate-100 px-3 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-200"
                >
                  Đặt lại
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 3. Thanh Tổng cộng kiêm Nút lọc nhanh theo trạng thái */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-slate-600">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => xuLyChonTrangThai("")}
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3.5 py-1.5 font-medium transition ${
                trangThaiLoc === ""
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              Tổng cộng:{" "}
              <strong className="font-bold">
                {danhSachHopDong.length} hợp đồng
              </strong>
            </button>

            <button
              type="button"
              onClick={() =>
                xuLyChonTrangThai(
                  trangThaiLoc === "ConHieuLuc" ? "" : "ConHieuLuc",
                )
              }
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 font-semibold transition ${
                trangThaiLoc === "ConHieuLuc"
                  ? "bg-emerald-600 text-white ring-2 ring-emerald-300"
                  : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  trangThaiLoc === "ConHieuLuc" ? "bg-white" : "bg-emerald-500"
                }`}
              ></span>
              Còn hiệu lực: {soConHieuLuc}
            </button>

            <button
              type="button"
              onClick={() =>
                xuLyChonTrangThai(trangThaiLoc === "HetHan" ? "" : "HetHan")
              }
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 font-semibold transition ${
                trangThaiLoc === "HetHan"
                  ? "bg-amber-500 text-white ring-2 ring-amber-300"
                  : "bg-amber-50 text-amber-700 hover:bg-amber-100"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  trangThaiLoc === "HetHan" ? "bg-white" : "bg-amber-500"
                }`}
              ></span>
              Hết hạn: {soHetHan}
            </button>

            {soDaHuy > 0 && (
              <button
                type="button"
                onClick={() =>
                  xuLyChonTrangThai(trangThaiLoc === "DaHuy" ? "" : "DaHuy")
                }
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 font-semibold transition ${
                  trangThaiLoc === "DaHuy"
                    ? "bg-rose-600 text-white ring-2 ring-rose-300"
                    : "bg-rose-50 text-rose-700 hover:bg-rose-100"
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    trangThaiLoc === "DaHuy" ? "bg-white" : "bg-rose-500"
                  }`}
                ></span>
                Đã hủy: {soDaHuy}
              </button>
            )}
          </div>
        </div>

        {/* 4. Bảng Danh sách hợp đồng (Vừa khít 100% khung hình, không cần kéo ngang) */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs sm:text-[13px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[10px] font-bold uppercase tracking-wider text-slate-500 sm:text-[11px]">
                  <th className="whitespace-nowrap px-2.5 py-3 pl-3.5">
                    Mã HĐ
                  </th>
                  <th className="whitespace-nowrap px-2.5 py-3">
                    Phòng / Khu trọ
                  </th>
                  <th className="whitespace-nowrap px-2.5 py-3">
                    Người đại diện đứng tên
                  </th>
                  <th className="whitespace-nowrap px-2 py-3 text-center">
                    Số người ở
                  </th>
                  <th className="whitespace-nowrap px-2.5 py-3">
                    Thời hạn thuê
                  </th>
                  <th className="whitespace-nowrap px-2.5 py-3">
                    Giá phòng / Tiền cọc
                  </th>
                  <th className="whitespace-nowrap px-2 py-3 text-center">
                    Trạng thái
                  </th>
                  <th className="whitespace-nowrap px-2.5 py-3 pr-3.5 text-center">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dangTai ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="p-10 text-center text-sm text-slate-500"
                    >
                      Đang tải danh sách hợp đồng...
                    </td>
                  </tr>
                ) : danhSachHopDong.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="p-10 text-center text-sm text-slate-500"
                    >
                      Không tìm thấy hợp đồng nào phù hợp với điều kiện lọc.
                    </td>
                  </tr>
                ) : (
                  danhSachHopDong.map((hd) => (
                    <tr
                      key={hd.MaHDT}
                      className="transition hover:bg-[#00FFCC]/5"
                    >
                      {/* Cột 1: Mã HĐ */}
                      <td className="whitespace-nowrap px-2.5 py-3 pl-3.5 align-middle">
                        <div className="font-bold text-slate-900">
                          #{String(hd.MaHDT).padStart(3, "0")}
                        </div>
                        {hd.MaHDTCu && (
                          <div className="mt-0.5 text-[10px] font-medium text-slate-400">
                            Nối #{String(hd.MaHDTCu).padStart(3, "0")}
                          </div>
                        )}
                      </td>

                      {/* Cột 2: Phòng / Khu trọ */}
                      <td className="px-2.5 py-3 align-middle">
                        <div className="font-bold text-slate-900">
                          {hd.TenPhong}
                        </div>
                        <div
                          className="mt-0.5 max-w-[155px] truncate text-[11px] text-slate-500 xl:max-w-[190px]"
                          title={hd.TenKhu}
                        >
                          {hd.TenKhu}
                        </div>
                      </td>

                      {/* Cột 3: Người đại diện */}
                      <td className="whitespace-nowrap px-2.5 py-3 align-middle">
                        <div className="font-bold text-slate-900">
                          {hd.TenDaiDien || "Chưa cập nhật"}
                        </div>
                        <div className="mt-0.5 text-[11px] text-slate-500">
                          SĐT:{" "}
                          <span className="font-medium text-slate-700">
                            {hd.SDTDaiDien || "---"}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          CCCD: {hd.CCCDDaiDien || "---"}
                        </div>
                      </td>

                      {/* Cột 4: Số người ở */}
                      <td className="whitespace-nowrap px-2 py-3 text-center align-middle">
                        <span className="inline-flex items-center justify-center whitespace-nowrap rounded-full bg-[#00FFCC]/25 px-2.5 py-0.5 text-[11px] font-bold text-slate-900">
                          {hd.SoThanhVien || 1} thành viên
                        </span>
                      </td>

                      {/* Cột 5: Thời hạn thuê */}
                      <td className="whitespace-nowrap px-2.5 py-3 align-middle text-[11px]">
                        <div className="text-slate-600">
                          <span className="inline-block w-7 text-slate-400">
                            Từ:
                          </span>
                          <span className="font-medium text-slate-800">
                            {dinhDangNgayVN(hd.NgayBD)}
                          </span>
                        </div>
                        <div className="mt-0.5 text-slate-600">
                          <span className="inline-block w-7 text-slate-400">
                            Đến:
                          </span>
                          <span className="font-medium text-slate-800">
                            {dinhDangNgayVN(hd.NgayKT)}
                          </span>
                        </div>
                      </td>

                      {/* Cột 6: Giá phòng / Tiền cọc */}
                      <td className="whitespace-nowrap px-2.5 py-3 align-middle text-[11px]">
                        <div>
                          <span className="text-slate-400">Giá: </span>
                          <strong className="font-bold text-emerald-600">
                            {dinhDangTienVN(hd.GiaPhong)} đ
                          </strong>
                        </div>
                        <div className="mt-0.5 text-slate-500">
                          <span className="text-slate-400">Cọc: </span>
                          <span className="font-medium text-slate-700">
                            {dinhDangTienVN(hd.TienCoc)} đ
                          </span>
                        </div>
                      </td>

                      {/* Cột 7: Trạng thái */}
                      <td className="whitespace-nowrap px-2 py-3 text-center align-middle">
                        <span
                          className={`inline-flex items-center justify-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                            hd.TrangThai === "ConHieuLuc"
                              ? "bg-[#00FFCC]/30 text-slate-900"
                              : hd.TrangThai === "HetHan"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-rose-100 text-rose-700"
                          }`}
                        >
                          {hd.TrangThai === "ConHieuLuc"
                            ? "Còn hiệu lực"
                            : hd.TrangThai === "HetHan"
                              ? "Hết hạn"
                              : "Đã hủy"}
                        </span>
                      </td>

                      {/* Cột 8: Thao tác (4 nút gọn gàng hiển thị đủ 100% không bị khuất nút Xóa) */}
                      <td className="whitespace-nowrap px-2.5 py-3 pr-3.5 text-center align-middle">
                        <div className="inline-flex items-center justify-center gap-1">
                          <button
                            onClick={() => setMaHDTXemPdf(hd.MaHDT)}
                            className="cursor-pointer whitespace-nowrap rounded-full bg-[#00FFCC] px-2.5 py-1 text-[11px] font-bold text-slate-900 transition hover:bg-[#00e6b8]"
                          >
                            Xem PDF
                          </button>
                          <button
                            onClick={() => setMaHDTXuatBanCung(hd.MaHDT)}
                            className="cursor-pointer whitespace-nowrap rounded-full border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 transition hover:bg-slate-100"
                          >
                            Xuất bản cứng
                          </button>
                          <button
                            onClick={() => moFormSua(hd.MaHDT)}
                            className="cursor-pointer whitespace-nowrap rounded-full bg-[#0F172A] px-2.5 py-1 text-[11px] font-bold text-white transition hover:bg-slate-800"
                          >
                            Sửa
                          </button>
                          <button
                            onClick={() => setHopDongCanXoa(hd)}
                            className="cursor-pointer whitespace-nowrap rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-600 transition hover:bg-rose-100"
                          >
                            Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* 1. Modal Sửa / Tạo mới hợp đồng */}
      <SuaHopDongModal
        moModal={moModalSua}
        maHDTSua={maHDTDangSua}
        danhSachPhong={danhSachPhong}
        danhSachKhachThue={danhSachKhachThue}
        danhSachPhiDichVu={danhSachPhiDichVu}
        danhSachHopDongCu={danhSachHopDongCu}
        onClose={() => setMoModalSua(false)}
        onSuccess={lamMoiDuLieu}
      />

      {/* 2. Modal Xóa hợp đồng */}
      <XoaHopDongModal
        hopDongCanXoa={hopDongCanXoa}
        onClose={() => setHopDongCanXoa(null)}
        onSuccess={lamMoiDuLieu}
      />

      {/* 3. Modal Xem PDF */}
      <XemPdfHopDongModal
        maHDT={maHDTXemPdf}
        onClose={() => setMaHDTXemPdf(null)}
      />

      {/* 4. Modal Xuất bản cứng */}
      <XuatBanCungModal
        maHDT={maHDTXuatBanCung}
        onClose={() => setMaHDTXuatBanCung(null)}
      />
    </div>
  );
}
