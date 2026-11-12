// client/src/services/aiChat.service.ts
import { TinDangItem } from "@/components/home/home.data";

const RAW_ENV_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
const API_ROOT = RAW_ENV_URL.replace(/\/auth\/?$/, "").replace(/\/$/, "");
const AI_CHAT_URL = API_ROOT.endsWith("/api")
  ? `${API_ROOT}/ai-chat`
  : `${API_ROOT}/api/ai-chat`;

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
  };
}

export const aiChatService = {
  sendMessage: async (
    message: string,
    history: AiChatHistoryItem[] = []
  ): Promise<AiChatResponse> => {
    const res = await fetch(AI_CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message,
        history: history.slice(-6),
      }),
    });

    return res.json();
  },
};