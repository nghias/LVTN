// server/src/app/controllers/aiChat.controller.js
const AiChatService = require('../../services/aiChat.service');

const AiChatController = {
  // [POST] /api/ai-chat
  chatWithAi: async (req, res) => {
    try {
      const { message, history } = req.body;

      if (!message || !String(message).trim()) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng nhập nội dung câu hỏi cần tư vấn!',
        });
      }

      const question = String(message).trim().slice(0, 500);
      const result = await AiChatService.consultWithRag(question, history || []);

      return res.status(200).json({
        success: true,
        data: {
          reply: result.reply,
          suggestedRooms: result.suggestedRooms || [],
        },
      });
    } catch (error) {
      console.error('Lỗi tại AiChatController.chatWithAi:', error);
      return res.status(500).json({
        success: false,
        message: 'Trợ lý AI đang bận, vui lòng thử lại sau giây lát!',
      });
    }
  },
};

module.exports = AiChatController;