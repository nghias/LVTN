// server/src/app.js
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const path = require("path");
const http = require("http");

const env = require("./app/config/env.config");
const apiRouters = require("./routers/index");
const PhongTroController = require("./app/controllers/phongTro.controller");
const errorHandler = require("./middlewares/error.middleware");
const { initSocket } = require("./services/socket.service");

const thongBaoRouter = require("./routers/thongBao.router");
const hopDongRouter = require("./routers/hopDong.router");
const datPhongRouter = require("./routers/datPhong.router");
const { startDatPhongCron } = require("./jobs/datPhong.cron");

const app = express();
app.set("trust proxy", 1);

const server = http.createServer(app);
const io = initSocket(server);

// 1. Bảo mật HTTP Headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

// 2. Cấu hình CORS cho phép Next.js gọi API
app.use(
  cors({
    origin: env.clientUrl || "http://localhost:3000",
    credentials: true,
  }),
);

// 3. Giới hạn tần suất gọi API chống dò mật khẩu & spam tạo QR đặt cọc
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: "Quá nhiều yêu cầu từ IP này, vui lòng thử lại sau 15 phút!",
  },
});
app.use("/api/auth/login", authLimiter);

const datPhongLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    message: "Bạn gửi yêu cầu đặt cọc quá nhanh, vui lòng thử lại sau ít phút!",
  },
});
app.use("/api/dat-phong/tao-yeu-cau", datPhongLimiter);

// 4. Middleware đọc JSON, Form-data và Cookie
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// 5. Public thư mục chứa ảnh phòng trọ và biên lai thanh toán (/uploads/...)
app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));

// 6. Route trực tiếp cho Trang chủ (hỗ trợ gọi /api/trang-chu)
app.get("/api/trang-chu", PhongTroController.getHomeData);

// 7. Gắn toàn bộ API Routes (tinDangRouter đã nằm trong routers/index.js)
app.use("/api", apiRouters);
app.use("/api/thong-bao", thongBaoRouter);
app.use("/api/hop-dong", hopDongRouter);
app.use("/api/dat-phong", datPhongRouter);

// 8. Middleware xử lý lỗi tập trung (luôn đặt SAU TẤT CẢ routes)
app.use(errorHandler);

// 9. Khởi động duy nhất 1 HTTP Server dùng chung cho Express + Socket.IO
const PORT = env.port || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server & WebSocket đang chạy tại: http://localhost:${PORT}`);
  startDatPhongCron(io);
});