// server/src/routers/dichVu.router.js
const express = require('express');
const router = express.Router();

const DichVuController = require('../app/controllers/dichVu.controller');
const {
  verifyToken,
  authorizeRoles,
} = require('../middlewares/auth.middleware');

// 1. Route công khai (nếu cần hiển thị bảng giá dịch vụ trên tin đăng)
router.get('/public', DichVuController.getDanhSachDichVu);

// 2. Routes quản lý phí dịch vụ (Yêu cầu đăng nhập quyền ChuTro hoặc QuanLy)
router.use(verifyToken);
router.use(authorizeRoles('ChuTro', 'QuanLy'));

// Xem danh sách & Tìm kiếm phí dịch vụ (?search=...)
router.get('/', DichVuController.getDanhSachDichVu);

// Xem chi tiết 1 phí dịch vụ
router.get('/:maDV', DichVuController.getChiTietDichVu);

// Thêm phí dịch vụ mới
router.post('/', DichVuController.themDichVu);

// Sửa phí dịch vụ
router.put('/:maDV', DichVuController.suaDichVu);

// Xóa phí dịch vụ
router.delete('/:maDV', DichVuController.xoaDichVu);

module.exports = router;