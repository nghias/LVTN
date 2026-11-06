// client/src/components/features/hopDongNguoiThue/chiTiet/page.tsx
'use client';

import React from 'react';
import {
  ChiTietHopDongNguoiThue,
  HopDongTomTat,
  chuanHoaNFC,
  formatDateVN,
  formatVND,
} from '@/utils/hopDongNguoiThue.util';

interface ChiTietThongTinHopDongProps {
  chiTiet: ChiTietHopDongNguoiThue;
  tomTat?: HopDongTomTat | null;
}

export default function ChiTietThongTinHopDong({
  chiTiet,
  tomTat,
}: ChiTietThongTinHopDongProps) {
  // Thêm chốt chặn này để xử lý lỗi prerender khi dữ liệu chưa tải xong
  if (!chiTiet) {
    return (
      <div className="p-5 text-sm text-slate-500 font-semibold animate-pulse">
        Đang tải thông tin hợp đồng...
      </div>
    );
  }

  // Giữ nguyên toàn bộ code cũ của bạn ở bên dưới
  const giaDien = Number(chiTiet.GiaDienNuoc?.GiaDien ?? chiTiet.GiaDien ?? 0);
  const giaNuoc = Number(chiTiet.GiaDienNuoc?.GiaNuoc ?? chiTiet.GiaNuoc ?? 0);
  const soDienDau = Number(
    chiTiet.ChiSoBanGiao?.SoDienMoi ?? chiTiet.ChiSoBanGiao?.SoDienCu ?? 0
  );
  const soNuocDau = Number(
    chiTiet.ChiSoBanGiao?.SoNuocMoi ?? chiTiet.ChiSoBanGiao?.SoNuocCu ?? 0
  );

  const renderTamTruBadge = (tamTru?: string) => {
    if (tamTru === 'DaDangKy') {
      return (
        <span className="inline-flex items-center rounded-full border border-teal-200 bg-[#00FFCC]/20 px-2.5 py-0.5 text-[11px] font-bold text-slate-800">
          Đã đăng ký tạm trú
        </span>
      );
    }
    return (
      <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-700">
        Chưa đăng ký / Đang chờ
      </span>
    );
  };

  return (
    <div className="p-5 sm:p-6 space-y-6">
      {/* 1. Thông tin tài chính & thời hạn */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
          1. Thông tin hợp đồng
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
            <span className="block text-[11px] text-slate-500">Giá thuê phòng</span>
            <span className="mt-0.5 block text-sm sm:text-base font-bold text-teal-700">
              {formatVND(chiTiet.GiaPhong)}/tháng
            </span>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
            <span className="block text-[11px] text-slate-500">Tiền đặt cọc</span>
            <span className="mt-0.5 block text-sm sm:text-base font-bold text-slate-900">
              {formatVND(chiTiet.TienCoc)}
            </span>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
            <span className="block text-[11px] text-slate-500">Ngày bắt đầu</span>
            <span className="mt-0.5 block text-sm font-bold text-slate-900">
              {formatDateVN(chiTiet.NgayBD)}
            </span>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
            <span className="block text-[11px] text-slate-500">Ngày kết thúc</span>
            <span className="mt-0.5 block text-sm font-bold text-slate-900">
              {formatDateVN(chiTiet.NgayKT)}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Thông tin Bên cho thuê & Chỉ số điện nước bàn giao */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
            Đại diện Bên cho thuê (Bên A)
          </h4>
          <div className="space-y-2 text-xs text-slate-600">
            <p className="flex justify-between gap-2">
              <span>Chủ cơ sở / Quản lý:</span>
              <strong className="text-slate-900">
                {chuanHoaNFC(chiTiet.TenChuTro || tomTat?.TenQuanLy)}
              </strong>
            </p>
            <p className="flex justify-between gap-2">
              <span>Số điện thoại:</span>
              <strong className="text-slate-900">
                {chuanHoaNFC(chiTiet.SDTChuTro || tomTat?.SDTQuanLy, 'Đang cập nhật')}
              </strong>
            </p>
            {chiTiet.ThongTinThanhToan && (
              <div className="pt-2 mt-2 border-t border-slate-200">
                <span className="block text-[11px] text-slate-400">
                  Tài khoản nhận thanh toán tiền phòng:
                </span>
                <strong className="mt-0.5 block text-slate-900">
                  {chuanHoaNFC(chiTiet.ThongTinThanhToan.TenNganHang)} • STK:{' '}
                  {chuanHoaNFC(chiTiet.ThongTinThanhToan.STK)} (
                  {chuanHoaNFC(chiTiet.ThongTinThanhToan.ChuTaiKhoan)})
                </strong>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
            Đơn giá Điện nước & Chỉ số bàn giao
          </h4>
          <div className="grid grid-cols-2 gap-2.5 text-xs">
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <span className="block text-[11px] text-slate-500">Đơn giá Điện</span>
              <strong className="text-sm text-slate-900">{formatVND(giaDien)}/kWh</strong>
              <span className="mt-1 block text-[11px] font-semibold text-teal-700">
                Chỉ số đầu: {soDienDau} kWh
              </span>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <span className="block text-[11px] text-slate-500">Đơn giá Nước</span>
              <strong className="text-sm text-slate-900">{formatVND(giaNuoc)}/m³</strong>
              <span className="mt-1 block text-[11px] font-semibold text-teal-700">
                Chỉ số đầu: {soNuocDau} m³
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Phí dịch vụ & Tiện ích bàn giao */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            Phí dịch vụ đăng ký hàng tháng
          </h4>
          {chiTiet.DanhSachPhiDichVu && chiTiet.DanhSachPhiDichVu.length > 0 ? (
            <div className="divide-y divide-slate-100 text-xs">
              {chiTiet.DanhSachPhiDichVu.map((dv, idx) => (
                <div key={dv.MaDV || idx} className="flex items-center justify-between py-2">
                  <span className="font-semibold text-slate-700">
                    {chuanHoaNFC(dv.TenDV || dv.TenPDV)} (x{dv.SoLuong ?? 1})
                  </span>
                  <span className="font-bold text-slate-900">
                    {formatVND(dv.DonGia ?? dv.Gia)} / {chuanHoaNFC(dv.DonViTinh, 'tháng')}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400">Không có phí dịch vụ cố định phát sinh.</p>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            Trang thiết bị & Tiện ích phòng
          </h4>
          {chiTiet.DanhSachTienIch && chiTiet.DanhSachTienIch.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {chiTiet.DanhSachTienIch.map((ti) => (
                <span
                  key={ti.MaTI}
                  className="inline-flex items-center rounded-full border border-teal-200 bg-[#00FFCC]/20 px-3 py-1 text-xs font-bold text-slate-800"
                >
                  ✓ {chuanHoaNFC(ti.TenTI)}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400">Theo hiện trạng bàn giao thực tế.</p>
          )}
        </div>
      </div>

      {/* 4. Danh sách thành viên & Tạm trú */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
          2. Thành viên lưu trú & Tình trạng đăng ký Tạm trú (
          {chiTiet.DanhSachThanhVien?.length || 0})
        </h3>
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full min-w-[540px] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
                <th className="py-3 px-4">Họ và tên thành viên</th>
                <th className="py-3 px-4">Vai trò</th>
                <th className="py-3 px-4">Ngày vào ở</th>
                <th className="py-3 px-4">Khai báo tạm trú</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {chiTiet.DanhSachThanhVien?.map((tv) => (
                <tr key={tv.MaND} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-bold text-slate-900">
                    {chuanHoaNFC(tv.HoTen)}
                    {tv.SDT && (
                      <span className="block text-[11px] font-normal text-slate-500">
                        SĐT: {chuanHoaNFC(tv.SDT)}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                        tv.VaiTro === 'DaiDien'
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {tv.VaiTro === 'DaiDien' ? 'Người đại diện HĐ' : 'Thành viên ở ghép'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    {formatDateVN(tv.NgayVao || chiTiet.NgayBD)}
                  </td>
                  <td className="py-3 px-4">{renderTamTruBadge(tv.TamTru)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}