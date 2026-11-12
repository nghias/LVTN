// src/components/home/AiChatbotWidget.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { GiaDienNuocHome } from "@/services/home.service";
import { aiChatService } from "@/services/aiChat.service";
import {
  ChatMessage,
  TinDangItem,
  KhuTroWithContact,
  GOI_Y_CAU_HOI_AI,
  formatVND,
} from "./home.data";

interface AiChatbotWidgetProps {
  isOpen: boolean;
  onToggleOpen: () => void;
  onClose: () => void;
  tinDangList: TinDangItem[];
  khuTroList: KhuTroWithContact[];
  giaDienNuoc: GiaDienNuocHome;
  onSelectContactRoom?: (room: TinDangItem) => void;
}

export default function AiChatbotWidget({
  isOpen,
  onToggleOpen,
  onClose,
  tinDangList,
  onSelectContactRoom,
}: AiChatbotWidgetProps) {
  const [chatInput, setChatInput] = useState<string>("");
  const [isAiTyping, setIsAiTyping] = useState<boolean>(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-ai",
      sender: "ai",
      text: "Xin chào! Tôi là Trợ lý ảo AI của hệ thống Xóm Trọ (ứng dụng Gemini 2.5 Flash). Bạn cần tìm phòng trống theo mức giá, tiện ích, hỏi giá điện nước IoT hay thông tin liên hệ quản lý cơ sở & chủ trọ?",
      time: "Bây giờ",
    },
  ]);

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, isOpen, isAiTyping]);

  const handleClickRoomButton = (roomFromAi: TinDangItem) => {
    const matchedInHome = tinDangList.find(
      (t) =>
        Number(t.MaPhong) === Number(roomFromAi.MaPhong) ||
        Number(t.MaTin) === Number(roomFromAi.MaTin)
    );

    const targetRoom: TinDangItem = {
      ...(matchedInHome || roomFromAi),
      TenQuanLy:
        roomFromAi.TenQuanLy || matchedInHome?.TenQuanLy || roomFromAi.TenChuTro,
      SDTQuanLy:
        roomFromAi.SDTQuanLy || matchedInHome?.SDTQuanLy || roomFromAi.SDTChuTro,
      TenChuTro: roomFromAi.TenChuTro || matchedInHome?.TenChuTro,
      SDTChuTro: roomFromAi.SDTChuTro || matchedInHome?.SDTChuTro,
    };

    if (onSelectContactRoom) {
      onSelectContactRoom(targetRoom);
    }
  };

  const handleSendAiMessage = async (customQuestion?: string) => {
    const content = (customQuestion ?? chatInput).trim();
    if (!content || isAiTyping) return;

    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes()
    ).padStart(2, "0")}`;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: content,
      time: currentTime,
    };

    const historyForApi = chatMessages.map((m) => ({
      sender: m.sender,
      text: m.text,
    }));

    setChatMessages((prev) => [...prev, userMsg]);
    if (!customQuestion) setChatInput("");
    setIsAiTyping(true);

    try {
      const res = await aiChatService.sendMessage(content, historyForApi);

      const aiReplyText =
        res?.success && res?.data?.reply
          ? res.data.reply
          : res?.message ||
            "Hiện tại hệ thống tư vấn đang bận, bạn vui lòng thử lại sau giây lát nhé!";

      const suggestedRooms =
        res?.success && Array.isArray(res?.data?.suggestedRooms)
          ? res.data.suggestedRooms
          : [];

      const replyDate = new Date();
      const replyTime = `${String(replyDate.getHours()).padStart(
        2,
        "0"
      )}:${String(replyDate.getMinutes()).padStart(2, "0")}`;

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: "ai",
        text: aiReplyText,
        time: replyTime,
        suggestedRooms,
      };

      setChatMessages((prev) => [...prev, aiMsg]);
    } catch (error) {
      console.error("Lỗi khi gọi AI Chatbot:", error);
      const errDate = new Date();
      const errTime = `${String(errDate.getHours()).padStart(2, "0")}:${String(
        errDate.getMinutes()
      ).padStart(2, "0")}`;

      const errorMsg: ChatMessage = {
        id: `ai-err-${Date.now()}`,
        sender: "ai",
        text: "Không thể kết nối tới máy chủ AI. Bạn vui lòng kiểm tra lại kết nối hoặc bấm trực tiếp vào thẻ phòng trên trang chủ để liên hệ quản lý nhé!",
        time: errTime,
      };
      setChatMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsAiTyping(false);
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end">
      {isOpen && (
        <div className="mb-3 w-85 sm:w-96 bg-white border-2 border-[#00FFCC] rounded-3xl shadow-2xl overflow-hidden flex flex-col">
          {/* Header Chatbox đồng bộ tông màu #00FFCC */}
          <div className="bg-[#00FFCC] text-slate-900 px-5 py-4 flex items-center justify-between gap-3 border-b border-teal-300">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-white text-slate-900 border border-teal-300 font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                AI
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                    Trợ Lý Ảo AI Nhà Trọ
                  </h3>
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                </div>
                <p className="text-[11px] font-medium text-slate-700">
                  Gemini 2.5 Flash • Dữ liệu phòng thực tế 24/7
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-white/80 hover:bg-white text-slate-800 border border-teal-300 text-xs font-bold flex items-center justify-center transition cursor-pointer"
              title="Thu gọn hộp thoại"
            >
              ✕
            </button>
          </div>

          {/* Danh sách tin nhắn */}
          <div className="p-4 h-88 overflow-y-auto bg-slate-50/70 space-y-3">
            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.sender === "user" ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-line ${
                    msg.sender === "user"
                      ? "bg-[#00FFCC] text-slate-900 font-semibold border border-teal-300 rounded-br-xs shadow-2xs"
                      : "bg-white text-slate-800 border border-slate-200 shadow-2xs rounded-bl-xs"
                  }`}
                >
                  {msg.text}

                  {/* Danh sách nút bấm mở Modal liên hệ ngay trong tin nhắn AI */}
                  {msg.sender === "ai" &&
                    msg.suggestedRooms &&
                    msg.suggestedRooms.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-col gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700">
                          Phòng trống gợi ý (Bấm để liên hệ Zalo/SĐT):
                        </span>
                        {msg.suggestedRooms.map((room) => (
                          <button
                            key={`${msg.id}-room-${room.MaPhong}`}
                            type="button"
                            onClick={() => handleClickRoomButton(room)}
                            className="w-full text-left px-3 py-2 rounded-2xl bg-[#00FFCC]/25 hover:bg-[#00FFCC]/50 text-slate-900 border border-teal-300 transition flex items-center justify-between gap-2 cursor-pointer group"
                          >
                            <div className="min-w-0">
                              <div className="text-[11px] font-bold text-slate-900 truncate">
                                Liên hệ / Xem phòng {room.TenPhong}
                              </div>
                              <div className="text-[10px] font-medium text-slate-600 truncate">
                                {room.TenKhu} • {formatVND(room.Gia)}/tháng (
                                {room.DienTich}m²)
                              </div>
                            </div>
                            <span className="px-2.5 py-1 rounded-full bg-[#00FFCC] group-hover:bg-[#00e6b8] text-slate-900 border border-teal-300 text-[10px] font-bold shrink-0 transition">
                              Mở liên hệ →
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                </div>

                <span className="text-[10px] text-slate-400 mt-1 px-1">
                  {msg.time}
                </span>
              </div>
            ))}

            {isAiTyping && (
              <div className="flex items-start">
                <div className="bg-white border border-teal-200 rounded-2xl rounded-bl-xs px-3.5 py-2 text-xs text-slate-600 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#00FFCC] animate-ping" />
                  AI đang tra cứu phòng trống & tổng hợp câu trả lời...
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Các câu hỏi gợi ý nhanh */}
          <div className="px-3.5 py-2 bg-white border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto">
            {GOI_Y_CAU_HOI_AI.map((q) => (
              <button
                key={q}
                type="button"
                disabled={isAiTyping}
                onClick={() => handleSendAiMessage(q)}
                className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#00FFCC]/20 hover:bg-[#00FFCC] disabled:opacity-50 text-slate-900 border border-teal-200 whitespace-nowrap transition cursor-pointer shrink-0"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Ô nhập câu hỏi */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendAiMessage();
            }}
            className="p-3 bg-white border-t border-slate-200 flex items-center gap-2"
          >
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Hỏi phòng trống, tiện ích, giá điện nước..."
              className="flex-1 px-3.5 py-2 text-xs rounded-full border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-400 text-slate-900"
            />
            <button
              type="submit"
              disabled={!chatInput.trim() || isAiTyping}
              className="px-4 py-2 rounded-full bg-[#00FFCC] hover:bg-[#00e6b8] disabled:opacity-50 text-slate-900 border border-teal-300 text-xs font-bold transition cursor-pointer shrink-0"
            >
              Gửi
            </button>
          </form>
        </div>
      )}

      {/* Nút mở/đóng AI Chatbot đồng bộ màu #00FFCC giống nút "Tìm phòng trống" */}
      <button
        type="button"
        onClick={onToggleOpen}
        className="flex items-center gap-2.5 px-5 py-3 rounded-full bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 border border-teal-300 shadow-lg shadow-[#00FFCC]/30 transition cursor-pointer"
      >
        <span className="w-7 h-7 rounded-full bg-white text-slate-900 border border-teal-300 font-bold text-xs flex items-center justify-center shadow-2xs">
          AI
        </span>
        <span className="text-xs sm:text-sm font-bold text-slate-900 pr-1">
          {isOpen ? "Đóng Trợ lý AI" : "Chat tư vấn AI 24/7"}
        </span>
      </button>
    </div>
  );
}