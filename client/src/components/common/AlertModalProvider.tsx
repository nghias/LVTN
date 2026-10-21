'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

export type ModalType = 'success' | 'error' | 'confirm';

interface ModalOptions {
  type: ModalType;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
  duration?: number; // Số giây tự tắt cho success/error (Mặc định: 2 giây)
  onConfirm?: () => void;
}

interface AlertModalContextProps {
  showModal: (options: ModalOptions) => void;
  showSuccess: (
    message: string,
    title?: string,
    duration?: number,
    onConfirm?: () => void
  ) => void;
  showError: (message: string, title?: string, duration?: number) => void;
  showConfirm: (
    message: string,
    title?: string,
    onConfirm?: () => void,
    confirmText?: string,
    cancelText?: string
  ) => void;
  closeModal: () => void;
}

const AlertModalContext = createContext<AlertModalContextProps | undefined>(undefined);

export function AlertModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [progress, setProgress] = useState(100);
  const [config, setConfig] = useState<ModalOptions>({
    type: 'success',
    title: '',
    message: '',
    duration: 2,
  });

  const closeModal = useCallback(() => {
    setIsOpen(false);
  }, []);

  const showModal = useCallback((options: ModalOptions) => {
    const isConfirmModal = options.type === 'confirm';
    const finalDuration = isConfirmModal
      ? 0
      : options.duration !== undefined
      ? options.duration
      : 2;

    setConfig({
      ...options,
      duration: finalDuration,
    });
    setProgress(100);
    setIsOpen(true);
  }, []);

  // 1. Modal Thành công: Màu xanh lá, mặc định 2 giây tự tắt
  const showSuccess = useCallback(
    (
      message: string,
      title = 'Thao tác thành công!',
      duration = 2,
      onConfirm?: () => void
    ) => {
      showModal({
        type: 'success',
        title,
        message,
        confirmText: 'Đóng',
        showCancel: false,
        duration,
        onConfirm,
      });
    },
    [showModal]
  );

  // 2. Modal Thất bại: Màu đỏ, mặc định 2 giây tự tắt
  const showError = useCallback(
    (message: string, title = 'Đã xảy ra lỗi!', duration = 2) => {
      showModal({
        type: 'error',
        title,
        message,
        confirmText: 'Đã hiểu',
        showCancel: false,
        duration,
      });
    },
    [showModal]
  );

  // 3. Modal Xác nhận mới: Màu chủ đạo #00FFCC, có 2 nút Hủy & Xác nhận, KHÔNG đếm ngược
  const showConfirm = useCallback(
    (
      message: string,
      title = 'Xác nhận thực hiện',
      onConfirm?: () => void,
      confirmText = 'Xác nhận',
      cancelText = 'Hủy'
    ) => {
      showModal({
        type: 'confirm',
        title,
        message,
        confirmText,
        cancelText,
        showCancel: true,
        duration: 0, // Không đếm ngược
        onConfirm,
      });
    },
    [showModal]
  );

  const handleConfirm = useCallback(() => {
    setIsOpen(false);
    if (config.onConfirm) {
      config.onConfirm();
    }
  }, [config]);

  // Xử lý thanh Loading tự tắt cho Modal Thành công & Thất bại
  useEffect(() => {
    if (!isOpen || config.type === 'confirm') return;

    const seconds = config.duration !== undefined ? config.duration : 2;
    if (seconds <= 0) return;

    const animTimer = setTimeout(() => {
      setProgress(0);
    }, 20);

    const closeTimer = setTimeout(() => {
      setIsOpen(false);
      if (config.onConfirm) {
        config.onConfirm();
      }
    }, seconds * 1000);

    return () => {
      clearTimeout(animTimer);
      clearTimeout(closeTimer);
    };
  }, [isOpen, config]);

  const themeStyles = {
    success: {
      iconBg: 'bg-emerald-100 text-emerald-600 border border-emerald-200',
      btnBg: 'bg-emerald-600 hover:bg-emerald-700 text-white',
      barColor: 'bg-emerald-500',
      topBorder: 'border-t-4 border-emerald-500',
    },
    error: {
      iconBg: 'bg-red-100 text-red-600 border border-red-200',
      btnBg: 'bg-red-600 hover:bg-red-700 text-white',
      barColor: 'bg-red-500',
      topBorder: 'border-t-4 border-red-500',
    },
    confirm: {
      iconBg: 'bg-[#00FFCC]/25 text-teal-900 border border-[#00FFCC]',
      btnBg: 'bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900',
      barColor: 'bg-[#00FFCC]',
      topBorder: 'border-t-4 border-[#00FFCC]',
    },
  }[config.type];

  const durationSec = config.duration !== undefined ? config.duration : 2;

  return (
    <AlertModalContext.Provider
      value={{
        showModal,
        showSuccess,
        showError,
        showConfirm,
        closeModal,
      }}
    >
      {children}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div
            className={`w-full max-w-md bg-white text-slate-900 rounded-3xl shadow-2xl border ${themeStyles.topBorder} border-slate-200 overflow-hidden relative`}
          >
            <div className="p-6 text-center">
              {/* Icon trạng thái */}
              <div
                className={`mx-auto mb-4 w-14 h-14 rounded-full flex items-center justify-center ${themeStyles.iconBg}`}
              >
                {config.type === 'success' && (
                  <svg width="28" height="28" className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {config.type === 'error' && (
                  <svg width="28" height="28" className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
                {config.type === 'confirm' && (
                  <svg width="28" height="28" className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>

              {/* Tiêu đề & Nội dung */}
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                {config.title}
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                {config.message}
              </p>

              {/* Cụm nút bấm */}
              <div className="mt-6 flex items-center justify-center gap-3">
                {config.showCancel && (
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 py-2.5 px-4 rounded-full border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-sm font-bold transition cursor-pointer"
                  >
                    {config.cancelText || 'Hủy'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleConfirm}
                  className={`flex-1 py-2.5 px-4 rounded-full text-sm font-bold shadow-sm transition cursor-pointer ${themeStyles.btnBg}`}
                >
                  {config.confirmText || 'Xác nhận'}
                </button>
              </div>
            </div>

            {/* Thanh Loading đếm ngược (Chỉ hiện cho Thành công & Thất bại) */}
            {config.type !== 'confirm' && durationSec > 0 && (
              <div className="w-full h-1.5 bg-slate-100 overflow-hidden">
                <div
                  className={`h-full ${themeStyles.barColor}`}
                  style={{
                    width: `${progress}%`,
                    transition:
                      progress === 100
                        ? 'none'
                        : `width ${durationSec}s linear`,
                  }}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </AlertModalContext.Provider>
  );
}

export function useAlertModal() {
  const context = useContext(AlertModalContext);
  if (!context) {
    throw new Error('useAlertModal phải được dùng bên trong AlertModalProvider');
  }
  return context;
}