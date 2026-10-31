// client/src/components/features/thongBao/ThongBaoFormModal.tsx
"use client";

import { useState, useEffect } from "react";
import {
  CreateThongBaoPayload,
  KhuTroItem,
  LoaiThongBao,
  PhamViThongBao,
  PhongItem,
} from "../../../types/thongBao.type";

interface ThongBaoFormModalProps {
  isOpen: boolean;
  isSupremeLandlord: boolean;
  khuTroList: KhuTroItem[];
  phongList: PhongItem[];
  loaiThongBaoList: LoaiThongBao[];
  onClose: () => void;
  onSubmit: (payload: CreateThongBaoPayload) => Promise<void>;
}

export default function ThongBaoFormModal({
  isOpen,
  isSupremeLandlord,
  khuTroList,
  phongList,
  loaiThongBaoList,
  onClose,
  onSubmit,
}: ThongBaoFormModalProps) {
  const [maLTB, setMaLTB] = useState<number>(loaiThongBaoList[0]?.MaLTB || 1);
  const [phamVi, setPhamVi] = useState<PhamViThongBao>(
    isSupremeLandlord ? "TOAN_HE_THONG" : "THEO_KHU"
  );
  const [maKhu, setMaKhu] = useState<number>(khuTroList[0]?.MaKhu || 0);
  const [maPhong, setMaPhong] = useState<number>(0);
  const [tieuDe, setTieuDe] = useState("");
  const [noiDung, setNoiDung] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (loaiThongBaoList.length > 0 && !maLTB) {
      setMaLTB(loaiThongBaoList[0].MaLTB);
    }
    if (khuTroList.length > 0) {
      setMaKhu(khuTroList[0].MaKhu);
    }
    setPhamVi(isSupremeLandlord ? "TOAN_HE_THONG" : "THEO_KHU");
  }, [isSupremeLandlord, khuTroList, loaiThongBaoList, maLTB]);

  if (!isOpen) return null;

  const filteredPhong = phongList.filter((p) =>
    maKhu ? p.MaKhu === Number(maKhu) : true
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSubmitting(true);

    try {
      await onSubmit({
        maLTB: Number(maLTB),
        tieuDe,
        noiDung,
        phamVi,
        maKhu: phamVi === "THEO_KHU" || phamVi === "THEO_PHONG" ? Number(maKhu) : undefined,
        maPhong: phamVi === "THEO_PHONG" ? Number(maPhong) : undefined,
      });
      setTieuDe("");
      setNoiDung("");
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 shadow-xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 mt-1">
              Soạn & Phát Thông Báo Trực Tiếp
            </h2>
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
          <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-600">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
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

          {/* Chọn Phạm Vi Nhận (Phân quyền theo Chủ trọ vs Quản lý) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Đối tượng nhận thông báo
            </label>
            <select
              value={phamVi}
              onChange={(e) => setPhamVi(e.target.value as PhamViThongBao)}
              className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs sm:text-sm font-semibold text-slate-900"
            >
              {isSupremeLandlord && (
                <>
                  <option value="TOAN_HE_THONG">
                    🌐 Toàn hệ thống (Khách thuê cả 3 khu + 3 Quản lý)
                  </option>
                  <option value="TAT_CA_QUAN_LY">
                    🛡️ Chỉ gửi cho 3 Quản lý khu trọ
                  </option>
                </>
              )}
              <option value="THEO_KHU">
                🏢 {isSupremeLandlord ? "Gửi theo Khu trọ cụ thể" : "Toàn bộ khách thuê Khu trọ của tôi"}
              </option>
              <option value="THEO_PHONG">
                🚪 Gửi riêng cho 1 Phòng trong khu
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