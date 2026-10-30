const express = require('express');
const router = express.Router();
const HopDongController = require('../app/controllers/hopDong.controller');
const {
  verifyToken,
  authorizeRoles,
} = require('../middlewares/auth.middleware');

// Bắt buộc đăng nhập và chỉ cho phép ChuTro hoặc QuanLy thao tác quản lý hợp đồng
router.use(verifyToken);
router.use(authorizeRoles('ChuTro', 'QuanLy'));

// Thống nhất tên đường dẫn API bằng tiếng Việt
router.get('/danh-sach', HopDongController.layDanhSachHopDong);
router.get('/tim-kiem', HopDongController.layDanhSachHopDong);
router.get('/du-lieu-tao-moi', HopDongController.layDuLieuTaoMoi);
router.get('/chi-tiet/:maHDT', HopDongController.xemChiTietHopDong);
router.post('/tao-moi', HopDongController.taoHopDong);
router.put('/cap-nhat/:maHDT', HopDongController.suaHopDong);
router.delete('/xoa/:maHDT', HopDongController.xoaHopDong);

module.exports = router;