// src/components/home/TinDangSection.tsx
"use client";

import { useMemo } from "react";
import { resolveRoomImageUrl } from "@/services/phongTro.service";
import { TienIchItem } from "@/services/home.service";
import {
  TinDangItem,
  KhuTroWithContact,
  extractManagerContact,
} from "./home.data";

interface TinDangSectionProps {
  tinDangList: TinDangItem[];
  filteredTinDangList: TinDangItem[];
  khuTroList: KhuTroWithContact[];
  tienIchList: TienIchItem[];
  loading: boolean;
  selectedKhu: string;
  selectedMucGia: string;
  selectedDienTich: string;
  onChangeKhu: (val: string) => void;
  onChangeMucGia: (val: string) => void;
  onChangeDienTich: (val: string) => void;
  onResetFilters: () => void;
  onSelectContactRoom: (tin: TinDangItem) => void;
}

export default function TinDangSection({
  tinDangList,
  filteredTinDangList,
  khuTroList,
  tienIchList,
  loading,
  selectedKhu,
  selectedMucGia,
  selectedDienTich,
  onChangeKhu,
  onChangeMucGia,
  onChangeDienTich,
  onResetFilters,
  onSelectContactRoom,
}: TinDangSectionProps) {
  // Chốt chặn lọc chỉ giữ lại tin đăng Đang hiển thị & Phòng đang trống
  const validTotalTinDangList = useMemo(() => {
    return tinDangList.filter(
      (tin) =>
        tin.TrangThaiPhong === "Trong" &&
        (!tin.TrangThai || tin.TrangThai === "DangHienThi"),
    );
  }, [tinDangList]);

  const validFilteredTinDangList = useMemo(() => {
    return filteredTinDangList.filter(
      (tin) =>
        tin.TrangThaiPhong === "Trong" &&
        (!tin.TrangThai || tin.TrangThai === "DangHienThi"),
    );
  }, [filteredTinDangList]);

  return (
    <section id="tin-dang" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold bg-[#00FFCC]/30 text-slate-900 mb-1.5">
            Tra cứu phòng trống trực tuyến
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
            Danh Sách Phòng Đang Mở Cho Thuê ({validFilteredTinDangList.length}/
            {validTotalTinDangList.length})
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Hỗ trợ bộ lọc đa tiêu chí theo cơ sở, diện tích, mức giá thuê và kết
            nối trực tiếp Zalo / SĐT quản lý từng khu trọ
          </p>
        </div>
      </div>

      {/* Bộ lọc đa tiêu chí */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="space-y-1">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Cơ sở / Khu trọ
            </label>
            <select
              value={selectedKhu}
              onChange={(e) => onChangeKhu(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-500 text-slate-900"
            >
              <option value="ALL">Tất cả cơ sở ({khuTroList.length})</option>
              {khuTroList.map((khu) => (
                <option key={khu.MaKhu} value={String(khu.MaKhu)}>
                  {khu.TenKhu}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Mức giá thuê / tháng
            </label>
            <select
              value={selectedMucGia}
              onChange={(e) => onChangeMucGia(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-500 text-slate-900"
            >
              <option value="ALL">Tất cả mức giá</option>
              <option value="DUOI_25">Dưới 2.500.000 đ</option>
              <option value="TU_25_DEN_40">Từ 2.500.000 đ - 4.000.000 đ</option>
              <option value="TREN_40">Trên 4.000.000 đ</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Diện tích sử dụng
            </label>
            <select
              value={selectedDienTich}
              onChange={(e) => onChangeDienTich(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-500 text-slate-900"
            >
              <option value="ALL">Tất cả diện tích</option>
              <option value="DUOI_20">Dưới 20 m²</option>
              <option value="TU_20_DEN_30">Từ 20 m² - 30 m²</option>
              <option value="TREN_30">Trên 30 m²</option>
            </select>
          </div>
        </div>

        {/* Dòng trạng thái bộ lọc & tiện ích đi kèm */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-500 mr-1">
              Tiện ích tiêu chuẩn tại hệ thống:
            </span>
            {tienIchList.length > 0 ? (
              tienIchList.slice(0, 6).map((ti) => (
                <span
                  key={ti.MaTI}
                  className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700"
                >
                  {ti.TenTI}
                </span>
              ))
            ) : (
              <>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">
                  Đồng hồ IoT riêng
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">
                  Wifi tốc độ cao
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">
                  Kiểm soát vân tay / RFID
                </span>
              </>
            )}
          </div>

          {(selectedKhu !== "ALL" ||
            selectedMucGia !== "ALL" ||
            selectedDienTich !== "ALL") && (
            <button
              type="button"
              onClick={onResetFilters}
              className="px-3 py-1 rounded-lg text-xs font-bold bg-slate-100 hover:bg-[#00FFCC] text-slate-900 transition cursor-pointer"
            >
              Đặt lại bộ lọc
            </button>
          )}
        </div>
      </div>

      {/* Lưới danh sách tin đăng */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="bg-white border border-slate-200 rounded-2xl p-5 h-80 animate-pulse flex flex-col justify-between"
            >
              <div className="h-10 bg-slate-100 rounded-xl" />
              <div className="space-y-3">
                <div className="h-5 bg-slate-100 rounded w-2/3" />
                <div className="h-4 bg-slate-100 rounded w-1/2" />
                <div className="h-16 bg-slate-100 rounded-xl w-full" />
              </div>
              <div className="h-9 bg-slate-100 rounded-xl" />
            </div>
          ))}
        </div>
      ) : validFilteredTinDangList.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center max-w-xl mx-auto shadow-xs">
          <span className="inline-block px-3.5 py-1 rounded-full text-xs font-bold bg-[#00FFCC] text-slate-900 mb-3">
            Không có kết quả phù hợp
          </span>
          <h3 className="text-lg font-bold text-slate-900">
            Hiện chưa tìm thấy phòng trống đang mở tin khớp với tiêu chí lọc
          </h3>
          <p className="text-xs text-slate-500 mt-1.5">
            Bạn có thể đặt lại bộ lọc, hỏi Trợ lý ảo AI Chatbot ở góc màn hình
            hoặc liên hệ trực tiếp chủ trọ để được hỗ trợ.
          </p>
          {validTotalTinDangList.length > 0 && (
            <button
              type="button"
              onClick={onResetFilters}
              className="mt-4 px-4 py-2 bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 border border-teal-300 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              Xem toàn bộ {validTotalTinDangList.length} phòng đang mở
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {validFilteredTinDangList.map((tin) => {
            const contact = extractManagerContact(tin, khuTroList);
            const rawImage =
              tin.AnhDaiDien ||
              (Array.isArray((tin as any).DanhSachAnh) &&
              (tin as any).DanhSachAnh.length > 0
                ? (tin as any).DanhSachAnh[0]
                : null);

            const formattedDate =
              tin.NgayDang && !isNaN(new Date(tin.NgayDang).getTime())
                ? new Date(tin.NgayDang).toLocaleDateString("vi-VN")
                : "Mới cập nhật";

            return (
              <div
                key={tin.MaTin}
                className="group bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition overflow-hidden flex flex-col"
              >
                {/* Hình ảnh phòng */}
                <div className="relative h-48 w-full bg-slate-100 overflow-hidden">
                  <img
                    src={
                      rawImage
                        ? resolveRoomImageUrl(rawImage)
                        : "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&auto=format&fit=crop&q=80"
                    }
                    alt={tin.TieuDe}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-3 left-3">
                    <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-900/80 text-[#00FFCC] backdrop-blur-xs">
                      {tin.TenKhu}
                    </span>
                  </div>
                  <div className="absolute top-3 right-3">
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold border bg-emerald-100 text-emerald-800 border-emerald-300">
                      Đang trống
                    </span>
                  </div>
                </div>

                {/* Phần đầu thẻ: Mã tin & Ngày đăng */}
                <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-500">
                    Mã tin #{tin.MaTin}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#00FFCC]/25 text-slate-900 border border-teal-200">
                    Đăng ngày: {formattedDate}
                  </span>
                </div>

                {/* Nội dung chi tiết của phòng & bài đăng */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-baseline justify-between gap-2">
                        <h3 className="text-lg font-bold text-slate-900">
                          Phòng {tin.TenPhong}
                        </h3>
                        <span className="text-xs font-semibold text-slate-500">
                          Diện tích: {Number(tin.DienTich)} m²
                        </span>
                      </div>

                      <p className="mt-1 text-base font-bold text-teal-700">
                        {Number(tin.Gia).toLocaleString("vi-VN")} đ / tháng
                      </p>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-slate-100">
                      <h4 className="text-sm font-bold text-slate-900 line-clamp-2 leading-snug">
                        {tin.TieuDe}
                      </h4>
                      <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                        {tin.MoTa || "Chưa có mô tả chi tiết cho bài đăng này."}
                      </p>
                    </div>
                  </div>

                  {/* Chân thẻ: Thông tin Quản lý Khu trọ & Nút Liên hệ */}
                  <div className="pt-3.5 border-t border-slate-100 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Quản lý {tin.TenKhu}
                        </p>
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {contact.tenQuanLy}
                        </p>
                      </div>

                      <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-800 shrink-0">
                        📞{" "}
                        {contact.hasPhoneFromDB
                          ? contact.sdtHienThi
                          : "Chưa cập nhật SĐT"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {contact.hasPhoneFromDB && (
                        <a
                          href={contact.zaloUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-2 rounded-xl text-xs font-bold bg-white hover:bg-blue-50 text-[#0068FF] border border-[#0068FF] transition text-center shrink-0"
                          title={`Nhắn Zalo cho ${contact.tenQuanLy}`}
                        >
                          Chat Zalo
                        </a>
                      )}

                      <button
                        type="button"
                        onClick={() => onSelectContactRoom(tin)}
                        className="flex-1 px-4 py-2 bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 border border-teal-300 text-xs font-bold rounded-xl shadow-2xs transition cursor-pointer"
                      >
                        Liên hệ thuê phòng
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
