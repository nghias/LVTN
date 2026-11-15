// client/src/app/chuTro/thongBao/them/[MaND]/page.tsx
"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { thongBaoService } from "@/services/thongBao.service";
import QuanLyHeader from "@/components/layout/QuanLyHeader";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import {
  CreateThongBaoPayload,
  KhuTroItem,
  LoaiThongBao,
  NguoiNhanItem,
  PhamViThongBao,
  PhongItem,
} from "@/types/thongBao.type";
import { resolveCurrentMaND } from "../../chiTiet/page";

const getRoleLabel = (quyen: string) => {
  if (quyen === "QuanLy") return "Quản lý";
  if (quyen === "ChuTro" || quyen === "Admin") return "Chủ trọ";
  return "Khách thuê";
};

function ThemThongBaoContent() {
  const router = useRouter();
  const params = useParams<{ MaND?: string }>();
  const searchParams = useSearchParams();

  const paramMaND = params?.MaND ? Number(params.MaND) : 0;
  const queryMaKhu = searchParams.get("maKhu")
    ? Number(searchParams.get("maKhu"))
    : 0;
  const queryMaPhong = searchParams.get("maPhong")
    ? Number(searchParams.get("maPhong"))
    : 0;

  const currentLoggedMaND = resolveCurrentMaND();

  const [loadingMeta, setLoadingMeta] = useState(true);
  const [isSupremeLandlord, setIsSupremeLandlord] = useState(false);
  const [khuTroList, setKhuTroList] = useState<KhuTroItem[]>([]);
  const [phongList, setPhongList] = useState<PhongItem[]>([]);
  const [loaiThongBaoList, setLoaiThongBaoList] = useState<LoaiThongBao[]>([]);
  const [recipients, setRecipients] = useState<NguoiNhanItem[]>([]);

  const [maLTB, setMaLTB] = useState<number>(1);
  const [phamVi, setPhamVi] = useState<PhamViThongBao>("THEO_KHU");
  const [maKhu, setMaKhu] = useState<number>(queryMaKhu || 0);
  const [maPhong, setMaPhong] = useState<number>(queryMaPhong || 0);

  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [filterKhuId, setFilterKhuId] = useState<number>(queryMaKhu || 0);

  const [tieuDe, setTieuDe] = useState("");
  const [noiDung, setNoiDung] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    let isMounted = true;
    const loadMetadata = async () => {
      try {
        setLoadingMeta(true);
        const meta = await thongBaoService.getMetadata();
        if (!isMounted) return;

        const supreme = Boolean(meta.isSupremeLandlord);
        const khus = meta.khuTroList || [];
        const phongs = meta.phongList || [];
        const loais = meta.loaiThongBaoList || [];
        const nguoiNhans = meta.nguoiNhanList || [];

        setIsSupremeLandlord(supreme);
        setKhuTroList(khus);
        setPhongList(phongs);
        setLoaiThongBaoList(loais);
        setRecipients(nguoiNhans);

        if (loais.length > 0) {
          setMaLTB(loais[0].MaLTB);
        }

        const defaultKhu = queryMaKhu || khus[0]?.MaKhu || 0;
        setMaKhu(defaultKhu);

        // Nếu MaND trên URL là 1 người nhận cụ thể (khác người đang đăng nhập)
        const isRecipientParam =
          paramMaND > 0 &&
          paramMaND !== currentLoggedMaND &&
          nguoiNhans.some((u) => Number(u.MaND) === paramMaND);

        if (isRecipientParam) {
          setPhamVi("MOT_NGUOI");
          setSelectedUserIds([paramMaND]);
        } else if (queryMaPhong > 0) {
          setPhamVi("THEO_PHONG");
          setMaPhong(queryMaPhong);
        } else if (queryMaKhu > 0) {
          setPhamVi("THEO_KHU");
        } else {
          setPhamVi(supreme ? "TOAN_HE_THONG" : "THEO_KHU");
        }
      } catch (err: unknown) {
        if (isMounted) {
          setErrorMsg(
            err instanceof Error
              ? err.message
              : "Không thể tải dữ liệu cấu hình thông báo.",
          );
        }
      } finally {
        if (isMounted) setLoadingMeta(false);
      }
    };

    loadMetadata();
    return () => {
      isMounted = false;
    };
  }, [paramMaND, queryMaKhu, queryMaPhong, currentLoggedMaND]);

  const filteredRecipients = useMemo(() => {
    const kw = userSearch.trim().toLowerCase();
    return recipients.filter((u) => {
      const matchKhu = filterKhuId
        ? Number(u.MaKhu) === Number(filterKhuId)
        : true;
      if (!matchKhu) return false;
      if (!kw) return true;

      const name = (u.HoTen || "").toLowerCase();
      const username = (u.TenTK || "").toLowerCase();
      const room = (u.TenPhong || "").toLowerCase();
      const area = (u.TenKhu || "").toLowerCase();
      return (
        name.includes(kw) ||
        username.includes(kw) ||
        room.includes(kw) ||
        area.includes(kw)
      );
    });
  }, [recipients, filterKhuId, userSearch]);

  const filteredPhong = phongList.filter((p) =>
    maKhu ? p.MaKhu === Number(maKhu) : true,
  );

  const handleChangePhamVi = (nextPhamVi: PhamViThongBao) => {
    setPhamVi(nextPhamVi);
    setErrorMsg("");
    if (nextPhamVi === "MOT_NGUOI" && selectedUserIds.length > 1) {
      setSelectedUserIds([selectedUserIds[0]]);
    }
  };

  const handleSelectSingleUser = (id: number) => {
    setSelectedUserIds([id]);
  };

  const handleToggleMultiUser = (id: number) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleSelectAllFiltered = () => {
    const filteredIds = filteredRecipients.map((u) => u.MaND);
    setSelectedUserIds((prev) => [...new Set([...prev, ...filteredIds])]);
  };

  const handleClearSelectedUsers = () => {
    setSelectedUserIds([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (phamVi === "THEO_PHONG" && !maPhong) {
      setErrorMsg("Vui lòng chọn phòng nhận thông báo.");
      return;
    }

    if (phamVi === "MOT_NGUOI" && selectedUserIds.length !== 1) {
      setErrorMsg("Vui lòng chọn 1 người nhận thông báo.");
      return;
    }

    if (phamVi === "NHIEU_NGUOI" && selectedUserIds.length === 0) {
      setErrorMsg("Vui lòng chọn ít nhất 1 người nhận thông báo.");
      return;
    }

    setSubmitting(true);

    const payload: CreateThongBaoPayload = {
      maLTB: Number(maLTB),
      tieuDe: tieuDe.trim(),
      noiDung: noiDung.trim(),
      phamVi,
      maKhu:
        phamVi === "THEO_KHU" || phamVi === "THEO_PHONG"
          ? Number(maKhu)
          : undefined,
      maPhong: phamVi === "THEO_PHONG" ? Number(maPhong) : undefined,
      nguoiNhanIds:
        phamVi === "MOT_NGUOI" || phamVi === "NHIEU_NGUOI"
          ? selectedUserIds
          : undefined,
    };

    try {
      await thongBaoService.taoThongBao(payload);
      router.push("/chuTro/thongBao");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      {/* Điều hướng quay lại */}
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/chuTro/thongBao"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-600 hover:text-teal-700 transition"
        >
          ← Quay lại danh sách thông báo
        </Link>

        <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-[#00FFCC] text-slate-900">
          {isSupremeLandlord ? "Quyền Chủ Trọ" : "Quyền Quản Lý Cơ Sở"}
        </span>
      </div>

      {/* Khung Form chính */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-5">
        <div className="border-b border-slate-100 pb-4">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            Soạn & Phát Thông Báo Trực Tiếp
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Gửi thông báo thời gian thực cho toàn hệ thống, theo khu/phòng, hoặc
            chọn từng cá nhân cụ thể.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-600">
            {errorMsg}
          </div>
        )}

        {loadingMeta ? (
          <div className="py-12 text-center text-xs text-slate-400">
            Đang tải cấu hình khu trọ và danh sách người nhận...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Chọn Loại Thông Báo */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Loại thông báo
              </label>
              <select
                value={maLTB}
                onChange={(e) => setMaLTB(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-teal-600"
                required
              >
                {loaiThongBaoList.map((ltb) => (
                  <option key={ltb.MaLTB} value={ltb.MaLTB}>
                    {ltb.TenLTB}
                  </option>
                ))}
              </select>
            </div>

            {/* Chọn Phạm Vi Nhận */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Đối tượng nhận thông báo
              </label>
              <select
                value={phamVi}
                onChange={(e) =>
                  handleChangePhamVi(e.target.value as PhamViThongBao)
                }
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:border-teal-600"
              >
                {isSupremeLandlord && (
                  <>
                    <option value="TOAN_HE_THONG">
                      🌐 Tất cả mọi người (Toàn bộ Khách thuê & Quản lý)
                    </option>
                    <option value="TAT_CA_QUAN_LY">
                      🛡️ Tất cả Quản lý khu trọ
                    </option>
                  </>
                )}
                <option value="THEO_KHU">
                  🏢{" "}
                  {isSupremeLandlord
                    ? "Tất cả mọi người trong 1 Khu trọ"
                    : "Tất cả mọi người trong Khu trọ của tôi"}
                </option>
                <option value="THEO_PHONG">
                  🚪 Tất cả khách thuê trong 1 Phòng
                </option>
                <option value="MOT_NGUOI">
                  👤 Gửi riêng cho 1 người cụ thể
                </option>
                <option value="NHIEU_NGUOI">
                  👥 Gửi cho nhiều người (Tùy chọn danh sách)
                </option>
              </select>
            </div>

            {/* Chọn Khu trọ */}
            {(phamVi === "THEO_KHU" || phamVi === "THEO_PHONG") && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Khu trọ áp dụng
                </label>
                <select
                  value={maKhu}
                  onChange={(e) => {
                    setMaKhu(Number(e.target.value));
                    setMaPhong(0);
                  }}
                  disabled={!isSupremeLandlord && khuTroList.length === 1}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs sm:text-sm text-slate-900 disabled:opacity-75"
                >
                  {khuTroList.map((khu) => (
                    <option key={khu.MaKhu} value={khu.MaKhu}>
                      {khu.TenKhu} — Quản lý: {khu.TenQuanLy}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Chọn Phòng */}
            {phamVi === "THEO_PHONG" && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Chọn phòng nhận thông báo
                </label>
                <select
                  value={maPhong}
                  onChange={(e) => setMaPhong(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs sm:text-sm text-slate-900"
                  required
                >
                  <option value={0}>-- Chọn phòng --</option>
                  {filteredPhong.map((p) => (
                    <option key={p.MaPhong} value={p.MaPhong}>
                      {p.TenPhong} ({p.TrangThai})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Chọn 1 người hoặc Nhiều người cụ thể */}
            {(phamVi === "MOT_NGUOI" || phamVi === "NHIEU_NGUOI") && (
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs font-bold text-slate-800">
                    {phamVi === "MOT_NGUOI"
                      ? "Chọn 1 người nhận thông báo"
                      : `Đã chọn ${selectedUserIds.length} người nhận`}
                  </span>

                  {phamVi === "NHIEU_NGUOI" && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSelectAllFiltered}
                        className="text-[11px] font-bold text-teal-700 hover:underline cursor-pointer"
                      >
                        Chọn tất cả ({filteredRecipients.length})
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={handleClearSelectedUsers}
                        className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer"
                      >
                        Bỏ chọn hết
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {khuTroList.length > 1 && (
                    <select
                      value={filterKhuId}
                      onChange={(e) => setFilterKhuId(Number(e.target.value))}
                      className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800"
                    >
                      <option value={0}>Tất cả khu trọ</option>
                      {khuTroList.map((k) => (
                        <option key={k.MaKhu} value={k.MaKhu}>
                          {k.TenKhu}
                        </option>
                      ))}
                    </select>
                  )}

                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Tìm theo tên, phòng, khu trọ..."
                    className={`px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 ${
                      khuTroList.length <= 1 ? "sm:col-span-2" : ""
                    }`}
                  />
                </div>

                <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
                  {filteredRecipients.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">
                      Không tìm thấy người nhận phù hợp.
                    </div>
                  ) : (
                    filteredRecipients.map((u) => {
                      const isChecked = selectedUserIds.includes(u.MaND);
                      return (
                        <label
                          key={u.MaND}
                          onClick={() =>
                            phamVi === "MOT_NGUOI"
                              ? handleSelectSingleUser(u.MaND)
                              : handleToggleMultiUser(u.MaND)
                          }
                          className={`flex items-center justify-between gap-3 px-3.5 py-2.5 cursor-pointer transition ${
                            isChecked ? "bg-[#00FFCC]/20" : "hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <input
                              type={
                                phamVi === "MOT_NGUOI" ? "radio" : "checkbox"
                              }
                              name="recipient_select"
                              checked={isChecked}
                              onChange={() => {}}
                              className="w-4 h-4 accent-teal-600 shrink-0 cursor-pointer"
                            />
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 truncate">
                                {u.HoTen}
                              </p>
                              <p className="text-[11px] text-slate-500 truncate">
                                {u.TenPhong
                                  ? `${u.TenPhong} • ${u.TenKhu || ""}`
                                  : u.TenKhu
                                    ? `Khu: ${u.TenKhu}`
                                    : `@${u.TenTK || u.MaND}`}
                              </p>
                            </div>
                          </div>

                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                              u.Quyen === "QuanLy"
                                ? "bg-teal-100 text-teal-800"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {getRoleLabel(u.Quyen)}
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Tiêu đề & Nội dung */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Tiêu đề thông báo
              </label>
              <input
                type="text"
                value={tieuDe}
                onChange={(e) => setTieuDe(e.target.value)}
                placeholder="VD: Thông báo lịch bảo trì hệ thống điện nước..."
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-teal-600 focus:bg-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Nội dung chi tiết
              </label>
              <textarea
                rows={5}
                value={noiDung}
                onChange={(e) => setNoiDung(e.target.value)}
                placeholder="Nhập nội dung thông báo..."
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-teal-600 focus:bg-white"
                required
              />
            </div>

            <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-100">
              <Link
                href="/chuTro/thongBao"
                className="px-4 py-2.5 rounded-2xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Hủy
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 rounded-2xl bg-teal-700 hover:bg-slate-900 text-white text-xs font-bold transition cursor-pointer disabled:opacity-50"
              >
                {submitting ? "Đang gửi thông báo..." : "Gửi Ngay →"}
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}

export default function ThemThongBaoPage() {
  return (
    <ProtectedRoute allowedRoles={["ChuTro", "QuanLy"]}>
      {(user) => (
        <div className="min-h-screen bg-[#F8FAFC] text-slate-900">
          <QuanLyHeader user={user} />
          <Suspense
            fallback={
              <div className="p-10 text-center text-xs text-slate-400">
                Đang tải trang soạn thông báo...
              </div>
            }
          >
            <ThemThongBaoContent />
          </Suspense>
        </div>
      )}
    </ProtectedRoute>
  );
}