const express = require('express');
const router = express.Router();
const QuanLyTaiKhoan = require('../app/controllers/QuanLyTaiKhoan');
const upload = require('../app/config/TaiAnh');

router.get('/taikhoan/', QuanLyTaiKhoan.DangXuat);
router.post('/taikhoan/dang-nhap', QuanLyTaiKhoan.DangNhap);
router.get('/taikhoan/lay-du-lieu/:id', QuanLyTaiKhoan.LayDuLieuCapNhat);
router.put('/taikhoan/cap-nhat-thong-tin/:id', upload.single("HinhND"), QuanLyTaiKhoan.CapNhatTaiKhoan);
router.post('/taikhoan/doi-mat-khau/:id', QuanLyTaiKhoan.DoiMatKhau);

module.exports = router;