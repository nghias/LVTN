'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ChiTietHopDongFull, ThanhVienHopDong } from '@/types/hopDong.type';
import {
  dinhDangNgayVN,
  dinhDangTienVN,
  docSoTienThanhChu,
  tinhSoThangThue,
} from '@/utils/soThanhChu.util';

interface HopDongPdfModalProps {
  hopDong: ChiTietHopDongFull | null;
  onClose: () => void;
  tuDongIn?: boolean;
  tuDongTaiPdf?: boolean;
}

export default function HopDongPdfModal({
  hopDong,
  onClose,
  tuDongIn = false,
  tuDongTaiPdf = false,
}: HopDongPdfModalProps) {
  const contractRef = useRef<HTMLDivElement>(null);
  const daTuDongTaiRef = useRef<boolean>(false);

  const [tabHienThi, setTabHienThi] = useState<'HOP_DONG' | 'HOA_DON'>('HOP_DONG');
  const [cheDoXem, setCheDoXem] = useState<'PDF_EMBED' | 'TRUC_TIEP'>('PDF_EMBED');
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [dangTaoPdf, setDangTaoPdf] = useState<boolean>(false);
  const [dangTaiVe, setDangTaiVe] = useState<boolean>(false);

  // Cho phép chọn người đứng tên Bên B trên tờ hợp đồng
  const [maNDDungTen, setMaNDDungTen] = useState<number | null>(null);

  useEffect(() => {
    if (hopDong && hopDong.DanhSachThanhVien.length > 0) {
      const daiDien =
        hopDong.DanhSachThanhVien.find((tv) => tv.VaiTro === 'DaiDien') ||
        hopDong.DanhSachThanhVien[0];
      setMaNDDungTen(daiDien.MaND);
    }
  }, [hopDong]);

  // Cấu hình chuẩn trang giấy A4 (Lề trên 15mm, trái 18mm, dưới 15mm, phải 15mm)
  // Khắc phục lỗi lệch baseline của html2canvas + chống cắt ngang dòng văn bản khi qua trang
  const layCauHinhHtml2Pdf = (tenFile: string) => ({
    margin: [15, 18, 15, 15],
    filename: tenFile,
    image: { type: 'jpeg' as const, quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      scrollY: 0,
      onclone: (clonedDoc: Document) => {
        const style = clonedDoc.createElement('style');
        style.innerHTML = `
          img { display: inline-block !important; }
        `;
        clonedDoc.head.appendChild(style);
      },
    },
    jsPDF: {
      unit: 'mm',
      format: 'a4',
      orientation: 'portrait' as const,
      compress: true,
    },
    pagebreak: {
      mode: ['css', 'legacy'],
      before: ['.page-break'],
      avoid: [
        'tr',
        'p',
        '.clause-item',
        '.sub-clause',
        '.section-title',
        '.avoid-break',
      ],
    },
  });

  // Tự động render sang PDF Blob để hiển thị bằng trình đọc PDF toàn màn hình
  const taoPdfPreview = async () => {
    if (!contractRef.current || !hopDong) return;
    setDangTaoPdf(true);
    try {
      const html2pdfModule = (await import('html2pdf.js')).default;
      const opt = layCauHinhHtml2Pdf(`HopDong_${hopDong.TenPhong}_HD${hopDong.MaHDT}.pdf`);

      const pdfBlob = await html2pdfModule()
        .set(opt as any)
        .from(contractRef.current)
        .outputPdf('blob');

      const url = URL.createObjectURL(pdfBlob);
      setPdfBlobUrl((oldUrl) => {
        if (oldUrl) URL.revokeObjectURL(oldUrl);
        return url;
      });
    } catch (err) {
      console.error('Lỗi khởi tạo PDF preview:', err);
      setCheDoXem('TRUC_TIEP');
    } finally {
      setDangTaoPdf(false);
    }
  };

  useEffect(() => {
    if (hopDong && maNDDungTen) {
      const timer = setTimeout(() => {
        taoPdfPreview();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [hopDong, maNDDungTen, tabHienThi]);

  // Tự động tải file hợp đồng PDF về máy khi mở từ chức năng Xuất bản cứng
  useEffect(() => {
    if ((tuDongTaiPdf || tuDongIn) && hopDong && maNDDungTen && !daTuDongTaiRef.current) {
      daTuDongTaiRef.current = true;
      const timer = setTimeout(() => {
        xuLyTaiFilePdf();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [tuDongTaiPdf, tuDongIn, hopDong, maNDDungTen]);

  if (!hopDong) return null;

  const ngayKyDate = new Date(hopDong.NgayKy || new Date());
  const ngayKyStr = String(ngayKyDate.getDate()).padStart(2, '0');
  const thangKyStr = String(ngayKyDate.getMonth() + 1).padStart(2, '0');
  const namKyStr = String(ngayKyDate.getFullYear());

  // Xác định người đứng tên Bên B trên bản hợp đồng đang xem
  const tatCaThanhVien =
    hopDong.ThanhVienCungPhong && hopDong.ThanhVienCungPhong.length > 0
      ? hopDong.ThanhVienCungPhong
      : hopDong.DanhSachThanhVien;

  const nguoiDaiDien: ThanhVienHopDong =
    tatCaThanhVien.find((tv) => tv.MaND === maNDDungTen) ||
    hopDong.DanhSachThanhVien.find((tv) => tv.VaiTro === 'DaiDien') ||
    hopDong.DanhSachThanhVien[0] || {
      MaND: 0,
      HoTen: '................................................',
      CCCD: '................................',
      NgayCap: null,
      NoiCap: 'Cục Cảnh sát QLHC về TTXH',
      NamSinh: null,
      SDT: '................................',
      Email: '................................',
      DiaChi: '................................................',
      NgayVao: hopDong.NgayBD,
      NgayDi: null,
      VaiTro: 'DaiDien',
      TamTru: 'ChuaDangKy',
    };

  // Đủ 5 dòng mặc định như trong mẫu HopDongThuePhongTro.docx
  const danhSachBangThanhVien = [...tatCaThanhVien];
  while (danhSachBangThanhVien.length < 5) {
    danhSachBangThanhVien.push({
      MaND: -danhSachBangThanhVien.length - 1,
      HoTen: '',
      CCCD: '',
      NgayCap: null,
      NoiCap: null,
      NamSinh: null,
      SDT: '',
      Email: '',
      DiaChi: '',
      NgayVao: '',
      NgayDi: null,
      VaiTro: 'ThanhVien',
      TamTru: 'ChuaDangKy',
    });
  }

  // Kiểm tra tiện ích của phòng
  const coTienIch = (tuKhoa: string) =>
    hopDong.DanhSachTienIch.some((ti) =>
      ti.TenTI.toLowerCase().includes(tuKhoa.toLowerCase())
    );

  // Kiểm tra phí dịch vụ đăng ký
  const timPhiDichVu = (tuKhoa: string) =>
    hopDong.DanhSachPhiDichVu.find((p) => {
      const ten = (p.TenDV || p.TenPDV || '').toLowerCase();
      return ten.includes(tuKhoa.toLowerCase());
    });

  const layDonGiaDV = (dv?: any) => Number(dv?.DonGia ?? dv?.Gia ?? 0);
  const laySoLuongDV = (dv?: any) => Number(dv?.SoLuong ?? 1);

  const phiWifi = timPhiDichVu('wifi') || timPhiDichVu('internet') || timPhiDichVu('mạng');
  const phiRac = timPhiDichVu('rác');
  const phiGiuXe = timPhiDichVu('xe');
  const phiVeSinh = timPhiDichVu('vệ sinh') || timPhiDichVu('chiếu sáng');

  const tongSoTheTu = hopDong.DanhSachThanhVien.reduce(
    (sum, tv) => sum + Number(tv.SoLuongThe || 0),
    0
  );
  const danhSachMaTheTu = hopDong.DanhSachThanhVien.map((tv) => tv.DanhSachMaThe)
    .filter(Boolean)
    .join(', ');

  // Xử lý tải file PDF chuẩn khổ A4 về máy
  const xuLyTaiFilePdf = async () => {
    if (!contractRef.current) return;
    setDangTaiVe(true);
    try {
      const html2pdfModule = (await import('html2pdf.js')).default;
      const tenFile =
        tabHienThi === 'HOP_DONG'
          ? `HopDong_${hopDong.TenPhong}_${nguoiDaiDien.HoTen}.pdf`
          : `HoaDon_${hopDong.TenPhong}_HD${hopDong.MaHDT}.pdf`;

      await html2pdfModule()
        .set(layCauHinhHtml2Pdf(tenFile) as any)
        .from(contractRef.current)
        .save();
    } catch (err) {
      console.error('Lỗi khi tải file PDF:', err);
      alert('Không thể tải file PDF. Vui lòng thử lại.');
    } finally {
      setDangTaiVe(false);
    }
  };

  // Tính dữ liệu mẫu Hóa đơn từ HoaDonMoiNhat hoặc ước tính kỳ đầu
  const hd = hopDong.HoaDonMoiNhat;
  const thangHoaDon = hd
    ? new Date(hd.NgayTinh).getMonth() + 1
    : ngayKyDate.getMonth() + 1;
  const namHoaDon = hd ? new Date(hd.NgayTinh).getFullYear() : ngayKyDate.getFullYear();
  const cSoDienCu = hd ? hd.SoDienCu : hopDong.ChiSoBanGiao.SoDienCu;
  const cSoDienMoi = hd ? hd.SoDienMoi : hopDong.ChiSoBanGiao.SoDienMoi;
  const tieuThuDien = Math.max(0, cSoDienMoi - cSoDienCu);
  const giaDienApDung = hd ? hd.GiaDien : hopDong.GiaDienNuoc.GiaDien;
  const thanhTienDien = hd ? hd.TienDien : tieuThuDien * giaDienApDung;

  const cSoNuocCu = hd ? hd.SoNuocCu : hopDong.ChiSoBanGiao.SoNuocCu;
  const cSoNuocMoi = hd ? hd.SoNuocMoi : hopDong.ChiSoBanGiao.SoNuocMoi;
  const tieuThuNuoc = Math.max(0, cSoNuocMoi - cSoNuocCu);
  const giaNuocApDung = hd ? hd.GiaNuoc : hopDong.GiaDienNuoc.GiaNuoc;
  const thanhTienNuoc = hd ? hd.TienNuoc : tieuThuNuoc * giaNuocApDung;

  const maDVRac = phiRac?.MaDV ?? phiRac?.MaPDV;
  const tienRac = phiRac ? layDonGiaDV(phiRac) * laySoLuongDV(phiRac) : 0;
  const tienDichVuKhac = hopDong.DanhSachPhiDichVu.filter(
    (p) => (p.MaDV ?? p.MaPDV) !== maDVRac
  ).reduce((sum, p) => sum + layDonGiaDV(p) * laySoLuongDV(p), 0);

  const tongCongHoaDon = hd
    ? Number(hd.TongTien)
    : Number(hopDong.GiaPhong) +
      Number(thanhTienDien) +
      Number(thanhTienNuoc) +
      tienRac +
      tienDichVuKhac;

  return (
    <div className="fixed inset-0 z-50 flex h-screen w-screen flex-col overflow-hidden bg-[#F1F5F9]">
      {/* Thanh công cụ phía trên toàn màn hình */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0B1D33] px-5 py-3 text-white shadow-md">
        <div>
          <h2 className="text-base font-bold md:text-lg">
            Hợp Đồng Thuê Phòng #{hopDong.MaHDT} - {hopDong.TenPhong} ({hopDong.TenKhu})
          </h2>
          <p className="text-xs text-slate-300">
            Chuẩn mẫu Hợp đồng & Phụ lục khổ giấy A4 — Tự động điền thông tin hai bên
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Bộ chọn người đứng tên bản hợp đồng nếu phòng có từ 2 người trở lên */}
          {tatCaThanhVien.length > 1 && (
            <div className="flex items-center gap-2 rounded bg-slate-800 px-3 py-1.5 text-xs">
              <span className="text-slate-300">Bản HĐ đứng tên:</span>
              <select
                value={maNDDungTen || ''}
                onChange={(e) => setMaNDDungTen(Number(e.target.value))}
                className="rounded bg-white px-2 py-1 font-semibold text-[#0B1D33]"
              >
                {tatCaThanhVien.map((tv) => (
                  <option key={tv.MaND} value={tv.MaND}>
                    {tv.HoTen} ({tv.VaiTro === 'DaiDien' ? 'Đại diện' : 'Thành viên cùng phòng'})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Chuyển đổi mẫu Hợp đồng / Mẫu Hóa đơn */}
          <div className="flex rounded bg-slate-800 p-1 text-xs">
            <button
              onClick={() => setTabHienThi('HOP_DONG')}
              className={`rounded px-3 py-1.5 font-medium transition ${
                tabHienThi === 'HOP_DONG'
                  ? 'bg-[#00A896] text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Mẫu Hợp Đồng & Phụ Lục
            </button>
            <button
              onClick={() => setTabHienThi('HOA_DON')}
              className={`rounded px-3 py-1.5 font-medium transition ${
                tabHienThi === 'HOA_DON'
                  ? 'bg-[#00A896] text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Mẫu Hóa Đơn Kèm Theo
            </button>
          </div>

          {/* Chuyển chế độ Xem PDF Nhúng / Xem Bản Gốc */}
          <button
            onClick={() =>
              setCheDoXem(cheDoXem === 'PDF_EMBED' ? 'TRUC_TIEP' : 'PDF_EMBED')
            }
            className="rounded border border-slate-500 px-3 py-1.5 text-xs font-medium hover:bg-slate-800"
          >
            {cheDoXem === 'PDF_EMBED' ? 'Xem trang A4 trực tiếp' : 'Xem bằng PDF Viewer'}
          </button>

          {/* Nút Tải hợp đồng bản cứng chuẩn A4 về máy */}
          <button
            onClick={xuLyTaiFilePdf}
            disabled={dangTaiVe}
            className="rounded bg-[#00A896] px-4 py-1.5 text-xs font-semibold text-white hover:bg-teal-600 disabled:opacity-60"
          >
            {dangTaiVe ? 'Đang tải hợp đồng...' : 'Tải hợp đồng về máy (PDF A4)'}
          </button>

          <button
            onClick={onClose}
            className="rounded bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
          >
            Đóng
          </button>
        </div>
      </div>

      {/* Khu vực hiển thị nội dung PDF mở rộng toàn màn hình */}
      <div className="relative flex-1 overflow-y-auto bg-slate-200">
        {cheDoXem === 'PDF_EMBED' && (
          <div className="h-full w-full overflow-hidden bg-white">
            {dangTaoPdf ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-700">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#00A896] border-t-transparent" />
                <p className="text-sm font-medium">
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
        )}

        {/* Bản gốc HTML chuẩn khổ giấy A4 theo đúng file HopDongThuePhongTro.docx */}
        <div
          className={
            cheDoXem === 'TRUC_TIEP'
              ? 'mx-auto my-6 w-[210mm] bg-white px-[15mm] py-[15mm] pl-[18mm] text-black shadow-2xl'
              : 'fixed -left-[9999px] top-0 w-[177mm] bg-white text-black'
          }
        >
          <div ref={contractRef} className="a4-contract-root">
            <style>{`
              /* Khắc phục lỗi lệch baseline chữ của html2canvas khi dùng chung với Tailwind CSS */
              img {
                display: inline-block;
              }
              .a4-contract-root {
                font-family: "Times New Roman", Times, serif;
                font-size: 12pt;
                line-height: 1.45;
                color: #000000;
                text-align: justify;
                width: 100%;
                box-sizing: border-box;
              }
              .a4-contract-root p,
              .a4-contract-root .clause-item {
                margin: 0 0 4px 0;
                padding-bottom: 2px;
                text-align: justify;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
              .a4-contract-root .section-title {
                font-weight: bold;
                margin-top: 10px;
                margin-bottom: 4px;
                padding-bottom: 2px;
                text-align: left;
                page-break-after: avoid !important;
                break-after: avoid !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
              .a4-contract-root .sub-clause {
                padding-left: 14px;
                padding-bottom: 2px;
                margin-bottom: 4px;
                text-align: justify;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
              .a4-contract-root table.contract-table {
                width: 100%;
                border-collapse: collapse;
                table-layout: fixed;
                margin: 8px 0 12px 0;
              }
              .a4-contract-root table.contract-table th {
                border: 1px solid #000000;
                background-color: #f8fafc;
                font-weight: bold;
                text-align: center;
                vertical-align: middle;
                padding: 8px 6px 10px 6px;
                font-size: 10.5pt;
                line-height: 1.4;
                word-wrap: break-word;
                overflow-wrap: break-word;
              }
              .a4-contract-root table.contract-table td {
                border: 1px solid #000000;
                padding: 7px 6px 9px 6px;
                font-size: 10.5pt;
                line-height: 1.45;
                vertical-align: middle;
                word-wrap: break-word;
                overflow-wrap: break-word;
                text-align: left;
              }
              .a4-contract-root tr,
              .a4-contract-root .avoid-break {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
              .a4-contract-root .page-break {
                page-break-before: always !important;
                break-before: page !important;
              }
              .a4-contract-root table.no-border,
              .a4-contract-root table.no-border td {
                border: none !important;
              }
              @media print {
                @page {
                  size: A4 portrait;
                  margin: 15mm 15mm 15mm 18mm;
                }
              }
            `}</style>

            {tabHienThi === 'HOP_DONG' ? (
              <div>
                {/* QUỐC HIỆU & TIÊU NGỮ */}
                <div className="avoid-break" style={{ textAlign: 'center', marginBottom: '12px' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '12.5pt' }}>
                    CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                  </div>
                  <div
                    style={{
                      fontWeight: 'bold',
                      fontSize: '12.5pt',
                      display: 'inline-block',
                      borderBottom: '1px solid #000',
                      paddingBottom: '3px',
                      marginBottom: '8px',
                    }}
                  >
                    Độc lập - Tự do - Hạnh phúc
                  </div>
                  <div style={{ fontWeight: 'bold', fontSize: '15.5pt', marginTop: '4px' }}>
                    HỢP ĐỒNG THUÊ PHÒNG TRỌ
                  </div>
                  <div style={{ fontSize: '11.5pt', marginTop: '4px' }}>
                    Số: <strong>{String(hopDong.MaHDT).padStart(3, '0')}/{namKyStr}/HĐTT</strong>
                    &nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;Hợp đồng kỳ trước liền kề (nếu có):{' '}
                    <strong>
                      {hopDong.MaHDTCu
                        ? `${String(hopDong.MaHDTCu).padStart(3, '0')}/${namKyStr}/HĐTT`
                        : 'Không'}
                    </strong>
                  </div>
                </div>

                {/* CĂN CỨ PHÁP LÝ */}
                <div style={{ fontStyle: 'italic', fontSize: '11pt', marginBottom: '8px' }}>
                  <div className="clause-item">
                    - Căn cứ Hiến pháp nước Cộng hòa xã hội chủ nghĩa Việt Nam năm 2013;
                  </div>
                  <div className="clause-item">
                    - Căn cứ Bộ luật Dân sự số 91/2015/QH13 ngày 24/11/2015 của Quốc hội;
                  </div>
                  <div className="clause-item">
                    - Căn cứ Luật Nhà ở số 27/2023/QH15 ngày 27/11/2023 của Quốc hội và các văn
                    bản hướng dẫn thi hành;
                  </div>
                  <div className="clause-item">
                    - Căn cứ Luật Cư trú số 68/2020/QH14 ngày 13/11/2020 của Quốc hội và các Thông
                    tư của Bộ Công an quy định về đăng ký tạm trú, thông báo lưu trú;
                  </div>
                  <div className="clause-item">
                    - Căn cứ Nghị định số 13/2023/NĐ-CP ngày 17/4/2023 của Chính phủ về bảo vệ dữ
                    liệu cá nhân;
                  </div>
                  <div className="clause-item">
                    - Căn cứ nhu cầu thực tế và sự thỏa thuận tự nguyện, bình đẳng, thiện chí của
                    hai bên.
                  </div>
                </div>

                <p>
                  Hôm nay, ngày <strong>{ngayKyStr}</strong> tháng <strong>{thangKyStr}</strong>{' '}
                  năm <strong>{namKyStr}</strong>, tại địa chỉ:{' '}
                  <strong>{hopDong.DiaChiKhuTro}</strong>, chúng tôi gồm có:
                </p>

                {/* MỤC I: BÊN A */}
                <div className="avoid-break">
                  <div className="section-title">
                    I. BÊN CHO THUÊ PHÒNG TRỌ (Gọi tắt là Bên A):
                  </div>
                  <div className="clause-item">
                    - Chủ cơ sở / Người đại diện cho thuê: Ông/Bà:{' '}
                    <strong>{hopDong.TenChuTro}</strong> &nbsp;&nbsp;&nbsp;&nbsp; Sinh năm:{' '}
                    <strong>{hopDong.NamSinhChuTro || '............'}</strong>
                  </div>
                </div>
                <div className="clause-item">
                  - Số CCCD/ĐDCN:{' '}
                  <strong>{hopDong.CCCDChuTro || '........................'}</strong>
                  &nbsp;&nbsp;&nbsp; Ngày cấp:{' '}
                  <strong>
                    {hopDong.NgayCapChuTro
                      ? dinhDangNgayVN(hopDong.NgayCapChuTro)
                      : '....../....../............'}
                  </strong>
                  &nbsp;&nbsp;&nbsp; Nơi cấp:{' '}
                  <strong>
                    {hopDong.NoiCapChuTro || 'Cục Cảnh sát QLHC về TTXH'}
                  </strong>
                </div>
                <div className="clause-item">
                  - Địa chỉ thường trú:{' '}
                  <strong>{hopDong.DiaChiChuTro || hopDong.DiaChiKhuTro}</strong>
                </div>
                <div className="clause-item">
                  - Số điện thoại liên hệ: <strong>{hopDong.SDTChuTro}</strong> &nbsp;&nbsp;&nbsp;
                  Email (nếu có): <strong>{hopDong.EmailChuTro || '........................'}</strong>
                </div>
                <div className="clause-item">
                  - Người quản lý cơ sở trực tiếp (nếu có): Ông/Bà:{' '}
                  <strong>{hopDong.TenChuTro}</strong> &nbsp;&nbsp;&nbsp; Số điện thoại:{' '}
                  <strong>{hopDong.SDTChuTro}</strong>
                </div>
                <div className="clause-item">
                  - Tài khoản ngân hàng nhận thanh toán: Số tài khoản:{' '}
                  <strong>
                    {hopDong.ThongTinThanhToan?.STK || '................................'}
                  </strong>{' '}
                  tại Ngân hàng:{' '}
                  <strong>
                    {hopDong.ThongTinThanhToan?.TenNganHang || '................................'}
                  </strong>{' '}
                  – Chủ tài khoản:{' '}
                  <strong>
                    {hopDong.ThongTinThanhToan?.ChuTaiKhoan || hopDong.TenChuTro}
                  </strong>
                </div>

                {/* MỤC II: BÊN B */}
                <div className="avoid-break">
                  <div className="section-title">
                    II. BÊN THUÊ PHÒNG TRỌ (Gọi tắt là Bên B):
                  </div>
                  <div className="clause-item">
                    - Người đại diện đứng tên Hợp đồng: Ông/Bà:{' '}
                    <strong>{nguoiDaiDien.HoTen}</strong> &nbsp;&nbsp;&nbsp;&nbsp; Sinh năm:{' '}
                    <strong>{nguoiDaiDien.NamSinh || '............'}</strong>
                  </div>
                </div>
                <div className="clause-item">
                  - Số CCCD/ĐDCN:{' '}
                  <strong>{nguoiDaiDien.CCCD || '........................'}</strong>
                  &nbsp;&nbsp;&nbsp; Ngày cấp:{' '}
                  <strong>
                    {nguoiDaiDien.NgayCap
                      ? dinhDangNgayVN(nguoiDaiDien.NgayCap)
                      : '....../....../............'}
                  </strong>
                  &nbsp;&nbsp;&nbsp; Nơi cấp:{' '}
                  <strong>
                    {nguoiDaiDien.NoiCap || 'Cục Cảnh sát QLHC về TTXH'}
                  </strong>
                </div>
                <div className="clause-item">
                  - Địa chỉ thường trú:{' '}
                  <strong>
                    {nguoiDaiDien.DiaChi || '................................................'}
                  </strong>
                </div>
                <div className="clause-item">
                  - Số điện thoại liên hệ: <strong>{nguoiDaiDien.SDT}</strong> &nbsp;&nbsp;&nbsp;
                  Email (nếu có):{' '}
                  <strong>{nguoiDaiDien.Email || '........................'}</strong>
                </div>

                <div className="clause-item" style={{ marginTop: '6px', fontWeight: 'bold' }}>
                  Danh sách toàn bộ thành viên thực tế lưu trú tại phòng trọ (bao gồm Người đại
                  diện ký hợp đồng và các thành viên ở cùng):
                </div>

                {/* BẢNG THÀNH VIÊN LƯU TRÚ */}
                <table className="contract-table">
                  <thead>
                    <tr>
                      <th style={{ width: '6%' }}>TT</th>
                      <th style={{ width: '21%' }}>Họ và tên thành viên</th>
                      <th style={{ width: '9%' }}>Năm sinh</th>
                      <th style={{ width: '22%' }}>Số CCCD & Điện thoại</th>
                      <th style={{ width: '14%' }}>Vai trò trong phòng</th>
                      <th style={{ width: '14%' }}>Ngày vào ở / Ngày chuyển đi</th>
                      <th style={{ width: '14%' }}>Tình trạng đăng ký Tạm trú</th>
                    </tr>
                  </thead>
                  <tbody>
                    {danhSachBangThanhVien.map((tv, idx) => {
                      const coDuLieu = Boolean(tv.HoTen);
                      const laDaiDien = tv.MaND === nguoiDaiDien.MaND || tv.VaiTro === 'DaiDien';
                      return (
                        <tr key={idx}>
                          <td style={{ textAlign: 'center' }}>
                            {String(idx + 1).padStart(2, '0')}
                          </td>
                          <td>
                            {coDuLieu ? (
                              <strong>{tv.HoTen}</strong>
                            ) : (
                              '........................'
                            )}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {coDuLieu ? tv.NamSinh || '........' : '........'}
                          </td>
                          <td>
                            <div>
                              CCCD: {coDuLieu ? tv.CCCD || '..............' : '..............'}
                            </div>
                            {coDuLieu && tv.NgayCap && (
                              <div style={{ fontSize: '9.5pt' }}>
                                Ngày cấp: {dinhDangNgayVN(tv.NgayCap)}
                              </div>
                            )}
                            <div>
                              SĐT: {coDuLieu ? tv.SDT || '..............' : '..............'}
                            </div>
                          </td>
                          <td>
                            {coDuLieu
                              ? laDaiDien
                                ? 'Người đại diện (Chủ hộ tạm trú)'
                                : 'Thành viên ở ghép'
                              : idx === 0
                                ? 'Người đại diện (Chủ hộ tạm trú)'
                                : 'Thành viên ở ghép'}
                          </td>
                          <td>
                            <div>
                              Vào: {coDuLieu ? dinhDangNgayVN(tv.NgayVao) : '..../..../20....'}
                            </div>
                            <div>
                              Đi:{' '}
                              {coDuLieu && tv.NgayDi
                                ? dinhDangNgayVN(tv.NgayDi)
                                : '....../....../......'}
                            </div>
                          </td>
                          <td>
                            <div>
                              [{coDuLieu && tv.TamTru !== 'DaDangKy' ? 'x' : ' '}] Chưa đăng ký
                            </div>
                            <div>
                              [{coDuLieu && tv.TamTru === 'DaDangKy' ? 'x' : ' '}] Đã đăng ký
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <p>
                  Hai bên cùng thống nhất giao kết Hợp đồng thuê phòng trọ với các điều khoản cụ
                  thể dưới đây:
                </p>

                {/* ĐIỀU 1 */}
                <div className="avoid-break">
                  <div className="section-title">
                    ĐIỀU 1. ĐỐI TƯỢNG CHO THUÊ VÀ MỤC ĐÍCH SỬ DỤNG
                  </div>
                  <div className="clause-item">
                    <strong>1.1. Thông tin phòng trọ:</strong> Bên A đồng ý cho Bên B thuê và Bên B
                    đồng ý thuê phòng trọ số: <strong>{hopDong.TenPhong}</strong> thuộc Khu trọ / Cơ
                    sở: <strong>{hopDong.TenKhu}</strong> tại địa chỉ:{' '}
                    <strong>{hopDong.DiaChiKhuTro}</strong>.
                  </div>
                </div>
                <div className="clause-item">
                  <strong>1.2. Đặc điểm và tiện ích phòng trọ:</strong> Diện tích sử dụng:{' '}
                  <strong>{hopDong.DienTich}</strong> m². Phòng được trang bị sẵn các tiện ích
                  gồm: [{coTienIch('gác') ? 'x' : ' '}] Gác lửng; [
                  {coTienIch('máy lạnh') || coTienIch('điều hòa') ? 'x' : ' '}] Máy lạnh; [
                  {coTienIch('tủ lạnh') ? 'x' : ' '}] Tủ lạnh; [
                  {coTienIch('vệ sinh') ? 'x' : 'x'}] Nhà vệ sinh khép kín; [
                  {coTienIch('wifi') || coTienIch('internet') || phiWifi ? 'x' : ' '}] Internet
                  Wifi; [{coTienIch('giặt') || coTienIch('phơi') ? 'x' : ' '}] Khu giặt phơi
                  chung; [{coTienIch('xe') || phiGiuXe ? 'x' : ' '}] Chỗ để xe. Số lượng thẻ
                  từ/chìa khóa ra vào bàn giao:{' '}
                  <strong>{tongSoTheTu || tatCaThanhVien.length}</strong> chiếc (Chi tiết hiện
                  trạng trang thiết bị được ghi nhận tại Phụ lục Biên bản bàn giao đính kèm Hợp
                  đồng này).
                </div>
                <div className="clause-item">
                  <strong>1.3. Mục đích thuê:</strong> Bên B thuê phòng trọ để ở và sinh hoạt hợp
                  pháp với số lượng tối đa không quá{' '}
                  <strong>{Math.max(4, tatCaThanhVien.length)}</strong> người. Tuyệt đối không sử
                  dụng phòng trọ vào mục đích sản xuất, tàng trữ hàng hóa trái phép hoặc thực hiện
                  các hành vi vi phạm pháp luật.
                </div>

                {/* ĐIỀU 2 */}
                <div className="avoid-break">
                  <div className="section-title">
                    ĐIỀU 2. THỜI HẠN THUÊ, GIÁ THUÊ PHÒNG, TIỀN ĐẶT CỌC VÀ CHI PHÍ DỊCH VỤ
                  </div>
                  <div className="clause-item">
                    <strong>2.1. Thời hạn thuê:</strong> Thời hạn thuê phòng là{' '}
                    <strong>{tinhSoThangThue(hopDong.NgayBD, hopDong.NgayKT)}</strong> tháng, tính
                    từ ngày <strong>{dinhDangNgayVN(hopDong.NgayBD)}</strong> đến hết ngày{' '}
                    <strong>{dinhDangNgayVN(hopDong.NgayKT)}</strong>.
                  </div>
                </div>
                <div className="clause-item">
                  <strong>2.2. Giá thuê phòng:</strong>{' '}
                  <strong>{dinhDangTienVN(hopDong.GiaPhong)}</strong> đồng/tháng (Bằng chữ:{' '}
                  <em>{docSoTienThanhChu(hopDong.GiaPhong)}</em>). Giá thuê phòng không bao gồm
                  tiền điện, tiền nước và các khoản phí dịch vụ sinh hoạt hàng tháng nêu tại Khoản
                  2.4 Điều này.
                </div>
                <div className="clause-item">
                  <strong>2.3. Tiền đặt cọc bảo đảm thực hiện hợp đồng:</strong> Ngay khi ký Hợp
                  đồng này, Bên B giao cho Bên A khoản tiền đặt cọc là:{' '}
                  <strong>{dinhDangTienVN(hopDong.TienCoc)}</strong> đồng (Bằng chữ:{' '}
                  <em>{docSoTienThanhChu(hopDong.TienCoc)}</em>).
                </div>
                <div className="clause-item" style={{ textIndent: '18px' }}>
                  Khoản tiền đặt cọc này được dùng để bảo đảm việc thực hiện nghĩa vụ hợp đồng của
                  Bên B và không được tự ý khấu trừ vào tiền thuê phòng hàng tháng. Khi Hợp đồng
                  chấm dứt đúng thời hạn hoặc chấm dứt trước hạn theo đúng thỏa thuận tại Điều 7,
                  sau khi Bên B đã bàn giao lại phòng, trang thiết bị, thẻ ra vào, hoàn tất thủ tục
                  xóa đăng ký tạm trú và thanh toán đầy đủ tiền phòng, tiền điện, nước, phí dịch
                  vụ, chi phí bồi thường hư hỏng (nếu có), Bên A có trách nhiệm hoàn trả đầy đủ số
                  tiền đặt cọc còn lại cho Bên B trong vòng 03 (ba) ngày làm việc.
                </div>
                <div className="clause-item">
                  <strong>2.4. Đơn giá điện, nước và phí dịch vụ hàng tháng:</strong> Hai bên
                  thống nhất áp dụng bảng đơn giá điện, nước và các khoản phí dịch vụ kèm theo hợp
                  đồng như sau:
                </div>

                {/* BẢNG ĐƠN GIÁ ĐIỆN NƯỚC & PHÍ DỊCH VỤ */}
                <table className="contract-table">
                  <thead>
                    <tr>
                      <th style={{ width: '6%' }}>TT</th>
                      <th style={{ width: '34%' }}>Tên khoản mục chi phí / Dịch vụ</th>
                      <th style={{ width: '14%' }}>Đơn vị tính</th>
                      <th style={{ width: '18%' }}>Đơn giá (VNĐ)</th>
                      <th style={{ width: '28%' }}>
                        Chỉ số bàn giao đầu kỳ / Số lượng đăng ký
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ textAlign: 'center' }}>01</td>
                      <td>Tiền điện sinh hoạt (theo đồng hồ phòng)</td>
                      <td style={{ textAlign: 'center' }}>kWh (Số)</td>
                      <td style={{ textAlign: 'right' }}>
                        <strong>{dinhDangTienVN(hopDong.GiaDienNuoc.GiaDien)}</strong> đ/kWh
                      </td>
                      <td>
                        <div>
                          Chỉ số đầu: <strong>{hopDong.ChiSoBanGiao.SoDienMoi}</strong> kWh
                        </div>
                        <div>Ngày ghi: {dinhDangNgayVN(hopDong.ChiSoBanGiao.NgayGhi)}</div>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ textAlign: 'center' }}>02</td>
                      <td>Tiền nước sinh hoạt (theo đồng hồ phòng)</td>
                      <td style={{ textAlign: 'center' }}>m³ (Khối)</td>
                      <td style={{ textAlign: 'right' }}>
                        <strong>{dinhDangTienVN(hopDong.GiaDienNuoc.GiaNuoc)}</strong> đ/m³
                      </td>
                      <td>
                        <div>
                          Chỉ số đầu: <strong>{hopDong.ChiSoBanGiao.SoNuocMoi}</strong> m³
                        </div>
                        <div>Ngày ghi: {dinhDangNgayVN(hopDong.ChiSoBanGiao.NgayGhi)}</div>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ textAlign: 'center' }}>03</td>
                      <td>Phí dịch vụ Internet Wifi</td>
                      <td style={{ textAlign: 'center' }}>
                        {phiWifi?.DonViTinh || 'Phòng/Tháng'}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <strong>{phiWifi ? dinhDangTienVN(layDonGiaDV(phiWifi)) : '0'}</strong> đ
                      </td>
                      <td>
                        Số lượng: {phiWifi ? String(laySoLuongDV(phiWifi)).padStart(2, '0') : '0'}{' '}
                        &nbsp;[{phiWifi ? 'x' : ' '}] Có sử dụng
                      </td>
                    </tr>
                    <tr>
                      <td style={{ textAlign: 'center' }}>04</td>
                      <td>Phí thu gom rác sinh hoạt</td>
                      <td style={{ textAlign: 'center' }}>
                        {phiRac?.DonViTinh || 'Phòng/Tháng'}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <strong>{phiRac ? dinhDangTienVN(layDonGiaDV(phiRac)) : '0'}</strong> đ
                      </td>
                      <td>
                        Số lượng: {phiRac ? String(laySoLuongDV(phiRac)).padStart(2, '0') : '0'}{' '}
                        &nbsp;[{phiRac ? 'x' : ' '}] Có sử dụng
                      </td>
                    </tr>
                    <tr>
                      <td style={{ textAlign: 'center' }}>05</td>
                      <td>Phí giữ xe máy / xe đạp điện</td>
                      <td style={{ textAlign: 'center' }}>
                        {phiGiuXe?.DonViTinh || 'Xe/Tháng'}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <strong>
                          {phiGiuXe ? dinhDangTienVN(layDonGiaDV(phiGiuXe)) : '0'}
                        </strong>{' '}
                        đ/xe
                      </td>
                      <td>
                        Số lượng:{' '}
                        {phiGiuXe ? String(laySoLuongDV(phiGiuXe)).padStart(2, '0') : '0'} chiếc
                      </td>
                    </tr>
                    <tr>
                      <td style={{ textAlign: 'center' }}>06</td>
                      <td>Phí vệ sinh và điện chiếu sáng chung</td>
                      <td style={{ textAlign: 'center' }}>
                        {phiVeSinh?.DonViTinh || 'Phòng/Tháng'}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <strong>
                          {phiVeSinh ? dinhDangTienVN(layDonGiaDV(phiVeSinh)) : '0'}
                        </strong>{' '}
                        đ
                      </td>
                      <td>
                        Số lượng:{' '}
                        {phiVeSinh ? String(laySoLuongDV(phiVeSinh)).padStart(2, '0') : '0'}{' '}
                        &nbsp;[{phiVeSinh ? 'x' : ' '}] Có sử dụng
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* ĐIỀU 3 */}
                <div className="avoid-break">
                  <div className="section-title">
                    ĐIỀU 3. CHỐT CHỈ SỐ ĐIỆN NƯỚC, LẬP HÓA ĐƠN VÀ THANH TOÁN HÀNG THÁNG
                  </div>
                  <div className="clause-item">
                    <strong>3.1. Chốt chỉ số điện, nước và lập hóa đơn:</strong> Chỉ số điện, nước
                    tiêu thụ thực tế của phòng được chốt định kỳ vào ngày <strong>28</strong> hàng
                    tháng. Từ ngày 01 đến ngày 03 hàng tháng, Bên A lập phiếu báo/hóa đơn tiền nhà
                    (bao gồm: Tiền thuê phòng + Tiền điện + Tiền nước + Phí dịch vụ đã đăng ký + Các
                    khoản chi phí phát sinh hoặc khấu trừ nếu có) và gửi cho Bên B.
                  </div>
                </div>
                <div className="clause-item">
                  <strong>3.2. Thời hạn và hình thức thanh toán:</strong> Bên B có nghĩa vụ thanh
                  toán đầy đủ tổng số tiền trên hóa đơn cho Bên A trong khoảng thời gian từ ngày 01
                  đến hết ngày 05 hàng tháng bằng hình thức chuyển khoản ngân hàng (hoặc quét mã QR
                  thanh toán) vào tài khoản của Bên A nêu tại Mục I hoặc thanh toán bằng tiền mặt
                  có biên nhận.
                </div>
                <div className="clause-item">
                  <strong>3.3. Xử lý chậm thanh toán:</strong> Trường hợp Bên B chậm thanh toán
                  quá 05 (năm) ngày so với thời hạn quy định mà không có sự chấp thuận trước của
                  Bên A, Bên A có quyền nhắc nhở và tạm ngừng cung cấp các dịch vụ tiện ích; nếu
                  quá 10 (mười) ngày kể từ ngày đến hạn mà Bên B vẫn không hoàn tất nghĩa vụ thanh
                  toán, Bên A có quyền đơn phương chấm dứt hợp đồng và thu hồi phòng trọ theo quy
                  định tại Điều 7 Hợp đồng này.
                </div>

                {/* ĐIỀU 4 */}
                <div className="avoid-break">
                  <div className="section-title">
                    ĐIỀU 4. QUY ĐỊNH VỀ QUẢN LÝ NGƯỜI Ở GHÉP VÀ ĐĂNG KÝ TẠM TRÚ
                  </div>
                  <div className="clause-item">
                    <strong>4.1. Trách nhiệm của Người đại diện và thành viên ở ghép:</strong> Người
                    đại diện đứng tên Hợp đồng tại Mục II là người đại diện hợp pháp cho toàn bộ các
                    thành viên lưu trú trong phòng để giao dịch với Bên A, nhận thông báo, thanh
                    toán hóa đơn hàng tháng và đứng tên chủ hộ/người đại diện trong hồ sơ đăng ký
                    tạm trú của phòng. Các thành viên ở ghép có quyền sử dụng phòng trọ và có nghĩa
                    vụ liên đới tuân thủ đầy đủ nội quy khu trọ cũng như các điều khoản của Hợp đồng
                    này.
                  </div>
                </div>

                <div className="avoid-break">
                  <div className="clause-item">
                    <strong>
                      4.2. Quy định khi thêm người ở ghép hoặc có thành viên chuyển đi:
                    </strong>
                  </div>
                  <div className="sub-clause">
                    a) Khi có nhu cầu nhận thêm người vào ở ghép (trong phạm vi số người tối đa cho
                    phép), Bên B phải báo trước và cung cấp bản sao CCCD/ĐDCN của người mới để Bên A
                    kiểm tra, ghi nhận bổ sung vào Danh sách thành viên lưu trú (ghi rõ ngày bắt đầu
                    vào ở) và thực hiện khai báo tạm trú theo quy định.
                  </div>
                </div>
                <div className="sub-clause">
                  b) Khi một thành viên ở ghép chuyển đi nhưng các thành viên còn lại vẫn tiếp tục
                  thuê phòng, Hợp đồng này vẫn giữ nguyên hiệu lực. Bên B có trách nhiệm thông báo
                  cho Bên A để ghi nhận ngày chuyển đi thực tế của thành viên đó, bàn giao lại thẻ
                  ra vào và thực hiện thủ tục xóa đăng ký tạm trú cho người chuyển đi.
                </div>

                <div className="clause-item">
                  <strong>4.3. Quy định khi Người đại diện đứng tên Hợp đồng chuyển đi:</strong>{' '}
                  Trường hợp Người đại diện đứng tên Hợp đồng chuyển đi và các thành viên ở ghép
                  còn lại có nhu cầu tiếp tục thuê phòng, hai bên sẽ tiến hành lập biên bản thanh
                  lý Hợp đồng hiện tại và ký kết Hợp đồng mới với một thành viên ở lại làm Người
                  đại diện mới (hợp đồng mới được ghi nhận nối tiếp hợp đồng kỳ trước để làm căn cứ
                  đối chiếu lịch sử sử dụng phòng và điện nước), đồng thời thực hiện thủ tục cập
                  nhật lại người đại diện tạm trú với cơ quan Công an.
                </div>

                <div className="avoid-break">
                  <div className="clause-item">
                    <strong>
                      4.4. Nghĩa vụ đăng ký tạm trú và xóa đăng ký tạm trú (Theo Luật Cư trú năm
                      2020):
                    </strong>
                  </div>
                  <div className="sub-clause">
                    a) Trong thời hạn 03 (ba) ngày làm việc kể từ ngày dọn vào ở, toàn bộ thành viên
                    có tên trong phòng phải cung cấp đầy đủ thông tin, giấy tờ tùy thân và phối hợp
                    với Bên A để hoàn tất thủ tục thông báo lưu trú / đăng ký tạm trú (qua Cổng dịch
                    vụ công / ứng dụng VNeID hoặc trực tiếp tại Công an cấp xã nơi có nhà trọ).
                  </div>
                </div>
                <div className="sub-clause">
                  b) Khi chấm dứt Hợp đồng hoặc khi bất kỳ thành viên nào chuyển đi khỏi phòng trọ,
                  người chuyển đi và Bên B có nghĩa vụ phối hợp với Bên A thực hiện thủ tục xóa
                  đăng ký tạm trú tại địa chỉ thuê trước khi nhận lại tiền đặt cọc.
                </div>

                {/* ĐIỀU 5 */}
                <div className="avoid-break">
                  <div className="section-title">
                    ĐIỀU 5. QUYỀN VÀ NGHĨA VỤ CỦA BÊN CHO THUÊ (BÊN A)
                  </div>
                  <div className="clause-item">
                    <strong>5.1. Quyền của Bên A:</strong>
                  </div>
                  <div className="sub-clause">
                    - Yêu cầu Bên B thanh toán đầy đủ, đúng hạn tiền đặt cọc, tiền thuê phòng, tiền
                    điện, nước và các khoản phí dịch vụ hàng tháng theo thỏa thuận.
                  </div>
                </div>
                <div className="sub-clause">
                  - Kiểm tra định kỳ hoặc kiểm tra khi có tình huống khẩn cấp về an ninh trật tự,
                  phòng cháy chữa cháy đối với hiện trạng phòng trọ và số lượng nhân khẩu thực tế
                  lưu trú sau khi đã báo trước cho Bên B.
                </div>
                <div className="sub-clause">
                  - Từ chối cho lưu trú đối với các cá nhân không đăng ký trong danh sách thành
                  viên của phòng hoặc không chấp hành quy định khai báo tạm trú; yêu cầu Bên B bồi
                  thường thiệt hại nếu làm mất mát, hư hỏng tài sản, trang thiết bị của Bên A.
                </div>
                <div className="sub-clause">
                  - Đơn phương chấm dứt thực hiện hợp đồng và thu hồi phòng trọ trong các trường
                  hợp quy định tại Khoản 7.2 Điều 7 Hợp đồng này.
                </div>

                <div className="avoid-break">
                  <div className="clause-item">
                    <strong>5.2. Nghĩa vụ của Bên A:</strong>
                  </div>
                  <div className="sub-clause">
                    - Bàn giao phòng trọ, trang thiết bị tiện ích và thẻ ra vào/chìa khóa đúng thời
                    gian, đảm bảo điều kiện an toàn kỹ thuật và vệ sinh cho Bên B sử dụng ổn định
                    trong suốt thời hạn thuê.
                  </div>
                </div>
                <div className="sub-clause">
                  - Thực hiện sửa chữa, bảo trì kịp thời các hư hỏng về kết cấu nhà, hệ thống điện,
                  cấp thoát nước chung không phải do lỗi của Bên B gây ra.
                </div>
                <div className="sub-clause">
                  - Hướng dẫn, ký xác nhận đồng ý cho đăng ký tạm trú và tạo điều kiện thuận lợi để
                  Bên B cùng các thành viên trong phòng thực hiện thủ tục đăng ký tạm trú, thông
                  báo lưu trú theo quy định pháp luật.
                </div>
                <div className="sub-clause">
                  - Bảo mật thông tin cá nhân của Bên B và các thành viên lưu trú theo quy định của
                  Nghị định số 13/2023/NĐ-CP; chỉ sử dụng thông tin định danh của Bên B vào mục
                  đích quản lý thực hiện hợp đồng và khai báo cư trú với cơ quan nhà nước có thẩm
                  quyền.
                </div>

                {/* ĐIỀU 6 */}
                <div className="avoid-break">
                  <div className="section-title">
                    ĐIỀU 6. QUYỀN VÀ NGHĨA VỤ CỦA BÊN THUÊ (BÊN B)
                  </div>
                  <div className="clause-item">
                    <strong>6.1. Quyền của Bên B:</strong>
                  </div>
                  <div className="sub-clause">
                    - Nhận bàn giao phòng trọ và các trang thiết bị tiện ích đúng như thỏa thuận;
                    được sử dụng ổn định phòng trọ và các khu vực tiện ích chung của khu trọ.
                  </div>
                </div>
                <div className="sub-clause">
                  - Được cung cấp minh bạch số liệu chỉ số điện, nước, chi tiết hóa đơn hàng tháng
                  và lịch sử thanh toán; có quyền yêu cầu Bên A kiểm tra, khắc phục kịp thời các sự
                  cố hư hỏng về cơ sở vật chất kỹ thuật của phòng trọ.
                </div>
                <div className="sub-clause">
                  - Được nhận lại tiền đặt cọc sau khi đã hoàn tất các nghĩa vụ thanh toán, bàn
                  giao phòng và thủ tục xóa tạm trú khi chấm dứt hợp đồng đúng quy định.
                </div>

                <div className="avoid-break">
                  <div className="clause-item">
                    <strong>6.2. Nghĩa vụ của Bên B:</strong>
                  </div>
                  <div className="sub-clause">
                    - Thanh toán đầy đủ, đúng thời hạn tiền thuê phòng, tiền điện, nước và các khoản
                    phí dịch vụ hàng tháng.
                  </div>
                </div>
                <div className="sub-clause">
                  - Sử dụng phòng trọ đúng mục đích; có ý thức giữ gìn, bảo quản tài sản, trang
                  thiết bị trong phòng và khu vực chung; tự chịu chi phí sửa chữa hoặc bồi thường
                  theo thời giá nếu làm hư hỏng, mất mát tài sản do lỗi của mình hoặc của các thành
                  viên, khách đến chơi.
                </div>
                <div className="sub-clause">
                  - Không được tự ý đục phá, cải tạo, thay đổi kết cấu phòng trọ; không được tự ý
                  chuyển nhượng hợp đồng hoặc cho người khác thuê lại phòng trọ dưới bất kỳ hình
                  thức nào khi chưa có sự đồng ý bằng văn bản của Bên A.
                </div>
                <div className="sub-clause">
                  - Chấp hành nghiêm chỉnh nội quy khu trọ, quy định về an toàn phòng cháy chữa
                  cháy, vệ sinh môi trường và trật tự an ninh khu phố; không gây tiếng ồn lớn sau
                  22 giờ 00 phút; tuyệt đối không tàng trữ, sử dụng ma túy, chất cấm, vũ khí, vật
                  liệu nổ, chất dễ cháy hoặc tổ chức đánh bạc, mại dâm và các hành vi vi phạm pháp
                  luật khác.
                </div>

                {/* ĐIỀU 7 */}
                <div className="avoid-break">
                  <div className="section-title">
                    ĐIỀU 7. GIA HẠN, CHẤM DỨT VÀ ĐƠN PHƯƠNG CHẤM DỨT HỢP ĐỒNG
                  </div>
                  <div className="clause-item">
                    <strong>7.1. Gia hạn và chấm dứt hợp đồng đúng hạn:</strong> Trước khi hết thời
                    hạn thuê ít nhất 30 (ba mươi) ngày, nếu Bên B có nhu cầu tiếp tục thuê thì thông
                    báo cho Bên A để hai bên thỏa thuận gia hạn hoặc ký kết hợp đồng mới. Khi hết hạn
                    hợp đồng hoặc khi hai bên thỏa thuận chấm dứt hợp đồng trước hạn, hai bên tiến
                    hành kiểm tra bàn giao phòng, chốt chỉ số điện nước cuối kỳ để thanh lý hợp đồng.
                  </div>
                </div>
                <div className="clause-item">
                  <strong>
                    7.2. Quyền đơn phương chấm dứt hợp đồng của Bên A (Theo Điều 172 Luật Nhà ở năm
                    2023):
                  </strong>{' '}
                  Bên A có quyền đơn phương chấm dứt hợp đồng trước thời hạn, thu hồi phòng trọ và
                  Bên B phải chịu mất tiền đặt cọc nếu Bên B vi phạm một trong các trường hợp sau:
                  (a) Không thanh toán tiền thuê phòng và chi phí dịch vụ theo thỏa thuận quá 10
                  (mười) ngày kể từ ngày đến hạn mà không có lý do chính đáng; (b) Sử dụng phòng
                  trọ không đúng mục đích hoặc có hành vi vi phạm pháp luật, vi phạm nghiêm trọng
                  quy định về phòng cháy chữa cháy, an ninh trật tự đã được Bên A nhắc nhở nhưng
                  không khắc phục; (c) Tự ý đục phá, tháo dỡ, làm hư hỏng nghiêm trọng phòng trọ
                  hoặc tự ý chuyển nhượng, cho người khác thuê lại, đưa người không đăng ký vào cư
                  trú trái phép.
                </div>
                <div className="clause-item">
                  <strong>
                    7.3. Quyền đơn phương chấm dứt hợp đồng của Bên B (Theo Điều 172 Luật Nhà ở năm
                    2023):
                  </strong>{' '}
                  Bên B có quyền đơn phương chấm dứt hợp đồng trước hạn và được nhận lại toàn bộ
                  tiền đặt cọc khi Bên A: (a) Không sửa chữa phòng trọ khi có hư hỏng nặng làm ảnh
                  hưởng nghiêm trọng đến an toàn sinh hoạt; (b) Tăng giá thuê phòng trái với thỏa
                  thuận trong hợp đồng; (c) Quyền sử dụng phòng trọ bị hạn chế do lợi ích của người
                  thứ ba.
                </div>
                <div className="clause-item" style={{ textIndent: '18px' }}>
                  Trường hợp Bên B tự ý chấm dứt hợp đồng trước thời hạn vì lý do cá nhân mà không
                  thuộc các trường hợp nêu trên hoặc không thông báo trước cho Bên A tối thiểu 30
                  (ba mươi) ngày thì Bên B sẽ không được nhận lại khoản tiền đặt cọc đã giao theo
                  quy định tại Điều 328 Bộ luật Dân sự năm 2015.
                </div>

                {/* ĐIỀU 8 & CHỮ KÝ (Giữ cùng khối không bị đứt trang) */}
                <div className="avoid-break">
                  <div className="section-title">
                    ĐIỀU 8. ĐIỀU KHOẢN CHUNG VÀ HIỆU LỰC HỢP ĐỒNG
                  </div>
                  <div className="clause-item">
                    <strong>8.1. Giải quyết tranh chấp:</strong> Trong quá trình thực hiện Hợp
                    đồng, nếu phát sinh vướng mắc hoặc tranh chấp, hai bên chủ động thương lượng,
                    hòa giải trên tinh thần thiện chí và tôn trọng quyền lợi hợp pháp của nhau.
                    Trường hợp không tự thương lượng được, vụ việc sẽ được đưa ra Tòa án nhân dân
                    có thẩm quyền để giải quyết theo quy định của pháp luật Việt Nam.
                  </div>
                  <div className="clause-item">
                    <strong>8.2. Cam kết của các bên:</strong> Hai bên cam kết các thông tin nhân
                    thân, pháp lý đã kê khai trong Hợp đồng là hoàn toàn đúng sự thật; việc giao
                    kết Hợp đồng này là hoàn toàn tự nguyện, không bị lừa dối hay ép buộc.
                  </div>
                  <div className="clause-item">
                    <strong>8.3. Hiệu lực hợp đồng:</strong> Hợp đồng này có hiệu lực kể từ ngày ký
                    và được lập thành 02 (hai) bản chính bằng tiếng Việt có giá trị pháp lý như
                    nhau, Bên A giữ 01 (một) bản, Bên B giữ 01 (một) bản để làm căn cứ thực hiện.
                  </div>

                  {/* CHỮ KÝ HỢP ĐỒNG CHÍNH */}
                  <table className="no-border" style={{ width: '100%', marginTop: '14px' }}>
                    <tbody>
                      <tr>
                        <td
                          style={{
                            width: '50%',
                            textAlign: 'center',
                            verticalAlign: 'top',
                          }}
                        >
                          <div style={{ fontWeight: 'bold' }}>ĐẠI DIỆN BÊN CHO THUÊ (BÊN A)</div>
                          <div style={{ fontStyle: 'italic', fontSize: '11pt' }}>
                            (Ký, ghi rõ họ tên)
                          </div>
                          <div style={{ height: '75px' }} />
                          <div style={{ fontWeight: 'bold' }}>{hopDong.TenChuTro}</div>
                        </td>
                        <td
                          style={{
                            width: '50%',
                            textAlign: 'center',
                            verticalAlign: 'top',
                          }}
                        >
                          <div style={{ fontWeight: 'bold' }}>ĐẠI DIỆN BÊN THUÊ PHÒNG (BÊN B)</div>
                          <div style={{ fontStyle: 'italic', fontSize: '11pt' }}>
                            (Ký, điểm chỉ và ghi rõ họ tên)
                          </div>
                          <div style={{ height: '75px' }} />
                          <div style={{ fontWeight: 'bold' }}>{nguoiDaiDien.HoTen}</div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* PHỤ LỤC HỢP ĐỒNG (SANG TRANG MỚI CHUẨN A4) */}
                <div className="page-break" style={{ paddingTop: '4px' }}>
                  <div className="avoid-break" style={{ textAlign: 'center', marginBottom: '10px' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '14pt' }}>PHỤ LỤC HỢP ĐỒNG</div>
                    <div style={{ fontWeight: 'bold', fontSize: '12pt' }}>
                      BIÊN BẢN BÀN GIAO TRANG THIẾT BỊ PHÒNG TRỌ VÀ SỔ THEO DÕI THÀNH VIÊN LƯU TRÚ
                    </div>
                    <div style={{ fontStyle: 'italic', fontSize: '11pt', marginTop: '2px' }}>
                      (Kèm theo Hợp đồng thuê phòng trọ số:{' '}
                      <strong>
                        {String(hopDong.MaHDT).padStart(3, '0')}/{namKyStr}/HĐTT
                      </strong>{' '}
                      ký ngày <strong>{dinhDangNgayVN(hopDong.NgayKy)}</strong> tại Phòng số:{' '}
                      <strong>{hopDong.TenPhong}</strong>)
                    </div>
                  </div>

                  <div className="section-title">
                    I. DANH MỤC TRANG THIẾT BỊ, TIỆN ÍCH VÀ THẺ RA VÀO BÀN GIAO:
                  </div>
                  <table className="contract-table">
                    <thead>
                      <tr>
                        <th style={{ width: '7%' }}>TT</th>
                        <th style={{ width: '36%' }}>Tên trang thiết bị / Tiện ích bàn giao</th>
                        <th style={{ width: '13%' }}>Đơn vị / Số lượng</th>
                        <th style={{ width: '24%' }}>Tình trạng khi nhận phòng</th>
                        <th style={{ width: '20%' }}>Tình trạng khi trả phòng</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ textAlign: 'center' }}>01</td>
                        <td>Gác lửng, cầu thang và lan can bảo vệ</td>
                        <td style={{ textAlign: 'center' }}>
                          {coTienIch('gác') ? '01 bộ' : '0 bộ'}
                        </td>
                        <td>{coTienIch('gác') ? 'Sử dụng tốt' : 'Không trang bị'}</td>
                        <td style={{ textAlign: 'center' }}>............................</td>
                      </tr>
                      <tr>
                        <td style={{ textAlign: 'center' }}>02</td>
                        <td>Máy điều hòa nhiệt độ (kèm điều khiển)</td>
                        <td style={{ textAlign: 'center' }}>
                          {coTienIch('máy lạnh') || coTienIch('điều hòa') ? '01 bộ' : '0 bộ'}
                        </td>
                        <td>
                          {coTienIch('máy lạnh') || coTienIch('điều hòa')
                            ? 'Hoạt động tốt'
                            : 'Không trang bị'}
                        </td>
                        <td style={{ textAlign: 'center' }}>............................</td>
                      </tr>
                      <tr>
                        <td style={{ textAlign: 'center' }}>03</td>
                        <td>Tủ lạnh / Thiết bị nội thất trong phòng</td>
                        <td style={{ textAlign: 'center' }}>
                          {coTienIch('tủ lạnh') ? '01 cái' : '0 cái'}
                        </td>
                        <td>{coTienIch('tủ lạnh') ? 'Hoạt động tốt' : 'Không trang bị'}</td>
                        <td style={{ textAlign: 'center' }}>............................</td>
                      </tr>
                      <tr>
                        <td style={{ textAlign: 'center' }}>04</td>
                        <td>Hệ thống bóng đèn chiếu sáng, công tắc, ổ cắm</td>
                        <td style={{ textAlign: 'center' }}>01 hệ</td>
                        <td>Hoạt động bình thường</td>
                        <td style={{ textAlign: 'center' }}>............................</td>
                      </tr>
                      <tr>
                        <td style={{ textAlign: 'center' }}>05</td>
                        <td>Thiết bị vệ sinh (Bồn cầu, chậu rửa, vòi sen)</td>
                        <td style={{ textAlign: 'center' }}>01 bộ</td>
                        <td>Sử dụng tốt, nguyên vẹn</td>
                        <td style={{ textAlign: 'center' }}>............................</td>
                      </tr>
                      <tr>
                        <td style={{ textAlign: 'center' }}>06</td>
                        <td>Đồng hồ đo điện và đồng hồ đo nước của phòng</td>
                        <td style={{ textAlign: 'center' }}>01 bộ</td>
                        <td>Hoạt động bình thường, nguyên niêm</td>
                        <td style={{ textAlign: 'center' }}>............................</td>
                      </tr>
                      <tr>
                        <td style={{ textAlign: 'center' }}>07</td>
                        <td>Chìa khóa phòng và ổ khóa cửa chính</td>
                        <td style={{ textAlign: 'center' }}>{tatCaThanhVien.length} chiếc</td>
                        <td>Bàn giao đủ cho thành viên</td>
                        <td style={{ textAlign: 'center' }}>............................</td>
                      </tr>
                      <tr>
                        <td style={{ textAlign: 'center' }}>08</td>
                        <td>Thẻ từ kiểm soát ra vào cổng khu trọ</td>
                        <td style={{ textAlign: 'center' }}>{tongSoTheTu} thẻ</td>
                        <td>Mã số thẻ: {danhSachMaTheTu || '........................'}</td>
                        <td style={{ textAlign: 'center' }}>............................</td>
                      </tr>
                    </tbody>
                  </table>

                  <div className="avoid-break">
                    <div className="section-title">
                      II. BẢNG GHI NHẬN THAY ĐỔI THÀNH VIÊN LƯU TRÚ TRONG THỜI HẠN HỢP ĐỒNG:
                    </div>
                    <div
                      className="clause-item"
                      style={{ fontStyle: 'italic', fontSize: '11pt', marginBottom: '4px' }}
                    >
                      (Dùng để ghi nhận trực tiếp khi có thêm thành viên mới vào ở ghép hoặc khi có
                      thành viên chuyển đi trước hạn và xác nhận tình trạng đăng ký/xóa tạm trú tương
                      ứng):
                    </div>
                  </div>
                  <table className="contract-table">
                    <thead>
                      <tr>
                        <th style={{ width: '6%' }}>Lần</th>
                        <th style={{ width: '22%' }}>Họ và tên thành viên</th>
                        <th style={{ width: '21%' }}>Số CCCD & SĐT</th>
                        <th style={{ width: '13%' }}>Vai trò lưu trú</th>
                        <th style={{ width: '11%' }}>Ngày vào ở</th>
                        <th style={{ width: '11%' }}>Ngày chuyển đi</th>
                        <th style={{ width: '16%' }}>Xác nhận Tạm trú & Chữ ký các bên</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[0, 1, 2, 3].map((idx) => {
                        const tv = tatCaThanhVien[idx];
                        return (
                          <tr key={idx}>
                            <td style={{ textAlign: 'center' }}>0{idx + 1}</td>
                            <td>
                              {tv ? <strong>{tv.HoTen}</strong> : '.........................'}
                            </td>
                            <td>
                              <div>CCCD: {tv?.CCCD || '...............'}</div>
                              {tv?.NgayCap && (
                                <div style={{ fontSize: '9.5pt' }}>
                                  Ngày cấp: {dinhDangNgayVN(tv.NgayCap)}
                                </div>
                              )}
                              <div>SĐT: {tv?.SDT || '...............'}</div>
                            </td>
                            <td>
                              <div>[{tv && tv.VaiTro === 'DaiDien' ? 'x' : ' '}] Đại diện</div>
                              <div>[{tv && tv.VaiTro !== 'DaiDien' ? 'x' : ' '}] Ở ghép</div>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              {tv ? dinhDangNgayVN(tv.NgayVao) : '..../..../20....'}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              {tv?.NgayDi ? dinhDangNgayVN(tv.NgayDi) : '..../..../20....'}
                            </td>
                            <td>
                              <div>[{tv?.TamTru === 'DaDangKy' ? 'x' : ' '}] Đã ĐK tạm trú</div>
                              <div>[ ] Đã xóa tạm trú</div>
                              <div>Ký: ...................</div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  <div className="avoid-break">
                    <p>
                      Phụ lục này là một bộ phận thống nhất và không tách rời của Hợp đồng thuê
                      phòng trọ. Hai bên đã cùng kiểm tra thực tế, thống nhất toàn bộ nội dung và
                      ký tên xác nhận dưới đây.
                    </p>

                    <table className="no-border" style={{ width: '100%', marginTop: '14px' }}>
                      <tbody>
                        <tr>
                          <td style={{ width: '50%', textAlign: 'center', verticalAlign: 'top' }}>
                            <div style={{ fontWeight: 'bold' }}>
                              ĐẠI DIỆN BÊN CHO THUÊ (BÊN A)
                            </div>
                            <div style={{ fontStyle: 'italic', fontSize: '11pt' }}>
                              (Ký và ghi rõ họ tên)
                            </div>
                            <div style={{ height: '70px' }} />
                            <div style={{ fontWeight: 'bold' }}>{hopDong.TenChuTro}</div>
                          </td>
                          <td style={{ width: '50%', textAlign: 'center', verticalAlign: 'top' }}>
                            <div style={{ fontWeight: 'bold' }}>
                              ĐẠI DIỆN BÊN THUÊ PHÒNG (BÊN B)
                            </div>
                            <div style={{ fontStyle: 'italic', fontSize: '11pt' }}>
                              (Ký và ghi rõ họ tên)
                            </div>
                            <div style={{ height: '70px' }} />
                            <div style={{ fontWeight: 'bold' }}>{nguoiDaiDien.HoTen}</div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              /* MẪU HÓA ĐƠN KÈM THEO */
              <div style={{ padding: '14px', border: '1px dashed #334155' }}>
                <div style={{ fontWeight: 'bold', fontSize: '14pt', marginBottom: '12px' }}>
                  HÓA ĐƠN TIỀN THÁNG {String(thangHoaDon).padStart(2, '0')}/{namHoaDon} - Phòng:{' '}
                  {hopDong.TenPhong}
                </div>
                <div style={{ marginBottom: '6px' }}>
                  1. Tiền phòng: <strong>{dinhDangTienVN(hopDong.GiaPhong)}</strong> đ
                </div>
                <div style={{ marginBottom: '6px' }}>
                  2. Tiền điện (Giá: <strong>{dinhDangTienVN(giaDienApDung)}</strong> đ/kWh) |
                  Thành Tiền: <strong>{dinhDangTienVN(thanhTienDien)}</strong> đ
                  <br />
                  (Số cũ: <strong>{cSoDienCu}</strong> | Số mới: <strong>{cSoDienMoi}</strong> |
                  Tiêu thụ: <strong>{tieuThuDien}</strong>)
                </div>
                <div style={{ marginBottom: '6px' }}>
                  3. Tiền nước (Giá: <strong>{dinhDangTienVN(giaNuocApDung)}</strong> đ/m³) | Thành
                  Tiền: <strong>{dinhDangTienVN(thanhTienNuoc)}</strong> đ
                  <br />
                  (Số cũ: <strong>{cSoNuocCu}</strong> | Số mới: <strong>{cSoNuocMoi}</strong> |
                  Tiêu thụ: <strong>{tieuThuNuoc}</strong>)
                </div>
                <div style={{ marginBottom: '6px' }}>
                  4. Tiền rác: <strong>{dinhDangTienVN(tienRac)}</strong> đ
                </div>
                <div style={{ marginBottom: '12px' }}>
                  5. Dịch vụ khác: <strong>{dinhDangTienVN(tienDichVuKhac)}</strong> đ
                </div>
                <div style={{ fontWeight: 'bold', fontSize: '13.5pt' }}>
                  TỔNG CỘNG: {dinhDangTienVN(tongCongHoaDon)} đ
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}