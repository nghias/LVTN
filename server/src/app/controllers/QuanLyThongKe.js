const Phong = require('../models/Phong');
const NguoiDung = require('../models/NguoiDung');
const HoaDon = require("../models/HoaDon");


class QuanLyThongKe{
    async ThongKe(req, res) {
        res.render('pages/admin/thongKe');
    }
    async LayDuLieuThongKe(req, res){
        try {
            const dsHD = await HoaDon.ThongKeHoaDon();
            const tkPhong = await Phong.ThongKePhong();
            const tkND = await NguoiDung.ThongKeNguoiDung();
            res.json({
                dsHD,
                Phong: tkPhong,
                NguoiDung: tkND
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Lỗi server' });
        }
    }
    async LayDuLieuThongKeThanhToan(req, res){
        try {
            const { thang, nam } = req.query
            const ThanhToan = await HoaDon.ThongKeThanhToan(thang,nam);
            res.json({
                ThanhToan
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Lỗi server' });
        }
    }
}
module.exports = new QuanLyThongKe