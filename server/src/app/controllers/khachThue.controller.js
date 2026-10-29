// server/src/app/controllers/KhachThueController.js
const bcrypt = require('bcrypt');
const NguoiDungModel = require('../models/nguoiDung.model');
const KhuTroModel = require('../models/khuTro.model');
const { successResponse, errorResponse } = require('../../utils/response.util');

class KhachThueController {
  // Kiểm tra quyền thao tác trên khách thuê của Quản lý / Chủ trọ
  async verifyKhachThuePermission(maND, user) {
    const allTenants = await NguoiDungModel.getAllKhachThueWithRoom();
    const tenant = allTenants.find((t) => Number(t.MaND) === Number(maND));

    if (!tenant) {
      return {
        error: 'Không tìm thấy tài khoản khách thuê này!',
        status: 404,
        tenant: null,
      };
    }

    const quyen = user.quyen || user.Quyen;
    const currentMaND = user.maND || user.MaND;

    if (quyen === 'QuanLy') {
      if (tenant.MaKhu && Number(tenant.MaQuanLyKhu) !== Number(currentMaND)) {
        return {
          error: 'Khách thuê này đang ở cơ sở khác, bạn không có quyền thao tác!',
          status: 403,
          tenant: null,
        };
      }
    }

    return { error: null, status: 200, tenant };
  }

