// client/src/app/nguoiThue/thongBao/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { thongBaoService } from '@/services/thongBao.service';
import {
  LoaiThongBao,
  ThongBaoChiTiet,
  ThongBaoItem,
  ThongBaoReplyItem,
  ThongTinPhongKhach,
} from '@/types/thongBao.type';

const formatDateTime = (dateStr: string) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getRoleLabel = (quyen: string) => {
  switch (quyen) {
    case 'ChuTro':
    case 'Admin':
      return 'Chủ trọ';
    case 'QuanLy':
      return 'Quản lý cơ sở';
    default:
      return 'Khách thuê';
  }
};

export default function NguoiThueThongBaoPage() {
  // Danh sách & Bộ lọc
  const [tab, setTab] = useState<'da_nhan' | 'da_gui'>('da_nhan');
  const [keyword, setKeyword] = useState('');
  const [maLTB, setMaLTB] = useState('');
  const [trangThai, setTrangThai] = useState<'' | 'ChuaDoc' | 'DaDoc'>('');

  const [items, setItems] = useState<ThongBaoItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loaiThongBaoList, setLoaiThongBaoList] = useState<LoaiThongBao[]>([]);
  const [thongTinPhong, setThongTinPhong] =
    useState<ThongTinPhongKhach | null>(null);
  const [loading, setLoading] = useState(true);

  // Chi tiết thông báo & Phản hồi
  const [selectedDetail, setSelectedDetail] =
    useState<ThongBaoChiTiet | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [replyMessage, setReplyMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Modal Gửi Phản Ánh / Báo Cáo Sự Cố
  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [formMaLTB, setFormMaLTB] = useState<number>(0);
  const [formTieuDe, setFormTieuDe] = useState('');
  const [formNoiDung, setFormNoiDung] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Tải danh sách thông báo
  const fetchDanhSach = useCallback(async () => {
    try {
      setLoading(true);
      const data = await thongBaoService.getThongBaoCuaToi({
        limit: 100,
        keyword,
        maLTB,
        trangThai: tab === 'da_nhan' ? trangThai : '',
        tab,
      });

      setItems(data.items || []);
      setUnreadCount(data.unreadCount || 0);

      if (data.loaiThongBaoList && data.loaiThongBaoList.length > 0) {
        setLoaiThongBaoList(data.loaiThongBaoList);
        setFormMaLTB((prev) => prev || data.loaiThongBaoList![0].MaLTB);
      }
      if (data.thongTinPhong !== undefined) {
        setThongTinPhong(data.thongTinPhong);
      }
    } catch (error) {
      console.error('Lỗi tải danh sách thông báo:', error);
    } finally {
      setLoading(false);
    }
  }, [keyword, maLTB, trangThai, tab]);

  useEffect(() => {
    fetchDanhSach();
  }, [fetchDanhSach]);

  // Kết nối WebSocket nhận thông báo và phản hồi thời gian thực
  useEffect(() => {
    let currentMaND = 0;
    if (typeof window !== 'undefined') {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const payload = JSON.parse(atob(token.split('.')[1]));
          currentMaND = Number(payload.maND ?? payload.MaND);
        }
      } catch {
        // Ignore
      }
    }

    const rawUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    const socketUrl = rawUrl.replace(/\/api\/?$/, '');

    const socket: Socket = io(socketUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      query: currentMaND ? { maND: String(currentMaND) } : undefined,
    });

    socket.on('connect', () => {
      if (currentMaND) {
        socket.emit('join_user_room', currentMaND);
      }
    });

    socket.on('thong_bao_moi', (newNoti: ThongBaoItem) => {
      setUnreadCount((prev) => prev + 1);
      if (tab === 'da_nhan') {
        setItems((prev) => {
          if (prev.some((i) => i.MaTB === newNoti.MaTB)) return prev;
          return [{ ...newNoti, TrangThai: 'ChuaDoc' }, ...prev];
        });
      }
    });

    socket.on(
      'phan_hoi_thong_bao',
      (payload: { rootMaTB: number; phanHoi: ThongBaoReplyItem }) => {
        setSelectedDetail((prev) => {
          if (!prev || prev.MaTB !== Number(payload.rootMaTB)) return prev;
          if (prev.dsPhanHoi.some((r) => r.MaTB === payload.phanHoi.MaTB))
            return prev;
          return {
            ...prev,
            dsPhanHoi: [...prev.dsPhanHoi, payload.phanHoi],
          };
        });
      }
    );

    socket.on('xoa_thong_bao', ({ MaTB }: { MaTB: number }) => {
      setItems((prev) => prev.filter((n) => n.MaTB !== Number(MaTB)));
      setSelectedDetail((prev) =>
        prev?.MaTB === Number(MaTB) ? null : prev
      );
    });

    return () => {
      socket.disconnect();
    };
  }, [tab]);

  // Mở xem chi tiết 1 thông báo & đánh dấu đã đọc
  const handleSelectItem = async (item: ThongBaoItem) => {
    setDetailLoading(true);
    setReplyMessage(null);
    setReplyText('');

    if (item.TrangThai === 'ChuaDoc') {
      setItems((prev) =>
        prev.map((n) =>
          n.MaTB === item.MaTB ? { ...n, TrangThai: 'DaDoc' } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }

    try {
      const detail = await thongBaoService.getChiTiet(item.MaTB);
      setSelectedDetail(detail);
    } catch (error) {
      console.error('Lỗi tải chi tiết:', error);
    } finally {
      setDetailLoading(false);
    }
  };

  // Đánh dấu đã đọc tất cả
  const handleMarkAllRead = async () => {
    if (unreadCount === 0) return;
    try {
      await thongBaoService.danhDauDaDocTatCa();
      setItems((prev) => prev.map((n) => ({ ...n, TrangThai: 'DaDoc' })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Lỗi đánh dấu đã đọc tất cả:', error);
    }
  };

  // Gửi trả lời trong luồng thông báo
  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDetail || !replyText.trim()) return;

    try {
      setSendingReply(true);
      setReplyMessage(null);
      const newReply = await thongBaoService.traLoiThongBao(
        selectedDetail.MaTB,
        replyText.trim()
      );

      setSelectedDetail((prev) =>
        prev
          ? {
              ...prev,
              dsPhanHoi: [...prev.dsPhanHoi, newReply],
            }
          : null
      );
      setItems((prev) =>
        prev.map((item) =>
          item.MaTB === selectedDetail.MaTB
            ? { ...item, SoPhanHoi: (item.SoPhanHoi || 0) + 1 }
            : item
        )
      );
      setReplyText('');
      setReplyMessage({
        type: 'success',
        text: 'Đã gửi phản hồi thành công!',
      });
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Không thể gửi phản hồi.';
      setReplyMessage({ type: 'error', text: msg });
    } finally {
      setSendingReply(false);
    }
  };

  // Gửi phản ánh / báo cáo sự cố mới
  const handleCreatePhanAnh = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formMaLTB || !formTieuDe.trim() || !formNoiDung.trim()) {
      setCreateError('Vui lòng điền đầy đủ tiêu đề và nội dung sự cố/phản ánh.');
      return;
    }

    try {
      setCreating(true);
      setCreateError('');
      const res = await thongBaoService.guiPhanAnh({
        maLTB: Number(formMaLTB),
        tieuDe: formTieuDe.trim(),
        noiDung: formNoiDung.trim(),
      });

      setOpenCreateModal(false);
      setFormTieuDe('');
      setFormNoiDung('');
      setTab('da_gui');
      await fetchDanhSach();
      handleSelectItem(res.data);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Gửi phản ánh thất bại.';
      setCreateError(msg);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
      {/* Banner tiêu đề & Nút Báo cáo sự cố */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-lg sm:text-xl font-bold text-slate-900">
              Thông báo & Phản ánh sự cố
            </h1>
            {thongTinPhong && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#00FFCC]/30 text-slate-900 border border-[#00FFCC]">
                {thongTinPhong.TenPhong} • {thongTinPhong.TenKhu}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Theo dõi thông báo từ Ban quản lý và gửi yêu cầu hỗ trợ, báo cáo sự
            cố kỹ thuật tại phòng của bạn.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 cursor-pointer transition"
            >
              Đánh dấu đọc tất cả ({unreadCount})
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setCreateError('');
              setOpenCreateModal(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-[#00FFCC] hover:bg-teal-300 text-slate-900 text-xs font-bold shadow-xs cursor-pointer transition flex items-center gap-1.5"
          >
            <span>+ Báo cáo sự cố / Gửi phản ánh</span>
          </button>
        </div>
      </div>

      {/* Thanh công cụ: Tabs + Bộ lọc tìm kiếm */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Chuyển Tab Đã nhận / Đã gửi */}
          <div className="inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200">
            <button
              type="button"
              onClick={() => {
                setTab('da_nhan');
                setSelectedDetail(null);
              }}
              className={`px-4 py-2 rounded-lg text-xs font-bold cursor-pointer transition flex items-center gap-1.5 ${
                tab === 'da_nhan'
                  ? 'bg-[#00FFCC] text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Hộp thư đến</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-red-500 text-white">
                  {unreadCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setTab('da_gui');
                setSelectedDetail(null);
              }}
              className={`px-4 py-2 rounded-lg text-xs font-bold cursor-pointer transition ${
                tab === 'da_gui'
                  ? 'bg-[#00FFCC] text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Phản ánh đã gửi
            </button>
          </div>

          {/* Bộ lọc Trạng thái đọc (Chỉ hiện ở Hộp thư đến) */}
          {tab === 'da_nhan' && (
            <div className="flex items-center gap-1.5">
              {[
                { label: 'Tất cả', value: '' },
                { label: 'Chưa đọc', value: 'ChuaDoc' },
                { label: 'Đã đọc', value: 'DaDoc' },
              ].map((st) => (
                <button
                  key={st.value}
                  type="button"
                  onClick={() =>
                    setTrangThai(st.value as '' | 'ChuaDoc' | 'DaDoc')
                  }
                  className={`px-3 py-1.5 rounded-full text-xs font-bold cursor-pointer transition ${
                    trangThai === st.value
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Ô tìm kiếm & Chọn Loại thông báo */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="sm:col-span-2">
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Tìm theo tiêu đề, nội dung hoặc tên người gửi..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-teal-500"
            />
          </div>
          <div>
            <select
              value={maLTB}
              onChange={(e) => setMaLTB(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white focus:outline-none focus:border-teal-500"
            >
              <option value="">-- Tất cả loại thông báo --</option>
              {loaiThongBaoList.map((ltb) => (
                <option key={ltb.MaLTB} value={ltb.MaLTB}>
                  {ltb.TenLTB}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Bố cục 2 cột: Danh sách bên trái - Chi tiết & Phản hồi bên phải */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Cột trái: Danh sách thông báo (5 cột) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">
              Danh sách ({items.length})
            </span>
          </div>

          <div className="divide-y divide-slate-100 max-h-160 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400">
                Đang tải danh sách thông báo...
              </div>
            ) : items.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                Không có thông báo nào phù hợp.
              </div>
            ) : (
              items.map((item) => {
                const isUnread =
                  tab === 'da_nhan' && item.TrangThai === 'ChuaDoc';
                const isSelected = selectedDetail?.MaTB === item.MaTB;

                return (
                  <div
                    key={item.MaTB}
                    onClick={() => handleSelectItem(item)}
                    className={`p-4 cursor-pointer transition ${
                      isSelected
                        ? 'bg-[#00FFCC]/25 border-l-4 border-teal-500'
                        : isUnread
                        ? 'bg-[#00FFCC]/10 hover:bg-[#00FFCC]/20'
                        : 'bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {item.TenLTB}
                        </span>
                        {(item.SoPhanHoi || 0) > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700">
                            {item.SoPhanHoi} phản hồi
                          </span>
                        )}
                      </div>
                      {isUnread && (
                        <span className="w-2.5 h-2.5 rounded-full bg-teal-500 shrink-0 mt-1" />
                      )}
                    </div>

                    <h3
                      className={`text-xs text-slate-900 mt-1.5 line-clamp-1 ${
                        isUnread ? 'font-bold' : 'font-semibold'
                      }`}
                    >
                      {item.TieuDe}
                    </h3>

                    <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                      {item.NoiDung}
                    </p>

                    <div className="flex items-center justify-between mt-2.5 text-[11px] text-slate-400">
                      <span>
                        Người gửi:{' '}
                        <strong className="text-slate-600">
                          {item.TenNguoiGui}
                        </strong>
                      </span>
                      <span>{formatDateTime(item.NgayGui)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Cột phải: Nội dung chi tiết & Trả lời thông báo (7 cột) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col min-h-120">
          {detailLoading ? (
            <div className="flex-1 flex items-center justify-center p-10 text-xs text-slate-400">
              Đang tải chi tiết thông báo...
            </div>
          ) : !selectedDetail ? (
            <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
              <div className="w-12 h-12 rounded-2xl bg-[#00FFCC]/20 border border-[#00FFCC] flex items-center justify-center text-slate-700 mb-3 font-bold">
                🔔
              </div>
              <p className="text-sm font-bold text-slate-800">
                Chọn một thông báo để xem chi tiết
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Bạn có thể xem toàn bộ nội dung thông báo từ Ban quản lý và gửi
                phản hồi trao đổi trực tiếp tại đây.
              </p>
            </div>
          ) : (
            <>
              {/* Header chi tiết */}
              <div className="p-5 bg-slate-50 border-b border-slate-200">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#00FFCC] text-slate-900">
                    {selectedDetail.TenLTB}
                  </span>
                  <span className="text-xs text-slate-400">
                    Ngày gửi: {formatDateTime(selectedDetail.NgayGui)}
                  </span>
                </div>
                <h2 className="text-base font-bold text-slate-900 mt-2">
                  {selectedDetail.TieuDe}
                </h2>
                <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-600">
                  <span>
                    Từ: <strong>{selectedDetail.TenNguoiGui}</strong>
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
                    {getRoleLabel(selectedDetail.QuyenNguoiGui)}
                  </span>
                </div>
              </div>

              {/* Nội dung chính & Danh sách phản hồi */}
              <div className="p-5 space-y-5 flex-1 max-h-105 overflow-y-auto">
                {/* Nội dung gốc */}
                <div className="p-4 rounded-2xl bg-[#00FFCC]/10 border border-teal-200">
                  <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-line leading-relaxed">
                    {selectedDetail.NoiDung}
                  </p>
                </div>

                {/* Luồng trao đổi / Phản hồi */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Trao đổi & Phản hồi ({selectedDetail.dsPhanHoi?.length || 0}
                    )
                  </h4>

                  {selectedDetail.dsPhanHoi?.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">
                      Chưa có phản hồi nào cho thông báo này.
                    </p>
                  ) : (
                    selectedDetail.dsPhanHoi.map((rep) => (
                      <div
                        key={rep.MaTB}
                        className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200"
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">
                              {rep.TenNguoiGui}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white border border-slate-200 text-slate-600">
                              {getRoleLabel(rep.QuyenNguoiGui)}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400">
                            {formatDateTime(rep.NgayGui)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed">
                          {rep.NoiDung}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Khung nhập trả lời thông báo */}
              <form
                onSubmit={handleReplySubmit}
                className="p-4 bg-slate-50 border-t border-slate-200 space-y-2"
              >
                {replyMessage && (
                  <p
                    className={`text-xs font-semibold ${
                      replyMessage.type === 'success'
                        ? 'text-teal-700'
                        : 'text-red-600'
                    }`}
                  >
                    {replyMessage.text}
                  </p>
                )}

                <div className="flex items-end gap-2.5">
                  <textarea
                    rows={2}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Nhập nội dung phản hồi cho thông báo này..."
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-teal-500 resize-none"
                  />
                  <button
                    type="submit"
                    disabled={sendingReply || !replyText.trim()}
                    className="px-5 py-2.5 rounded-xl bg-[#00FFCC] hover:bg-teal-300 disabled:opacity-50 text-slate-900 text-xs font-bold shrink-0 cursor-pointer transition"
                  >
                    {sendingReply ? 'Đang gửi...' : 'Gửi trả lời'}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>

      {/* Modal Báo cáo sự cố / Gửi phản ánh mới */}
      {openCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Báo cáo sự cố / Gửi phản ánh
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {thongTinPhong
                    ? `Gửi từ ${thongTinPhong.TenPhong} (${thongTinPhong.TenKhu}) tới Quản lý ${thongTinPhong.TenQuanLy}`
                    : 'Gửi trực tiếp tới Ban quản lý Xóm Trọ'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpenCreateModal(false)}
                className="w-8 h-8 rounded-full bg-slate-200/70 hover:bg-slate-300 flex items-center justify-center text-xs font-bold text-slate-700 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePhanAnh} className="p-5 space-y-4">
              {createError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600 font-medium">
                  {createError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Loại thông báo / sự cố
                </label>
                <select
                  value={formMaLTB}
                  onChange={(e) => setFormMaLTB(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white focus:outline-none focus:border-teal-500"
                >
                  {loaiThongBaoList.map((ltb) => (
                    <option key={ltb.MaLTB} value={ltb.MaLTB}>
                      {ltb.TenLTB}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tiêu đề
                </label>
                <input
                  type="text"
                  value={formTieuDe}
                  onChange={(e) => setFormTieuDe(e.target.value)}
                  placeholder="VD: Hỏng vòi nước phòng tắm / Báo sự cố mất điện..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nội dung chi tiết
                </label>
                <textarea
                  rows={4}
                  value={formNoiDung}
                  onChange={(e) => setFormNoiDung(e.target.value)}
                  placeholder="Mô tả chi tiết tình trạng sự cố hoặc nội dung cần Ban quản lý hỗ trợ..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-teal-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOpenCreateModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2.5 rounded-xl bg-[#00FFCC] hover:bg-teal-300 disabled:opacity-50 text-slate-900 text-xs font-bold cursor-pointer transition"
                >
                  {creating ? 'Đang gửi...' : 'Gửi tới Ban quản lý'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}