// server/src/routers/phongTro.router.js
const express = require("express");
const router = express.Router();

const PhongTroController = require("../app/controllers/phongTro.Controller");
const {
  verifyToken,
  authorizeRoles,
} = require("../middlewares/auth.middleware");
const { uploadAnhPhong } = require("../app/config/cloudinary.config");

// ==========================================
// 1. ROUTES CÔNG KHAI - KHÔNG CẦN ĐĂNG NHẬP
// Dành cho trang chủ và người tìm phòng
// ==========================================

router.get("/public/home-init", PhongTroController.getPublicHomeInit);
router.get("/public/home-data", PhongTroController.getHomeData);
router.get("/public/tin-dang", PhongTroController.getPublicTinDangHome); // API riêng cho tin đăng trang Home
router.get("/public/phong", PhongTroController.getPublicPhongList);
router.get("/public/phong/:maPhong", PhongTroController.getPublicPhongDetail);

// ==========================================
// 2. ROUTES QUẢN LÝ - CẦN ĐĂNG NHẬP
// Chỉ ChuTro hoặc QuanLy được truy cập
// ==========================================

router.use(verifyToken);
router.use(authorizeRoles("ChuTro", "QuanLy"));

// Khu trọ
router.get("/khu-tro", PhongTroController.getKhuTroList);
router.get("/khu-tro/:maKhu", PhongTroController.getKhuTroDetail);
router.get("/quan-ly-list", PhongTroController.getDanhSachQuanLy);
router.post("/khu-tro", PhongTroController.createKhuTro);
router.put("/khu-tro/:maKhu", PhongTroController.updateKhuTro);
router.delete("/khu-tro/:maKhu", PhongTroController.deleteKhuTro);

// Tiện ích
router.get("/tien-ich", PhongTroController.getAllTienIch);

// Phòng trọ
router.get("/phong", PhongTroController.getPhongList);
router.get("/phong/:maPhong", PhongTroController.getPhongDetail);

router.post(
  "/phong",
  uploadAnhPhong.array("anhPhong", 8),
  PhongTroController.createPhong,
);

router.put(
  "/phong/:maPhong",
  uploadAnhPhong.array("anhPhong", 8),
  PhongTroController.updatePhong,
);

router.delete("/phong/:maPhong", PhongTroController.deletePhong);

module.exports = router;