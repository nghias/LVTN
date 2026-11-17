// client/src/components/hopDong/HopDongForm.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FormField, FormActions } from "@/components/common/FormPrimitives";
import { FormError, inputErrorClass } from "@/utils/formValidation";
import { PhiDichVuItem } from "@/types/hopDong.type";
import { dinhDangTienVN } from "@/utils/soThanhChu.util";

export interface ThanhVienForm {
  MaND: number;
  VaiTro: "DaiDien" | "ThanhVien";
  TamTru: "ChuaDangKy" | "DaDangKy" | "DangCho";
  NgayVao: string;
  NgayDi: string;
}

interface LoiFormState {
  maPhong?: string;
  ngayKy?: string;
  ngayBD?: string;
  ngayKT?: string;
  tienCoc?: string;
  thanhVien?: string;
  chung?: string;
}

// Lấy chuỗi YYYY-MM-DD chuẩn theo múi giờ Việt Nam
const dinhDangNgayLocal = (date: Date = new Date()): string => {
  const nam = date.getFullYear();
  const thang = String(date.getMonth() + 1).padStart(2, "0");
  const ngay = String(date.getDate()).padStart(2, "0");
  return `${nam}-${thang}-${ngay}`;
};

// Cộng thêm số tháng chính xác từ một chuỗi ngày YYYY-MM-DD
const congThemThang = (chuoiNgay: string, soThang: number): string => {
  if (!chuoiNgay) return "";
  const [nam, thang, ngay] = chuoiNgay.split("-").map(Number);
  if (!nam || !thang || !ngay) return "";

  const thangDich = new Date(nam, thang - 1 + soThang, 1);
  const soNgayToiDa = new Date(
    thangDich.getFullYear(),
    thangDich.getMonth() + 1,
    0
  ).getDate();
  thangDich.setDate(Math.min(ngay, soNgayToiDa));

  return dinhDangNgayLocal(thangDich);
};

const hienThiNgayVN = (chuoiNgay: string): string => {
  if (!chuoiNgay) return "";
  return chuoiNgay.split("-").reverse().join("/");
};

