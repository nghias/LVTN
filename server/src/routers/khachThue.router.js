// server/src/routers/khachThue.route.js
const express = require('express');
const router = express.Router();

const KhachThueController = require('../app/controllers/KhachThueController');
const {
  verifyToken,
  authorizeRoles,
} = require('../middlewares/auth.middleware');

// ==========================================
// ROUTES QUẢN LÝ KHÁCH THUÊ - CẦN ĐĂNG NHẬP
// Chỉ ChuTro hoặc QuanLy được truy cập
// (Bên trong Controller sẽ lọc Quản lý chỉ thấy khách thuộc cơ sở của mình)
// ==========================================

router.use(verifyToken);
router.use(authorizeRoles('ChuTro', 'QuanLy'));

// Danh sách & Chi tiết khách thuê
router.get('/danh-sach', KhachThueController.getList);
router.get('/:maND', KhachThueController.getDetail);

// Tạo tài khoản khách thuê mới
router.post('/', KhachThueController.create);

// Sửa thông tin tài khoản khách thuê
router.put('/:maND', KhachThueController.update);

// Cấp lại mật khẩu cho khách thuê
router.put('/:maND/cap-lai-mat-khau', KhachThueController.resetPassword);

// Xóa tài khoản khách thuê
router.delete('/:maND', KhachThueController.delete);

module.exports = router;