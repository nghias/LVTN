"use client";

import React, {
  useState,
  useEffect,
  useLayoutEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import ProtectedRoute from "../../../../components/common/ProtectedRoute";
import QuanLyHeader from "../../../../components/layout/QuanLyHeader";
import { useAlertModal } from "../../../../components/common/AlertModalProvider";
import type { TrangThaiTin, PhongSelectOption } from "../page";

interface TinDangFormData {
  MaPhong: string;
  Gia: string;
  MaND: number;
  TieuDe: string;
  MoTa: string;
  NgayHetHan: string;
  TrangThai: TrangThaiTin;
}

interface TinDangItemBrief {
  MaTin: number;
  MaPhong: number;
  TrangThai?: string | null;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// Kiểm tra phòng có đang ở trạng thái còn trống hay không
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

export default function ThemTinDangPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { showSuccess, showError } = useAlertModal();

  // Ref quản lý vị trí con trỏ của ô nhập giá niêm yết
  const giaInputRef = useRef<HTMLInputElement | null>(null);
  const pendingCaretDigitIndexRef = useRef<number | null>(null);

  // Đường dẫn quay về trang danh sách tinDang
  const baseTinDangPath = useMemo(() => {
    return pathname.replace(/\/them\/?$/, "");
  }, [pathname]);

  const [phongOptions, setPhongOptions] = useState<PhongSelectOption[]>([]);
  const [loadingPhong, setLoadingPhong] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [formData, setFormData] = useState<TinDangFormData>({
    MaPhong: "",
    Gia: "",
    MaND: 1,
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

        // Tập hợp các phòng đã có tin đăng (đã có trạng thái tin)
        const phongDaCoTrangThaiTinSet = new Set(
          tinDangList
            .filter(
              (tin) =>
                tin.TrangThai !== undefined &&
                tin.TrangThai !== null &&
                String(tin.TrangThai).trim() !== "",
            )
            .map((tin) => String(tin.MaPhong)),
        );

        // Chỉ giữ lại những phòng CÒN TRỐNG và CHƯA CÓ TRẠNG THÁI TIN
        const rooms = rawRooms.filter((room) => {
          const conTrong = isPhongConTrong(room.TrangThai);
          const chuaCoTrangThaiTin = !phongDaCoTrangThaiTinSet.has(
            String(room.MaPhong),
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
          (r) => String(r.MaPhong) === String(defaultRoomId),
        );

        setFormData((prev) => ({
          ...prev,
          MaND: maND,
          MaPhong: defaultRoomId,
          Gia:
            defaultRoom?.Gia !== undefined
              ? String(Math.round(Number(defaultRoom.Gia)))
              : "",
        }));
      } catch (err: unknown) {
        if (err instanceof Error) {
          showError(err.message);
        } else {
          showError("Không thể kết nối đến máy chủ.");
        }
      } finally {
        setLoadingPhong(false);
      }
    };

    fetchRooms();
  }, [getStoredMaND, searchParams, showError]);

  const selectedRoomInfo = useMemo(() => {
    return phongOptions.find(
      (p) => String(p.MaPhong) === String(formData.MaPhong),
    );
  }, [phongOptions, formData.MaPhong]);

  // Giá niêm yết gốc của phòng đang chọn
  const giaGoc = useMemo(() => {
    if (!selectedRoomInfo || selectedRoomInfo.Gia === undefined) return "";
    return String(Math.round(Number(selectedRoomInfo.Gia)));
  }, [selectedRoomInfo]);

  // Khi đổi phòng, tự động điền giá hiện tại của phòng đó vào ô Giá niêm yết
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
          : "",
    }));
  };

  // Cập nhật chuỗi giá kèm lưu lại vị trí chữ số của con trỏ
  const updateGiaWithCaret = (
    nextRawDigits: string,
    caretDigitIndex: number,
  ) => {
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
    if (
      e.key === "Backspace" &&
      start === end &&
      start > 0 &&
      val[start - 1] === "."
    ) {
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
    if (
      e.key === "Delete" &&
      start === end &&
      start < val.length &&
      val[start] === "."
    ) {
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

  // Khi rời khỏi ô nhập giá: chuẩn hóa số 0 ở đầu hoặc khôi phục giá gốc của phòng nếu xóa trắng
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

    try {
      setIsSubmitting(true);

      const response = await fetch(`${API_BASE_URL}/tin-dang`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          MaPhong: Number(formData.MaPhong),
          Gia: giaNum,
          MaND: formData.MaND || getStoredMaND(),
          TieuDe: formData.TieuDe.trim(),
          MoTa: formData.MoTa.trim() || null,
          NgayHetHan: formData.NgayHetHan || null,
          TrangThai: formData.TrangThai,
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Không thể đăng tin mới.");
      }

      showSuccess("Đã đăng tin tìm khách thuê mới thành công!");
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

  return (
    <ProtectedRoute allowedRoles={["ChuTro", "QuanLy"]}>
      {(user) => (
        <div className="flex-1 flex flex-col bg-white text-slate-900">
          <QuanLyHeader user={user} />

          <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
            {/* Thanh tiêu đề & Nút quay lại */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                  Đăng Tin Tìm Khách Thuê Mới
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Điền thông tin chi tiết và điều chỉnh giá niêm yết để giới
                  thiệu phòng trọ đến khách tìm phòng
                </p>
              </div>

              <button
                type="button"
                onClick={() => router.push(baseTinDangPath)}
                className="self-start sm:self-auto px-4 py-2.5 rounded-full border border-slate-300 bg-white hover:bg-slate-100 text-xs font-bold text-slate-700 transition cursor-pointer"
              >
                Quay lại
              </button>
            </div>

            {loadingPhong ? (
              <div className="py-16 text-center text-sm text-slate-500">
                Đang tải danh sách phòng trọ...
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                  <h2 className="text-sm font-bold text-slate-900">
                    Thông tin bài đăng
                  </h2>
                </div>

                <form onSubmit={handleSubmitForm} className="p-6 space-y-5">
                  {formError && (
                    <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs font-bold text-red-600">
                      {formError}
                    </div>
                  )}

                  {phongOptions.length === 0 && (
                    <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs font-bold text-amber-700">
                      Hiện tại không còn phòng trống nào chưa đăng tin trong cơ
                      sở của bạn.
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
                        disabled={isSubmitting || phongOptions.length === 0}
                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
                      >
                        <option value="">-- Chọn phòng trong cơ sở --</option>
                        {phongOptions.map((p) => (
                          <option key={p.MaPhong} value={String(p.MaPhong)}>
                            Phòng {p.TenPhong} - {p.TenKhu} (
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
                          Phòng {selectedRoomInfo.TenPhong} - Diện tích:{" "}
                          {Number(selectedRoomInfo.DienTich)} m²
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-slate-500 block">
                          Giá niêm yết công khai
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700">
                        Ngày hết hạn hiển thị
                      </label>
                      <input
                        type="date"
                        disabled={isSubmitting}
                        value={formData.NgayHetHan}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            NgayHetHan: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
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
                          setFormData({
                            ...formData,
                            TrangThai: e.target.value as TrangThaiTin,
                          })
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
                      disabled={isSubmitting || phongOptions.length === 0}
                      className="px-6 py-2.5 rounded-full bg-[#00FFCC] hover:bg-[#00e6b8] disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 border border-teal-300 text-xs font-bold shadow-xs transition cursor-pointer"
                    >
                      {isSubmitting ? "Đang lưu..." : "Đăng Tin Ngay"}
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