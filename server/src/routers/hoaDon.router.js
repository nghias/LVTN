// server/src/routers/hoaDon.router.js
const express = require('express');
const router = express.Router();

const HoaDonController = require('../app/controllers/hoaDon.controller');
const {
  verifyToken,
  authorizeRoles,
} = require('../middlewares/auth.middleware');

// Yêu cầu đăng nhập cho toàn bộ chức năng Hóa đơn
router.use(verifyToken);

// 1. Lấy dữ liệu tính toán tự động để tạo hóa đơn tháng (Chỉ ChuTro & QuanLy)
router.get(
  '/du-lieu-tao',
  authorizeRoles('ChuTro', 'QuanLy'),
  HoaDonController.getDuLieuTaoHoaDonThang
);

// 2. Tạo hóa đơn hàng tháng (Chỉ ChuTro & QuanLy)
router.post(
  '/tao-hoa-don',
  authorizeRoles('ChuTro', 'QuanLy'),
  HoaDonController.taoHoaDonThang
);

// 3. Xem danh sách hóa đơn (Cho phép cả ChuTro, QuanLy và KhachThue)
router.get(
  '/',
  authorizeRoles('ChuTro', 'QuanLy', 'KhachThue'),
  HoaDonController.getDanhSachHoaDon
);

// 4. Xem chi tiết 1 hóa đơn (Cho phép cả ChuTro, QuanLy và KhachThue)
router.get(
  '/:maHD',
  authorizeRoles('ChuTro', 'QuanLy', 'KhachThue'),
  HoaDonController.getChiTietHoaDon
);

// 5. Sửa hóa đơn (Chỉ ChuTro & QuanLy)
router.put(
  '/:maHD',
  authorizeRoles('ChuTro', 'QuanLy'),
  HoaDonController.suaHoaDon
);

// 6. Xóa hóa đơn (Chỉ ChuTro & QuanLy)
router.delete(
  '/:maHD',
  authorizeRoles('ChuTro', 'QuanLy'),
  HoaDonController.xoaHoaDon
);

module.exports = router;