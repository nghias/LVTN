// src/components/home/ContactRoomModal.tsx
"use client";

import {
  Building2,
  X,
  Banknote,
  User,
  Phone,
  PhoneCall,
  Copy,
  AlertCircle,
  UserCheck,
  MessageCircle,
} from "lucide-react";
import {
  TinDangItem,
  KhuTroWithContact,
  extractManagerContact,
  extractOwnerContact,
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
  const ownerContact = extractOwnerContact(contactRoom, khuTroList);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header Modal */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3.5">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold bg-[#00FFCC] text-slate-900 mb-1">
              <Building2 className="w-3 h-3 shrink-0" />
              <span>{contactRoom.TenKhu}</span>
            </span>
            <h3 className="text-lg font-bold text-slate-900">
              Liên Hệ Thuê Phòng {contactRoom.TenPhong}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng cửa sổ liên hệ"
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer shrink-0 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Khối 1: Giá thuê & Quản lý cơ sở */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 text-slate-500 font-medium">
              <Banknote className="w-3.5 h-3.5 text-teal-600 shrink-0" />
              <span>Giá thuê:</span>
            </span>
            <span className="font-bold text-teal-700 text-right">
              {formatVND(contactRoom.Gia)} / tháng ({contactRoom.DienTich} m²)
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 text-slate-500 font-medium">
              <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>Người quản lý:</span>
            </span>
            <span className="font-bold text-slate-900 text-right">
              {selectedRoomContact.tenQuanLy}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 text-slate-500 font-medium">
              <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>Số điện thoại / Zalo:</span>
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
            {/* Nút Zalo chuẩn tông màu xanh Zalo (#0068FF) */}
            <a
              href={selectedRoomContact.zaloUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 px-4 rounded-xl bg-[#0068FF] hover:bg-[#0052CC] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm shadow-[#0068FF]/25 transition no-underline"
            >
              <MessageCircle className="w-4 h-4 shrink-0" />
              <span className="px-1.5 py-0.5 rounded bg-white text-[#0068FF] text-[10px] font-bold leading-none">
                Zalo
              </span>
              <span>
                Nhắn tin qua Zalo ({selectedRoomContact.sdtHienThi})
              </span>
            </a>

            <div className="grid grid-cols-2 gap-2.5">
              <a
                href={selectedRoomContact.telUrl}
                className="py-2.5 px-4 rounded-xl bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 border border-teal-300 font-bold text-xs flex items-center justify-center gap-1.5 transition no-underline"
              >
                <PhoneCall className="w-3.5 h-3.5 shrink-0" />
                <span>Gọi điện ngay</span>
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
                <Copy className="w-3.5 h-3.5 shrink-0" />
                <span>Sao chép SĐT</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              Số điện thoại của người quản lý khu trọ này chưa được cập nhật
              trên cơ sở dữ liệu.
            </span>
          </div>
        )}

        {/* Khối 2: Thông tin liên hệ Chủ trọ */}
        <div className="p-4 rounded-2xl bg-[#00FFCC]/15 border border-teal-300 space-y-2.5">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 text-slate-600 font-medium">
              <UserCheck className="w-3.5 h-3.5 text-teal-700 shrink-0" />
              <span>Chủ trọ:</span>
            </span>
            <span className="font-bold text-slate-900 text-right">
              {ownerContact.tenChuTro}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 text-slate-600 font-medium">
              <Phone className="w-3.5 h-3.5 text-teal-700 shrink-0" />
              <span>SĐT / Zalo Chủ trọ:</span>
            </span>
            <span className="font-bold text-slate-900 bg-white border border-teal-200 px-2.5 py-0.5 rounded-lg">
              {ownerContact.hasPhoneFromDB
                ? ownerContact.sdtHienThi
                : "Đang cập nhật"}
            </span>
          </div>

          {ownerContact.hasPhoneFromDB && (
            <div className="grid grid-cols-3 gap-2 pt-1">
              <a
                href={ownerContact.zaloUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2 px-2 rounded-xl bg-[#0068FF] hover:bg-[#0052CC] text-white font-bold text-[11px] flex items-center justify-center gap-1 shadow-2xs transition no-underline"
              >
                <span className="px-1 py-0.5 rounded bg-white text-[#0068FF] text-[9px] font-bold leading-none">
                  Zalo
                </span>
                <span>Chủ trọ</span>
              </a>

              <a
                href={ownerContact.telUrl}
                className="py-2 px-2 rounded-xl bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 border border-teal-300 font-bold text-[11px] flex items-center justify-center gap-1 transition no-underline"
              >
                <PhoneCall className="w-3 h-3 shrink-0" />
                <span>Gọi Chủ trọ</span>
              </a>

              <button
                type="button"
                onClick={() =>
                  onCopyPhone(
                    ownerContact.cleanPhone,
                    `Chủ trọ ${ownerContact.tenChuTro}`
                  )
                }
                className="py-2 px-2 rounded-xl bg-white hover:bg-slate-100 text-slate-900 border border-slate-200 font-bold text-[11px] flex items-center justify-center gap-1 transition cursor-pointer"
              >
                <Copy className="w-3 h-3 shrink-0" />
                <span>Chép SĐT</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}