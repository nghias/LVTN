// client/src/components/features/thongBao/ThongBaoFormModal.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { thongBaoService } from "@/services/thongBao.service";
import {
  CreateThongBaoPayload,
  KhuTroItem,
  LoaiThongBao,
  NguoiNhanItem,
  PhamViThongBao,
  PhongItem,
} from "../../../types/thongBao.type";

interface ThongBaoFormModalProps {
  isOpen: boolean;
  isSupremeLandlord: boolean;
  khuTroList: KhuTroItem[];
  phongList: PhongItem[];
  loaiThongBaoList: LoaiThongBao[];
  nguoiNhanList?: NguoiNhanItem[];
  onClose: () => void;
  onSubmit: (payload: CreateThongBaoPayload) => Promise<void>;
}

const getRoleLabel = (quyen: string) => {
  if (quyen === "QuanLy") return "Quản lý";
  if (quyen === "ChuTro" || quyen === "Admin") return "Chủ trọ";
  return "Khách thuê";
};

export default function ThongBaoFormModal({
  isOpen,
  isSupremeLandlord,
  khuTroList,
  phongList,
  loaiThongBaoList,
  nguoiNhanList: propNguoiNhanList,
  onClose,
  onSubmit,
}: ThongBaoFormModalProps) {
  const [maLTB, setMaLTB] = useState<number>(loaiThongBaoList[0]?.MaLTB || 1);
  const [phamVi, setPhamVi] = useState<PhamViThongBao>(
    isSupremeLandlord ? "TOAN_HE_THONG" : "THEO_KHU"
  );
  const [maKhu, setMaKhu] = useState<number>(khuTroList[0]?.MaKhu || 0);
  const [maPhong, setMaPhong] = useState<number>(0);

  // Danh sách người nhận và bộ lọc khi chọn 1 người / nhiều người
  const [internalRecipients, setInternalRecipients] = useState<NguoiNhanItem[]>(
    []
  );
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [filterKhuId, setFilterKhuId] = useState<number>(0);

  const [tieuDe, setTieuDe] = useState("");
  const [noiDung, setNoiDung] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const recipients = useMemo(() => {
    if (propNguoiNhanList && propNguoiNhanList.length > 0) {
      return propNguoiNhanList;
    }
    return internalRecipients;
  }, [propNguoiNhanList, internalRecipients]);

  useEffect(() => {
    if (loaiThongBaoList.length > 0 && !maLTB) {
      setMaLTB(loaiThongBaoList[0].MaLTB);
    }
    if (khuTroList.length > 0) {
      setMaKhu(khuTroList[0].MaKhu);
    }
    setPhamVi(isSupremeLandlord ? "TOAN_HE_THONG" : "THEO_KHU");
  }, [isSupremeLandlord, khuTroList, loaiThongBaoList, maLTB]);

  // Tự động lấy danh sách người nhận từ metadata nếu trang cha chưa truyền prop nguoiNhanList
  useEffect(() => {
    if (!isOpen) return;
    if (propNguoiNhanList && propNguoiNhanList.length > 0) return;

    thongBaoService
      .getMetadata()
      .then((data) => {
        if (data?.nguoiNhanList) {
          setInternalRecipients(data.nguoiNhanList);
        }
      })
      .catch(() => {
        // Ignore
      });
  }, [isOpen, propNguoiNhanList]);

  // Lọc danh sách người nhận theo Khu trọ & Từ khóa
  const filteredRecipients = useMemo(() => {
    const kw = userSearch.trim().toLowerCase();
    return recipients.filter((u) => {
      const matchKhu = filterKhuId ? Number(u.MaKhu) === Number(filterKhuId) : true;
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

  if (!isOpen) return null;

  const filteredPhong = phongList.filter((p) =>
    maKhu ? p.MaKhu === Number(maKhu) : true
  );

  // Chuyển đổi phạm vi nhận thông báo
  const handleChangePhamVi = (nextPhamVi: PhamViThongBao) => {
    setPhamVi(nextPhamVi);
    setErrorMsg("");
    if (nextPhamVi === "MOT_NGUOI" && selectedUserIds.length > 1) {
      setSelectedUserIds([selectedUserIds[0]]);
    }
  };

  // Chọn 1 người (Radio)
  const handleSelectSingleUser = (id: number) => {
    setSelectedUserIds([id]);
  };

  // Chọn / bỏ chọn nhiều người (Checkbox)
  const handleToggleMultiUser = (id: number) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Chọn tất cả người đang hiển thị trong bộ lọc
  const handleSelectAllFiltered = () => {
    const filteredIds = filteredRecipients.map((u) => u.MaND);
    setSelectedUserIds((prev) => [...new Set([...prev, ...filteredIds])]);
  };

  // Bỏ chọn tất cả
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

    try {
      await onSubmit({
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
      });
      setTieuDe("");
      setNoiDung("");
      setSelectedUserIds([]);
      setUserSearch("");
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-xl w-full p-6 shadow-xl space-y-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Soạn & Phát Thông Báo Trực Tiếp
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Gửi cho tất cả mọi người, theo khu/phòng, hoặc chọn từng cá nhân
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-600 shrink-0">
            {errorMsg}
          </div>
        )}

        {/* Form Body */}
        <form
          onSubmit={handleSubmit}
          className="space-y-4 overflow-y-auto pr-1 flex-1"
        >
          {/* Chọn Loại Thông Báo */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Loại thông báo
            </label>
            <select
              value={maLTB}
              onChange={(e) => setMaLTB(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs sm:text-sm text-slate-900"
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
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Đối tượng nhận thông báo
            </label>
            <select
              value={phamVi}
              onChange={(e) =>
                handleChangePhamVi(e.target.value as PhamViThongBao)
              }
              className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs sm:text-sm font-semibold text-slate-900"
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

          {/* Chọn Khu trọ (Nếu gửi theo khu hoặc theo phòng) */}
          {(phamVi === "THEO_KHU" || phamVi === "THEO_PHONG") && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
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

          {/* Chọn Phòng (Nếu gửi theo phòng) */}
          {phamVi === "THEO_PHONG" && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
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
            <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-3">
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

              {/* Bộ lọc Khu trọ + Tìm kiếm tên/phòng */}
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

              {/* Danh sách người dùng để tích chọn */}
              <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
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
                          isChecked
                            ? "bg-[#00FFCC]/20"
                            : "hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <input
                            type={phamVi === "MOT_NGUOI" ? "radio" : "checkbox"}
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
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Tiêu đề thông báo
            </label>
            <input
              type="text"
              value={tieuDe}
              onChange={(e) => setTieuDe(e.target.value)}
              placeholder="VD: Thông báo lịch bảo trì hệ thống điện nước..."
              className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs sm:text-sm text-slate-900"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Nội dung chi tiết
            </label>
            <textarea
              rows={4}
              value={noiDung}
              onChange={(e) => setNoiDung(e.target.value)}
              placeholder="Nhập nội dung thông báo..."
              className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs sm:text-sm text-slate-900"
              required
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-2xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-2xl bg-teal-700 hover:bg-slate-900 text-white text-xs font-bold transition cursor-pointer disabled:opacity-50"
            >
              {submitting ? "Đang gửi thông báo..." : "Gửi Ngay →"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}