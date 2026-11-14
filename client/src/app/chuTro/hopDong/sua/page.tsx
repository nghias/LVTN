"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import QuanLyHeader from "@/components/layout/QuanLyHeader";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import { hopDongService } from "@/services/hopDong.service";
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
    0,
  ).getDate();
  thangDich.setDate(Math.min(ngay, soNgayToiDa));

  return dinhDangNgayLocal(thangDich);
};

// Định dạng YYYY-MM-DD sang DD/MM/YYYY
const hienThiNgayVN = (chuoiNgay: string): string => {
  if (!chuoiNgay) return "";
  return chuoiNgay.split("-").reverse().join("/");
};

// Hàm thêm dấu chấm vào chuỗi số
const dinhDangSoCoDauCham = (giaTri: string | number): string => {
  const chuoiSo = String(giaTri).replace(/\D/g, "");
  if (!chuoiSo) return "";
  const soSach = chuoiSo.replace(/^0+(?=\d)/, "");
  return soSach.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

// Hàm chuyển chuỗi có dấu chấm về kiểu number
const chuyenChuoiThanhSo = (chuoiHienThi: string): number => {
  const chuoiSo = chuoiHienThi.replace(/\D/g, "");
  return chuoiSo ? Number(chuoiSo) : 0;
};

function NoiDungSuaHopDong() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();

  // Hỗ trợ lấy mã hợp đồng từ cả ?id=... hoặc route động /sua/[id]
  const rawId =
    searchParams.get("id") ||
    searchParams.get("maHDT") ||
    (params?.id as string);
  const maHDTSua = rawId ? Number(rawId) : null;

  const today = dinhDangNgayLocal();

  // Dữ liệu danh mục
  const [danhSachPhong, setDanhSachPhong] = useState<any[]>([]);
  const [danhSachKhachThue, setDanhSachKhachThue] = useState<any[]>([]);
  const [danhSachPhiDichVu, setDanhSachPhiDichVu] = useState<PhiDichVuItem[]>(
    [],
  );
  const [danhSachHopDongCu, setDanhSachHopDongCu] = useState<any[]>([]);
  const [dangTaiDuLieu, setDangTaiDuLieu] = useState<boolean>(true);

  // State dữ liệu form
  const [maPhong, setMaPhong] = useState<number | "">("");
  const [maHDTCu, setMaHDTCu] = useState<number | "">("");
  const [ngayKy, setNgayKy] = useState<string>(today);
  const [ngayBD, setNgayBD] = useState<string>(today);
  const [ngayKT, setNgayKT] = useState<string>("");
  const [tienCocHienThi, setTienCocHienThi] = useState<string>("0");
  const [trangThaiHD, setTrangThaiHD] = useState<string>("ConHieuLuc");
  const [kieuHopDong, setKieuHopDong] = useState<
    "DaiDienChung" | "TachHopDongRieng"
  >("DaiDienChung");
  const [thanhVienChon, setThanhVienChon] = useState<ThanhVienForm[]>([]);
  const [maPDVChon, setMaPDVChon] = useState<number[]>([]);

  // State lưu giá trị gốc ban đầu để bắt lỗi UX/UI khi sửa hợp đồng
  const [trangThaiGoc, setTrangThaiGoc] = useState<string>("ConHieuLuc");
  const [ngayKTGoc, setNgayKTGoc] = useState<string>("");
  const [daDoiNgayKT, setDaDoiNgayKT] = useState<boolean>(false);

  // State thông báo lỗi UX/UI
  const [loiForm, setLoiForm] = useState<LoiFormState>({});
  const [dangLuu, setDangLuu] = useState<boolean>(false);

  const ngayKTToiThieu = congThemThang(ngayBD, 1);

  useEffect(() => {
    if (!maHDTSua) {
      alert("Không tìm thấy mã hợp đồng cần chỉnh sửa!");
      router.back();
      return;
    }

    const taiDuLieuBanDau = async () => {
      setDangTaiDuLieu(true);
      try {
        const [danhMuc, ct] = await Promise.all([
          hopDongService.layDuLieuTaoMoi(),
          hopDongService.xemChiTiet(maHDTSua),
        ]);

        setDanhSachPhong(danhMuc.danhSachPhong || []);
        setDanhSachKhachThue(danhMuc.danhSachKhachThue || []);
        setDanhSachPhiDichVu(danhMuc.danhSachPhiDichVu || []);
        setDanhSachHopDongCu(danhMuc.danhSachHopDongCu || []);

        const ngayKTCu = ct.NgayKT ? ct.NgayKT.slice(0, 10) : "";
        const ngayBDCu = ct.NgayBD ? ct.NgayBD.slice(0, 10) : today;
        const ngayKyCu = ct.NgayKy ? ct.NgayKy.slice(0, 10) : today;

        setMaPhong(ct.MaPhong);
        setMaHDTCu(ct.MaHDTCu || "");
        setNgayKy(ngayKyCu);
        setNgayBD(ngayBDCu);
        setNgayKT(ngayKTCu);
        setTienCocHienThi(dinhDangSoCoDauCham(Number(ct.TienCoc || 0)));
        setTrangThaiHD(ct.TrangThai);
        setTrangThaiGoc(ct.TrangThai);
        setNgayKTGoc(ngayKTCu);
        setKieuHopDong("DaiDienChung");
        setThanhVienChon(
          (ct.DanhSachThanhVien || []).map((tv: any) => ({
            MaND: tv.MaND,
            VaiTro: tv.VaiTro,
            TamTru: tv.TamTru,
            NgayVao: tv.NgayVao ? tv.NgayVao.slice(0, 10) : ngayBDCu,
            NgayDi: tv.NgayDi ? tv.NgayDi.slice(0, 10) : "",
          })),
        );
        setMaPDVChon((ct.DanhSachPhiDichVu || []).map((p: any) => p.MaPDV));
      } catch (error: any) {
        alert(error.message || "Không thể tải thông tin hợp đồng cần sửa");
        router.back();
      } finally {
        setDangTaiDuLieu(false);
      }
    };

    taiDuLieuBanDau();
  }, [maHDTSua]);

  const canCapNhatNgayKTKhiDoiTrangThai =
    trangThaiHD !== trangThaiGoc && (ngayKT === ngayKTGoc || !daDoiNgayKT);

  const xuLyChonPhong = (idPhong: number) => {
    setMaPhong(idPhong || "");
    setLoiForm((prev) => ({ ...prev, maPhong: undefined, chung: undefined }));
  };

  const xuLyNhapTienCoc = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = dinhDangSoCoDauCham(e.target.value);
    setTienCocHienThi(formatted);
    if (loiForm.tienCoc) {
      setLoiForm((prev) => ({ ...prev, tienCoc: undefined }));
    }
  };

  const xuLyDoiNgayKy = (ngayMoi: string) => {
    setNgayKy(ngayMoi);
    let loiNgayKy: string | undefined = undefined;

    if (!ngayMoi) {
      loiNgayKy = "Vui lòng chọn ngày ký (tạo hợp đồng)!";
    } else if (ngayMoi < today) {
      loiNgayKy = `Ngày tạo hợp đồng không được nhỏ hơn ngày hiện tại (${hienThiNgayVN(today)})!`;
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
          : tv,
      ),
    );

    let loiNgayBD: string | undefined = undefined;
    let loiNgayKy = loiForm.ngayKy;
    let loiNgayKT = loiForm.ngayKT;

    if (!ngayMoi) {
      loiNgayBD = "Vui lòng chọn ngày bắt đầu thuê!";
    } else if (ngayMoi < today) {
      loiNgayBD = `Ngày bắt đầu thuê không được nhỏ hơn ngày hiện tại (${hienThiNgayVN(today)})!`;
    }

    if (ngayKy && ngayMoi && ngayKy > ngayMoi) {
      loiNgayKy = "Ngày ký hợp đồng không được lớn hơn Ngày bắt đầu thuê!";
    } else if (ngayKy >= today) {
      loiNgayKy = undefined;
    }

    const mocToiThieu = congThemThang(ngayMoi, 1);
    if (ngayKT && mocToiThieu && ngayKT < mocToiThieu) {
      loiNgayKT = `Ngày kết thúc thuê phải ít nhất 01 tháng kể từ ngày bắt đầu (tối thiểu từ ${hienThiNgayVN(mocToiThieu)})!`;
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
      loiNgayKT = `Ngày kết thúc thuê phải ít nhất 01 tháng kể từ ngày bắt đầu (tối thiểu từ ${hienThiNgayVN(ngayKTToiThieu)})!`;
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

  const chonNhanhNgayKT = (loai: "1thang" | "6thang" | "1nam") => {
    const goc = ngayBD || today;
    let chuoiNgay = "";
    if (loai === "1thang") chuoiNgay = congThemThang(goc, 1);
    if (loai === "6thang") chuoiNgay = congThemThang(goc, 6);
    if (loai === "1nam") chuoiNgay = congThemThang(goc, 12);
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
    value: any,
  ) => {
    setThanhVienChon((prev) => {
      const copy = [...prev];
      if (
        field === "VaiTro" &&
        value === "DaiDien" &&
        kieuHopDong === "DaiDienChung"
      ) {
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
      if (
        kieuHopDong === "DaiDienChung" &&
        conLai.length > 0 &&
        !conLai.some((tv) => tv.VaiTro === "DaiDien")
      ) {
        conLai[0] = { ...conLai[0], VaiTro: "DaiDien" };
      }
      return conLai;
    });
    setLoiForm((prev) => ({ ...prev, thanhVien: undefined }));
  };

  const phongDangChon = danhSachPhong.find(
    (p) => p.MaPhong === Number(maPhong),
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
    } else if (ngayKy < today) {
      loiMoi.ngayKy = `Ngày tạo hợp đồng không được nhỏ hơn ngày hiện tại (${hienThiNgayVN(today)})!`;
    } else if (ngayBD && ngayKy > ngayBD) {
      loiMoi.ngayKy = "Ngày ký hợp đồng không được sau Ngày bắt đầu thuê!";
    }

    if (!ngayBD) {
      loiMoi.ngayBD = "Vui lòng chọn ngày bắt đầu thuê!";
    } else if (ngayBD < today) {
      loiMoi.ngayBD = `Ngày bắt đầu thuê không được nhỏ hơn ngày hiện tại (${hienThiNgayVN(today)})!`;
    }

    const mocToiThieu1Thang = congThemThang(ngayBD, 1);
    if (!ngayKT) {
      loiMoi.ngayKT = "Vui lòng chọn ngày kết thúc hợp đồng!";
    } else if (ngayBD && ngayKT < ngayBD) {
      loiMoi.ngayKT =
        "Ngày kết thúc thuê không được nhỏ hơn Ngày bắt đầu thuê!";
    } else if (mocToiThieu1Thang && ngayKT < mocToiThieu1Thang) {
      loiMoi.ngayKT = `Ngày kết thúc thuê phải ít nhất là 01 tháng từ ngày bắt đầu thuê (tối thiểu từ ${hienThiNgayVN(mocToiThieu1Thang)})!`;
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
    } else if (
      kieuHopDong === "DaiDienChung" &&
      !dsHopLe.some((tv) => tv.VaiTro === "DaiDien")
    ) {
      loiMoi.thanhVien =
        "Hợp đồng chung bắt buộc phải có 01 khách thuê giữ vai trò Người đại diện!";
    } else if (
      phongDangChon?.SoNguoiToiDa &&
      dsHopLe.length > Number(phongDangChon.SoNguoiToiDa)
    ) {
      loiMoi.thanhVien = `Phòng ${phongDangChon.TenPhong} chỉ cho phép tối đa ${phongDangChon.SoNguoiToiDa} người lưu trú!`;
    } else {
      const tvSaiNgayVao = dsHopLe.find(
        (tv) => !tv.NgayVao || tv.NgayVao < ngayBD || tv.NgayVao > ngayKT,
      );
      if (tvSaiNgayVao) {
        loiMoi.thanhVien =
          "Ngày vào ở của thành viên phải nằm trong khoảng từ Ngày bắt đầu đến Ngày kết thúc hợp đồng!";
      }
    }

    setLoiForm(loiMoi);
    return Object.keys(loiMoi).length === 0;
  };

  const xuLyLuuHopDong = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!maHDTSua || !kiemTraHopLe()) return;

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
      KieuHopDong: kieuHopDong,
      DanhSachThanhVien: dsHopLe,
      DanhSachMaPDV: maPDVChon,
      ChiSoDienBanGiao: null,
      ChiSoNuocBanGiao: null,
    };

    setDangLuu(true);
    try {
      const res = await hopDongService.suaHopDong(maHDTSua, payload);
      alert(res.thongBao || "Cập nhật hợp đồng thành công!");
      router.back();
    } catch (error: any) {
      setLoiForm((prev) => ({
        ...prev,
        chung: error.message || "Có lỗi xảy ra khi lưu hợp đồng",
      }));
    } finally {
      setDangLuu(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={["ChuTro", "QuanLy"]}>
      {(user) => (
        <div className="min-h-screen bg-[#F8FAFC] text-slate-900">
          <QuanLyHeader user={user} />

          <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
            {/* Thanh điều hướng quay lại */}
            <div className="mb-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-100"
              >
                ← Quay lại danh sách hợp đồng
              </button>
            </div>

            <div className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm">
              {/* Header trang sửa hợp đồng */}
              <div className="flex items-center justify-between border-b border-emerald-200 bg-[#ECFDF5] px-6 py-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#00FFCC] text-sm font-bold text-black">
                    ✎
                  </span>
                  <div>
                    <h1 className="text-lg font-bold text-[#0F172A]">
                      Chỉnh Sửa Hợp Đồng #{maHDTSua}
                    </h1>
                    <p className="text-xs text-slate-600">
                      Cập nhật thông tin phòng, tiền cọc, thời hạn và danh sách
                      người lưu trú
                    </p>
                  </div>
                </div>
              </div>

              {dangTaiDuLieu ? (
                <div className="p-12 text-center text-sm text-slate-500">
                  Đang tải thông tin hợp đồng #{maHDTSua}...
                </div>
              ) : (
                <form
                  onSubmit={xuLyLuuHopDong}
                  noValidate
                  className="space-y-6 p-6 text-sm text-[#0F172A]"
                >
                  {/* Khối cảnh báo tổng hợp nếu có lỗi */}
                  {(loiForm.chung ||
                    loiForm.maPhong ||
                    loiForm.ngayKy ||
                    loiForm.ngayBD ||
                    loiForm.ngayKT ||
                    loiForm.tienCoc ||
                    loiForm.thanhVien) && (
                    <div className="rounded-xl border border-rose-300 bg-rose-50 p-3.5 text-xs text-rose-700">
                      <div className="mb-1 font-bold">
                        ⚠️ Vui lòng kiểm tra lại các thông tin sau:
                      </div>
                      <ul className="list-inside list-disc space-y-0.5 font-medium">
                        {loiForm.chung && <li>{loiForm.chung}</li>}
                        {loiForm.maPhong && <li>{loiForm.maPhong}</li>}
                        {loiForm.tienCoc && <li>{loiForm.tienCoc}</li>}
                        {loiForm.ngayKy && <li>{loiForm.ngayKy}</li>}
                        {loiForm.ngayBD && <li>{loiForm.ngayBD}</li>}
                        {loiForm.ngayKT && <li>{loiForm.ngayKT}</li>}
                        {loiForm.thanhVien && <li>{loiForm.thanhVien}</li>}
                      </ul>
                    </div>
                  )}

                  {/* Thông tin Phòng, Tiền cọc & Thời hạn */}
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div>
                      <label className="mb-1 block font-semibold text-slate-800">
                        Chọn phòng trọ *
                      </label>
                      <select
                        required
                        value={maPhong}
                        onChange={(e) => xuLyChonPhong(Number(e.target.value))}
                        className={`w-full rounded-xl border px-3 py-2.5 focus:outline-none ${
                          loiForm.maPhong
                            ? "border-rose-500 bg-rose-50/40"
                            : "border-slate-300 focus:border-[#059669]"
                        }`}
                      >
                        <option value="">-- Chọn phòng --</option>
                        {danhSachPhong.map((p) => (
                          <option key={p.MaPhong} value={p.MaPhong}>
                            {p.TenPhong} {p.TenKhu ? `- ${p.TenKhu}` : ""} (
                            {dinhDangTienVN(p.Gia)}đ - {p.TrangThai})
                          </option>
                        ))}
                      </select>
                      {phongDangChon && (
                        <p className="mt-1 text-[11px] text-emerald-700">
                          Giá thuê:{" "}
                          <strong>
                            {dinhDangTienVN(phongDangChon.Gia)}đ/tháng
                          </strong>
                          {phongDangChon.SoNguoiToiDa
                            ? ` • Tối đa ${phongDangChon.SoNguoiToiDa} người`
                            : ""}
                        </p>
                      )}
                      {loiForm.maPhong && (
                        <p className="mt-1 text-xs font-medium text-rose-600">
                          {loiForm.maPhong}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="mb-1 block font-semibold text-slate-800">
                        Hợp đồng kỳ trước (Nếu có)
                      </label>
                      <select
                        value={maHDTCu}
                        onChange={(e) =>
                          setMaHDTCu(
                            e.target.value ? Number(e.target.value) : "",
                          )
                        }
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

                    <div>
                      <label className="mb-1 block font-semibold text-slate-800">
                        Tiền đặt cọc (VNĐ) *
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          inputMode="numeric"
                          required
                          placeholder="Ví dụ: 500.000 hoặc 2.500.000"
                          value={tienCocHienThi}
                          onChange={xuLyNhapTienCoc}
                          className={`w-full rounded-xl border px-3 py-2.5 pr-14 font-bold text-[#059669] focus:outline-none ${
                            loiForm.tienCoc
                              ? "border-rose-500 bg-rose-50/40"
                              : "border-slate-300 focus:border-[#059669]"
                          }`}
                        />
                        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-bold text-[#059669]">
                          VNĐ
                        </span>
                      </div>

                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                        <button
                          type="button"
                          onClick={() =>
                            setTienCocHienThi(
                              dinhDangSoCoDauCham(
                                chuyenChuoiThanhSo(tienCocHienThi) + 100000,
                              ),
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
                              dinhDangSoCoDauCham(
                                chuyenChuoiThanhSo(tienCocHienThi) + 500000,
                              ),
                            )
                          }
                          className="rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-slate-700 hover:bg-slate-200"
                        >
                          +500.000
                        </button>
                      </div>
                      {loiForm.tienCoc && (
                        <p className="mt-1 text-xs font-medium text-rose-600">
                          {loiForm.tienCoc}
                        </p>
                      )}
                    </div>

                    {/* Ngày ký hợp đồng */}
                    <div>
                      <label className="mb-1 block font-semibold text-slate-800">
                        Ngày ký hợp đồng *
                      </label>
                      <input
                        type="date"
                        required
                        min={today}
                        value={ngayKy}
                        onChange={(e) => xuLyDoiNgayKy(e.target.value)}
                        className={`w-full rounded-xl border px-3 py-2.5 focus:outline-none ${
                          loiForm.ngayKy
                            ? "border-rose-500 bg-rose-50/40 ring-2 ring-rose-200"
                            : "border-slate-300 focus:border-[#059669]"
                        }`}
                      />
                      {loiForm.ngayKy && (
                        <p className="mt-1 text-xs font-medium text-rose-600">
                          {loiForm.ngayKy}
                        </p>
                      )}
                    </div>

                    {/* Ngày bắt đầu thuê */}
                    <div>
                      <label className="mb-1 block font-semibold text-slate-800">
                        Ngày bắt đầu thuê *
                      </label>
                      <input
                        type="date"
                        required
                        min={today}
                        value={ngayBD}
                        onChange={(e) => xuLyDoiNgayBD(e.target.value)}
                        className={`w-full rounded-xl border px-3 py-2.5 focus:outline-none ${
                          loiForm.ngayBD
                            ? "border-rose-500 bg-rose-50/40 ring-2 ring-rose-200"
                            : "border-slate-300 focus:border-[#059669]"
                        }`}
                      />
                      {loiForm.ngayBD && (
                        <p className="mt-1 text-xs font-medium text-rose-600">
                          {loiForm.ngayBD}
                        </p>
                      )}
                    </div>

                    {/* Ngày kết thúc thuê */}
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
                        min={ngayKTToiThieu || today}
                        value={ngayKT}
                        onChange={(e) => xuLyDoiNgayKT(e.target.value)}
                        className={`w-full rounded-xl border px-3 py-2.5 focus:outline-none ${
                          loiForm.ngayKT
                            ? "border-rose-500 bg-rose-50/40 ring-2 ring-rose-200"
                            : canCapNhatNgayKTKhiDoiTrangThai
                              ? "border-amber-500 bg-amber-50/60 ring-2 ring-amber-300"
                              : "border-slate-300 focus:border-[#059669]"
                        }`}
                      />

                      <div className="mt-1.5 flex flex-wrap gap-1.5 text-[11px]">
                        <button
                          type="button"
                          onClick={() => chonNhanhNgayKT("1thang")}
                          className="rounded-md border border-emerald-300 bg-emerald-50 px-2 py-0.5 font-medium text-[#059669] hover:bg-emerald-100"
                        >
                          +1 tháng
                        </button>
                        <button
                          type="button"
                          onClick={() => chonNhanhNgayKT("6thang")}
                          className="rounded-md border border-emerald-300 bg-emerald-50 px-2 py-0.5 font-medium text-[#059669] hover:bg-emerald-100"
                        >
                          +6 tháng
                        </button>
                        <button
                          type="button"
                          onClick={() => chonNhanhNgayKT("1nam")}
                          className="rounded-md border border-emerald-300 bg-emerald-50 px-2 py-0.5 font-medium text-[#059669] hover:bg-emerald-100"
                        >
                          +1 năm
                        </button>
                      </div>

                      {loiForm.ngayKT && (
                        <p className="mt-1 text-xs font-medium text-rose-600">
                          {loiForm.ngayKT}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Trạng thái hợp đồng */}
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
                      {trangThaiHD !== trangThaiGoc && (
                        <p className="mt-1 text-xs text-amber-700">
                          * Đã đổi từ <strong>{trangThaiGoc}</strong> sang{" "}
                          <strong>{trangThaiHD}</strong>. Hãy kiểm tra lại Ngày
                          kết thúc thuê.
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
                        className="rounded-full bg-[#00FFCC] px-4 py-1.5 text-xs font-bold text-[#0F172A] shadow-xs hover:bg-[#00cc88]"
                      >
                        + Thêm người thuê
                      </button>
                    </div>

                    {loiForm.thanhVien && (
                      <p className="mb-2 text-xs font-medium text-rose-600">
                        {loiForm.thanhVien}
                      </p>
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
                                capNhatThanhVienForm(
                                  idx,
                                  "MaND",
                                  Number(e.target.value),
                                )
                              }
                              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5"
                            >
                              <option value={0}>-- Chọn khách thuê --</option>
                              {danhSachKhachThue.map((kt) => (
                                <option key={kt.MaND} value={kt.MaND}>
                                  {kt.HoTen} - SĐT: {kt.SDT} - CCCD:{" "}
                                  {kt.CCCD || "---"}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="md:col-span-3">
                            <select
                              value={tv.VaiTro}
                              onChange={(e) =>
                                capNhatThanhVienForm(
                                  idx,
                                  "VaiTro",
                                  e.target.value,
                                )
                              }
                              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5"
                            >
                              <option value="DaiDien">Người đại diện</option>
                              <option value="ThanhVien">
                                Thành viên ở cùng
                              </option>
                            </select>
                          </div>

                          <div className="md:col-span-2">
                            <select
                              value={tv.TamTru}
                              onChange={(e) =>
                                capNhatThanhVienForm(
                                  idx,
                                  "TamTru",
                                  e.target.value,
                                )
                              }
                              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5"
                            >
                              <option value="ChuaDangKy">
                                Chưa ĐK tạm trú
                              </option>
                              <option value="DaDangKy">Đã ĐK tạm trú</option>
                              <option value="DangCho">Đang chờ</option>
                            </select>
                          </div>

                          <div className="md:col-span-2">
                            <input
                              type="date"
                              min={ngayBD}
                              max={ngayKT}
                              value={tv.NgayVao}
                              onChange={(e) =>
                                capNhatThanhVienForm(
                                  idx,
                                  "NgayVao",
                                  e.target.value,
                                )
                              }
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
                                ? "border-[#059669] bg-[#ECFDF5]/60"
                                : "border-slate-200 bg-white hover:bg-slate-50"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setMaPDVChon([...maPDVChon, pdv.MaPDV]);
                                } else {
                                  setMaPDVChon(
                                    maPDVChon.filter((id) => id !== pdv.MaPDV),
                                  );
                                }
                              }}
                              className="accent-[#059669]"
                            />
                            <div>
                              <div className="font-semibold text-[#0F172A]">
                                {pdv.TenPDV}
                              </div>
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
                      onClick={() => router.back()}
                      className="cursor-pointer rounded-full border border-slate-300 px-5 py-2.5 font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="submit"
                      disabled={dangLuu}
                      className="cursor-pointer rounded-full bg-[#00FFCC] px-6 py-2.5 font-bold text-[#0F172A] shadow-sm transition hover:bg-[#00cc88] disabled:opacity-50"
                    >
                      {dangLuu ? "Đang xử lý..." : "Lưu cập nhật hợp đồng"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </main>
        </div>
      )}
    </ProtectedRoute>
  );
}

export default function SuaHopDongPage() {
  return (
    <Suspense
      fallback={
        <div className="p-10 text-center text-sm text-slate-500">
          Đang tải trang chỉnh sửa hợp đồng...
        </div>
      }
    >
      <NoiDungSuaHopDong />
    </Suspense>
  );
}