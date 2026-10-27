// client/src/utils/socket.ts
import { io, Socket } from "socket.io-client";

// Tự động cắt bỏ đuôi /api hoặc /api/v1 nếu biến môi trường có chứa nó
const RAW_URL = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const SOCKET_URL = RAW_URL.replace(/\/api(\/v\d+)?\/?$/, "");

let socket: Socket | null = null;

export const connectSocket = (maND: number): Socket => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      auth: { maND },
      query: { maND }, // Dự phòng cho handshake.query ở server
      transports: ["polling", "websocket"], // Ưu tiên bắt tay qua polling rồi nâng cấp lên websocket để tránh lỗi chặn kết nối
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      withCredentials: true,
    });
  } else {
    socket.auth = { maND };
    if (!socket.connected) {
      socket.connect();
    }
  }
  return socket;
};

export const getSocket = (): Socket | null => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};