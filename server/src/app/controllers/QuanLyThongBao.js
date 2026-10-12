const NguoiDung = require('..//models/NguoiDung');
const Phong = require('../models/Phong');
const ThongBao = require('../models/ThongBao');

class QuanLyThongBao{
    async ThongBao(req, res){
        const search = req.query.searchTB || "";
        const id = req.params.id;
        let dsthongbao;
        if(search.trim()===""){
            dsthongbao = await ThongBao.LayTatCa(id);
        }else{
            dsthongbao = await ThongBao.TimKiem(search, id);
        }
        
        const nd = await NguoiDung.LayBangMaND(id);
        if (!dsthongbao || dsthongbao.length === 0) {
            return res.render(`pages/${nd.Quyen}/thongBao`, { 
                empty: true,
                ma: id,
                role: nd.Quyen
            });
        }
        const tongSoThongBao = dsthongbao.filter(i => i.TrangThai === "Chưa đọc").length;

        const thongbao = await Promise.all(dsthongbao.map(async (tb) => {
            const nDNhan = await NguoiDung.LayBangMaND(tb.NDNhan);
            const nDGui = await NguoiDung.LayBangMaND(tb.NDGui);
            return {
                ...tb,
                NDNhan: nDNhan.HoTen,
                NDGui: nDGui.HoTen,
                MaND: (nDGui.MaND == id)
            }
        }));
        res.render(`pages/${nd.Quyen}/thongBao`,{
            thongbao,
            tongSoThongBao,
            ma: id,
            role: nd.Quyen
        });
    }
    async ChiTietThongBao(req, res){
        // Mã thông báo
        const id = req.params.id;
        // Mã người dùng
        const ma = req.query.ma;

        const thongbao = await ThongBao.LayBangMaTB(id);
        if(thongbao.NDGui!=ma){
            await ThongBao.SuaTrangThaiDaDoc(id);
        }

        const NDNhan = await NguoiDung.LayBangMaND(thongbao.NDNhan);
        const NDGui = await NguoiDung.LayBangMaND(thongbao.NDGui);
        const MaND = (NDGui.MaND == ma);
        const nd = await NguoiDung.LayBangMaND(ma);

        res.render(`pages/${nd.Quyen}/ctThongBao`,{
            thongbao,
            NDNhan,
            NDGui,
            MaND,
            ma,
            role: nd.Quyen
        });
    }
    async LayThongBaoCuaNDNhan(req, res){
        try {
            const id = req.params.id;
            const tb = await ThongBao.LayBangMaNDNhan(id);
            
            const sltbcd = tb.filter(item => item.TrangThai === "Chưa đọc").length;
            
            res.json({
                tb: tb,
                tbcd: sltbcd
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Lỗi server' });
        }
    }
    async LayDuLieuSoanThongBao(req, res){
        try {
            const dsnd = await NguoiDung.LayDSNguoiDungDeThongBao();

            const dsNN = await Promise.all(dsnd.map(async (nd)=>{
                const phong = await Phong.LayBangMaND(nd.MaND);
                return {
                    MaND: nd.MaND,
                    Ten: (phong.MaPhong)?(nd.HoTen+" - "+ phong.Ten):(nd.HoTen +" - Chủ trọ")
                }
            }))
            
            res.json({
                dsNN
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Lỗi server' });
        }
    }
    async ThemThongBao(req, res) {
        try {
            const ma = req.params.id;

            const nDGuiInfo = await NguoiDung.LayBangMaND(ma);

            let dsNN = req.body.NNhan || [];
            if (!Array.isArray(dsNN)) {
                dsNN = [dsNN];
            }

            if (dsNN.length > 0) {
                await Promise.all(dsNN.map(async (mand) => {
                    const data = {
                        NDGui: ma,
                        NDNhan: mand,
                        TieuDe: req.body.TieuDe,
                        NoiDung: req.body.NoiDung,
                        TrangThai: 'Chưa đọc', 
                        NgayGui: new Date() 
                    }

                    const newTB = await ThongBao.create(data);

                    // if (req.io) {
                    //     req.io.to(`user_${mand}`).emit('thong_bao_moi', {
                    //         MaTB: newTB?.insertId || null,
                    //         TieuDe: data.TieuDe,
                    //         NoiDung: data.NoiDung,
                    //         NDGui: nDGuiInfo.HoTen,
                    //         ThoiGian: data.NgayGui,
                    //         TrangThai: 'Chưa đọc'
                    //     });
                    // }
                }));
            }

            const dsthongbao = await ThongBao.LayTatCa(ma);
            const nd = nDGuiInfo;

            if (!dsthongbao || dsthongbao.length === 0) {
                return res.render(`pages/${nd.Quyen}/thongBao`, { empty: true });
            }
            
            const tongSoThongBao = dsthongbao.filter(i => i.TrangThai === "Chưa đọc").length;
            const thongbao = await Promise.all(dsthongbao.map(async (tb) => {
                const nDNhan = await NguoiDung.LayBangMaND(tb.NDNhan);
                const nDGui = await NguoiDung.LayBangMaND(tb.NDGui);
                return {
                    ...tb,
                    NDNhan: nDNhan.HoTen,
                    NDGui: nDGui.HoTen,
                    MaND: (nDGui.MaND == ma)
                }
            }));

            res.render(`pages/${nd.Quyen}/thongBao`, {
                thongbao,
                tongSoThongBao,
                ma: ma,
                role: nd.Quyen
            });

        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Lỗi server' });
        }
    }
    
    async TraLoiThongBao(req, res){
        try {
            const ma = req.params.id;
            
            
            const data = {
                NDGui: ma,
                NDNhan: req.body.MaNN,
                TieuDe: req.body.TieuDeTL,
                NoiDung:  req.body.NoiDungTL
            }
            
            await ThongBao.Them(data);

            const dsthongbao = await ThongBao.LayTatCa(ma);
            const nd = await NguoiDung.LayBangMaND(ma);
            if (!dsthongbao || dsthongbao.length === 0) {
                return res.render(`pages/${nd.Quyen}/thongBao`, { empty: true });
            }
            const tongSoThongBao = dsthongbao.filter(i => i.TrangThai === "Chưa đọc").length;

            const thongbao = await Promise.all(dsthongbao.map(async (tb) => {
                const nDNhan = await NguoiDung.LayBangMaND(tb.NDNhan);
                const nDGui = await NguoiDung.LayBangMaND(tb.NDGui);
                return {
                    ...tb,
                    NDNhan: nDNhan.HoTen,
                    NDGui: nDGui.HoTen,
                    MaND: (nDGui.MaND == ma)
                }
            }));

            res.render(`pages/${nd.Quyen}/thongBao`,{
                thongbao,
                tongSoThongBao,
                ma: ma,
                role: nd.Quyen
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Lỗi server' });
        }   
    }
    async DanhDauDaDocThongBao(req, res){
        try {
            // Mã thông báo
            const id = req.params.id;
            // Mã người dùng
            const ma = req.query.ma;


            const t = await ThongBao.LayBangMaTB(id);
            if(t.NDGui!=ma){
                await ThongBao.SuaTrangThaiDaDoc(id);
            }

            const dsthongbao = await ThongBao.LayTatCa(ma);
            const nd = await NguoiDung.LayBangMaND(ma);
            if (!dsthongbao || dsthongbao.length === 0) {
                return res.render(`pages/${nd.Quyen}/thongBao`, { empty: true });
            }
            const tongSoThongBao = dsthongbao.filter(i => i.TrangThai === "Chưa đọc").length;

            const thongbao = await Promise.all(dsthongbao.map(async (tb) => {
                const nDNhan = await NguoiDung.LayBangMaND(tb.NDNhan);
                const nDGui = await NguoiDung.LayBangMaND(tb.NDGui);
                return {
                    ...tb,
                    NDNhan: nDNhan.HoTen,
                    NDGui: nDGui.HoTen,
                    MaND: (nDGui.MaND == ma)
                }
            }));

            res.render(`pages/${nd.Quyen}/thongBao`,{
                thongbao,
                tongSoThongBao,
                ma: ma,
                role: nd.Quyen
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Lỗi server' });
        }
    }
    async DanhDauDaDocNhieuThongBao(req, res){
        try {
            // Mã người dùng
            const ma = req.params.id;
            const { ids } = req.body;

            if(ids && ids.length > 0){
                for (const id of ids) {
                    const t = await ThongBao.LayBangMaTB(id);
                    if(t.NDGui!=ma){
                        await ThongBao.SuaTrangThaiDaDoc(id); 
                    }
                }
            }

            const dsthongbao = await ThongBao.LayTatCa(ma);
            const nd = await NguoiDung.LayBangMaND(ma);
            if (!dsthongbao || dsthongbao.length === 0) {
                return res.render(`pages/${nd.Quyen}/thongBao`, { empty: true });
            }
            const tongSoThongBao = dsthongbao.filter(i => i.TrangThai === "Chưa đọc").length;

            const thongbao = await Promise.all(dsthongbao.map(async (tb) => {
                const nDNhan = await NguoiDung.LayBangMaND(tb.NDNhan);
                const nDGui = await NguoiDung.LayBangMaND(tb.NDGui);
                return {
                    ...tb,
                    NDNhan: nDNhan.HoTen,
                    NDGui: nDGui.HoTen,
                    MaND: (nDGui.MaND == ma)
                }
            }));

            res.render(`pages/${nd.Quyen}/thongBao`,{
                thongbao,
                tongSoThongBao,
                ma: ma,
                role: nd.Quyen
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Lỗi server' });
        }
    }
    async DanhDauChuaDocThongBao(req, res){
        try {
            // Mã thông báo
            const id = req.params.id;
            // Mã người dùng
            const ma = req.query.ma;


            const t = await ThongBao.LayBangMaTB(id);
            if(t.NDGui!=ma){
                await ThongBao.SuaTrangThaiChuaDoc(id);
            }

            const dsthongbao = await ThongBao.LayTatCa(ma);
            const nd = await NguoiDung.LayBangMaND(ma);
            if (!dsthongbao || dsthongbao.length === 0) {
                return res.render(`pages/${nd.Quyen}/thongBao`, { empty: true });
            }
            const tongSoThongBao = dsthongbao.filter(i => i.TrangThai === "Chưa đọc").length;

            const thongbao = await Promise.all(dsthongbao.map(async (tb) => {
                const nDNhan = await NguoiDung.LayBangMaND(tb.NDNhan);
                const nDGui = await NguoiDung.LayBangMaND(tb.NDGui);
                return {
                    ...tb,
                    NDNhan: nDNhan.HoTen,
                    NDGui: nDGui.HoTen,
                    MaND: (nDGui.MaND == ma)
                }
            }));

            res.render(`pages/${nd.Quyen}/thongBao`,{
                thongbao,
                tongSoThongBao,
                ma: ma,
                role: nd.Quyen
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Lỗi server' });
        }
    }
    async XoaThongBao(req, res){
        try {
            // Mã thông báo
            const id = req.params.id;
            // Mã người dùng
            const ma = req.query.ma;

            await ThongBao.Xoa(id);

            const dsthongbao = await ThongBao.LayTatCa(ma);
            const nd = await NguoiDung.LayBangMaND(ma);
            if (!dsthongbao || dsthongbao.length === 0) {
                return res.render(`pages/${nd.Quyen}/thongBao`, { empty: true });
            }
            const tongSoThongBao = dsthongbao.filter(i => i.TrangThai === "Chưa đọc").length;

            const thongbao = await Promise.all(dsthongbao.map(async (tb) => {
                const nDNhan = await NguoiDung.LayBangMaND(tb.NDNhan);
                const nDGui = await NguoiDung.LayBangMaND(tb.NDGui);
                return {
                    ...tb,
                    NDNhan: nDNhan.HoTen,
                    NDGui: nDGui.HoTen,
                    MaND: (nDGui.MaND == ma)
                }
            }));

            res.render(`pages/${nd.Quyen}/thongBao`,{
                thongbao,
                tongSoThongBao,
                ma: ma,
                role: nd.Quyen
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Lỗi server' });
        }
    }
    async XoaNhieuThongBao(req, res){
        try {
            // Mã người dùng
            const ma = req.params.id;

            const { ids } = req.body;

            if(ids && ids.length > 0){
                for (const id of ids) {
                    await ThongBao.Xoa(id);
                }
            }

            const dsthongbao = await ThongBao.LayTatCa(ma);
            const nd = await NguoiDung.LayBangMaND(ma);
            if (!dsthongbao || dsthongbao.length === 0) {
                return res.render(`pages/${nd.Quyen}/thongBao`, { empty: true });
            }
            const tongSoThongBao = dsthongbao.filter(i => i.TrangThai === "Chưa đọc").length;

            const thongbao = await Promise.all(dsthongbao.map(async (tb) => {
                const nDNhan = await NguoiDung.LayBangMaND(tb.NDNhan);
                const nDGui = await NguoiDung.LayBangMaND(tb.NDGui);
                return {
                    ...tb,
                    NDNhan: nDNhan.HoTen,
                    NDGui: nDGui.HoTen,
                    MaND: (nDGui.MaND == ma)
                }
            }));

            res.render(`pages/${nd.Quyen}/thongBao`,{
                thongbao,
                tongSoThongBao,
                ma: ma,
                role: nd.Quyen
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Lỗi server' });
        }
    }
}
module.exports = new QuanLyThongBao