const express = require('express');
const router = express.Router();
const QuanLyHopDongThue = require('../app/controllers/QuanLyHopDongThue');
const QuanLyHoaDon = require('../app/controllers/QuanLyHoaDon');
const XacThuc = require('../middlewares/XacThuc');
const QuanLyThongBao = require('../app/controllers/QuanLyThongBao');

router.get('/hoadon/tao-ma-chuyen-khoan/:id', XacThuc.LaNguoiThue , QuanLyHoaDon.TaoMaChuyenKhoan);
router.get('/hoadon/lay-chit-tiet/:id', XacThuc.LaNguoiThue, QuanLyHoaDon.LayChiTietHoaDon);
router.get('/hoadon', XacThuc.LaNguoiThue , QuanLyHoaDon.HoaDonCuaNguoiThue);
router.post('/hoadon/xac-nhan-tra/:id', XacThuc.LaNguoiThue , QuanLyHoaDon.XacNhanTraTuNguoiThue);

router.get('/hopdong', XacThuc.LaNguoiThue , QuanLyHopDongThue.HopDongCuaNguoiThue);

router.get('/thongbao/lay-du-lieu-soan-thong-bao', XacThuc.LaNguoiThue, QuanLyThongBao.LayDuLieuSoanThongBao);
router.get('/thongbao/lay-du-lieu-nguoi-nhan/:id', XacThuc.LaNguoiThue, QuanLyThongBao.LayThongBaoCuaNDNhan);
router.get('/thongbao/chi-tiet-thong-bao/:id', XacThuc.LaNguoiThue, QuanLyThongBao.ChiTietThongBao);
router.get('/thongbao/:id', XacThuc.LaNguoiThue, QuanLyThongBao.ThongBao);
router.post('/thongbao/tra-loi-thong-bao/:id', XacThuc.LaNguoiThue, QuanLyThongBao.TraLoiThongBao);
router.post('/thongbao/them-thong-bao/:id', XacThuc.LaNguoiThue, QuanLyThongBao.ThemThongBao);
router.put('/thongbao/da-doc-nhieu-thong-bao/:id', XacThuc.LaNguoiThue, QuanLyThongBao.DanhDauDaDocNhieuThongBao);
router.put('/thongbao/da-doc-thong-bao/:id', XacThuc.LaNguoiThue, QuanLyThongBao.DanhDauDaDocThongBao);
router.put('/thongbao/chua-doc-thong-bao/:id', XacThuc.LaNguoiThue, QuanLyThongBao.DanhDauChuaDocThongBao);
router.delete('/thongbao/xoa-nhieu-thong-bao/:id', XacThuc.LaNguoiThue, QuanLyThongBao.XoaNhieuThongBao);
router.delete('/thongbao/xoa-thong-bao/:id', XacThuc.LaNguoiThue, QuanLyThongBao.XoaThongBao);

module.exports = router;