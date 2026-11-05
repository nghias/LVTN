// server/src/app/controllers/dienNuoc.controller.js
const ChiSoDienNuocModel = require('../models/chiSoDienNuoc.model');
const GiaDienNuocModel = require('../models/giaDienNuoc.model');
const KhuTroModel = require('../models/khuTro.model');
const PhongTroModel = require('../models/phongTro.model');
const NguoiDungModel = require('../models/nguoiDung.model');

const DienNuocController = {
  // Hàm nội bộ: Lấy danh sách phòng của người thuê qua Model (Không dùng SQL trong Controller)
  getRoomsByTenantMaND: async (maND) => {
    // Cách 1: Gọi hàm getPhongCuaNguoiThue từ PhongTroModel
    if (typeof PhongTroModel.getPhongCuaNguoiThue === 'function') {
      const rooms = await PhongTroModel.getPhongCuaNguoiThue(maND);
      if (rooms && rooms.length > 0) {
        return rooms;
      }
    }

    // Cách 2 (Dự phòng): Lấy từ NguoiDungModel.getAllKhachThueWithRoom đã có sẵn
    if (typeof NguoiDungModel.getAllKhachThueWithRoom === 'function') {
      const dsKhach = (await NguoiDungModel.getAllKhachThueWithRoom()) || [];
      const myRecord = dsKhach.filter(
        (k) => Number(k.MaND) === Number(maND) && k.MaPhong
      );

      if (myRecord.length > 0) {
        return myRecord.map((r) => ({
          MaPhong: r.MaPhong,
          TenPhong: r.TenPhong,
          MaKhu: r.MaKhu,
          TrangThai: 'DangThue',
          TenKhu: r.TenKhu || '',
        }));
      }
    }

    return [];
  },

  // [GET] /api/dien-nuoc/nguoi-thue (?maPhong=...&thangNam=...&search=...)
  getDanhSachChiSoNguoiThue: async (req, res) => {
    try {
      const { maPhong = '', thangNam = '', search = '' } = req.query;
      const maND = Number(req.user.maND || req.user.MaND);

      // 1. Lấy danh sách phòng đang thuê của người dùng qua Model
      const myRooms = await DienNuocController.getRoomsByTenantMaND(maND);
      const allowedRoomIds = myRooms.map((r) => Number(r.MaPhong));

      if (allowedRoomIds.length === 0) {
        const giaHienTai = (await GiaDienNuocModel.getCurrentPrice()) || {
          GiaDien: 3800,
          GiaNuoc: 18000,
          NgayApDung: '2026-08-01',
        };
        return res.status(200).json({
          success: true,
          data: [],
          giaHienTai,
          phongList: [],
        });
      }

      // 2. Lấy chỉ số điện nước của các phòng đang thuê và bảng giá
      const [dsChiSoAll, dsGia] = await Promise.all([
        typeof ChiSoDienNuocModel.getByMaPhongList === 'function'
          ? ChiSoDienNuocModel.getByMaPhongList(allowedRoomIds)
          : ChiSoDienNuocModel.getAll().then((rows) =>
              rows.filter((cs) => allowedRoomIds.includes(Number(cs.MaPhong)))
            ),
        GiaDienNuocModel.getAll(),
      ]);

      const giaHienTai = dsGia[0] || {
        GiaDien: 3800,
        GiaNuoc: 18000,
        NgayApDung: '2026-08-01',
      };

      // 3. Tính toán sản lượng tiêu thụ & thành tiền tại Controller
      let data = dsChiSoAll.map((cs) => {
        const room = myRooms.find((r) => Number(r.MaPhong) === Number(cs.MaPhong));
        const matchedPrice =
          dsGia.find((g) => String(g.NgayApDung) <= String(cs.NgayGhi)) || giaHienTai;

        const soDienTieuThu = Math.max(0, Number(cs.SoDienMoi) - Number(cs.SoDienCu));
        const soNuocTieuThu = Math.max(0, Number(cs.SoNuocMoi) - Number(cs.SoNuocCu));
        const tienDienTamTinh = soDienTieuThu * Number(matchedPrice.GiaDien);
        const tienNuocTamTinh = soNuocTieuThu * Number(matchedPrice.GiaNuoc);

        return {
          ...cs,
          TenPhong: room ? room.TenPhong : `Phòng #${cs.MaPhong}`,
          MaKhu: room ? room.MaKhu : null,
          TenKhu: room && room.TenKhu ? room.TenKhu : '',
          SoDienTieuThu: soDienTieuThu,
          SoNuocTieuThu: soNuocTieuThu,
          DonGiaDienApDung: Number(matchedPrice.GiaDien),
          DonGiaNuocApDung: Number(matchedPrice.GiaNuoc),
          TienDienTamTinh: tienDienTamTinh,
          TienNuocTamTinh: tienNuocTamTinh,
          TongTienDienNuoc: tienDienTamTinh + tienNuocTamTinh,
        };
      });

      if (maPhong) {
        data = data.filter((item) => Number(item.MaPhong) === Number(maPhong));
      }

      if (thangNam && thangNam.trim() !== '') {
        data = data.filter(
          (item) => item.NgayGhi && String(item.NgayGhi).startsWith(thangNam.trim())
        );
      }

      if (search && search.trim() !== '') {
        const kw = search.trim().toLowerCase();
        data = data.filter(
          (item) =>
            item.TenPhong.toLowerCase().includes(kw) ||
            item.TenKhu.toLowerCase().includes(kw) ||
            String(item.MaCS).includes(kw)
        );
      }

      return res.status(200).json({
        success: true,
        data,
        giaHienTai,
        phongList: myRooms,
      });
    } catch (error) {
      console.error('Lỗi getDanhSachChiSoNguoiThue:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi tải chỉ số điện nước của người thuê',
      });
    }
  },

  // Hàm nội bộ: Lấy danh sách Khu trọ và Phòng trọ theo quyền của Quản lý / Chủ trọ
  getAccessibleKhusAndRooms: async (user) => {
    const quyen = user.quyen || user.Quyen;
    const maND = Number(user.maND || user.MaND);

    const allowedKhus =
      quyen === 'QuanLy'
        ? await KhuTroModel.getByMaND(maND)
        : await KhuTroModel.getAll();

    if (!allowedKhus || allowedKhus.length === 0) {
      return { allowedKhus: [], allowedRooms: [], allowedRoomIds: [] };
    }

    const maKhuIds = allowedKhus.map((k) => Number(k.MaKhu));
    const allowedRooms = await PhongTroModel.getByMaKhuIds(maKhuIds);
    const allowedRoomIds = allowedRooms.map((r) => Number(r.MaPhong));

    return { allowedKhus, allowedRooms, allowedRoomIds };
  },

  // 1. [GET] /api/dien-nuoc/options (?thangNam=YYYY-MM)
  getOptions: async (req, res) => {
    try {
      const { thangNam = '' } = req.query;

      const [{ allowedKhus, allowedRooms, allowedRoomIds }, giaHienTai, dsChiSo] =
        await Promise.all([
          DienNuocController.getAccessibleKhusAndRooms(req.user),
          GiaDienNuocModel.getCurrentPrice(),
          ChiSoDienNuocModel.getAll(),
        ]);

      const latestIndexByRoom = {};
      const recordedInMonthByRoom = {};

      for (const cs of dsChiSo) {
        const roomId = Number(cs.MaPhong);
        if (!allowedRoomIds.includes(roomId)) continue;

        if (!latestIndexByRoom[roomId]) {
          latestIndexByRoom[roomId] = {
            SoDienMoiGanNhat: Number(cs.SoDienMoi) || 0,
            SoNuocMoiGanNhat: Number(cs.SoNuocMoi) || 0,
            NgayGhiGanNhat: cs.NgayGhi,
          };
        }

        if (
          thangNam &&
          cs.NgayGhi &&
          String(cs.NgayGhi).startsWith(thangNam.trim()) &&
          !recordedInMonthByRoom[roomId]
        ) {
          recordedInMonthByRoom[roomId] = {
            MaCS: cs.MaCS,
            SoDienCu: Number(cs.SoDienCu),
            SoDienMoi: Number(cs.SoDienMoi),
            SoNuocCu: Number(cs.SoNuocCu),
            SoNuocMoi: Number(cs.SoNuocMoi),
            NgayGhi: cs.NgayGhi,
          };
        }
      }

      const phongList = allowedRooms.map((room) => {
        const roomId = Number(room.MaPhong);
        const khu = allowedKhus.find((k) => Number(k.MaKhu) === Number(room.MaKhu));
        const latest = latestIndexByRoom[roomId] || null;
        const recordedMonth = recordedInMonthByRoom[roomId] || null;

        return {
          MaPhong: room.MaPhong,
          MaKhu: room.MaKhu,
          TenPhong: room.TenPhong,
          TrangThai: room.TrangThai,
          TenKhu: khu ? khu.TenKhu : '',
          SoDienGoiY: latest ? latest.SoDienMoiGanNhat : 0,
          SoNuocGoiY: latest ? latest.SoNuocMoiGanNhat : 0,
          NgayGhiGanNhat: latest ? latest.NgayGhiGanNhat : null,
          DaGhiThangNay: Boolean(recordedMonth),
          ChiSoThangNay: recordedMonth,
        };
      });

      return res.status(200).json({
        success: true,
        data: {
          khuTroList: allowedKhus,
          phongList,
          giaHienTai,
        },
      });
    } catch (error) {
      console.error('Lỗi getOptions điện nước:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi tải dữ liệu cơ sở và phòng trọ',
      });
    }
  },

  // 2. [GET] /api/dien-nuoc
  getDanhSachChiSo: async (req, res) => {
    try {
      const { maKhu = '', maPhong = '', thangNam = '', search = '' } = req.query;

      const [{ allowedKhus, allowedRooms, allowedRoomIds }, dsChiSoAll, dsGia] =
        await Promise.all([
          DienNuocController.getAccessibleKhusAndRooms(req.user),
          ChiSoDienNuocModel.getAll(),
          GiaDienNuocModel.getAll(),
        ]);

      const giaHienTai = dsGia[0] || { GiaDien: 3800, GiaNuoc: 18000 };

      const filtered = dsChiSoAll.filter((cs) =>
        allowedRoomIds.includes(Number(cs.MaPhong))
      );

      let data = filtered.map((cs) => {
        const room = allowedRooms.find((r) => Number(r.MaPhong) === Number(cs.MaPhong));
        const khu = room
          ? allowedKhus.find((k) => Number(k.MaKhu) === Number(room.MaKhu))
          : null;

        const matchedPrice =
          dsGia.find((g) => String(g.NgayApDung) <= String(cs.NgayGhi)) || giaHienTai;

        const soDienTieuThu = Math.max(0, Number(cs.SoDienMoi) - Number(cs.SoDienCu));
        const soNuocTieuThu = Math.max(0, Number(cs.SoNuocMoi) - Number(cs.SoNuocCu));
        const tienDienTamTinh = soDienTieuThu * Number(matchedPrice.GiaDien);
        const tienNuocTamTinh = soNuocTieuThu * Number(matchedPrice.GiaNuoc);

        return {
          ...cs,
          TenPhong: room ? room.TenPhong : `Phòng #${cs.MaPhong}`,
          MaKhu: room ? room.MaKhu : null,
          TenKhu: khu ? khu.TenKhu : '',
          SoDienTieuThu: soDienTieuThu,
          SoNuocTieuThu: soNuocTieuThu,
          DonGiaDienApDung: Number(matchedPrice.GiaDien),
          DonGiaNuocApDung: Number(matchedPrice.GiaNuoc),
          TienDienTamTinh: tienDienTamTinh,
          TienNuocTamTinh: tienNuocTamTinh,
          TongTienDienNuoc: tienDienTamTinh + tienNuocTamTinh,
        };
      });

      if (maKhu) {
        data = data.filter((item) => Number(item.MaKhu) === Number(maKhu));
      }
      if (maPhong) {
        data = data.filter((item) => Number(item.MaPhong) === Number(maPhong));
      }
      if (thangNam && thangNam.trim() !== '') {
        data = data.filter(
          (item) => item.NgayGhi && String(item.NgayGhi).startsWith(thangNam.trim())
        );
      }
      if (search && search.trim() !== '') {
        const kw = search.trim().toLowerCase();
        data = data.filter(
          (item) =>
            item.TenPhong.toLowerCase().includes(kw) ||
            item.TenKhu.toLowerCase().includes(kw) ||
            String(item.MaCS).includes(kw)
        );
      }

      return res.status(200).json({
        success: true,
        data,
        giaHienTai,
        khuTroList: allowedKhus,
        phongList: allowedRooms,
      });
    } catch (error) {
      console.error('Lỗi getDanhSachChiSo:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi tải danh sách chỉ số điện nước',
      });
    }
  },

  // 3. [GET] /api/dien-nuoc/chi-so/:maCS
  getChiTietChiSo: async (req, res) => {
    try {
      const maCS = Number(req.params.maCS);
      if (!maCS) {
        return res.status(400).json({
          success: false,
          message: 'Mã chỉ số không hợp lệ',
        });
      }

      const chiSo = await ChiSoDienNuocModel.getById(maCS);
      if (!chiSo) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy bản ghi chỉ số điện nước này',
        });
      }

      const { allowedKhus, allowedRooms, allowedRoomIds } =
        await DienNuocController.getAccessibleKhusAndRooms(req.user);

      if (!allowedRoomIds.includes(Number(chiSo.MaPhong))) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền truy cập chỉ số của phòng này',
        });
      }

      const room = allowedRooms.find((r) => Number(r.MaPhong) === Number(chiSo.MaPhong));
      const khu = room
        ? allowedKhus.find((k) => Number(k.MaKhu) === Number(room.MaKhu))
        : null;

      return res.status(200).json({
        success: true,
        data: {
          ...chiSo,
          TenPhong: room ? room.TenPhong : '',
          MaKhu: room ? room.MaKhu : null,
          TenKhu: khu ? khu.TenKhu : '',
        },
      });
    } catch (error) {
      console.error('Lỗi getChiTietChiSo:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi tải chi tiết chỉ số điện nước',
      });
    }
  },

  // 4. [POST] /api/dien-nuoc/chi-so
  themChiSo: async (req, res) => {
    try {
      const { MaPhong, SoDienMoi, SoNuocMoi, NgayGhi } = req.body;

      if (!MaPhong || !NgayGhi) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng chọn phòng trọ và ngày ghi chỉ số',
        });
      }

      const { allowedRoomIds } = await DienNuocController.getAccessibleKhusAndRooms(
        req.user
      );

      if (!allowedRoomIds.includes(Number(MaPhong))) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền ghi chỉ số cho phòng này',
        });
      }

      const existedMonth = await ChiSoDienNuocModel.checkExistsInMonth(MaPhong, NgayGhi);
      if (existedMonth) {
        return res.status(400).json({
          success: false,
          message: `Phòng này đã có bản ghi chỉ số trong tháng này (Mã #${existedMonth.MaCS} ngày ${existedMonth.NgayGhi}).`,
        });
      }

      const latestRecord = await ChiSoDienNuocModel.getLatestByMaPhong(Number(MaPhong));
      const dienCu = latestRecord ? Number(latestRecord.SoDienMoi) || 0 : 0;
      const nuocCu = latestRecord ? Number(latestRecord.SoNuocMoi) || 0 : 0;

      const dienMoi = Number(SoDienMoi);
      const nuocMoi = Number(SoNuocMoi);

      if (Number.isNaN(dienMoi) || Number.isNaN(nuocMoi)) {
        return res.status(400).json({
          success: false,
          message: 'Chỉ số điện mới và nước mới phải là số hợp lệ',
        });
      }

      if (dienMoi < dienCu) {
        return res.status(400).json({
          success: false,
          message: `Số điện mới (${dienMoi}) không được nhỏ hơn số điện cũ trong hệ thống (${dienCu})!`,
        });
      }

      if (nuocMoi < nuocCu) {
        return res.status(400).json({
          success: false,
          message: `Số nước mới (${nuocMoi}) không được nhỏ hơn số nước cũ trong hệ thống (${nuocCu})!`,
        });
      }

      const maCSMoi = await ChiSoDienNuocModel.create({
        MaPhong: Number(MaPhong),
        SoDienCu: dienCu,
        SoDienMoi: dienMoi,
        SoNuocCu: nuocCu,
        SoNuocMoi: nuocMoi,
        NgayGhi,
      });

      return res.status(201).json({
        success: true,
        message: 'Ghi chỉ số điện nước thành công!',
        data: { MaCS: maCSMoi },
      });
    } catch (error) {
      console.error('Lỗi themChiSo:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi thêm chỉ số điện nước',
      });
    }
  },

  // 5. [POST] /api/dien-nuoc/chi-so/hang-loat
  themNhieuChiSo: async (req, res) => {
    try {
      const { NgayGhi, DanhSachChiSo } = req.body;

      if (!NgayGhi || !Array.isArray(DanhSachChiSo) || DanhSachChiSo.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng chọn ngày ghi và nhập ít nhất 1 phòng trọ',
        });
      }

      const { allowedRooms, allowedRoomIds } =
        await DienNuocController.getAccessibleKhusAndRooms(req.user);

      const validatedRecords = [];

      for (const item of DanhSachChiSo) {
        const maPhong = Number(item.MaPhong);
        const roomObj = allowedRooms.find((r) => Number(r.MaPhong) === maPhong);
        const tenPhong = roomObj ? roomObj.TenPhong : `Phòng #${maPhong}`;

        if (!allowedRoomIds.includes(maPhong)) {
          return res.status(403).json({
            success: false,
            message: `Bạn không có quyền ghi chỉ số cho ${tenPhong}!`,
          });
        }

        const existedMonth = await ChiSoDienNuocModel.checkExistsInMonth(
          maPhong,
          NgayGhi
        );
        if (existedMonth) {
          return res.status(400).json({
            success: false,
            message: `${tenPhong} đã được ghi chỉ số trong tháng này (Mã #${existedMonth.MaCS}).`,
          });
        }

        const latest = await ChiSoDienNuocModel.getLatestByMaPhong(maPhong);
        const dienCu = latest ? Number(latest.SoDienMoi) || 0 : 0;
        const nuocCu = latest ? Number(latest.SoNuocMoi) || 0 : 0;

        const dienMoi = Number(item.SoDienMoi);
        const nuocMoi = Number(item.SoNuocMoi);

        if (Number.isNaN(dienMoi) || Number.isNaN(nuocMoi)) {
          return res.status(400).json({
            success: false,
            message: `${tenPhong}: Vui lòng nhập đầy đủ số điện mới và số nước mới hợp lệ!`,
          });
        }

        if (dienMoi < dienCu) {
          return res.status(400).json({
            success: false,
            message: `${tenPhong}: Số điện mới (${dienMoi}) không được nhỏ hơn số điện cũ (${dienCu})!`,
          });
        }

        if (nuocMoi < nuocCu) {
          return res.status(400).json({
            success: false,
            message: `${tenPhong}: Số nước mới (${nuocMoi}) không được nhỏ hơn số nước cũ (${nuocCu})!`,
          });
        }

        validatedRecords.push({
          MaPhong: maPhong,
          SoDienCu: dienCu,
          SoDienMoi: dienMoi,
          SoNuocCu: nuocCu,
          SoNuocMoi: nuocMoi,
          NgayGhi,
        });
      }

      for (const rec of validatedRecords) {
        await ChiSoDienNuocModel.create(rec);
      }

      return res.status(201).json({
        success: true,
        message: `Đã lưu thành công chỉ số điện nước cho ${validatedRecords.length} phòng!`,
        data: { SoPhongDaLuu: validatedRecords.length },
      });
    } catch (error) {
      console.error('Lỗi themNhieuChiSo:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi lưu hàng loạt chỉ số điện nước',
      });
    }
  },

  // 6. [PUT] /api/dien-nuoc/chi-so/:maCS
  suaChiSo: async (req, res) => {
    try {
      const maCS = Number(req.params.maCS);
      const { SoDienMoi, SoNuocMoi, NgayGhi } = req.body;

      if (!maCS) {
        return res.status(400).json({
          success: false,
          message: 'Mã chỉ số không hợp lệ',
        });
      }

      const currentCS = await ChiSoDienNuocModel.getById(maCS);
      if (!currentCS) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy bản ghi chỉ số cần sửa',
        });
      }

      const { allowedRoomIds } = await DienNuocController.getAccessibleKhusAndRooms(
        req.user
      );

      if (!allowedRoomIds.includes(Number(currentCS.MaPhong))) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền chỉnh sửa chỉ số của phòng này',
        });
      }

      const maPhongGoc = Number(currentCS.MaPhong);
      const dienCuGoc = Number(currentCS.SoDienCu);
      const nuocCuGoc = Number(currentCS.SoNuocCu);

      const dienMoi = Number(SoDienMoi);
      const nuocMoi = Number(SoNuocMoi);

      if (Number.isNaN(dienMoi) || Number.isNaN(nuocMoi)) {
        return res.status(400).json({
          success: false,
          message: 'Chỉ số điện mới và nước mới không hợp lệ',
        });
      }

      if (dienMoi < dienCuGoc) {
        return res.status(400).json({
          success: false,
          message: `Số điện mới (${dienMoi}) không được nhỏ hơn số điện cũ cố định (${dienCuGoc})!`,
        });
      }

      if (nuocMoi < nuocCuGoc) {
        return res.status(400).json({
          success: false,
          message: `Số nước mới (${nuocMoi}) không được nhỏ hơn số nước cũ cố định (${nuocCuGoc})!`,
        });
      }

      const ngayGhiCapNhat = NgayGhi || currentCS.NgayGhi;
      const existedMonth = await ChiSoDienNuocModel.checkExistsInMonth(
        maPhongGoc,
        ngayGhiCapNhat,
        maCS
      );
      if (existedMonth) {
        return res.status(400).json({
          success: false,
          message: `Phòng này đã có bản ghi chỉ số khác trong cùng tháng (Mã #${existedMonth.MaCS})!`,
        });
      }

      await ChiSoDienNuocModel.update(maCS, {
        MaPhong: maPhongGoc,
        SoDienCu: dienCuGoc,
        SoDienMoi: dienMoi,
        SoNuocCu: nuocCuGoc,
        SoNuocMoi: nuocMoi,
        NgayGhi: ngayGhiCapNhat,
      });

      return res.status(200).json({
        success: true,
        message: 'Cập nhật chỉ số điện nước thành công!',
      });
    } catch (error) {
      console.error('Lỗi suaChiSo:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi cập nhật chỉ số điện nước',
      });
    }
  },

  // 7. [DELETE] /api/dien-nuoc/chi-so/:maCS
  xoaChiSo: async (req, res) => {
    try {
      const maCS = Number(req.params.maCS);
      if (!maCS) {
        return res.status(400).json({
          success: false,
          message: 'Mã chỉ số không hợp lệ',
        });
      }

      const currentCS = await ChiSoDienNuocModel.getById(maCS);
      if (!currentCS) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy bản ghi chỉ số cần xóa',
        });
      }

      const { allowedRoomIds } = await DienNuocController.getAccessibleKhusAndRooms(
        req.user
      );

      if (!allowedRoomIds.includes(Number(currentCS.MaPhong))) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền xóa chỉ số của phòng này',
        });
      }

      await ChiSoDienNuocModel.delete(maCS);

      return res.status(200).json({
        success: true,
        message: 'Đã xóa bản ghi chỉ số điện nước thành công!',
      });
    } catch (error) {
      if (error && (error.code === 'ER_ROW_IS_REFERENCED_2' || error.errno === 1451)) {
        return res.status(400).json({
          success: false,
          message:
            'Không thể xóa! Chỉ số điện nước này đã được sử dụng để lập Hóa đơn hàng tháng.',
        });
      }
      console.error('Lỗi xoaChiSo:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi xóa chỉ số điện nước',
      });
    }
  },

  // 8. [GET] /api/dien-nuoc/gia
  getDanhSachGia: async (req, res) => {
    try {
      const [dsGia, giaHienTai] = await Promise.all([
        GiaDienNuocModel.getAll(),
        GiaDienNuocModel.getCurrentPrice(),
      ]);

      return res.status(200).json({
        success: true,
        data: {
          giaHienTai,
          lichSuGia: dsGia,
        },
      });
    } catch (error) {
      console.error('Lỗi getDanhSachGia:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi tải đơn giá điện nước',
      });
    }
  },

  // 9. [POST] /api/dien-nuoc/gia
  capNhatGiaDienNuoc: async (req, res) => {
    try {
      const { GiaDien, GiaNuoc, NgayApDung } = req.body;

      if (
        GiaDien === undefined ||
        GiaDien === '' ||
        Number(GiaDien) < 0 ||
        GiaNuoc === undefined ||
        GiaNuoc === '' ||
        Number(GiaNuoc) < 0
      ) {
        return res.status(400).json({
          success: false,
          message: 'Đơn giá điện và đơn giá nước phải là số không âm',
        });
      }

      if (!NgayApDung) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng chọn ngày bắt đầu áp dụng đơn giá mới',
        });
      }

      const maGiaMoi = await GiaDienNuocModel.create({
        GiaDien: Number(GiaDien),
        GiaNuoc: Number(GiaNuoc),
        NgayApDung,
      });

      return res.status(201).json({
        success: true,
        message: 'Cập nhật đơn giá điện nước mới thành công!',
        data: { MaGia: maGiaMoi },
      });
    } catch (error) {
      console.error('Lỗi capNhatGiaDienNuoc:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi cập nhật đơn giá điện nước',
      });
    }
  },

  // 10. [PUT] /api/dien-nuoc/gia/:maGia
  suaGiaDienNuoc: async (req, res) => {
    try {
      const maGia = Number(req.params.maGia);
      const { GiaDien, GiaNuoc, NgayApDung } = req.body;

      if (!maGia) {
        return res.status(400).json({
          success: false,
          message: 'Mã giá không hợp lệ',
        });
      }

      const currentGia = await GiaDienNuocModel.getById(maGia);
      if (!currentGia) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy bản ghi đơn giá cần sửa',
        });
      }

      await GiaDienNuocModel.update(maGia, {
        GiaDien: Number(GiaDien),
        GiaNuoc: Number(GiaNuoc),
        NgayApDung,
      });

      return res.status(200).json({
        success: true,
        message: 'Đã chỉnh sửa mốc giá điện nước thành công!',
      });
    } catch (error) {
      console.error('Lỗi suaGiaDienNuoc:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi sửa đơn giá điện nước',
      });
    }
  },

  // 11. [DELETE] /api/dien-nuoc/gia/:maGia
  xoaGiaDienNuoc: async (req, res) => {
    try {
      const maGia = Number(req.params.maGia);
      const dsGia = await GiaDienNuocModel.getAll();

      if (dsGia.length <= 1) {
        return res.status(400).json({
          success: false,
          message: 'Hệ thống phải giữ lại tối thiểu 1 mức đơn giá điện nước để tính hóa đơn!',
        });
      }

      await GiaDienNuocModel.delete(maGia);

      return res.status(200).json({
        success: true,
        message: 'Đã xóa mốc giá điện nước thành công!',
      });
    } catch (error) {
      console.error('Lỗi xoaGiaDienNuoc:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi xóa mốc giá điện nước',
      });
    }
  },
};

module.exports = DienNuocController;