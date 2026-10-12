const express = require('express');
const router = express.Router();
const QuanLyThongKe = require('../app/controllers/QuanLyThongKe');
const QuanLyPhongTro = require('../app/controllers/QuanLyPhongTro');
const QuanLyNguoiDung = require('../app/controllers/QuanLyNguoiDung');
const QuanLyHopDongThue = require('../app/controllers/QuanLyHopDongThue');
const QuanLyPhuPhi = require('../app/controllers/QuanLyPhuPhi');
const QuanLyDienNuoc = require('../app/controllers/QuanLyDienNuoc');
const QuanLyHoaDon = require('../app/controllers/QuanLyHoaDon');
const QuanLyThongBao = require('../app/controllers/QuanLyThongBao');

const XacThuc = require('../middlewares/XacThuc');
const upload = require('../app/config/TaiAnh');

router.get('/hoadon/lay-chi-tiet/:id', XacThuc.LaChuTro, QuanLyHoaDon.LayChiTietHoaDon);
router.get('/hoadon', XacThuc.LaChuTro, QuanLyHoaDon.HoaDonCuaChuTro);
router.post('/hoadon/xac-nhan-tra/:id', XacThuc.LaChuTro, QuanLyHoaDon.XacNhanTraTuChuTro);
router.post('/hoadon/them', XacThuc.LaChuTro, QuanLyHoaDon.ThemHoaDon);
router.delete('/hoadon/xoa/:id', XacThuc.LaChuTro, QuanLyHoaDon.XoaHoaDon);

router.get('/diennuoc/lay-du-lieu-sua/:id', XacThuc.LaChuTro, QuanLyDienNuoc.LayDuLieuSuaDienNuoc);
router.get('/diennuoc/kiem-tra/:id', XacThuc.LaChuTro, QuanLyDienNuoc.KiemTraDienNuoc);
router.get('/diennuoc', XacThuc.LaChuTro, QuanLyDienNuoc.DienNuoc);
router.post('/dienuoc/cap-nhat-gia', XacThuc.LaChuTro, QuanLyDienNuoc.ThemGiaDienNuoc);
router.post('/diennuoc/them', XacThuc.LaChuTro, QuanLyDienNuoc.ThemCSDienNuoc);
router.put('/diennuoc/sua/:id', XacThuc.LaChuTro, QuanLyDienNuoc.SuaCSDienNuoc);
router.delete('/diennuoc/xoa-theo-ngay/:id', XacThuc.LaChuTro, QuanLyDienNuoc.XoaCSDienNuocTheoNgay);
router.delete('/diennuoc/xoa/:id', XacThuc.LaChuTro, QuanLyDienNuoc.XoaCSDienNuoc);


router.get('/phuphi/lay-du-lieu-sua/:id', XacThuc.LaChuTro, QuanLyPhuPhi.LayDuLieuSuaPhuPhi);
router.get('/phuphi/lay-du-lieu-tao', XacThuc.LaChuTro, QuanLyPhuPhi.LayDuLieuTaoPhuPhi);
router.get('/phuphi', XacThuc.LaChuTro, QuanLyPhuPhi.PhuPhi);
router.post('/phuphi/them', XacThuc.LaChuTro, QuanLyPhuPhi.ThemPhuPhi);
router.put('/phuphi/sua/:id', XacThuc.LaChuTro, QuanLyPhuPhi.SuaPhuPhi);
router.delete('/phuphi/xoa/:id', XacThuc.LaChuTro, QuanLyPhuPhi.XoaPhuPhi);


router.get('/hopdong/lay-du-lieu-tao', XacThuc.LaChuTro, QuanLyHopDongThue.LayDuLieuTaoHopDong);
router.get('/hopdong/lay-du-lieu-sua/:id', XacThuc.LaChuTro, QuanLyHopDongThue.LayDuLieuSuaHopDong);
router.get('/hopdong', XacThuc.LaChuTro, QuanLyHopDongThue.HopDongCuaChuTro);
router.get('/hopdong/lay-du-lieu/:id', XacThuc.LaChuTro, QuanLyHopDongThue.LayHopDong);
router.post('/hopdong/them', XacThuc.LaChuTro, QuanLyHopDongThue.ThemHopDong);
router.put('/hopdong/ket-thuc/:id', XacThuc.LaChuTro, QuanLyHopDongThue.KetThucHopDong);
router.put('/hopdong/sua/:id', XacThuc.LaChuTro, QuanLyHopDongThue.SuaHopDong);
router.delete('/hopdong/xoa/:id', XacThuc.LaChuTro, QuanLyHopDongThue.XoaHopDong);

