const express = require('express');
const router = express.Router();
const PhongTroController = require('../app/controllers/PhongTroController');
const { verifyToken, authorizeRoles } = require('../middlewares/auth.middleware');
const { uploadAnhPhong } = require('../app/config/cloudinary.config');

// Yêu cầu đăng nhập và chỉ cho phép ChuTro hoặc QuanLy truy cập
router.use(verifyToken);
router.use(authorizeRoles('ChuTro', 'QuanLy'));

// 1. Routes Khu trọ
router.get('/khu-tro', PhongTroController.getKhuTroList);
router.get('/khu-tro/:maKhu', PhongTroController.getKhuTroDetail);
router.get('/quan-ly-list', PhongTroController.getDanhSachQuanLy);
router.post('/khu-tro', PhongTroController.createKhuTro);
router.put('/khu-tro/:maKhu', PhongTroController.updateKhuTro);
router.delete('/khu-tro/:maKhu', PhongTroController.deleteKhuTro);

// 2. Routes Tiện ích
router.get('/tien-ich', PhongTroController.getAllTienIch);

// 3. Routes Phòng trọ (Upload tối đa 8 ảnh lên Cloudinary mỗi lần)
router.get('/phong', PhongTroController.getPhongList);
router.get('/phong/:maPhong', PhongTroController.getPhongDetail);
router.post('/phong', uploadAnhPhong.array('anhPhong', 8), PhongTroController.createPhong);
router.put('/phong/:maPhong', uploadAnhPhong.array('anhPhong', 8), PhongTroController.updatePhong);
router.delete('/phong/:maPhong', PhongTroController.deletePhong);

module.exports = router;