"use client";

import React, {
  useState,
  useEffect,
  useLayoutEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useRouter, usePathname, useParams } from "next/navigation";
import ProtectedRoute from "../../../../../components/common/ProtectedRoute";
import QuanLyHeader from "../../../../../components/layout/QuanLyHeader";
import { useAlertModal } from "../../../../../components/common/AlertModalProvider";
import type { TrangThaiTin, TinDangItem, PhongSelectOption } from "../../page";

interface TinDangFormData {
  MaPhong: string;
  Gia: string;
  MaND: number;
  TieuDe: string;
  MoTa: string;
  NgayHetHan: string;
  TrangThai: TrangThaiTin;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// Định dạng chuỗi số sang dạng có dấu chấm phân cách hàng nghìn (giữ nguyên số 0 đứng đầu khi đang sửa)
function formatGiaInput(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// Tính vị trí con trỏ trong chuỗi đã có dấu chấm dựa theo số lượng chữ số đứng trước con trỏ
function getCaretPositionByDigitIndex(
  formatted: string,
  digitIndex: number,
): number {
  if (digitIndex <= 0) return 0;
  let count = 0;
  for (let i = 0; i < formatted.length; i++) {
    if (/\d/.test(formatted[i])) {
      count++;
      if (count === digitIndex) {
        return i + 1;
      }
    }
  }
  return formatted.length;
}

// Lấy chuỗi ngày hiện tại YYYY-MM-DD theo giờ địa phương
function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Chuyển đổi chuỗi ngày bất kỳ (từ DB hoặc input) về chuẩn YYYY-MM-DD theo giờ địa phương
function toLocalDateString(dateInput?: string | null): string {
  if (!dateInput) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput.trim())) {
    return dateInput.trim();
  }
  const parsed = new Date(dateInput);
  if (isNaN(parsed.getTime())) return "";
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Định dạng chuỗi YYYY-MM-DD sang DD/MM/YYYY để hiển thị trong thông báo
function formatDisplayDate(ymd: string): string {
  if (!ymd) return "chưa chọn";
  const parts = ymd.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return ymd;
}

export default function SuaTinDangPage() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const maTin = Number(params?.maTin);

  const { showSuccess, showError } = useAlertModal();

  // Ref quản lý vị trí con trỏ của ô nhập giá niêm yết
  const giaInputRef = useRef<HTMLInputElement | null>(null);
  const pendingCaretDigitIndexRef = useRef<number | null>(null);

  // Đường dẫn quay về trang danh sách tinDang
  const baseTinDangPath = useMemo(() => {
    return pathname.replace(/\/sua\/[^/]+\/?$/, "");
  }, [pathname]);

  const [phongOptions, setPhongOptions] = useState<PhongSelectOption[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [notFound, setNotFound] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Lưu trạng thái ban đầu của tin đăng để phát hiện khi chuyển từ HetHan -> DangHienThi
  const [initialTrangThai, setInitialTrangThai] =
    useState<TrangThaiTin>("DangHienThi");

  const [formData, setFormData] = useState<TinDangFormData>({
    MaPhong: "",
    Gia: "",
    MaND: 0,
    TieuDe: "",
    MoTa: "",
    NgayHetHan: "",
    TrangThai: "DangHienThi",
  });

  // Khôi phục chính xác vị trí con trỏ sau mỗi lần giá trị Gia thay đổi
  useLayoutEffect(() => {
    if (pendingCaretDigitIndexRef.current === null || !giaInputRef.current) {
      return;
    }
    const formatted = formatGiaInput(formData.Gia);
    const nextPos = getCaretPositionByDigitIndex(
      formatted,
      pendingCaretDigitIndexRef.current,
    );
    giaInputRef.current.setSelectionRange(nextPos, nextPos);
    pendingCaretDigitIndexRef.current = null;
  }, [formData.Gia]);

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
          (r) => Number(r.MaPhong) === Number(targetTin.MaPhong),
        );
        const initialGia =
          matchedRoom?.Gia !== undefined
            ? String(Math.round(Number(matchedRoom.Gia)))
            : (targetTin as { Gia?: number | string }).Gia !== undefined
              ? String(
                  Math.round(
                    Number((targetTin as { Gia?: number | string }).Gia),
                  ),
                )
              : "";

        setInitialTrangThai(targetTin.TrangThai);

