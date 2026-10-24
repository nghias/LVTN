// server/src/routers/tienIch.router.js
const express = require('express');
const router = express.Router();

const TienIchController = require('../app/controllers/TienIchController');
const {
  verifyToken,
  authorizeRoles,
} = require('../middlewares/auth.middleware');

// ==========================================
// 1. ROUTES CÔNG KHAI - KHÔNG CẦN ĐĂNG NHẬP
// Dành cho trang chủ và bộ lọc tìm phòng của khách
// ==========================================

router.get('/public', TienIchController.getDanhSachTienIch);

// ==========================================
// 2. ROUTES QUẢN LÝ TIỆN ÍCH - CẦN ĐĂNG NHẬP
// Chỉ ChuTro hoặc QuanLy được truy cập
// ==========================================

router.use(verifyToken);
router.use(authorizeRoles('ChuTro', 'QuanLy'));

// Xem danh sách & Tìm kiếm tiện ích (?search=...)
router.get('/', TienIchController.getDanhSachTienIch);

// Xem chi tiết 1 tiện ích theo MaTI
router.get('/:maTI', TienIchController.getChiTietTienIch);

// Thêm tiện ích mới
router.post('/', TienIchController.themTienIch);

// Sửa thông tin tiện ích
router.put('/:maTI', TienIchController.suaTienIch);

// Xóa tiện ích
router.delete('/:maTI', TienIchController.xoaTienIch);

module.exports = router;