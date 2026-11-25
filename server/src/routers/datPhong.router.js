// server/src/routers/datPhong.router.js
const express = require("express");
const router = express.Router();
const DatPhongController = require("../app/controllers/datPhong.controller");
const {
  verifyToken,
  authorizeRoles,
} = require("../middlewares/auth.middleware");

// Public (Khách vãng lai không cần đăng nhập)
router.get("/phong/:maPhong", DatPhongController.layThongTinPhongDatCoc);
router.post("/tao-yeu-cau", DatPhongController.taoYeuCauDatCoc);
router.post('/huy-het-han/:orderCode', DatPhongController.huyDonQuaHanQR);
router.get(
  "/kiem-tra-payos/:orderCode",
  DatPhongController.kiemTraThanhToanPayOS,
);
router.get("/hoa-don/:maTraCuu", DatPhongController.layHoaDonDatCoc);
router.get("/hoaDon/:maTraCuu", DatPhongController.layHoaDonDatCoc);

// Quản lý (ChuTro, QuanLy)
router.get(
  "/quan-ly",
  verifyToken,
  authorizeRoles("ChuTro", "QuanLy"),
  DatPhongController.layDanhSachQuanLy,
);
router.put(
  "/:maDP/hoan-coc",
  verifyToken,
  authorizeRoles("ChuTro", "QuanLy"),
  DatPhongController.xacNhanHoanCoc,
);

router.delete(
  "/:maDP",
  verifyToken,
  authorizeRoles("ChuTro", "QuanLy"),
  DatPhongController.xoaDatPhong,
);

module.exports = router;