// client/src/app/chuTro/hopDong/them/page.tsx
"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import FormPageLayout from "@/components/common/FormPageLayout";
import HopDongForm from "@/components/hopDong/HopDongForm";
import { useAlertModal } from "@/components/common/AlertModalProvider";
import { hopDongService } from "@/services/hopDong.service";
import { PhiDichVuItem } from "@/types/hopDong.type";

function NoiDungThemHopDong() {
  const router = useRouter();
  const { showSuccess, showError } = useAlertModal();

  const [danhSachPhong, setDanhSachPhong] = useState<any[]>([]);
  const [danhSachKhachThue, setDanhSachKhachThue] = useState<any[]>([]);
  const [danhSachPhiDichVu, setDanhSachPhiDichVu] = useState<PhiDichVuItem[]>([]);
  const [danhSachHopDongCu, setDanhSachHopDongCu] = useState<any[]>([]);
  const [dangTaiDuLieu, setDangTaiDuLieu] = useState<boolean>(true);
  const [dangLuu, setDangLuu] = useState<boolean>(false);

  useEffect(() => {
    const taiDuLieuBanDau = async () => {
      setDangTaiDuLieu(true);
      try {
        const data = await hopDongService.layDuLieuTaoMoi();
        setDanhSachPhong(data.danhSachPhong || []);
        setDanhSachKhachThue(data.danhSachKhachThue || []);
        setDanhSachPhiDichVu(data.danhSachPhiDichVu || []);
        setDanhSachHopDongCu(data.danhSachHopDongCu || []);
      } catch (error: any) {
        showError(error?.message || "Không thể tải dữ liệu để tạo hợp đồng");
        router.push("/chuTro/hopDong");
      } finally {
        setDangTaiDuLieu(false);
      }
    };

    taiDuLieuBanDau();
  }, [router, showError]);

  return (
    <FormPageLayout
      allowedRoles={["ChuTro", "QuanLy"]}
      backHref="/chuTro/hopDong"
      backLabel="Quay lại danh sách Hợp đồng"
      title="Lập Hợp Đồng Thuê Phòng Mới"
      subtitle="Thiết lập thông tin phòng, tiền cọc, thời hạn thuê, dịch vụ và danh sách người lưu trú"
      maxWidth="max-w-4xl"
      loading={dangTaiDuLieu}
      loadingText="Đang tải danh mục dữ liệu..."
    >
      {() => (
        <HopDongForm
          mode="create"
          danhSachPhong={danhSachPhong}
          danhSachKhachThue={danhSachKhachThue}
          danhSachPhiDichVu={danhSachPhiDichVu}
          danhSachHopDongCu={danhSachHopDongCu}
          submitting={dangLuu}
          submitLabel="Tạo Hợp Đồng Mới"
          cancelHref="/chuTro/hopDong"
          onSubmit={async (payload) => {
            setDangLuu(true);
            try {
              const res = await hopDongService.taoHopDong(payload);
              showSuccess(
                res.thongBao || "Lập hợp đồng thuê phòng thành công!",
                "Thành công",
                1.5,
                () => {
                  router.push("/chuTro/hopDong");
                }
              );
            } catch (error: any) {
              throw new Error(error?.message || "Có lỗi xảy ra khi tạo hợp đồng");
            } finally {
              setDangLuu(false);
            }
          }}
        />
      )}
    </FormPageLayout>
  );
}

export default function ThemHopDongPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white text-slate-500 text-sm font-bold">
          Đang tải trang lập hợp đồng...
        </div>
      }
    >
      <NoiDungThemHopDong />
    </Suspense>
  );
}