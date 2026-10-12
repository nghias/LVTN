const XoaAnh = require('../controllers/QuanLyHinhAnh');
const NguoiDung = require('../models/NguoiDung');
const MaHoa = require('../config/MaHoa');
const { X } = require('lucide-react');

class QuanLyNguoiDung{
    async NguoiDung(req, res) {
        const tuKhoa = req.query.searchND || "";
        let dsNguoiDung;
        if (tuKhoa.trim() === "") {
            dsNguoiDung = await NguoiDung.LayTatCa();
        }else {
            dsNguoiDung = await NguoiDung.TimKiem(tuKhoa);
        }

        if (!dsNguoiDung || dsNguoiDung.length === 0) {
            return res.render("pages/admin/nguoiDung", { empty: true });
        }
        res.render('pages/admin/nguoiDung', {
            dsNguoiDung,   // Danh sách phòng gửi cho view
            search            // Để giữ lại chữ trong ô tìm kiếm
        });
    }
    async LayThongTinNguoiDung(req, res) {
        try {
            const MaND = req.params.id;
            const NguoiDung = await NguoiDung.LayBangMaND(MaND);
            res.json(NguoiDung);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Lỗi server' });
        }
    }
    async ThemNguoiDung(req, res){
        try {
            let tenFileAnh = req.file ? req.file.filename : "logo.png";
            const data = {
                HoTen: req.body.HoTenND,
                CCCD: req.body.CMNDND,
                NamSinh: req.body.NamSinhND,
                SDT: req.body.SDTND,
                ThuongTru: req.body.ThuongTruND,
                TenTK: req.body.SDTND,
                MatKhau: await MaHoa.MaHoaMatKhau(req.body.SDTND),
                Quyen: req.body.QuyenND || 'user',
                AVT: tenFileAnh
            }
            const ktSDT = await NguoiDung.KiemTra('SDT', req.body.SDTND);
            const ktCMND = await NguoiDung.KiemTra('CCCD', req.body.CMNDND);

            if (ktSDT) {
                if(req.file && tenFileAnh != 'logo.png'){
                    XoaAnh(tenFileAnh);
                }
                return res.redirect('/admin/nguoiDung?status=sdtfail');
            }
            if (ktCMND) {
                if(req.file && tenFileAnh != 'logo.png'){
                    XoaAnh(tenFileAnh);
                }
                return res.redirect('/admin/nguoiDung?status=cmndfail');
            }
            
            const NguoiDungMoi = await NguoiDung.Them(data);

            return res.redirect('/admin/nguoiDung?status=themnd&highlight='+NguoiDungMoi.MaND);
        } catch (error) {
            res.status(500).redirect('/admin/nguoiDung?status=fail');
        }
    }
    async SuaNguoiDung(req, res) {
        try {
            const MaND = req.params.id;
            let tenFileAnh = req.file ? req.file.filename : req.body.HinhNDCu;
            const data = {
                HoTen: req.body.HoTenND,
                CCCD: req.body.CMNDND,
                NamSinh: req.body.NamSinhND,
                SDT: req.body.SDTND,
                ThuongTru: req.body.ThuongTruND,
                Quyen: req.body.QuyenND,
                AVT: tenFileAnh
            }
            const ktSDT = await NguoiDung.KiemTra('SDT', req.body.SDTND, MaND);
            const ktCMND = await NguoiDung.KiemTra('CCCD', req.body.CMNDND, MaND);

            if (ktSDT != null) {
                if(req.file && req.body.HinhNDCu != 'logo.png'){
                    XoaAnh(req.body.HinhNDCu);
                }
                return res.redirect('/admin/nguoiDung?status=sdtfail');
            }
            if (ktCMND != null) {
                if(req.file && req.body.HinhNDCu != 'logo.png'){
                    XoaAnh(req.body.HinhNDCu);
                }
                return res.redirect('/admin/nguoiDung?status=cmndfail');
            }
            if(req.file && req.body.HinhNDCu != 'logo.png'){
                XoaAnh(req.body.HinhNDCu);
            }

            await NguoiDung.Sua(MaND, data);
            return res.redirect('/admin/nguoiDung?status=suand&highlight='+MaND);
        } catch (error) {
            res.status(500).redirect('/admin/nguoiDung?status=fail');
        }
    }
    async DatLaiMatKhau(req, res) {
        try {
            const id = req.params.id;
            
            await NguoiDung.DatLaiMatKhau(id);
            return res.redirect('/admin/nguoiDung?status=resetpass&highlight='+id);
        } catch (error) {
            res.status(500).redirect('/admin/nguoiDung?status=fail');
        }
    }
    async XoaNguoiDung(req, res){
        try {
            const MaND = req.params.id;
            const Hinh = req.body.HinhNDxn;
            
            if(Hinh !='logo.png') XoaAnh(Hinh);
            console.log('Deleting Hinh:', Hinh);

            await NguoiDung.Xoa(MaND);

            return res.redirect('/admin/nguoiDung?status=xoa');
        } catch (error) {
            res.status(500).redirect('/admin/nguoiDung?status=fail');
        }
    }
}
module.exports = new QuanLyNguoiDung