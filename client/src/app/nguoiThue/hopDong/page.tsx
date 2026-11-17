// client/src/app/nguoiThue/hopDong/page.tsx
'use client';

import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import NguoiThueHeader from '../../../components/layout/NguoiThueHeader';
import { useAlertModal } from '@/components/common/AlertModalProvider';
import HopDongPdfModal from '@/components/features/hopDong/HopDongPdf';
import DanhSachHopDongSidebar from '../hopDong/danhSach/page';
import ChiTietThongTinHopDong from '../hopDong/chiTiet/page';
import YeuCauHuyHopDongModal from '../hopDong/huyHopDong/page';
import {
  HopDongTomTat,
  ChiTietHopDongNguoiThue,
  chuanHoaDuLieuSangPdf,
  chuanHoaNFC,
  requestHopDongApi,
} from '@/utils/hopDongNguoiThue.util';
import { ChiTietHopDongFull as ChiTietHopDongPdfType } from '@/types/hopDong.type';

export default function NguoiThueHopDongPage() {
  const router = useRouter();
  const { showSuccess, showError, showConfirm } = useAlertModal();
  const detailSectionRef = useRef<HTMLDivElement>(null);

  const [danhSach, setDanhSach] = useState<HopDongTomTat[]>([]);
  const [selectedMaHDT, setSelectedMaHDT] = useState<number | null>(null);
  const [chiTiet, setChiTiet] = useState<ChiTietHopDongNguoiThue | null>(null);

  const [loadingList, setLoadingList] = useState<boolean>(true);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);

  const [filterTrangThai, setFilterTrangThai] = useState<string>('');
  const [tuKhoa, setTuKhoa] = useState<string>('');

  // State cho Modal Xem & Xuất PDF toàn màn hình
  const [pdfModalMaHDT, setPdfModalMaHDT] = useState<number | null>(null);
  const [chiTietPdfModal, setChiTietPdfModal] = useState<ChiTietHopDongPdfType | null>(null);
  const [dangTaiPdfModal, setDangTaiPdfModal] = useState<boolean>(false);
  const [tuDongTaiPdf, setTuDongTaiPdf] = useState<boolean>(false);

  // State cho Modal Yêu cầu hủy hợp đồng
  const [cancelModalOpen, setCancelModalOpen] = useState<boolean>(false);
  const [submittingCancel, setSubmittingCancel] = useState<boolean>(false);

  // 1. Tải danh sách hợp đồng của người thuê đang đăng nhập
  const fetchDanhSachHopDong = useCallback(async () => {
    setLoadingList(true);
    try {
      const { data } = await requestHopDongApi('/hop-dong/cua-toi', {
        method: 'GET',
      });
      if (data?.thanhCong) {
        const list: HopDongTomTat[] = data.duLieu || [];
        setDanhSach(list);
        if (list.length > 0) {
          setSelectedMaHDT((prev) => prev ?? list[0].MaHDT);
        }
      }
    } catch (error: any) {
      if (error?.status === 401) {
        router.replace('/auth');
        return;
      }
      showError(
        error?.data?.thongBao ||
          error?.message ||
          'Không thể tải danh sách hợp đồng của bạn.'
      );
    } finally {
      setLoadingList(false);
    }
  }, [router, showError]);

  // 2. Tải chi tiết hợp đồng được chọn
  const fetchChiTietHopDong = useCallback(
    async (maHDT: number) => {
      setLoadingDetail(true);
      try {
        const { data } = await requestHopDongApi(`/hop-dong/cua-toi/${maHDT}`, {
          method: 'GET',
        });
        if (data?.thanhCong && data?.duLieu) {
          setChiTiet(data.duLieu);
        }
      } catch (error: any) {
        showError(
          error?.data?.thongBao ||
            error?.message ||
            'Bạn không có quyền truy cập hợp đồng này hoặc hợp đồng không tồn tại.'
        );
        setChiTiet(null);
      } finally {
        setLoadingDetail(false);
      }
    },
    [showError]
  );

  useEffect(() => {
    fetchDanhSachHopDong();
  }, [fetchDanhSachHopDong]);

  useEffect(() => {
    if (selectedMaHDT) {
      fetchChiTietHopDong(selectedMaHDT);
    }
  }, [selectedMaHDT, fetchChiTietHopDong]);

  const danhSachLoc = useMemo(() => {
    return danhSach.filter((hd) => {
      const matchStatus = !filterTrangThai || hd.TrangThai === filterTrangThai;
      const kw = tuKhoa.trim().toLowerCase();
      const matchKeyword =
        !kw ||
        String(hd.MaHDT).includes(kw) ||
        hd.TenPhong?.toLowerCase().includes(kw) ||
        hd.TenKhu?.toLowerCase().includes(kw) ||
        hd.TenQuanLy?.toLowerCase().includes(kw);
      return matchStatus && matchKeyword;
    });
  }, [danhSach, filterTrangThai, tuKhoa]);

  const selectedTomTat = useMemo(
    () => danhSach.find((item) => item.MaHDT === selectedMaHDT) || null,
    [danhSach, selectedMaHDT]
  );

  // Mở Modal Xem / Xuất PDF A4 khi người dùng nhấn nút
  const handleOpenPdfModal = async (maHDT: number, autoDownload = false) => {
    const hopDongCuaToi = danhSach.find((item) => item.MaHDT === maHDT);
    if (!hopDongCuaToi) {
      showError('Bạn chỉ có quyền xem bản PDF hợp đồng của chính mình.');
      return;
    }

    setPdfModalMaHDT(maHDT);
    setTuDongTaiPdf(autoDownload);

    if (chiTiet && chiTiet.MaHDT === maHDT) {
      setChiTietPdfModal(chuanHoaDuLieuSangPdf(chiTiet, hopDongCuaToi));
      return;
    }

    setDangTaiPdfModal(true);
    try {
      const { data } = await requestHopDongApi(`/hop-dong/cua-toi/${maHDT}`, {
        method: 'GET',
      });
      if (data?.thanhCong && data?.duLieu) {
        setChiTiet(data.duLieu);
        setSelectedMaHDT(maHDT);
        setChiTietPdfModal(chuanHoaDuLieuSangPdf(data.duLieu, hopDongCuaToi));
      } else {
        throw new Error('Không thể tải chi tiết hợp đồng PDF');
      }
    } catch (error: any) {
      showError(
        error?.data?.thongBao ||
          error?.message ||
          'Không thể mở chi tiết hợp đồng PDF của bạn.'
      );
      setPdfModalMaHDT(null);
      setChiTietPdfModal(null);
    } finally {
      setDangTaiPdfModal(false);
    }
  };

  const handleSelectContract = (maHDT: number) => {
    setSelectedMaHDT(maHDT);
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setTimeout(() => {
        detailSectionRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }, 100);
    }
  };

  // Xử lý gửi yêu cầu hủy hợp đồng
  const handleSubmitCancelRequest = (payload: {
    lyDoHuy: string;
    ngayDuKienTraPhong: string;
    sdtLienHe: string;
    ghiChuThem: string;
    dongYDieuKhoan: boolean;
  }) => {
    if (!chiTiet) return;

    if (payload.lyDoHuy.trim().length < 10) {
      showError('Vui lòng nhập lý do hủy hợp đồng tối thiểu 10 ký tự.');
      return;
    }
    if (!payload.ngayDuKienTraPhong) {
      showError('Vui lòng chọn ngày dự kiến trả phòng.');
      return;
    }
    if (!payload.dongYDieuKhoan) {
      showError('Vui lòng tích xác nhận gửi thông báo yêu cầu hủy hợp đồng.');
      return;
    }

    showConfirm(
      `Yêu cầu hủy Hợp đồng (Phòng ${chiTiet.TenPhong}) sẽ được gửi trực tiếp tới Quản lý khu trọ và Chủ trọ qua hệ thống Thông báo. Bạn chắc chắn muốn gửi?`,
      'Xác nhận gửi yêu cầu hủy hợp đồng',
      async () => {
        setSubmittingCancel(true);
        try {
          const { data } = await requestHopDongApi(
            `/hop-dong/cua-toi/${chiTiet.MaHDT}/yeu-cau-huy`,
            {
              method: 'POST',
              body: JSON.stringify({
                lyDoHuy: payload.lyDoHuy.trim(),
                ngayDuKienTraPhong: payload.ngayDuKienTraPhong,
                sdtLienHe: payload.sdtLienHe.trim(),
                ghiChuThem: payload.ghiChuThem.trim(),
              }),
            }
          );

          if (data?.thanhCong) {
            setCancelModalOpen(false);
            setDanhSach((prev) =>
              prev.map((item) =>
                item.MaHDT === chiTiet.MaHDT
                  ? { ...item, DaGuiYeuCauHuy: true }
                  : item
              )
            );
            setChiTiet((prev) =>
              prev ? { ...prev, DaGuiYeuCauHuy: true } : prev
            );

            showSuccess(
              'Đã gửi thông báo yêu cầu hủy hợp đồng tới Quản lý và Chủ trọ!',
              'Gửi yêu cầu thành công'
            );
          }
        } catch (error: any) {
          showError(
            error?.data?.thongBao ||
              error?.message ||
              'Có lỗi xảy ra khi gửi yêu cầu hủy hợp đồng.'
          );
        } finally {
          setSubmittingCancel(false);
        }
      },
      'Gửi yêu cầu',
      'Quay lại'
    );
  };

  return (
    <ProtectedRoute allowedRoles={['KhachThue']}>
      {(user) => (
        <div className="min-h-screen flex flex-col bg-white text-slate-900">
          <NguoiThueHeader user={user} />

          <main className="flex-1 mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-6 pb-14 space-y-6">
            {/* 1. HEADER */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  Hợp Đồng Thuê Phòng Của Tôi
                </h1>
                <p className="mt-1 text-xs sm:text-sm text-slate-500">
                  Theo dõi thông tin hợp đồng, danh sách thành viên tạm trú và các dịch vụ đăng ký của phòng bạn.
                </p>
              </div>
            </div>

            {/* 2. BỐ CỤC 2 CỘT */}
            {loadingList ? (
              <div className="rounded-3xl border border-slate-200/80 bg-white p-14 text-center shadow-2xs">
                <div className="mx-auto mb-3 h-9 w-9 animate-spin rounded-full border-4 border-[#00FFCC]/40 border-t-teal-600" />
                <p className="text-sm font-semibold text-slate-600">
                  Đang tải dữ liệu hợp đồng của bạn...
                </p>
              </div>
            ) : danhSachLoc.length === 0 ? (
              <div className="rounded-3xl border border-slate-200/80 bg-white p-12 text-center shadow-2xs">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-teal-200 bg-teal-50 text-2xl">
                  📄
                </div>
                <h2 className="text-base font-bold text-slate-900">
                  Không tìm thấy hợp đồng thuê phòng nào
                </h2>
                <p className="mx-auto mt-1 max-w-md text-xs text-slate-500">
                  Bạn chỉ có thể xem các hợp đồng mà tài khoản của bạn có tên trong danh sách thành viên lưu trú.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* CỘT TRÁI: DANH SÁCH HỢP ĐỒNG (4 CỘT) */}
                <div className="lg:col-span-4">
                  <DanhSachHopDongSidebar
                    danhSach={danhSachLoc}
                    selectedMaHDT={selectedMaHDT}
                    onSelect={handleSelectContract}
                    onOpenPdf={handleOpenPdfModal}
                  />
                </div>

                {/* CỘT PHẢI: THÔNG TIN CHI TIẾT HỢP ĐỒNG (8 CỘT) */}
                <div ref={detailSectionRef} className="lg:col-span-8">
                  {loadingDetail || !chiTiet ? (
                    <div className="flex min-h-[420px] flex-col items-center justify-center rounded-3xl border border-slate-200/80 bg-white p-12 text-center shadow-2xs">
                      <div className="mb-3 h-8 w-8 animate-spin rounded-full border-4 border-[#00FFCC]/40 border-t-teal-600" />
                      <p className="text-xs font-semibold text-slate-500">
                        Đang tải chi tiết hợp đồng...
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-3xl border border-slate-200/80 bg-white shadow-2xs overflow-hidden">
                      {/* Header của Card chi tiết bên phải */}
                      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-6 py-5">
                        <div>
                          <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                            Hợp Đồng Thuê Phòng
                          </h2>
                          <p className="mt-1 text-xs font-medium text-slate-500">
                            {chuanHoaNFC(chiTiet.TenPhong)} — {chuanHoaNFC(chiTiet.TenKhu)}
                            {chiTiet.DiaChiKhuTro || selectedTomTat?.DiaChiKhu
                              ? ` | ${chuanHoaNFC(chiTiet.DiaChiKhuTro || selectedTomTat?.DiaChiKhu)}`
                              : ''}
                          </p>
                        </div>

                        {/* Cụm nút hành động */}
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenPdfModal(chiTiet.MaHDT, false)}
                            className="rounded-full bg-[#00FFCC] hover:bg-[#00e6b8] border border-teal-300 px-4 py-2 text-xs font-bold text-slate-900 shadow-2xs transition cursor-pointer"
                          >
                            Xem hợp đồng
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenPdfModal(chiTiet.MaHDT, true)}
                            className="rounded-full border border-teal-300 bg-teal-50 hover:bg-teal-100 px-4 py-2 text-xs font-bold text-teal-900 transition cursor-pointer"
                          >
                            Tải PDF
                          </button>

                          {chiTiet.TrangThai === 'ConHieuLuc' && !chiTiet.DaGuiYeuCauHuy && (
                            <button
                              type="button"
                              onClick={() => setCancelModalOpen(true)}
                              className="rounded-full border border-rose-200 bg-rose-50 hover:bg-rose-100 px-4 py-2 text-xs font-bold text-rose-600 transition cursor-pointer"
                            >
                              Yêu cầu hủy HĐ
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Thông báo nếu đã gửi yêu cầu hủy */}
                      {chiTiet.DaGuiYeuCauHuy && (
                        <div className="mx-6 mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3.5">
                          <div className="text-xs text-amber-900">
                            <p className="font-bold">
                              Yêu cầu chấm dứt hợp đồng của bạn đã được gửi tới Ban quản lý!
                            </p>
                            <p className="mt-0.5 text-amber-700">
                              Theo dõi phản hồi và lịch kiểm tra bàn giao phòng tại mục Thông báo.
                            </p>
                          </div>
                          <Link
                            href="/nguoiThue/thongBao"
                            className="self-start sm:self-center whitespace-nowrap rounded-xl bg-amber-200/80 hover:bg-amber-300 px-3.5 py-2 text-xs font-bold text-amber-950 no-underline"
                          >
                            Mở Thông báo →
                          </Link>
                        </div>
                      )}

                      {/* Nội dung chi tiết hợp đồng, dịch vụ & tạm trú */}
                      <ChiTietThongTinHopDong
                        chiTiet={chiTiet}
                        tomTat={selectedTomTat}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </main>

          {/* MODAL LOADING KHI ĐANG TẢI BẢN XEM HỢP ĐỒNG PDF A4 */}
          {pdfModalMaHDT && dangTaiPdfModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs">
              <div className="rounded-2xl border border-teal-300 bg-white px-6 py-4 text-sm font-bold text-slate-900 shadow-lg">
                Đang tải bản xem hợp đồng #{pdfModalMaHDT}...
              </div>
            </div>
          )}

          {/* MODAL XEM & XUẤT PDF HỢP ĐỒNG CHUẨN A4 */}
          {pdfModalMaHDT && !dangTaiPdfModal && chiTietPdfModal && (
            <HopDongPdfModal
              hopDong={chiTietPdfModal}
              tuDongTaiPdf={tuDongTaiPdf}
              onClose={() => {
                setPdfModalMaHDT(null);
                setChiTietPdfModal(null);
                setTuDongTaiPdf(false);
              }}
            />
          )}

          {/* MODAL YÊU CẦU HỦY HỢP ĐỒNG */}
          <YeuCauHuyHopDongModal
            open={cancelModalOpen}
            chiTiet={chiTiet}
            submitting={submittingCancel}
            onClose={() => setCancelModalOpen(false)}
            onSubmit={handleSubmitCancelRequest}
          />
        </div>
      )}
    </ProtectedRoute>
  );
}