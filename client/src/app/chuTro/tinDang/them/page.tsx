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
import { PhongTroService } from "@/services/phongTro.service";
import type { PhongSelectOption } from "../page";

interface TinDangItemBrief {
  MaTin: number;
  MaPhong: number;
  MaKhu?: number;
  MaND?: number;
  TrangThai?: string | null;
  NgayHetHan?: string | null;
  TenPhong?: string;
  DienTich?: number;
  Gia?: number;
  TrangThaiPhong?: string | null;
  TenKhu?: string;
  DiaChi?: string;
  MaQuanLy?: number;
  TenQuanLy?: string;
  SDTQuanLy?: string;
  TenChuTro?: string;
  SDTChuTro?: string;
}

interface StoredAuthUser {
  maND: number;
  quyen: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

function isPhongConTrong(trangThai?: string | null): boolean {
  if (
    trangThai === undefined ||
    trangThai === null ||
    String(trangThai).trim() === ""
  ) {
    return true;
  }

  const normalized = String(trangThai).trim().toLowerCase();
  return [
    "trong",
    "controng",
    "con trong",
    "dangtrong",
    "dang trong",
    "trống",
    "còn trống",
    "đang trống",
    "baotri",
    "bao tri",
    "bảo trì",
    "đang bảo trì",
  ].includes(normalized);
}

// Kiểm tra xem tin đăng có phải là tin đã hết hạn hay không
function isTinHetHan(tin: TinDangItemBrief): boolean {
  const normalizedStatus = String(tin.TrangThai || "")
    .trim()
    .toLowerCase();

  if (
    ["hethan", "het han", "hết hạn", "dahethan", "đã hết hạn"].includes(
      normalizedStatus
    )
  ) {
    return true;
  }

  if (tin.NgayHetHan) {
    const expiryDate = new Date(tin.NgayHetHan);
    if (!Number.isNaN(expiryDate.getTime())) {
      expiryDate.setHours(23, 59, 59, 999);
      if (expiryDate.getTime() < Date.now()) {
        return true;
      }
    }
  }

  return false;
}

// Chỉ chặn phòng nếu phòng đó đang có tin DangHienThi và chưa hết hạn
function isTinDangHienThiConHan(tin: TinDangItemBrief): boolean {
  if (isTinHetHan(tin)) {
    return false;
  }

  const normalizedStatus = String(tin.TrangThai || "")
    .trim()
    .toLowerCase();

  if (
    !normalizedStatus ||
    ["daan", "da an", "đã ẩn", "an", "ẩn"].includes(normalizedStatus)
  ) {
    return false;
  }

  return true;
}

// Tạo đối tượng PhongSelectOption từ thông tin tin đăng (dùng cho phòng có tin đã hết hạn)
function buildRoomOptionFromTin(tin: TinDangItemBrief): PhongSelectOption {
  return {
    MaPhong: Number(tin.MaPhong),
    TenPhong: tin.TenPhong || `Phòng #${tin.MaPhong}`,
    DienTich: Number(tin.DienTich || 0),
    Gia: Number(tin.Gia || 0),
    TrangThai: tin.TrangThaiPhong || "Trong",
    MaKhu: Number(tin.MaKhu || 0),
    TenKhu: tin.TenKhu || "",
    DiaChi: tin.DiaChi || "",
  } as PhongSelectOption;
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

  // Lấy cả MaND và Quyen (ChuTro / QuanLy) từ bộ nhớ trình duyệt
  const getStoredUser = useCallback((): StoredAuthUser => {
    const defaultRole = pathname.startsWith("/chuTro") ? "ChuTro" : "QuanLy";
    if (typeof window === "undefined") {
      return { maND: 1, quyen: defaultRole };
    }

    for (const storage of [window.localStorage, window.sessionStorage]) {
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (!key) continue;
        try {
          const parsed = JSON.parse(storage.getItem(key) || "");
          if (parsed && typeof parsed === "object") {
            const rawUser = parsed.user || parsed;
            const maND = Number(rawUser.MaND ?? rawUser.maND ?? 0);
            const quyen = String(
              rawUser.Quyen ?? rawUser.quyen ?? rawUser.role ?? ""
            ).trim();

            if (maND > 0) {
              return {
                maND,
                quyen: quyen || (maND === 1 ? "ChuTro" : defaultRole),
              };
            }
          }
        } catch {
          // Bỏ qua key không phải JSON
        }
      }
    }

    return { maND: 1, quyen: defaultRole };
  }, [pathname]);

