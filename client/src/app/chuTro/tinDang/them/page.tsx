"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  Suspense,
} from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import FormPageLayout from "@/components/common/FormPageLayout";
import TinDangForm, {
  TinDangFormData,
} from "@/components/tinDang/TinDangForm";
import { useAlertModal } from "@/components/common/AlertModalProvider";
import type { PhongSelectOption } from "../page";

interface TinDangItemBrief {
  MaTin: number;
  MaPhong: number;
  TrangThai?: string | null;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

function isPhongConTrong(trangThai?: string | null): boolean {
  if (!trangThai) return false;
  const normalized = String(trangThai).trim().toLowerCase();
  return [
    "trong",
    "controng",
    "con trong",
    "trống",
    "còn trống",
  ].includes(normalized);
}

function ThemTinDangContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { showSuccess, showError } = useAlertModal();

  const baseTinDangPath = useMemo(() => {
    return pathname.replace(/\/them\/?$/, "");
  }, [pathname]);

  const [phongOptions, setPhongOptions] = useState<PhongSelectOption[]>([]);
  const [loadingPhong, setLoadingPhong] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const [initialData, setInitialData] = useState<TinDangFormData>({
    MaPhong: "",
    Gia: "",
    MaND: 1,
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
    const fetchRooms = async () => {
      try {
        setLoadingPhong(true);
        const maND = getStoredMaND();

        const response = await fetch(`${API_BASE_URL}/tin-dang?MaND=${maND}`, {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.message || "Không thể tải danh sách phòng.");
        }

        const rawRooms: PhongSelectOption[] = result.data.phongList || [];
        const tinDangList: TinDangItemBrief[] = result.data.tinDangList || [];

        const phongDaCoTrangThaiTinSet = new Set(
          tinDangList
            .filter(
              (tin) =>
                tin.TrangThai !== undefined &&
                tin.TrangThai !== null &&
                String(tin.TrangThai).trim() !== ""
            )
            .map((tin) => String(tin.MaPhong))
        );

        const rooms = rawRooms.filter((room) => {
          const conTrong = isPhongConTrong(room.TrangThai);
          const chuaCoTrangThaiTin = !phongDaCoTrangThaiTinSet.has(
            String(room.MaPhong)
          );
          return conTrong && chuaCoTrangThaiTin;
        });

        setPhongOptions(rooms);

        const maKhuParam = Number(searchParams.get("maKhu") || 0);
        const maPhongParam = searchParams.get("maPhong");

        let defaultRoomId = "";
        if (
          maPhongParam &&
          rooms.some((r) => String(r.MaPhong) === maPhongParam)
        ) {
          defaultRoomId = maPhongParam;
        } else if (maKhuParam > 0) {
          const filtered = rooms.filter((r) => Number(r.MaKhu) === maKhuParam);
          defaultRoomId =
            filtered.length > 0
              ? String(filtered[0].MaPhong)
              : rooms.length > 0
              ? String(rooms[0].MaPhong)
              : "";
        } else if (rooms.length > 0) {
          defaultRoomId = String(rooms[0].MaPhong);
        }

        const defaultRoom = rooms.find(
          (r) => String(r.MaPhong) === String(defaultRoomId)
        );

        setInitialData({
          MaND: maND,
          MaPhong: defaultRoomId,
          Gia:
            defaultRoom?.Gia !== undefined
              ? String(Math.round(Number(defaultRoom.Gia)))
              : "",
          TieuDe: "",
          MoTa: "",
          NgayHetHan: "",
          TrangThai: "DangHienThi",
        });
      } catch (err: unknown) {
        if (err instanceof Error) showError(err.message);
        else showError("Không thể kết nối đến máy chủ.");
      } finally {
        setLoadingPhong(false);
      }
    };

    fetchRooms();
  }, [getStoredMaND, searchParams, showError]);

  return (
    <FormPageLayout
      allowedRoles={["ChuTro", "QuanLy"]}
      backHref={baseTinDangPath}
      backLabel="Quay lại danh sách Tin đăng"
      title="Đăng Tin Tìm Khách Thuê Mới"
      subtitle="Điền thông tin chi tiết và điều chỉnh giá niêm yết để giới thiệu phòng trọ đến khách tìm phòng"
      maxWidth="max-w-3xl"
      loading={loadingPhong}
      loadingText="Đang tải danh sách phòng trọ..."
    >
      {() => (
        <TinDangForm
          mode="create"
          initialData={initialData}
          phongOptions={phongOptions}
          cancelHref={baseTinDangPath}
          submitLabel="Đăng Tin Ngay"
          submitting={isSubmitting}
          serverError={serverError}
          onClearServerError={() => setServerError(null)}
          onSubmit={async (payload) => {
            try {
              setIsSubmitting(true);
              const response = await fetch(`${API_BASE_URL}/tin-dang`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                  ...payload,
                  MaND: payload.MaND || getStoredMaND(),
                }),
              });

              const result = await response.json();
              if (!response.ok || !result.success) {
                throw new Error(result.message || "Không thể đăng tin mới.");
              }

              showSuccess("Đã đăng tin tìm khách thuê mới thành công!");
              router.push(baseTinDangPath);
            } catch (err: unknown) {
              if (err instanceof Error) setServerError(err.message);
              else setServerError("Đã xảy ra lỗi khi gửi dữ liệu lên máy chủ.");
            } finally {
              setIsSubmitting(false);
            }
          }}
        />
      )}
    </FormPageLayout>
  );
}

export default function ThemTinDangPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white text-slate-500 text-sm font-bold">
          Đang tải trang đăng tin...
        </div>
      }
    >
      <ThemTinDangContent />
    </Suspense>
  );
}