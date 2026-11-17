"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import FormPageLayout from "@/components/common/FormPageLayout";
import HopDongForm, { ThanhVienForm } from "@/components/hopDong/HopDongForm";
import { useAlertModal } from "@/components/common/AlertModalProvider";
import { hopDongService } from "@/services/hopDong.service";
import { PhiDichVuItem } from "@/types/hopDong.type";

function NoiDungSuaHopDong() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { showSuccess, showError } = useAlertModal();

  const rawId =
    searchParams.get("id") ||
    searchParams.get("maHDT") ||
    (params?.id as string);
  const maHDTSua = rawId ? Number(rawId) : null;

  const [danhSachPhong, setDanhSachPhong] = useState<any[]>([]);
  const [danhSachKhachThue, setDanhSachKhachThue] = useState<any[]>([]);
  const [danhSachPhiDichVu, setDanhSachPhiDichVu] = useState<PhiDichVuItem[]>([]);
  const [danhSachHopDongCu, setDanhSachHopDongCu] = useState<any[]>([]);
  const [dangTaiDuLieu, setDangTaiDuLieu] = useState<boolean>(true);
  const [dangLuu, setDangLuu] = useState<boolean>(false);

  const [initialData, setInitialData] = useState<{
    maPhong?: number | "";
    maHDTCu?: number | "";
    ngayKy?: string;
    ngayBD?: string;
    ngayKT?: string;
    tienCoc?: number;
    trangThai?: string;
    thanhVienList?: ThanhVienForm[];
    maPDVList?: number[];
  }>({});

  const [trangThaiGoc, setTrangThaiGoc] = useState<string>("ConHieuLuc");
  const [ngayKyGoc, setNgayKyGoc] = useState<string>("");
  const [ngayBDGoc, setNgayBDGoc] = useState<string>("");
  const [ngayKTGoc, setNgayKTGoc] = useState<string>("");

  useEffect(() => {
    if (!maHDTSua) {
      showError("Không tìm thấy mã hợp đồng cần chỉnh sửa!");
      router.push("/chuTro/hopDong");
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
        const ngayBDCu = ct.NgayBD ? ct.NgayBD.slice(0, 10) : "";
        const ngayKyCu = ct.NgayKy ? ct.NgayKy.slice(0, 10) : "";

        setTrangThaiGoc(ct.TrangThai);
        setNgayKyGoc(ngayKyCu);
        setNgayBDGoc(ngayBDCu);
        setNgayKTGoc(ngayKTCu);

        setInitialData({
          maPhong: ct.MaPhong,
          maHDTCu: ct.MaHDTCu || "",
          ngayKy: ngayKyCu,
          ngayBD: ngayBDCu,
          ngayKT: ngayKTCu,
          tienCoc: Number(ct.TienCoc || 0),
          trangThai: ct.TrangThai,
          thanhVienList: (ct.DanhSachThanhVien || []).map((tv: any) => ({
            MaND: tv.MaND,
            VaiTro: tv.VaiTro,
            TamTru: tv.TamTru,
            NgayVao: tv.NgayVao ? tv.NgayVao.slice(0, 10) : ngayBDCu,
            NgayDi: tv.NgayDi ? tv.NgayDi.slice(0, 10) : "",
          })),
          maPDVList: (ct.DanhSachPhiDichVu || []).map((p: any) => p.MaPDV),
        });
      } catch (error: any) {
        showError(error?.message || "Không thể tải thông tin hợp đồng cần sửa");
        router.push("/chuTro/hopDong");
      } finally {
        setDangTaiDuLieu(false);
      }
    };

    taiDuLieuBanDau();
  }, [maHDTSua, router, showError]);

  return (
    <FormPageLayout
      allowedRoles={["ChuTro", "QuanLy"]}
      backHref="/chuTro/hopDong"
      backLabel="Quay lại danh sách Hợp đồng"
      title={`Chỉnh Sửa Hợp Đồng}`}
      subtitle="Cập nhật thông tin phòng, tiền cọc, thời hạn thuê, dịch vụ và danh sách người lưu trú"
      maxWidth="max-w-4xl"
      loading={dangTaiDuLieu}
      loadingText="Đang tải thông tin hợp đồng..."
    >
      {() => (
        <HopDongForm
          mode="edit"
          initialData={initialData}
          danhSachPhong={danhSachPhong}
          danhSachKhachThue={danhSachKhachThue}
          danhSachPhiDichVu={danhSachPhiDichVu}
          danhSachHopDongCu={danhSachHopDongCu}
          trangThaiGoc={trangThaiGoc}
          ngayKyGoc={ngayKyGoc}
          ngayBDGoc={ngayBDGoc}
          ngayKTGoc={ngayKTGoc}
          submitting={dangLuu}
          submitLabel="Lưu Cập Nhật Hợp Đồng"
          cancelHref="/chuTro/hopDong"
          onSubmit={async (payload) => {
            setDangLuu(true);
            try {
              const res = await hopDongService.suaHopDong(maHDTSua!, payload);
              showSuccess(
                res.thongBao || `Đã cập nhật hợp đồng thành công!`,
                "Thành công",
                1.5,
                () => {
                  router.push("/chuTro/hopDong");
                }
              );
            } catch (error: any) {
              throw new Error(error?.message || "Có lỗi xảy ra khi lưu hợp đồng");
            } finally {
              setDangLuu(false);
            }
          }}
        />
      )}
    </FormPageLayout>
  );
}

export default function SuaHopDongPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white text-slate-500 text-sm font-bold">
          Đang tải trang chỉnh sửa hợp đồng...
        </div>
      }
    >
      <NoiDungSuaHopDong />
    </Suspense>
  );
}