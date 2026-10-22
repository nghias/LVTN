'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import QuanLyHeader from '@/components/layout/QuanLyHeader';
import { useAlertModal } from '@/components/common/AlertModalProvider';
import { PhongTroService } from '@/services/phongTro.service';
import { QuanLyUserItem } from '@/types/phongTro.type';

export default function SuaKhuTroPage() {
  const params = useParams();
  const router = useRouter();
  const maKhu = Number(params.maKhu);
  const { showSuccess, showError } = useAlertModal();

  const [tenKhu, setTenKhu] = useState('');
  const [diaChi, setDiaChi] = useState('');
  const [moTa, setMoTa] = useState('');
  const [maND, setMaND] = useState<number>(0);
  const [quanLyList, setQuanLyList] = useState<QuanLyUserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [khuRes, qlRes] = await Promise.all([
          PhongTroService.getKhuTroDetail(maKhu),
          PhongTroService.getDanhSachQuanLy(),
        ]);
        if (khuRes.data) {
          setTenKhu(khuRes.data.TenKhu);
          setDiaChi(khuRes.data.DiaChi);
          setMoTa(khuRes.data.MoTa || '');
          setMaND(khuRes.data.MaND);
        }
        setQuanLyList(qlRes.data || []);
      } catch (err: unknown) {
        if (err instanceof Error) {
          showError(err.message, 'Không có quyền truy cập', 2);
        }
        router.replace('/chuTro/phongTro');
      } finally {
        setLoading(false);
      }
    };
    if (maKhu) loadData();
  }, [maKhu, router, showError]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!tenKhu.trim() || !diaChi.trim()) {
      showError('Vui lòng nhập đầy đủ Tên khu trọ và Địa chỉ!');
      return;
    }

    try {
      setSubmitting(true);
      await PhongTroService.updateKhuTro(maKhu, {
        TenKhu: tenKhu,
        DiaChi: diaChi,
        MoTa: moTa,
        MaND: maND,
      });

      showSuccess('Cập nhật thông tin khu trọ thành công!', 'Thành công', 1.5, () => {
        router.push('/chuTro/phongTro');
      });
    } catch (err: unknown) {
      if (err instanceof Error) showError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['ChuTro', 'QuanLy']}>
      {(user) => (
        <div className="flex-1 flex flex-col bg-white text-slate-900">
          <QuanLyHeader user={user} />

          <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-6 sm:py-10">
            <div className="mb-6">
              <Link
                href="/chuTro/phongTro"
                className="text-xs font-bold text-slate-600 hover:text-slate-900 no-underline"
              >
                ← Quay lại danh sách Khu trọ & Phòng
              </Link>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-2">
                Chỉnh Sửa Thông Tin Khu Trọ
              </h1>
            </div>

            {loading ? (
              <p className="text-sm text-slate-500">Đang tải thông tin khu trọ...</p>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-5"
              >
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Tên khu trọ / Cơ sở *
                  </label>
                  <input
                    type="text"
                    value={tenKhu}
                    onChange={(e) => setTenKhu(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Địa chỉ chi tiết *
                  </label>
                  <input
                    type="text"
                    value={diaChi}
                    onChange={(e) => setDiaChi(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
                  />
                </div>

                {/* Chỉ Chủ trọ mới được phép đổi Người quản lý khu trọ */}
                {user.Quyen === 'ChuTro' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Người Quản lý phụ trách
                    </label>
                    <select
                      value={maND}
                      onChange={(e) => setMaND(Number(e.target.value))}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
                    >
                      {quanLyList.map((ql) => (
                        <option key={ql.MaND} value={ql.MaND}>
                          {ql.HoTen} ({ql.Email})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Mô tả khu trọ
                  </label>
                  <textarea
                    rows={4}
                    value={moTa}
                    onChange={(e) => setMoTa(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00FFCC]"
                  />
                </div>

                <div className="pt-4 flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
                  <Link
                    href="/chuTro/phongTro"
                    className="w-full sm:w-auto text-center px-6 py-3 rounded-full border border-slate-300 text-slate-700 text-xs font-bold no-underline hover:bg-slate-100"
                  >
                    Hủy
                  </Link>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full sm:w-auto px-8 py-3 rounded-full bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 text-xs font-bold shadow-xs cursor-pointer"
                  >
                    {submitting ? 'Đang cập nhật...' : 'Lưu Thay Đổi'}
                  </button>
                </div>
              </form>
            )}
          </main>
        </div>
      )}
    </ProtectedRoute>
  );
}