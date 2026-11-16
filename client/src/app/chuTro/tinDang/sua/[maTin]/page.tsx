"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, usePathname, useParams } from "next/navigation";
import FormPageLayout from "@/components/common/FormPageLayout";
import TinDangForm, {
  TinDangFormData,
  toLocalDateString,
} from "@/components/tinDang/TinDangForm";
import { useAlertModal } from "@/components/common/AlertModalProvider";
import type { TrangThaiTin, TinDangItem, PhongSelectOption } from "../../page";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function SuaTinDangPage() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const maTin = Number(params?.maTin);
  const { showSuccess, showError } = useAlertModal();

  const baseTinDangPath = useMemo(() => {
    return pathname.replace(/\/sua\/[^/]+\/?$/, "");
  }, [pathname]);

  const [phongOptions, setPhongOptions] = useState<PhongSelectOption[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [notFound, setNotFound] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [initialTrangThai, setInitialTrangThai] =
    useState<TrangThaiTin>("DangHienThi");

  const [initialData, setInitialData] = useState<TinDangFormData>({
    MaPhong: "",
    Gia: "",
    MaND: 0,
    TieuDe: "",
    MoTa: "",
    NgayHetHan: "",
    TrangThai: "DangHienThi",
  });

  const getStoredMaND = useCallback((): number => {
    if (typeof window === "undefined") return 1;
    for (const storage of [window.localStorage, window.sessionStorage]) {
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (!key) continue;
        try {
          const parsed = JSON.parse(storage.getItem(key) || "");
          if (parsed && typeof parsed === "object") {
            if (parsed.MaND) return Number(parsed.MaND);
            if (parsed.user?.MaND) return Number(parsed.user.MaND);
          }
        } catch {
          // Bỏ qua
        }
      }
    }
    return 1;
  }, []);

  useEffect(() => {
    const fetchTinDetail = async () => {
      try {
        setLoading(true);
        const maND = getStoredMaND();

        const response = await fetch(`${API_BASE_URL}/tin-dang?MaND=${maND}`, {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.message || "Không thể tải dữ liệu tin đăng.");
        }

        const list: TinDangItem[] = result.data.tinDangList || [];
        const rooms: PhongSelectOption[] = result.data.phongList || [];
        setPhongOptions(rooms);

        const targetTin = list.find((item) => Number(item.MaTin) === maTin);
        if (!targetTin) {
          setNotFound(true);
          return;
        }

        const matchedRoom = rooms.find(
          (r) => Number(r.MaPhong) === Number(targetTin.MaPhong)
        );
        const initialGia =
          matchedRoom?.Gia !== undefined
            ? String(Math.round(Number(matchedRoom.Gia)))
            : (targetTin as { Gia?: number | string }).Gia !== undefined
            ? String(
                Math.round(
                  Number((targetTin as { Gia?: number | string }).Gia)
                )
              )
            : "";

        setInitialTrangThai(targetTin.TrangThai);
        setInitialData({
          MaPhong: String(targetTin.MaPhong),
          Gia: initialGia,
          MaND: targetTin.MaND || maND,
          TieuDe: targetTin.TieuDe || "",
          MoTa: targetTin.MoTa || "",
          NgayHetHan: toLocalDateString(targetTin.NgayHetHan),
          TrangThai: targetTin.TrangThai,
        });
      } catch (err: unknown) {
        if (err instanceof Error) showError(err.message);
        else showError("Không thể kết nối đến máy chủ.");
      } finally {
        setLoading(false);
      }
    };

    if (maTin) {
      fetchTinDetail();
    }
  }, [maTin, getStoredMaND, showError]);

  return (
    <FormPageLayout
      allowedRoles={["ChuTro", "QuanLy"]}
      backHref={baseTinDangPath}
      backLabel="Quay lại danh sách Tin đăng"
      title={`Chỉnh Sửa Tin Đăng #${maTin}`}
      maxWidth="max-w-3xl"
      loading={loading}
      loadingText={`Đang tải dữ liệu tin đăng #${maTin}...`}
    >
      {() =>
        notFound ? (
          <div className="py-16 text-center bg-slate-50 rounded-2xl border border-slate-200 p-6 space-y-3">
            <p className="text-base font-bold text-slate-700">
              Không tìm thấy tin đăng #{maTin}!
            </p>
            <button
              type="button"
              onClick={() => router.push(baseTinDangPath)}
              className="px-5 py-2.5 rounded-full bg-[#00FFCC] text-slate-900 text-xs font-bold cursor-pointer"
            >
              Về danh sách tin đăng
            </button>
          </div>
        ) : (
          <TinDangForm
            mode="edit"
            initialData={initialData}
            initialTrangThai={initialTrangThai}
            phongOptions={phongOptions}
            cancelHref={baseTinDangPath}
            submitLabel="Lưu Thay Đổi"
            submitting={isSubmitting}
            serverError={serverError}
            onClearServerError={() => setServerError(null)}
            onSubmit={async (payload) => {
              try {
                setIsSubmitting(true);
                const response = await fetch(
                  `${API_BASE_URL}/tin-dang/${maTin}`,
                  {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify(payload),
                  }
                );

                const result = await response.json();
                if (!response.ok || !result.success) {
                  throw new Error(
                    result.message || "Không thể cập nhật bài đăng."
                  );
                }

                showSuccess(
                  `Đã cập nhật tin đăng #${maTin} và giá phòng thành công!`
                );
                router.push(baseTinDangPath);
              } catch (err: unknown) {
                if (err instanceof Error) setServerError(err.message);
                else
                  setServerError("Đã xảy ra lỗi khi gửi dữ liệu lên máy chủ.");
              } finally {
                setIsSubmitting(false);
              }
            }}
          />
        )
      }
    </FormPageLayout>
  );
}