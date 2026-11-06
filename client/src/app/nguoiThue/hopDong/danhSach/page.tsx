'use client';

import React from 'react';
import Link from 'next/link';
import {
  HopDongTomTat,
  chuanHoaNFC,
  formatDateVN,
  formatVND,
} from '@/utils/hopDongNguoiThue.util';

interface DanhSachHopDongSidebarProps {
  danhSach: HopDongTomTat[];
  selectedMaHDT: number | null;
  onSelect: (maHDT: number) => void;
  onOpenPdf: (maHDT: number, autoDownload: boolean) => void;
}

export default function DanhSachHopDongSidebar({
  danhSach = [], // Thêm = [] để bảo vệ lỗi prerender
  selectedMaHDT,
  onSelect,
  onOpenPdf,
}: DanhSachHopDongSidebarProps) {
  const renderTrangThaiPill = (trangThai: string) => {
    switch (trangThai) {
      case 'ConHieuLuc':
        return (
          <span className="inline-flex items-center rounded-full border border-teal-200 bg-[#00FFCC]/20 px-2.5 py-0.5 text-[11px] font-bold text-slate-800">
            Đang hiệu lực
          </span>
        );
      case 'HetHan':
        return (
          <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-700">
            Đã hết hạn
          </span>
        );
      case 'DaHuy':
        return (
          <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[11px] font-bold text-rose-700">
            Đã thanh lý
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-700">
            {trangThai}
          </span>
        );
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
      {/* Header khung danh sách */}
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <span className="text-xs font-bold text-slate-800">
          Danh sách ({danhSach.length})
        </span>
      </div>

      <div className="divide-y divide-slate-100 max-h-[70vh] overflow-y-auto">
        {danhSach.map((hd) => {
          const isSelected = hd.MaHDT === selectedMaHDT;
          return (
            <div
              key={hd.MaHDT}
              onClick={() => onSelect(hd.MaHDT)}
              className={`p-4 cursor-pointer transition ${
                isSelected
                  ? 'bg-[#00FFCC]/25 border-l-4 border-teal-500'
                  : 'bg-white hover:bg-slate-50'
              }`}
            >
              {/* Hàng badge phía trên */}
              <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                  Hợp đồng #{hd.MaHDT}
                </span>
                {renderTrangThaiPill(hd.TrangThai)}
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                  {hd.VaiTroCuaToi === 'DaiDien' ? 'Đại diện HĐ' : 'Thành viên'}
                </span>
              </div>

              {/* Tiêu đề phòng & khu trọ */}
              <h3
                className={`text-xs text-slate-900 mt-1 line-clamp-2 leading-snug ${
                  isSelected ? 'font-bold' : 'font-semibold'
                }`}
              >
                Phòng {chuanHoaNFC(hd.TenPhong)} • {chuanHoaNFC(hd.TenKhu)}
              </h3>

              {/* Mô tả tóm tắt */}
              <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                Giá thuê:{' '}
                <strong className="text-slate-900">
                  {formatVND(hd.GiaPhong)}/tháng
                </strong>
                {' — '}
                Tiền cọc:{' '}
                <strong className="text-slate-900">
                  {formatVND(hd.TienCoc)}
                </strong>
              </p>

              {/* Chân card: Quản lý & Thời hạn */}
              <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                <span>
                  Quản lý:{' '}
                  <strong className="text-slate-600">
                    {chuanHoaNFC(hd.TenQuanLy, 'Ban quản lý')}
                  </strong>
                </span>
                <span>
                  {formatDateVN(hd.NgayBD)} → {formatDateVN(hd.NgayKT)}
                </span>
              </div>

              {/* Cụm nút thao tác nhanh PDF */}
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenPdf(hd.MaHDT, false);
                  }}
                  className="flex-1 rounded-xl bg-[#00FFCC] hover:bg-teal-300 py-2 px-3 text-xs font-bold text-slate-900 transition cursor-pointer"
                >
                  Xem & In PDF A4
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenPdf(hd.MaHDT, true);
                  }}
                  className="rounded-xl bg-slate-900 hover:bg-slate-800 py-2 px-3 text-xs font-bold text-white transition cursor-pointer"
                >
                  Tải PDF
                </button>
              </div>

              {hd.DaGuiYeuCauHuy && (
                <div className="mt-2.5 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] font-semibold text-amber-800">
                  <span>Đã gửi yêu cầu xin chấm dứt HĐ</span>
                  <Link
                    href="/nguoiThue/thongBao"
                    onClick={(e) => e.stopPropagation()}
                    className="font-bold text-amber-950 underline"
                  >
                    Xem phản hồi
                  </Link>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}