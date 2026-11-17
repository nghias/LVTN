// server/src/app/routers/thongKe.router.js
const express = require('express');
const router = express.Router();
const ThongKeController = require('../app/controllers/thongKe.controller');
const { verifyToken, authorizeRoles } = require('../middlewares/auth.middleware');

// Route thống kê cho Chủ trọ và Quản lý cơ sở
router.get(
  '/quan-ly',
  verifyToken,
  authorizeRoles('ChuTro', 'QuanLy'),
  ThongKeController.getThongKeQuanLy
);

// Route thống kê cho Người thuê
router.get(
  '/nguoi-thue',
  verifyToken,
  authorizeRoles('KhachThue', 'NguoiThue', 'ChuTro', 'QuanLy'),
  ThongKeController.getThongKeNguoiThue
);

module.exports = router;