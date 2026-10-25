// src/components/home/AiChatbotWidget.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { GiaDienNuocHome } from "@/services/home.service";
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
}

export default function AiChatbotWidget({
  isOpen,
  onToggleOpen,
  onClose,
  tinDangList,
  khuTroList,
  giaDienNuoc,
}: AiChatbotWidgetProps) {
  const [chatInput, setChatInput] = useState<string>("");
  const [isAiTyping, setIsAiTyping] = useState<boolean>(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-ai",
      sender: "ai",
      text: "Xin chào! Tôi là Trợ lý ảo AI của hệ thống nhà trọ. Bạn cần tìm phòng trống theo mức giá, hỏi về đơn giá điện nước IoT hay thông tin liên hệ quản lý khu trọ?",
      time: "Bây giờ",
    },
  ]);

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, isOpen, isAiTyping]);

  const handleSendAiMessage = async (customQuestion?: string) => {
    const content = (customQuestion ?? chatInput).trim();
    if (!content || isAiTyping) return;

    const currentTime = new Date().toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: content,
      time: currentTime,
    };

    setChatMessages((prev) => [...prev, userMsg]);
    if (!customQuestion) setChatInput("");
    setIsAiTyping(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 600));

      const lower = content.toLowerCase();
      let aiReplyText =
        "Cảm ơn bạn đã nhắn tin! Hệ thống AI đang ghi nhận câu hỏi của bạn. Bạn có thể dùng bộ lọc phía trên hoặc bấm vào nút 'Liên hệ thuê phòng' để chat Zalo trực tiếp với quản lý khu trọ.";

      if (lower.includes("phòng") || lower.includes("trống")) {
        aiReplyText =
          tinDangList.length > 0
            ? `Hiện hệ thống đang mở cho thuê ${tinDangList.length} phòng thuộc ${
                khuTroList.length || "các"
              } cơ sở. Giá thuê dao động từ ${formatVND(
                Math.min(...tinDangList.map((t) => Number(t.Gia) || 0))
              )}/tháng. Bạn có thể bấm chọn cơ sở ở bộ lọc để xem chi tiết!`
            : "Hiện tại các phòng trên hệ thống đều đã kín hoặc đang cập nhật. Bạn vui lòng liên hệ trực tiếp quản lý khu trọ để được báo khi có phòng trống nhé!";
      } else if (
        lower.includes("điện") ||
        lower.includes("nước") ||
        lower.includes("giá")
      ) {
        aiReplyText = `Đơn giá niêm yết hiện tại: Điện ${formatVND(
          giaDienNuoc.GiaDien
        )}/kWh và Nước ${formatVND(
          giaDienNuoc.GiaNuoc
        )}/m³. Chỉ số được thu thập tự động qua đồng hồ IoT riêng từng phòng, minh bạch 100%.`;
      } else if (
        lower.includes("zalo") ||
        lower.includes("liên hệ") ||
        lower.includes("số điện thoại")
      ) {
        aiReplyText =
          "Ở mỗi thẻ phòng trọ đều có nút 'Liên hệ thuê phòng'. Khi bấm vào, bạn có thể chọn 'Nhắn qua Zalo' hoặc 'Gọi điện trực tiếp' tới đúng số điện thoại của người quản lý khu trọ đó.";
      }

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: "ai",
        text: aiReplyText,
        time: new Date().toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      setChatMessages((prev) => [...prev, aiMsg]);
    } catch (error) {
      console.error("Lỗi khi gọi AI Chatbot:", error);
    } finally {
      setIsAiTyping(false);
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end">
      {isOpen && (
        <div className="mb-3 w-85 sm:w-95 bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
          <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-[#00FFCC] text-slate-900 font-bold text-xs flex items-center justify-center shrink-0">
                AI
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs sm:text-sm font-bold text-white">
                    Trợ Lý Ảo AI Nhà Trọ
                  </h3>
                  <span className="w-2 h-2 rounded-full bg-[#00FFCC] animate-pulse" />
                </div>
                <p className="text-[11px] text-slate-300">
                  Tư vấn phòng trống, quy định & chi phí 24/7
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center justify-center cursor-pointer"
              title="Thu gọn hộp thoại"
            >
              ✕
            </button>
          </div>

          <div className="p-4 h-80 overflow-y-auto bg-slate-50/80 space-y-3">
            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.sender === "user" ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                    msg.sender === "user"
                      ? "bg-slate-900 text-[#00FFCC] font-medium rounded-br-xs"
                      : "bg-white text-slate-800 border border-slate-200 shadow-2xs rounded-bl-xs"
                  }`}
                >
                  {msg.text}
                </div>
                <span className="text-[10px] text-slate-400 mt-1 px-1">
                  {msg.time}
                </span>
              </div>
            ))}

            {isAiTyping && (
              <div className="flex items-start">
                <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-xs px-3.5 py-2 text-xs text-slate-500">
                  AI đang soạn câu trả lời...
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          <div className="px-3.5 py-2 bg-white border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto">
            {GOI_Y_CAU_HOI_AI.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => handleSendAiMessage(q)}
                className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 hover:bg-[#00FFCC]/40 text-slate-700 whitespace-nowrap transition cursor-pointer shrink-0"
              >
                {q}
              </button>
            ))}
          </div>

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
              placeholder="Nhập câu hỏi cần AI tư vấn..."
              className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-500 text-slate-900"
            />
            <button
              type="submit"
              disabled={!chatInput.trim() || isAiTyping}
              className="px-4 py-2 rounded-xl bg-[#00FFCC] hover:bg-[#00e6b8] disabled:opacity-50 text-slate-900 border border-teal-300 text-xs font-bold transition cursor-pointer shrink-0"
            >
              Gửi
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={onToggleOpen}
        className="flex items-center gap-2.5 px-4 py-3 rounded-full bg-slate-900 hover:bg-slate-800 text-white border-2 border-[#00FFCC] shadow-xl transition cursor-pointer"
      >
        <span className="w-7 h-7 rounded-full bg-[#00FFCC] text-slate-900 font-bold text-xs flex items-center justify-center">
          AI
        </span>
        <span className="text-xs font-bold text-[#00FFCC] pr-1">
          {isOpen ? "Đóng Trợ lý AI" : "Chat tư vấn AI 24/7"}
        </span>
      </button>
    </div>
  );
}