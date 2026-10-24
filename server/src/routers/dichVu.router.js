// server/src/routers/dichVu.router.js
const express = require('express');
const router = express.Router();

const DichVuController = require('../app/controllers/dichVu.controller');
const {
  verifyToken,
  authorizeRoles,
} = require('../middlewares/auth.middleware');

// ==========================================
// 1. ROUTES CÔNG KHAI - KHÔNG CẦN ĐĂNG NHẬP
// ==========================================
router.get('/public', DichVuController.getDanhSachDichVu);

// ==========================================
// 2. ROUTES QUẢN LÝ PHÍ DỊCH VỤ - CẦN ĐĂNG NHẬP
// Chỉ ChuTro hoặc QuanLy được truy cập
// ==========================================
router.use(verifyToken);
router.use(authorizeRoles('ChuTro', 'QuanLy'));

// Lấy danh sách Cơ sở & Phòng được phép gán dịch vụ
router.get('/phong-ap-dung-options', DichVuController.getPhongOptions);

// Xem danh sách & Tìm kiếm phí dịch vụ (?search=...)
router.get('/', DichVuController.getDanhSachDichVu);

// Xem chi tiết 1 phí dịch vụ kèm danh sách phòng đang áp dụng
router.get('/:maDV', DichVuController.getChiTietDichVu);

// Thêm phí dịch vụ mới (kèm gán phòng)
router.post('/', DichVuController.themDichVu);

// Sửa phí dịch vụ (kèm cập nhật phòng áp dụng)
router.put('/:maDV', DichVuController.suaDichVu);

// Xóa phí dịch vụ
router.delete('/:maDV', DichVuController.xoaDichVu);

module.exports = router;