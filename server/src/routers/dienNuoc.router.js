// server/src/routers/dienNuoc.router.js
const express = require('express');
const router = express.Router();

const DienNuocController = require('../app/controllers/dienNuoc.controller');
const {
  verifyToken,
  authorizeRoles,
} = require('../middlewares/auth.middleware');

router.get('/gia/public', DienNuocController.getDanhSachGia);

router.use(verifyToken);
router.use(authorizeRoles('ChuTro', 'QuanLy'));

// 1. Lấy dữ liệu khởi tạo (Khu trọ, Phòng kèm chỉ số cũ khóa cứng & trạng thái ghi tháng)
router.get('/options', DienNuocController.getOptions);

// 2. Quản lý Đơn giá điện nước (GiaDienNuoc)
router.get('/gia', DienNuocController.getDanhSachGia);
router.post('/gia', DienNuocController.capNhatGiaDienNuoc);
router.put('/gia/:maGia', DienNuocController.suaGiaDienNuoc);
router.delete('/gia/:maGia', DienNuocController.xoaGiaDienNuoc);

// 3. Quản lý Chỉ số điện nước (ChiSoDienNuoc)
router.get('/', DienNuocController.getDanhSachChiSo);
router.get('/chi-so/:maCS', DienNuocController.getChiTietChiSo);
router.post('/chi-so', DienNuocController.themChiSo);
router.post('/chi-so/hang-loat', DienNuocController.themNhieuChiSo);
router.put('/chi-so/:maCS', DienNuocController.suaChiSo);
router.delete('/chi-so/:maCS', DienNuocController.xoaChiSo);

module.exports = router;