router.get('/nguoidung', XacThuc.LaChuTro, QuanLyNguoiDung.NguoiDung);
router.post('/nguoidung/dat-lai-mat-khau/:id', XacThuc.LaChuTro, QuanLyNguoiDung.DatLaiMatKhau);
router.get('/nguoidung/lay-du-lieu/:id', XacThuc.LaChuTro, QuanLyNguoiDung.LayThongTinNguoiDung);
router.post('/nguoidung/them', upload.single("HinhND"), XacThuc.LaChuTro, QuanLyNguoiDung.ThemNguoiDung);
router.put('/nguoidung/sua/:id', upload.single("HinhND"), XacThuc.LaChuTro, QuanLyNguoiDung.SuaNguoiDung);
router.delete('/nguoidung/xoa/:id', XacThuc.LaChuTro, QuanLyNguoiDung.XoaNguoiDung);

router.get('/phongtro', XacThuc.LaChuTro, QuanLyPhongTro.PhongTro);
router.get('/phongtro/lay-du-lieu/:id', XacThuc.LaChuTro, QuanLyPhongTro.LayThongTinPhong);
router.post('/phongtro/them', upload.single("HinhPhong"), XacThuc.LaChuTro, QuanLyPhongTro.ThemPhongTro);
router.put('/phongtro/sua/:id', upload.single("HinhPhong"), XacThuc.LaChuTro, QuanLyPhongTro.SuaPhongTro);
router.delete('/phongtro/xoa/:id', XacThuc.LaChuTro, QuanLyPhongTro.XoaPhongTro);

router.get('/thongbao/lay-du-lieu-soan-thong-bao', XacThuc.LaChuTro, QuanLyThongBao.LayDuLieuSoanThongBao);
router.get('/thongbao/lay-du-lieu-nguoi-nhan/:id', XacThuc.LaChuTro, QuanLyThongBao.LayThongBaoCuaNDNhan);
router.get('/thongbao/chi-tiet-thong-bao/:id', XacThuc.LaChuTro, QuanLyThongBao.ChiTietThongBao);
router.get('/thongbao/:id', XacThuc.LaChuTro, QuanLyThongBao.ThongBao);
router.post('/thongbao/tra-loi-thong-bao/:id', XacThuc.LaChuTro, QuanLyThongBao.TraLoiThongBao);
router.post('/thongbao/them-thong-bao/:id', XacThuc.LaChuTro, QuanLyThongBao.ThemThongBao);
router.put('/thongbao/da-doc-nhieu-thong-bao/:id', XacThuc.LaChuTro, QuanLyThongBao.DanhDauDaDocNhieuThongBao);
router.put('/thongbao/da-doc-thong-bao/:id', XacThuc.LaChuTro, QuanLyThongBao.DanhDauDaDocThongBao);
router.put('/thongbao/chua-doc-thong-bao/:id', XacThuc.LaChuTro, QuanLyThongBao.DanhDauChuaDocThongBao);
router.delete('/thongbao/xoa-nhieu-thong-bao/:id', XacThuc.LaChuTro, QuanLyThongBao.XoaNhieuThongBao);
router.delete('/thongbao/xoa-thong-bao/:id', XacThuc.LaChuTro, QuanLyThongBao.XoaThongBao);

router.get('/thongke/thanh-toan', XacThuc.LaChuTro, QuanLyThongKe.LayDuLieuThongKeThanhToan);
router.get('/thongke/lay-du-lieu', XacThuc.LaChuTro, QuanLyThongKe.LayDuLieuThongKe);
router.get('/thongke', XacThuc.LaChuTro, QuanLyThongKe.ThongKe);

module.exports = router;