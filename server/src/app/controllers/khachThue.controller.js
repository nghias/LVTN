// server/src/app/controllers/KhachThueController.js
const bcrypt = require('bcrypt');
const db = require('../../database/db');
const NguoiDungModel = require('../models/nguoiDung.model');

const KhachThueController = {
  // Lấy danh sách MaKhu mà người dùng hiện tại được phép quản lý (không phụ thuộc KhuTroModel cũ)
  getAllowedKhuIds: async (userQuyen, userMaND) => {
    if (userQuyen === 'QuanLy') {
      const [rows] = await db.query(
        `SELECT MaKhu FROM KhuTro WHERE MaND = ? ORDER BY MaKhu ASC`,
        [Number(userMaND)]
      );
      return rows.map((r) => Number(r.MaKhu));
    }
    const [rows] = await db.query(`SELECT MaKhu FROM KhuTro ORDER BY MaKhu ASC`);
    return rows.map((r) => Number(r.MaKhu));
  },

  // Hàm nội bộ kiểm tra quyền thao tác trên 1 khách thuê
  verifyKhachThuePermission: async (maND, user) => {
    const allTenants = await NguoiDungModel.getAllKhachThueWithRoom();
    const tenant = allTenants.find((t) => Number(t.MaND) === Number(maND));

    if (!tenant) {
      return {
        error: 'Không tìm thấy tài khoản khách thuê này!',
        status: 404,
        tenant: null,
      };
    }

    const userQuyen = user?.quyen || user?.Quyen;
    const userMaND = Number(user?.maND || user?.MaND);

    if (userQuyen === 'QuanLy') {
      if (tenant.MaKhu && Number(tenant.MaQuanLyKhu) !== userMaND) {
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
      const userQuyen = req.user?.quyen || req.user?.Quyen;
      const userMaND = Number(req.user?.maND || req.user?.MaND);
      const { maKhu, trangThaiPhong, keyword } = req.query;

      const [allowedMaKhuIds, allTenants] = await Promise.all([
        KhachThueController.getAllowedKhuIds(userQuyen, userMaND),
        NguoiDungModel.getAllKhachThueWithRoom(),
      ]);

      let tenants = allTenants;

      // Quản lý chỉ xem khách thuộc cơ sở mình phụ trách HOẶC khách chưa xếp phòng
      if (userQuyen === 'QuanLy') {
        tenants = tenants.filter(
          (t) => !t.MaKhu || allowedMaKhuIds.includes(Number(t.MaKhu))
        );
      }

      if (maKhu) {
        if (maKhu === 'chua-co-phong' || maKhu === 'UNASSIGNED') {
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
        message: error.message || 'Lỗi máy chủ khi tải danh sách khách thuê.',
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
        message: error.message || 'Lỗi máy chủ khi tải thông tin khách thuê.',
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
          message: 'Vui lòng nhập đầy đủ Họ tên, Số điện thoại, Tên tài khoản và Mật khẩu!',
        });
      }

      if (String(MatKhau).trim().length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Mật khẩu phải có ít nhất 6 ký tự!',
        });
      }

      const duplicate = await NguoiDungModel.checkDuplicateUser({
        TenTK: String(TenTK).trim(),
        Email: Email ? String(Email).trim() : '',
        SDT: String(SDT).trim(),
        CCCD: CCCD ? String(CCCD).trim() : '',
      });

      if (duplicate) {
        if (TenTK && duplicate.TenTK === String(TenTK).trim()) {
          return res.status(400).json({
            success: false,
            message: 'Tên tài khoản đăng nhập này đã tồn tại!',
          });
        }
        if (SDT && duplicate.SDT === String(SDT).trim()) {
          return res.status(400).json({
            success: false,
            message: 'Số điện thoại này đã được đăng ký cho tài khoản khác!',
          });
        }
        if (CCCD && duplicate.CCCD === String(CCCD).trim()) {
          return res.status(400).json({
            success: false,
            message: 'Số CCCD này đã tồn tại trên hệ thống!',
          });
        }
        if (Email && duplicate.Email === String(Email).trim()) {
          return res.status(400).json({
            success: false,
            message: 'Địa chỉ Email này đã được sử dụng!',
          });
        }
      }

      const hashedPassword = await bcrypt.hash(String(MatKhau).trim(), 10);

      const newMaND = await NguoiDungModel.createKhachThue({
        TenTK: String(TenTK).trim(),
        MatKhau: hashedPassword,
        HoTen: String(HoTen).trim(),
        GioiTinh: GioiTinh || 'Nam',
        NamSinh: NamSinh ? Number(NamSinh) : null,
        CCCD: CCCD ? String(CCCD).trim() : null,
        NgayCap: NgayCap || null,
        NoiCap: NoiCap ? String(NoiCap).trim() : 'Cục Cảnh sát QLHC về TTXH',
        SDT: String(SDT).trim(),
        Email: Email ? String(Email).trim() : null,
        DiaChi: DiaChi ? String(DiaChi).trim() : null,
        NgheNghiep: NgheNghiep ? String(NgheNghiep).trim() : null,
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
        message: error.message || 'Lỗi máy chủ khi tạo tài khoản khách thuê.',
      });
    }
  },

  // 4. [PUT] /api/khach-thue/:maND
  update: async (req, res) => {
    try {
      const maND = Number(req.params.maND);
      const { error, status, tenant } =
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

      const finalTenTK = TenTK ? String(TenTK).trim() : tenant.TenTK;

      if (!HoTen || !SDT) {
        return res.status(400).json({
          success: false,
          message: 'Họ tên và Số điện thoại không được để trống!',
        });
      }

      const duplicate = await NguoiDungModel.checkDuplicateUser(
        {
          TenTK: finalTenTK,
          Email: Email ? String(Email).trim() : '',
          SDT: String(SDT).trim(),
          CCCD: CCCD ? String(CCCD).trim() : '',
        },
        maND
      );

      if (duplicate) {
        if (finalTenTK && duplicate.TenTK === finalTenTK) {
          return res.status(400).json({
            success: false,
            message: 'Tên tài khoản đăng nhập này đã được sử dụng!',
          });
        }
        if (SDT && duplicate.SDT === String(SDT).trim()) {
          return res.status(400).json({
            success: false,
            message: 'Số điện thoại này đã thuộc về người dùng khác!',
          });
        }
        if (CCCD && duplicate.CCCD === String(CCCD).trim()) {
          return res.status(400).json({
            success: false,
            message: 'Số CCCD này đã thuộc về người dùng khác!',
          });
        }
        if (Email && duplicate.Email === String(Email).trim()) {
          return res.status(400).json({
            success: false,
            message: 'Địa chỉ Email này đã thuộc về người dùng khác!',
          });
        }
      }

      await NguoiDungModel.updateKhachThue(maND, {
        TenTK: finalTenTK,
        HoTen: String(HoTen).trim(),
        GioiTinh: GioiTinh || 'Nam',
        NamSinh: NamSinh ? Number(NamSinh) : null,
        CCCD: CCCD ? String(CCCD).trim() : null,
        NgayCap: NgayCap || null,
        NoiCap: NoiCap ? String(NoiCap).trim() : 'Cục Cảnh sát QLHC về TTXH',
        SDT: String(SDT).trim(),
        Email: Email ? String(Email).trim() : null,
        DiaChi: DiaChi ? String(DiaChi).trim() : null,
        NgheNghiep: NgheNghiep ? String(NgheNghiep).trim() : null,
      });

      return res.status(200).json({
        success: true,
        message: 'Cập nhật thông tin khách thuê thành công!',
      });
    } catch (error) {
      console.error('Lỗi update KhachThue:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Lỗi máy chủ khi cập nhật thông tin khách thuê.',
      });
    }
  },

  // 5. [PUT] /api/khach-thue/:maND/cap-lai-mat-khau
  resetPassword: async (req, res) => {
    try {
      const maND = Number(req.params.maND);
      const rawNewPass = req.body.matKhauMoi || req.body.MatKhauMoi;

      const { error, status } =
        await KhachThueController.verifyKhachThuePermission(maND, req.user);
      if (error) {
        return res.status(status).json({ success: false, message: error });
      }

      if (!rawNewPass || String(rawNewPass).trim().length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Mật khẩu mới phải có ít nhất 6 ký tự!',
        });
      }

      const hashedPassword = await bcrypt.hash(String(rawNewPass).trim(), 10);
      await NguoiDungModel.updatePassword(maND, hashedPassword);

      return res.status(200).json({
        success: true,
        message: 'Đã cấp lại mật khẩu mới cho khách thuê thành công!',
      });
    } catch (error) {
      console.error('Lỗi resetPassword KhachThue:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Lỗi máy chủ khi cấp lại mật khẩu.',
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

      const hasHistory = await NguoiDungModel.hasContractHistory(maND);
      if (hasHistory) {
        return res.status(400).json({
          success: false,
          message:
            'Tài khoản này đã có lịch sử hợp đồng thuê phòng trong hệ thống, không thể xóa để bảo toàn dữ liệu hóa đơn!',
        });
      }

      await NguoiDungModel.deleteKhachThue(maND);

      return res.status(200).json({
        success: true,
        message: 'Đã xóa tài khoản và hồ sơ khách thuê thành công!',
      });
    } catch (error) {
      console.error('Lỗi delete KhachThue:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Lỗi máy chủ khi xóa khách thuê.',
      });
    }
  },
};

module.exports = KhachThueController;