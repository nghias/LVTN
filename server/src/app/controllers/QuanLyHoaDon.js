const Phong = require('../models/Phong');
const HopDongThue = require('../models/HopDongThue');
const HoaDon = require("../models/HoaDon");
const PhuPhi = require("../models/PhuPhi");
const GiaDienNuoc = require("../models/GiaDienNuoc");
const CSDienNuoc = require("../models/CSDienNuoc");
const { ChuanHoa } = require('../config/ChuanHoa');

class QuanLyHoaDon{
    async HoaDonCuaChuTro(req, res) {
        const dsHoaDonTam = await HoaDon.LayTatCa();
        const dsHoaDon = await Promise.all(dsHoaDonTam.map(async (hd)=>{
            const phong = await Phong.LayBangMaHD(hd.MaHD);
            return {
                ...hd,
                TenPhong: phong.Ten,
                DaKetThuc: HopDongThue.KetThucHDT(hd.MaHDT)
            };
        }))
        if (!dsHoaDon || dsHoaDon.length === 0) {
            return res.render("pages/admin/hoaDon", { empty: true });
        }
        res.render('pages/admin/hoaDon',{dsHoaDon});
    }
    async HoaDonCuaNguoiThue(req, res) {
        const MaND = req.session.user.info.MaND;
        const dsHoaDon = await HoaDon.LayBangMaND(MaND);
        if (!dsHoaDon || dsHoaDon.length === 0) {
            return res.render("pages/user/hoaDon", { empty: true });
        }
        res.render('pages/user/hoaDon', {
            dsHoaDon
        });
    }
    async LayChiTietHoaDon(req, res) {
         try {
            const MaHD = req.params.id;

            const hd = await HoaDon.LayBangMaHD(MaHD);
            const phongTro = await Phong.LayBangMaHD(MaHD); 
            const cs = await CSDienNuoc.LayBangMaCS(hd.MaCS);
            const pp = await PhuPhi.LayBangMaHDT(hd.MaHDT);
            const gia = await GiaDienNuoc.LayBangMaGia(hd.MaGia);
            res.json({
                HoaDon:hd,
                Phong: phongTro,
                CSDN: {...cs},
                PP: JSON.stringify(pp),
                Gia: gia
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Lỗi server' });
        }
    }
    async ThemHoaDon(req, res) {
        try{
            const dsHDT = await HopDongThue.LayTatCaChuaHD();
            if(dsHDT && dsHDT.length==0) return res.status(500).redirect('/admin/hoadon?status=failthem');
            await Promise.all(dsHDT.map(async (hdt)=>{
                const phong = await Phong.LayBangMaHDT(hdt.MaHDT);
                
                const cs = await CSDienNuoc.LayMoiBangMaPhong(phong.MaPhong);

                if(cs && cs.length == 0) return res.status(500).redirect('/admin/hoadon?status=fail');

                const dienTieuThu = parseInt(cs.SoDMoi.toString().replace(/\./g, '')) - parseInt(cs.SoDCu.toString().replace(/\./g, ''));
                const nuocTieuThu = parseInt(cs.SoNMoi.toString().replace(/\./g, '')) - parseInt(cs.SoDCu.toString().replace(/\./g, ''));
                const giaDN = await GiaDienNuoc.LayMoiNhat();
                const giaDien = parseInt(giaDN.GiaDien.toString().replace(/\./g, ''));
                const giaNuoc = parseInt(giaDN.GiaNuoc.toString().replace(/\./g, ''));

                const phuPhi = await PhuPhi.getByMaHDT(hdt.MaHDT);

                let today = new Date();
                const csday = ChuanHoa.ThanhNgay(cs.NgayGhi);
                if(ChuanHoa.SoSanhThangVaNam(csday,today)){
                    today= new Date(csday.getFullYear(),csday.getMonth(),10);
                }

                let tongPhuPhi = 0;
                await Promise.all(phuPhi.map(async (p)=>{
                    tongPhuPhi += parseInt(p.Gia.toString().replace(/\./g, ''))
                }))

                const tongDien = dienTieuThu*giaDien;
                const tongNuoc = nuocTieuThu*giaNuoc;
                const giaPhong = parseInt(phong.Gia.toString().replace(/\./g, ''));

                const data = {
                    MaCS: cs.MaCS,
                    MaHDT: hdt.MaHDT,
                    MaGia: giaDN.MaGia,
                    TienPhong: giaPhong,
                    TienDien: tongDien,
                    TienNuoc: tongNuoc,
                    PhuThu: tongPhuPhi,
                    NgayTinh: today
                }
                await HoaDon.Them(data);

            }))
            res.redirect('/admin/hoadon?status=them');
        }catch (error) {
            res.status(500).redirect('/admin/hoadon?status=fail');
        }
    }
    async XoaHoaDon(req, res) {
        try{
            const MaHD = req.params.id;
            await HoaDon.Xoa(MaHD);
            res.redirect('/admin/hoadon?status=xoa');
        }catch (error) {
            res.status(500).redirect('/admin/hoadon?status=fail');
        }
    }
    async XacNhanTraTuChuTro(req, res) {
        try{
            const MaHD = req.params.id;
            await HoaDon.XacNhanTraTuChuTro(MaHD);
            res.redirect('/admin/hoadon?status=xntra&highlight='+MaHD);
        }catch (error) {
            res.status(500).redirect('/admin/hoadon?status=fail');
        }
    }
    async XacNhanTraTuNguoiThue(req, res) {
        try{
            const MaHD = req.params.id;
            await HoaDon.XacNhanTraTuNguoiThue(MaHD);
            res.redirect('/user/hoadon?status=xntra&highlight='+MaHD);
        }catch (error) {
            res.status(500).redirect('/user/hoadon?status=fail');
        }
    }
    async TaoMaChuyenKhoan(req, res) {
         try {
            const MaHD = req.params.id;

            const hd = await HoaDon.LayBangMaHD(MaHD);
            const phongTro = await Phong.LayBangMaHD(MaHD);
            res.json({
                NgayTinh:hd.NgayTinh,
                TenPhong: phongTro.Ten,
                TienTT: parseInt(hd.TongTien.toString().replace(/\./g, ''))
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Lỗi server' });
        }
    }
}
module.exports = new QuanLyHoaDon