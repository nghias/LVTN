'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import ProtectedRoute from '../../../components/common/ProtectedRoute';
import QuanLyHeader from '../../../components/layout/QuanLyHeader';
import { useAlertModal } from '../../../components/common/AlertModalProvider';
import { PhongTroService } from '../../../services/phongTro.service';
import { KhuTroItem } from '../../../types/phongTro.type';
import {
  generateDoorNfcCode,
  readNfcDoorTag,
  writeNfcDoorTag,
} from '../../../utils/webNfc.util';

export default function QuanLyKhuTroPage() {
  const { showSuccess, showError, showConfirm } = useAlertModal();

  const [khuTroList, setKhuTroList] = useState<KhuTroItem[]>([]);
  const [keyword, setKeyword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  const [editingPassMaKhu, setEditingPassMaKhu] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState<string>('');
  const [savingPass, setSavingPass] = useState<boolean>(false);

  const [nfcWorkingKey, setNfcWorkingKey] = useState<string>('');

  const fetchKhuTroList = useCallback(async () => {
    try {
      setLoading(true);
      const res = await PhongTroService.getKhuTroList();
      setKhuTroList(res.data || []);
    } catch (err: unknown) {
      if (err instanceof Error) showError(err.message);
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    fetchKhuTroList();
  }, [fetchKhuTroList]);

  const filteredList = khuTroList.filter((k) => {
    if (!keyword.trim()) return true;
    const kw = keyword.toLowerCase();
    return (
      k.TenKhu.toLowerCase().includes(kw) ||
      (k.DiaChi || '').toLowerCase().includes(kw) ||
      (k.TenQuanLy || '').toLowerCase().includes(kw)
    );
  });

  const handleDeleteKhuTro = (khu: KhuTroItem) => {
    showConfirm(
      `Bạn có chắc chắn muốn xóa "${khu.TenKhu}" không? Hành động này chỉ thực hiện được khi cơ sở chưa có phòng nào.`,
      'Xác nhận xóa Cơ sở',
      async () => {
        try {
          await PhongTroService.deleteKhuTro(khu.MaKhu);
          showSuccess('Đã xóa cơ sở thành công!');
          fetchKhuTroList();
        } catch (err: unknown) {
          if (err instanceof Error) showError(err.message);
        }
      }
    );
  };

  const handleSaveDoorPassword = async (maKhu: number) => {
    const cleaned = newPassword.trim();
    if (!/^\d{6}$/.test(cleaned)) {
      showError('Mật khẩu mở cửa phải gồm đúng 6 chữ số (VD: 123456).');
      return;
    }
    try {
      setSavingPass(true);
      await PhongTroService.updateMatKhauCua(maKhu, cleaned);
      showSuccess('Đã cập nhật và mã hóa mật khẩu mở cửa thành công!');
      setEditingPassMaKhu(null);
      setNewPassword('');
      fetchKhuTroList();
    } catch (err: unknown) {
      if (err instanceof Error) showError(err.message);
    } finally {
      setSavingPass(false);
    }
  };

  const handleWriteNfcTag = async (khu: KhuTroItem) => {
    const key = `WRITE-${khu.MaKhu}`;
    try {
      setNfcWorkingKey(key);
      const newCode = generateDoorNfcCode(khu.MaKhu);
      await writeNfcDoorTag(newCode);
      await PhongTroService.updateMaMoCua(khu.MaKhu, newCode);
      showSuccess(`Đã ghi và mã hóa thẻ NFC mới cho ${khu.TenKhu}!`);
      fetchKhuTroList();
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : 'Ghi thẻ NFC thất bại.');
    } finally {
      setNfcWorkingKey('');
    }
  };

  const handleReadNfcTag = async (khu: KhuTroItem) => {
    const key = `READ-${khu.MaKhu}`;
    try {
      setNfcWorkingKey(key);
      const { code } = await readNfcDoorTag();
      await PhongTroService.updateMaMoCua(khu.MaKhu, code);
      showSuccess(`Đã mã hóa và lưu thẻ NFC cho ${khu.TenKhu}!`);
      fetchKhuTroList();
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : 'Đọc thẻ NFC thất bại.');
    } finally {
      setNfcWorkingKey('');
    }
  };

  return (
    <ProtectedRoute allowedRoles={['ChuTro', 'QuanLy']}>
      {(user) => (
        <div className="flex-1 flex flex-col bg-white text-slate-900">
          <QuanLyHeader user={user} />

          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                  Quản Lý Cơ Sở (Khu Trọ)
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Quản lý thông tin cơ sở, mật khẩu mở cửa và thẻ NFC gắn tại cổng
                </p>
              </div>

              {user.Quyen === 'ChuTro' && (
                <Link
                  href="/chuTro/khuTro/them"
                  className="text-center px-5 py-2.5 rounded-full bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 border border-teal-300 text-xs font-bold shadow-xs transition no-underline"
                >
                  Thêm Cơ Sở Mới
                </Link>
              )}
            </div>

            {khuTroList.length > 1 && (
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Tìm kiếm theo tên cơ sở, địa chỉ hoặc người quản lý..."
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
                />
              </div>
            )}

            {loading ? (
              <div className="py-16 text-center text-sm text-slate-500">
                Đang tải danh sách cơ sở...
              </div>
            ) : filteredList.length === 0 ? (
              <div className="py-16 text-center bg-slate-50 rounded-2xl border border-slate-200 p-6">
                <p className="text-base font-bold text-slate-700">
                  Không tìm thấy cơ sở nào phù hợp!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {filteredList.map((khu) => {
                  const isEditingPass = editingPassMaKhu === khu.MaKhu;
                  const isWriting = nfcWorkingKey === `WRITE-${khu.MaKhu}`;
                  const isReading = nfcWorkingKey === `READ-${khu.MaKhu}`;
                  const hasPass = khu.DaCoMatKhau ?? Boolean(khu.MatKhau);
                  const hasNfc = khu.DaGanTheNFC ?? Boolean(khu.MaMoCua);

                  return (
                    <div
                      key={khu.MaKhu}
                      className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4 flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <h2 className="text-lg font-bold text-slate-900">
                              {khu.TenKhu}
                            </h2>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#00FFCC]/40 text-slate-900">
                                Quản lý: {khu.TenQuanLy || 'Chưa gán'}
                              </span>
                              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
                                {khu.TongSoPhong || 0} phòng
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Link
                              href={`/chuTro/khuTro/sua/${khu.MaKhu}`}
                              className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-[#00FFCC]/20 text-slate-800 border border-slate-300 text-xs font-bold transition no-underline"
                            >
                              Sửa
                            </Link>
                            {user.Quyen === 'ChuTro' && (
                              <button
                                type="button"
                                onClick={() => handleDeleteKhuTro(khu)}
                                className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-red-50 text-red-600 border border-red-200 text-xs font-bold transition cursor-pointer"
                              >
                                Xóa
                              </button>
                            )}
                          </div>
                        </div>

                        <p className="text-xs text-slate-600">
                          <strong>Địa chỉ:</strong> {khu.DiaChi}
                        </p>
                        {khu.MoTa && (
                          <p className="text-xs text-slate-500">{khu.MoTa}</p>
                        )}
                      </div>

                      {/* Khối 1: Mật khẩu mở cửa (Keypad) */}
                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="text-xs font-bold text-slate-800">
                              Mật khẩu mở cửa (Bàn phím)
                            </p>
                            <p className="text-[11px] text-slate-500">
                              Trạng thái:{' '}
                              <span className="font-mono font-bold text-slate-900">
                                {hasPass ? '•••••• (Đã mã hóa)' : 'Chưa thiết lập'}
                              </span>
                            </p>
                          </div>

                          {!isEditingPass && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingPassMaKhu(khu.MaKhu);
                                setNewPassword('');
                              }}
                              className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-xs font-bold text-slate-800 cursor-pointer"
                            >
                              Đổi mật khẩu cửa
                            </button>
                          )}
                        </div>

                        {isEditingPass && (
                          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200">
                            <input
                              type="password"
                              inputMode="numeric"
                              maxLength={6}
                              value={newPassword}
                              onChange={(e) =>
                                setNewPassword(e.target.value.replace(/\D/g, ''))
                              }
                              placeholder="Nhập 6 chữ số mới..."
                              className="flex-1 min-w-[140px] px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
                            />
                            <button
                              type="button"
                              disabled={savingPass}
                              onClick={() => handleSaveDoorPassword(khu.MaKhu)}
                              className="px-3.5 py-2 rounded-lg bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 text-xs font-bold disabled:opacity-60 cursor-pointer"
                            >
                              {savingPass ? 'Đang lưu...' : 'Lưu'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingPassMaKhu(null);
                                setNewPassword('');
                              }}
                              className="px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-600 text-xs font-bold cursor-pointer"
                            >
                              Hủy
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Khối 2: Thẻ NFC gắn cổng (Mở cửa bằng điện thoại) */}
                      <div className="p-3.5 rounded-xl bg-teal-50/50 border border-teal-200 space-y-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs font-bold text-slate-900">
                            Thẻ NFC gắn cổng (Quét mở cửa)
                          </p>
                          {hasNfc ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                              Đã kích hoạt (Đã mã hóa)
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                              Chưa gắn thẻ NFC
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            disabled={nfcWorkingKey !== ''}
                            onClick={() => handleWriteNfcTag(khu)}
                            className="flex-1 px-3 py-2 rounded-xl bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 border border-teal-400 text-xs font-bold disabled:opacity-60 cursor-pointer"
                          >
                            {isWriting
                              ? 'Đưa ĐT chạm thẻ để ghi...'
                              : 'Ghi mã mới lên thẻ NFC'}
                          </button>

                          <button
                            type="button"
                            disabled={nfcWorkingKey !== ''}
                            onClick={() => handleReadNfcTag(khu)}
                            className="flex-1 px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 text-xs font-bold disabled:opacity-60 cursor-pointer"
                          >
                            {isReading
                              ? 'Đưa ĐT chạm thẻ để đọc...'
                              : 'Đọc thẻ có sẵn lưu hệ thống'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </main>
        </div>
      )}
    </ProtectedRoute>
  );
}