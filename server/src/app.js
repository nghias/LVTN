const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const path = require('path');

const env = require('./app/config/env.config');
const apiRouters = require('./routers/index');
const errorHandler = require('./middlewares/error.middleware');

const app = express();

// 1. Bảo mật HTTP Headers
app.use(helmet());

// 2. Cấu hình CORS cho phép Next.js gửi và nhận HttpOnly Cookie
app.use(
  cors({
    origin: env.clientUrl,
    credentials: true,
  })
);

// 3. Giới hạn tần suất gọi API chống dò mật khẩu (Brute-force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 100,
  message: {
    success: false,
    message: 'Quá nhiều yêu cầu từ IP này, vui lòng thử lại sau 15 phút!',
  },
});
app.use('/api/auth/login', authLimiter);

// 4. Middleware đọc JSON, Form-data và Cookie
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// 5. Public thư mục chứa ảnh phòng trọ và biên lai thanh toán (/uploads/...)
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// 6. Gắn toàn bộ API Routes
app.use('/api', apiRouters);

// 7. Middleware xử lý lỗi tập trung
app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`🚀 Server đang chạy tại: http://localhost:${env.port}`);
});