  useEffect(() => {
    const fetchTinDangData = async (maNDParam?: number) => {
      const url = maNDParam
        ? `${API_BASE_URL}/tin-dang?MaND=${maNDParam}`
        : `${API_BASE_URL}/tin-dang`;
      const res = await fetch(url, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Không thể tải danh sách phòng.");
      }
      return {
        phongList: (json.data?.phongList || []) as PhongSelectOption[],
        tinDangList: (json.data?.tinDangList || []) as TinDangItemBrief[],
      };
    };

    const fetchRooms = async () => {
      try {
        setLoadingPhong(true);
        const { maND, quyen } = getStoredUser();
        const isChuTro =
          quyen.toLowerCase() === "chutro" ||
          pathname.startsWith("/chuTro") ||
          maND === 1;

        // Lấy danh sách khu trọ để biết khu nào thuộc người quản lý nào (khutro.MaND)
        const khuRes = await PhongTroService.getKhuTroList().catch(() => ({
          data: [],
        }));
        const khuList = khuRes.data || [];

        const managerIds = Array.from(
          new Set(
            khuList
              .map((k: any) => Number(k.MaND))
              .filter((id: number) => id > 0)
          )
        );
        if (managerIds.length === 0) {
          managerIds.push(2, 3, 4);
        }

        let rawRooms: PhongSelectOption[] = [];
        let tinDangList: TinDangItemBrief[] = [];

        if (isChuTro) {
          // Chủ trọ: Lấy toàn bộ phòng và toàn bộ tin đăng của tất cả các cơ sở
          const allRequests = await Promise.allSettled([
            fetchTinDangData(),
            ...managerIds.map((id) => fetchTinDangData(id)),
          ]);

          const roomMap = new Map<string, PhongSelectOption>();
          const tinMap = new Map<string, TinDangItemBrief>();

          allRequests.forEach((res) => {
            if (res.status === "fulfilled") {
              res.value.phongList.forEach((r) =>
                roomMap.set(String(r.MaPhong), r)
              );
              res.value.tinDangList.forEach((t) =>
                tinMap.set(String(t.MaTin), t)
              );
            }
          });

          tinDangList = Array.from(tinMap.values());

          // Bổ sung các phòng có tin đăng đã hết hạn vào danh sách chọn phòng
          tinDangList.forEach((tin) => {
            const key = String(tin.MaPhong);
            if (isTinHetHan(tin) && !roomMap.has(key)) {
              roomMap.set(key, buildRoomOptionFromTin(tin));
            }
          });

          rawRooms = Array.from(roomMap.values());
        } else {
          // Quản lý: Chỉ lấy phòng và tin thuộc khu trọ mà người này quản lý (khutro.MaND === maND)
          const managedKhuIds = new Set(
            khuList
              .filter((k: any) => Number(k.MaND) === maND)
              .map((k: any) => Number(k.MaKhu))
          );

          const managerRequests = await Promise.allSettled([
            fetchTinDangData(maND),
            fetchTinDangData(),
          ]);

          const roomMap = new Map<string, PhongSelectOption>();
          const tinMap = new Map<string, TinDangItemBrief>();

          managerRequests.forEach((res) => {
            if (res.status === "fulfilled") {
              res.value.phongList.forEach((r) => {
                if (
                  managedKhuIds.size === 0 ||
                  managedKhuIds.has(Number(r.MaKhu))
                ) {
                  roomMap.set(String(r.MaPhong), r);
                }
              });
              res.value.tinDangList.forEach((t) => {
                if (
                  managedKhuIds.size === 0 ||
                  managedKhuIds.has(Number(t.MaKhu))
                ) {
                  tinMap.set(String(t.MaTin), t);
                }
              });
            }
          });

          tinDangList = Array.from(tinMap.values());

          // Bổ sung các phòng thuộc khu quản lý có tin đã hết hạn vào roomMap
          tinDangList.forEach((tin) => {
            const key = String(tin.MaPhong);
            const belongsToManager =
              managedKhuIds.size === 0 || managedKhuIds.has(Number(tin.MaKhu));
            if (belongsToManager && isTinHetHan(tin) && !roomMap.has(key)) {
              roomMap.set(key, buildRoomOptionFromTin(tin));
            }
          });

          rawRooms = Array.from(roomMap.values());
        }

        // Tập hợp các phòng có tin đã hết hạn
        const phongCoTinHetHanSet = new Set(
          tinDangList
            .filter((tin) => isTinHetHan(tin))
            .map((tin) => String(tin.MaPhong))
        );

        // Chỉ chặn những phòng đang có tin DangHienThi và còn hạn
        const phongDangCoTinHieuLucSet = new Set(
          tinDangList
            .filter((tin) => isTinDangHienThiConHan(tin))
            .map((tin) => String(tin.MaPhong))
        );

        const rooms = rawRooms
          .filter((room) => {
            const maPhongStr = String(room.MaPhong);
            // Nếu phòng đã có một tin mới đang hiển thị còn hiệu lực thì không hiện nữa
            if (phongDangCoTinHieuLucSet.has(maPhongStr)) {
              return false;
            }

            const r = room as PhongSelectOption & {
              TrangThaiPhong?: string | null;
            };
            const trangThaiPhong = r.TrangThai ?? r.TrangThaiPhong;

            // Hiển thị phòng nếu phòng đang trống/bảo trì HOẶC phòng có tin cũ đã hết hạn
            return (
              isPhongConTrong(trangThaiPhong) ||
              phongCoTinHetHanSet.has(maPhongStr)
            );
          })
          .sort(
            (a, b) =>
              Number(a.MaKhu || 0) - Number(b.MaKhu || 0) ||
              Number(a.MaPhong) - Number(b.MaPhong)
          );

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
  }, [getStoredUser, pathname, searchParams, showError]);

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
              const { maND } = getStoredUser();
              const response = await fetch(`${API_BASE_URL}/tin-dang`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                  MaPhong: Number(payload.MaPhong),
                  Gia: payload.Gia,
                  TieuDe: payload.TieuDe,
                  MoTa: payload.MoTa,
                  NgayHetHan: payload.NgayHetHan,
                  TrangThai: payload.TrangThai || "DangHienThi",
                  MaND: payload.MaND || maND,
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