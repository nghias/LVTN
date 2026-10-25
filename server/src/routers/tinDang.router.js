const express = require('express');
const router = express.Router();
const TinDangController = require('../app/controllers/tinDang.controller');
const {
  verifyToken,
  authorizeRoles,
} = require('../middlewares/auth.middleware');

// ==========================================
// 1. ROUTE CÔNG KHAI (Không cần đăng nhập - Dùng cho Trang chủ)
// ==========================================
router.get('/public', TinDangController.getPublicList);

// ==========================================
// 2. ROUTES QUẢN LÝ (Cần đăng nhập quyền ChuTro hoặc QuanLy)
// ==========================================
router.use(verifyToken);
router.use(authorizeRoles('ChuTro', 'QuanLy'));

router.get('/', TinDangController.getList);
router.post('/', TinDangController.create);
router.put('/:maTin', TinDangController.update);
router.delete('/:maTin', TinDangController.remove);

module.exports = router;