// server/src/services/socket.service.js
const { Server } = require("socket.io");

let io = null;

// Lưu map MaND -> Set<socketId> để kiểm tra trạng thái online nếu cần
const connectedUsers = new Map();

const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin:
        process.env.CLIENT_URL || [
          "http://localhost:3000",
          "http://127.0.0.1:3000",
        ],
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    const maND = Number(
      socket.handshake.auth?.maND || socket.handshake.query?.maND
    );

    if (maND) {
      const userRoom = `user_${maND}`;
      socket.join(userRoom);

      if (!connectedUsers.has(maND)) {
        connectedUsers.set(maND, new Set());
      }
      connectedUsers.get(maND).add(socket.id);

      console.log(
        `[WebSocket] Người dùng MaND=${maND} đã kết nối (${socket.id})`
      );
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

// Đẩy thông báo trực tiếp tới danh sách người nhận (NDNhan)
const emitThongBaoMoi = (danhSachMaND, payload) => {
  if (!io || !Array.isArray(danhSachMaND) || danhSachMaND.length === 0) return;

  const uniqueIds = Array.from(new Set(danhSachMaND.map(Number).filter(Boolean)));
  uniqueIds.forEach((maND) => {
    const room = `user_${maND}`;
    io.to(room).emit("NEW_NOTIFICATION", payload);
    io.to(room).emit("thong_bao_moi", payload);
  });
};

// Đẩy phản hồi mới trực tiếp (Hỗ trợ truyền danh sách MaND, 1 MaND, hoặc broadcast)
const emitPhanHoiMoi = (targetOrPayload, maybePayload) => {
  if (!io) return;

  if (Array.isArray(targetOrPayload) && maybePayload !== undefined) {
    targetOrPayload.forEach((maND) => {
      const room = `user_${Number(maND)}`;
      io.to(room).emit("NEW_FEEDBACK", maybePayload);
      io.to(room).emit("NEW_PHAN_HOI", maybePayload);
      io.to(room).emit("NEW_NOTIFICATION", maybePayload);
      io.to(room).emit("phan_hoi_thong_bao", maybePayload);
    });
    return;
  }

  if (
    (typeof targetOrPayload === "number" ||
      typeof targetOrPayload === "string") &&
    maybePayload !== undefined
  ) {
    const room = `user_${Number(targetOrPayload)}`;
    io.to(room).emit("NEW_FEEDBACK", maybePayload);
    io.to(room).emit("NEW_PHAN_HOI", maybePayload);
    io.to(room).emit("NEW_NOTIFICATION", maybePayload);
    io.to(room).emit("phan_hoi_thong_bao", maybePayload);
    return;
  }

  const payload = targetOrPayload;
  io.emit("NEW_FEEDBACK", payload);
  io.emit("NEW_PHAN_HOI", payload);
  io.emit("phan_hoi_thong_bao", payload);
};

// Thông báo cho các client khi một thông báo bị thu hồi/xóa
const emitXoaThongBao = (maTB) => {
  if (!io) return;
  const data = { MaTB: Number(maTB) };
  io.emit("DELETE_NOTIFICATION", data);
  io.emit("xoa_thong_bao", data);
};

const getIO = () => io;

module.exports = {
  initSocket,
  getIO,
  emitThongBaoMoi,
  emitPhanHoiMoi,
  emitXoaThongBao,
};