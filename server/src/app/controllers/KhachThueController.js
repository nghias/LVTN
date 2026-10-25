const bcrypt = require('bcrypt');
const NguoiDungModel = require('../models/nguoiDung.model');
const KhuTroModel = require('../models/khuTro.model');
const { successResponse, errorResponse } = require('../../utils/response.util');

class KhachThueController {
  // Kiểm tra quyền quản lý đối với 1 khách thuê cụ thể
  async verifyKhachThuePermission(maND, user) {
    const allTenants = await NguoiDungModel.getAllKhachThueWithRoom();
    const tenant = allTenants.find((t) => Number(t.MaND) === Number(maND));

    if (!tenant) {
      return { error: 'Không tìm thấy tài khoản khách thuê này!', status: 404, tenant: null };
    }

    // Nếu là Quản lý: chỉ được thao tác với khách đang ở khu mình quản lý hoặc khách chưa có phòng
    if (user.quyen === 'QuanLy') {
      if (tenant.MaKhu && Number(tenant.MaQuanLyKhu) !== Number(user.maND)) {
        return {
          error: 'Khách thuê này thuộc cơ sở khác, bạn không có quyền thao tác!',
          status: 403,
          tenant: null,
        };
      }
    }

    return { error: null, status: 200, tenant };
  }

  // 1. [GET] /api/khach-thue/danh-sach
  async getList(req, res, next) {
    try {
      const { quyen, maND } = req.user;
      const { maKhu, trangThaiPhong, keyword } = req.query;

      // Lấy danh sách khu trọ mà người dùng hiện tại được phép quản lý
      const allowedKhus =
        quyen === 'QuanLy'
          ? await KhuTroModel.getByMaND(maND)
          : await KhuTroModel.getAll();

      const allowedMaKhuIds = allowedKhus.map((k) => Number(k.MaKhu));

      // Lấy toàn bộ khách thuê kèm phòng
      let tenants = await NguoiDungModel.getAllKhachThueWithRoom();

      // Nếu là Quản lý: chỉ lấy khách thuộc khu mình quản lý HOẶC khách mới tạo chưa xếp phòng
      if (quyen === 'QuanLy') {
        tenants = tenants.filter(
          (t) => !t.MaKhu || allowedMaKhuIds.includes(Number(t.MaKhu))
        );
      }

      // Lọc theo maKhu nếu có truyền trên query
      if (maKhu) {
        if (maKhu === 'chua-co-phong') {
          tenants = tenants.filter((t) => !t.MaPhong);
        } else {
          const khuId = Number(maKhu);
          if (!allowedMaKhuIds.includes(khuId)) {
            return errorResponse(res, 'Bạn không có quyền xem cơ sở này!', 403);
          }
          tenants = tenants.filter((t) => Number(t.MaKhu) === khuId);
        }
      }

      // Lọc theo trạng thái đã có phòng / chưa có phòng
      if (trangThaiPhong === 'DangThue') {
        tenants = tenants.filter((t) => Boolean(t.MaPhong));
      } else if (trangThaiPhong === 'ChuaCoPhong') {
        tenants = tenants.filter((t) => !t.MaPhong);
      }

      // Tìm kiếm theo từ khóa (Họ tên, SĐT, CCCD, Tên TK, Tên phòng)
      if (keyword && keyword.trim() !== '') {
        const kw = keyword.trim().toLowerCase();
        tenants = tenants.filter(
          (t) =>
            (t.HoTen && t.HoTen.toLowerCase().includes(kw)) ||
            (t.SDT && t.SDT.toLowerCase().includes(kw)) ||
            (t.CCCD && t.CCCD.toLowerCase().includes(kw)) ||
            (t.TenTK && t.TenTK.toLowerCase().includes(kw)) ||
            (t.TenPhong && t.TenPhong.toLowerCase().includes(kw))
        );
      }

      return successResponse(res, 'Lấy danh sách khách thuê thành công!', tenants);
    } catch (error) {
      next(error);
    }
  }

  // 2. [GET] /api/khach-thue/:maND
  async getDetail(req, res, next) {
    try {
      const maND = Number(req.params.maND);
      const { error, status, tenant } = await this.verifyKhachThuePermission(maND, req.user);
      if (error) return errorResponse(res, error, status);

      return successResponse(res, 'Lấy thông tin khách thuê thành công!', tenant);
    } catch (error) {
      next(error);
    }
  }

