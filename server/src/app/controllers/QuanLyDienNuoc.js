const Phong = require('../models/Phong');
const HoaDon = require("../models/HoaDon");
const GiaDienNuoc = require("../models/GiaDienNuoc");
const CSDienNuoc = require("../models/CSDienNuoc");

class QuanLyDienNuoc{
    async DienNuoc(req, res) {
        const TuKhoa = req.query.searchDN || "";
        let dsCSDN;
        if(TuKhoa.trim()===""){
            dsCSDN = await CSDienNuoc.TimKiem(TuKhoa);
        }else{
            dsCSDN = await CSDienNuoc.LayTatCa();
        }
        const dsdn = await Promise.all(dsCSDN.map(async (csdn)=>{
            const phong = await Phong.LayBangMaPhong(csdn.MaPhong);
            const dh = await HoaDon.LayBangMaCS(csdn.MaCS);
            return {
                ...csdn,
                TenPhong: phong.Ten,
                DangXoa: (phong.Ten)?false:true,
                DangSua: (!dh.MaHD)
            };
        }))
        const giaDN = await GiaDienNuoc.LayMoiNhat(); 
        const dsPhong = await Phong.LayDSPhongDaThueChuaCS();
        if (!dsCSDN || dsCSDN.length === 0) {
            return res.render("pages/admin/dienNuoc", { empty: true });
        }
        res.render('pages/admin/dienNuoc',{
            dsCSDN,
            giaDN,
            dsPhong,
            PhongDangTrong: (dsPhong.length===0)
        });
    }
    async LayDuLieuSuaDienNuoc(req, res) {
        try {
            const MaCS = req.params.id;
            const csdn = await CSDienNuoc.LayBangMaCS(MaCS);
            
            res.json({
                CSDN: csdn
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Lỗi server' });
        }
    }
    async KiemTraDienNuoc(req, res) {
        try {
            const MaPhong = req.params.id;
            const csdn = await CSDienNuoc.LayMoiBangMaPhong(MaPhong);
            
            res.json({
                CSDN: csdn
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Lỗi server' });
        }
    }
    async ThemCSDienNuoc(req, res) {
        try {
            if(CSDienNuoc.KiemTraCoChiSo() > 0){
                return res.status(500).redirect('/admin/diennuoc?status=failthem');
            }
            const jsonString = req.body.dataJson;
            
            const dsDuLieu = JSON.parse(jsonString);

            for (const duLieu of dsDuLieu) {
                if(duLieu.MaPhong && duLieu.SoDMoi && duLieu.SoNMoi) {
                    const csdn = await CSDienNuoc.LayMoiBangMaPhong(duLieu.MaPhong);
                    let data;
                    if (!csdn || csdn.length === 0) {
                        data = {
                            MaPhong: duLieu.MaPhong,
                            SoDCu: 0,
                            SoDMoi: duLieu.SoDMoi,
                            SoNCu: 0,
                            SoNMoi: duLieu.SoNMoi
                        }
                    }else{
                        data = {
                            MaPhong: duLieu.MaPhong,
                            SoDCu: csdn.SoDCu,
                            SoDMoi: duLieu.SoDMoi,
                            SoNCu: csdn.SoNCu,
                            SoNMoi: duLieu.SoNMoi
                        }
                    }
                    await CSDienNuoc.Them(data);
                }
            }

            res.redirect('/admin/diennuoc?status=them');

        } catch (error) {
            res.status(500).redirect('/admin/diennuoc?status=fail');
        }
    }
    async ThemGiaDienNuoc(req, res) {
        try {
            let giaDienGoc = req.body.giaDien; 
            let giaNuocGoc = req.body.giaNuoc; 

            const giaDienChuan = parseInt(giaDienGoc.toString().replace(/\./g, '')); 
            const giaNuocChuan = parseInt(giaNuocGoc.toString().replace(/\./g, ''));
            const data = {
                GiaDien: giaDienChuan,
                GiaNuoc: giaNuocChuan
            }
            
            await GiaDienNuoc.Them(data);

            res.redirect('/admin/diennuoc?status=themgia');

        } catch (error) {
            res.status(500).redirect('/admin/diennuoc?status=fail');
        }
    }
    async SuaCSDienNuoc(req, res) {
        try {
            const MaCS = req.params.id;
            const csDMoi = req.body.CSDM;
            const csNMoi = req.body.CSNM;
            const data = {
                SoDMoi: parseInt(csDMoi.toString().replace(/\./g, '')),
                SoNMoi: parseInt(csNMoi.toString().replace(/\./g, ''))
            }
            
            await CSDienNuoc.Sua(MaCS,data);

            res.redirect('/admin/diennuoc?status=sua&highlight='+MaCS);

        } catch (error) {
            res.status(500).redirect('/admin/diennuoc?status=fail');
        }
    }
    async XoaCSDienNuoc(req, res) {
        try {
            const MaCS = req.params.id;
            
            await CSDienNuoc.Xoa(MaCS);

            res.redirect('/admin/diennuoc?status=xoa');

        } catch (error) {
            res.status(500).redirect('/admin/diennuoc?status=fail');
        }
    }
    async XoaCSDienNuocTheoNgay(req, res) {
        try {
            const MaCS = req.params.id;
            const dn=await CSDienNuoc.LayBangMaCS(MaCS);
            const phan = (dn.NgayGhi).split('/');

            const ngay = `${phan[2]}-${phan[1]}-${phan[0]}`;
            await CSDienNuoc.XoaBangNgayGhi(ngay);

            res.redirect('/admin/diennuoc?status=xoa');

        } catch (error) {
            res.status(500).redirect('/admin/diennuoc?status=fail');
        }
    }
}
module.exports = new QuanLyDienNuoc