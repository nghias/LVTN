// server/src/routers/aiChat.router.js
const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const AiChatController = require('../app/controllers/aiChat.controller');

// Giới hạn mỗi IP tối đa 20 câu hỏi / 1 phút để bảo vệ Gemini API
const aiChatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: {
    success: false,
    message: 'Bạn đang gửi tin nhắn quá nhanh, vui lòng đợi vài giây rồi thử lại nhé!',
  },
});

// Route công khai cho khách vãng lai tìm phòng trên trang chủ
router.post('/', aiChatLimiter, AiChatController.chatWithAi);

module.exports = router;