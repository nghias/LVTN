// server/src/routers/hopDong.router.js
const express = require('express');
const router = express.Router();
const HopDongController = require('../app/controllers/hopDong.controller');
const {
  verifyToken,
  authorizeRoles,
} = require('../middlewares/auth.middleware');

// 1. Bắt buộc đăng nhập cho tất cả các route hợp đồng
router.use(verifyToken);

// 2. NHÓM ROUTE DÀNH CHO KHÁCH THUÊ (Phải đặt TRƯỚC authorizeRoles('ChuTro', 'QuanLy'))
router.get(
  '/cua-toi',
  authorizeRoles('KhachThue', 'ChuTro', 'QuanLy'),
  HopDongController.layDanhSachHopDongCuaToi
);

router.get(
  '/cua-toi/:maHDT',
  authorizeRoles('KhachThue', 'ChuTro', 'QuanLy'),
  HopDongController.xemChiTietHopDong
);

router.post(
  '/cua-toi/:maHDT/yeu-cau-huy',
  authorizeRoles('KhachThue'),
  HopDongController.yeuCauHuyHopDong
);

// 3. NHÓM ROUTE QUẢN LÝ HỢP ĐỒNG (Chỉ cho phép ChuTro hoặc QuanLy từ dòng này trở xuống)
router.use(authorizeRoles('ChuTro', 'QuanLy'));

router.get('/danh-sach', HopDongController.layDanhSachHopDong);
router.get('/tim-kiem', HopDongController.layDanhSachHopDong);
router.get('/du-lieu-tao-moi', HopDongController.layDuLieuTaoMoi);
router.get('/chi-tiet/:maHDT', HopDongController.xemChiTietHopDong);
router.post('/tao-moi', HopDongController.taoHopDong);
router.put('/cap-nhat/:maHDT', HopDongController.suaHopDong);
router.delete('/xoa/:maHDT', HopDongController.xoaHopDong);

module.exports = router;