  // 3. [POST] /api/khach-thue (Tạo tài khoản khách thuê mới)
  async create(req, res, next) {
    try {
      const { HoTen, CCCD, NamSinh, SDT, Email, DiaChi, TenTK, MatKhau } = req.body;

      if (!HoTen || !CCCD || !SDT || !MatKhau) {
        return errorResponse(
          res,
          'Vui lòng nhập đầy đủ Họ tên, CCCD, SĐT và Mật khẩu!',
          400
        );
      }

      if (await NguoiDungModel.checkDuplicateField('CCCD', CCCD.trim())) {
        return errorResponse(res, `Số CCCD "${CCCD}" đã được đăng ký!`, 400);
      }
      if (await NguoiDungModel.checkDuplicateField('SDT', SDT.trim())) {
        return errorResponse(res, `Số điện thoại "${SDT}" đã được sử dụng!`, 400);
      }
      if (Email && (await NguoiDungModel.checkDuplicateField('Email', Email.trim()))) {
        return errorResponse(res, `Email "${Email}" đã được sử dụng!`, 400);
      }

      const hashedPassword = await bcrypt.hash(MatKhau, 10);

      const newMaND = await NguoiDungModel.createKhachThue({
        HoTen: HoTen.trim(),
        CCCD: CCCD.trim(),
        NamSinh: NamSinh ? Number(NamSinh) : null,
        SDT: SDT.trim(),
        Email: Email ? Email.trim() : null,
        DiaChi: DiaChi ? DiaChi.trim() : '',
        TenTK: Email,
        MatKhau: hashedPassword,
      });

      const created = await NguoiDungModel.findById(newMaND);
      delete created.MatKhau;
      return successResponse(res, 'Tạo tài khoản khách thuê thành công!', created, 201);
    } catch (error) {
      next(error);
    }
  }

  // 4. [PUT] /api/khach-thue/:maND (Sửa thông tin tài khoản)
  async update(req, res, next) {
    try {
      const maND = Number(req.params.maND);
      const { error, status } = await this.verifyKhachThuePermission(maND, req.user);
      if (error) return errorResponse(res, error, status);

      const { HoTen, CCCD, NamSinh, SDT, Email, DiaChi, TenTK } = req.body;
      if (!HoTen || !CCCD || !SDT) {
        return errorResponse(
          res,
          'Vui lòng nhập đầy đủ Họ tên, CCCD, SĐT và Tên tài khoản!',
          400
        );
      }
      if (await NguoiDungModel.checkDuplicateField('CCCD', CCCD.trim(), maND)) {
        return errorResponse(res, `Số CCCD "${CCCD}" đã được sử dụng bởi người khác!`, 400);
      }
      if (await NguoiDungModel.checkDuplicateField('SDT', SDT.trim(), maND)) {
        return errorResponse(res, `Số điện thoại "${SDT}" đã được sử dụng bởi người khác!`, 400);
      }
      if (Email && (await NguoiDungModel.checkDuplicateField('Email', Email.trim(), maND))) {
        return errorResponse(res, `Email "${Email}" đã được sử dụng bởi người khác!`, 400);
      }

      await NguoiDungModel.updateKhachThue(maND, {
        HoTen: HoTen.trim(),
        CCCD: CCCD.trim(),
        NamSinh: NamSinh ? Number(NamSinh) : null,
        SDT: SDT.trim(),
        Email: Email ? Email.trim() : null,
        DiaChi: DiaChi ? DiaChi.trim() : '',
        TenTK: Email,
      });

      const updated = await NguoiDungModel.findById(maND);
      delete updated.MatKhau;
      return successResponse(res, 'Cập nhật thông tin khách thuê thành công!', updated);
    } catch (error) {
      next(error);
    }
  }

  // 5. [PUT] /api/khach-thue/:maND/cap-lai-mat-khau (Cấp lại mật khẩu)
  async resetPassword(req, res, next) {
    try {
      const maND = Number(req.params.maND);
      const { error, status } = await this.verifyKhachThuePermission(maND, req.user);
      if (error) return errorResponse(res, error, status);

      const { matKhauMoi } = req.body;
      if (!matKhauMoi || matKhauMoi.trim().length < 6) {
        return errorResponse(res, 'Mật khẩu mới phải có ít nhất 6 ký tự!', 400);
      }

      const hashedPassword = await bcrypt.hash(matKhauMoi.trim(), 10);
      await NguoiDungModel.updatePassword(maND, hashedPassword);

      return successResponse(res, 'Đã cấp lại mật khẩu mới cho khách thuê thành công!');
    } catch (error) {
      next(error);
    }
  }

  // 6. [DELETE] /api/khach-thue/:maND (Xóa tài khoản)
  async delete(req, res, next) {
    try {
      const maND = Number(req.params.maND);
      const { error, status } = await this.verifyKhachThuePermission(maND, req.user);
      if (error) return errorResponse(res, error, status);

      const isRenting = await NguoiDungModel.hasActiveContract(maND);
      if (isRenting) {
        return errorResponse(
          res,
          'Khách thuê này đang có hợp đồng thuê phòng còn hiệu lực! Vui lòng kết thúc hợp đồng trước khi xóa tài khoản.',
          400
        );
      }

      try {
        await NguoiDungModel.deleteKhachThue(maND);
      } catch (dbErr) {
        return errorResponse(
          res,
          'Tài khoản này đã có lịch sử hợp đồng/thông báo trong hệ thống nên không thể xóa vĩnh viễn!',
          400
        );
      }

      return successResponse(res, 'Đã xóa tài khoản khách thuê thành công!');
    } catch (error) {
      next(error);
    }
  }
}

const controller = new KhachThueController();

module.exports = {
  getList: controller.getList.bind(controller),
  getDetail: controller.getDetail.bind(controller),
  create: controller.create.bind(controller),
  update: controller.update.bind(controller),
  resetPassword: controller.resetPassword.bind(controller),
  delete: controller.delete.bind(controller),
};