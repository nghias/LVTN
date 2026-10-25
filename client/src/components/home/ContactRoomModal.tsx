// src/components/home/ContactRoomModal.tsx
"use client";

import {
  TinDangItem,
  KhuTroWithContact,
  extractManagerContact,
  formatVND,
} from "./home.data";

interface ContactRoomModalProps {
  contactRoom: TinDangItem | null;
  khuTroList: KhuTroWithContact[];
  onClose: () => void;
  onCopyPhone: (phone: string, tenQuanLy: string) => void;
}

export default function ContactRoomModal({
  contactRoom,
  khuTroList,
  onClose,
  onCopyPhone,
}: ContactRoomModalProps) {
  if (!contactRoom) return null;

  const selectedRoomContact = extractManagerContact(contactRoom, khuTroList);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#00FFCC] text-slate-900 mb-1">
              {contactRoom.TenKhu}
            </span>
            <h3 className="text-lg font-bold text-slate-900">
              Liên Hệ Thuê Phòng {contactRoom.TenPhong}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs flex items-center justify-center cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Giá thuê:</span>
            <span className="font-bold text-teal-700">
              {formatVND(contactRoom.Gia)} / tháng ({contactRoom.DienTich} m²)
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Người quản lý:</span>
            <span className="font-bold text-slate-900">
              {selectedRoomContact.tenQuanLy}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">
              Số điện thoại / Zalo:
            </span>
            <span className="font-bold text-slate-900 bg-[#00FFCC]/40 px-2.5 py-0.5 rounded-lg">
              {selectedRoomContact.hasPhoneFromDB
                ? selectedRoomContact.sdtHienThi
                : "Chưa cập nhật trong CSDL"}
            </span>
          </div>
        </div>

        {selectedRoomContact.hasPhoneFromDB ? (
          <div className="space-y-2.5">
            <a
              href={selectedRoomContact.zaloUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-[#00FFCC] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition"
            >
              <span>
                💬 Nhắn tin qua Zalo ({selectedRoomContact.sdtHienThi})
              </span>
            </a>

            <div className="grid grid-cols-2 gap-2.5">
              <a
                href={selectedRoomContact.telUrl}
                className="py-2.5 px-4 rounded-xl bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 border border-teal-300 font-bold text-xs flex items-center justify-center gap-1.5 transition"
              >
                <span>📞 Gọi điện ngay</span>
              </a>

              <button
                type="button"
                onClick={() =>
                  onCopyPhone(
                    selectedRoomContact.cleanPhone,
                    selectedRoomContact.tenQuanLy
                  )
                }
                className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <span>📋 Sao chép SĐT</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
            Số điện thoại của người quản lý khu trọ này chưa được cập nhật trên
            cơ sở dữ liệu. Vui lòng kiểm tra cột <strong>SDT</strong> trong bảng{" "}
            <strong>NguoiDung / KhuTro</strong>.
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition cursor-pointer"
        >
          Đóng cửa sổ
        </button>
      </div>
    </div>
  );
}