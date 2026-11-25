// src/controllers/tinDang.controller.js
const TinDangModel = require('../models/tinDang.model');

const TinDangController = {
  // GET /tin-dang/public (Lấy tất cả phòng kèm trạng thái, ảnh, tiện ích cho Trang chủ)
  async getPublicList(req, res) {
    try {
      const phongList = await TinDangModel.getPublicRooms();
      return res.status(200).json({
        success: true,
        data: {
          phongList,
          tinDangList: phongList, // Giữ key cũ để FE không bị vỡ trong lúc chuyển đổi
        },
      });
    } catch (error) {
      console.error('❌ Lỗi lấy danh sách phòng công khai:', error);
      return res.status(500).json({
        success: false,
        message: 'Không thể tải danh sách phòng trọ.',
      });
    }
  },

  // GET /tin-dang/public/:maPhong (hoặc :maTin - Xem chi tiết 1 phòng)
  async getPublicDetail(req, res) {
    try {
      const rawId = req.params.maPhong || req.params.maTin;
      if (!rawId || isNaN(Number(rawId))) {
        return res.status(400).json({
          success: false,
          message: 'Mã phòng không hợp lệ.',
        });
      }

      const phong = await TinDangModel.getPublicRoomById(Number(rawId));
      if (!phong) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy phòng trọ.',
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          phong,
          tinDang: phong, // Giữ key cũ để tương thích FE
        },
      });
    } catch (error) {
      console.error('❌ Lỗi lấy chi tiết phòng công khai:', error);
      return res.status(500).json({
        success: false,
        message: 'Không thể tải thông tin chi tiết phòng.',
      });
    }
  },
};

module.exports = TinDangController;