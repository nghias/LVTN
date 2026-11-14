'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthService } from '@/services/auth.service';
import { useAlertModal } from '@/components/common/AlertModalProvider';
import {
  saveRememberedCredentials,
  getRememberedCredentials,
  clearRememberedCredentials,
} from '@/utils/rememberMe.util';

interface SupportContactData {
  chuTro: {
    hoTen: string;
    sdt: string;
  } | null;
  danhSachCoSo: Array<{
    maKhu: number | string;
    tenKhu: string;
    tenQuanLy: string;
    sdtQuanLy: string;
  }>;
}

const getApiBaseUrl = () => {
  const raw = (
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
  )
    .trim()
    .replace(/\/+$/, '');
  return raw.endsWith('/api') ? raw : `${raw}/api`;
};

function EyeIcon({ visible }: { visible: boolean }) {
  if (visible) {
    return (
      <svg
        width="20"
        height="20"
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
        />
      </svg>
    );
  }

  return (
    <svg
      width="20"
      height="20"
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
      />
    </svg>
  );
}

export default function LoginForm() {
  const router = useRouter();
  const { showSuccess, showError } = useAlertModal();

  const [tenTK, setTenTK] = useState('');
  const [matKhau, setMatKhau] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [infoPanel, setInfoPanel] = useState<'support' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State lưu thông tin liên hệ lấy từ Database
  const [supportData, setSupportData] = useState<SupportContactData>({
    chuTro: null,
    danhSachCoSo: [],
  });
  const [loadingSupport, setLoadingSupport] = useState(false);

  // 1. Tự động nạp thông tin đã mã hóa nếu còn trong hạn 30 ngày
  useEffect(() => {
    getRememberedCredentials().then((saved) => {
      if (saved) {
        setTenTK(saved.tenTK);
        setMatKhau(saved.matKhau);
        setRememberMe(true);
      }
    });
  }, []);

  // 2. Lấy danh sách Chủ trọ & Quản lý các cơ sở từ Database
  useEffect(() => {
    let isMounted = true;

    const fetchSupportContacts = async () => {
      setLoadingSupport(true);
      const baseUrl = getApiBaseUrl();

      try {
        // Thử gọi endpoint /auth/support-contacts trước, nếu chưa có thì lấy từ /phong-tro/public/home-data
        let res = await fetch(`${baseUrl}/auth/support-contacts`, {
          cache: 'no-store',
        });

        if (!res.ok) {
          res = await fetch(`${baseUrl}/phong-tro/public/home-data`, {
            cache: 'no-store',
          });
        }

        if (!res.ok) return;

        const json = await res.json();
        const payload = json?.data || json || {};

        const rawKhuList: Array<Record<string, unknown>> = Array.isArray(
          payload.khuTroList
        )
          ? payload.khuTroList
          : Array.isArray(payload.danhSachCoSo)
          ? payload.danhSachCoSo
          : Array.isArray(payload.khuTro)
          ? payload.khuTro
          : [];

        const rawTinList: Array<Record<string, unknown>> = Array.isArray(
          payload.tinDangList
        )
          ? payload.tinDangList
          : [];

        // Trích xuất thông tin Chủ trọ từ Database
        const rawChuTro =
          (payload.chuTro as Record<string, unknown>) ||
          (payload.chuTroInfo as Record<string, unknown>) ||
          rawKhuList.find((k) => k.TenChuTro || k.SDTChuTro) ||
          rawTinList.find((t) => t.TenChuTro || t.SDTChuTro) ||
          null;

        const chuTro = rawChuTro
          ? {
              hoTen: String(
                rawChuTro.hoTen ||
                  rawChuTro.TenChuTro ||
                  rawChuTro.HoTen ||
                  'Chủ trọ'
              ).trim(),
              sdt: String(
                rawChuTro.sdt ||
                  rawChuTro.SDTChuTro ||
                  rawChuTro.SDT ||
                  'Đang cập nhật'
              ).trim(),
            }
          : null;

        // Trích xuất danh sách Quản lý theo từng Cơ sở (KhuTro) từ Database
        const danhSachCoSo = rawKhuList.map((khu, idx) => {
          const maKhu = (khu.MaKhu ?? khu.maKhu ?? idx + 1) as number | string;
          const matchingTin = rawTinList.find(
            (t) => Number(t.MaKhu) === Number(maKhu)
          );

          const tenKhu = String(
            khu.TenKhu || khu.tenKhu || `Cơ sở ${idx + 1}`
          ).trim();

          const tenQuanLy = String(
            khu.TenQuanLy ||
              khu.tenQuanLy ||
              khu.HoTen ||
              matchingTin?.TenQuanLy ||
              `Quản lý ${tenKhu}`
          ).trim();

          const sdtQuanLy = String(
            khu.SDTQuanLy ||
              khu.sdtQuanLy ||
              khu.SDT ||
              khu.SoDienThoai ||
              matchingTin?.SDTQuanLy ||
              matchingTin?.SDT ||
              'Đang cập nhật'
          ).trim();

          return {
            maKhu,
            tenKhu,
            tenQuanLy,
            sdtQuanLy,
          };
        });

        if (isMounted) {
          setSupportData({ chuTro, danhSachCoSo });
        }
      } catch (err) {
        console.error('Lỗi khi tải thông tin liên hệ hỗ trợ:', err);
      } finally {
        if (isMounted) {
          setLoadingSupport(false);
        }
      }
    };

    fetchSupportContacts();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setInfoPanel(null);

    const cleanTenTK = tenTK.trim();
    if (!cleanTenTK || !matKhau) {
      showError('Vui lòng nhập đầy đủ tài khoản và mật khẩu!');
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await AuthService.login({
        TenTK: cleanTenTK,
        MatKhau: matKhau,
      });

      const user = response.data?.user;
      if (!user) {
        showError('Không lấy được thông tin tài khoản!');
        return;
      }

      // Xử lý lưu hoặc xóa ghi nhớ mật khẩu 30 ngày (Mã hóa AES-GCM)
      if (rememberMe) {
        await saveRememberedCredentials(cleanTenTK, matKhau);
      } else {
        clearRememberedCredentials();
      }

      const targetUrl =
        user.Quyen === 'ChuTro' || user.Quyen === 'QuanLy'
          ? '/chuTro/thongKe'
          : '/nguoiThue/thongKe';

      showSuccess(
        `Xin chào ${user.HoTen}, đang chuyển vào hệ thống...`,
        'Đăng nhập thành công!',
        1.5,
        () => {
          router.replace(targetUrl);
        }
      );
    } catch (error: unknown) {
      if (error instanceof Error) {
        showError(error.message, 'Đăng nhập thất bại!', 2.5);
      } else {
        showError('Không thể kết nối đến máy chủ, vui lòng thử lại!');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-[960px]">
      <div className="w-full bg-white text-slate-900 rounded-[28px] p-6 sm:p-10 md:p-12 shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-slate-200 grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12">
        {/* CỘT TRÁI: Logo từ /img/logo.png + Tiêu đề lớn */}
        <div className="md:col-span-6 flex flex-col justify-between">
          <div>
            <div className="w-16 h-16 rounded-2xl bg-[#00FFCC]/20 border border-[#00FFCC] p-1.5 flex items-center justify-center mb-6 shadow-xs overflow-hidden">
              <img
                src="/img/logo.png"
                alt="Logo Xóm Trọ"
                className="w-full h-full object-contain"
              />
            </div>

            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900">
              Đăng nhập
            </h1>
            <p className="mt-3 text-base text-slate-600 leading-relaxed">
              Sử dụng Tài khoản{' '}
              <span className="px-2 py-0.5 rounded-md bg-[#00FFCC]/30 text-slate-900 font-bold">
                Xóm Trọ
              </span>{' '}
              của bạn để tiếp tục tới Hệ thống Quản lý Nhà trọ & IoT
            </p>
          </div>

          {/* Hộp thông tin Liên hệ hỗ trợ (Lấy trực tiếp từ Database) */}
          <div className="mt-6">
            {infoPanel === 'support' && (
              <div className="p-4 rounded-2xl bg-[#00FFCC]/15 border border-[#00FFCC] text-xs text-slate-700 leading-relaxed space-y-1.5">
                <div className="flex items-center justify-between font-bold text-slate-900 text-sm mb-1">
                  <span>Hỗ trợ trực tuyến</span>
                  <button
                    type="button"
                    onClick={() => setInfoPanel(null)}
                    className="text-slate-500 hover:text-slate-900 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                {loadingSupport ? (
                  <p className="text-slate-500 italic">
                    Đang tải thông tin liên hệ từ hệ thống...
                  </p>
                ) : supportData.chuTro || supportData.danhSachCoSo.length > 0 ? (
                  <>
                    {supportData.chuTro && (
                      <p>
                        <strong className="text-slate-900">
                          Chủ trọ ({supportData.chuTro.hoTen}):
                        </strong>{' '}
                        {supportData.chuTro.sdt}
                      </p>
                    )}

                    {supportData.danhSachCoSo.map((cs) => (
                      <p key={cs.maKhu}>
                        <strong className="text-slate-900">
                          {cs.tenKhu.toLowerCase().startsWith('quản lý')
                            ? cs.tenKhu
                            : `Quản lý ${cs.tenKhu}`}{' '}
                          ({cs.tenQuanLy}):
                        </strong>{' '}
                        {cs.sdtQuanLy}
                      </p>
                    ))}
                  </>
                ) : (
                  <p className="text-slate-500">
                    Chưa có thông tin liên hệ trong cơ sở dữ liệu.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* CỘT PHẢI: Form nhập liệu */}
        <div className="md:col-span-6 flex flex-col justify-center">
          <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off">
            <div>
              <label
                htmlFor="tenTK"
                className="block text-xs font-bold text-slate-700 mb-1.5 ml-1"
              >
                Email, số điện thoại hoặc tên tài khoản
              </label>
              <input
                id="tenTK"
                type="text"
                value={tenTK}
                onChange={(e) => setTenTK(e.target.value)}
                placeholder="Nhập tài khoản của bạn"
                disabled={isSubmitting}
                className="w-full px-4 py-3.5 bg-white border border-slate-300 rounded-xl text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-[#00FFCC] transition"
              />
            </div>

            <div>
              <label
                htmlFor="matKhau"
                className="block text-xs font-bold text-slate-700 mb-1.5 ml-1"
              >
                Nhập mật khẩu của bạn
              </label>

              {/* Ô nhập mật khẩu kèm nút Icon Con Mắt bên trong */}
              <div className="relative">
                <input
                  id="matKhau"
                  type={showPassword ? 'text' : 'password'}
                  value={matKhau}
                  onChange={(e) => setMatKhau(e.target.value)}
                  placeholder="Nhập mật khẩu"
                  disabled={isSubmitting}
                  className="w-full pl-4 pr-11 py-3.5 bg-white border border-slate-300 rounded-xl text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-[#00FFCC] transition [&::-ms-reveal]:hidden [&::-ms-clear]:hidden"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 transition cursor-pointer"
                >
                  <EyeIcon visible={showPassword} />
                </button>
              </div>

              {/* Hàng tùy chọn: Ghi nhớ mật khẩu + Quên mật khẩu */}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <label className="inline-flex items-center gap-2 text-xs sm:text-sm text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 accent-teal-600 rounded cursor-pointer"
                  />
                  <span>Ghi nhớ mật khẩu</span>
                </label>

                <button
                  type="button"
                  onClick={() => router.push('/taiKhoan/quenMatKhau')}
                  className="text-xs sm:text-sm font-bold text-teal-700 hover:underline cursor-pointer"
                >
                  Bạn quên mật khẩu?
                </button>
              </div>
            </div>

            {/* Cụm nút dưới đáy */}
            <div className="pt-4 flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() =>
                  setInfoPanel(infoPanel === 'support' ? null : 'support')
                }
                className="px-4 py-2.5 rounded-full text-sm font-bold text-slate-700 hover:bg-[#00FFCC]/25 transition cursor-pointer"
              >
                Liên hệ hỗ trợ
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-7 py-2.5 rounded-full bg-[#00FFCC] hover:bg-[#00e6b8] disabled:opacity-50 text-slate-900 font-bold text-xs shadow-sm border border-teal-300 transition cursor-pointer"
              >
                {isSubmitting ? 'Đang xử lý...' : 'Đăng nhập'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Thanh chân Card */}
      <div className="mt-4 px-4 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
        <Link
          href="/"
          className="text-slate-600 hover:text-slate-900 font-semibold transition no-underline"
        >
          ← Quay về Trang chủ
        </Link>

        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={() => setInfoPanel('support')}
            className="hover:text-slate-900 transition cursor-pointer"
          >
            Trợ giúp
          </button>
          <span>Bảo mật</span>
          <span>Điều khoản</span>
        </div>
      </div>
    </div>
  );
}