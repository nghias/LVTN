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

// Kiểu dữ liệu payload sau khi chuẩn hóa từ TinDangForm onSubmit
interface TinDangSubmitPayload {
  MaPhong: number | string;
  Gia: number | string;
  MaND: number;
  TieuDe: string;
  MoTa: string | null;
  NgayHetHan?: string | null;
  TrangThai: TrangThaiTin;
}

// Lấy chuỗi ngày hiện tại theo giờ địa phương YYYY-MM-DD
function getTodayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Cộng thêm 1 tuần (+7 ngày) tính từ ngày hiện tại (hoặc ngày hết hạn nếu lớn hơn hiện tại)
function getDatePlusOneWeek(currentExpiryStr?: string): string {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  let baseDate = now;
  if (currentExpiryStr) {
    const parsed = new Date(`${currentExpiryStr}T00:00:00`);
    if (!isNaN(parsed.getTime()) && parsed > now) {
      baseDate = parsed;
    }
  }

  const nextWeek = new Date(baseDate);
  nextWeek.setDate(nextWeek.getDate() + 7);

  const y = nextWeek.getFullYear();
  const m = String(nextWeek.getMonth() + 1).padStart(2, "0");
  const d = String(nextWeek.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Định dạng YYYY-MM-DD sang DD/MM/YYYY để hiển thị trong thông báo
function formatDateVN(dateStr?: string): string {
  if (!dateStr) return "Chưa đặt";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

export default function SuaTinDangPage() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const maTin = Number(params?.maTin);
  const { showSuccess, showError, showConfirm } = useAlertModal();

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
  // Dùng formResetKey để đồng bộ lại dữ liệu bên trong TinDangForm khi tự động +1 tuần
  const [formResetKey, setFormResetKey] = useState<number>(0);

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

  // Hàm gửi request PUT cập nhật tin đăng lên Backend
  const submitUpdateTinDang = async (
    payload: TinDangSubmitPayload,
    autoExtendedDate?: string
  ) => {
    try {
      setIsSubmitting(true);
      const response = await fetch(`${API_BASE_URL}/tin-dang/${maTin}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Không thể cập nhật bài đăng.");
      }

      if (autoExtendedDate) {
        showSuccess(
          `Đã tự động gia hạn thêm 1 tuần (đến ${formatDateVN(
            autoExtendedDate
          )}) và hiển thị tin đăng thành công!`
        );
      } else {
        showSuccess(
          `Đã cập nhật tin đăng và giá phòng thành công!`
        );
      }

      router.push(baseTinDangPath);
    } catch (err: unknown) {
      if (err instanceof Error) setServerError(err.message);
      else setServerError("Đã xảy ra lỗi khi gửi dữ liệu lên máy chủ.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Kiểm tra ngày hết hạn hiện tại có đang nhỏ hơn hôm nay không
  const todayStr = getTodayDateString();
  const isCurrentExpiryPast =
    Boolean(initialData.NgayHetHan) && initialData.NgayHetHan < todayStr;

  // Xử lý bấm nút gia hạn nhanh +1 tuần trên Banner
  const handleQuickExtendOneWeek = () => {
    const newExpiry = getDatePlusOneWeek(initialData.NgayHetHan);
    setInitialData((prev) => ({
      ...prev,
      NgayHetHan: newExpiry,
      TrangThai: "DangHienThi",
    }));
    setFormResetKey((prev) => prev + 1);
    showSuccess(
      `Đã cộng thêm 1 tuần vào ngày hết hạn (${formatDateVN(
        newExpiry
      )}) và chuyển trạng thái sang Đang hiển thị!`
    );
  };

  return (
    <FormPageLayout
      allowedRoles={["ChuTro", "QuanLy"]}
      backHref={baseTinDangPath}
      backLabel="Quay lại danh sách Tin đăng"
      title={`Chỉnh Sửa Tin Đăng`}
      maxWidth="max-w-3xl"
      loading={loading}
      loadingText={`Đang tải dữ liệu tin đăng...`}
    >
      {() =>
        notFound ? (
          <div className="py-16 text-center bg-slate-50 rounded-2xl border border-slate-200 p-6 space-y-3">
            <p className="text-base font-bold text-slate-700">
              Không tìm thấy tin đăng!
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
          <div className="space-y-4">
            {/* Banner cảnh báo nếu tin đang Ẩn / Hết hạn mà Ngày hết hạn < Ngày hiện tại */}
            {isCurrentExpiryPast && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-amber-900">
                    ⚠️ Ngày hết hạn của tin đăng ({formatDateVN(initialData.NgayHetHan)}) nhỏ hơn ngày hiện tại ({formatDateVN(todayStr)})
                  </p>
                  <p className="text-xs text-amber-800">
                    Nếu chuyển từ trạng thái <strong>Đã ẩn</strong> sang{" "}
                    <strong>Đang hiển thị</strong>, bạn cần gia hạn ngày hết hạn
                    để tin không bị ẩn tự động.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleQuickExtendOneWeek}
                  className="shrink-0 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition cursor-pointer shadow-2xs"
                >
                  + Tự động cộng 1 tuần
                </button>
              </div>
            )}

            <TinDangForm
              key={formResetKey}
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
                const currentToday = getTodayDateString();
                const normalizedPayloadExpiry = toLocalDateString(
                  payload.NgayHetHan
                );

                // Kiểm tra khi chuyển từ "DaAn" (hoặc "HetHan") sang "DangHienThi"
                // hoặc bất kỳ lúc nào lưu ở trạng thái "DangHienThi" mà NgayHetHan < ngày hiện tại
                const isSwitchingToActive =
                  payload.TrangThai === "DangHienThi" &&
                  (initialTrangThai === "DaAn" ||
                    initialTrangThai === "HetHan" ||
                    payload.TrangThai === "DangHienThi");

                const isExpiredDate =
                  Boolean(normalizedPayloadExpiry) &&
                  normalizedPayloadExpiry < currentToday;

                if (isSwitchingToActive && isExpiredDate) {
                  const newExpiryDate = getDatePlusOneWeek(
                    normalizedPayloadExpiry
                  );

                  showConfirm(
                    `Tin đăng đang được chuyển sang trạng thái "Đang hiển thị" nhưng ngày hết hạn (${formatDateVN(
                      normalizedPayloadExpiry
                    )}) nhỏ hơn ngày hiện tại (${formatDateVN(
                      currentToday
                    )}).\n\nBạn có muốn hệ thống tự động cộng thêm 1 tuần vào ngày hết hạn (đến ngày ${formatDateVN(
                      newExpiryDate
                    )}) và lưu ngay không?`,
                    "Cảnh báo ngày hết hạn đã qua",
                    async () => {
                      const updatedPayload: TinDangSubmitPayload = {
                        ...payload,
                        NgayHetHan: newExpiryDate,
                        TrangThai: "DangHienThi",
                      };

                      // Đồng bộ lại state trên form (ép về kiểu string theo TinDangFormData)
                      setInitialData({
                        MaPhong: String(payload.MaPhong),
                        Gia: String(payload.Gia),
                        MaND: payload.MaND,
                        TieuDe: payload.TieuDe,
                        MoTa: payload.MoTa ?? "",
                        NgayHetHan: newExpiryDate,
                        TrangThai: "DangHienThi",
                      });
                      setFormResetKey((prev) => prev + 1);

                      await submitUpdateTinDang(updatedPayload, newExpiryDate);
                    }
                  );
                  return;
                }

                await submitUpdateTinDang(payload);
              }}
            />
          </div>
        )
      }
    </FormPageLayout>
  );
}