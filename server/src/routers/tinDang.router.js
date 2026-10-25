// server/src/routers/tinDang.router.js
const express = require('express');
const router = express.Router();
const TinDangController = require('../app/controllers/tinDang.controller');
const {
  verifyToken,
  authorizeRoles,
} = require('../middlewares/auth.middleware');

// ==========================================
// 1. ROUTES CÔNG KHAI (Không cần đăng nhập - Dùng cho Trang chủ)
// ==========================================
router.get('/public', TinDangController.getList);
router.get('/', TinDangController.getList);

// ==========================================
// 2. ROUTES QUẢN LÝ (Cần đăng nhập quyền ChuTro hoặc QuanLy)
// ==========================================
router.use(verifyToken);
router.use(authorizeRoles('ChuTro', 'QuanLy'));

router.post('/', TinDangController.create);
router.put('/:maTin', TinDangController.update);
router.delete('/:maTin', TinDangController.remove);

module.exports = router;