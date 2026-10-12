const Phong = require('../models/Phong');
const NguoiDung = require('../models/NguoiDung');
const HopDongThue = require('../models/HopDongThue');
const CTHopDongThue = require('../models/CTHopDongThue');
const GiaDienNuoc = require("../models/GiaDienNuoc");
const {ChuanHoa} = require('../config/ChuanHoa');

class QuanLyHopDongThue{
    async HopDongCuaChuTro(req, res) {
        const tuKhoa = req.query.searchHDT || "";
        let hopDongThue;
        if(tuKhoa.trim()===""){
            hopDongThue = await HopDongThue.LayTatCa();
        }else{
            hopDongThue = await HopDongThue.TimKiem(tuKhoa);
        }
        if (!hopDongThue || hopDongThue.length === 0) {
            return res.render("pages/admin/hopDong", { empty: true });
        }

        const year = new Date().getFullYear();
        const month = String(new Date().getMonth() + 1).padStart(2, '0'); 
        const day = String(new Date().getDate()).padStart(2, '0');
        const today = `${year}-${month}-${day}`;

        let dsHDT = await Promise.all(hopDongThue.map(async (hd) => {
            // hd bây giờ là một object cụ thể trong mảng
            const nguoiDung = await NguoiDung.LayBangMaHDT(hd.MaHDT);
            const phongTro = await Phong.LayBangMaPhong(hd.MaPhong);
            const giaDN = await GiaDienNuoc.LayMoiNhat();

            return {
                MaHDT: hd.MaHDT,
                NgayBD: hd.NgayBD,
                NgayKT: hd.NgayKT,
                NguoiDung: nguoiDung,
                Phong: phongTro,
                GiaDien: giaDN.GiaDien,
                GiaNuoc: giaDN.GiaNuoc,
                Trangthai: (ChuanHoa.ThanhNgay(hd.NgayKT) > ChuanHoa.ThanhNgay(today))
            };
        }));
        
        res.render('pages/admin/hopDong',{
            dsHDT,
            tuKhoa
        });
    }
    async HopDongCuaNguoiThue(req, res) {
        const hopDongThue = await HopDongThue.LayBangMaND(req.session.user.info.MaND);
        const dsHDT = await Promise.all(hopDongThue.map(async (hd) => {

            // hd bây giờ là một object cụ thể trong mảng
            const nguoiDung = await NguoiDung.LayBangMaHDT(hd.MaHDT);
            const phongTro = await Phong.LayBangMaPhong(hd.MaPhong);
            const giaDN = await GiaDienNuoc.LayBangMaHDT(hd.MaHDT);

            // Trả về object đã gộp đủ thông tin
            return {
                MaHDT: hd.MaHDT,
                NgayBD: hd.NgayBD,
                NgayKT: hd.NgayKT,
                NguoiDung: nguoiDung,
                Phong: phongTro,
                GiaDien: giaDN.GiaDien,
                GiaNuoc: giaDN.GiaNuoc
            };
        }));
        if (!dsHDT || dsHDT.length === 0) {
            return res.render("pages/user/hopDong", { empty: true });
        }
        res.render('pages/user/hopDong', {
            dsHDT
        });
    }
    async LayDuLieuTaoHopDong(req, res) {
        try {
            // 1. Lấy danh sách phòng (thường là phòng còn trống)
            const phongTro = await Phong.LayDSPhongTrong(); 
            
            // 2. Lấy danh sách người dùng (vai trò người thuê)
            const nguoiThue = await NguoiDung.LayDSNguoiDungChuaThue(); 

            // 3. Trả về JSON gồm 2 danh sách này
            res.json({
                PhongTro: phongTro,
                NguoiDung: nguoiThue
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Lỗi server' });
        }
    }
    async LayDuLieuSuaHopDong(req, res) {
        try {
            const MaHDT = req.params.id;
            const ChuyenThanhMang = (data) => {
                if (!data) return []; 
                return Array.isArray(data) ? data : [data]; 
            }

            const hdt = await HopDongThue.LayBangMaHDT(MaHDT); 

            const dsTatCaPhongGoc = await Phong.LayBangMaHDT(MaHDT);
            const dsPhongTrongGoc = await Phong.LayDSPhongTrong();
            
            const dsTatCaNguoiThueGoc = await NguoiDung.LayBangMaHDT(MaHDT);
            const dsNguoiThueChuaThueGoc = await NguoiDung.LayDSNguoiDungChuaThue();

            const dsPTHDT = ChuyenThanhMang(dsTatCaPhongGoc);
            const dsPhongTrong = ChuyenThanhMang(dsPhongTrongGoc);
            const dsTatCaNguoiThue = ChuyenThanhMang(dsTatCaNguoiThueGoc);
            const dsNguoiThueChuaThue = ChuyenThanhMang(dsNguoiThueChuaThueGoc);

            const dsPTHDT_DaDanhDau = dsPTHDT.map(item => ({
                ...item,
                isSelected: true
            }));
            const dsPhongTrong_DaDanhDau = dsPhongTrong.map(item => ({
                ...item,
                isSelected: false
            }));

            const dsTatCaNguoiThue_DaDanhDau = dsTatCaNguoiThue.map(item => ({
                ...item,
                isChecked: true
            }));
            const dsNguoiThueChuaThue_DaDanhDau = dsNguoiThueChuaThue.map(item => ({
                ...item,
                isChecked: false
            }));

            const dsPhongTro = [...dsPTHDT_DaDanhDau, ...dsPhongTrong_DaDanhDau];
            const dsNguoiThue = [...dsTatCaNguoiThue_DaDanhDau, ...dsNguoiThueChuaThue_DaDanhDau];

            res.json({
                HDT: hdt,
                PhongTro: dsPhongTro,
                NguoiThue: dsNguoiThue
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Lỗi server' });
        }
    }
    async LayHopDong(req, res) {
        try {
            const MaHDT = req.params.id;
            const hdt = await HopDongThue.LayBangMaHDT(MaHDT);
            res.json(hdt);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Lỗi server' });
        }
    }
    async ThemHopDong(req, res){
        try {
            const data = {
                MaPhong: req.body.PhongHDT,
                NgayBD:  req.body.NgayBD,
                NgayKT: req.body.NgayKT,
                TienCoc: req.body.TienCoc
            }
            const hd = await HopDongThue.Them(data);
            let dsNT = req.body.NThue || []; 
            if (!Array.isArray(dsNT)) {
                dsNT = [dsNT];
            }

           // Kiểm tra xem có dữ liệu không
            if (dsNT.length > 0) {
                await Promise.all(dsNT.map(async (mand) => {
                    const dt = {
                        MaHDT: hd.MaHDT, 
                        MaND: mand
                    };
                    
                    await CTHopDongThue.Them(dt);
                }));
            }
            return res.redirect('/admin/hopDong?status=themhdt&highlight='+hd.MaHDT);
        } catch (error) {
            res.status(500).redirect('/admin/hopDong?status=fail');
        }
    }
    async SuaHopDong(req, res){
        try {
            const MaHDT = req.params.id;
            const data = {
                MaPhong: req.body.PhongHDT,
                NgayBD:  req.body.NgayBD,
                NgayKT: req.body.NgayKT,
                TienCoc: req.body.TienCoc
            }
            await HopDongThue.Sua(MaHDT, data);
            let dsNT = req.body.NThue || []; 
            if (!Array.isArray(dsNT)) {
                dsNT = [dsNT];
            }
            await CTHopDongThue.Xoa(MaHDT);
           // Kiểm tra xem có dữ liệu không
            if (dsNT.length > 0) {
                await Promise.all(dsNT.map(async (mand) => {
                    const dt = {
                        MaHDT: id, 
                        MaND: mand
                    };
                    
                    await CTHopDongThue.Them(dt);
                }));
            }
            return res.redirect('/admin/hopDong?status=suahdt&highlight='+id);
        } catch (error) {
            res.status(500).redirect('/admin/hopDong?status=fail');
        }
    }
    async XoaHopDong(req, res){
        try {
            const MaHDT = req.params.id;
            await CTHopDongThue.Xoa(MaHDT);
            await HopDongThue.Xoa(MaHDT);
            return res.redirect('/admin/hopDong?status=xoa');
        } catch (error) {
            res.status(500).redirect('/admin/hopDong?status=fail');
        }
    }
    async KetThucHopDong(req, res){
        try {
            const MaHDT = req.params.id;
            await HopDongThue.KetThucHDT(MaHDT);
            return res.redirect('/admin/hopDong?status=kthdt&highlight='+MaHDT);
        } catch (error) {
            res.status(500).redirect('/admin/hopDong?status=fail');
        }
    }
}
module.exports = new QuanLyHopDongThue