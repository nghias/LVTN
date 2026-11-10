// server/src/routes/thanhToan.route.js
const express = require('express');
const router = express.Router();
const ThanhToanController = require('../app/controllers/thanhToan.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

// 1. PUBLIC ROUTE: Nhận tín hiệu xác thực chuyển khoản tự động từ PayOS Webhook
router.get('/webhook', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'PayOS Webhook endpoint đang hoạt động!',
  });
});
router.post('/webhook', ThanhToanController.handlePayOSWebhook);

// 2. PROTECTED ROUTES: Yêu cầu đăng nhập
router.use(verifyToken);

// Thiết lập & Xem thông tin tài khoản nhận thanh toán (PUT chỉ cho phép Chủ trọ)
router.get('/thong-tin', ThanhToanController.getThongTinThanhToan);
router.put('/thong-tin', ThanhToanController.updateThongTinThanhToan);

// Xem danh sách công nợ Hóa đơn & Lịch sử thanh toán (Tự động lọc theo quyền Chủ trọ / Quản lý / Khách thuê)
router.get('/tong-hop', ThanhToanController.getDanhSachVaLichSu);
router.get('/hoa-don/:maHD', ThanhToanController.getChiTietThanhToanHoaDon);

// Thanh toán chuyển khoản tự động qua PayOS & Kiểm tra trạng thái tự động
router.post('/tao-link-payos', ThanhToanController.taoLinkChuyenKhoanPayOS);
router.get('/kiem-tra-payos/:maTT', ThanhToanController.kiemTraTrangThaiPayOS);

// Thanh toán tiền mặt & Xác nhận trả
router.post('/tien-mat/yeu-cau', ThanhToanController.guiYeuCauTraTienMat);
router.post('/xac-nhan-truc-tiep', ThanhToanController.thuTienMatTrucTiep);
router.put('/duyet/:maTT', ThanhToanController.duyetGiaoDichThanhToan);

module.exports = router;