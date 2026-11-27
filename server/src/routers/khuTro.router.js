// server/src/routers/khuTro.router.js
const express = require('express');
const router = express.Router();

const KhuTroController = require('../app/controllers/khuTro.controller');
const {
  verifyToken,
  authorizeRoles,
} = require('../middlewares/auth.middleware');

// ==========================================
// ROUTES QUẢN LÝ CƠ SỞ (KHU TRỌ) - CẦN ĐĂNG NHẬP
// Chỉ ChuTro hoặc QuanLy được truy cập
// ==========================================

router.use(verifyToken);
router.use(authorizeRoles('ChuTro', 'QuanLy'));

// Danh sách cơ sở & Danh sách người quản lý
router.get('/', KhuTroController.getKhuTroList);
router.get('/quan-ly-list', KhuTroController.getDanhSachQuanLy);
router.get('/:maKhu', KhuTroController.getKhuTroDetail);

// Thêm / Sửa / Xóa cơ sở
router.post('/', KhuTroController.createKhuTro);
router.put('/:maKhu', KhuTroController.updateKhuTro);
router.delete('/:maKhu', KhuTroController.deleteKhuTro);

// Đổi mật khẩu mở cửa & Ghi mã thẻ NFC gắn cổng
router.put('/:maKhu/mat-khau', KhuTroController.updateMatKhauCua);
router.put('/:maKhu/ma-mo-cua', KhuTroController.updateMaMoCua);

module.exports = router;