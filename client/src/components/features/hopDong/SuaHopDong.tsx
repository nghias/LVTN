'use client';

import React, { useEffect, useState } from 'react';
import { hopDongService } from '@/services/hopDong.service';
import { PhiDichVuItem } from '@/types/hopDong.type';
import { dinhDangTienVN } from '@/utils/soThanhChu.util';

export interface ThanhVienForm {
  MaND: number;
  VaiTro: 'DaiDien' | 'ThanhVien';
  TamTru: 'ChuaDangKy' | 'DaDangKy' | 'DangCho';
  NgayVao: string;
  NgayDi: string;
}

interface SuaHopDongModalProps {
  moModal: boolean;
  maHDTSua: number | null;
  danhSachPhong: any[];
  danhSachKhachThue: any[];
  danhSachPhiDichVu: PhiDichVuItem[];
  danhSachHopDongCu: any[];
  onClose: () => void;
  onSuccess: () => void;
}

// Hàm thêm dấu chấm vào chuỗi số (hỗ trợ từ hàng đơn vị đến hàng triệu/tỷ)
const dinhDangSoCoDauCham = (giaTri: string | number): string => {
  const chuoiSo = String(giaTri).replace(/\D/g, '');
  if (!chuoiSo) return '';
  // Loại bỏ số 0 vô nghĩa ở đầu (trừ khi chỉ có 1 số 0)
  const soSach = chuoiSo.replace(/^0+(?=\d)/, '');
  return soSach.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

// Hàm chuyển chuỗi có dấu chấm về kiểu number
const chuyenChuoiThanhSo = (chuoiHienThi: string): number => {
  const chuoiSo = chuoiHienThi.replace(/\D/g, '');
  return chuoiSo ? Number(chuoiSo) : 0;
};

export default function SuaHopDongModal({
  moModal,
  maHDTSua,
  danhSachPhong,
  danhSachKhachThue,
  danhSachPhiDichVu,
  danhSachHopDongCu,
  onClose,
  onSuccess,
}: SuaHopDongModalProps) {
  const today = new Date().toISOString().slice(0, 10);

  // State dữ liệu form
  const [maPhong, setMaPhong] = useState<number | ''>('');
  const [maHDTCu, setMaHDTCu] = useState<number | ''>('');
  const [ngayKy, setNgayKy] = useState<string>(today);
  const [ngayBD, setNgayBD] = useState<string>(today);
  const [ngayKT, setNgayKT] = useState<string>('');
  const [tienCocHienThi, setTienCocHienThi] = useState<string>('0');
  const [trangThaiHD, setTrangThaiHD] = useState<string>('ConHieuLuc');
  const [kieuHopDong, setKieuHopDong] = useState<'DaiDienChung' | 'TachHopDongRieng'>('DaiDienChung');
  const [chiSoDienBanGiao, setChiSoDienBanGiao] = useState<string>('0');
  const [chiSoNuocBanGiao, setChiSoNuocBanGiao] = useState<string>('0');
  const [thanhVienChon, setThanhVienChon] = useState<ThanhVienForm[]>([]);
  const [maPDVChon, setMaPDVChon] = useState<number[]>([]);

  // State lưu giá trị gốc ban đầu để bắt lỗi UX/UI khi sửa hợp đồng
  const [trangThaiGoc, setTrangThaiGoc] = useState<string>('ConHieuLuc');
  const [ngayKTGoc, setNgayKTGoc] = useState<string>('');
  const [daDoiNgayKT, setDaDoiNgayKT] = useState<boolean>(false);

  // State thông báo lỗi UX/UI
  const [loiForm, setLoiForm] = useState<{
    ngayKT?: string;
    tienCoc?: string;
    thanhVien?: string;
    chung?: string;
  }>({});
  const [dangLuu, setDangLuu] = useState<boolean>(false);

  useEffect(() => {
    if (!moModal) return;
    setLoiForm({});
    setDaDoiNgayKT(false);

    if (maHDTSua) {
      // Tải dữ liệu khi ở chế độ Sửa
      hopDongService
        .xemChiTiet(maHDTSua)
        .then((ct) => {
          const ngayKTCu = ct.NgayKT ? ct.NgayKT.slice(0, 10) : '';
          setMaPhong(ct.MaPhong);
          setMaHDTCu(ct.MaHDTCu || '');
          setNgayKy(ct.NgayKy ? ct.NgayKy.slice(0, 10) : today);
          setNgayBD(ct.NgayBD ? ct.NgayBD.slice(0, 10) : today);
          setNgayKT(ngayKTCu);
          setTienCocHienThi(dinhDangSoCoDauCham(Number(ct.TienCoc || 0)));
          setTrangThaiHD(ct.TrangThai);
          setTrangThaiGoc(ct.TrangThai);
          setNgayKTGoc(ngayKTCu);
          setKieuHopDong('DaiDienChung');
          setThanhVienChon(
            ct.DanhSachThanhVien.map((tv) => ({
              MaND: tv.MaND,
              VaiTro: tv.VaiTro,
              TamTru: tv.TamTru,
              NgayVao: tv.NgayVao ? tv.NgayVao.slice(0, 10) : ct.NgayBD.slice(0, 10),
              NgayDi: tv.NgayDi ? tv.NgayDi.slice(0, 10) : '',
            }))
          );
          setMaPDVChon(ct.DanhSachPhiDichVu.map((p) => p.MaPDV));
        })
        .catch((error: any) => {
          alert(error.message || 'Không thể tải thông tin hợp đồng cần sửa');
          onClose();
        });
    } else {
      // Khởi tạo mặc định khi Tạo mới
      const nextYear = new Date();
      nextYear.setFullYear(nextYear.getFullYear() + 1);
      const macDinhKT = nextYear.toISOString().slice(0, 10);

      setMaPhong('');
      setMaHDTCu('');
      setNgayKy(today);
      setNgayBD(today);
      setNgayKT(macDinhKT);
      setTienCocHienThi('0');
      setTrangThaiHD('ConHieuLuc');
      setTrangThaiGoc('ConHieuLuc');
      setNgayKTGoc(macDinhKT);
      setKieuHopDong('DaiDienChung');
      setChiSoDienBanGiao('0');
      setChiSoNuocBanGiao('0');
      setThanhVienChon([]);
      setMaPDVChon(danhSachPhiDichVu.map((p) => p.MaPDV));
    }
  }, [moModal, maHDTSua]);

  if (!moModal) return null;

  // Kiểm tra xem người dùng có vừa đổi trạng thái mà chưa sửa ngày kết thúc hay không
  const canCapNhatNgayKTKhiDoiTrangThai =
    Boolean(maHDTSua) && trangThaiHD !== trangThaiGoc && (ngayKT === ngayKTGoc || !daDoiNgayKT);

  // Xử lý chọn phòng -> gợi ý tiền cọc
  const xuLyChonPhong = (idPhong: number) => {
    setMaPhong(idPhong);
    const phong = danhSachPhong.find((p) => p.MaPhong === idPhong);
    if (phong && !maHDTSua) {
      setTienCocHienThi(dinhDangSoCoDauCham(Number(phong.Gia)));
    }
  };

  // Xử lý nhập tiền cọc từ hàng đơn vị đến hàng triệu
  const xuLyNhapTienCoc = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const formatted = dinhDangSoCoDauCham(raw);
    setTienCocHienThi(formatted);
    if (loiForm.tienCoc) {
      setLoiForm((prev) => ({ ...prev, tienCoc: undefined }));
    }
  };

  // Xử lý đổi trạng thái hợp đồng
  const xuLyDoiTrangThai = (trangThaiMoi: string) => {
    setTrangThaiHD(trangThaiMoi);
    if (maHDTSua && trangThaiMoi !== trangThaiGoc && ngayKT === ngayKTGoc) {
      setLoiForm((prev) => ({
        ...prev,
        ngayKT: 'Bạn đã thay đổi trạng thái hợp đồng. Vui lòng cập nhật lại Ngày kết thúc thuê tương ứng!',
      }));
    } else {
      setLoiForm((prev) => ({ ...prev, ngayKT: undefined }));
    }
  };

  // Xử lý đổi ngày kết thúc
  const xuLyDoiNgayKT = (ngayMoi: string) => {
    setNgayKT(ngayMoi);
    setDaDoiNgayKT(true);
    setLoiForm((prev) => ({ ...prev, ngayKT: undefined }));
  };

  // Hàm chọn nhanh ngày kết thúc hỗ trợ UX
  const chonNhanhNgayKT = (loai: 'homNay' | '6thang' | '1nam') => {
    const moc = new Date();
    if (loai === '6thang') moc.setMonth(moc.getMonth() + 6);
    if (loai === '1nam') moc.setFullYear(moc.getFullYear() + 1);
    const chuoiNgay = moc.toISOString().slice(0, 10);
    xuLyDoiNgayKT(chuoiNgay);
  };

  // Quản lý thành viên trong form
  const themThanhVienVaoForm = () => {
    setThanhVienChon((prev) => [
      ...prev,
      {
        MaND: 0,
        VaiTro: prev.length === 0 ? 'DaiDien' : 'ThanhVien',
        TamTru: 'ChuaDangKy',
        NgayVao: ngayBD,
        NgayDi: '',
      },
    ]);
    setLoiForm((prev) => ({ ...prev, thanhVien: undefined }));
  };

  const capNhatThanhVienForm = (index: number, field: keyof ThanhVienForm, value: any) => {
    setThanhVienChon((prev) => {
      const copy = [...prev];
      if (field === 'VaiTro' && value === 'DaiDien' && kieuHopDong === 'DaiDienChung') {
        copy.forEach((item, idx) => {
          item.VaiTro = idx === index ? 'DaiDien' : 'ThanhVien';
        });
      } else {
        copy[index] = { ...copy[index], [field]: value };
      }
      return copy;
    });
  };

  const xoaThanhVienKhoiForm = (index: number) => {
    setThanhVienChon((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Kiểm tra lỗi UX/UI trước khi gửi
  const kiemTraHopLe = (): boolean => {
    const loiMoi: typeof loiForm = {};
    const soTienCoc = chuyenChuoiThanhSo(tienCocHienThi);
    const dsHopLe = thanhVienChon.filter((tv) => Number(tv.MaND) > 0);

    if (!maPhong) {
      loiMoi.chung = 'Vui lòng chọn phòng trọ!';
    }
    if (dsHopLe.length === 0) {
      loiMoi.thanhVien = 'Vui lòng thêm và chọn ít nhất 01 khách thuê lưu trú trong phòng!';
    }
    if (tienCocHienThi.trim() === '' || soTienCoc < 0) {
      loiMoi.tienCoc = 'Vui lòng nhập số tiền đặt cọc hợp lệ!';
    }
    if (!ngayKT) {
      loiMoi.ngayKT = 'Vui lòng chọn ngày kết thúc hợp đồng!';
    } else if (ngayKT < ngayBD) {
      loiMoi.ngayKT = 'Ngày kết thúc thuê không được nhỏ hơn Ngày bắt đầu thuê!';
    } else if (maHDTSua && trangThaiHD !== trangThaiGoc && (ngayKT === ngayKTGoc || !daDoiNgayKT)) {
      loiMoi.ngayKT =
        'Khi sửa trạng thái hợp đồng, bạn bắt buộc phải điều chỉnh lại Ngày kết thúc thuê cho khớp thực tế!';
    } else if (trangThaiHD === 'ConHieuLuc' && ngayKT < today) {
      loiMoi.ngayKT =
        'Hợp đồng ở trạng thái "Còn hiệu lực" phải có ngày kết thúc lớn hơn hoặc bằng ngày hôm nay!';
    }

    setLoiForm(loiMoi);
    return Object.keys(loiMoi).length === 0;
  };

  const xuLyLuuHopDong = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kiemTraHopLe()) return;

    const dsHopLe = thanhVienChon.filter((tv) => Number(tv.MaND) > 0);
    const payload = {
      MaPhong: Number(maPhong),
      MaHDTCu: maHDTCu ? Number(maHDTCu) : null,
      NgayKy: ngayKy,
      NgayBD: ngayBD,
      NgayKT: ngayKT,
      TienCoc: chuyenChuoiThanhSo(tienCocHienThi),
      TrangThai: trangThaiHD,
      KieuHopDong: kieuHopDong,
      DanhSachThanhVien: dsHopLe,
      DanhSachMaPDV: maPDVChon,
      ChiSoDienBanGiao: maHDTSua ? null : Number(chiSoDienBanGiao),
      ChiSoNuocBanGiao: maHDTSua ? null : Number(chiSoNuocBanGiao),
    };

    setDangLuu(true);
    try {
      if (maHDTSua) {
        const res = await hopDongService.suaHopDong(maHDTSua, payload);
        alert(res.thongBao);
      } else {
        const res = await hopDongService.taoHopDong(payload);
        alert(res.thongBao);
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      setLoiForm((prev) => ({
        ...prev,
        chung: error.message || 'Có lỗi xảy ra khi lưu hợp đồng',
      }));
    } finally {
      setDangLuu(false);
    }
  };

  const phongDangChon = danhSachPhong.find((p) => p.MaPhong === Number(maPhong));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-emerald-200 bg-white shadow-2xl">
        {/* Header Modal đồng bộ màu Xóm Trọ */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-emerald-200 bg-[#ECFDF5] px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#059669] text-sm font-bold text-white">
              {maHDTSua ? '✎' : '+'}
            </span>
            <div>
              <h3 className="text-lg font-bold text-[#0F172A]">
                {maHDTSua ? `Chỉnh Sửa Hợp Đồng #${maHDTSua}` : 'Tạo Hợp Đồng Thuê Phòng Mới'}
              </h3>
              <p className="text-xs text-slate-600">
                Điền đầy đủ thông tin phòng, tiền cọc, thời hạn và danh sách người lưu trú
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-emerald-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-emerald-100"
          >
            ✕ Đóng
          </button>
        </div>

        <form onSubmit={xuLyLuuHopDong} className="space-y-6 p-6 text-sm text-[#0F172A]">
          {loiForm.chung && (
            <div className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs font-medium text-rose-700">
              ⚠️ {loiForm.chung}
            </div>
          )}

          {/* Hình thức lập hợp đồng (chỉ hiển thị khi tạo mới) */}
          {!maHDTSua && (
            <div className="rounded-xl border border-emerald-200 bg-[#ECFDF5]/70 p-4">
              <label className="mb-2.5 block font-bold text-[#0F172A]">
                Hình thức lập hợp đồng cho người thuê trong phòng:
              </label>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <label
                  className={`flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 transition ${
                    kieuHopDong === 'DaiDienChung'
                      ? 'border-[#059669] bg-white ring-2 ring-[#00E599]/40'
                      : 'border-slate-200 bg-white/80'
                  }`}
                >
                  <input
                    type="radio"
                    name="kieuHopDong"
                    checked={kieuHopDong === 'DaiDienChung'}
                    onChange={() => setKieuHopDong('DaiDienChung')}
                    className="mt-1 accent-[#059669]"
                  />
                  <div>
                    <div className="font-semibold text-[#0F172A]">
                      Hộ gia đình / Nhóm có 1 Người đại diện
                    </div>
                    <div className="text-xs text-slate-600">
                      Tạo 01 hợp đồng chung, 1 người đứng tên Đại diện (Bên B) và liệt kê các thành viên ở cùng.
                    </div>
                  </div>
                </label>

                <label
                  className={`flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 transition ${
                    kieuHopDong === 'TachHopDongRieng'
                      ? 'border-[#059669] bg-white ring-2 ring-[#00E599]/40'
                      : 'border-slate-200 bg-white/80'
                  }`}
                >
                  <input
                    type="radio"
                    name="kieuHopDong"
                    checked={kieuHopDong === 'TachHopDongRieng'}
                    onChange={() => setKieuHopDong('TachHopDongRieng')}
                    className="mt-1 accent-[#059669]"
                  />
                  <div>
                    <div className="font-semibold text-[#0F172A]">
                      Ở ghép tách bản hợp đồng riêng (2 người = 2 bản HĐ)
                    </div>
                    <div className="text-xs text-slate-600">
                      Mỗi người ở cùng 1 phòng sẽ được tạo 1 bản hợp đồng độc lập đứng tên chính mình.
                    </div>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Thông tin Phòng, Tiền cọc & Thời hạn */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block font-semibold text-slate-800">Chọn phòng trọ *</label>
              <select
                required
                value={maPhong}
                onChange={(e) => xuLyChonPhong(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 focus:border-[#059669] focus:outline-none"
              >
                <option value="">-- Chọn phòng --</option>
                {danhSachPhong.map((p) => (
                  <option key={p.MaPhong} value={p.MaPhong}>
                    {p.TenPhong} - {p.TenKhu} ({dinhDangTienVN(p.Gia)}đ - {p.TrangThai})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block font-semibold text-slate-800">
                Hợp đồng kỳ trước (Nếu có)
              </label>
              <select
                value={maHDTCu}
                onChange={(e) => setMaHDTCu(e.target.value ? Number(e.target.value) : '')}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 focus:border-[#059669] focus:outline-none"
              >
                <option value="">-- Không có --</option>
                {danhSachHopDongCu.map((hdc) => (
                  <option key={hdc.MaHDT} value={hdc.MaHDT}>
                    HĐ #{hdc.MaHDT} - {hdc.TenPhong}
                  </option>
                ))}
              </select>
            </div>

            {/* Ô nhập Tiền đặt cọc có dấu chấm từ hàng đơn vị đến hàng triệu */}
            <div>
              <label className="mb-1 block font-semibold text-slate-800">
                Tiền đặt cọc (VNĐ) *
              </label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  placeholder="Ví dụ: 500 hoặc 2.500.000"
                  value={tienCocHienThi}
                  onChange={xuLyNhapTienCoc}
                  className={`w-full rounded-xl border px-3 py-2.5 pr-14 font-bold text-[#059669] focus:outline-none ${
                    loiForm.tienCoc
                      ? 'border-rose-500 bg-rose-50/40'
                      : 'border-slate-300 focus:border-[#059669]'
                  }`}
                />
                <span className=" pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-bold text-[#059669]">
                  VNĐ
                </span>
              </div>

              {/* Thanh công cụ chỉnh nhanh tiền cọc */}
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">

                <button
                  type="button"
                  onClick={() =>
                    setTienCocHienThi(
                      dinhDangSoCoDauCham(chuyenChuoiThanhSo(tienCocHienThi) + 100000)
                    )
                  }
                  className="rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-slate-700 hover:bg-slate-200"
                >
                  +100.000
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setTienCocHienThi(
                      dinhDangSoCoDauCham(chuyenChuoiThanhSo(tienCocHienThi) + 500000)
                    )
                  }
                  className="rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-slate-700 hover:bg-slate-200"
                >
                  +500.000
                </button>

              </div>
              {loiForm.tienCoc && (
                <p className="mt-1 text-xs font-medium text-rose-600">{loiForm.tienCoc}</p>
              )}
            </div>

            <div>
              <label className="mb-1 block font-semibold text-slate-800">Ngày ký hợp đồng *</label>
              <input
                type="date"
                required
                value={ngayKy}
                onChange={(e) => setNgayKy(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 focus:border-[#059669] focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block font-semibold text-slate-800">Ngày bắt đầu thuê *</label>
              <input
                type="date"
                required
                value={ngayBD}
                onChange={(e) => setNgayBD(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 focus:border-[#059669] focus:outline-none"
              />
            </div>

            {/* Ngày kết thúc thuê có bắt lỗi UX/UI khi sửa trạng thái */}
            <div>
              <label className="mb-1 flex items-center justify-between font-semibold text-slate-800">
                <span>Ngày kết thúc thuê *</span>
                {canCapNhatNgayKTKhiDoiTrangThai && (
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-bold text-amber-800">
                    Cần cập nhật lại!
                  </span>
                )}
              </label>
              <input
                type="date"
                required
                value={ngayKT}
                onChange={(e) => xuLyDoiNgayKT(e.target.value)}
                className={`w-full rounded-xl border px-3 py-2.5 focus:outline-none ${
                  loiForm.ngayKT || canCapNhatNgayKTKhiDoiTrangThai
                    ? 'border-amber-500 bg-amber-50/60 ring-2 ring-amber-300'
                    : 'border-slate-300 focus:border-[#059669]'
                }`}
              />

              {/* Gợi ý nút chọn nhanh ngày kết thúc khi sửa trạng thái */}
              {maHDTSua && (
                <div className="mt-1.5 flex flex-wrap gap-1.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => chonNhanhNgayKT('homNay')}
                    className="rounded-md border border-amber-300 bg-amber-50 px-2 py-0.5 font-medium text-amber-800 hover:bg-amber-100"
                  >
                    Hôm nay ({today.split('-').reverse().join('/')})
                  </button>
                  <button
                    type="button"
                    onClick={() => chonNhanhNgayKT('6thang')}
                    className="rounded-md border border-emerald-300 bg-emerald-50 px-2 py-0.5 font-medium text-[#059669] hover:bg-emerald-100"
                  >
                    +6 tháng
                  </button>
                  <button
                    type="button"
                    onClick={() => chonNhanhNgayKT('1nam')}
                    className="rounded-md border border-emerald-300 bg-emerald-50 px-2 py-0.5 font-medium text-[#059669] hover:bg-emerald-100"
                  >
                    +1 năm
                  </button>
                </div>
              )}

              {loiForm.ngayKT && (
                <p className="mt-1 text-xs font-medium text-rose-600">{loiForm.ngayKT}</p>
              )}
            </div>
          </div>

          {/* Chỉ số điện nước bàn giao & Trạng thái hợp đồng */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {!maHDTSua && (
              <>
                <div>
                  <label className="mb-1 block font-semibold text-slate-800">
                    Chỉ số điện bàn giao (kWh)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={chiSoDienBanGiao}
                    onChange={(e) => setChiSoDienBanGiao(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 focus:border-[#059669] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-semibold text-slate-800">
                    Chỉ số nước bàn giao (m³)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={chiSoNuocBanGiao}
                    onChange={(e) => setChiSoNuocBanGiao(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 focus:border-[#059669] focus:outline-none"
                  />
                </div>
              </>
            )}

            <div>
              <label className="mb-1 block font-semibold text-slate-800">
                Trạng thái hợp đồng
              </label>
              <select
                value={trangThaiHD}
                onChange={(e) => xuLyDoiTrangThai(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 font-semibold focus:border-[#059669] focus:outline-none"
              >
                <option value="ConHieuLuc">Còn hiệu lực</option>
                <option value="HetHan">Hết hạn</option>
                <option value="DaHuy">Đã hủy</option>
              </select>
              {maHDTSua && trangThaiHD !== trangThaiGoc && (
                <p className="mt-1 text-xs text-amber-700">
                  * Đã đổi từ <strong>{trangThaiGoc}</strong> sang <strong>{trangThaiHD}</strong>. Hãy kiểm tra lại Ngày kết thúc thuê.
                </p>
              )}
            </div>
          </div>

          {/* Danh sách Khách thuê lưu trú */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="font-bold text-[#0F172A]">
                Danh sách người thuê lưu trú trong phòng *
              </label>
              <button
                type="button"
                onClick={themThanhVienVaoForm}
                className="rounded-full bg-[#00E599] px-4 py-1.5 text-xs font-bold text-[#0F172A] shadow-xs hover:bg-[#00cc88]"
              >
                + Thêm người thuê
              </button>
            </div>

            {loiForm.thanhVien && (
              <p className="mb-2 text-xs font-medium text-rose-600">{loiForm.thanhVien}</p>
            )}

            <div className="space-y-2">
              {thanhVienChon.map((tv, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-1 items-center gap-2 rounded-xl border border-emerald-200 bg-[#ECFDF5]/40 p-3 md:grid-cols-12"
                >
                  <div className="md:col-span-4">
                    <select
                      required
                      value={tv.MaND}
                      onChange={(e) =>
                        capNhatThanhVienForm(idx, 'MaND', Number(e.target.value))
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5"
                    >
                      <option value={0}>-- Chọn khách thuê --</option>
                      {danhSachKhachThue.map((kt) => (
                        <option key={kt.MaND} value={kt.MaND}>
                          {kt.HoTen} - SĐT: {kt.SDT} - CCCD: {kt.CCCD || '---'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-3">
                    <select
                      value={kieuHopDong === 'TachHopDongRieng' ? 'DaiDien' : tv.VaiTro}
                      disabled={kieuHopDong === 'TachHopDongRieng'}
                      onChange={(e) => capNhatThanhVienForm(idx, 'VaiTro', e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5"
                    >
                      <option value="DaiDien">Người đại diện</option>
                      <option value="ThanhVien">Thành viên ở cùng</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <select
                      value={tv.TamTru}
                      onChange={(e) => capNhatThanhVienForm(idx, 'TamTru', e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5"
                    >
                      <option value="ChuaDangKy">Chưa ĐK tạm trú</option>
                      <option value="DaDangKy">Đã ĐK tạm trú</option>
                      <option value="DangCho">Đang chờ</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <input
                      type="date"
                      value={tv.NgayVao}
                      onChange={(e) => capNhatThanhVienForm(idx, 'NgayVao', e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5"
                    />
                  </div>

                  <div className="text-right md:col-span-1">
                    <button
                      type="button"
                      onClick={() => xoaThanhVienKhoiForm(idx)}
                      className="rounded-lg bg-rose-100 px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-200"
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Phí dịch vụ hàng tháng */}
          <div>
            <label className="mb-2 block font-bold text-[#0F172A]">
              Phí dịch vụ đăng ký sử dụng hàng tháng:
            </label>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3">
              {danhSachPhiDichVu.map((pdv) => {
                const checked = maPDVChon.includes(pdv.MaPDV);
                return (
                  <label
                    key={pdv.MaPDV}
                    className={`flex cursor-pointer items-center gap-2.5 rounded-xl border p-3 transition ${
                      checked
                        ? 'border-[#059669] bg-[#ECFDF5]/60'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setMaPDVChon([...maPDVChon, pdv.MaPDV]);
                        } else {
                          setMaPDVChon(maPDVChon.filter((id) => id !== pdv.MaPDV));
                        }
                      }}
                      className="accent-[#059669]"
                    />
                    <div>
                      <div className="font-semibold text-[#0F172A]">{pdv.TenPDV}</div>
                      <div className="text-xs font-bold text-[#059669]">
                        {dinhDangTienVN(pdv.Gia)} đ
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Nút hành động */}
          <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-slate-300 px-5 py-2.5 font-semibold text-slate-700 hover:bg-slate-100"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={dangLuu}
              className="rounded-full bg-[#00E599] px-6 py-2.5 font-bold text-[#0F172A] shadow-sm transition hover:bg-[#00cc88] disabled:opacity-50"
            >
              {dangLuu
                ? 'Đang xử lý...'
                : maHDTSua
                ? 'Lưu cập nhật hợp đồng'
                : 'Hoàn tất tạo hợp đồng'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}