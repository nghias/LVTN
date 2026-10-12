const Phong = require('../models/Phong');
const HopDongThue = require('../models/HopDongThue');
const CTPhuPhi = require('../models/CTPhuPhi');
const PhuPhi = require("../models/PhuPhi");

class QuanLyPhuPhi{
    async PhuPhi(req, res) {
        const search = req.query.searchPP || "";
        let dsPhuPhi;
        if(search.trim()===""){
            dsPhuPhi = await PhuPhi.LayTatCa();
        }else{
            dsPhuPhi = await PhuPhi.TimKiem(search);
        }
        if (!dsPhuPhi || dsPhuPhi.length === 0) {
            return res.render("pages/admin/phuPhi", { empty: true });
        }
        res.render('pages/admin/phuPhi',{dsPhuPhi});
    }
    async LayDuLieuTaoPhuPhi(req, res) {
        try {
            const phongTro = await Phong.LayPhongDaThue(); 
            
            res.json({
                dsPhong: phongTro,
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Lỗi server' });
        }
    }
    async LayDuLieuSuaPhuPhi(req, res) {
        try {
            const MaPP = req.params.id;
            const pp = await PhuPhi.LayBangMaPP(MaPP);
            let rawPhongTro = await Phong.LayDSPhongBangMaPP(MaPP);
            let rawPhongTroDT = await Phong.LayDSPhongBangMaPPVaDangThue(MaPP);

            const ChuyenMang = (data) => {
                if (!data) return []; 
                return Array.ChuyenMang(data) ? data : [data];
            };

            // 3. Áp dụng chuẩn hóa
            const phongTro = ChuyenMang(rawPhongTro);
            const phongTroDT = ChuyenMang(rawPhongTroDT);

             const phongTro_DaDanhDau = phongTro.map(item => ({
                ...item,
                isSelected: true 
            }));
            
            const phongTroDT_DaDanhDau = phongTroDT.map(item => ({
                ...item,
                isSelected: false
            }));
            
            const ds = [...phongTro_DaDanhDau,...phongTroDT_DaDanhDau];
            
            res.json({
                dsPhong: ds,
                PP: pp
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Lỗi server' });
        }
    }
    async ThemPhuPhi(req, res){
        try {
            const data = {
                TenPP: req.body.TenPP,
                Gia:  req.body.GiaPP,
                GhiChu: req.body.GhiChuPP
            }
            const pp = await PhuPhi.Them(data);
            let dsP = req.body.PhongPP || []; 
            if (!Array.isArray(dsP)) {
                dsP = [dsP];
            }

           // Kiểm tra xem có dữ liệu không
            if (dsP.length > 0) {
                await Promise.all(dsP.map(async (map) => {
                    const hdt = await HopDongThue.LayBangMaPhong(map);
                    const dt = {
                        MaPP: pp.MaPP, 
                        MaHDT: hdt.MaHDT
                    };
                    
                    await CTPhuPhi.Them(dt);
                }));
            }
            return res.redirect('/admin/phuphi?status=them&highlight='+pp.MaPP);
        } catch (error) {
            res.status(500).redirect('/admin/phuphi?status=fail');
        }
    }
    async SuaPhuPhi(req, res){
        try {
            const MaPP = req.params.id;
            const data = {
                TenPP: req.body.TenPP,
                Gia:  req.body.GiaPP,
                GhiChu: req.body.GhiChuPP
            }
            const pp = await PhuPhi.Sua(MaPP, data);
            let dsP = req.body.PhongPP || []; 
            if (!Array.isArray(dsP)) {
                dsP = [dsP];
            }
            await CTPhuPhi.delete(MaPP);
           // Kiểm tra xem có dữ liệu không
            if (dsP.length > 0) {
                await Promise.all(dsP.map(async (map) => {
                    const hdt = await HopDongThue.LayBangMaPhong(map);
                    const dt = {
                        MaPP: MaPP, 
                        MaHDT: hdt.MaHDT
                    };
                    await CTPhuPhi.Them(dt);
                }));
            }
            return res.redirect('/admin/phuphi?status=sua&highlight='+MaPP);
        } catch (error) {
            console.log(error)
            res.status(500).redirect('/admin/phuphi?status=fail');
        }
    }
    async XoaPhuPhi(req, res){
        try {
            const MaPP = req.params.id;
            await CTPhuPhi.Xoa(MaPP);
            await PhuPhi.Xoa(MaPP);
            return res.redirect('/admin/phuphi?status=xoa');
        } catch (error) {
            res.status(500).redirect('/admin/phuphi?status=fail');
        }
    }
}
module.exports = new QuanLyPhuPhi