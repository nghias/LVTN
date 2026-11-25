// server/src/routers/theRaVao.router.js
const express = require("express");
const router = express.Router();
const TheRaVaoController = require("../app/controllers/theRaVao.controller");
const { verifyToken, authorizeRoles } = require("../middlewares/auth.middleware");

const verifyDeviceKey = (req, res, next) => {
  const key = req.headers["x-device-key"];
  if (!key || key !== process.env.IOT_DEVICE_KEY) {
    return res.status(401).json({ allow: false, message: "Device API Key không hợp lệ." });
  }
  next();
};

// Nhóm API cho ESP32
router.post("/iot/quet-the", verifyDeviceKey, TheRaVaoController.iotQuetThe);
router.get("/iot/lenh-ghi", verifyDeviceKey, TheRaVaoController.iotLayLenhGhi);
router.post("/iot/xac-nhan-ghi", verifyDeviceKey, TheRaVaoController.iotXacNhanGhi);

// Nhóm API cho Người thuê (KhachThue)
router.get("/cua-toi", verifyToken, authorizeRoles("KhachThue"), TheRaVaoController.getTheCuaToi);
router.post("/yeu-cau-cap-lai", verifyToken, authorizeRoles("KhachThue"), TheRaVaoController.yeuCauCapLai);

// Nhóm API cho Chủ trọ & Quản lý
router.get("/danh-sach", verifyToken, authorizeRoles("ChuTro", "QuanLy"), TheRaVaoController.getDanhSachThe);
router.post("/cap-lai", verifyToken, authorizeRoles("ChuTro", "QuanLy"), TheRaVaoController.capLaiThe);
router.patch("/:maThe/khoa", verifyToken, authorizeRoles("ChuTro", "QuanLy"), TheRaVaoController.khoaThe);
router.get("/lich-su", verifyToken, authorizeRoles("ChuTro", "QuanLy"), TheRaVaoController.getLichSuRaVao);

module.exports = router;