// server/src/routers/phongTro.router.js
const express = require('express');
const router = express.Router();

const PhongTroController = require('../app/controllers/phongTro.controller');
const {
  verifyToken,
  authorizeRoles,
} = require('../middlewares/auth.middleware');
const { uploadAnhPhong } = require('../app/config/cloudinary.config');

// ==========================================
// 1. ROUTES CÔNG KHAI - KHÔNG CẦN ĐĂNG NHẬP
// ==========================================
router.get('/public/home-init', PhongTroController.getPublicHomeInit);
router.get('/public/home-data', PhongTroController.getHomeData);
router.get('/public/tin-dang', PhongTroController.getPublicTinDangHome);
router.get('/public/phong', PhongTroController.getPublicPhongList);
router.get('/public/phong/:maPhong', PhongTroController.getPublicPhongDetail);

// ==========================================
// 2. ROUTES QUẢN LÝ PHÒNG TRỌ - CẦN ĐĂNG NHẬP
// ==========================================
router.use(verifyToken);
router.use(authorizeRoles('ChuTro', 'QuanLy'));

// Tiện ích
router.get('/tien-ich', PhongTroController.getAllTienIch);

// Phòng trọ
router.get('/phong', PhongTroController.getPhongList);
router.get('/phong/:maPhong', PhongTroController.getPhongDetail);

router.post(
  '/phong',
  uploadAnhPhong.array('anhPhong', 8),
  PhongTroController.createPhong
);

router.put(
  '/phong/:maPhong',
  uploadAnhPhong.array('anhPhong', 8),
  PhongTroController.updatePhong
);

router.delete('/phong/:maPhong', PhongTroController.deletePhong);

module.exports = router;