        setFormData({
          MaPhong: String(targetTin.MaPhong),
          Gia: initialGia,
          MaND: targetTin.MaND || maND,
          TieuDe: targetTin.TieuDe,
          MoTa: targetTin.MoTa || "",
          NgayHetHan: toLocalDateString(targetTin.NgayHetHan),
          TrangThai: targetTin.TrangThai,
        });
      } catch (err: unknown) {
        if (err instanceof Error) {
          showError(err.message);
        } else {
          showError("Không thể kết nối đến máy chủ.");
        }
      } finally {
        setLoading(false);
      }
    };

    if (maTin) {
      fetchTinDetail();
    }
  }, [maTin, getStoredMaND, showError]);

  // Thông tin phòng đang chọn
  const selectedRoomInfo = useMemo(() => {
    return phongOptions.find(
      (p) => String(p.MaPhong) === String(formData.MaPhong),
    );
  }, [phongOptions, formData.MaPhong]);

  // Giá niêm yết gốc của phòng đang chọn (dùng để tự động khôi phục khi xóa trắng)
  const giaGoc = useMemo(() => {
    if (!selectedRoomInfo || selectedRoomInfo.Gia === undefined) return "";
    return String(Math.round(Number(selectedRoomInfo.Gia)));
  }, [selectedRoomInfo]);

  // So sánh trực tiếp ngày hết hạn với hàm getTodayDateString()
  const isExpiredDateWarning = useMemo(() => {
    if (formData.TrangThai !== "DangHienThi") return false;

    const currentToday = getTodayDateString();
    const selectedDate = toLocalDateString(formData.NgayHetHan);

    if (selectedDate && selectedDate <= currentToday) {
      return true;
    }

    if (initialTrangThai === "HetHan" && !selectedDate) {
      return true;
    }

    return false;
  }, [formData.TrangThai, formData.NgayHetHan, initialTrangThai]);

  // Khi đổi phòng trong select, tự động lấy giá niêm yết của phòng mới
  const handlePhongChange = (newMaPhong: string) => {
    const foundRoom = phongOptions.find(
      (p) => String(p.MaPhong) === String(newMaPhong),
    );
    pendingCaretDigitIndexRef.current = null;
    setFormData((prev) => ({
      ...prev,
      MaPhong: newMaPhong,
      Gia:
        foundRoom?.Gia !== undefined
          ? String(Math.round(Number(foundRoom.Gia)))
          : prev.Gia,
    }));
  };

  // Cập nhật chuỗi giá kèm lưu lại vị trí chữ số của con trỏ
  const updateGiaWithCaret = (nextRawDigits: string, caretDigitIndex: number) => {
    const cleaned = nextRawDigits.replace(/\D/g, "").slice(0, 12);
    pendingCaretDigitIndexRef.current = Math.max(
      0,
      Math.min(caretDigitIndex, cleaned.length),
    );

    setFormData((prev) => {
      if (prev.Gia === cleaned && giaInputRef.current) {
        const formatted = formatGiaInput(cleaned);
        const pos = getCaretPositionByDigitIndex(
          formatted,
          pendingCaretDigitIndexRef.current ?? formatted.length,
        );
        giaInputRef.current.setSelectionRange(pos, pos);
        pendingCaretDigitIndexRef.current = null;
      }
      return { ...prev, Gia: cleaned };
    });
  };

  // Xử lý khi gõ hoặc dán số vào ô Giá niêm yết
  const handleGiaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputEl = e.target;
    const selectionStart = inputEl.selectionStart ?? inputEl.value.length;
    const digitsBeforeCursor = inputEl.value
      .slice(0, selectionStart)
      .replace(/\D/g, "").length;
    const rawDigits = inputEl.value.replace(/\D/g, "").slice(0, 12);

    updateGiaWithCaret(rawDigits, digitsBeforeCursor);
  };

  // Xử lý phím Backspace/Delete qua dấu chấm và phím mũi tên Lên/Xuống tăng giảm theo từng hàng
  const handleGiaKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const inputEl = e.currentTarget;
    const start = inputEl.selectionStart ?? 0;
    const end = inputEl.selectionEnd ?? 0;
    const val = inputEl.value;

    // 1. Khi nhấn Backspace ngay sau dấu chấm (VD: 3.|500.000) -> xóa chữ số đứng trước dấu chấm
    if (e.key === "Backspace" && start === end && start > 0 && val[start - 1] === ".") {
      e.preventDefault();
      const digitsBeforeDot = val.slice(0, start - 1).replace(/\D/g, "");
      if (digitsBeforeDot.length === 0) return;
      const deleteIdx = digitsBeforeDot.length - 1;
      const allDigits = val.replace(/\D/g, "");
      const nextRaw =
        allDigits.slice(0, deleteIdx) + allDigits.slice(deleteIdx + 1);
      updateGiaWithCaret(nextRaw, deleteIdx);
      return;
    }

    // 2. Khi nhấn Delete ngay trước dấu chấm (VD: 3|.500.000) -> xóa chữ số đứng sau dấu chấm
    if (e.key === "Delete" && start === end && start < val.length && val[start] === ".") {
      e.preventDefault();
      const deleteIdx = val.slice(0, start).replace(/\D/g, "").length;
      const allDigits = val.replace(/\D/g, "");
      if (deleteIdx >= allDigits.length) return;
      const nextRaw =
        allDigits.slice(0, deleteIdx) + allDigits.slice(deleteIdx + 1);
      updateGiaWithCaret(nextRaw, deleteIdx);
      return;
    }

    // 3. Nhấn phím Mũi tên Lên / Xuống để tăng/giảm trực tiếp tại đúng hàng đang đặt con trỏ (đơn vị -> triệu)
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      const allDigits = val.replace(/\D/g, "");
      const currentNum = Number(allDigits || 0);
      const rawDigitsToRight = val.slice(start).replace(/\D/g, "").length;
      const digitsToRight =
        allDigits.length > 0
          ? Math.min(rawDigitsToRight, allDigits.length - 1)
          : 0;
      const step = Math.pow(10, digitsToRight);
      const delta = e.key === "ArrowUp" ? step : -step;
      const nextNum = Math.max(0, currentNum + delta);
      const nextRaw = nextNum > 0 ? String(nextNum).slice(0, 12) : "0";
      const nextCaretDigitIdx = Math.max(0, nextRaw.length - digitsToRight);
      updateGiaWithCaret(nextRaw, nextCaretDigitIdx);
    }
  };

  // Khi rời khỏi ô nhập giá: chuẩn hóa số 0 ở đầu hoặc khôi phục giá cũ nếu xóa trắng
  const handleGiaBlur = () => {
    const currentNum = Number(formData.Gia);
    if (!formData.Gia.trim() || isNaN(currentNum) || currentNum <= 0) {
      if (giaGoc) {
        setFormData((prev) => ({ ...prev, Gia: giaGoc }));
      } else {
        setFormData((prev) => ({ ...prev, Gia: "" }));
      }
    } else {
      const normalized = String(Math.round(currentNum));
      if (normalized !== formData.Gia) {
        setFormData((prev) => ({ ...prev, Gia: normalized }));
      }
    }
  };

  // Khi đổi trạng thái hiển thị: nếu chọn "HetHan" thì tự động cập nhật NgayHetHan thành getTodayDateString()
  const handleTrangThaiChange = (newStatus: TrangThaiTin) => {
    const currentToday = getTodayDateString();
    setFormData((prev) => ({
      ...prev,
      TrangThai: newStatus,
      NgayHetHan: newStatus === "HetHan" ? currentToday : prev.NgayHetHan,
    }));
    setFormError(null);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.MaPhong) {
      setFormError("Vui lòng chọn phòng trọ cần đăng tin.");
      return;
    }

    const parsedInputGia = Number(formData.Gia);
    const finalGiaStr =
      formData.Gia.trim() && !isNaN(parsedInputGia) && parsedInputGia > 0
        ? String(Math.round(parsedInputGia))
        : giaGoc;
    const giaNum = Number(finalGiaStr);
    if (!finalGiaStr || isNaN(giaNum) || giaNum <= 0) {
      setFormError("Vui lòng nhập giá niêm yết phòng hợp lệ (lớn hơn 0).");
      return;
    }

    if (!formData.TieuDe.trim()) {
      setFormError("Vui lòng nhập tiêu đề tin đăng.");
      return;
    }
    if (formData.TieuDe.trim().length > 200) {
      setFormError("Tiêu đề không được vượt quá 200 ký tự.");
      return;
    }

    const currentToday = getTodayDateString();
    const selectedDate = toLocalDateString(formData.NgayHetHan);

    if (
      formData.TrangThai === "DangHienThi" &&
      ((selectedDate && selectedDate <= currentToday) ||
        (initialTrangThai === "HetHan" && !selectedDate))
    ) {
      setFormError(
        `Bạn đang chọn hiển thị công khai nhưng ngày hết hạn (${formatDisplayDate(selectedDate)}) nhỏ hơn hoặc bằng ngày hiện tại (${formatDisplayDate(currentToday)}). Vui lòng chọn ngày hết hạn lớn hơn ngày hiện tại!`,
      );
      return;
    }

    const finalNgayHetHan =
      formData.TrangThai === "HetHan" ? currentToday : selectedDate || null;

    try {
      setIsSubmitting(true);

      const response = await fetch(`${API_BASE_URL}/tin-dang/${maTin}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          MaPhong: Number(formData.MaPhong),
          Gia: giaNum,
          MaND: formData.MaND,
          TieuDe: formData.TieuDe.trim(),
          MoTa: formData.MoTa.trim() || null,
          NgayHetHan: finalNgayHetHan,
          TrangThai: formData.TrangThai,
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Không thể cập nhật bài đăng.");
      }

      showSuccess(`Đã cập nhật tin đăng #${maTin} và giá phòng thành công!`);
      router.push(baseTinDangPath);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setFormError(err.message);
      } else {
        setFormError("Đã xảy ra lỗi khi gửi dữ liệu lên máy chủ.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Giá thực tế sẽ áp dụng (nếu đang xóa trống thì hiển thị giá cũ của phòng)
  const parsedGia = Number(formData.Gia);
  const effectiveGia =
    formData.Gia.trim() && !isNaN(parsedGia) && parsedGia > 0
      ? parsedGia
      : Number(giaGoc || 0);
  const isGiaChanged = Boolean(
    giaGoc &&
      formData.Gia.trim() &&
      !isNaN(parsedGia) &&
      parsedGia > 0 &&
      Math.round(parsedGia) !== Math.round(Number(giaGoc)),
  );

  const todayDisplay = formatDisplayDate(getTodayDateString());
  const selectedDateDisplay = formatDisplayDate(
    toLocalDateString(formData.NgayHetHan),
  );

  return (
    <ProtectedRoute allowedRoles={["ChuTro", "QuanLy"]}>
      {(user) => (
        <div className="flex-1 flex flex-col bg-white text-slate-900">
          <QuanLyHeader user={user} />

          <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
            {/* Thanh tiêu đề & Nút điều hướng */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                  Chỉnh Sửa Tin Đăng #{maTin}
                </h1>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    router.push(`${baseTinDangPath}/chiTiet/${maTin}`)
                  }
                  className="px-4 py-2.5 rounded-full border border-slate-300 bg-white hover:bg-slate-100 text-xs font-bold text-slate-700 transition cursor-pointer"
                >
                  Xem chi tiết
                </button>
                <button
                  type="button"
                  onClick={() => router.push(baseTinDangPath)}
                  className="px-4 py-2.5 rounded-full border border-slate-300 bg-white hover:bg-slate-100 text-xs font-bold text-slate-700 transition cursor-pointer"
                >
                  Quay lại
                </button>
              </div>
            </div>

            {loading ? (
              <div className="py-16 text-center text-sm text-slate-500">
                Đang tải dữ liệu tin đăng #{maTin}...
              </div>
            ) : notFound ? (
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
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                  <h2 className="text-sm font-bold text-slate-900">
                    Biểu mẫu cập nhật tin đăng #{maTin}
                  </h2>
                </div>

                <form onSubmit={handleSubmitForm} className="p-6 space-y-5">
                  {formError && (
                    <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs font-bold text-red-600">
                      {formError}
                    </div>
                  )}

                  {/* Chọn Phòng trọ (`MaPhong`) & Giá niêm yết (`Gia`) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700">
                        Chọn phòng cần đăng tin{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.MaPhong}
                        onChange={(e) => handlePhongChange(e.target.value)}
                        disabled={isSubmitting}
                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
                      >
                        <option value="">-- Chọn phòng trong cơ sở --</option>
                        {phongOptions.map((p) => (
                          <option key={p.MaPhong} value={String(p.MaPhong)}>
                            {p.TenKhu} - Phòng {p.TenPhong} (
                            {Number(p.Gia).toLocaleString("vi-VN")}đ -{" "}
                            {p.DienTich}m²)
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Ô chỉnh sửa Giá niêm yết từ hàng đơn vị đến hàng triệu */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold text-slate-700">
                          Giá niêm yết phòng (VNĐ/tháng){" "}
                          <span className="text-red-500">*</span>
                        </label>
                        {isGiaChanged && (
                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              pendingCaretDigitIndexRef.current = null;
                              setFormData((prev) => ({ ...prev, Gia: giaGoc }));
                            }}
                            className="text-[11px] font-bold text-teal-700 hover:text-teal-900 underline cursor-pointer"
                          >
                            ↺ Về giá cũ (
                            {Number(giaGoc).toLocaleString("vi-VN")}đ)
                          </button>
                        )}
                      </div>

                      <div className="relative">
                        <input
                          ref={giaInputRef}
                          type="text"
                          inputMode="numeric"
                          disabled={isSubmitting || !formData.MaPhong}
                          value={formatGiaInput(formData.Gia)}
                          onChange={handleGiaChange}
                          onKeyDown={handleGiaKeyDown}
                          onBlur={handleGiaBlur}
                          placeholder={
                            giaGoc
                              ? `Mặc định: ${Number(giaGoc).toLocaleString("vi-VN")}đ`
                              : "VD: 3.500.000"
                          }
                          className="w-full pl-4 pr-16 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-teal-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
                        />
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                          đ/tháng
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Khung xem nhanh thông tin phòng đã chọn */}
                  {selectedRoomInfo && (
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-900 text-[#00FFCC]">
                          {selectedRoomInfo.TenKhu}
                        </span>
                        <p className="text-sm font-bold text-slate-900 pt-1">
                          Phòng {selectedRoomInfo.TenPhong} • Diện tích:{" "}
                          {Number(selectedRoomInfo.DienTich)} m²
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-slate-500 block">
                          {isGiaChanged
                            ? "Giá niêm yết mới sau cập nhật"
                            : "Giá niêm yết hiện tại"}
                        </span>
                        <div className="flex items-baseline justify-end gap-2">
                          {isGiaChanged && (
                            <span className="text-xs text-slate-400 line-through">
                              {Number(giaGoc).toLocaleString("vi-VN")}đ
                            </span>
                          )}
                          <span className="text-base font-extrabold text-teal-700">
                            {effectiveGia.toLocaleString("vi-VN")} đ / tháng
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tiêu đề tin đăng (`TieuDe`) */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Tiêu đề bài đăng <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      disabled={isSubmitting}
                      value={formData.TieuDe}
                      onChange={(e) =>
                        setFormData({ ...formData, TieuDe: e.target.value })
                      }
                      placeholder="VD: Cho thuê phòng Studio có gác lửng, máy lạnh..."
                      className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
                    />
                  </div>

                  {/* Ngày hết hạn (`NgayHetHan`) & Trạng thái (`TrangThai`) */}
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-700">
                          Ngày hết hạn hiển thị
                        </label>
                        <input
                          type="date"
                          disabled={isSubmitting}
                          value={formData.NgayHetHan}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              NgayHetHan: e.target.value,
                            });
                            setFormError(null);
                          }}
                          className={`w-full px-4 py-2.5 bg-white border rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 ${
                            isExpiredDateWarning
                              ? "border-amber-500 ring-2 ring-amber-200 focus:ring-amber-400"
                              : "border-slate-300 focus:ring-[#00FFCC]"
                          }`}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-700">
                          Trạng thái hiển thị
                        </label>
                        <select
                          disabled={isSubmitting}
                          value={formData.TrangThai}
                          onChange={(e) =>
                            handleTrangThaiChange(
                              e.target.value as TrangThaiTin,
                            )
                          }
                          className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
                        >
                          <option value="DangHienThi">
                            Đang hiển thị công khai
                          </option>
                          <option value="DaAn">Tạm ẩn bài đăng</option>
                          <option value="HetHan">Đã hết hạn</option>
                        </select>
                      </div>
                    </div>

                    {isExpiredDateWarning && (
                      <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 space-y-2.5">
                        <p className="text-xs font-bold leading-relaxed">
                          ⚠️ Lưu ý: Trạng thái tin đang là{" "}
                          <span className="underline">
                            Đang hiển thị công khai
                          </span>{" "}
                          nhưng ngày hết hạn hiển thị ({selectedDateDisplay})
                          đang nhỏ hơn hoặc bằng ngày hiện tại ({todayDisplay}).
                          Vui lòng chọn ngày hết hạn lớn hơn ngày hiện tại!
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Mô tả chi tiết (`MoTa`) */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Mô tả chi tiết tiện ích &amp; quy định
                    </label>
                    <textarea
                      rows={5}
                      disabled={isSubmitting}
                      value={formData.MoTa}
                      onChange={(e) =>
                        setFormData({ ...formData, MoTa: e.target.value })
                      }
                      placeholder="Nhập mô tả về giờ giấc, chỗ để xe, nội thất đi kèm..."
                      className="w-full p-3.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
                    />
                  </div>

                  {/* Cụm nút Lưu / Hủy */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => router.push(baseTinDangPath)}
                      className="px-5 py-2.5 rounded-full border border-slate-300 bg-white hover:bg-slate-100 text-xs font-bold text-slate-700 transition cursor-pointer"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-6 py-2.5 rounded-full bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 border border-teal-300 text-xs font-bold shadow-xs transition cursor-pointer"
                    >
                      {isSubmitting ? "Đang lưu..." : "Lưu Thay Đổi"}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </main>
        </div>
      )}
    </ProtectedRoute>
  );
}