const dinhDangSoCoDauCham = (giaTri: string | number): string => {
  const chuoiSo = String(giaTri).replace(/\D/g, "");
  if (!chuoiSo) return "";
  const soSach = chuoiSo.replace(/^0+(?=\d)/, "");
  return soSach.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

const chuyenChuoiThanhSo = (chuoiHienThi: string): number => {
  const chuoiSo = chuoiHienThi.replace(/\D/g, "");
  return chuoiSo ? Number(chuoiSo) : 0;
};

interface HopDongFormProps {
  mode: "create" | "edit";
  initialData?: {
    maPhong?: number | "";
    maHDTCu?: number | "";
    ngayKy?: string;
    ngayBD?: string;
    ngayKT?: string;
    tienCoc?: number;
    trangThai?: string;
    thanhVienList?: ThanhVienForm[];
    maPDVList?: number[];
  };
  danhSachPhong: any[];
  danhSachKhachThue: any[];
  danhSachPhiDichVu: PhiDichVuItem[];
  danhSachHopDongCu: any[];
  trangThaiGoc?: string;
  ngayKyGoc?: string;
  ngayBDGoc?: string;
  ngayKTGoc?: string;
  submitting: boolean;
  submitLabel: string;
  cancelHref: string;
  onSubmit: (payload: any) => Promise<void>;
}

export default function HopDongForm({
  mode,
  initialData,
  danhSachPhong,
  danhSachKhachThue,
  danhSachPhiDichVu,
  danhSachHopDongCu,
  trangThaiGoc = "ConHieuLuc",
  ngayKyGoc = "",
  ngayBDGoc = "",
  ngayKTGoc = "",
  submitting,
  submitLabel,
  cancelHref,
  onSubmit,
}: HopDongFormProps) {
  const today = dinhDangNgayLocal();

  const [maPhong, setMaPhong] = useState<number | "">(initialData?.maPhong ?? "");
  const [maHDTCu, setMaHDTCu] = useState<number | "">(initialData?.maHDTCu ?? "");
  const [ngayKy, setNgayKy] = useState<string>(initialData?.ngayKy || today);
  const [ngayBD, setNgayBD] = useState<string>(initialData?.ngayBD || today);
  const [ngayKT, setNgayKT] = useState<string>(initialData?.ngayKT || "");
  const [tienCocHienThi, setTienCocHienThi] = useState<string>(
    dinhDangSoCoDauCham(initialData?.tienCoc || 0)
  );
  const [trangThaiHD, setTrangThaiHD] = useState<string>(
    initialData?.trangThai || "ConHieuLuc"
  );
  const [thanhVienChon, setThanhVienChon] = useState<ThanhVienForm[]>(
    initialData?.thanhVienList || []
  );
  const [maPDVChon, setMaPDVChon] = useState<number[]>(
    initialData?.maPDVList || []
  );

  const [daDoiNgayKT, setDaDoiNgayKT] = useState<boolean>(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState<boolean>(false);
  const [loiForm, setLoiForm] = useState<LoiFormState>({});

  const ngayKTToiThieu = congThemThang(ngayBD, 1);

  useEffect(() => {
    if (!initialData) return;
    if (initialData.maPhong !== undefined) setMaPhong(initialData.maPhong);
    if (initialData.maHDTCu !== undefined) setMaHDTCu(initialData.maHDTCu);
    if (initialData.ngayKy) setNgayKy(initialData.ngayKy);
    if (initialData.ngayBD) setNgayBD(initialData.ngayBD);
    if (initialData.ngayKT) setNgayKT(initialData.ngayKT);
    if (initialData.tienCoc !== undefined) {
      setTienCocHienThi(dinhDangSoCoDauCham(initialData.tienCoc));
    }
    if (initialData.trangThai) setTrangThaiHD(initialData.trangThai);
    if (initialData.thanhVienList) setThanhVienChon(initialData.thanhVienList);
    if (initialData.maPDVList) setMaPDVChon(initialData.maPDVList);
  }, [initialData]);

  const canCapNhatNgayKTKhiDoiTrangThai =
    trangThaiHD !== trangThaiGoc && (ngayKT === ngayKTGoc || !daDoiNgayKT);

  const xuLyChonPhong = (idPhong: number) => {
    setMaPhong(idPhong || "");
    setLoiForm((prev) => ({
      ...prev,
      maPhong: idPhong ? undefined : "Vui lòng chọn phòng trọ!",
      chung: undefined,
    }));
  };

  const xuLyNhapTienCoc = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = dinhDangSoCoDauCham(e.target.value);
    setTienCocHienThi(formatted);
    setLoiForm((prev) => ({
      ...prev,
      tienCoc:
        formatted.trim() === ""
          ? "Vui lòng nhập số tiền đặt cọc hợp lệ!"
          : undefined,
      chung: undefined,
    }));
  };

  const xuLyDoiNgayKy = (ngayMoi: string) => {
    setNgayKy(ngayMoi);
    let loiNgayKy: string | undefined = undefined;

    if (!ngayMoi) {
      loiNgayKy = "Vui lòng chọn ngày ký (tạo hợp đồng)!";
    } else if (mode === "edit" && ngayMoi !== ngayKyGoc && ngayMoi < today) {
      loiNgayKy = `Ngày tạo hợp đồng không được nhỏ hơn ngày hiện tại (${hienThiNgayVN(
        today
      )})!`;
    } else if (mode === "create" && ngayMoi < today) {
      loiNgayKy = `Ngày tạo hợp đồng không được nhỏ hơn ngày hiện tại (${hienThiNgayVN(
        today
      )})!`;
    } else if (ngayBD && ngayMoi > ngayBD) {
      loiNgayKy = "Ngày ký hợp đồng không được lớn hơn Ngày bắt đầu thuê!";
    }

    setLoiForm((prev) => ({ ...prev, ngayKy: loiNgayKy, chung: undefined }));
  };

  const xuLyDoiNgayBD = (ngayMoi: string) => {
    const ngayBDCu = ngayBD;
    setNgayBD(ngayMoi);

    setThanhVienChon((prev) =>
      prev.map((tv) =>
        tv.NgayVao === ngayBDCu || !tv.NgayVao
          ? { ...tv, NgayVao: ngayMoi }
          : tv
      )
    );

    let loiNgayBD: string | undefined = undefined;
    let loiNgayKy = loiForm.ngayKy;
    let loiNgayKT = loiForm.ngayKT;

    if (!ngayMoi) {
      loiNgayBD = "Vui lòng chọn ngày bắt đầu thuê!";
    } else if (mode === "edit" && ngayMoi !== ngayBDGoc && ngayMoi < today) {
      loiNgayBD = `Ngày bắt đầu thuê không được nhỏ hơn ngày hiện tại (${hienThiNgayVN(
        today
      )})!`;
    } else if (mode === "create" && ngayMoi < today) {
      loiNgayBD = `Ngày bắt đầu thuê không được nhỏ hơn ngày hiện tại (${hienThiNgayVN(
        today
      )})!`;
    }

    if (ngayKy && ngayMoi && ngayKy > ngayMoi) {
      loiNgayKy = "Ngày ký hợp đồng không được lớn hơn Ngày bắt đầu thuê!";
    } else if (ngayKy === ngayKyGoc || ngayKy >= today) {
      loiNgayKy = undefined;
    }

    const mocToiThieu = congThemThang(ngayMoi, 1);
    if (ngayKT && mocToiThieu && ngayKT < mocToiThieu) {
      loiNgayKT = `Ngày kết thúc thuê phải ít nhất 01 tháng kể từ ngày bắt đầu (tối thiểu từ ${hienThiNgayVN(
        mocToiThieu
      )})!`;
    } else if (ngayKT && mocToiThieu && ngayKT >= mocToiThieu) {
      loiNgayKT = undefined;
    }

    setLoiForm((prev) => ({
      ...prev,
      ngayBD: loiNgayBD,
      ngayKy: loiNgayKy,
      ngayKT: loiNgayKT,
      chung: undefined,
    }));
  };

  const xuLyDoiNgayKT = (ngayMoi: string) => {
    setNgayKT(ngayMoi);
    setDaDoiNgayKT(true);

    let loiNgayKT: string | undefined = undefined;
    if (!ngayMoi) {
      loiNgayKT = "Vui lòng chọn ngày kết thúc hợp đồng!";
    } else if (ngayBD && ngayMoi < ngayBD) {
      loiNgayKT = "Ngày kết thúc thuê không được nhỏ hơn Ngày bắt đầu thuê!";
    } else if (ngayKTToiThieu && ngayMoi < ngayKTToiThieu) {
      loiNgayKT = `Ngày kết thúc thuê phải ít nhất 01 tháng kể từ ngày bắt đầu (tối thiểu từ ${hienThiNgayVN(
        ngayKTToiThieu
      )})!`;
    }

    setLoiForm((prev) => ({ ...prev, ngayKT: loiNgayKT, chung: undefined }));
  };

  const xuLyDoiTrangThai = (trangThaiMoi: string) => {
    setTrangThaiHD(trangThaiMoi);
    if (trangThaiMoi !== trangThaiGoc && ngayKT === ngayKTGoc) {
      setLoiForm((prev) => ({
        ...prev,
        ngayKT:
          "Bạn đã thay đổi trạng thái hợp đồng. Vui lòng cập nhật lại Ngày kết thúc thuê tương ứng!",
      }));
    } else {
      setLoiForm((prev) => ({ ...prev, ngayKT: undefined }));
    }
  };

  const chonNhanhNgayKT = (loai: "1thang" | "6thang" | "1nam" | "2nam") => {
    const goc = ngayBD || today;
    let chuoiNgay = "";
    if (loai === "6thang") chuoiNgay = congThemThang(goc, 6);
    if (loai === "1nam") chuoiNgay = congThemThang(goc, 12);
    if (loai === "2nam") chuoiNgay = congThemThang(goc, 24);
    xuLyDoiNgayKT(chuoiNgay);
  };

  const themThanhVienVaoForm = () => {
    setThanhVienChon((prev) => {
      const coDaiDien = prev.some((tv) => tv.VaiTro === "DaiDien");
      return [
        ...prev,
        {
          MaND: 0,
          VaiTro: !coDaiDien ? "DaiDien" : "ThanhVien",
          TamTru: "ChuaDangKy",
          NgayVao: ngayBD || today,
          NgayDi: "",
        },
      ];
    });
    setLoiForm((prev) => ({ ...prev, thanhVien: undefined }));
  };

  const capNhatThanhVienForm = (
    index: number,
    field: keyof ThanhVienForm,
    value: any
  ) => {
    setThanhVienChon((prev) => {
      const copy = [...prev];
      if (field === "VaiTro" && value === "DaiDien") {
        copy.forEach((item, idx) => {
          copy[idx] = {
            ...item,
            VaiTro: idx === index ? "DaiDien" : "ThanhVien",
          };
        });
      } else {
        copy[index] = { ...copy[index], [field]: value };
      }
      return copy;
    });
    setLoiForm((prev) => ({ ...prev, thanhVien: undefined }));
  };

  const xoaThanhVienKhoiForm = (index: number) => {
    setThanhVienChon((prev) => {
      const conLai = prev.filter((_, idx) => idx !== index);
      if (conLai.length > 0 && !conLai.some((tv) => tv.VaiTro === "DaiDien")) {
        conLai[0] = { ...conLai[0], VaiTro: "DaiDien" };
      }
      return conLai;
    });
    setLoiForm((prev) => ({ ...prev, thanhVien: undefined }));
  };

  const phongDangChon = danhSachPhong.find(
    (p) => p.MaPhong === Number(maPhong)
  );

  const kiemTraHopLe = (): boolean => {
    const loiMoi: LoiFormState = {};
    const soTienCoc = chuyenChuoiThanhSo(tienCocHienThi);

    if (!maPhong) {
      loiMoi.maPhong = "Vui lòng chọn phòng trọ!";
    }

    if (tienCocHienThi.trim() === "" || soTienCoc < 0) {
      loiMoi.tienCoc = "Vui lòng nhập số tiền đặt cọc hợp lệ!";
    }

    if (!ngayKy) {
      loiMoi.ngayKy = "Vui lòng chọn ngày ký hợp đồng!";
    } else if (mode === "edit" && ngayKy !== ngayKyGoc && ngayKy < today) {
      loiMoi.ngayKy = `Ngày tạo hợp đồng không được nhỏ hơn ngày hiện tại (${hienThiNgayVN(
        today
      )})!`;
    } else if (mode === "create" && ngayKy < today) {
      loiMoi.ngayKy = `Ngày tạo hợp đồng không được nhỏ hơn ngày hiện tại (${hienThiNgayVN(
        today
      )})!`;
    } else if (ngayBD && ngayKy > ngayBD) {
      loiMoi.ngayKy = "Ngày ký hợp đồng không được sau Ngày bắt đầu thuê!";
    }

    if (!ngayBD) {
      loiMoi.ngayBD = "Vui lòng chọn ngày bắt đầu thuê!";
    } else if (mode === "edit" && ngayBD !== ngayBDGoc && ngayBD < today) {
      loiMoi.ngayBD = `Ngày bắt đầu thuê không được nhỏ hơn ngày hiện tại (${hienThiNgayVN(
        today
      )})!`;
    } else if (mode === "create" && ngayBD < today) {
      loiMoi.ngayBD = `Ngày bắt đầu thuê không được nhỏ hơn ngày hiện tại (${hienThiNgayVN(
        today
      )})!`;
    }

    const mocToiThieu1Thang = congThemThang(ngayBD, 1);
    if (!ngayKT) {
      loiMoi.ngayKT = "Vui lòng chọn ngày kết thúc hợp đồng!";
    } else if (ngayBD && ngayKT < ngayBD) {
      loiMoi.ngayKT =
        "Ngày kết thúc thuê không được nhỏ hơn Ngày bắt đầu thuê!";
    } else if (mocToiThieu1Thang && ngayKT < mocToiThieu1Thang) {
      loiMoi.ngayKT = `Ngày kết thúc thuê phải ít nhất là 01 tháng từ ngày bắt đầu thuê (tối thiểu từ ${hienThiNgayVN(
        mocToiThieu1Thang
      )})!`;
    } else if (
      trangThaiHD !== trangThaiGoc &&
      (ngayKT === ngayKTGoc || !daDoiNgayKT)
    ) {
      loiMoi.ngayKT =
        "Khi sửa trạng thái hợp đồng, bạn bắt buộc phải điều chỉnh lại Ngày kết thúc thuê cho khớp thực tế!";
    } else if (trangThaiHD === "ConHieuLuc" && ngayKT < today) {
      loiMoi.ngayKT =
        'Hợp đồng ở trạng thái "Còn hiệu lực" phải có ngày kết thúc lớn hơn hoặc bằng ngày hôm nay!';
    }

    const coDongChuaChon = thanhVienChon.some((tv) => Number(tv.MaND) <= 0);
    const dsHopLe = thanhVienChon.filter((tv) => Number(tv.MaND) > 0);
    const maNDs = dsHopLe.map((tv) => Number(tv.MaND));

    if (thanhVienChon.length === 0 || dsHopLe.length === 0) {
      loiMoi.thanhVien =
        "Vui lòng thêm và chọn ít nhất 01 khách thuê lưu trú trong phòng!";
    } else if (coDongChuaChon) {
      loiMoi.thanhVien =
        "Có dòng thành viên chưa chọn khách thuê. Vui lòng chọn khách hoặc xóa dòng trống!";
    } else if (new Set(maNDs).size !== maNDs.length) {
      loiMoi.thanhVien =
        "Không được chọn trùng một khách thuê nhiều lần trong cùng hợp đồng!";
    } else if (!dsHopLe.some((tv) => tv.VaiTro === "DaiDien")) {
      loiMoi.thanhVien =
        "Hợp đồng bắt buộc phải có 01 khách thuê giữ vai trò Người đại diện!";
    } else if (
      phongDangChon?.SoNguoiToiDa &&
      dsHopLe.length > Number(phongDangChon.SoNguoiToiDa)
    ) {
      loiMoi.thanhVien = `Phòng ${phongDangChon.TenPhong} chỉ cho phép tối đa ${phongDangChon.SoNguoiToiDa} người lưu trú!`;
    } else {
      const tvSaiNgayVao = dsHopLe.find(
        (tv) => !tv.NgayVao || tv.NgayVao < ngayBD || tv.NgayVao > ngayKT
      );
      if (tvSaiNgayVao) {
        loiMoi.thanhVien =
          "Ngày vào ở của thành viên phải nằm trong khoảng từ Ngày bắt đầu đến Ngày kết thúc hợp đồng!";
      }
    }

    setLoiForm(loiMoi);
    return Object.keys(loiMoi).length === 0;
  };

  const xuLySubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setAttemptedSubmit(true);
    if (!kiemTraHopLe()) return;

    const dsHopLe = thanhVienChon
      .filter((tv) => Number(tv.MaND) > 0)
      .map((tv) => ({
        ...tv,
        VaiTro: tv.VaiTro,
      }));

    const payload = {
      MaPhong: Number(maPhong),
      MaHDTCu: maHDTCu ? Number(maHDTCu) : null,
      NgayKy: ngayKy,
      NgayBD: ngayBD,
      NgayKT: ngayKT,
      TienCoc: chuyenChuoiThanhSo(tienCocHienThi),
      TrangThai: trangThaiHD,
      KieuHopDong: "DaiDienChung",
      DanhSachThanhVien: dsHopLe,
      DanhSachMaPDV: maPDVChon,
    };

    await onSubmit(payload);
  };

  return (
    <form
      onSubmit={xuLySubmitForm}
      noValidate
      className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-8 shadow-xs space-y-6"
    >
      {loiForm.chung && (
        <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200">
          <FormError message={loiForm.chung} />
        </div>
      )}

      {/* PHẦN 1: THÔNG TIN PHÒNG, TIỀN CỌC & THỜI HẠN */}
      <div className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-2.5">
          1. Thông tin phòng & Thời hạn hợp đồng
        </h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Chọn phòng trọ */}
          <div>
            <FormField label="Chọn phòng trọ" required error={loiForm.maPhong}>
              <select
                value={maPhong}
                onChange={(e) => xuLyChonPhong(Number(e.target.value))}
                className={`w-full px-3.5 py-2.5 border rounded-xl text-sm font-semibold text-slate-900 focus:outline-none transition ${inputErrorClass(
                  loiForm.maPhong
                )}`}
              >
                <option value="">-- Chọn phòng --</option>
                {danhSachPhong.map((p) => (
                  <option key={p.MaPhong} value={p.MaPhong}>
                    {p.TenPhong} {p.TenKhu ? `- ${p.TenKhu}` : ""} (
                    {dinhDangTienVN(p.Gia)}đ - {p.TrangThai})
                  </option>
                ))}
              </select>
            </FormField>

            {phongDangChon && (
              <small className="mt-1.5 block text-[11px] font-semibold text-teal-700">
                Giá thuê: <strong>{dinhDangTienVN(phongDangChon.Gia)}đ/tháng</strong>
                {phongDangChon.SoNguoiToiDa
                  ? ` • Tối đa ${phongDangChon.SoNguoiToiDa} người`
                  : ""}
              </small>
            )}
          </div>

          {/* Hợp đồng kỳ trước */}
          <FormField label="Hợp đồng kỳ trước (Nếu có)">
            <select
              value={maHDTCu}
              onChange={(e) =>
                setMaHDTCu(e.target.value ? Number(e.target.value) : "")
              }
              className="w-full px-3.5 py-2.5 border border-slate-300 bg-white rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
            >
              <option value="">-- Không có --</option>
              {danhSachHopDongCu.map((hdc) => (
                <option key={hdc.MaHDT} value={hdc.MaHDT}>
                  HĐ #{hdc.MaHDT} - {hdc.TenPhong}
                </option>
              ))}
            </select>
          </FormField>

          {/* Tiền đặt cọc */}
          <div>
            <FormField
              label="Tiền đặt cọc (VNĐ)"
              required
              error={loiForm.tienCoc}
            >
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="VD: 500.000 hoặc 2.500.000"
                  value={tienCocHienThi}
                  onChange={xuLyNhapTienCoc}
                  className={`w-full pl-3.5 pr-14 py-2.5 border rounded-xl text-sm font-bold text-teal-700 focus:outline-none transition ${inputErrorClass(
                    loiForm.tienCoc
                  )}`}
                />
                <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 rounded bg-teal-50 px-1.5 py-0.5 text-[11px] font-bold text-teal-700 border border-teal-200">
                  VNĐ
                </span>
              </div>
            </FormField>

            <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
              <button
                type="button"
                onClick={() =>
                  setTienCocHienThi(
                    dinhDangSoCoDauCham(
                      chuyenChuoiThanhSo(tienCocHienThi) + 100000
                    )
                  )
                }
                className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                +100.000
              </button>
              <button
                type="button"
                onClick={() =>
                  setTienCocHienThi(
                    dinhDangSoCoDauCham(
                      chuyenChuoiThanhSo(tienCocHienThi) + 500000
                    )
                  )
                }
                className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                +500.000
              </button>
            </div>
          </div>

          {/* Ngày ký hợp đồng */}
          <FormField label="Ngày ký hợp đồng" required error={loiForm.ngayKy}>
            <input
              type="date"
              value={ngayKy}
              onChange={(e) => xuLyDoiNgayKy(e.target.value)}
              className={`w-full px-3.5 py-2.5 border rounded-xl text-sm font-semibold text-slate-900 focus:outline-none transition ${inputErrorClass(
                loiForm.ngayKy
              )}`}
            />
          </FormField>

          {/* Ngày bắt đầu thuê */}
          <FormField label="Ngày bắt đầu thuê" required error={loiForm.ngayBD}>
            <input
              type="date"
              value={ngayBD}
              onChange={(e) => xuLyDoiNgayBD(e.target.value)}
              className={`w-full px-3.5 py-2.5 border rounded-xl text-sm font-semibold text-slate-900 focus:outline-none transition ${inputErrorClass(
                loiForm.ngayBD
              )}`}
            />
          </FormField>

          {/* Ngày kết thúc thuê */}
          <div>
            <FormField
              label="Ngày kết thúc thuê"
              required
              rightText={
                canCapNhatNgayKTKhiDoiTrangThai
                  ? "Cần cập nhật lại!"
                  : undefined
              }
              error={loiForm.ngayKT}
            >
              <input
                type="date"
                min={ngayKTToiThieu || today}
                value={ngayKT}
                onChange={(e) => xuLyDoiNgayKT(e.target.value)}
                className={`w-full px-3.5 py-2.5 border rounded-xl text-sm font-semibold text-slate-900 focus:outline-none transition ${inputErrorClass(
                  loiForm.ngayKT || canCapNhatNgayKTKhiDoiTrangThai
                )}`}
              />
            </FormField>

            <div className="mt-1.5 flex flex-wrap gap-1.5 text-[11px]">
              <button
                type="button"
                onClick={() => chonNhanhNgayKT("6thang")}
                className="rounded-lg border border-teal-300 bg-[#00FFCC]/20 px-2.5 py-0.5 font-bold text-slate-900 hover:bg-[#00FFCC]/40 cursor-pointer"
              >
                6 tháng
              </button>
              <button
                type="button"
                onClick={() => chonNhanhNgayKT("1nam")}
                className="rounded-lg border border-teal-300 bg-[#00FFCC]/20 px-2.5 py-0.5 font-bold text-slate-900 hover:bg-[#00FFCC]/40 cursor-pointer"
              >
                1 năm
              </button>
              <button
                type="button"
                onClick={() => chonNhanhNgayKT("2nam")}
                className="rounded-lg border border-teal-300 bg-[#00FFCC]/20 px-2.5 py-0.5 font-bold text-slate-900 hover:bg-[#00FFCC]/40 cursor-pointer"
              >
                2 năm
              </button>
            </div>
          </div>

          {/* Trạng thái hợp đồng */}
          <div>
            <FormField label="Trạng thái hợp đồng">
              <select
                value={trangThaiHD}
                onChange={(e) => xuLyDoiTrangThai(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 bg-white rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
              >
                <option value="ConHieuLuc">Còn hiệu lực</option>
                <option value="HetHan">Hết hạn</option>
                <option value="DaHuy">Đã hủy</option>
              </select>
            </FormField>
            {trangThaiHD !== trangThaiGoc && (
              <small className="mt-1.5 block text-xs font-semibold text-amber-700">
                * Đã đổi từ <strong>{trangThaiGoc}</strong> sang{" "}
                <strong>{trangThaiHD}</strong>. Hãy kiểm tra lại Ngày kết thúc
                thuê.
              </small>
            )}
          </div>
        </div>
      </div>

      {/* PHẦN 2: DANH SÁCH KHÁCH THUÊ LƯU TRÚ */}
      <div className="pt-4 border-t border-slate-200 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              2. Danh sách người thuê lưu trú trong phòng{" "}
              <span className="text-red-500">*</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Chọn người đại diện ký hợp đồng và các thành viên ở cùng
            </p>
          </div>
          <button
            type="button"
            onClick={themThanhVienVaoForm}
            className="px-4 py-2 rounded-full bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 text-xs font-bold shadow-2xs cursor-pointer transition"
          >
            + Thêm người thuê
          </button>
        </div>

        <FormError message={loiForm.thanhVien} />

        <div className="space-y-2.5">
          {thanhVienChon.map((tv, idx) => {
            const missingMember =
              attemptedSubmit && Number(tv.MaND) <= 0
                ? "Vui lòng chọn khách thuê."
                : null;
            const invalidNgayVao =
              Number(tv.MaND) > 0 &&
              (!tv.NgayVao || tv.NgayVao < ngayBD || tv.NgayVao > ngayKT)
                ? `Ngày vào ở phải từ ${hienThiNgayVN(ngayBD)} đến ${hienThiNgayVN(
                    ngayKT
                  )}.`
                : null;

            return (
              <div
                key={idx}
                className="grid grid-cols-1 items-start gap-2.5 rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 md:grid-cols-12"
              >
                {/* Chọn Khách thuê */}
                <div className="md:col-span-4">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Khách thuê #{idx + 1} *
                  </label>
                  <select
                    value={tv.MaND}
                    onChange={(e) =>
                      capNhatThanhVienForm(idx, "MaND", Number(e.target.value))
                    }
                    className={`w-full rounded-xl border px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none transition ${inputErrorClass(
                      missingMember
                    )}`}
                  >
                    <option value={0}>-- Chọn khách thuê --</option>
                    {danhSachKhachThue.map((kt) => (
                      <option key={kt.MaND} value={kt.MaND}>
                        {kt.HoTen} - SĐT: {kt.SDT} - CCCD: {kt.CCCD || "---"}
                      </option>
                    ))}
                  </select>
                  <FormError message={missingMember} />
                </div>

                {/* Vai trò */}
                <div className="md:col-span-3">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Vai trò trong phòng
                  </label>
                  <select
                    value={tv.VaiTro}
                    onChange={(e) =>
                      capNhatThanhVienForm(idx, "VaiTro", e.target.value)
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
                  >
                    <option value="DaiDien">Người đại diện</option>
                    <option value="ThanhVien">Thành viên ở cùng</option>
                  </select>
                </div>

                {/* Tạm trú */}
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Khai báo tạm trú
                  </label>
                  <select
                    value={tv.TamTru}
                    onChange={(e) =>
                      capNhatThanhVienForm(idx, "TamTru", e.target.value)
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
                  >
                    <option value="ChuaDangKy">Chưa ĐK tạm trú</option>
                    <option value="DaDangKy">Đã ĐK tạm trú</option>
                    <option value="DangCho">Đang chờ</option>
                  </select>
                </div>

                {/* Ngày vào ở */}
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Ngày vào ở
                  </label>
                  <input
                    type="date"
                    min={ngayBD}
                    max={ngayKT}
                    value={tv.NgayVao}
                    onChange={(e) =>
                      capNhatThanhVienForm(idx, "NgayVao", e.target.value)
                    }
                    className={`w-full rounded-xl border px-2.5 py-2 text-xs font-bold text-slate-900 focus:outline-none transition ${inputErrorClass(
                      invalidNgayVao
                    )}`}
                  />
                  <FormError message={invalidNgayVao} />
                </div>

                {/* Nút Xóa */}
                <div className="text-right md:col-span-1 md:pt-5">
                  <button
                    type="button"
                    onClick={() => xoaThanhVienKhoiForm(idx)}
                    className="rounded-xl bg-red-100 hover:bg-red-200 px-3 py-2 text-xs font-bold text-red-700 cursor-pointer transition"
                  >
                    Xóa
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* PHẦN 3: PHÍ DỊCH VỤ ĐĂNG KÝ SỬ DỤNG HÀNG THÁNG */}
      <div className="pt-4 border-t border-slate-200 space-y-3">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            3. Phí dịch vụ đăng ký sử dụng hàng tháng
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Đã chọn <strong className="text-slate-900">{maPDVChon.length}</strong>{" "}
            dịch vụ đi kèm hợp đồng
          </p>
        </div>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3">
          {danhSachPhiDichVu.map((pdv) => {
            const checked = maPDVChon.includes(pdv.MaPDV);
            return (
              <label
                key={pdv.MaPDV}
                className={`flex cursor-pointer items-center justify-between gap-2.5 rounded-2xl border p-3.5 transition ${
                  checked
                    ? "border-teal-500 bg-[#00FFCC]/25 text-slate-900"
                    : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setMaPDVChon([...maPDVChon, pdv.MaPDV]);
                      } else {
                        setMaPDVChon(
                          maPDVChon.filter((id) => id !== pdv.MaPDV)
                        );
                      }
                    }}
                    className="w-4 h-4 accent-teal-600 cursor-pointer"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      {pdv.TenPDV}
                    </div>
                    <div className="text-xs font-bold text-teal-700">
                      {dinhDangTienVN(pdv.Gia)} đ
                    </div>
                  </div>
                </div>
                {checked && (
                  <span className="text-xs font-bold text-teal-800">✓</span>
                )}
              </label>
            );
          })}
        </div>
      </div>

      <FormActions
        cancelHref={cancelHref}
        submitLabel={submitLabel}
        submittingLabel="Đang xử lý..."
        submitting={submitting}
      />
    </form>
  );
}