  // 1. [GET] /api/khach-thue/danh-sach
  getList = async (req, res, next) => {
    try {
      const quyen = req.user.quyen || req.user.Quyen;
      const maND = req.user.maND || req.user.MaND;
      const { maKhu, trangThaiPhong, keyword } = req.query;

      const allowedKhus =
        quyen === 'QuanLy'
          ? await KhuTroModel.getByMaND(maND)
          : await KhuTroModel.getAll();

      const allowedMaKhuIds = allowedKhus.map((k) => Number(k.MaKhu));

      let tenants = await NguoiDungModel.getAllKhachThueWithRoom();

      // Quản lý chỉ xem khách đang thuê tại cơ sở mình phụ trách HOẶC khách chưa xếp phòng
      if (quyen === 'QuanLy') {
        tenants = tenants.filter(
          (t) => !t.MaKhu || allowedMaKhuIds.includes(Number(t.MaKhu))
        );
      }

      if (maKhu) {
        const khuId = Number(maKhu);
        if (!allowedMaKhuIds.includes(khuId)) {
          return errorResponse(res, 'Bạn không có quyền xem cơ sở này!', 403);
        }
        tenants = tenants.filter((t) => Number(t.MaKhu) === khuId);
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
            (t.NgheNghiep && t.NgheNghiep.toLowerCase().includes(kw)) ||
            (t.TenTK && t.TenTK.toLowerCase().includes(kw)) ||
            (t.TenPhong && t.TenPhong.toLowerCase().includes(kw))
        );
      }

      return successResponse(res, 'Lấy danh sách khách thuê thành công!', tenants);
    } catch (error) {
      next(error);
    }
  };

  // 2. [GET] /api/khach-thue/:maND
  getDetail = async (req, res, next) => {
    try {
      const maND = Number(req.params.maND);
      const { error, status, tenant } = await this.verifyKhachThuePermission(
        maND,
        req.user
      );
      if (error) return errorResponse(res, error, status);

      return successResponse(res, 'Lấy thông tin khách thuê thành công!', tenant);
    } catch (error) {
      next(error);
    }
  };

  // 3. [POST] /api/khach-thue
  create = async (req, res, next) => {
    try {
      const {
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
        TenTK,
        MatKhau,
      } = req.body;

      if (!HoTen || !SDT || !TenTK || !MatKhau) {
        return errorResponse(
          res,
          'Vui lòng nhập đầy đủ Họ tên, Số điện thoại, Tên tài khoản và Mật khẩu!',
          400
        );
      }

      if (String(MatKhau).trim().length < 6) {
        return errorResponse(res, 'Mật khẩu phải có ít nhất 6 ký tự!', 400);
      }

      const duplicate = await NguoiDungModel.checkDuplicateUser({
        TenTK: TenTK.trim(),
        SDT: SDT.trim(),
        Email: Email ? Email.trim() : '',
        CCCD: CCCD ? CCCD.trim() : '',
      });

      if (duplicate) {
        if (duplicate.TenTK === TenTK.trim()) {
          return errorResponse(res, 'Tên tài khoản đăng nhập này đã tồn tại!', 400);
        }
        if (duplicate.SDT === SDT.trim()) {
          return errorResponse(res, 'Số điện thoại này đã được đăng ký!', 400);
        }
        if (Email && duplicate.Email === Email.trim()) {
          return errorResponse(res, 'Địa chỉ Email này đã được sử dụng!', 400);
        }
        if (CCCD && duplicate.CCCD === CCCD.trim()) {
          return errorResponse(res, 'Số CCCD này đã tồn tại trên hệ thống!', 400);
        }
      }

      const hashedPassword = await bcrypt.hash(String(MatKhau).trim(), 10);

      const newMaND = await NguoiDungModel.createKhachThue({
        TenTK: TenTK.trim(),
        MatKhau: hashedPassword,
        HoTen: HoTen.trim(),
        GioiTinh: GioiTinh || 'Nam',
        NamSinh: NamSinh ? Number(NamSinh) : null,
        CCCD: CCCD ? CCCD.trim() : null,
        NgayCap: NgayCap || null,
        NoiCap: NoiCap ? NoiCap.trim() : 'Cục Cảnh sát QLHC về TTXH',
        SDT: SDT.trim(),
        Email: Email ? Email.trim() : null,
        DiaChi: DiaChi ? DiaChi.trim() : null,
        NgheNghiep: NgheNghiep ? NgheNghiep.trim() : null,
      });

      return successResponse(
        res,
        'Tạo tài khoản khách thuê thành công!',
        { MaND: newMaND },
        201
      );
    } catch (error) {
      next(error);
    }
  };

  // 4. [PUT] /api/khach-thue/:maND
  update = async (req, res, next) => {
    try {
      const maND = Number(req.params.maND);
      const { error, status, tenant } = await this.verifyKhachThuePermission(
        maND,
        req.user
      );
      if (error) return errorResponse(res, error, status);

      const {
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
        TenTK,
      } = req.body;

      if (!HoTen || !SDT) {
        return errorResponse(res, 'Họ tên và Số điện thoại không được để trống!', 400);
      }

      const finalTenTK = TenTK ? TenTK.trim() : tenant.TenTK;

      const duplicate = await NguoiDungModel.checkDuplicateUser(
        {
          TenTK: finalTenTK,
          SDT: SDT.trim(),
          Email: Email ? Email.trim() : '',
          CCCD: CCCD ? CCCD.trim() : '',
        },
        maND
      );

      if (duplicate) {
        if (duplicate.TenTK === finalTenTK) {
          return errorResponse(res, 'Tên tài khoản này đã được người khác sử dụng!', 400);
        }
        if (duplicate.SDT === SDT.trim()) {
          return errorResponse(res, 'Số điện thoại này đã được đăng ký cho tài khoản khác!', 400);
        }
        if (Email && duplicate.Email === Email.trim()) {
          return errorResponse(res, 'Địa chỉ Email này đã được sử dụng!', 400);
        }
        if (CCCD && duplicate.CCCD === CCCD.trim()) {
          return errorResponse(res, 'Số CCCD này đã tồn tại ở hồ sơ khác!', 400);
        }
      }

      await NguoiDungModel.updateKhachThue(maND, {
        TenTK: finalTenTK,
        HoTen: HoTen.trim(),
        GioiTinh: GioiTinh || 'Nam',
        NamSinh: NamSinh ? Number(NamSinh) : null,
        CCCD: CCCD ? CCCD.trim() : null,
        NgayCap: NgayCap || null,
        NoiCap: NoiCap ? NoiCap.trim() : null,
        SDT: SDT.trim(),
        Email: Email ? Email.trim() : null,
        DiaChi: DiaChi ? DiaChi.trim() : null,
        NgheNghiep: NgheNghiep ? NgheNghiep.trim() : null,
      });

      return successResponse(res, 'Cập nhật hồ sơ khách thuê thành công!');
    } catch (error) {
      next(error);
    }
  };

  // 5. [PUT] /api/khach-thue/:maND/cap-lai-mat-khau
  resetPassword = async (req, res, next) => {
    try {
      const maND = Number(req.params.maND);
      const { error, status } = await this.verifyKhachThuePermission(
        maND,
        req.user
      );
      if (error) return errorResponse(res, error, status);

      const rawNewPass = req.body.MatKhauMoi || req.body.matKhauMoi;
      if (!rawNewPass || String(rawNewPass).trim().length < 6) {
        return errorResponse(res, 'Mật khẩu mới phải có ít nhất 6 ký tự!', 400);
      }

      const hashedPassword = await bcrypt.hash(String(rawNewPass).trim(), 10);
      await NguoiDungModel.updatePassword(maND, hashedPassword);

      return successResponse(res, 'Cấp lại mật khẩu cho khách thuê thành công!');
    } catch (error) {
      next(error);
    }
  };

  // 6. [DELETE] /api/khach-thue/:maND
  delete = async (req, res, next) => {
    try {
      const maND = Number(req.params.maND);
      const { error, status } = await this.verifyKhachThuePermission(
        maND,
        req.user
      );
      if (error) return errorResponse(res, error, status);

      const isRenting = await NguoiDungModel.hasActiveContract(maND);
      if (isRenting) {
        return errorResponse(
          res,
          'Không thể xóa khách thuê đang có hợp đồng thuê phòng còn hiệu lực!',
          400
        );
      }

      await NguoiDungModel.deleteKhachThue(maND);
      return successResponse(res, 'Xóa tài khoản khách thuê thành công!');
    } catch (error) {
      next(error);
    }
  };
}

module.exports = new KhachThueController();