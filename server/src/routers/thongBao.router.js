// server/src/routes/thongBao.route.js
const express = require("express");
const router = express.Router();
const ThongBaoController = require("../app/controllers/thongBao.controller");
const { verifyToken } = require("../middlewares/auth.middleware");

router.use(verifyToken);

// Các route tĩnh phải đặt trước route có :maTB
router.get("/metadata", ThongBaoController.getMetadata);
router.get("/cua-toi", ThongBaoController.getThongBaoCuaToi);
router.post("/phan-anh", ThongBaoController.taoPhanAnhKhachThue);
router.patch("/da-doc-tat-ca", ThongBaoController.danhDauDaDocTatCa);

router.get("/", ThongBaoController.getDanhSach);
router.post("/", ThongBaoController.taoThongBao);

router.get("/:maTB/chi-tiet", ThongBaoController.getChiTiet);
router.post("/:maTB/tra-loi", ThongBaoController.traLoiThongBao);
router.patch("/:maTB/da-doc", ThongBaoController.danhDauDaDoc);
router.delete("/:maTB", ThongBaoController.xoaThongBao);

module.exports = router;