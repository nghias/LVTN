// server/src/app/controllers/KhachThueController.js
const bcrypt = require('bcrypt');
const db = require('../../database/db');
const NguoiDungModel = require('../models/nguoiDung.model');
const ThongTinCaNhanModel = require('../models/thongTinCaNhan.model');
const KhuTroModel = require('../models/khuTro.model');
const PhongTroModel = require('../models/phongTro.model');

const KhachThueController = {
  // Hàm nội bộ: Ghép dữ liệu từ NguoiDungModel + ThongTinCaNhanModel + Hợp đồng/Phòng đang ở
  buildAllKhachThueList: async () => {
    // 1. Lấy danh sách tài khoản KhachThue từ bảng NguoiDung
    const accounts = await NguoiDungModel.getByQuyen('KhachThue');
    if (!accounts || accounts.length === 0) return [];

    // 2. Lấy toàn bộ hồ sơ cá nhân từ bảng ThongTinCaNhan
    const maNDList = accounts.map((a) => Number(a.MaND));
    const profiles = await ThongTinCaNhanModel.getByMaNDList(maNDList);
    const profileMap = new Map(profiles.map((p) => [Number(p.MaND), p]));

    // 3. Lấy danh sách KhuTro và Phong từ các Model độc lập
    const [allKhus, allPhongs] = await Promise.all([
      KhuTroModel.getAll(),
      PhongTroModel.getAll(),
    ]);
    const khuMap = new Map(allKhus.map((k) => [Number(k.MaKhu), k]));
    const phongMap = new Map(allPhongs.map((p) => [Number(p.MaPhong), p]));

    // 4. Lấy thông tin hợp đồng đang hiệu lực (ConHieuLuc) và thành viên chưa rời đi (NgayDi IS NULL)
    const [activeContracts] = await db.execute(
      `SELECT MaHDT, MaPhong, TrangThai FROM HopDongThue WHERE TrangThai = 'ConHieuLuc'`
    );
    const activeHDMap = new Map(
      activeContracts.map((hd) => [Number(hd.MaHDT), hd])
    );

    const [activeMembers] = await db.execute(
      `SELECT MaND, MaHDT, VaiTro, TamTru, NgayVao, NgayDi FROM ChiTietHopDongThue WHERE NgayDi IS NULL`
    );

    // Map MaND -> Thông tin phòng và hợp đồng đang ở
    const tenantRoomMap = new Map();
    for (const ct of activeMembers) {
      const hd = activeHDMap.get(Number(ct.MaHDT));
      if (hd) {
        const phong = phongMap.get(Number(hd.MaPhong));
        const khu = phong ? khuMap.get(Number(phong.MaKhu)) : null;
        tenantRoomMap.set(Number(ct.MaND), {
          MaPhong: phong ? phong.MaPhong : null,
          TenPhong: phong ? phong.TenPhong : null,
          MaKhu: khu ? khu.MaKhu : null,
          TenKhu: khu ? khu.TenKhu : null,
          MaQuanLyKhu: khu ? khu.MaND : null,
          MaHDT: hd.MaHDT,
          TrangThaiHD: hd.TrangThai,
          VaiTro: ct.VaiTro,
          TamTru: ct.TamTru,
          NgayVao: ct.NgayVao,
          NgayDi: ct.NgayDi,
        });
      }
    }

    // 5. Ghép kết quả hoàn chỉnh
    return accounts.map((acc) => {
      const ttcn = profileMap.get(Number(acc.MaND)) || {};
      const roomInfo = tenantRoomMap.get(Number(acc.MaND)) || {};

      return {
        MaND: acc.MaND,
        TenTK: acc.TenTK,
        Quyen: acc.Quyen,
        MaTT: ttcn.MaTT || null,
        HoTen: ttcn.HoTen || '',
        GioiTinh: ttcn.GioiTinh || 'Nam',
        NamSinh: ttcn.NamSinh || null,
        CCCD: ttcn.CCCD || null,
        NgayCap: ttcn.NgayCap || null,
        NoiCap: ttcn.NoiCap || 'Cục Cảnh sát QLHC về TTXH',
        SDT: ttcn.SDT || '',
        Email: ttcn.Email || null,
        DiaChi: ttcn.DiaChi || null,
        NgheNghiep: ttcn.NgheNghiep || null,
        MaPhong: roomInfo.MaPhong || null,
        TenPhong: roomInfo.TenPhong || null,
        MaKhu: roomInfo.MaKhu || null,
        TenKhu: roomInfo.TenKhu || null,
        MaQuanLyKhu: roomInfo.MaQuanLyKhu || null,
        MaHDT: roomInfo.MaHDT || null,
        TrangThaiHD: roomInfo.TrangThaiHD || null,
        VaiTro: roomInfo.VaiTro ?? null,
        TamTru: roomInfo.TamTru ?? null,
        NgayVao: roomInfo.NgayVao || null,
        NgayDi: roomInfo.NgayDi || null,
      };
    });
  },

  // Kiểm tra quyền của Chủ trọ / Quản lý đối với 1 khách thuê
  verifyKhachThuePermission: async (maND, user) => {
    const allTenants = await KhachThueController.buildAllKhachThueList();
    const tenant = allTenants.find((t) => Number(t.MaND) === Number(maND));

    if (!tenant) {
      return {
        error: 'Không tìm thấy tài khoản khách thuê này!',
        status: 404,
        tenant: null,
      };
    }

    const userQuyen = user.quyen || user.Quyen;
    const userMaND = user.maND || user.MaND;

    if (userQuyen === 'QuanLy') {
      if (tenant.MaKhu && Number(tenant.MaQuanLyKhu) !== Number(userMaND)) {
        return {
          error: 'Khách thuê này đang ở cơ sở khác, bạn không có quyền thao tác!',
          status: 403,
          tenant: null,
        };
      }
    }

    return { error: null, status: 200, tenant };
  },

  // 1. [GET] /api/khach-thue/danh-sach
  getList: async (req, res) => {
    try {
      const userQuyen = req.user.quyen || req.user.Quyen;
      const userMaND = req.user.maND || req.user.MaND;
      const { maKhu, trangThaiPhong, keyword } = req.query;

      const allowedKhus =
        userQuyen === 'QuanLy'
          ? await KhuTroModel.getByMaND(userMaND)
          : await KhuTroModel.getAll();

      const allowedMaKhuIds = allowedKhus.map((k) => Number(k.MaKhu));
      let tenants = await KhachThueController.buildAllKhachThueList();

      if (userQuyen === 'QuanLy') {
        tenants = tenants.filter(
          (t) => !t.MaKhu || allowedMaKhuIds.includes(Number(t.MaKhu))
        );
      }

      if (maKhu) {
        if (maKhu === 'chua-co-phong') {
          tenants = tenants.filter((t) => !t.MaPhong);
        } else {
          const khuId = Number(maKhu);
          if (!allowedMaKhuIds.includes(khuId)) {
            return res.status(403).json({
              success: false,
              message: 'Bạn không có quyền xem khách thuê của cơ sở này!',
            });
          }
          tenants = tenants.filter((t) => Number(t.MaKhu) === khuId);
        }
      }

      if (trangThaiPhong === 'DangThue') {
        tenants = tenants.filter((t) => Boolean(t.MaPhong));
      } else if (trangThaiPhong === 'ChuaCoPhong') {
        tenants = tenants.filter((t) => !t.MaPhong);
      }

      if (keyword && keyword.trim() !== '') {
        const kw = keyword.trim().toLowerCase();
        tenants = tenants.filter(
          (t) =>
            (t.HoTen && t.HoTen.toLowerCase().includes(kw)) ||
            (t.SDT && t.SDT.toLowerCase().includes(kw)) ||
            (t.CCCD && t.CCCD.toLowerCase().includes(kw)) ||
            (t.Email && t.Email.toLowerCase().includes(kw)) ||
            (t.TenTK && t.TenTK.toLowerCase().includes(kw)) ||
            (t.TenPhong && t.TenPhong.toLowerCase().includes(kw)) ||
            (t.NgheNghiep && t.NgheNghiep.toLowerCase().includes(kw)) ||
            (t.DiaChi && t.DiaChi.toLowerCase().includes(kw))
        );
      }

      return res.status(200).json({
        success: true,
        message: 'Lấy danh sách khách thuê thành công!',
        data: tenants,
      });
    } catch (error) {
      console.error('Lỗi getList KhachThue:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi tải danh sách khách thuê.',
      });
    }
  },

  // 2. [GET] /api/khach-thue/:maND
  getDetail: async (req, res) => {
    try {
      const maND = Number(req.params.maND);
      const { error, status, tenant } =
        await KhachThueController.verifyKhachThuePermission(maND, req.user);

      if (error) {
        return res.status(status).json({ success: false, message: error });
      }

      return res.status(200).json({
        success: true,
        message: 'Lấy chi tiết khách thuê thành công!',
        data: tenant,
      });
    } catch (error) {
      console.error('Lỗi getDetail KhachThue:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi tải thông tin khách thuê.',
      });
    }
  },

  // 3. [POST] /api/khach-thue
  create: async (req, res) => {
    try {
      const {
        TenTK,
        MatKhau,
        HoTen,
        GioiTinh,
        NamSinh,
        CCCD,
        NgayCap,
        NoiCap,
        SDT,
        Email,
        DiaChi,
        NgheNghiep,
      } = req.body;

      if (!HoTen || !SDT || !TenTK || !MatKhau) {
        return res.status(400).json({
          success: false,
          message:
            'Vui lòng nhập đầy đủ Họ tên, Số điện thoại, Tên tài khoản và Mật khẩu!',
        });
      }

      if (String(MatKhau).length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Mật khẩu phải có ít nhất 6 ký tự!',
        });
      }

      // Kiểm tra trùng TenTK bên NguoiDungModel
      const dupTenTK = await NguoiDungModel.checkDuplicateTenTK(0, TenTK);
      if (dupTenTK) {
        return res.status(400).json({
          success: false,
          message: 'Tên tài khoản đăng nhập này đã tồn tại!',
        });
      }

      // Kiểm tra trùng Email, SDT, CCCD bên ThongTinCaNhanModel
      const dupProfile = await ThongTinCaNhanModel.checkDuplicate(0, {
        Email,
        SDT,
        CCCD,
      });
      if (dupProfile) {
        if (SDT && dupProfile.SDT === String(SDT).trim()) {
          return res.status(400).json({
            success: false,
            message: 'Số điện thoại này đã được đăng ký cho tài khoản khác!',
          });
        }
        if (CCCD && dupProfile.CCCD === String(CCCD).trim()) {
          return res.status(400).json({
            success: false,
            message: 'Số CCCD này đã tồn tại trên hệ thống!',
          });
        }
        if (Email && dupProfile.Email === String(Email).trim()) {
          return res.status(400).json({
            success: false,
            message: 'Địa chỉ Email này đã được sử dụng!',
          });
        }
      }

      const hashedPassword = await bcrypt.hash(String(MatKhau), 10);

      // Bước 1: Tạo tài khoản trong bảng NguoiDung
      const newMaND = await NguoiDungModel.create({
        TenTK,
        MatKhau: hashedPassword,
        Quyen: 'KhachThue',
      });

      // Bước 2: Tạo hồ sơ trong bảng ThongTinCaNhan
      await ThongTinCaNhanModel.create({
        MaND: newMaND,
        HoTen,
        GioiTinh,
        NamSinh,
        CCCD,
        NgayCap,
        NoiCap,
        SDT,
        Email,
        DiaChi,
        NgheNghiep,
      });

      return res.status(201).json({
        success: true,
        message: 'Tạo tài khoản và hồ sơ khách thuê thành công!',
        data: { MaND: newMaND },
      });
    } catch (error) {
      console.error('Lỗi create KhachThue:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi tạo tài khoản khách thuê.',
      });
    }
  },

  // 4. [PUT] /api/khach-thue/:maND
  update: async (req, res) => {
    try {
      const maND = Number(req.params.maND);
      const { error, status } =
        await KhachThueController.verifyKhachThuePermission(maND, req.user);

      if (error) {
        return res.status(status).json({ success: false, message: error });
      }

      const {
        TenTK,
        HoTen,
        GioiTinh,
        NamSinh,
        CCCD,
        NgayCap,
        NoiCap,
        SDT,
        Email,
        DiaChi,
        NgheNghiep,
      } = req.body;

      if (!HoTen || !SDT || !TenTK) {
        return res.status(400).json({
          success: false,
          message: 'Họ tên, Số điện thoại và Tên tài khoản không được để trống!',
        });
      }

      // Kiểm tra trùng TenTK bên NguoiDungModel
      const dupTenTK = await NguoiDungModel.checkDuplicateTenTK(maND, TenTK);
      if (dupTenTK) {
        return res.status(400).json({
          success: false,
          message: 'Tên tài khoản đăng nhập này đã được sử dụng!',
        });
      }

      // Kiểm tra trùng Email, SDT, CCCD bên ThongTinCaNhanModel
      const dupProfile = await ThongTinCaNhanModel.checkDuplicate(maND, {
        Email,
        SDT,
        CCCD,
      });
      if (dupProfile) {
        if (SDT && dupProfile.SDT === String(SDT).trim()) {
          return res.status(400).json({
            success: false,
            message: 'Số điện thoại này đã thuộc về người dùng khác!',
          });
        }
        if (CCCD && dupProfile.CCCD === String(CCCD).trim()) {
          return res.status(400).json({
            success: false,
            message: 'Số CCCD này đã thuộc về người dùng khác!',
          });
        }
        if (Email && dupProfile.Email === String(Email).trim()) {
          return res.status(400).json({
            success: false,
            message: 'Địa chỉ Email này đã thuộc về người dùng khác!',
          });
        }
      }

      // Bước 1: Cập nhật TenTK ở bảng NguoiDung
      await NguoiDungModel.update(maND, { TenTK });

      // Bước 2: Cập nhật hồ sơ ở bảng ThongTinCaNhan
      await ThongTinCaNhanModel.upsertByMaND(maND, {
        HoTen,
        GioiTinh,
        NamSinh,
        CCCD,
        NgayCap,
        NoiCap,
        SDT,
        Email,
        DiaChi,
        NgheNghiep,
      });

      return res.status(200).json({
        success: true,
        message: 'Cập nhật thông tin khách thuê thành công!',
      });
    } catch (error) {
      console.error('Lỗi update KhachThue:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi cập nhật thông tin khách thuê.',
      });
    }
  },

  // 5. [PUT] /api/khach-thue/:maND/cap-lai-mat-khau
  resetPassword: async (req, res) => {
    try {
      const maND = Number(req.params.maND);
      const { matKhauMoi } = req.body;

      const { error, status } =
        await KhachThueController.verifyKhachThuePermission(maND, req.user);
      if (error) {
        return res.status(status).json({ success: false, message: error });
      }

      if (!matKhauMoi || String(matKhauMoi).length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Mật khẩu mới phải có ít nhất 6 ký tự!',
        });
      }

      const hashedPassword = await bcrypt.hash(String(matKhauMoi), 10);
      await NguoiDungModel.updatePassword(maND, hashedPassword);

      return res.status(200).json({
        success: true,
        message: 'Đã cấp lại mật khẩu mới cho khách thuê thành công!',
      });
    } catch (error) {
      console.error('Lỗi resetPassword KhachThue:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi cấp lại mật khẩu.',
      });
    }
  },

  // 6. [DELETE] /api/khach-thue/:maND
  delete: async (req, res) => {
    try {
      const maND = Number(req.params.maND);
      const { error, status, tenant } =
        await KhachThueController.verifyKhachThuePermission(maND, req.user);

      if (error) {
        return res.status(status).json({ success: false, message: error });
      }

      if (tenant.MaPhong) {
        return res.status(400).json({
          success: false,
          message: `Khách thuê đang ở phòng ${tenant.TenPhong} (${tenant.TenKhu}). Vui lòng thanh lý hợp đồng trước khi xóa tài khoản!`,
        });
      }

      const [contractRows] = await db.execute(
        `SELECT COUNT(*) AS total FROM ChiTietHopDongThue WHERE MaND = ?`,
        [maND]
      );
      if ((contractRows[0]?.total || 0) > 0) {
        return res.status(400).json({
          success: false,
          message:
            'Tài khoản này đã có lịch sử hợp đồng thuê phòng trong hệ thống, không thể xóa để bảo toàn dữ liệu hóa đơn!',
        });
      }

      // Xóa hồ sơ cá nhân trước -> Xóa tài khoản người dùng sau
      await ThongTinCaNhanModel.deleteByMaND(maND);
      await NguoiDungModel.delete(maND);

      return res.status(200).json({
        success: true,
        message: 'Đã xóa tài khoản và hồ sơ khách thuê thành công!',
      });
    } catch (error) {
      console.error('Lỗi delete KhachThue:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi xóa khách thuê.',
      });
    }
  },
};

module.exports = KhachThueController;