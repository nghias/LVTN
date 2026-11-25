// client/src/app/datPhong/[maPhong]/page.tsx
'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import HomeHeader from '@/components/layout/homeHeader';
import AppFooter from '@/components/layout/AppFooter';
import { datPhongService } from '@/services/datPhong.service';

const formatVND = (amount: number) =>
  `${Math.round(amount || 0).toLocaleString('vi-VN')}đ`;

// Khung giờ hành chính, phút chỉ chọn :00 hoặc :30
const MORNING_SLOTS = [
  '08:00',
  '08:30',
  '09:00',
  '09:30',
  '10:00',
  '10:30',
  '11:00',
  '11:30',
] as const;

const AFTERNOON_SLOTS = [
  '13:30',
  '14:00',
  '14:30',
  '15:00',
  '15:30',
  '16:00',
  '16:30',
  '17:00',
  '17:30',
] as const;

const BUSINESS_TIME_SLOTS = [...MORNING_SLOTS, ...AFTERNOON_SLOTS] as const;
const VALID_SLOT_SET = new Set<string>(BUSINESS_TIME_SLOTS);

const MIN_LEAD_MINUTES = 30; // Hẹn tối thiểu sau hiện tại 30 phút
const MAX_VISIT_DAYS = 7; // Ngày hẹn xem phòng tối đa 7 ngày kể từ ngày đặt cọc
const MAX_NOTE_LENGTH = 300;

const VIETNAM_NAME_REGEX = /^[a-zA-ZÀ-ỹ\s]+$/;
const VIETNAM_PHONE_REGEX =
  /^(0|\+84)(3[2-9]|5[25689]|7[06-9]|8[1-9]|9[0-9])[0-9]{7}$/;
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const pad2 = (n: number) => String(n).padStart(2, '0');

const toLocalDateString = (d: Date) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

