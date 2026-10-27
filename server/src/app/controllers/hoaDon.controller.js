// server/src/app/controllers/hoaDon.controller.js
const db = require('../../database/db');
const HoaDonModel = require('../models/hoaDon.model');
const PhatSinhModel = require('../models/phatSinh.model');

const HoaDonController = {
  // =========================================================================
  // HÀM NỘI BỘ: Lấy dữ liệu nền từ các bảng & Phân quyền (ChuTro, QuanLy, KhachThue)
  // =========================================================================
  getSystemDataAndPermissions: async (user) => {
    const [
      [dsKhuTro],
      [dsPhong],
      [dsHopDong],
      [dsCTHDT],
      [dsCTDichVu],
      [dsPhiDichVu],
      [dsGiaDienNuoc],
      [dsChiSo],
    ] = await Promise.all([
      db.execute(`SELECT * FROM KhuTro`),
      db.execute(`SELECT * FROM Phong`),
      db.execute(`SELECT * FROM HopDongThue`),
      db.execute(`SELECT * FROM ChiTietHopDongThue`),
      db.execute(`SELECT * FROM ChiTietPhiDichVu`),
      db.execute(`SELECT * FROM PhiDichVu`),
      db.execute(
        `SELECT MaGia, GiaDien, GiaNuoc, DATE_FORMAT(NgayApDung, '%Y-%m-%d') AS NgayApDung 
         FROM GiaDienNuoc 
         ORDER BY NgayApDung DESC, MaGia DESC`
      ),
      db.execute(
        `SELECT MaCS, MaPhong, SoDienCu, SoDienMoi, SoNuocCu, SoNuocMoi, 
                DATE_FORMAT(NgayGhi, '%Y-%m-%d') AS NgayGhi 
         FROM ChiSoDienNuoc 
         ORDER BY NgayGhi DESC, MaCS DESC`
      ),
    ]);

    const role = user?.quyen || user?.Quyen || user?.VaiTro || '';
    const maND = Number(user?.maND || user?.MaND || 0);

    let allowedKhuList = [];
    let allowedRoomList = [];

    if (role === 'ChuTro') {
      allowedKhuList = dsKhuTro;
      allowedRoomList = dsPhong;
    } else if (role === 'QuanLy') {
      allowedKhuList = dsKhuTro.filter(
        (k) => Number(k.MaND || k.MaQuanLy) === maND
      );
      const allowedKhuIds = allowedKhuList.map((k) => Number(k.MaKhu));
      allowedRoomList = dsPhong.filter((p) =>
        allowedKhuIds.includes(Number(p.MaKhu))
      );
    } else if (role === 'KhachThue') {
      // Lấy các hợp đồng mà người thuê này đang ở
      const myContractIds = dsCTHDT
        .filter((ct) => Number(ct.MaND) === maND && !ct.NgayDi)
        .map((ct) => Number(ct.MaHDT));

      const myRoomIds = dsHopDong
        .filter((hd) => myContractIds.includes(Number(hd.MaHDT)))
        .map((hd) => Number(hd.MaPhong));

      allowedRoomList = dsPhong.filter((p) =>
        myRoomIds.includes(Number(p.MaPhong))
      );
      const myKhuIds = [
        ...new Set(allowedRoomList.map((p) => Number(p.MaKhu))),
      ];
      allowedKhuList = dsKhuTro.filter((k) =>
        myKhuIds.includes(Number(k.MaKhu))
      );
    }

    const allowedRoomIds = allowedRoomList.map((r) => Number(r.MaPhong));

    return {
      role,
      maND,
      dsKhuTro,
      dsPhong,
      dsHopDong,
      dsCTHDT,
      dsCTDichVu,
      dsPhiDichVu,
      dsGiaDienNuoc,
      dsChiSo,
      allowedKhuList,
      allowedRoomList,
      allowedRoomIds,
    };
  },

  // =========================================================================
  // HÀM NỘI BỘ: Tính toán tự động các khoản của 1 phòng trong kỳ (YYYY-MM)
  // =========================================================================
  calculateRoomInvoiceData: (
    maPhong,
    thangNam,
    {
      dsPhong,
      dsKhuTro,
      dsHopDong,
      dsCTDichVu,
      dsPhiDichVu,
      dsGiaDienNuoc,
      dsChiSo,
      dsHoaDon,
    }
  ) => {
    const phong = dsPhong.find((p) => Number(p.MaPhong) === Number(maPhong));
    if (!phong) return null;

    const khu = dsKhuTro.find((k) => Number(k.MaKhu) === Number(phong.MaKhu));

    // 1. Tìm hợp đồng đang hiệu lực của phòng
    const hopDong = dsHopDong.find(
      (hd) =>
        Number(hd.MaPhong) === Number(maPhong) &&
        (hd.TrangThai === 'ConHieuLuc' ||
          hd.TrangThai === 'DangThue' ||
          hd.TrangThai === 'HieuLuc' ||
          hd.TrangThai === 1 ||
          hd.TrangThai === '1' ||
          !hd.TrangThai)
    );

    // 2. Tiền phòng (Lấy từ Hợp đồng hoặc cột Gia của bảng Phong)
    const tienPhong = Math.round(
      Number(
        hopDong?.GiaThue ??
          hopDong?.Gia ??
          hopDong?.TienPhong ??
          phong?.Gia ??
          phong?.GiaThue ??
          phong?.GiaPhong ??
          0
      )
    );

    // 3. Tính Phí dịch vụ (TienPhuPhi) từ bảng ChiTietPhiDichVu & PhiDichVu
    const chiTietDichVuPhong = [];
    let tienPhuPhi = 0;

    if (hopDong) {
      const ctList = dsCTDichVu.filter(
        (ct) => Number(ct.MaHDT) === Number(hopDong.MaHDT)
      );
      for (const ct of ctList) {
        const dv = dsPhiDichVu.find((d) => Number(d.MaDV) === Number(ct.MaDV));
        if (dv) {
          // Loại trừ dòng Tiền điện / Tiền nước nếu có lưu chung trong bảng PhiDichVu (vì Điện Nước đã tính riêng theo chỉ số)
          const tenDVLower = String(dv.TenDV || '').trim().toLowerCase();
          if (tenDVLower === 'tiền điện' || tenDVLower === 'tiền nước') {
            continue;
          }

          const donGia = Math.round(Number(dv.DonGia) || 0);
          const soLuong = Number(ct.SoLuong) || 1;
          const thanhTien = donGia * soLuong;
          tienPhuPhi += thanhTien;
          chiTietDichVuPhong.push({
            MaDV: dv.MaDV,
            TenDV: dv.TenDV,
            DonGia: donGia,
            DonViTinh: dv.DonViTinh,
            SoLuong: soLuong,
            ThanhTien: thanhTien,
          });
        }
      }
    }

    // 4. Tìm chỉ số điện nước của phòng trong tháng (YYYY-MM)
    const chiSoThang = dsChiSo.find(
      (cs) =>
        Number(cs.MaPhong) === Number(maPhong) &&
        String(cs.NgayGhi).slice(0, 7) === String(thangNam)
    );

    // 5. Tìm hóa đơn đã tạo của phòng trong tháng (hoặc trùng MaCS)
    const hoaDonDaTao = dsHoaDon.find(
      (hd) =>
        Number(hd.MaPhong) === Number(maPhong) &&
        (String(hd.NgayTinh).slice(0, 7) === String(thangNam) ||
          (chiSoThang && Number(hd.MaCS) === Number(chiSoThang.MaCS)))
    );

    // 6. Lấy đơn giá điện nước áp dụng
    const mocGia = dsGiaDienNuoc[0] || {
      MaGia: 1,
      GiaDien: 3800,
      GiaNuoc: 18000,
    };
    const giaDien = Math.round(Number(mocGia.GiaDien) || 0);
    const giaNuoc = Math.round(Number(mocGia.GiaNuoc) || 0);

    let soDienCu = 0;
    let soDienMoi = 0;
    let dienTieuThu = 0;
    let tienDien = 0;

    let soNuocCu = 0;
    let soNuocMoi = 0;
    let nuocTieuThu = 0;
    let tienNuoc = 0;

    if (chiSoThang) {
      soDienCu = Number(chiSoThang.SoDienCu) || 0;
      soDienMoi = Number(chiSoThang.SoDienMoi) || 0;
      dienTieuThu = Math.max(0, soDienMoi - soDienCu);
      tienDien = dienTieuThu * giaDien;

      soNuocCu = Number(chiSoThang.SoNuocCu) || 0;
      soNuocMoi = Number(chiSoThang.SoNuocMoi) || 0;
      nuocTieuThu = Math.max(0, soNuocMoi - soNuocCu);
      tienNuoc = nuocTieuThu * giaNuoc;
    }

    // Kiểm tra điều kiện tạo hóa đơn
    let trangThaiTao = 'DU_DIEU_KIEN';
    let lyDoKhongTheTao = '';

    if (hoaDonDaTao) {
      trangThaiTao = 'DA_TAO';
      lyDoKhongTheTao = `Đã lập hóa đơn #${hoaDonDaTao.MaHD} trong kỳ ${thangNam}`;
    } else if (!chiSoThang) {
      trangThaiTao = 'CHUA_CO_CHI_SO';
      lyDoKhongTheTao = `Chưa ghi chỉ số điện nước kỳ ${thangNam}`;
    } else if (soDienMoi < soDienCu || soNuocMoi < soNuocCu) {
      trangThaiTao = 'CHI_SO_LOI';
      lyDoKhongTheTao = 'Chỉ số điện/nước mới nhỏ hơn chỉ số cũ';
    }

    const tongTienTamTinh = tienPhong + tienDien + tienNuoc + tienPhuPhi;

    return {
      MaPhong: Number(phong.MaPhong),
      TenPhong: phong.TenPhong || `Phòng #${phong.MaPhong}`,
      MaKhu: Number(phong.MaKhu),
      TenKhu: khu ? khu.TenKhu : '',
      TrangThaiPhong: phong.TrangThai || '',
      MaHDT: hopDong ? Number(hopDong.MaHDT) : null,
      MaCS: chiSoThang ? Number(chiSoThang.MaCS) : null,
      NgayGhiChiSo: chiSoThang ? chiSoThang.NgayGhi : null,
      SoDienCu: soDienCu,
      SoDienMoi: soDienMoi,
      DienTieuThu: dienTieuThu,
      SoNuocCu: soNuocCu,
      SoNuocMoi: soNuocMoi,
      NuocTieuThu: nuocTieuThu,
      MaGia: Number(mocGia.MaGia),
      GiaDien: giaDien,
      GiaNuoc: giaNuoc,
      TienPhong: tienPhong,
      TienDien: tienDien,
      TienNuoc: tienNuoc,
      TienPhuPhi: tienPhuPhi,
      DanhSachDichVu: chiTietDichVuPhong,
      TongTienTamTinh: tongTienTamTinh,
      TrangThaiTao: trangThaiTao,
      LyDoKhongTheTao: lyDoKhongTheTao,
      MaHDDaTao: hoaDonDaTao ? Number(hoaDonDaTao.MaHD) : null,
    };
  },

  // =========================================================================
  // 1. [GET] /api/hoa-don
  // Xem danh sách hóa đơn (Phân quyền ChuTro, QuanLy, KhachThue)
  // =========================================================================
  getDanhSachHoaDon: async (req, res) => {
    try {
      const {
        maKhu = '',
        maPhong = '',
        thangNam = '',
        trangThaiTT = '',
        search = '',
      } = req.query;

      const sys = await HoaDonController.getSystemDataAndPermissions(req.user);
      const [dsHoaDonRaw, dsPhatSinh] = await Promise.all([
        sys.role === 'ChuTro'
          ? HoaDonModel.getAll()
          : HoaDonModel.getByRoomIds(sys.allowedRoomIds),
        PhatSinhModel.getAll(),
      ]);

      let data = dsHoaDonRaw
        .filter((hd) => sys.allowedRoomIds.includes(Number(hd.MaPhong)))
        .map((hd) => {
          const phong = sys.dsPhong.find(
            (p) => Number(p.MaPhong) === Number(hd.MaPhong)
          );
          const khu = sys.dsKhuTro.find(
            (k) => Number(k.MaKhu) === Number(phong?.MaKhu)
          );
          const chiSo = sys.dsChiSo.find(
            (cs) => Number(cs.MaCS) === Number(hd.MaCS)
          );
          const phatSinhList = dsPhatSinh.filter(
            (ps) => Number(ps.MaHD) === Number(hd.MaHD)
          );

          const tongTien = Math.round(Number(hd.TongTien) || 0);
          const tienDaTra = Math.round(Number(hd.TienDaTra) || 0);
          const conNo = Math.max(0, tongTien - tienDaTra);

          let trangThaiThanhToan = 'ChuaThanhToan';
          if (tienDaTra >= tongTien && tongTien > 0) {
            trangThaiThanhToan = 'DaThanhToan';
          } else if (tienDaTra > 0 && tienDaTra < tongTien) {
            trangThaiThanhToan = 'MotPhan';
          }

          return {
            ...hd,
            TenPhong: phong ? phong.TenPhong : `Phòng #${hd.MaPhong}`,
            MaKhu: phong ? Number(phong.MaKhu) : 0,
            TenKhu: khu ? khu.TenKhu : '',
            SoDienCu: chiSo ? Number(chiSo.SoDienCu) : 0,
            SoDienMoi: chiSo ? Number(chiSo.SoDienMoi) : 0,
            SoNuocCu: chiSo ? Number(chiSo.SoNuocCu) : 0,
            SoNuocMoi: chiSo ? Number(chiSo.SoNuocMoi) : 0,
            NgayGhi: chiSo ? chiSo.NgayGhi : null,
            ConNo: conNo,
            TrangThaiThanhToan: trangThaiThanhToan,
            SoKhoanPhatSinh: phatSinhList.length,
          };
        });

      if (maKhu && Number(maKhu) > 0) {
        data = data.filter((item) => Number(item.MaKhu) === Number(maKhu));
      }
      if (maPhong && Number(maPhong) > 0) {
        data = data.filter((item) => Number(item.MaPhong) === Number(maPhong));
      }
      if (thangNam && String(thangNam).trim()) {
        const ky = String(thangNam).trim();
        data = data.filter(
          (item) =>
            String(item.NgayTinh).slice(0, 7) === ky ||
            (item.NgayGhi && String(item.NgayGhi).slice(0, 7) === ky)
        );
      }
      if (trangThaiTT && String(trangThaiTT).trim()) {
        data = data.filter((item) => item.TrangThaiThanhToan === trangThaiTT);
      }
      if (search && String(search).trim()) {
        const keyword = String(search).trim().toLowerCase();
        data = data.filter(
          (item) =>
            String(item.MaHD).includes(keyword) ||
            item.TenPhong.toLowerCase().includes(keyword) ||
            item.TenKhu.toLowerCase().includes(keyword)
        );
      }

      return res.status(200).json({
        success: true,
        data: {
          hoaDonList: data,
          khuTroList: sys.allowedKhuList.map((k) => ({
            MaKhu: Number(k.MaKhu),
            TenKhu: k.TenKhu,
          })),
          phongList: sys.allowedRoomList.map((p) => ({
            MaPhong: Number(p.MaPhong),
            TenPhong: p.TenPhong,
            MaKhu: Number(p.MaKhu),
          })),
        },
      });
    } catch (error) {
      console.error('Lỗi getDanhSachHoaDon:', error);
      return res.status(500).json({
        success: false,
        message: 'Không thể tải danh sách hóa đơn.',
      });
    }
  },

  // =========================================================================
  // 2. [GET] /api/hoa-don/du-lieu-tao?thangNam=YYYY-MM&maKhu=...
  // =========================================================================
  getDuLieuTaoHoaDonThang: async (req, res) => {
    try {
      const thangNam =
        req.query.thangNam || new Date().toISOString().slice(0, 7);
      const maKhu = Number(req.query.maKhu) || 0;

      const sys = await HoaDonController.getSystemDataAndPermissions(req.user);
      if (sys.role !== 'ChuTro' && sys.role !== 'QuanLy') {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền thực hiện chức năng này.',
        });
      }

      if (sys.dsGiaDienNuoc.length === 0) {
        return res.status(400).json({
          success: false,
          message:
            'Hệ thống chưa có bảng giá điện nước. Vui lòng cập nhật đơn giá điện nước trước khi tạo hóa đơn.',
        });
      }

      const dsHoaDon = await HoaDonModel.getAll();

      let roomsToCalculate = sys.allowedRoomList;
      if (maKhu > 0) {
        roomsToCalculate = roomsToCalculate.filter(
          (r) => Number(r.MaKhu) === maKhu
        );
      }

      const danhSachPhongTinhToan = roomsToCalculate
        .map((r) =>
          HoaDonController.calculateRoomInvoiceData(r.MaPhong, thangNam, {
            ...sys,
            dsHoaDon,
          })
        )
        .filter(Boolean);

      return res.status(200).json({
        success: true,
        data: {
          thangNam,
          giaApDung: sys.dsGiaDienNuoc[0],
          khuTroList: sys.allowedKhuList.map((k) => ({
            MaKhu: Number(k.MaKhu),
            TenKhu: k.TenKhu,
          })),
          danhSachPhong: danhSachPhongTinhToan,
        },
      });
    } catch (error) {
      console.error('Lỗi getDuLieuTaoHoaDonThang:', error);
      return res.status(500).json({
        success: false,
        message: 'Không thể tải dữ liệu tính hóa đơn tự động.',
      });
    }
  },

  // =========================================================================
  // 3. [POST] /api/hoa-don/tao-hoa-don
  // =========================================================================
  taoHoaDonThang: async (req, res) => {
    try {
      const { thangNam, ngayTinh, danhSachPhongTao } = req.body;

      if (!thangNam || !/^\d{4}-\d{2}$/.test(String(thangNam))) {
        return res.status(400).json({
          success: false,
          message: 'Kỳ tháng tạo hóa đơn không hợp lệ.',
        });
      }

      if (!Array.isArray(danhSachPhongTao) || danhSachPhongTao.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng chọn ít nhất 1 phòng đủ điều kiện để tạo hóa đơn.',
        });
      }

      const sys = await HoaDonController.getSystemDataAndPermissions(req.user);
      if (sys.role !== 'ChuTro' && sys.role !== 'QuanLy') {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền tạo hóa đơn.',
        });
      }

      if (sys.dsGiaDienNuoc.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Chưa cấu hình đơn giá điện nước.',
        });
      }

      const dsHoaDon = await HoaDonModel.getAll();
      const ngayTinhHopLe =
        ngayTinh && /^\d{4}-\d{2}-\d{2}$/.test(String(ngayTinh))
          ? ngayTinh
          : `${thangNam}-${new Date().toISOString().slice(8, 10)}`;

      const validatedPayloads = [];

      for (const item of danhSachPhongTao) {
        const maPhong = Number(item.MaPhong);

        if (!sys.allowedRoomIds.includes(maPhong)) {
          return res.status(403).json({
            success: false,
            message:
              'Bạn không có quyền tạo hóa đơn cho phòng ngoài cơ sở quản lý.',
          });
        }

        const calc = HoaDonController.calculateRoomInvoiceData(
          maPhong,
          thangNam,
          {
            ...sys,
            dsHoaDon,
          }
        );

        if (!calc) {
          return res.status(404).json({
            success: false,
            message: 'Không tìm thấy thông tin phòng trọ.',
          });
        }

        if (calc.TrangThaiTao === 'DA_TAO') {
          return res.status(400).json({
            success: false,
            message: `${calc.TenPhong} đã được tạo hóa đơn trong tháng ${thangNam}. Không thể tạo 2 hóa đơn trong cùng 1 tháng!`,
          });
        }

        if (calc.TrangThaiTao === 'CHUA_CO_CHI_SO' || !calc.MaCS) {
          return res.status(400).json({
            success: false,
            message: `${calc.TenPhong} chưa có chỉ số điện nước trong tháng ${thangNam}. Vui lòng ghi điện nước trước khi tạo hóa đơn!`,
          });
        }

        if (calc.TrangThaiTao === 'CHI_SO_LOI') {
          return res.status(400).json({
            success: false,
            message: `${calc.TenPhong} có chỉ số điện/nước mới nhỏ hơn chỉ số cũ. Vui lòng kiểm tra lại!`,
          });
        }

        const phatSinhList = Array.isArray(item.PhatSinhList)
          ? item.PhatSinhList.filter(
              (ps) => ps && ps.TenPS && String(ps.TenPS).trim() !== ''
            )
          : [];

        const tienPhatSinh = phatSinhList.reduce(
          (sum, ps) => sum + (Math.round(Number(ps.Gia)) || 0),
          0
        );

        const tongTien =
          calc.TienPhong +
          calc.TienDien +
          calc.TienNuoc +
          calc.TienPhuPhi +
          tienPhatSinh;

        validatedPayloads.push({
          calc,
          phatSinhList,
          tienPhatSinh,
          tongTien,
        });
      }

      const createdIds = [];
      for (const payload of validatedPayloads) {
        const { calc, phatSinhList, tienPhatSinh, tongTien } = payload;

        const maHDMoi = await HoaDonModel.create({
          MaCS: calc.MaCS,
          MaPhong: calc.MaPhong,
          MaGia: calc.MaGia,
          TienPhong: calc.TienPhong,
          TienDien: calc.TienDien,
          TienNuoc: calc.TienNuoc,
          TienPhuPhi: calc.TienPhuPhi,
          TienPhatSinh: tienPhatSinh,
          TongTien: tongTien,
          TienDaTra: 0,
          NgayTinh: ngayTinhHopLe,
        });

        for (const ps of phatSinhList) {
          await PhatSinhModel.create({
            MaHD: maHDMoi,
            TenPS: ps.TenPS,
            Gia: Math.round(Number(ps.Gia)) || 0,
            GhiChu: ps.GhiChu || '',
          });
        }

        createdIds.push(maHDMoi);
      }

      return res.status(201).json({
        success: true,
        message: `Đã tạo thành công ${createdIds.length} hóa đơn kỳ ${thangNam}!`,
        data: { createdIds },
      });
    } catch (error) {
      console.error('Lỗi taoHoaDonThang:', error);
      return res.status(500).json({
        success: false,
        message: 'Không thể tạo hóa đơn vào lúc này.',
      });
    }
  },

  // =========================================================================
  // 4. [GET] /api/hoa-don/:maHD
  // =========================================================================
  getChiTietHoaDon: async (req, res) => {
    try {
      const maHD = Number(req.params.maHD);
      if (!maHD) {
        return res.status(400).json({
          success: false,
          message: 'Mã hóa đơn không hợp lệ.',
        });
      }

      const hoaDon = await HoaDonModel.getById(maHD);
      if (!hoaDon) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy hóa đơn này.',
        });
      }

      const sys = await HoaDonController.getSystemDataAndPermissions(req.user);

      if (!sys.allowedRoomIds.includes(Number(hoaDon.MaPhong))) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền truy cập hóa đơn của phòng này.',
        });
      }

      const phong = sys.dsPhong.find(
        (p) => Number(p.MaPhong) === Number(hoaDon.MaPhong)
      );
      const khu = sys.dsKhuTro.find(
        (k) => Number(k.MaKhu) === Number(phong?.MaKhu)
      );
      const chiSo = sys.dsChiSo.find(
        (cs) => Number(cs.MaCS) === Number(hoaDon.MaCS)
      );
      const mocGia =
        sys.dsGiaDienNuoc.find(
          (g) => Number(g.MaGia) === Number(hoaDon.MaGia)
        ) || sys.dsGiaDienNuoc[0];

      const hopDong = sys.dsHopDong.find(
        (hd) => Number(hd.MaPhong) === Number(hoaDon.MaPhong)
      );
      const danhSachDichVu = [];
      if (hopDong) {
        const ctList = sys.dsCTDichVu.filter(
          (ct) => Number(ct.MaHDT) === Number(hopDong.MaHDT)
        );
        for (const ct of ctList) {
          const dv = sys.dsPhiDichVu.find(
            (d) => Number(d.MaDV) === Number(ct.MaDV)
          );
          if (dv) {
            const tenDVLower = String(dv.TenDV || '').trim().toLowerCase();
            if (tenDVLower === 'tiền điện' || tenDVLower === 'tiền nước') {
              continue;
            }

            const donGia = Math.round(Number(dv.DonGia) || 0);
            const soLuong = Number(ct.SoLuong) || 1;
            danhSachDichVu.push({
              MaDV: dv.MaDV,
              TenDV: dv.TenDV,
              DonGia: donGia,
              DonViTinh: dv.DonViTinh,
              SoLuong: soLuong,
              ThanhTien: donGia * soLuong,
            });
          }
        }
      }

      const danhSachPhatSinh = await PhatSinhModel.getByMaHD(maHD);

      const soDienCu = chiSo ? Number(chiSo.SoDienCu) : 0;
      const soDienMoi = chiSo ? Number(chiSo.SoDienMoi) : 0;
      const soNuocCu = chiSo ? Number(chiSo.SoNuocCu) : 0;
      const soNuocMoi = chiSo ? Number(chiSo.SoNuocMoi) : 0;

      const tongTien = Math.round(Number(hoaDon.TongTien) || 0);
      const tienDaTra = Math.round(Number(hoaDon.TienDaTra) || 0);
      const conNo = Math.max(0, tongTien - tienDaTra);

      return res.status(200).json({
        success: true,
        data: {
          ...hoaDon,
          TenPhong: phong ? phong.TenPhong : `Phòng #${hoaDon.MaPhong}`,
          MaKhu: phong ? Number(phong.MaKhu) : 0,
          TenKhu: khu ? khu.TenKhu : '',
          DiaChiKhu: khu ? khu.DiaChi : '',
          SoDienCu: soDienCu,
          SoDienMoi: soDienMoi,
          DienTieuThu: Math.max(0, soDienMoi - soDienCu),
          SoNuocCu: soNuocCu,
          SoNuocMoi: soNuocMoi,
          NuocTieuThu: Math.max(0, soNuocMoi - soNuocCu),
          NgayGhiChiSo: chiSo ? chiSo.NgayGhi : null,
          GiaDien: mocGia ? Math.round(Number(mocGia.GiaDien)) : 0,
          GiaNuoc: mocGia ? Math.round(Number(mocGia.GiaNuoc)) : 0,
          DanhSachDichVu: danhSachDichVu,
          DanhSachPhatSinh: danhSachPhatSinh,
          ConNo: conNo,
        },
      });
    } catch (error) {
      console.error('Lỗi getChiTietHoaDon:', error);
      return res.status(500).json({
        success: false,
        message: 'Không thể tải thông tin chi tiết hóa đơn.',
      });
    }
  },

  // =========================================================================
  // 5. [PUT] /api/hoa-don/:maHD
  // =========================================================================
  suaHoaDon: async (req, res) => {
    try {
      const maHD = Number(req.params.maHD);
      const { SoDienMoi, SoNuocMoi, NgayTinh, PhatSinhList } = req.body;

      if (!maHD) {
        return res.status(400).json({
          success: false,
          message: 'Mã hóa đơn không hợp lệ.',
        });
      }

      const hoaDon = await HoaDonModel.getById(maHD);
      if (!hoaDon) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy hóa đơn cần sửa.',
        });
      }

      const sys = await HoaDonController.getSystemDataAndPermissions(req.user);
      if (sys.role !== 'ChuTro' && sys.role !== 'QuanLy') {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền chỉnh sửa hóa đơn.',
        });
      }

      if (!sys.allowedRoomIds.includes(Number(hoaDon.MaPhong))) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền sửa hóa đơn của cơ sở khác.',
        });
      }

      const chiSo = sys.dsChiSo.find(
        (cs) => Number(cs.MaCS) === Number(hoaDon.MaCS)
      );
      if (!chiSo) {
        return res.status(400).json({
          success: false,
          message:
            'Không tìm thấy bản ghi chỉ số điện nước gốc của hóa đơn này.',
        });
      }

      const soDienCu = Number(chiSo.SoDienCu) || 0;
      const soNuocCu = Number(chiSo.SoNuocCu) || 0;
      const dienMoi =
        SoDienMoi !== undefined ? Number(SoDienMoi) : Number(chiSo.SoDienMoi);
      const nuocMoi =
        SoNuocMoi !== undefined ? Number(SoNuocMoi) : Number(chiSo.SoNuocMoi);

      if (dienMoi < soDienCu) {
        return res.status(400).json({
          success: false,
          message: `Số điện mới (${dienMoi}) không được nhỏ hơn số điện cũ (${soDienCu})!`,
        });
      }

      if (nuocMoi < soNuocCu) {
        return res.status(400).json({
          success: false,
          message: `Số nước mới (${nuocMoi}) không được nhỏ hơn số nước cũ (${soNuocCu})!`,
        });
      }

      await db.execute(
        `UPDATE ChiSoDienNuoc 
         SET SoDienMoi = ?, SoNuocMoi = ? 
         WHERE MaCS = ?`,
        [dienMoi, nuocMoi, Number(hoaDon.MaCS)]
      );

      const mocGia =
        sys.dsGiaDienNuoc.find(
          (g) => Number(g.MaGia) === Number(hoaDon.MaGia)
        ) || sys.dsGiaDienNuoc[0];

      const giaDien = mocGia ? Math.round(Number(mocGia.GiaDien)) : 0;
      const giaNuoc = mocGia ? Math.round(Number(mocGia.GiaNuoc)) : 0;

      const tienDienMoi = (dienMoi - soDienCu) * giaDien;
      const tienNuocMoi = (nuocMoi - soNuocCu) * giaNuoc;

      const validPhatSinh = Array.isArray(PhatSinhList)
        ? PhatSinhList.filter(
            (ps) => ps && ps.TenPS && String(ps.TenPS).trim() !== ''
          )
        : [];

      await PhatSinhModel.deleteByMaHD(maHD);

      let tienPhatSinhMoi = 0;
      for (const ps of validPhatSinh) {
        const giaPS = Math.round(Number(ps.Gia)) || 0;
        tienPhatSinhMoi += giaPS;
        await PhatSinhModel.create({
          MaHD: maHD,
          TenPS: String(ps.TenPS).trim(),
          Gia: giaPS,
          GhiChu: ps.GhiChu ? String(ps.GhiChu).trim() : '',
        });
      }

      const tienPhong = Math.round(Number(hoaDon.TienPhong) || 0);
      const tienPhuPhi = Math.round(Number(hoaDon.TienPhuPhi) || 0);
      const tongTienMoi =
        tienPhong + tienDienMoi + tienNuocMoi + tienPhuPhi + tienPhatSinhMoi;

      await HoaDonModel.update(maHD, {
        TienPhong: tienPhong,
        TienDien: tienDienMoi,
        TienNuoc: tienNuocMoi,
        TienPhuPhi: tienPhuPhi,
        TienPhatSinh: tienPhatSinhMoi,
        TongTien: tongTienMoi,
        NgayTinh: NgayTinh || hoaDon.NgayTinh,
      });

      return res.status(200).json({
        success: true,
        message:
          'Cập nhật hóa đơn, chỉ số điện nước và phí phát sinh thành công!',
      });
    } catch (error) {
      console.error('Lỗi suaHoaDon:', error);
      return res.status(500).json({
        success: false,
        message: 'Không thể cập nhật hóa đơn.',
      });
    }
  },

  // =========================================================================
  // 6. [DELETE] /api/hoa-don/:maHD
  // =========================================================================
  xoaHoaDon: async (req, res) => {
    try {
      const maHD = Number(req.params.maHD);
      if (!maHD) {
        return res.status(400).json({
          success: false,
          message: 'Mã hóa đơn không hợp lệ.',
        });
      }

      const hoaDon = await HoaDonModel.getById(maHD);
      if (!hoaDon) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy hóa đơn cần xóa.',
        });
      }

      const sys = await HoaDonController.getSystemDataAndPermissions(req.user);
      if (sys.role !== 'ChuTro' && sys.role !== 'QuanLy') {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền xóa hóa đơn.',
        });
      }

      if (!sys.allowedRoomIds.includes(Number(hoaDon.MaPhong))) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền xóa hóa đơn thuộc cơ sở khác.',
        });
      }

      if (Number(hoaDon.TienDaTra) > 0) {
        return res.status(400).json({
          success: false,
          message:
            'Không thể xóa! Hóa đơn này đã phát sinh giao dịch thanh toán.',
        });
      }

      await PhatSinhModel.deleteByMaHD(maHD);
      await HoaDonModel.delete(maHD);

      return res.status(200).json({
        success: true,
        message: 'Đã xóa hóa đơn thành công!',
      });
    } catch (error) {
      console.error('Lỗi xoaHoaDon:', error);
      return res.status(500).json({
        success: false,
        message: 'Không thể xóa hóa đơn này.',
      });
    }
  },
};

module.exports = HoaDonController;