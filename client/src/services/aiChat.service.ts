// client/src/services/aiChat.service.ts
import { ChatMessage, TinDangItem } from "@/components/home/home.data";

const RAW_ENV_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
const API_ROOT = RAW_ENV_URL.replace(/\/auth\/?$/, "").replace(/\/$/, "");
const AI_CHAT_URL = API_ROOT.endsWith("/api")
  ? `${API_ROOT}/ai-chat`
  : `${API_ROOT}/api/ai-chat`;

const STORAGE_KEY = "xomtro_ai_chat_session_v1";

export interface AiChatHistoryItem {
  sender: "ai" | "user";
  text: string;
}

export interface AiChatResponse {
  success: boolean;
  message?: string;
  data?: {
    reply: string;
    suggestedRooms: TinDangItem[];
    suggestedQuestions?: string[];
  };
}

export interface SharedChatState {
  messages: ChatMessage[];
  dynamicQuestions: string[];
  isOpen: boolean;
  isTyping: boolean;
}

const DEFAULT_WELCOME_MESSAGE: ChatMessage = {
  id: "welcome-ai",
  sender: "ai",
  text: "Xin chào! Tôi là Trợ lý ảo AI của hệ thống Xóm Trọ (ứng dụng Gemini 2.5 Flash). Bạn cần tìm phòng trống theo mức giá, hỏi chi tiết tiện ích đi kèm, bảng phí dịch vụ hàng tháng hay đơn giá điện nước IoT?",
  time: "Bây giờ",
};

// Kho lưu trữ trạng thái dùng chung giữa Trang chủ (/) và Trang chi tiết (/tinDang/[id])
let sharedState: SharedChatState = {
  messages: [DEFAULT_WELCOME_MESSAGE],
  dynamicQuestions: [],
  isOpen: false,
  isTyping: false,
};

let isHydratedFromStorage = false;
const listeners = new Set<() => void>();

function notifyListeners() {
  if (typeof window !== "undefined") {
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          messages: sharedState.messages,
          dynamicQuestions: sharedState.dynamicQuestions,
          isOpen: sharedState.isOpen,
        })
      );
    } catch {
      // Bỏ qua nếu trình duyệt chặn sessionStorage
    }
  }
  listeners.forEach((listener) => listener());
}

function hydrateFromStorage() {
  if (isHydratedFromStorage || typeof window === "undefined") return;
  isHydratedFromStorage = true;

  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);

    if (Array.isArray(parsed?.messages) && parsed.messages.length > 0) {
      sharedState = {
        ...sharedState,
        messages: parsed.messages,
        dynamicQuestions: Array.isArray(parsed?.dynamicQuestions)
          ? parsed.dynamicQuestions
          : [],
        isOpen: Boolean(parsed?.isOpen),
      };
    }
  } catch {
    // Giữ nguyên mặc định nếu dữ liệu lưu trữ không hợp lệ
  }
}

function formatCurrentTime(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(
    now.getMinutes()
  ).padStart(2, "0")}`;
}

/**
 * Gọi API bằng XMLHttpRequest để KHÔNG kích hoạt màn hình GlobalLoadingProvider
 * giúp người dùng thao tác thoải mái trên giao diện trong lúc chờ AI trả lời
 */
function postAiChatSilent(
  message: string,
  history: AiChatHistoryItem[]
): Promise<AiChatResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", AI_CHAT_URL, true);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.setRequestHeader("X-Skip-Global-Loading", "1");

    xhr.onload = () => {
      try {
        const json = JSON.parse(xhr.responseText || "{}");
        resolve(json);
      } catch (err) {
        reject(err);
      }
    };

    xhr.onerror = () => {
      reject(new Error("Lỗi kết nối máy chủ AI"));
    };

    xhr.send(
      JSON.stringify({
        message,
        history: history.slice(-6),
      })
    );
  });
}

export const aiChatService = {
  getState: (): SharedChatState => {
    hydrateFromStorage();
    return sharedState;
  },

  subscribe: (listener: () => void) => {
    hydrateFromStorage();
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  setOpen: (isOpen: boolean) => {
    hydrateFromStorage();
    if (sharedState.isOpen === isOpen) return;
    sharedState = { ...sharedState, isOpen };
    notifyListeners();
  },

  toggleOpen: () => {
    hydrateFromStorage();
    sharedState = { ...sharedState, isOpen: !sharedState.isOpen };
    notifyListeners();
  },

  clearDynamicQuestions: () => {
    hydrateFromStorage();
    sharedState = { ...sharedState, dynamicQuestions: [] };
    notifyListeners();
  },

  sendMessage: async (
    message: string,
    history: AiChatHistoryItem[] = []
  ): Promise<AiChatResponse> => {
    return postAiChatSilent(message, history);
  },

  // Gửi câu hỏi và cập nhật trực tiếp vào bộ nhớ chung xuyên trang
  askQuestion: async (rawContent: string): Promise<void> => {
    hydrateFromStorage();
    const content = rawContent.trim();
    if (!content || sharedState.isTyping) return;

    const historyForApi: AiChatHistoryItem[] = sharedState.messages
      .filter((m) => m.id !== "welcome-ai")
      .map((m) => ({
        sender: m.sender,
        text: m.text,
      }));

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: content,
      time: formatCurrentTime(),
    };

    sharedState = {
      ...sharedState,
      isOpen: true,
      isTyping: true,
      messages: [...sharedState.messages, userMsg],
    };
    notifyListeners();

    try {
      const res = await postAiChatSilent(content, historyForApi);

      const aiReplyText =
        res?.success && res?.data?.reply
          ? res.data.reply
          : res?.message ||
            "Hiện tại hệ thống tư vấn đang bận, bạn vui lòng thử lại sau giây lát nhé!";

      const suggestedRooms =
        res?.success && Array.isArray(res?.data?.suggestedRooms)
          ? res.data.suggestedRooms
          : [];

      const nextDynamicQuestions =
        res?.success &&
        Array.isArray(res?.data?.suggestedQuestions) &&
        res.data.suggestedQuestions.length > 0
          ? res.data.suggestedQuestions.filter((q) => q !== content)
          : sharedState.dynamicQuestions;

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: "ai",
        text: aiReplyText,
        time: formatCurrentTime(),
        suggestedRooms,
      };

      sharedState = {
        ...sharedState,
        isTyping: false,
        messages: [...sharedState.messages, aiMsg],
        dynamicQuestions: nextDynamicQuestions,
      };
      notifyListeners();
    } catch (error) {
      console.error("Lỗi khi gọi AI Chatbot:", error);
      const errorMsg: ChatMessage = {
        id: `ai-err-${Date.now()}`,
        sender: "ai",
        text: "Không thể kết nối tới máy chủ AI. Bạn vui lòng kiểm tra lại kết nối hoặc xem trực tiếp danh sách tin đăng trên trang nhé!",
        time: formatCurrentTime(),
      };

      sharedState = {
        ...sharedState,
        isTyping: false,
        messages: [...sharedState.messages, errorMsg],
      };
      notifyListeners();
    }
  },
};