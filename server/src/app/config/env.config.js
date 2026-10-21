const path = require('path');
require('dotenv').config();

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
    // Trỏ trực tiếp tới file isrgrootx1.pem nằm cùng thư mục config
    caPath: path.join(__dirname, 'isrgrootx1.pem'),
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpires: process.env.JWT_ACCESS_EXPIRES || '1d',
    refreshExpires: process.env.JWT_REFRESH_EXPIRES || '7d',
  },
  aesSecretKey: process.env.AES_SECRET_KEY,
};