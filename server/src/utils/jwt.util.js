const jwt = require('jsonwebtoken');
const env = require('../app/config/env.config');

const generateAccessToken = (payload) => {
  return jwt.sign(payload, env.jwt.accessSecret, {
    expiresIn: env.jwt.accessExpires,
  });
};

const generateRefreshToken = (payload) => {
  return jwt.sign(payload, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshExpires,
  });
};

const verifyAccessToken = (token) => {
  return jwt.verify(token, env.jwt.accessSecret);
};

const verifyRefreshToken = (token) => {
  return jwt.verify(token, env.jwt.refreshSecret);
};

// Hàm gắn Token vào HttpOnly Cookie (Chống XSS tấn công đánh cắp Token)
const setAuthCookies = (res, accessToken, refreshToken) => {
  const isProd = env.nodeEnv === 'production';

  const cookieOptions = {
    httpOnly: true,
    secure: isProd, // Tự động bật true khi chạy HTTPS trên Render/Vercel
    sameSite: isProd ? 'none' : 'lax',
  };

  res.cookie('accessToken', accessToken, {
    ...cookieOptions,
    maxAge: 24 * 60 * 60 * 1000, // 1 ngày
  });

  res.cookie('refreshToken', refreshToken, {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
  });
};

const clearAuthCookies = (res) => {
  const isProd = env.nodeEnv === 'production';
  const cookieOptions = {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
  };
  res.clearCookie('accessToken', cookieOptions);
  res.clearCookie('refreshToken', cookieOptions);
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  setAuthCookies,
  clearAuthCookies,
};