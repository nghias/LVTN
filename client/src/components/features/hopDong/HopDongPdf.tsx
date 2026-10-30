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
}

export default function HopDongPdfModal({
  hopDong,
  onClose,
  tuDongIn = false,
}: HopDongPdfModalProps) {
  const contractRef = useRef<HTMLDivElement>(null);
  const [tabHienThi, setTabHienThi] = useState<'HOP_DONG' | 'HOA_DON'>('HOP_DONG');
  const [cheDoXem, setCheDoXem] = useState<'PDF_EMBED' | 'TRUC_TIEP'>('PDF_EMBED');
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [dangTaoPdf, setDangTaoPdf] = useState<boolean>(false);

  // Cho phép chọn người đứng tên Bên B trên tờ hợp đồng (Phục vụ trường hợp 2 người cùng phòng muốn xuất 2 bản riêng hoặc 1 người đại diện)
  const [maNDDungTen, setMaNDDungTen] = useState<number | null>(null);

  useEffect(() => {
    if (hopDong && hopDong.DanhSachThanhVien.length > 0) {
      const daiDien =
        hopDong.DanhSachThanhVien.find((tv) => tv.VaiTro === 'DaiDien') ||
        hopDong.DanhSachThanhVien[0];
      setMaNDDungTen(daiDien.MaND);
    }
  }, [hopDong]);

  // Tự động render sang PDF Blob để hiển thị bằng trình đọc PDF của trình duyệt
  const taoPdfPreview = async () => {
  if (!contractRef.current) return;
  setDangTaoPdf(true);
  try {
    const html2pdfModule = (await import('html2pdf.js')).default;
    const opt = {
      margin: 10, // Đổi [10, 10, 10, 10] thành 10 (hoặc thêm as [number, number, number, number])
      filename: `HopDong_${hopDong?.TenPhong}_HD${hopDong?.MaHDT}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
      pagebreak: { mode: ['css', 'legacy'] },
    };

    const pdfBlob = await html2pdfModule()
      .set(opt as any) // Thêm 'as any' để tránh lỗi thiếu type 'pagebreak' của thư viện
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

  useEffect(() => {
    if (tuDongIn && hopDong) {
      const timer = setTimeout(() => {
        xuLyInBanCung();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [tuDongIn, hopDong]);

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

  // Kiểm tra phí dịch vụ đăng ký (Bảng PhiDichVu)
  const timPhiDichVu = (tuKhoa: string) =>
    hopDong.DanhSachPhiDichVu.find((p) =>
      p.TenPDV.toLowerCase().includes(tuKhoa.toLowerCase())
    );

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

// Xử lý tải file PDF về máy
const xuLyTaiFilePdf = async () => {
  if (!contractRef.current) return;
  const html2pdfModule = (await import('html2pdf.js')).default;
  html2pdfModule()
    .set({
      margin: 10,
      filename: `HopDong_${hopDong.TenPhong}_${nguoiDaiDien.HoTen}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'legacy'] },
    } as any) 
    .from(contractRef.current)
    .save();
};

  // Xử lý in bản cứng trực tiếp chuẩn khổ A4
  const xuLyInBanCung = () => {
    if (!contractRef.current) return;
    const printWindow = window.open('', '_blank', 'width=1000,height=800');
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Hợp đồng thuê phòng - ${hopDong.TenPhong}</title>
          <style>
            @page { size: A4 portrait; margin: 15mm 15mm 15mm 20mm; }
            body {
              font-family: "Times New Roman", Times, serif;
              font-size: 12.5pt;
              line-height: 1.45;
              color: #000;
              margin: 0;
              padding: 0;
            }
            table { width: 100%; border-collapse: collapse; margin: 8px 0; }
            th, td { border: 1px solid #000; padding: 5px 6px; font-size: 11.5pt; vertical-align: top; }
            .no-border, .no-border td { border: none !important; }
            .page-break { page-break-before: always; }
            .text-center { text-align: center; }
            .font-bold { font-weight: bold; }
            .italic { font-style: italic; }
            .underline { text-decoration: underline; }
          </style>
        </head>
        <body>
          ${contractRef.current.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 350);
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

  const tienRac = phiRac ? Number(phiRac.Gia) : 0;
  const tienDichVuKhac = hopDong.DanhSachPhiDichVu.filter(
    (p) => p.MaPDV !== phiRac?.MaPDV
  ).reduce((sum, p) => sum + Number(p.Gia), 0);
  const tongCongHoaDon = hd
    ? Number(hd.TongTien)
    : Number(hopDong.GiaPhong) +
      Number(thanhTienDien) +
      Number(thanhTienNuoc) +
      tienRac +
      tienDichVuKhac;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="flex h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg bg-[#F1F5F9] shadow-2xl">
        {/* Thanh công cụ phía trên */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0B1D33] px-6 py-4 text-white">
          <div>
            <h2 className="text-lg font-bold">
              Hợp Đồng Thuê Phòng #{hopDong.MaHDT} - {hopDong.TenPhong} ({hopDong.TenKhu})
            </h2>
            <p className="text-xs text-slate-300">
              Tự động điền dữ liệu người thuê và xuất chuẩn định dạng PDF / Bản cứng A4
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

            <button
              onClick={xuLyTaiFilePdf}
              className="rounded bg-[#00A896] px-4 py-1.5 text-xs font-semibold text-white hover:bg-teal-600"
            >
              Tải file PDF
            </button>

            <button
              onClick={xuLyInBanCung}
              className="rounded bg-amber-500 px-4 py-1.5 text-xs font-semibold text-slate-950 hover:bg-amber-400"
            >
              Xuất hợp đồng bản cứng (In A4)
            </button>

            <button
              onClick={onClose}
              className="rounded bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
            >
              Đóng
            </button>
          </div>
        </div>

        {/* Khu vực hiển thị nội dung PDF */}
        <div className="relative flex-1 overflow-y-auto p-4">
          {cheDoXem === 'PDF_EMBED' && (
            <div className="h-full w-full overflow-hidden rounded border border-slate-300 bg-white">
              {dangTaoPdf ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-700">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#00A896] border-t-transparent" />
                  <p className="text-sm font-medium">
                    Đang kết xuất bản xem trước PDF tự động điền thông tin...
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

          {/* Bản gốc HTML chuẩn mẫu HopDongThuePhongTro.docx & MauHoaDon.docx (Dùng để render PDF và In A4) */}
          <div
            className={
              cheDoXem === 'TRUC_TIEP'
                ? 'mx-auto max-w-[210mm] bg-white p-[15mm] text-black shadow-lg'
                : 'fixed -left-[9999px] top-0 w-[210mm] bg-white p-[12mm] text-black'
            }
          >
            <div
              ref={contractRef}
              style={{
                fontFamily: '"Times New Roman", Times, serif',
                fontSize: '12pt',
                lineHeight: 1.45,
                color: '#000',
              }}
            >
              {tabHienThi === 'HOP_DONG' ? (
                <div>
                  {/* QUỐC HIỆU & TIÊU NGỮ */}
                  <div style={{ textAlign: 'center', marginBottom: '12px' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '13pt' }}>
                      CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                    </div>
                    <div
                      style={{
                        fontWeight: 'bold',
                        fontSize: '13pt',
                        textDecoration: 'underline',
                        marginBottom: '10px',
                      }}
                    >
                      Độc lập - Tự do - Hạnh phúc
                    </div>
                    <div style={{ fontWeight: 'bold', fontSize: '16pt', marginTop: '8px' }}>
                      HỢP ĐỒNG THUÊ PHÒNG TRỌ
                    </div>
                    <div style={{ fontSize: '11.5pt', marginTop: '4px' }}>
                      Số: <strong>{String(hopDong.MaHDT).padStart(3, '0')}/{namKyStr}/HĐTT</strong>
                      &nbsp;&nbsp;|&nbsp;&nbsp; Hợp đồng kỳ trước liền kề (nếu có):{' '}
                      <strong>
                        {hopDong.MaHDTCu
                          ? `${String(hopDong.MaHDTCu).padStart(3, '0')}/HĐTT`
                          : 'Không'}
                      </strong>
                    </div>
                  </div>

                  {/* CĂN CỨ PHÁP LÝ */}
                  <div style={{ fontStyle: 'italic', fontSize: '11pt', marginBottom: '10px' }}>
                    <div>- Căn cứ Hiến pháp nước Cộng hòa xã hội chủ nghĩa Việt Nam năm 2013;</div>
                    <div>- Căn cứ Bộ luật Dân sự số 91/2015/QH13 ngày 24/11/2015 của Quốc hội;</div>
                    <div>
                      - Căn cứ Luật Nhà ở số 27/2023/QH15 ngày 27/11/2023 của Quốc hội và các văn
                      bản hướng dẫn thi hành;
                    </div>
                    <div>
                      - Căn cứ Luật Cư trú số 68/2020/QH14 ngày 13/11/2020 của Quốc hội và các Thông
                      tư của Bộ Công an quy định về đăng ký tạm trú, thông báo lưu trú;
                    </div>
                    <div>
                      - Căn cứ Nghị định số 13/2023/NĐ-CP ngày 17/4/2023 của Chính phủ về bảo vệ dữ
                      liệu cá nhân;
                    </div>
                    <div>
                      - Căn cứ nhu cầu thực tế và sự thỏa thuận tự nguyện, bình đẳng, thiện chí của
                      hai bên.
                    </div>
                  </div>

                  <p style={{ marginBottom: '8px' }}>
                    Hôm nay, ngày <strong>{ngayKyStr}</strong> tháng <strong>{thangKyStr}</strong>{' '}
                    năm <strong>{namKyStr}</strong>, tại địa chỉ:{' '}
                    <strong>{hopDong.DiaChiKhuTro}</strong>, chúng tôi gồm có:
                  </p>

                  {/* MỤC I: BÊN A */}
                  <div style={{ fontWeight: 'bold', marginTop: '8px' }}>
                    I. BÊN CHO THUÊ PHÒNG TRỌ (Gọi tắt là Bên A):
                  </div>
                  <div>
                    - Chủ cơ sở / Người đại diện cho thuê: Ông/Bà:{' '}
                    <strong>{hopDong.TenChuTro}</strong> &nbsp;&nbsp;&nbsp;&nbsp; Sinh năm:{' '}
                    <strong>{hopDong.NamSinhChuTro || '............'}</strong>
                  </div>
                  <div>
                    - Số CCCD/ĐDCN: <strong>{hopDong.CCCDChuTro || '........................'}</strong>{' '}
                    &nbsp;&nbsp; Ngày cấp: ....../....../............ &nbsp;&nbsp; Nơi cấp: Cục Cảnh
                    sát QLHC về TTXH
                  </div>
                  <div>
                    - Địa chỉ thường trú:{' '}
                    <strong>{hopDong.DiaChiChuTro || hopDong.DiaChiKhuTro}</strong>
                  </div>
                  <div>
                    - Số điện thoại liên hệ: <strong>{hopDong.SDTChuTro}</strong> &nbsp;&nbsp;&nbsp;
                    Email (nếu có): <strong>{hopDong.EmailChuTro || '........................'}</strong>
                  </div>
                  <div>
                    - Người quản lý cơ sở trực tiếp (nếu có): Ông/Bà:{' '}
                    <strong>{hopDong.TenChuTro}</strong> &nbsp;&nbsp;&nbsp; Số điện thoại:{' '}
                    <strong>{hopDong.SDTChuTro}</strong>
                  </div>
                  <div>
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
                  <div style={{ fontWeight: 'bold', marginTop: '10px' }}>
                    II. BÊN THUÊ PHÒNG TRỌ (Gọi tắt là Bên B):
                  </div>
                  <div>
                    - Người đại diện đứng tên Hợp đồng: Ông/Bà:{' '}
                    <strong>{nguoiDaiDien.HoTen}</strong> &nbsp;&nbsp;&nbsp;&nbsp; Sinh năm:{' '}
                    <strong>{nguoiDaiDien.NamSinh || '............'}</strong>
                  </div>
                  <div>
                    - Số CCCD/ĐDCN: <strong>{nguoiDaiDien.CCCD || '........................'}</strong>{' '}
                    &nbsp;&nbsp; Ngày cấp: ....../....../............ &nbsp;&nbsp; Nơi cấp: Cục Cảnh
                    sát QLHC về TTXH
                  </div>
                  <div>
                    - Địa chỉ thường trú:{' '}
                    <strong>
                      {nguoiDaiDien.DiaChi || '................................................'}
                    </strong>
                  </div>
                  <div>
                    - Số điện thoại liên hệ: <strong>{nguoiDaiDien.SDT}</strong> &nbsp;&nbsp;&nbsp;
                    Email (nếu có):{' '}
                    <strong>{nguoiDaiDien.Email || '........................'}</strong>
                  </div>

                  <div style={{ marginTop: '6px', fontWeight: 'bold' }}>
                    Danh sách toàn bộ thành viên thực tế lưu trú tại phòng trọ (bao gồm Người đại
                    diện ký hợp đồng và các thành viên ở cùng):
                  </div>

                  {/* BẢNG THÀNH VIÊN LƯU TRÚ */}
                  <table
                    style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      marginTop: '6px',
                      marginBottom: '10px',
                    }}
                  >
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', fontWeight: 'bold' }}>
                        <th style={{ border: '1px solid #000', padding: '4px', width: '32px' }}>
                          TT
                        </th>
                        <th style={{ border: '1px solid #000', padding: '4px' }}>
                          Họ và tên thành viên
                        </th>
                        <th style={{ border: '1px solid #000', padding: '4px', width: '60px' }}>
                          Năm sinh
                        </th>
                        <th style={{ border: '1px solid #000', padding: '4px', width: '135px' }}>
                          Số CCCD & Điện thoại
                        </th>
                        <th style={{ border: '1px solid #000', padding: '4px', width: '110px' }}>
                          Vai trò trong phòng
                        </th>
                        <th style={{ border: '1px solid #000', padding: '4px', width: '110px' }}>
                          Ngày vào ở / Ngày chuyển đi
                        </th>
                        <th style={{ border: '1px solid #000', padding: '4px', width: '115px' }}>
                          Tình trạng đăng ký Tạm trú
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {danhSachBangThanhVien.map((tv, idx) => {
                        const coDuLieu = Boolean(tv.HoTen);
                        const laDaiDien = tv.MaND === nguoiDaiDien.MaND || tv.VaiTro === 'DaiDien';
                        return (
                          <tr key={idx}>
                            <td
                              style={{
                                border: '1px solid #000',
                                padding: '4px',
                                textAlign: 'center',
                              }}
                            >
                              {String(idx + 1).padStart(2, '0')}
                            </td>
                            <td style={{ border: '1px solid #000', padding: '4px' }}>
                              {coDuLieu ? (
                                <strong>{tv.HoTen}</strong>
                              ) : (
                                '........................................'
                              )}
                            </td>
                            <td
                              style={{
                                border: '1px solid #000',
                                padding: '4px',
                                textAlign: 'center',
                              }}
                            >
                              {coDuLieu ? tv.NamSinh || '........' : '............'}
                            </td>
                            <td style={{ border: '1px solid #000', padding: '4px' }}>
                              <div>CCCD: {coDuLieu ? tv.CCCD || '................' : '................'}</div>
                              <div>SĐT: {coDuLieu ? tv.SDT || '................' : '................'}</div>
                            </td>
                            <td style={{ border: '1px solid #000', padding: '4px' }}>
                              {coDuLieu
                                ? laDaiDien
                                  ? 'Người đại diện (Chủ hộ tạm trú)'
                                  : 'Thành viên ở ghép'
                                : 'Thành viên ở ghép'}
                            </td>
                            <td style={{ border: '1px solid #000', padding: '4px' }}>
                              <div>
                                Vào: {coDuLieu ? dinhDangNgayVN(tv.NgayVao) : '..../..../20....'}
                              </div>
                              <div>
                                Đi: {coDuLieu && tv.NgayDi ? dinhDangNgayVN(tv.NgayDi) : '....../....../......'}
                              </div>
                            </td>
                            <td style={{ border: '1px solid #000', padding: '4px' }}>
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
                  <div style={{ fontWeight: 'bold', marginTop: '8px' }}>
                    ĐIỀU 1. ĐỐI TƯỢNG CHO THUÊ VÀ MỤC ĐÍCH SỬ DỤNG
                  </div>
                  <div>
                    <strong>1.1. Thông tin phòng trọ:</strong> Bên A đồng ý cho Bên B thuê và Bên B
                    đồng ý thuê phòng trọ số: <strong>{hopDong.TenPhong}</strong> thuộc Khu trọ / Cơ
                    sở: <strong>{hopDong.TenKhu}</strong> tại địa chỉ:{' '}
                    <strong>{hopDong.DiaChiKhuTro}</strong>.
                  </div>
                  <div>
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
                  <div>
                    <strong>1.3. Mục đích thuê:</strong> Bên B thuê phòng trọ để ở và sinh hoạt hợp
                    pháp với số lượng tối đa không quá{' '}
                    <strong>{Math.max(4, tatCaThanhVien.length)}</strong> người. Tuyệt đối không sử
                    dụng phòng trọ vào mục đích sản xuất, tàng trữ hàng hóa trái phép hoặc thực hiện
                    các hành vi vi phạm pháp luật.
                  </div>

                  {/* ĐIỀU 2 */}
                  <div style={{ fontWeight: 'bold', marginTop: '8px' }}>
                    ĐIỀU 2. THỜI HẠN THUÊ, GIÁ THUÊ PHÒNG, TIỀN ĐẶT CỌC VÀ CHI PHÍ DỊCH VỤ
                  </div>
                  <div>
                    <strong>2.1. Thời hạn thuê:</strong> Thời hạn thuê phòng là{' '}
                    <strong>{tinhSoThangThue(hopDong.NgayBD, hopDong.NgayKT)}</strong> tháng, tính
                    từ ngày <strong>{dinhDangNgayVN(hopDong.NgayBD)}</strong> đến hết ngày{' '}
                    <strong>{dinhDangNgayVN(hopDong.NgayKT)}</strong>.
                  </div>
                  <div>
                    <strong>2.2. Giá thuê phòng:</strong>{' '}
                    <strong>{dinhDangTienVN(hopDong.GiaPhong)}</strong> đồng/tháng (Bằng chữ:{' '}
                    <em>{docSoTienThanhChu(hopDong.GiaPhong)}</em>). Giá thuê phòng không bao gồm
                    tiền điện, tiền nước và các khoản phí dịch vụ sinh hoạt hàng tháng nêu tại Khoản
                    2.4 Điều này.
                  </div>
                  <div>
                    <strong>2.3. Tiền đặt cọc bảo đảm thực hiện hợp đồng:</strong> Ngay khi ký Hợp
                    đồng này, Bên B giao cho Bên A khoản tiền đặt cọc là:{' '}
                    <strong>{dinhDangTienVN(hopDong.TienCoc)}</strong> đồng (Bằng chữ:{' '}
                    <em>{docSoTienThanhChu(hopDong.TienCoc)}</em>). Khoản tiền đặt cọc này được dùng
                    để bảo đảm việc thực hiện nghĩa vụ hợp đồng của Bên B và không được tự ý khấu
                    trừ vào tiền thuê phòng hàng tháng. Khi Hợp đồng chấm dứt đúng thời hạn hoặc
                    chấm dứt trước hạn theo đúng thỏa thuận tại Điều 7, sau khi Bên B đã bàn giao
                    lại phòng, trang thiết bị, thẻ ra vào, hoàn tất thủ tục xóa đăng ký tạm trú và
                    thanh toán đầy đủ tiền phòng, tiền điện, nước, phí dịch vụ, chi phí bồi thường
                    hư hỏng (nếu có), Bên A có trách nhiệm hoàn trả đầy đủ số tiền đặt cọc còn lại
                    cho Bên B trong vòng 03 (ba) ngày làm việc.
                  </div>
                  <div>
                    <strong>2.4. Đơn giá điện, nước và phí dịch vụ hàng tháng:</strong> Hai bên
                    thống nhất áp dụng bảng đơn giá điện, nước và các khoản phí dịch vụ kèm theo hợp
                    đồng như sau:
                  </div>

                  {/* BẢNG ĐƠN GIÁ ĐIỆN NƯỚC & PHÍ DỊCH VỤ */}
                  <table
                    style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      marginTop: '6px',
                      marginBottom: '10px',
                    }}
                  >
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', fontWeight: 'bold' }}>
                        <th style={{ border: '1px solid #000', padding: '4px', width: '35px' }}>
                          TT
                        </th>
                        <th style={{ border: '1px solid #000', padding: '4px' }}>
                          Tên khoản mục chi phí / Dịch vụ
                        </th>
                        <th style={{ border: '1px solid #000', padding: '4px', width: '100px' }}>
                          Đơn vị tính
                        </th>
                        <th style={{ border: '1px solid #000', padding: '4px', width: '130px' }}>
                          Đơn giá (VNĐ)
                        </th>
                        <th style={{ border: '1px solid #000', padding: '4px', width: '190px' }}>
                          Chỉ số bàn giao đầu kỳ / Số lượng đăng ký
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>
                          01
                        </td>
                        <td style={{ border: '1px solid #000', padding: '4px' }}>
                          Tiền điện sinh hoạt (theo đồng hồ phòng)
                        </td>
                        <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>
                          kWh (Số)
                        </td>
                        <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'right' }}>
                          <strong>{dinhDangTienVN(hopDong.GiaDienNuoc.GiaDien)}</strong> đ/kWh
                        </td>
                        <td style={{ border: '1px solid #000', padding: '4px' }}>
                          Chỉ số đầu: <strong>{hopDong.ChiSoBanGiao.SoDienMoi}</strong> kWh
                          <br />
                          Ngày ghi: {dinhDangNgayVN(hopDong.ChiSoBanGiao.NgayGhi)}
                        </td>
                      </tr>
                      <tr>
                        <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>
                          02
                        </td>
                        <td style={{ border: '1px solid #000', padding: '4px' }}>
                          Tiền nước sinh hoạt (theo đồng hồ phòng)
                        </td>
                        <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>
                          m³ (Khối)
                        </td>
                        <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'right' }}>
                          <strong>{dinhDangTienVN(hopDong.GiaDienNuoc.GiaNuoc)}</strong> đ/m³
                        </td>
                        <td style={{ border: '1px solid #000', padding: '4px' }}>
                          Chỉ số đầu: <strong>{hopDong.ChiSoBanGiao.SoNuocMoi}</strong> m³
                          <br />
                          Ngày ghi: {dinhDangNgayVN(hopDong.ChiSoBanGiao.NgayGhi)}
                        </td>
                      </tr>
                      <tr>
                        <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>
                          03
                        </td>
                        <td style={{ border: '1px solid #000', padding: '4px' }}>
                          Phí dịch vụ Internet Wifi
                        </td>
                        <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>
                          Phòng/Tháng
                        </td>
                        <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'right' }}>
                          <strong>{phiWifi ? dinhDangTienVN(phiWifi.Gia) : '0'}</strong> đ
                        </td>
                        <td style={{ border: '1px solid #000', padding: '4px' }}>
                          Số lượng: {phiWifi ? '01' : '0'} &nbsp; [{phiWifi ? 'x' : ' '}] Có sử dụng
                        </td>
                      </tr>
                      <tr>
                        <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>
                          04
                        </td>
                        <td style={{ border: '1px solid #000', padding: '4px' }}>
                          Phí thu gom rác sinh hoạt
                        </td>
                        <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>
                          Phòng/Tháng
                        </td>
                        <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'right' }}>
                          <strong>{phiRac ? dinhDangTienVN(phiRac.Gia) : '0'}</strong> đ
                        </td>
                        <td style={{ border: '1px solid #000', padding: '4px' }}>
                          Số lượng: {phiRac ? '01' : '0'} &nbsp; [{phiRac ? 'x' : ' '}] Có sử dụng
                        </td>
                      </tr>
                      <tr>
                        <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>
                          05
                        </td>
                        <td style={{ border: '1px solid #000', padding: '4px' }}>
                          Phí giữ xe máy / xe đạp điện
                        </td>
                        <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>
                          Xe/Tháng
                        </td>
                        <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'right' }}>
                          <strong>{phiGiuXe ? dinhDangTienVN(phiGiuXe.Gia) : '0'}</strong> đ/xe
                        </td>
                        <td style={{ border: '1px solid #000', padding: '4px' }}>
                          Số lượng: {phiGiuXe ? '01' : '0'} chiếc
                        </td>
                      </tr>
                      <tr>
                        <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>
                          06
                        </td>
                        <td style={{ border: '1px solid #000', padding: '4px' }}>
                          Phí vệ sinh và điện chiếu sáng chung
                        </td>
                        <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>
                          Phòng/Tháng
                        </td>
                        <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'right' }}>
                          <strong>{phiVeSinh ? dinhDangTienVN(phiVeSinh.Gia) : '0'}</strong> đ
                        </td>
                        <td style={{ border: '1px solid #000', padding: '4px' }}>
                          Số lượng: {phiVeSinh ? '01' : '0'} &nbsp; [{phiVeSinh ? 'x' : ' '}] Có sử
                          dụng
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {/* ĐIỀU 3 -> ĐIỀU 8 */}
                  <div style={{ fontWeight: 'bold', marginTop: '8px' }}>
                    ĐIỀU 3. CHỐT CHỈ SỐ ĐIỆN NƯỚC, LẬP HÓA ĐƠN VÀ THANH TOÁN HÀNG THÁNG
                  </div>
                  <div>
                    <strong>3.1. Chốt chỉ số điện, nước và lập hóa đơn:</strong> Chỉ số điện, nước
                    tiêu thụ thực tế của phòng được chốt định kỳ vào ngày <strong>28</strong> hàng
                    tháng. Từ ngày 01 đến ngày 03 hàng tháng, Bên A lập phiếu báo/hóa đơn tiền nhà
                    và gửi cho Bên B.
                  </div>
                  <div>
                    <strong>3.2. Thời hạn và hình thức thanh toán:</strong> Bên B có nghĩa vụ thanh
                    toán đầy đủ tổng số tiền trên hóa đơn cho Bên A từ ngày 01 đến hết ngày 05 hàng
                    tháng bằng hình thức chuyển khoản ngân hàng vào tài khoản của Bên A nêu tại Mục I
                    hoặc thanh toán bằng tiền mặt có biên nhận.
                  </div>
                  <div>
                    <strong>3.3. Xử lý chậm thanh toán:</strong> Trường hợp Bên B chậm thanh toán
                    quá 05 (năm) ngày so với thời hạn quy định mà không có sự chấp thuận trước của
                    Bên A, Bên A có quyền nhắc nhở và tạm ngừng cung cấp các dịch vụ tiện ích; nếu
                    quá 10 (mười) ngày kể từ ngày đến hạn mà Bên B vẫn không hoàn tất nghĩa vụ thanh
                    toán, Bên A có quyền đơn phương chấm dứt hợp đồng và thu hồi phòng trọ theo quy
                    định tại Điều 7 Hợp đồng này.
                  </div>

                  <div style={{ fontWeight: 'bold', marginTop: '8px' }}>
                    ĐIỀU 4. QUY ĐỊNH VỀ QUẢN LÝ NGƯỜI Ở GHÉP VÀ ĐĂNG KÝ TẠM TRÚ
                  </div>
                  <div>
                    <strong>4.1. Trách nhiệm của Người đại diện và thành viên ở ghép:</strong> Người
                    đại diện đứng tên Hợp đồng tại Mục II là người đại diện hợp pháp cho toàn bộ các
                    thành viên lưu trú trong phòng để giao dịch với Bên A, nhận thông báo, thanh
                    toán hóa đơn hàng tháng và đứng tên chủ hộ/người đại diện trong hồ sơ đăng ký
                    tạm trú của phòng.
                  </div>
                  <div>
                    <strong>4.2. Quy định khi thêm người ở ghép hoặc có thành viên chuyển đi:</strong>{' '}
                    Khi nhận thêm người vào ở ghép hoặc khi có thành viên chuyển đi, Bên B phải báo
                    trước cho Bên A để cập nhật danh sách thành viên lưu trú, bàn giao lại thẻ ra
                    vào và thực hiện khai báo/xóa đăng ký tạm trú theo quy định.
                  </div>
                  <div>
                    <strong>4.3. Nghĩa vụ đăng ký tạm trú (Theo Luật Cư trú năm 2020):</strong> Trong
                    thời hạn 03 (ba) ngày làm việc kể từ ngày dọn vào ở, toàn bộ thành viên có tên
                    trong phòng phải cung cấp đầy đủ thông tin, giấy tờ tùy thân và phối hợp với Bên
                    A để hoàn tất thủ tục thông báo lưu trú / đăng ký tạm trú.
                  </div>

                  <div style={{ fontWeight: 'bold', marginTop: '8px' }}>
                    ĐIỀU 5. QUYỀN VÀ NGHĨA VỤ CỦA BÊN CHO THUÊ (BÊN A)
                  </div>
                  <div>
                    - Bàn giao phòng trọ, trang thiết bị tiện ích và thẻ ra vào đúng thời gian; thực
                    hiện sửa chữa kịp thời các hư hỏng về kết cấu nhà, hệ thống điện, cấp thoát nước
                    chung; hướng dẫn xác nhận đăng ký tạm trú và bảo mật dữ liệu cá nhân của Bên B
                    theo Nghị định số 13/2023/NĐ-CP.
                  </div>

                  <div style={{ fontWeight: 'bold', marginTop: '8px' }}>
                    ĐIỀU 6. QUYỀN VÀ NGHĨA VỤ CỦA BÊN THUÊ (BÊN B)
                  </div>
                  <div>
                    - Nhận bàn giao phòng trọ, sử dụng ổn định và được cung cấp minh bạch chỉ số
                    điện nước, hóa đơn hàng tháng; thanh toán đầy đủ, đúng hạn; giữ gìn tài sản,
                    chấp hành nội quy khu trọ, an toàn PCCC và trật tự an ninh.
                  </div>

                  <div style={{ fontWeight: 'bold', marginTop: '8px' }}>
                    ĐIỀU 7. GIA HẠN, CHẤM DỨT VÀ ĐƠN PHƯƠNG CHẤM DỨT HỢP ĐỒNG
                  </div>
                  <div>
                    - Trước khi hết thời hạn thuê ít nhất 30 (ba mươi) ngày, nếu Bên B có nhu cầu
                    tiếp tục thuê thì thông báo cho Bên A để gia hạn hoặc ký hợp đồng mới. Quyền đơn
                    phương chấm dứt hợp đồng của hai bên thực hiện theo Điều 172 Luật Nhà ở năm 2023
                    và Điều 328 Bộ luật Dân sự năm 2015.
                  </div>

                  <div style={{ fontWeight: 'bold', marginTop: '8px' }}>
                    ĐIỀU 8. ĐIỀU KHOẢN CHUNG VÀ HIỆU LỰC HỢP ĐỒNG
                  </div>
                  <div>
                    - Hợp đồng này có hiệu lực kể từ ngày ký và được lập thành 02 (hai) bản chính
                    bằng tiếng Việt có giá trị pháp lý như nhau, Bên A giữ 01 (một) bản, Bên B giữ
                    01 (một) bản để làm căn cứ thực hiện.
                  </div>

                  {/* CHỮ KÝ HỢP ĐỒNG CHÍNH */}
                  <table className="no-border" style={{ width: '100%', marginTop: '16px' }}>
                    <tbody>
                      <tr>
                        <td
                          style={{
                            border: 'none',
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
                            border: 'none',
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

                  {/* PHỤ LỤC HỢP ĐỒNG (SANG TRANG MỚI) */}
                  <div className="page-break" style={{ pageBreakBefore: 'always', paddingTop: '10px' }}>
                    <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                      <div style={{ fontWeight: 'bold', fontSize: '14pt' }}>PHỤ LỤC HỢP ĐỒNG</div>
                      <div style={{ fontWeight: 'bold', fontSize: '12.5pt' }}>
                        BIÊN BẢN BÀN GIAO TRANG THIẾT BỊ PHÒNG TRỌ VÀ SỔ THEO DÕI THÀNH VIÊN LƯU TRÚ
                      </div>
                      <div style={{ fontStyle: 'italic', fontSize: '11pt' }}>
                        (Kèm theo Hợp đồng thuê phòng trọ số:{' '}
                        <strong>
                          {String(hopDong.MaHDT).padStart(3, '0')}/{namKyStr}/HĐTT
                        </strong>{' '}
                        ký ngày <strong>{dinhDangNgayVN(hopDong.NgayKy)}</strong> tại Phòng số:{' '}
                        <strong>{hopDong.TenPhong}</strong>)
                      </div>
                    </div>

                    <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                      I. DANH MỤC TRANG THIẾT BỊ, TIỆN ÍCH VÀ THẺ RA VÀO BÀN GIAO:
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '12px' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f8fafc', fontWeight: 'bold' }}>
                          <th style={{ border: '1px solid #000', padding: '4px', width: '35px' }}>
                            TT
                          </th>
                          <th style={{ border: '1px solid #000', padding: '4px' }}>
                            Tên trang thiết bị / Tiện ích bàn giao
                          </th>
                          <th style={{ border: '1px solid #000', padding: '4px', width: '85px' }}>
                            Đơn vị / Số lượng
                          </th>
                          <th style={{ border: '1px solid #000', padding: '4px', width: '170px' }}>
                            Tình trạng khi nhận phòng
                          </th>
                          <th style={{ border: '1px solid #000', padding: '4px', width: '150px' }}>
                            Tình trạng khi trả phòng
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>01</td>
                          <td style={{ border: '1px solid #000', padding: '4px' }}>Gác lửng, cầu thang và lan can bảo vệ</td>
                          <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>{coTienIch('gác') ? '01 bộ' : '0 bộ'}</td>
                          <td style={{ border: '1px solid #000', padding: '4px' }}>{coTienIch('gác') ? 'Sử dụng tốt' : 'Không trang bị'}</td>
                          <td style={{ border: '1px solid #000', padding: '4px' }}>...........................................</td>
                        </tr>
                        <tr>
                          <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>02</td>
                          <td style={{ border: '1px solid #000', padding: '4px' }}>Máy điều hòa nhiệt độ (kèm điều khiển)</td>
                          <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>{coTienIch('máy lạnh') || coTienIch('điều hòa') ? '01 bộ' : '0 bộ'}</td>
                          <td style={{ border: '1px solid #000', padding: '4px' }}>{coTienIch('máy lạnh') || coTienIch('điều hòa') ? 'Hoạt động tốt' : 'Không trang bị'}</td>
                          <td style={{ border: '1px solid #000', padding: '4px' }}>...........................................</td>
                        </tr>
                        <tr>
                          <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>03</td>
                          <td style={{ border: '1px solid #000', padding: '4px' }}>Tủ lạnh / Thiết bị nội thất trong phòng</td>
                          <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>{coTienIch('tủ lạnh') ? '01 cái' : '0 cái'}</td>
                          <td style={{ border: '1px solid #000', padding: '4px' }}>{coTienIch('tủ lạnh') ? 'Hoạt động tốt' : 'Không trang bị'}</td>
                          <td style={{ border: '1px solid #000', padding: '4px' }}>...........................................</td>
                        </tr>
                        <tr>
                          <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>04</td>
                          <td style={{ border: '1px solid #000', padding: '4px' }}>Hệ thống bóng đèn chiếu sáng, công tắc, ổ cắm</td>
                          <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>01 hệ</td>
                          <td style={{ border: '1px solid #000', padding: '4px' }}>Hoạt động bình thường</td>
                          <td style={{ border: '1px solid #000', padding: '4px' }}>...........................................</td>
                        </tr>
                        <tr>
                          <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>05</td>
                          <td style={{ border: '1px solid #000', padding: '4px' }}>Thiết bị vệ sinh (Bồn cầu, chậu rửa, vòi sen)</td>
                          <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>01 bộ</td>
                          <td style={{ border: '1px solid #000', padding: '4px' }}>Sử dụng tốt, nguyên vẹn</td>
                          <td style={{ border: '1px solid #000', padding: '4px' }}>...........................................</td>
                        </tr>
                        <tr>
                          <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>06</td>
                          <td style={{ border: '1px solid #000', padding: '4px' }}>Đồng hồ đo điện và đồng hồ đo nước của phòng</td>
                          <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>01 bộ</td>
                          <td style={{ border: '1px solid #000', padding: '4px' }}>Hoạt động bình thường, nguyên niêm</td>
                          <td style={{ border: '1px solid #000', padding: '4px' }}>...........................................</td>
                        </tr>
                        <tr>
                          <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>07</td>
                          <td style={{ border: '1px solid #000', padding: '4px' }}>Chìa khóa phòng và ổ khóa cửa chính</td>
                          <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>{tatCaThanhVien.length} chiếc</td>
                          <td style={{ border: '1px solid #000', padding: '4px' }}>Bàn giao đủ cho thành viên</td>
                          <td style={{ border: '1px solid #000', padding: '4px' }}>...........................................</td>
                        </tr>
                        <tr>
                          <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>08</td>
                          <td style={{ border: '1px solid #000', padding: '4px' }}>Thẻ từ kiểm soát ra vào cổng khu trọ</td>
                          <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>{tongSoTheTu} thẻ</td>
                          <td style={{ border: '1px solid #000', padding: '4px' }}>Mã số thẻ: {danhSachMaTheTu || '........................'}</td>
                          <td style={{ border: '1px solid #000', padding: '4px' }}>...........................................</td>
                        </tr>
                      </tbody>
                    </table>

                    <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                      II. BẢNG GHI NHẬN THAY ĐỔI THÀNH VIÊN LƯU TRÚ TRONG THỜI HẠN HỢP ĐỒNG:
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '10px' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f8fafc', fontWeight: 'bold' }}>
                          <th style={{ border: '1px solid #000', padding: '4px', width: '35px' }}>Lần</th>
                          <th style={{ border: '1px solid #000', padding: '4px' }}>Họ và tên thành viên</th>
                          <th style={{ border: '1px solid #000', padding: '4px', width: '135px' }}>Số CCCD & SĐT</th>
                          <th style={{ border: '1px solid #000', padding: '4px', width: '95px' }}>Vai trò lưu trú</th>
                          <th style={{ border: '1px solid #000', padding: '4px', width: '85px' }}>Ngày vào ở</th>
                          <th style={{ border: '1px solid #000', padding: '4px', width: '85px' }}>Ngày chuyển đi</th>
                          <th style={{ border: '1px solid #000', padding: '4px', width: '130px' }}>Xác nhận Tạm trú & Chữ ký</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[0, 1, 2, 3].map((idx) => {
                          const tv = tatCaThanhVien[idx];
                          return (
                            <tr key={idx}>
                              <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>
                                0{idx + 1}
                              </td>
                              <td style={{ border: '1px solid #000', padding: '4px' }}>
                                {tv ? <strong>{tv.HoTen}</strong> : '.......................................'}
                              </td>
                              <td style={{ border: '1px solid #000', padding: '4px' }}>
                                CCCD: {tv?.CCCD || '......................'}
                                <br />
                                SĐT: {tv?.SDT || '.........................'}
                              </td>
                              <td style={{ border: '1px solid #000', padding: '4px' }}>
                                [{tv && tv.VaiTro === 'DaiDien' ? 'x' : ' '}] Đại diện
                                <br />[{tv && tv.VaiTro !== 'DaiDien' ? 'x' : ' '}] Ở ghép
                              </td>
                              <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>
                                {tv ? dinhDangNgayVN(tv.NgayVao) : '..../..../20....'}
                              </td>
                              <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>
                                {tv?.NgayDi ? dinhDangNgayVN(tv.NgayDi) : '..../..../20....'}
                              </td>
                              <td style={{ border: '1px solid #000', padding: '4px' }}>
                                [{tv?.TamTru === 'DaDangKy' ? 'x' : ' '}] Đã ĐK tạm trú
                                <br />[ ] Đã xóa tạm trú
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    <p>
                      Phụ lục này là một bộ phận thống nhất và không tách rời của Hợp đồng thuê phòng
                      trọ. Hai bên đã cùng kiểm tra thực tế, thống nhất toàn bộ nội dung và ký tên
                      xác nhận dưới đây.
                    </p>

                    <table className="no-border" style={{ width: '100%', marginTop: '14px' }}>
                      <tbody>
                        <tr>
                          <td style={{ border: 'none', width: '50%', textAlign: 'center' }}>
                            <div style={{ fontWeight: 'bold' }}>ĐẠI DIỆN BÊN CHO THUÊ (BÊN A)</div>
                            <div style={{ fontStyle: 'italic', fontSize: '11pt' }}>(Ký và ghi rõ họ tên)</div>
                            <div style={{ height: '70px' }} />
                            <div style={{ fontWeight: 'bold' }}>{hopDong.TenChuTro}</div>
                          </td>
                          <td style={{ border: 'none', width: '50%', textAlign: 'center' }}>
                            <div style={{ fontWeight: 'bold' }}>ĐẠI DIỆN BÊN THUÊ PHÒNG (BÊN B)</div>
                            <div style={{ fontStyle: 'italic', fontSize: '11pt' }}>(Ký và ghi rõ họ tên)</div>
                            <div style={{ height: '70px' }} />
                            <div style={{ fontWeight: 'bold' }}>{nguoiDaiDien.HoTen}</div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                /* MẪU HÓA ĐƠN CHUẨN THEO FILE MauHoaDon.docx */
                <div style={{ padding: '10px', border: '1px dashed #334155' }}>
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
    </div>
  );
}