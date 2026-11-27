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

// 1. Nhóm API cho ESP32
router.post("/iot/quet-the", verifyDeviceKey, TheRaVaoController.iotQuetThe);
router.get("/iot/lenh-ghi", verifyDeviceKey, TheRaVaoController.iotLayLenhGhi);
router.post("/iot/xac-nhan-ghi", verifyDeviceKey, TheRaVaoController.iotXacNhanGhi);

// 2. Nhóm API mở cổng bằng NFC trên điện thoại
router.post(
  "/nfc/mo-cua",
  verifyToken,
  authorizeRoles("KhachThue", "QuanLy", "ChuTro"),
  TheRaVaoController.moCuaBangNFC
);

// 3. Nhóm API cho Người thuê
router.get("/cua-toi", verifyToken, authorizeRoles("KhachThue"), TheRaVaoController.getTheCuaToi);
router.post("/yeu-cau-cap-lai", verifyToken, authorizeRoles("KhachThue"), TheRaVaoController.yeuCauCapLai);

// 4. Nhóm API cho Chủ trọ & Quản lý
router.get("/lich-su", verifyToken, authorizeRoles("ChuTro", "QuanLy"), TheRaVaoController.getLichSuRaVao);
router.get("/danh-sach", verifyToken, authorizeRoles("ChuTro", "QuanLy"), TheRaVaoController.getDanhSachThe);
router.get("/chua-co-the", verifyToken, authorizeRoles("ChuTro", "QuanLy"), TheRaVaoController.getNguoiChuaCoThe);
router.get("/chi-tiet/:maThe", verifyToken, authorizeRoles("ChuTro", "QuanLy"), TheRaVaoController.getChiTietThe);

router.post("/phien-ghi/bat-dau", verifyToken, authorizeRoles("ChuTro", "QuanLy"), TheRaVaoController.batDauPhienGhi);
router.get("/phien-ghi/:sessionId", verifyToken, authorizeRoles("ChuTro", "QuanLy"), TheRaVaoController.getTrangThaiPhienGhi);
router.post("/phien-ghi/:sessionId/huy", verifyToken, authorizeRoles("ChuTro", "QuanLy"), TheRaVaoController.huyPhienGhi);

router.patch("/:maThe/khoa", verifyToken, authorizeRoles("ChuTro", "QuanLy"), TheRaVaoController.khoaThe);
router.delete("/:maThe", verifyToken, authorizeRoles("ChuTro", "QuanLy"), TheRaVaoController.xoaThe);

router.post( "/iot/kiem-tra-mat-khau", verifyDeviceKey, TheRaVaoController.iotKiemTraMatKhau);

module.exports = router;