"use client";

import { useEffect, useState } from "react";
import { TheRaVaoService } from "@/services/theRaVao.service";

interface Props {
  isChuTro: boolean;
  dsCoSo?: { MaCS: number; TenKhuTro: string }[];
}

interface ApiResponse<T = unknown> {
  success?: boolean;
  data?: T;
  message?: string;
}

export default function QuanLyTheRaVaoView({ isChuTro, dsCoSo = [] }: Props) {
  const [tab, setTab] = useState<"THE" | "LICH_SU">("THE");
  const [maCS, setMaCS] = useState("");
  const [keyword, setKeyword] = useState("");
  const [tuNgay, setTuNgay] = useState("");
  const [denNgay, setDenNgay] = useState("");

  const [dsThe, setDsThe] = useState<any[]>([]);
  const [lichSu, setLichSu] = useState<any[]>([]);
  const [trangThaiGhi, setTrangThaiGhi] = useState<string>("");

  const fetchDanhSachThe = async () => {
    const res = (await TheRaVaoService.getDanhSachThe({
      maCS: isChuTro ? maCS : undefined,
      keyword,
    })) as ApiResponse<any[]>;
    if (res.success) setDsThe(res.data ?? []);
  };

  const fetchLichSu = async () => {
    const res = (await TheRaVaoService.getLichSuRaVao({
      maCS: isChuTro ? maCS : undefined,
      tuNgay,
      denNgay,
      keyword,
    })) as ApiResponse<any[]>;
    if (res.success) setLichSu(res.data ?? []);
  };

  useEffect(() => {
    if (tab === "THE") fetchDanhSachThe();
    else fetchLichSu();
  }, [tab, maCS]);

  // Cấp lại thẻ -> phát lệnh xuống ESP32, tự làm mới sau vài giây để kiểm tra ESP32 đã ghi xong chưa
  const handleCapLaiThe = async (item: any) => {
    const ghiChu = prompt("Nhập ghi chú cấp lại thẻ:", "Cấp lại do khách quên/mất thẻ");
    if (ghiChu === null) return;

    try {
      const res = (await TheRaVaoService.capLaiThe({
        maND: item.MaND,
        maTheYeuCau: item.TrangThai === "ChoCapLai" ? item.MaThe : undefined,
        ghiChu,
      })) as ApiResponse;
      setTrangThaiGhi(res.message ?? "");
      await fetchDanhSachThe();

      // Tự động refresh danh sách mỗi 3 giây trong 30 giây để thấy trạng thái đổi sang HoatDong
      let count = 0;
      const timer = setInterval(async () => {
        count++;
        await fetchDanhSachThe();
        if (count >= 10) clearInterval(timer);
      }, 3000);
    } catch (err: any) {
      alert(err?.response?.data?.message || "Lỗi khi gửi lệnh cấp thẻ.");
    }
  };

  const handleKhoaThe = async (maThe: number) => {
    if (!confirm("Xác nhận khóa thẻ này ngay lập tức?")) return;
    await TheRaVaoService.khoaThe(maThe, "Quản lý khóa thẻ");
    await fetchDanhSachThe();
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">
          {isChuTro ? "Quản lý thẻ ra vào (Toàn hệ thống)" : "Quản lý thẻ ra vào (Cơ sở phụ trách)"}
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => setTab("THE")}
            className={`px-4 py-2 rounded-lg font-medium ${
              tab === "THE" ? "bg-blue-600 text-white" : "bg-gray-100"
            }`}
          >
            Danh sách & Cấp lại thẻ
          </button>
          <button
            onClick={() => setTab("LICH_SU")}
            className={`px-4 py-2 rounded-lg font-medium ${
              tab === "LICH_SU" ? "bg-blue-600 text-white" : "bg-gray-100"
            }`}
          >
            Lịch sử mở cửa
          </button>
        </div>
      </div>

      {/* Bộ lọc */}
      <div className="flex flex-wrap gap-3 bg-white p-4 rounded-xl border">
        {isChuTro && (
          <select
            className="border rounded-lg px-3 py-2 text-sm"
            value={maCS}
            onChange={(e) => setMaCS(e.target.value)}
          >
            <option value="">Tất cả cơ sở</option>
            {dsCoSo.map((cs) => (
              <option key={cs.MaCS} value={cs.MaCS}>
                {cs.TenKhuTro}
              </option>
            ))}
          </select>
        )}

        <input
          className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-[200px]"
          placeholder="Tìm theo tên khách thuê hoặc tên phòng..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />

        {tab === "LICH_SU" && (
          <>
            <input
              type="date"
              className="border rounded-lg px-3 py-2 text-sm"
              value={tuNgay}
              onChange={(e) => setTuNgay(e.target.value)}
            />
            <input
              type="date"
              className="border rounded-lg px-3 py-2 text-sm"
              value={denNgay}
              onChange={(e) => setDenNgay(e.target.value)}
            />
          </>
        )}

        <button
          onClick={tab === "THE" ? fetchDanhSachThe : fetchLichSu}
          className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm"
        >
          Lọc
        </button>
      </div>

      {/* Thông báo khi ESP32 đang chờ đặt phôi thẻ trắng */}
      {trangThaiGhi && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 flex justify-between items-center">
          <span>{trangThaiGhi}</span>
          <button onClick={() => setTrangThaiGhi("")} className="text-sm underline">
            Đóng
          </button>
        </div>
      )}

      {/* TAB 1: DANH SÁCH THẺ & CẤP LẠI */}
      {tab === "THE" ? (
        <div className="bg-white rounded-xl border overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-3">Khách thuê</th>
                <th className="p-3">Phòng / Cơ sở</th>
                <th className="p-3">Mã UID</th>
                <th className="p-3">Trạng thái</th>
                <th className="p-3">Ghi chú</th>
                <th className="p-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {dsThe.map((item) => (
                <tr key={item.MaThe} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-medium">{item.HoTen}</td>
                  <td className="p-3">
                    {item.TenPhong} <span className="text-gray-500">({item.TenKhuTro})</span>
                  </td>
                  <td className="p-3 font-mono">{item.MaUID || "—"}</td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${
                        item.TrangThai === "HoatDong"
                          ? "bg-green-100 text-green-700"
                          : item.TrangThai === "ChoCapLai"
                          ? "bg-amber-100 text-amber-800"
                          : item.TrangThai === "DangGhiThe"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {item.TrangThai}
                    </span>
                  </td>
                  <td className="p-3 text-gray-600">{item.GhiChu}</td>
                  <td className="p-3 text-right space-x-2">
                    <button
                      onClick={() => handleCapLaiThe(item)}
                      className="px-3 py-1.5 rounded bg-blue-600 text-white text-xs"
                    >
                      Cấp lại thẻ
                    </button>
                    {item.TrangThai === "HoatDong" && (
                      <button
                        onClick={() => handleKhoaThe(item.MaThe)}
                        className="px-3 py-1.5 rounded bg-red-600 text-white text-xs"
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
      ) : (
        /* TAB 2: LỊCH SỬ MỞ CỬA */
        <div className="bg-white rounded-xl border overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-3">Ngày quẹt</th>
                <th className="p-3">Giờ quẹt</th>
                <th className="p-3">Người mở cửa</th>
                <th className="p-3">Phòng</th>
                <th className="p-3">Cơ sở</th>
                <th className="p-3">Mã thẻ</th>
              </tr>
            </thead>
            <tbody>
              {lichSu.map((ls) => (
                <tr key={ls.MaLS} className="border-b hover:bg-gray-50">
                  <td className="p-3">{new Date(ls.NgayQuetThe).toLocaleDateString("vi-VN")}</td>
                  <td className="p-3 font-mono font-semibold">{ls.GioQuetThe}</td>
                  <td className="p-3 font-medium">{ls.HoTen}</td>
                  <td className="p-3">{ls.TenPhong}</td>
                  <td className="p-3">{ls.TenKhuTro}</td>
                  <td className="p-3">#{ls.MaThe}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}