// src/components/home/AiChatbotWidget.tsx
"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { GiaDienNuocHome } from "@/services/home.service";
import { aiChatService } from "@/services/aiChat.service";
import {
  ChatMessage,
  TinDangItem,
  KhuTroWithContact,
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
  khuTroList,
}: AiChatbotWidgetProps) {
  const router = useRouter();
  const [chatInput, setChatInput] = useState<string>("");
  const [isAiTyping, setIsAiTyping] = useState<boolean>(false);
  const [questionPage, setQuestionPage] = useState<number>(0);
  const [aiDynamicQuestions, setAiDynamicQuestions] = useState<string[]>([]);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-ai",
      sender: "ai",
      text: "Xin chào! Tôi là Trợ lý ảo AI của hệ thống Xóm Trọ (ứng dụng Gemini 2.5 Flash). Bạn cần tìm phòng trống theo mức giá, hỏi chi tiết tiện ích đi kèm, bảng phí dịch vụ hàng tháng hay đơn giá điện nước IoT?",
      time: "Bây giờ",
    },
  ]);

  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const questionScrollRef = useRef<HTMLDivElement | null>(null);

  // Tự động tạo ngân hàng câu hỏi động dựa trên dữ liệu thực tế đang có trên hệ thống
  const questionPool = useMemo(() => {
    const pool: string[] = [
      "Hiện có những phòng nào đang trống?",
      "Các tiện ích đi kèm trong phòng gồm những gì?",
      "Bảng phí dịch vụ (Wifi, rác, giữ xe) tính thế nào?",
      "Đơn giá điện nước IoT tính như thế nào?",
      "Phòng nào hiện có Máy lạnh và Gác lửng?",
    ];

    if (tinDangList.length > 0) {
      const firstRoom = tinDangList[0];
      pool.push(`Phòng ${firstRoom.TenPhong} có những tiện ích gì?`);

      const minPrice = Math.min(...tinDangList.map((t) => Number(t.Gia) || 0));
      if (minPrice > 0) {
        pool.push(`Tìm phòng trống giá khoảng ${formatVND(minPrice)}?`);
      }

      if (tinDangList.length >= 2) {
        pool.push(
          `So sánh phòng ${tinDangList[0].TenPhong} và ${tinDangList[1].TenPhong}?`
        );
      }
    }

    if (khuTroList.length > 0) {
      const firstKhu = khuTroList[0];
      pool.push(`Ở ${firstKhu.TenKhu} hiện còn phòng trống không?`);
    }

    pool.push("Thông tin liên hệ Quản lý cơ sở và Chủ trọ?");
    return Array.from(new Set(pool));
  }, [tinDangList, khuTroList]);

  // Danh sách câu hỏi hiển thị trên thanh gợi ý (ưu tiên câu hỏi theo mạch chat của AI, hoặc xoay vòng từ questionPool)
  const displayedQuestions = useMemo(() => {
    if (aiDynamicQuestions.length > 0) {
      return aiDynamicQuestions;
    }
    const pageSize = 4;
    const total = questionPool.length;
    if (total <= pageSize) return questionPool;

    const start = (questionPage * 2) % total;
    const items: string[] = [];
    for (let i = 0; i < pageSize; i++) {
      items.push(questionPool[(start + i) % total]);
    }
    return items;
  }, [aiDynamicQuestions, questionPool, questionPage]);

  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, isOpen, isAiTyping]);

  // Điều hướng trực tiếp đến trang chi tiết tin đăng khi bấm vào phòng gợi ý
  const handleViewRoomDetail = (roomFromAi: TinDangItem) => {
    const matchedInHome = tinDangList.find(
      (t) =>
        Number(t.MaPhong) === Number(roomFromAi.MaPhong) ||
        Number(t.MaTin) === Number(roomFromAi.MaTin)
    );

    const maTin = matchedInHome?.MaTin || roomFromAi.MaTin;
    if (maTin) {
      router.push(`/tin-dang/${maTin}`);
    } else {
      document
        .getElementById("tin-dang")
        ?.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Xoay vòng bộ câu hỏi gợi ý mới
  const handleRefreshQuestions = () => {
    setAiDynamicQuestions([]);
    setQuestionPage((prev) => prev + 1);
    questionScrollRef.current?.scrollTo({ left: 0, behavior: "smooth" });
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

    const historyForApi = chatMessages
      .filter((m) => m.id !== "welcome-ai")
      .map((m) => ({
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

      // Cập nhật thanh câu hỏi động theo ngữ cảnh câu trả lời vừa nhận
      if (
        res?.success &&
        Array.isArray(res?.data?.suggestedQuestions) &&
        res.data.suggestedQuestions.length > 0
      ) {
        setAiDynamicQuestions(
          res.data.suggestedQuestions.filter((q) => q !== content)
        );
        questionScrollRef.current?.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        setQuestionPage((prev) => prev + 1);
      }

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
        text: "Không thể kết nối tới máy chủ AI. Bạn vui lòng kiểm tra lại kết nối hoặc xem trực tiếp danh sách tin đăng trên trang chủ nhé!",
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
                  Tư vấn phòng trống, tiện ích & phí dịch vụ 24/7
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

                  {/* Nút mở Trang chi tiết tin đăng của phòng ngay trong tin nhắn AI */}
                  {msg.sender === "ai" &&
                    msg.suggestedRooms &&
                    msg.suggestedRooms.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-col gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700">
                          Phòng trống gợi ý (Bấm để xem chi tiết tin đăng):
                        </span>
                        {msg.suggestedRooms.map((room) => (
                          <button
                            key={`${msg.id}-room-${room.MaPhong}`}
                            type="button"
                            onClick={() => handleViewRoomDetail(room)}
                            className="w-full text-left px-3 py-2 rounded-2xl bg-[#00FFCC]/25 hover:bg-[#00FFCC]/50 text-slate-900 border border-teal-300 transition flex items-center justify-between gap-2 cursor-pointer group"
                          >
                            <div className="min-w-0">
                              <div className="text-[11px] font-bold text-slate-900 truncate">
                                Xem chi tiết phòng {room.TenPhong}
                              </div>
                              <div className="text-[10px] font-medium text-slate-600 truncate">
                                {room.TenKhu} • {formatVND(room.Gia)}/tháng (
                                {room.DienTich}m²)
                              </div>
                            </div>
                            <span className="px-2.5 py-1 rounded-full bg-[#00FFCC] group-hover:bg-[#00e6b8] text-slate-900 border border-teal-300 text-[10px] font-bold shrink-0 transition">
                              Xem tin đăng →
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
                  AI đang tra cứu phòng, tiện ích & phí dịch vụ...
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Thanh câu hỏi gợi ý động (Tự động đổi theo mạch hội thoại + có nút Đổi gợi ý) */}
          <div className="px-3 py-2 bg-white border-t border-slate-100 space-y-1.5">
            <div className="flex items-center justify-between px-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Gợi ý câu hỏi nhanh:
              </span>
              <button
                type="button"
                disabled={isAiTyping}
                onClick={handleRefreshQuestions}
                className="text-[10px] font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                title="Đổi bộ câu hỏi gợi ý khác"
              >
                <span>↻ Đổi câu hỏi khác</span>
              </button>
            </div>

            <div
              ref={questionScrollRef}
              className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin"
            >
              {displayedQuestions.map((q) => (
                <button
                  key={q}
                  type="button"
                  disabled={isAiTyping}
                  onClick={() => handleSendAiMessage(q)}
                  className="px-3 py-1.5 rounded-full text-[11px] font-semibold bg-[#00FFCC]/25 hover:bg-[#00FFCC] disabled:opacity-50 text-slate-900 border border-teal-300 whitespace-nowrap transition cursor-pointer shrink-0"
                >
                  {q}
                </button>
              ))}
            </div>
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
              placeholder="Hỏi phòng trống, tiện ích, phí dịch vụ..."
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

      {/* Nút mở/đóng AI Chatbot */}
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