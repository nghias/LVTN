// src/components/home/AiChatbotWidget.tsx
"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { GiaDienNuocHome } from "@/services/home.service";
import { aiChatService, SharedChatState } from "@/services/aiChat.service";
import {
  TinDangItem,
  KhuTroWithContact,
  formatVND,
} from "./home.data";

interface AiChatbotWidgetProps {
  isOpen?: boolean;
  onToggleOpen?: () => void;
  onClose?: () => void;
  tinDangList: TinDangItem[];
  khuTroList: KhuTroWithContact[];
  giaDienNuoc?: GiaDienNuocHome | null;
  onSelectContactRoom?: (room: TinDangItem) => void;
}

export default function AiChatbotWidget({
  isOpen: externalIsOpen,
  onToggleOpen,
  onClose,
  tinDangList,
  khuTroList,
}: AiChatbotWidgetProps) {
  const router = useRouter();
  const [chatInput, setChatInput] = useState<string>("");
  const [questionPage, setQuestionPage] = useState<number>(0);

  // Đồng bộ với kho trạng thái xuyên trang (giữ nguyên đoạn chat khi chuyển trang)
  const [chatState, setChatState] = useState<SharedChatState>(() =>
    aiChatService.getState()
  );

  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const questionScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setChatState({ ...aiChatService.getState() });
    const unsubscribe = aiChatService.subscribe(() => {
      setChatState({ ...aiChatService.getState() });
    });
    return unsubscribe;
  }, []);

  // Nếu từ nút "Nhờ AI tư vấn chọn phòng" ở HeroSection truyền isOpen=true xuống thì đồng bộ mở luôn
  useEffect(() => {
    if (externalIsOpen === true && !chatState.isOpen) {
      aiChatService.setOpen(true);
    }
  }, [externalIsOpen, chatState.isOpen]);

  const isChatVisible = chatState.isOpen;
  const isAiTyping = chatState.isTyping;
  const chatMessages = chatState.messages;
  const aiDynamicQuestions = chatState.dynamicQuestions;

  const handleToggleChat = () => {
    const nextOpen = !isChatVisible;
    aiChatService.setOpen(nextOpen);
    if (nextOpen && onToggleOpen && !externalIsOpen) {
      onToggleOpen();
    } else if (!nextOpen && onClose) {
      onClose();
    }
  };

  const handleCloseChat = () => {
    aiChatService.setOpen(false);
    if (onClose) onClose();
  };

  // Ngân hàng câu hỏi động dựa trên dữ liệu thực tế
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
    if (isChatVisible) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, isChatVisible, isAiTyping]);

  // Chuyển sang trang chi tiết tin đăng mà VẪN GIỮ NGUYÊN lịch sử & khung chat
  const handleViewRoomDetail = (roomFromAi: TinDangItem) => {
    const matchedInHome = tinDangList.find(
      (t) =>
        Number(t.MaPhong) === Number(roomFromAi.MaPhong) ||
        Number(t.MaTin) === Number(roomFromAi.MaTin)
    );

    const maTin = matchedInHome?.MaTin || roomFromAi.MaTin;
    if (maTin) {
      aiChatService.setOpen(true);
      router.push(`/tinDang/${maTin}`);
    } else {
      document
        .getElementById("tin-dang")
        ?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleRefreshQuestions = () => {
    aiChatService.clearDynamicQuestions();
    setQuestionPage((prev) => prev + 1);
    questionScrollRef.current?.scrollTo({ left: 0, behavior: "smooth" });
  };

  const handleSendAiMessage = async (customQuestion?: string) => {
    const content = (customQuestion ?? chatInput).trim();
    if (!content || isAiTyping) return;

    if (!customQuestion) {
      setChatInput("");
    }
    await aiChatService.askQuestion(content);
    questionScrollRef.current?.scrollTo({ left: 0, behavior: "smooth" });
  };

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end pointer-events-none">
      {isChatVisible && (
        <div className="pointer-events-auto mb-3 w-85 sm:w-96 bg-white border-2 border-[#00FFCC] rounded-3xl shadow-2xl overflow-hidden flex flex-col">
          {/* Header Chatbox */}
          <div className="bg-[#00FFCC] text-slate-900 px-5 py-3.5 flex items-center justify-between gap-3 border-b border-teal-300">
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
              onClick={handleCloseChat}
              className="w-7 h-7 rounded-full bg-white/80 hover:bg-white text-slate-800 border border-teal-300 text-xs font-bold flex items-center justify-center transition cursor-pointer"
              title="Thu gọn hộp thoại"
            >
              ✕
            </button>
          </div>

          {/* Danh sách tin nhắn */}
          <div className="p-4 h-84 overflow-y-auto bg-slate-50/70 space-y-3">
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

                  {/* Nút mở Trang chi tiết tin đăng của phòng */}
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

            {/* Chỉ hiển thị 1 dòng ngắn gọn khi AI đang tìm câu trả lời */}
            {isAiTyping && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-teal-200 w-fit max-w-full shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-teal-500 animate-ping shrink-0" />
                <span className="text-[11px] font-medium text-slate-600 truncate">
                  Đang tìm câu trả lời...
                </span>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Thanh câu hỏi gợi ý động */}
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
        onClick={handleToggleChat}
        className="pointer-events-auto flex items-center gap-2 px-3 py-3 rounded-full bg-[#00FFCC] hover:bg-[#00e6b8] text-slate-900 border border-teal-300 shadow-lg shadow-[#00FFCC]/30 transition cursor-pointer"
      >
        <span className="w-7 h-7 rounded-full bg-white text-slate-900 border border-teal-300 font-bold text-xs flex items-center justify-center shadow-2xs">
          AI
        </span>
        <span className="text-xs font-bold text-slate-900">
          {isChatVisible ? "Đóng Trợ lý AI" : "Chat tư vấn AI"}
        </span>
      </button>
    </div>
  );
}