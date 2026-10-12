const XoaAnh = require('../controllers/QuanLyHinhAnh');
const Phong = require('../models/Phong');

class QuanLyPhongTro{
    async PhongTro(req, res) {
        const tuKhoa = req.query.search || "";
        let dsPhongGoc;
        if (tuKhoa.trim() === "") {
            dsPhongGoc = await Phong.LayTatCa();
        }else {
            dsPhongGoc = await Phong.TimKiem(tuKhoa);
        }

        // danh sách đã thuê
        const dsPhongDaThue = await Phong.LayPhongDaThue();

        // Tạo set để kiểm tra nhanh
        const daThueSet = new Set(dsPhongDaThue.map(p => p.MaPhong));

        // Gắn thêm thuộc tính IsRented
        const dsPhong = dsPhongGoc.map(p => ({
            ...p,
            DaThue: daThueSet.has(p.MaPhong)
        }));

        if (!dsPhong || dsPhong.length === 0) {
            return res.render("pages/admin/phongTro", { empty: true });
        }
        res.render('pages/admin/phongTro', {
            dsPhong,   // Danh sách phòng gửi cho view
            search            // Để giữ lại chữ trong ô tìm kiếm
        });
    }
    async LayThongTinPhong(req, res) {
        try {
            const MaPhong = req.params.id;
            const phong = await Phong.LayBangMaPhong(MaPhong);
            res.json(phong);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Lỗi server' });
        }
    }
    async ThemPhongTro(req, res) {
        try{
            let tenFileAnh = req.file ? req.file.filename : "logo.png";
            const data = {
                TenPhong: req.body.TenPhong,
                Gia: req.body.Gia,
                DienTich: req.body.DienTich,
                Hinh: tenFileAnh
            };
            
            const ktTrungTen = await Phong.KiemTra("Ten",data.TenPhong);
            if(ktTrungTen){
                return res.redirect('/admin/phongTro?status=tenpfail');
            }

            const PhongMoi = await Phong.Them(data);
            return res.redirect('/admin/phongTro?status=themp&highlight='+PhongMoi.MaPhong);
        }catch (error) {
            res.status(500).redirect('/admin/phongTro?status=fail');
        }
    }
    async SuaPhongTro(req, res) {
        try{
            const MaPhong = req.params.id;
            const Ten = req.body.TenPhong;
            const Gia = req.body.Gia;
            const DienTich = req.body.DienTich;
            const HinhCu = req.body.HinhCu;

            let tenFileAnh = req.file ? req.file.filename : HinhCu;

            if(req.file && HinhCu != 'logo.png'){
                XoaAnh(HinhCu);
            }

            const ktTrungTen = await Phong.KiemTra("Ten",Ten,MaPhong);
            if(ktTrungTen){
                return res.redirect('/admin/phongTro?status=tenpfail&highlight='+MaPhong);
            }

            await Phong.Sua(MaPhong, Ten, DienTich, Gia, tenFileAnh);
            return res.redirect('/admin/phongTro?status=suap&highlight='+MaPhong);
         }catch (error) {
            res.status(500).redirect('/admin/phongTro?status=fail');
        }
    }
    async XoaPhongTro(req, res) {
        const MaPhong = req.params.id;
        const HinhCu = req.body.HinhXoa;
        if(HinhCu!='logo.png') XoaAnh(HinhCu);

        await Phong.Xoa(MaPhong);
        return res.redirect('/admin/phongTro?status=xoa');
    }
}
module.exports = new QuanLyPhongTro