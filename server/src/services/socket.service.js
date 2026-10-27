// server/src/services/socket.service.js
const { Server } = require("socket.io");

let io = null;

// Lưu map MaND -> Set<socketId> để kiểm tra trạng thái online nếu cần
const connectedUsers = new Map();

const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || ["http://localhost:3000", "http://127.0.0.1:3000"],
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    // Client gửi MaND khi kết nối thông qua auth hoặc query
    const maND = Number(socket.handshake.auth?.maND || socket.handshake.query?.maND);

    if (maND) {
      const userRoom = `user_${maND}`;
      socket.join(userRoom);

      if (!connectedUsers.has(maND)) {
        connectedUsers.set(maND, new Set());
      }
      connectedUsers.get(maND).add(socket.id);

      console.log(`[WebSocket] Người dùng MaND=${maND} đã kết nối (${socket.id})`);
    }

    socket.on("disconnect", () => {
      if (maND && connectedUsers.has(maND)) {
        connectedUsers.get(maND).delete(socket.id);
        if (connectedUsers.get(maND).size === 0) {
          connectedUsers.delete(maND);
        }
      }
    });
  });

  return io;
};

/**
 * Đẩy thông báo trực tiếp tới danh sách người nhận (NDNhan)
 * @param {number[]} danhSachMaND - Mảng MaND nhận thông báo
 * @param {object} payload - Dữ liệu thông báo vừa tạo
 */
const emitThongBaoMoi = (danhSachMaND, payload) => {
  if (!io || !Array.isArray(danhSachMaND) || danhSachMaND.length === 0) return;

  danhSachMaND.forEach((maND) => {
    io.to(`user_${Number(maND)}`).emit("NEW_NOTIFICATION", payload);
  });
};

/**
 * Đẩy phản hồi mới trực tiếp (Hỗ trợ truyền danh sách MaND, 1 MaND, hoặc broadcast)
 */
const emitPhanHoiMoi = (targetOrPayload, maybePayload) => {
  if (!io) return;

  // Trường hợp 1: emitPhanHoiMoi(danhSachMaND, payload) -> Mảng người nhận
  if (Array.isArray(targetOrPayload) && maybePayload !== undefined) {
    targetOrPayload.forEach((maND) => {
      io.to(`user_${Number(maND)}`).emit("NEW_FEEDBACK", maybePayload);
      io.to(`user_${Number(maND)}`).emit("NEW_PHAN_HOI", maybePayload);
      io.to(`user_${Number(maND)}`).emit("NEW_NOTIFICATION", maybePayload);
    });
    return;
  }

  // Trường hợp 2: emitPhanHoiMoi(maND, payload) -> 1 người nhận cụ thể
  if ((typeof targetOrPayload === "number" || typeof targetOrPayload === "string") && maybePayload !== undefined) {
    const room = `user_${Number(targetOrPayload)}`;
    io.to(room).emit("NEW_FEEDBACK", maybePayload);
    io.to(room).emit("NEW_PHAN_HOI", maybePayload);
    io.to(room).emit("NEW_NOTIFICATION", maybePayload);
    return;
  }

  // Trường hợp 3: emitPhanHoiMoi(payload) -> Phát tới toàn bộ client hoặc theo danh sách trong payload
  const payload = targetOrPayload;
  io.emit("NEW_FEEDBACK", payload);
  io.emit("NEW_PHAN_HOI", payload);
};

/**
 * Thông báo cho các client khi một thông báo bị thu hồi/xóa
 */
const emitXoaThongBao = (maTB) => {
  if (!io) return;
  io.emit("DELETE_NOTIFICATION", { MaTB: Number(maTB) });
};

const getIO = () => io;

module.exports = {
  initSocket,
  getIO,
  emitThongBaoMoi,
  emitPhanHoiMoi,
  emitXoaThongBao,
};