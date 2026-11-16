"use client";

import React, { Suspense, useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import QuanLyHeader from "@/components/layout/QuanLyHeader";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import { hopDongService } from "@/services/hopDong.service";
import { ChiTietHopDongFull } from "@/types/hopDong.type";
import { HopDongA4View } from "@/components/features/hopDong/HopDongPdf";

const nfc = (val?: string | number | null, fallback = ""): string => {
  if (val === null || val === undefined || val === "") return fallback;
  return String(val).normalize("NFC").trim();
};

function NoiDungChiTietHopDong() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();

  // Lấy mã hợp đồng từ URL (?id=... hoặc ?maHDT=...)
  const rawId =
    searchParams.get("id") ||
    searchParams.get("maHDT") ||
    (params?.id as string);
  const maHDT = rawId ? Number(rawId) : null;

  // Ref dùng riêng cho việc xuất file PDF chuẩn khổ A4
  const pdfExportRef = useRef<HTMLDivElement>(null);
  const paperContentRef = useRef<HTMLDivElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  const [hopDong, setHopDong] = useState<ChiTietHopDongFull | null>(null);
  const [dangTaiDuLieu, setDangTaiDuLieu] = useState<boolean>(true);

  const [tabHienThi, setTabHienThi] = useState<"HOP_DONG" | "HOA_DON">(
    "HOP_DONG"
  );
  const [cheDoXem, setCheDoXem] = useState<"TRUC_TIEP" | "PDF_EMBED">(
    "TRUC_TIEP"
  );
  const [laManHinhNho, setLaManHinhNho] = useState<boolean>(false);
  const [tyLeThuPhong, setTyLeThuPhong] = useState<number>(1);
  const [cheDoPhongToMobile, setCheDoPhongToMobile] = useState<
    "VUA_MAN_HINH" | "GOC_100"
  >("VUA_MAN_HINH");
  const [chieuCaoGiayA4, setChieuCaoGiayA4] = useState<number>(1123);

  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [dangTaoPdf, setDangTaoPdf] = useState<boolean>(false);
  const [dangTaiVe, setDangTaiVe] = useState<boolean>(false);
  const [maNDDungTen, setMaNDDungTen] = useState<number | null>(null);

  // 1. Tải dữ liệu chi tiết hợp đồng
  useEffect(() => {
    if (!maHDT) {
      alert("Không tìm thấy mã hợp đồng cần xem!");
      router.back();
      return;
    }

    setDangTaiDuLieu(true);
    hopDongService
      .xemChiTiet(maHDT)
      .then((data) => {
        setHopDong(data);
        const ds =
          data.ThanhVienCungPhong && data.ThanhVienCungPhong.length > 0
            ? data.ThanhVienCungPhong
            : data.DanhSachThanhVien || [];
        if (ds.length > 0) {
          const daiDien = ds.find((tv) => tv.VaiTro === "DaiDien") || ds[0];
          setMaNDDungTen(daiDien.MaND);
        }
      })
      .catch((error: any) => {
        alert(error.message || "Không thể tải chi tiết hợp đồng");
        router.back();
      })
      .finally(() => setDangTaiDuLieu(false));
  }, [maHDT, router]);

  // 2. Tính toán tỷ lệ co giãn tờ giấy A4 trên màn hình điện thoại
  useEffect(() => {
    const capNhatKichThuocManHinh = () => {
      const width = window.innerWidth;
      const isMobile = width < 850;
      setLaManHinhNho(isMobile);

      if (isMobile) {
        setCheDoXem("TRUC_TIEP");
      }

      const A4_WIDTH_PX = 794; // 210mm ~ 794px
      const containerWidth =
        previewContainerRef.current?.clientWidth || width - 16;

      if (isMobile && cheDoPhongToMobile === "VUA_MAN_HINH") {
        const scale = Math.min(
          1,
          Math.max(0.38, (containerWidth - 16) / A4_WIDTH_PX)
        );
        setTyLeThuPhong(scale);
      } else {
        setTyLeThuPhong(1);
      }

      if (paperContentRef.current) {
        setChieuCaoGiayA4(paperContentRef.current.scrollHeight);
      }
    };

    capNhatKichThuocManHinh();
    window.addEventListener("resize", capNhatKichThuocManHinh);
    return () => window.removeEventListener("resize", capNhatKichThuocManHinh);
  }, [hopDong, tabHienThi, maNDDungTen, cheDoPhongToMobile, cheDoXem]);

  useEffect(() => {
    if (!paperContentRef.current) return;
    const timer = setTimeout(() => {
      if (paperContentRef.current) {
        setChieuCaoGiayA4(paperContentRef.current.scrollHeight);
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [hopDong, tabHienThi, maNDDungTen, tyLeThuPhong]);

  const layCauHinhHtml2Pdf = (tenFile: string) => ({
    margin: [15, 18, 15, 15],
    filename: tenFile,
    image: { type: "jpeg" as const, quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      scrollY: 0,
      windowWidth: 1200,
      onclone: (clonedDoc: Document) => {
        const style = clonedDoc.createElement("style");
        style.innerHTML = `
          img { display: inline-block !important; }
          .a4-contract-root, .a4-contract-root * {
            font-family: "Times New Roman", Times, serif !important;
            font-variant-ligatures: none !important;
          }
        `;
        clonedDoc.head.appendChild(style);
      },
    },
    jsPDF: {
      unit: "mm",
      format: "a4",
      orientation: "portrait" as const,
      compress: true,
    },
    pagebreak: {
      mode: ["css", "legacy"],
      before: [".page-break"],
      avoid: [
        "tr",
        "p",
        ".clause-item",
        ".sub-clause",
        ".section-title",
        ".avoid-break",
      ],
    },
  });

  const taoPdfPreview = async () => {
    if (!pdfExportRef.current || !hopDong || laManHinhNho) return;
    setDangTaoPdf(true);
    try {
      const html2pdfModule = (await import("html2pdf.js")).default;
      const opt = layCauHinhHtml2Pdf(
        `HopDong_${hopDong.TenPhong}_HD${hopDong.MaHDT}.pdf`
      );

      const pdfBlob = await html2pdfModule()
        .set(opt as any)
        .from(pdfExportRef.current)
        .outputPdf("blob");

      const url = URL.createObjectURL(pdfBlob);
      setPdfBlobUrl((oldUrl) => {
        if (oldUrl) URL.revokeObjectURL(oldUrl);
        return url;
      });
    } catch (err) {
      console.error("Lỗi khởi tạo PDF preview:", err);
      setCheDoXem("TRUC_TIEP");
    } finally {
      setDangTaoPdf(false);
    }
  };

  useEffect(() => {
    if (hopDong && cheDoXem === "PDF_EMBED" && !laManHinhNho) {
      const timer = setTimeout(() => {
        taoPdfPreview();
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [hopDong, maNDDungTen, tabHienThi, cheDoXem, laManHinhNho]);

  const tatCaThanhVien =
    hopDong?.ThanhVienCungPhong && hopDong.ThanhVienCungPhong.length > 0
      ? hopDong.ThanhVienCungPhong
      : hopDong?.DanhSachThanhVien || [];

  const nguoiDaiDien =
    tatCaThanhVien.find((tv) => tv.MaND === maNDDungTen) ||
    tatCaThanhVien.find((tv) => tv.VaiTro === "DaiDien") ||
    tatCaThanhVien[0];

  const xuLyTaiFilePdf = async () => {
    if (!pdfExportRef.current || !hopDong) return;
    setDangTaiVe(true);
    try {
      const html2pdfModule = (await import("html2pdf.js")).default;
      const tenFile =
        tabHienThi === "HOP_DONG"
          ? `HopDong_${hopDong.TenPhong}_${
              nguoiDaiDien?.HoTen || "HD" + hopDong.MaHDT
            }.pdf`
          : `HoaDon_${hopDong.TenPhong}_HD${hopDong.MaHDT}.pdf`;

      await html2pdfModule()
        .set(layCauHinhHtml2Pdf(tenFile) as any)
        .from(pdfExportRef.current)
        .save();
    } catch (err) {
      console.error("Lỗi khi tải file PDF:", err);
      alert("Không thể tải file PDF. Vui lòng thử lại.");
    } finally {
      setDangTaiVe(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={["ChuTro", "QuanLy"]}>
      {(user) => (
        <div className="min-h-screen bg-[#F1F5F9] text-slate-900">
          <QuanLyHeader user={user} />

          <main className="mx-auto max-w-360 px-2.5 py-4 sm:px-5 sm:py-6">
            {/* Thanh điều hướng & công cụ trên cùng */}
            <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs sm:p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                  <button
                    type="button"
                    onClick={() => router.back()}
                    className="inline-flex w-fit cursor-pointer items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-100 whitespace-nowrap"
                  >
                    ← Quay lại
                  </button>

                  {hopDong && (
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h1 className="text-base font-bold text-slate-900 sm:text-xl">
                          Hợp Đồng Thuê Phòng
                        </h1>
                        <span className="rounded-full border border-[#00FFCC] bg-[#00FFCC]/30 px-2.5 py-0.5 text-[11px] font-bold text-slate-900">
                          {nfc(hopDong.TenPhong)} {nfc(hopDong.TenKhu)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {hopDong && (
                  <div className="flex flex-wrap items-center gap-2">
                    {tatCaThanhVien.length > 1 && (
                      <div className="flex w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs sm:w-auto">
                        <span className="font-semibold text-slate-600">
                          Đứng tên:
                        </span>
                        <select
                          value={maNDDungTen || ""}
                          onChange={(e) =>
                            setMaNDDungTen(Number(e.target.value))
                          }
                          className="max-w-[180px] truncate rounded-lg border border-slate-200 bg-white px-2 py-1 font-bold text-[#0F172A] outline-none focus:border-[#00E6B8] sm:max-w-none"
                        >
                          {tatCaThanhVien.map((tv) => (
                            <option key={tv.MaND} value={tv.MaND}>
                              {nfc(tv.HoTen)} (
                              {tv.VaiTro === "DaiDien"
                                ? "Đại diện"
                                : "Thành viên"}
                              )
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="flex w-full rounded-xl bg-slate-100 p-1 text-xs sm:w-auto">
                      <button
                        type="button"
                        onClick={() => setTabHienThi("HOP_DONG")}
                        className={`flex-1 cursor-pointer rounded-lg px-3 py-1.5 font-bold transition sm:flex-initial ${
                          tabHienThi === "HOP_DONG"
                            ? "bg-[#00F5C4] text-[#0F172A] shadow-2xs"
                            : "text-slate-600 hover:text-[#0F172A]"
                        }`}
                      >
                        Hợp đồng & Phụ lục
                      </button>
                      <button
                        type="button"
                        onClick={() => setTabHienThi("HOA_DON")}
                        className={`flex-1 cursor-pointer rounded-lg px-3 py-1.5 font-bold transition sm:flex-initial ${
                          tabHienThi === "HOA_DON"
                            ? "bg-[#00F5C4] text-[#0F172A] shadow-2xs"
                            : "text-slate-600 hover:text-[#0F172A]"
                        }`}
                      >
                        Hóa đơn kèm theo
                      </button>
                    </div>

                    {laManHinhNho ? (
                      <button
                        type="button"
                        onClick={() =>
                          setCheDoPhongToMobile(
                            cheDoPhongToMobile === "VUA_MAN_HINH"
                              ? "GOC_100"
                              : "VUA_MAN_HINH"
                          )
                        }
                        className="cursor-pointer rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-200"
                      >
                        {cheDoPhongToMobile === "VUA_MAN_HINH"
                          ? "🔍 Phóng to 100%"
                          : "📱 Thu vừa màn hình"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          setCheDoXem(
                            cheDoXem === "PDF_EMBED"
                              ? "TRUC_TIEP"
                              : "PDF_EMBED"
                          )
                        }
                        className="cursor-pointer rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-200"
                      >
                        {cheDoXem === "PDF_EMBED"
                          ? "Xem trang A4 trực tiếp"
                          : "Xem bằng PDF Viewer"}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={xuLyTaiFilePdf}
                      disabled={dangTaiVe}
                      className="flex-1 cursor-pointer rounded-xl bg-[#00F5C4] px-4 py-2 text-center text-xs font-bold text-[#0F172A] shadow-2xs transition hover:bg-[#00E0B0] disabled:opacity-60 sm:flex-initial"
                    >
                      {dangTaiVe ? "Đang tạo PDF..." : "⬇ Tải hợp đồng (PDF A4)"}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Nội dung hiển thị Hợp đồng */}
            {dangTaiDuLieu ? (
              <div className="flex h-80 flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white p-10 text-slate-600 shadow-2xs">
                <div className="h-9 w-9 animate-spin rounded-full border-4 border-[#00F5C4] border-t-[#0F172A]" />
                <p className="text-sm font-semibold">
                  Đang tải chi tiết hợp đồng #{maHDT}...
                </p>
              </div>
            ) : !hopDong ? null : (
              <div
                ref={previewContainerRef}
                className="relative w-full overflow-x-auto rounded-2xl"
              >
                {cheDoXem === "PDF_EMBED" && !laManHinhNho ? (
                  <div className="h-[82vh] w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    {dangTaoPdf ? (
                      <div className="flex h-full flex-col items-center justify-center gap-3 bg-[#F8FAFC] text-slate-700">
                        <div className="h-9 w-9 animate-spin rounded-full border-4 border-[#00F5C4] border-t-[#0F172A]" />
                        <p className="text-sm font-semibold">
                          Đang kết xuất bản xem trước PDF chuẩn khổ giấy A4...
                        </p>
                      </div>
                    ) : pdfBlobUrl ? (
                      <iframe
                        src={pdfBlobUrl}
                        title="Xem chi tiết hợp đồng PDF"
                        className="h-full w-full border-0"
                      />
                    ) : null}
                  </div>
                ) : (
                  <div
                    className="mx-auto flex justify-center overflow-x-auto py-2 sm:py-4"
                    style={{
                      height:
                        tyLeThuPhong < 1
                          ? `${Math.ceil(chieuCaoGiayA4 * tyLeThuPhong) + 24}px`
                          : "auto",
                    }}
                  >
                    <div
                      ref={paperContentRef}
                      style={{
                        width: "210mm",
                        minWidth: "210mm",
                        transform:
                          tyLeThuPhong < 1
                            ? `scale(${tyLeThuPhong})`
                            : "none",
                        transformOrigin: "top center",
                      }}
                      className="rounded-sm border border-slate-300 bg-white px-[15mm] py-[15mm] pl-[18mm] text-black shadow-xl transition-transform duration-150"
                    >
                      <HopDongA4View
                        hopDong={hopDong}
                        maNDDungTen={maNDDungTen}
                        tabHienThi={tabHienThi}
                      />
                    </div>
                  </div>
                )}

                {/* Khung A4 ẩn chuẩn kích thước dùng riêng cho html2pdf khi bấm Tải PDF */}
                <div className="pointer-events-none fixed top-0 -left-[9999px] w-[177mm] bg-white text-black">
                  <HopDongA4View
                    hopDong={hopDong}
                    maNDDungTen={maNDDungTen}
                    tabHienThi={tabHienThi}
                    contractRef={pdfExportRef}
                  />
                </div>
              </div>
            )}
          </main>
        </div>
      )}
    </ProtectedRoute>
  );
}

export default function ChiTietHopDongPage() {
  return (
    <Suspense
      fallback={
        <div className="p-10 text-center text-sm text-slate-500">
          Đang tải trang chi tiết hợp đồng...
        </div>
      }
    >
      <NoiDungChiTietHopDong />
    </Suspense>
  );
}