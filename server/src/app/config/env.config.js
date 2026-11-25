// server/src/app/config/env.config.js
const path = require('path');
require('dotenv').config();

// Ép tiến trình Node.js chạy mặc định theo giờ Việt Nam (UTC+7)
process.env.TZ = process.env.TZ || 'Asia/Ho_Chi_Minh';

module.exports = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  db: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 4000,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    enableSsl: process.env.DB_ENABLE_SSL === 'true',
    timezone: process.env.DB_TIMEZONE || '+07:00',
    // Trỏ trực tiếp tới file isrgrootx1.pem nằm cùng thư mục config
    caPath: path.join(__dirname, 'isrgrootx1.pem'),
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpires: process.env.JWT_ACCESS_EXPIRES || '1d',
    refreshExpires: process.env.JWT_REFRESH_EXPIRES || '7d',
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },
  aesSecretKey: process.env.AES_SECRET_KEY,
  iotDeviceKey: process.env.IOT_DEVICE_KEY,
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    model: process.env.GEMINI_MODEL || 'gemini-3.0-flash',
  },
};