const formatDateVN = (d: Date) =>
  `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;

const getStartOfDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);

const getMaxVisitDateEnd = (now: Date) =>
  new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + MAX_VISIT_DAYS,
    23,
    59,
    59,
    999
  );

const parseLocalDateTime = (dateStr: string, timeStr: string): Date | null => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr) || !/^\d{2}:\d{2}$/.test(timeStr)) {
    return null;
  }
  const [y, m, day] = dateStr.split('-').map(Number);
  const [hh, mm] = timeStr.split(':').map(Number);
  const dt = new Date(y, m - 1, day, hh, mm, 0, 0);
  if (
    dt.getFullYear() !== y ||
    dt.getMonth() !== m - 1 ||
    dt.getDate() !== day ||
    dt.getHours() !== hh ||
    dt.getMinutes() !== mm
  ) {
    return null;
  }
  return dt;
};

const isSlotAllowedForDate = (dateStr: string, timeStr: string, now: Date) => {
  if (!VALID_SLOT_SET.has(timeStr)) return false;
  const dt = parseLocalDateTime(dateStr, timeStr);
  if (!dt) return false;

  const minTime = new Date(now.getTime() + MIN_LEAD_MINUTES * 60 * 1000);
  const maxTime = getMaxVisitDateEnd(now);
  return dt >= minTime && dt <= maxTime;
};

const getAvailableSlotsForDate = (dateStr: string, now: Date) =>
  BUSINESS_TIME_SLOTS.filter((slot) => isSlotAllowedForDate(dateStr, slot, now));

const normalizePhone = (raw: string) => {
  const cleaned = raw.replace(/[\s.-]/g, '');
  if (cleaned.startsWith('+84')) return `0${cleaned.slice(3)}`;
  return cleaned;
};

type FieldName =
  | 'hoTenKhach'
  | 'sdt'
  | 'email'
  | 'ngayHenXem'
  | 'soTienCoc'
  | 'ghiChu';

type FieldErrors = Partial<Record<FieldName, string>>;

export default function DatPhongPage() {
  const params = useParams();
  const router = useRouter();
  const maPhong = Number(params.maPhong);

  const [loadingRoom, setLoadingRoom] = useState(true);
  const [roomError, setRoomError] = useState<string | null>(null);
  const [room, setRoom] = useState<{
    MaPhong: number;
    TenPhong: string;
    DienTich: number;
    Gia: number;
    TrangThai: string;
    TenKhu: string;
    DiaChi: string;
    TenQuanLy?: string;
    SDTQuanLy?: string;
  } | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Đồng hồ client (cập nhật mỗi phút để giới hạn khung giờ chính xác, tránh lệch hydration)
  const [now, setNow] = useState<Date | null>(null);

  // Dữ liệu form đặt phòng
  const [hoTenKhach, setHoTenKhach] = useState('');
  const [sdt, setSdt] = useState('');
  const [email, setEmail] = useState('');
  const [ngayHen, setNgayHen] = useState('');
  const [gioHen, setGioHen] = useState('09:00');
  const [soTienCoc, setSoTienCoc] = useState('');
  const [ghiChu, setGhiChu] = useState('');

  // Trạng thái lỗi và đã tương tác từng trường
  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});

  const fieldRefs = {
    hoTenKhach: useRef<HTMLInputElement>(null),
    sdt: useRef<HTMLInputElement>(null),
    email: useRef<HTMLInputElement>(null),
    ngayHenXem: useRef<HTMLInputElement>(null),
    soTienCoc: useRef<HTMLInputElement>(null),
    ghiChu: useRef<HTMLTextAreaElement>(null),
  };

  // Khởi tạo ngày hẹn mặc định (ngày mai 09:00 luôn thuộc giờ hành chính & nằm trong hạn 7 ngày)
  useEffect(() => {
    const current = new Date();
    setNow(current);

    const tomorrow = new Date(current);
    tomorrow.setDate(tomorrow.getDate() + 1);
    setNgayHen(toLocalDateString(tomorrow));
    setGioHen('09:00');

    const timer = setInterval(() => {
      setNow(new Date());
    }, 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!maPhong || Number.isNaN(maPhong)) {
      setRoomError('Mã phòng không hợp lệ.');
      setLoadingRoom(false);
      return;
    }

    setLoadingRoom(true);
    setRoomError(null);
    datPhongService
      .layThongTinPhong(maPhong)
      .then((res) => {
        setRoom(res.data);
        const gia = Number(res.data.Gia) || 0;
        const minDep = gia > 0 ? Math.min(100000, gia) : 100000;
        const suggest = Math.max(minDep, Math.round((gia * 0.1) / 10000) * 10000);
        setSoTienCoc(String(gia > 0 ? Math.min(suggest, gia) : minDep));
      })
      .catch((err: any) => {
        setRoomError(err?.message || 'Không tìm thấy phòng trọ.');
      })
      .finally(() => setLoadingRoom(false));
  }, [maPhong]);

  const minDeposit = useMemo(() => {
    if (!room) return 100000;
    const gia = Number(room.Gia) || 0;
    return gia > 0 ? Math.min(100000, gia) : 100000;
  }, [room]);

  const suggestedDeposits = useMemo(() => {
    if (!room) return [100000, 200000, 300000, 500000];
    const gia = Number(room.Gia) || 0;
    const tenPercent = Math.max(
      minDeposit,
      Math.round((gia * 0.1) / 10000) * 10000
    );
    const list = [minDeposit, tenPercent, 300000, 500000].filter(
      (v) => v >= minDeposit && (gia === 0 || v <= gia)
    );
    return Array.from(new Set(list)).sort((a, b) => a - b);
  }, [room, minDeposit]);

  // Tính ngày nhỏ nhất & lớn nhất có ít nhất 1 khung giờ hành chính hợp lệ trong tối đa 7 ngày
  const { minVisitDate, maxVisitDate } = useMemo(() => {
    if (!now) return { minVisitDate: '', maxVisitDate: '' };

    const candidates: string[] = [];
    for (let offset = 0; offset <= MAX_VISIT_DAYS; offset++) {
      const d = new Date(now);
      d.setDate(d.getDate() + offset);
      const ds = toLocalDateString(d);
      if (getAvailableSlotsForDate(ds, now).length > 0) {
        candidates.push(ds);
      }
    }

    if (candidates.length === 0) {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const fallback = toLocalDateString(tomorrow);
      return { minVisitDate: fallback, maxVisitDate: fallback };
    }

    return {
      minVisitDate: candidates[0],
      maxVisitDate: candidates[candidates.length - 1],
    };
  }, [now]);

  const availableSlotsForSelectedDate = useMemo(() => {
    if (!now || !ngayHen) return [];
    return getAvailableSlotsForDate(ngayHen, now);
  }, [now, ngayHen]);

  // Hàm validate chuẩn từng trường
  const validateField = (
    field: FieldName,
    overrides?: {
      hoTenKhach?: string;
      sdt?: string;
      email?: string;
      ngayHen?: string;
      gioHen?: string;
      soTienCoc?: string;
      ghiChu?: string;
    }
  ): string | undefined => {
    const valHoTen = overrides?.hoTenKhach ?? hoTenKhach;
    const valSdt = overrides?.sdt ?? sdt;
    const valEmail = overrides?.email ?? email;
    const valNgay = overrides?.ngayHen ?? ngayHen;
    const valGio = overrides?.gioHen ?? gioHen;
    const valCoc = overrides?.soTienCoc ?? soTienCoc;
    const valGhiChu = overrides?.ghiChu ?? ghiChu;

    switch (field) {
      case 'hoTenKhach': {
        const cleaned = valHoTen.trim().replace(/\s+/g, ' ');
        if (!cleaned) return 'Vui lòng nhập họ và tên.';
        if (cleaned.length < 2) return 'Họ và tên phải có ít nhất 2 ký tự.';
        if (cleaned.length > 100) return 'Họ và tên không được vượt quá 100 ký tự.';
        if (!VIETNAM_NAME_REGEX.test(cleaned)) {
          return 'Họ và tên chỉ được chứa chữ cái và khoảng trắng (không chứa số hay ký tự đặc biệt).';
        }
        if (cleaned.split(' ').length < 2) {
          return 'Vui lòng nhập đầy đủ họ và tên (tối thiểu 2 từ, VD: Nguyễn Văn A).';
        }
        return undefined;
      }

      case 'sdt': {
        const cleaned = valSdt.trim().replace(/[\s.-]/g, '');
        if (!cleaned) return 'Vui lòng nhập số điện thoại liên hệ.';
        if (!VIETNAM_PHONE_REGEX.test(cleaned)) {
          return 'Số điện thoại không hợp lệ (đủ 10 số, đầu số di động VN như 03x, 05x, 07x, 08x, 09x).';
        }
        return undefined;
      }

      case 'email': {
        const cleaned = valEmail.trim();
        if (!cleaned) return 'Vui lòng nhập Email để nhận biên lai đặt cọc.';
        if (cleaned.length > 150) return 'Email không được vượt quá 150 ký tự.';
        if (/\s/.test(cleaned) || !EMAIL_REGEX.test(cleaned)) {
          return 'Định dạng Email không hợp lệ (VD: nguyenvana@gmail.com).';
        }
        return undefined;
      }

      case 'ngayHenXem': {
        if (!valNgay) return 'Vui lòng chọn ngày hẹn xem phòng.';

        const parsedDate = parseLocalDateTime(valNgay, '00:00');
        if (!parsedDate) return 'Ngày hẹn xem phòng không hợp lệ.';

        const currentTime = now ?? new Date();
        const todayStart = getStartOfDay(currentTime);
        const maxDateEnd = getMaxVisitDateEnd(currentTime);

        if (parsedDate < todayStart) {
          return 'Ngày hẹn xem phòng không được nhỏ hơn ngày hôm nay.';
        }
        if (parsedDate > maxDateEnd) {
          return `Ngày hẹn xem phòng tối đa là ${MAX_VISIT_DAYS} ngày kể từ ngày đặt cọc (đến hết ngày ${formatDateVN(
            maxDateEnd
          )}).`;
        }
        if (getAvailableSlotsForDate(valNgay, currentTime).length === 0) {
          return 'Ngày đã chọn không còn khung giờ hành chính khả dụng. Vui lòng chọn ngày khác.';
        }

        if (!valGio) return 'Vui lòng chọn khung giờ hẹn xem phòng.';
        if (!VALID_SLOT_SET.has(valGio)) {
          return 'Chỉ hỗ trợ đặt lịch trong giờ hành chính (08:00–11:30, 13:30–17:30) với phút 00 hoặc 30.';
        }

        const dt = parseLocalDateTime(valNgay, valGio);
        if (!dt) return 'Ngày giờ hẹn xem phòng không hợp lệ.';

        const minTime = new Date(
          currentTime.getTime() + MIN_LEAD_MINUTES * 60 * 1000
        );

        if (dt < minTime) {
          return `Vui lòng chọn thời gian cách hiện tại ít nhất ${MIN_LEAD_MINUTES} phút.`;
        }
        if (dt > maxDateEnd) {
          return `Ngày hẹn xem phòng tối đa là ${MAX_VISIT_DAYS} ngày kể từ ngày đặt cọc (đến hết ngày ${formatDateVN(
            maxDateEnd
          )}).`;
        }
        return undefined;
      }

      case 'soTienCoc': {
        const digits = valCoc.replace(/[^\d]/g, '');
        if (!digits) return 'Vui lòng nhập số tiền đặt cọc giữ chỗ.';
        const amount = Number(digits);
        if (!Number.isFinite(amount) || amount <= 0) {
          return 'Số tiền đặt cọc không hợp lệ.';
        }
        if (amount < minDeposit) {
          return `Số tiền đặt cọc tối thiểu là ${formatVND(minDeposit)}.`;
        }
        if (room && room.Gia > 0 && amount > room.Gia) {
          return `Số tiền đặt cọc không được vượt quá giá thuê phòng (${formatVND(
            room.Gia
          )}).`;
        }
        if (amount % 1000 !== 0) {
          return 'Số tiền đặt cọc phải là bội số của 1.000đ (VD: 100.000đ, 250.000đ).';
        }
        return undefined;
      }

      case 'ghiChu': {
        if (valGhiChu.trim().length > MAX_NOTE_LENGTH) {
          return `Ghi chú không được vượt quá ${MAX_NOTE_LENGTH} ký tự.`;
        }
        return undefined;
      }
    }
  };

  const handleBlur = (field: FieldName) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    setErrors((prev) => ({ ...prev, [field]: validateField(field) }));
  };

  const handleDateChange = (newDate: string) => {
    setNgayHen(newDate);
    setSubmitError(null);

    const currentTime = now ?? new Date();
    const validSlots = newDate
      ? getAvailableSlotsForDate(newDate, currentTime)
      : [];

    // Nếu khung giờ hiện tại không còn hợp lệ ở ngày mới chọn -> tự chọn khung giờ khả dụng đầu tiên
    let nextTime = gioHen;
    if (validSlots.length > 0 && !validSlots.includes(gioHen as any)) {
      nextTime = validSlots[0];
      setGioHen(nextTime);
    } else if (validSlots.length === 0) {
      nextTime = '';
      setGioHen('');
    }

    setTouched((prev) => ({ ...prev, ngayHenXem: true }));
    setErrors((prev) => ({
      ...prev,
      ngayHenXem: validateField('ngayHenXem', {
        ngayHen: newDate,
        gioHen: nextTime,
      }),
    }));
  };

  const handleTimeChange = (newTime: string) => {
    setGioHen(newTime);
    setSubmitError(null);
    setTouched((prev) => ({ ...prev, ngayHenXem: true }));
    setErrors((prev) => ({
      ...prev,
      ngayHenXem: validateField('ngayHenXem', { gioHen: newTime }),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!room) return;
    setSubmitError(null);

    const fieldsOrder: FieldName[] = [
      'hoTenKhach',
      'sdt',
      'email',
      'ngayHenXem',
      'soTienCoc',
      'ghiChu',
    ];

    const nextErrors: FieldErrors = {};
    const allTouched: Partial<Record<FieldName, boolean>> = {};

    for (const f of fieldsOrder) {
      allTouched[f] = true;
      const err = validateField(f);
      if (err) nextErrors[f] = err;
    }

    setTouched(allTouched);
    setErrors(nextErrors);

    const firstInvalidField = fieldsOrder.find((f) => Boolean(nextErrors[f]));
    if (firstInvalidField) {
      const targetEl = fieldRefs[firstInvalidField].current;
      targetEl?.focus();
      targetEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const depositNumber = Number(soTienCoc.replace(/[^\d]/g, ''));
    const normalizedName = hoTenKhach.trim().replace(/\s+/g, ' ');
    const normalizedSdt = normalizePhone(sdt.trim());
    const normalizedEmail = email.trim().toLowerCase();
    const ngayHenXem = `${ngayHen}T${gioHen}`;

    try {
      setSubmitting(true);
      const res = await datPhongService.taoYeuCau({
        MaPhong: room.MaPhong,
        HoTenKhach: normalizedName,
        SDT: normalizedSdt,
        Email: normalizedEmail,
        NgayHenXem: ngayHenXem,
        SoTienCoc: depositNumber,
        GhiChu: ghiChu.trim() || undefined,
      });

      if (res.data) {
        try {
          localStorage.setItem(
            `payos_qr_${res.data.maTraCuu}`,
            JSON.stringify({
              qrResult: res.data,
              room: {
                MaPhong: room.MaPhong,
                TenPhong: room.TenPhong,
                TenKhu: room.TenKhu,
                DiaChi: room.DiaChi,
                DienTich: room.DienTich,
                Gia: room.Gia,
              },
            })
          );
        } catch {
          // Bỏ qua nếu trình duyệt chặn storage
        }

        const paymentUrl = `/datPhong/hoaDon?maTraCuu=${encodeURIComponent(
          res.data.maTraCuu
        )}&token=${encodeURIComponent(res.data.tokenTraCuu)}`;

        router.push(paymentUrl);
      }
    } catch (err: any) {
      setSubmitError(
        err?.message || 'Không thể tạo mã thanh toán. Vui lòng thử lại.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const isRoomEmpty = room
    ? String(room.TrangThai || '').trim() === 'Trong'
    : false;

  const getInputClass = (hasError: boolean, extra = '') =>
    `w-full rounded-xl border px-3.5 py-2.5 text-sm transition focus:outline-none ${
      hasError
        ? 'border-rose-400 bg-rose-50/50 focus:border-rose-500 focus:bg-white ring-2 ring-rose-100'
        : 'border-slate-200 bg-slate-50 focus:border-teal-500 focus:bg-white'
    } ${extra}`;

  return (
    <div className="min-h-screen flex flex-col bg-[#F1F5F9] text-slate-900">
      <HomeHeader />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6 sm:py-10 space-y-5">
        <div className="flex items-center justify-between gap-2">
          <Link
            href="/"
            className="text-xs font-bold text-slate-600 hover:text-slate-900 no-underline"
          >
            ← Quay lại danh sách phòng trống
          </Link>
        </div>

        {loadingRoom ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-sm font-semibold text-slate-500">
            Đang tải thông tin phòng...
          </div>
        ) : roomError || !room ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-8 text-center space-y-2">
            <h1 className="text-base font-bold text-rose-800">
              {roomError || 'Không tìm thấy phòng trọ.'}
            </h1>
            <Link
              href="/"
              className="inline-block rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white no-underline"
            >
              Về trang chủ
            </Link>
          </div>
        ) : !isRoomEmpty ? (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-8 text-center space-y-2.5">
            <span className="inline-block rounded-full bg-amber-200 px-3 py-1 text-xs font-bold text-amber-900">
              {room.TrangThai === 'DaDatCoc'
                ? 'Đang được giữ chỗ'
                : room.TrangThai}
            </span>
            <h1 className="text-lg font-extrabold text-slate-900">
              Phòng {room.TenPhong} ({room.TenKhu}) hiện không còn trống
            </h1>
            <p className="text-xs text-slate-600">
              Phòng này đã có khách đặt cọc giữ chỗ hoặc đang được thuê. Vui lòng chọn phòng trống khác.
            </p>
            <Link
              href="/"
              className="inline-block rounded-xl bg-[#00F5C4] px-5 py-2.5 text-xs font-bold text-slate-900 no-underline"
            >
              Xem các phòng đang trống khác
            </Link>
          </div>
        ) : (
          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="bg-[#00FFCC] px-6 py-5 text-slate-900">
              <span className="inline-block rounded-full bg-slate-900/10 px-3 py-0.5 text-[11px] font-bold">
                {room.TenKhu}
              </span>
              <h1 className="mt-1.5 text-xl sm:text-2xl font-bold">
                Đặt Cọc Giữ Phòng {room.TenPhong}
              </h1>
              <p className="text-xs text-slate-800 mt-1">
                {room.DiaChi} • Diện tích {room.DienTich} m² • Giá thuê{' '}
                <b>{formatVND(room.Gia)}/tháng</b>
              </p>
            </div>

            <div className="p-6 sm:p-8">
              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 leading-relaxed">
                  Phòng chỉ được khóa giữ chỗ sau khi PayOS xác nhận nhận đủ tiền cọc
                  (mã QR có hiệu lực trong <b>15 phút</b>). Bạn có thể chọn ngày hẹn xem phòng
                  trong vòng <b>tối đa {MAX_VISIT_DAYS} ngày</b> kể từ ngày đặt cọc; khi đến xem
                  đúng hẹn trong khung giờ hành chính, quản lý sẽ <b>hoàn lại 100% tiền cọc</b> dù
                  chốt thuê hay không.
                </div>

                {submitError && (
                  <div
                    role="alert"
                    className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700"
                  >
                    {submitError}
                  </div>
                )}

                {/* Họ và tên + Số điện thoại */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="hoTenKhach"
                      className="block text-xs font-bold text-slate-700 mb-1"
                    >
                      Họ và tên <span className="text-rose-500">*</span>
                    </label>
                    <input
                      ref={fieldRefs.hoTenKhach}
                      id="hoTenKhach"
                      type="text"
                      maxLength={100}
                      autoComplete="name"
                      placeholder="Nguyễn Văn A"
                      value={hoTenKhach}
                      aria-invalid={Boolean(
                        touched.hoTenKhach && errors.hoTenKhach
                      )}
                      onChange={(e) => {
                        const val = e.target.value;
                        setHoTenKhach(val);
                        setSubmitError(null);
                        if (touched.hoTenKhach) {
                          setErrors((prev) => ({
                            ...prev,
                            hoTenKhach: validateField('hoTenKhach', {
                              hoTenKhach: val,
                            }),
                          }));
                        }
                      }}
                      onBlur={() => handleBlur('hoTenKhach')}
                      className={getInputClass(
                        Boolean(touched.hoTenKhach && errors.hoTenKhach)
                      )}
                    />
                    {touched.hoTenKhach && errors.hoTenKhach && (
                      <p className="mt-1 text-xs font-medium text-rose-600">
                        {errors.hoTenKhach}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="sdt"
                      className="block text-xs font-bold text-slate-700 mb-1"
                    >
                      Số điện thoại <span className="text-rose-500">*</span>
                    </label>
                    <input
                      ref={fieldRefs.sdt}
                      id="sdt"
                      type="tel"
                      inputMode="tel"
                      maxLength={15}
                      autoComplete="tel"
                      placeholder="0901234567"
                      value={sdt}
                      aria-invalid={Boolean(touched.sdt && errors.sdt)}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^\d+\s]/g, '');
                        setSdt(val);
                        setSubmitError(null);
                        if (touched.sdt) {
                          setErrors((prev) => ({
                            ...prev,
                            sdt: validateField('sdt', { sdt: val }),
                          }));
                        }
                      }}
                      onBlur={() => handleBlur('sdt')}
                      className={getInputClass(Boolean(touched.sdt && errors.sdt))}
                    />
                    {touched.sdt && errors.sdt && (
                      <p className="mt-1 text-xs font-medium text-rose-600">
                        {errors.sdt}
                      </p>
                    )}
                  </div>
                </div>

                {/* Email + Ngày giờ hẹn xem phòng (Giờ hành chính, phút 00/30, tối đa 7 ngày) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="email"
                      className="block text-xs font-bold text-slate-700 mb-1"
                    >
                      Email nhận hóa đơn <span className="text-rose-500">*</span>
                    </label>
                    <input
                      ref={fieldRefs.email}
                      id="email"
                      type="email"
                      maxLength={150}
                      autoComplete="email"
                      placeholder="ban@gmail.com"
                      value={email}
                      aria-invalid={Boolean(touched.email && errors.email)}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEmail(val);
                        setSubmitError(null);
                        if (touched.email) {
                          setErrors((prev) => ({
                            ...prev,
                            email: validateField('email', { email: val }),
                          }));
                        }
                      }}
                      onBlur={() => handleBlur('email')}
                      className={getInputClass(
                        Boolean(touched.email && errors.email)
                      )}
                    />
                    {touched.email && errors.email && (
                      <p className="mt-1 text-xs font-medium text-rose-600">
                        {errors.email}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="ngayHen"
                      className="block text-xs font-bold text-slate-700 mb-1"
                    >
                      Ngày &amp; giờ hẹn xem phòng{' '}
                      <span className="text-rose-500">*</span>
                    </label>
                    <div className="grid grid-cols-12 gap-2">
                      <input
                        ref={fieldRefs.ngayHenXem}
                        id="ngayHen"
                        type="date"
                        min={minVisitDate}
                        max={maxVisitDate}
                        value={ngayHen}
                        aria-invalid={Boolean(
                          touched.ngayHenXem && errors.ngayHenXem
                        )}
                        onChange={(e) => handleDateChange(e.target.value)}
                        onBlur={() => handleBlur('ngayHenXem')}
                        className={`col-span-7 ${getInputClass(
                          Boolean(touched.ngayHenXem && errors.ngayHenXem)
                        )}`}
                      />

                      <select
                        id="gioHen"
                        aria-label="Giờ hẹn xem phòng"
                        value={gioHen}
                        disabled={availableSlotsForSelectedDate.length === 0}
                        aria-invalid={Boolean(
                          touched.ngayHenXem && errors.ngayHenXem
                        )}
                        onChange={(e) => handleTimeChange(e.target.value)}
                        onBlur={() => handleBlur('ngayHenXem')}
                        className={`col-span-5 font-semibold ${getInputClass(
                          Boolean(touched.ngayHenXem && errors.ngayHenXem),
                          'px-2.5 cursor-pointer disabled:opacity-60'
                        )}`}
                      >
                        {availableSlotsForSelectedDate.length === 0 ? (
                          <option value="">Không khả dụng</option>
                        ) : (
                          <>
                            <optgroup label="Buổi sáng (08:00 - 11:30)">
                              {MORNING_SLOTS.map((slot) => {
                                const allowed =
                                  availableSlotsForSelectedDate.includes(slot);
                                return (
                                  <option
                                    key={slot}
                                    value={slot}
                                    disabled={!allowed}
                                  >
                                    {slot} {!allowed ? '(Đã qua)' : ''}
                                  </option>
                                );
                              })}
                            </optgroup>
                            <optgroup label="Buổi chiều (13:30 - 17:30)">
                              {AFTERNOON_SLOTS.map((slot) => {
                                const allowed =
                                  availableSlotsForSelectedDate.includes(slot);
                                return (
                                  <option
                                    key={slot}
                                    value={slot}
                                    disabled={!allowed}
                                  >
                                    {slot} {!allowed ? '(Đã qua)' : ''}
                                  </option>
                                );
                              })}
                            </optgroup>
                          </>
                        )}
                      </select>
                    </div>
                    {touched.ngayHenXem && errors.ngayHenXem ? (
                      <p className="mt-1 text-xs font-medium text-rose-600">
                        {errors.ngayHenXem}
                      </p>
                    ) : (
                      <p className="mt-1 text-[11px] text-slate-500">
                        Giờ hành chính: 08:00–11:30 &amp; 13:30–17:30 (phút 00 hoặc 30, tối đa {MAX_VISIT_DAYS} ngày kể từ hôm nay).
                      </p>
                    )}
                  </div>
                </div>

                {/* Số tiền đặt cọc */}
                <div>
                  <label
                    htmlFor="soTienCoc"
                    className="block text-xs font-bold text-slate-700 mb-1"
                  >
                    Số tiền đặt cọc giữ chỗ (VNĐ){' '}
                    <span className="text-rose-500">*</span>
                  </label>
                  <input
                    ref={fieldRefs.soTienCoc}
                    id="soTienCoc"
                    type="text"
                    inputMode="numeric"
                    value={
                      soTienCoc
                        ? Number(soTienCoc.replace(/[^\d]/g, '')).toLocaleString(
                            'vi-VN'
                          )
                        : ''
                    }
                    aria-invalid={Boolean(touched.soTienCoc && errors.soTienCoc)}
                    onChange={(e) => {
                      const rawDigits = e.target.value
                        .replace(/[^\d]/g, '')
                        .slice(0, 9);
                      setSoTienCoc(rawDigits);
                      setSubmitError(null);
                      if (touched.soTienCoc) {
                        setErrors((prev) => ({
                          ...prev,
                          soTienCoc: validateField('soTienCoc', {
                            soTienCoc: rawDigits,
                          }),
                        }));
                      }
                    }}
                    onBlur={() => handleBlur('soTienCoc')}
                    placeholder={`Tối thiểu ${formatVND(minDeposit)}`}
                    className={getInputClass(
                      Boolean(touched.soTienCoc && errors.soTienCoc),
                      'font-bold text-teal-800'
                    )}
                  />
                  {touched.soTienCoc && errors.soTienCoc ? (
                    <p className="mt-1 text-xs font-medium text-rose-600">
                      {errors.soTienCoc}
                    </p>
                  ) : (
                    <p className="mt-1 text-[11px] text-slate-500">
                      Tối thiểu {formatVND(minDeposit)}
                      {room.Gia > 0 ? `, tối đa ${formatVND(room.Gia)}` : ''} (bội số của 1.000đ).
                    </p>
                  )}

                  <div className="mt-2 flex flex-wrap gap-2">
                    {suggestedDeposits.map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => {
                          const strVal = String(val);
                          setSoTienCoc(strVal);
                          setSubmitError(null);
                          setErrors((prev) => ({
                            ...prev,
                            soTienCoc: validateField('soTienCoc', {
                              soTienCoc: strVal,
                            }),
                          }));
                        }}
                        className={`rounded-lg px-3 py-1.5 text-xs font-bold border cursor-pointer transition ${
                          Number(soTienCoc) === val
                            ? 'bg-[#00FFCC] border-teal-500 text-slate-900'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {formatVND(val)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Ghi chú */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label
                      htmlFor="ghiChu"
                      className="block text-xs font-bold text-slate-700"
                    >
                      Ghi chú thêm (tùy chọn)
                    </label>
                    <span
                      className={`text-[11px] font-medium ${
                        ghiChu.length > MAX_NOTE_LENGTH
                          ? 'text-rose-600 font-bold'
                          : 'text-slate-400'
                      }`}
                    >
                      {ghiChu.length}/{MAX_NOTE_LENGTH}
                    </span>
                  </div>
                  <textarea
                    ref={fieldRefs.ghiChu}
                    id="ghiChu"
                    rows={2}
                    maxLength={MAX_NOTE_LENGTH + 20}
                    value={ghiChu}
                    aria-invalid={Boolean(touched.ghiChu && errors.ghiChu)}
                    onChange={(e) => {
                      const val = e.target.value;
                      setGhiChu(val);
                      if (touched.ghiChu || val.length > MAX_NOTE_LENGTH) {
                        setTouched((prev) => ({ ...prev, ghiChu: true }));
                        setErrors((prev) => ({
                          ...prev,
                          ghiChu: validateField('ghiChu', { ghiChu: val }),
                        }));
                      }
                    }}
                    onBlur={() => handleBlur('ghiChu')}
                    placeholder="VD: Chiều tan làm ghé xem phòng cùng bạn..."
                    className={getInputClass(
                      Boolean(touched.ghiChu && errors.ghiChu),
                      'py-2'
                    )}
                  />
                  {touched.ghiChu && errors.ghiChu && (
                    <p className="mt-1 text-xs font-medium text-rose-600">
                      {errors.ghiChu}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <Link
                    href="/"
                    className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 no-underline"
                  >
                    Hủy
                  </Link>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-xl bg-[#00F5C4] hover:bg-[#00E0B0] px-6 py-2.5 text-xs font-bold text-slate-900 shadow-xs disabled:opacity-60 cursor-pointer"
                  >
                    {submitting ? 'Đang tạo mã VietQR...' : 'Tạo mã QR Đặt Cọc'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      <AppFooter />
    </div>
  );
}