// client/src/components/common/GlobalLoadingProvider.tsx
'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { usePathname } from 'next/navigation';

function readClientAccessToken(): string | null {
  if (typeof window === 'undefined') return null;

  const storageToken =
    localStorage.getItem('accessToken') ||
    localStorage.getItem('token') ||
    sessionStorage.getItem('accessToken') ||
    sessionStorage.getItem('token');

  if (storageToken && storageToken !== 'undefined' && storageToken !== 'null') {
    return storageToken;
  }

  const match = document.cookie.match(/(?:^|;\s*)accessToken=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

interface GlobalLoadingContextType {
  isLoading: boolean;
  setIsLoading: (loading: boolean, customMessage?: string) => void;
  startLoading: (customMessage?: string) => void;
  stopLoading: () => void;
}

const GlobalLoadingContext = createContext<
  GlobalLoadingContextType | undefined
>(undefined);

export function GlobalLoadingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [manualLoading, setManualLoading] = useState<boolean>(false);
  const [activeRequests, setActiveRequests] = useState<number>(0);
  const [message, setMessage] = useState<string>('Đang xử lý dữ liệu...');
  const [showForceClose, setShowForceClose] = useState<boolean>(false);
  const activeCountRef = useRef<number>(0);

  const isLoading = manualLoading || activeRequests > 0;

  const startLoading = useCallback((customMessage?: string) => {
    if (customMessage) setMessage(customMessage);
    setManualLoading(true);
  }, []);

  const stopLoading = useCallback(() => {
    setManualLoading(false);
    setMessage('Đang xử lý dữ liệu...');
  }, []);

  const setIsLoading = useCallback(
    (loading: boolean, customMessage?: string) => {
      if (loading) {
        if (customMessage) setMessage(customMessage);
        setManualLoading(true);
      } else {
        setManualLoading(false);
        setMessage('Đang xử lý dữ liệu...');
      }
    },
    []
  );

  useEffect(() => {
    activeCountRef.current = 0;
    setActiveRequests(0);
    setManualLoading(false);
    setShowForceClose(false);
    setMessage('Đang xử lý dữ liệu...');
  }, [pathname]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (isLoading) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isLoading]);

  // Đánh chặn fetch: luôn đính kèm Bearer Token, nhưng KHÔNG bật Loading với các request kiểm tra ngầm
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const originalFetch = window.fetch.bind(window);

    window.fetch = async (
      input: RequestInfo | URL,
      init?: RequestInit
    ): Promise<Response> => {
      const urlString =
        typeof input === 'string'
          ? input
          : input instanceof URL
          ? input.toString()
          : input.url || '';

      const isNextInternal =
        urlString.includes('/_next/') ||
        urlString.includes('?_rsc=') ||
        urlString.includes('&__nextjs');

      const isApiCall =
        !isNextInternal &&
        (urlString.includes('/api/') ||
          urlString.includes('onrender.com') ||
          urlString.includes('localhost:5000'));

      // Kiểm tra xem có phải request chạy ngầm (polling PayOS, tạo QR ngầm) hay không
      const reqHeaders = new Headers(init?.headers || {});
      const isSilentRequest =
        reqHeaders.get('x-silent-fetch') === '1' ||
        urlString.includes('/kiem-tra-payos/') ||
        urlString.includes('/tao-link-payos');

      let modifiedInit = init;
      const shouldTrackLoading = isApiCall && !isSilentRequest;

      if (isApiCall) {
        const token = readClientAccessToken();
        if (token && !reqHeaders.has('Authorization')) {
          reqHeaders.set('Authorization', `Bearer ${token}`);
        }
        modifiedInit = {
          ...init,
          headers: reqHeaders,
        };

        if (shouldTrackLoading) {
          activeCountRef.current += 1;
          setActiveRequests(activeCountRef.current);
        }
      }

      try {
        return await originalFetch(input, modifiedInit);
      } finally {
        if (shouldTrackLoading) {
          activeCountRef.current = Math.max(0, activeCountRef.current - 1);
          setActiveRequests(activeCountRef.current);
        }
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  useEffect(() => {
    if (!isLoading) {
      setShowForceClose(false);
      return;
    }

    const slowTimer = setTimeout(() => {
      setShowForceClose(true);
    }, 8000);

    const safetyTimer = setTimeout(() => {
      activeCountRef.current = 0;
      setActiveRequests(0);
      setManualLoading(false);
      setShowForceClose(false);
    }, 30000);

    return () => {
      clearTimeout(slowTimer);
      clearTimeout(safetyTimer);
    };
  }, [isLoading]);

  return (
    <GlobalLoadingContext.Provider
      value={{ isLoading, setIsLoading, startLoading, stopLoading }}
    >
      {children}

      {isLoading && (
        <div
          role="dialog"
          aria-modal="true"
          aria-busy="true"
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/45 backdrop-blur-[2px] select-none cursor-wait pointer-events-auto"
        >
          <div className="w-full max-w-xs sm:max-w-sm mx-4 bg-white text-slate-900 rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="w-full h-1.5 bg-[#00FFCC] relative overflow-hidden">
              <div className="absolute inset-0 bg-white/60 animate-pulse" />
            </div>

            <div className="p-6 sm:p-7 flex flex-col items-center text-center">
              <div className="relative w-16 h-16 flex items-center justify-center mb-4">
                <div className="absolute inset-0 rounded-full border-4 border-slate-100 border-t-[#00FFCC] border-r-[#00FFCC] animate-spin" />
                <div className="w-10 h-10 rounded-full bg-[#00FFCC]/20 border border-[#00FFCC]/50 flex items-center justify-center text-teal-800">
                  <svg
                    width="20"
                    height="20"
                    className="w-5 h-5 animate-pulse"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.2}
                      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                    />
                  </svg>
                </div>
              </div>

              <h3 className="text-base font-bold text-slate-900">{message}</h3>
              <p className="text-xs font-medium text-slate-500 mt-1.5 leading-relaxed">
                Hệ thống đang đồng bộ với máy chủ, vui lòng chờ trong giây lát...
              </p>

              {showForceClose && (
                <button
                  type="button"
                  onClick={() => {
                    activeCountRef.current = 0;
                    setActiveRequests(0);
                    setManualLoading(false);
                    setShowForceClose(false);
                  }}
                  className="mt-4 px-4 py-1.5 rounded-full border border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-600 transition cursor-pointer"
                >
                  Máy chủ phản hồi chậm — Nhấn để ẩn chờ
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </GlobalLoadingContext.Provider>
  );
}

export function useGlobalLoading() {
  const context = useContext(GlobalLoadingContext);
  if (!context) {
    throw new Error(
      'useGlobalLoading phải được sử dụng bên trong GlobalLoadingProvider'
    );
  }
  return context;
}