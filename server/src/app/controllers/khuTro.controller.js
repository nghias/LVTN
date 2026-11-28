// server/src/app/controllers/khuTro.controller.js
const KhuTroModel = require('../models/khuTro.model');
const PhongTroModel = require('../models/phongTro.model');
const NguoiDungModel = require('../models/nguoiDung.model');

const { successResponse, errorResponse } = require('../../utils/response.util');
const {
  decryptAES,
  hashPassword,
  hashAccessCode,
} = require('../../utils/crypto.util');

class KhuTroController {
  safeDecryptPhone(encryptedPhone) {
    if (!encryptedPhone) return null;
    try {
      return decryptAES(encryptedPhone) || encryptedPhone;
    } catch {
      return encryptedPhone;
    }
  }

  // Ẩn tuyệt đối MatKhau và MaMoCua khỏi JSON trả về Frontend
  sanitizeKhuTro(khu) {
    if (!khu) return null;
    const { MatKhau, MaMoCua, ...safeFields } = khu;
    return {
      ...safeFields,
      DaCoMatKhau: Boolean(MatKhau),
      DaGanTheNFC: Boolean(MaMoCua),
    };
  }

  // Kiểm tra quyền sở hữu Khu trọ của Quản lý
  async checkKhuTroPermission(maKhu, user) {
    const khuTro = await KhuTroModel.getById(maKhu);
    if (!khuTro) {
      return {
        error: 'Không tìm thấy khu trọ này!',
        status: 404,
        khuTro: null,
      };
    }
    if (user.quyen === 'QuanLy' && Number(khuTro.MaND) !== Number(user.maND)) {
      return {
        error: 'Bạn chỉ có quyền thao tác trên khu trọ do mình quản lý!',
        status: 403,
        khuTro: null,
      };
    }
    return { error: null, status: 200, khuTro };
  }

  // 1. [GET] /api/khu-tro
  async getKhuTroList(req, res, next) {
    try {
      const { quyen, maND } = req.user;

      const khuList =
        quyen === 'QuanLy'
          ? await KhuTroModel.getByMaND(maND)
          : await KhuTroModel.getAll();

      if (khuList.length === 0) {
        return successResponse(res, 'Lấy danh sách khu trọ thành công!', []);
      }

      const quanLyList = await NguoiDungModel.getDanhSachQuanLy();
      const maKhuIds = khuList.map((k) => k.MaKhu);
      const allRooms = await PhongTroModel.getByMaKhuIds(maKhuIds);

      const result = khuList.map((khu) => {
        const ql = quanLyList.find((u) => Number(u.MaND) === Number(khu.MaND));
        const roomsInKhu = allRooms.filter((r) => Number(r.MaKhu) === Number(khu.MaKhu));
        const soPhongTrong = roomsInKhu.filter((r) => r.TrangThai === 'Trong').length;

        return {
          ...this.sanitizeKhuTro(khu),
          TenQuanLy: ql ? ql.HoTen : 'Chưa gán',
          SDTQuanLy: ql && ql.SDT ? this.safeDecryptPhone(ql.SDT) : null,
          TongSoPhong: roomsInKhu.length,
          SoPhongTrong: soPhongTrong,
        };
      });

      return successResponse(res, 'Lấy danh sách khu trọ thành công!', result);
    } catch (error) {
      next(error);
    }
  }

  // 2. [GET] /api/khu-tro/quan-ly-list
  async getDanhSachQuanLy(req, res, next) {
    try {
      const list = await NguoiDungModel.getDanhSachQuanLy();
      const formatted = list.map((u) => ({
        MaND: u.MaND,
        HoTen: u.HoTen,
        SDT: u.SDT ? this.safeDecryptPhone(u.SDT) : '',
        Email: u.Email,
      }));
      return successResponse(
        res,
        'Lấy danh sách người quản lý thành công!',
        formatted
      );
    } catch (error) {
      next(error);
    }
  }

  // 3. [GET] /api/khu-tro/:maKhu
  async getKhuTroDetail(req, res, next) {
    try {
      const maKhu = Number(req.params.maKhu);
      const { error, status, khuTro } = await this.checkKhuTroPermission(
        maKhu,
        req.user
      );
      if (error) return errorResponse(res, error, status);

      const ql = await NguoiDungModel.findById(khuTro.MaND);
      return successResponse(res, 'Lấy thông tin khu trọ thành công!', {
        ...this.sanitizeKhuTro(khuTro),
        TenQuanLy: ql ? ql.HoTen : null,
      });
    } catch (error) {
      next(error);
    }
  }

  // 4. [POST] /api/khu-tro
  async createKhuTro(req, res, next) {
    try {
      if (req.user.quyen !== 'ChuTro') {
        return errorResponse(
          res,
          'Chỉ Chủ trọ mới có quyền thêm khu trọ mới!',
          403
        );
      }

      const { MaND, TenKhu, MoTa, DiaChi, MatKhau, MaMoCua } = req.body;
      if (!TenKhu || !DiaChi) {
        return errorResponse(res, 'Vui lòng nhập tên khu trọ và địa chỉ!', 400);
      }

      const rawPass = MatKhau ? String(MatKhau).trim() : '123456';
      if (!/^\d{6}$/.test(rawPass)) {
        return errorResponse(
          res,
          'Mật khẩu mở cửa phải gồm đúng 6 chữ số (VD: 123456)!',
          400
        );
      }
      const hashedPass = await hashPassword(rawPass);

      let hashedDoorCode = null;
      if (MaMoCua && String(MaMoCua).trim()) {
        const cleanCode = String(MaMoCua).trim();
        if (cleanCode.length > 100) {
          return errorResponse(
            res,
            'Mã mở cửa NFC không được vượt quá 100 ký tự!',
            400
          );
        }
        hashedDoorCode = hashAccessCode(cleanCode);
        const existed = await KhuTroModel.findByMaMoCua(hashedDoorCode);
        if (existed) {
          return errorResponse(
            res,
            `Thẻ NFC này đã được gán cho cơ sở "${existed.TenKhu}"!`,
            409
          );
        }
      }

      const newMaKhu = await KhuTroModel.create({
        MaND: Number(MaND) || req.user.maND,
        TenKhu: TenKhu.trim(),
        MoTa: MoTa?.trim() || '',
        DiaChi: DiaChi.trim(),
        MatKhau: hashedPass,
        MaMoCua: hashedDoorCode,
      });

      const created = await KhuTroModel.getById(newMaKhu);
      return successResponse(
        res,
        'Thêm khu trọ mới thành công!',
        this.sanitizeKhuTro(created),
        201
      );
    } catch (error) {
      next(error);
    }
  }

  // 5. [PUT] /api/khu-tro/:maKhu
  async updateKhuTro(req, res, next) {
    try {
      const maKhu = Number(req.params.maKhu);
      const { error, status, khuTro } = await this.checkKhuTroPermission(
        maKhu,
        req.user
      );
      if (error) return errorResponse(res, error, status);

      const { MaND, TenKhu, MoTa, DiaChi } = req.body;
      if (!TenKhu || !DiaChi) {
        return errorResponse(res, 'Vui lòng nhập tên khu trọ và địa chỉ!', 400);
      }

      const targetMaND =
        req.user.quyen === 'ChuTro' && MaND ? Number(MaND) : khuTro.MaND;

      await KhuTroModel.update(maKhu, {
        MaND: targetMaND,
        TenKhu: TenKhu.trim(),
        MoTa: MoTa?.trim() || '',
        DiaChi: DiaChi.trim(),
      });

      const updated = await KhuTroModel.getById(maKhu);
      return successResponse(
        res,
        'Cập nhật khu trọ thành công!',
        this.sanitizeKhuTro(updated)
      );
    } catch (error) {
      next(error);
    }
  }

  // 6. [PUT] /api/khu-tro/:maKhu/mat-khau (Đổi mật khẩu mở cửa 6 chữ số -> băm Bcrypt)
  async updateMatKhauCua(req, res, next) {
    try {
      const maKhu = Number(req.params.maKhu);
      const { error, status } = await this.checkKhuTroPermission(maKhu, req.user);
      if (error) return errorResponse(res, error, status);

      const rawPass = String(req.body.MatKhau ?? req.body.matKhau ?? '').trim();
      if (!/^\d{6}$/.test(rawPass)) {
        return errorResponse(
          res,
          'Mật khẩu mở cửa phải gồm đúng 6 chữ số (VD: 123456)!',
          400
        );
      }

      const hashedPass = await hashPassword(rawPass);
      await KhuTroModel.updateMatKhau(maKhu, hashedPass);
      const updated = await KhuTroModel.getById(maKhu);
      return successResponse(
        res,
        'Đổi mật khẩu mở cửa thành công!',
        this.sanitizeKhuTro(updated)
      );
    } catch (error) {
      next(error);
    }
  }

  // 7. [PUT] /api/khu-tro/:maKhu/ma-mo-cua (Ghi / cập nhật thẻ NFC -> băm HMAC-SHA256)
  async updateMaMoCua(req, res, next) {
    try {
      const maKhu = Number(req.params.maKhu);
      const { error, status, khuTro } = await this.checkKhuTroPermission(
        maKhu,
        req.user
      );
      if (error) return errorResponse(res, error, status);

      const cleanCode = String(req.body.MaMoCua ?? req.body.maMoCua ?? '').trim();
      if (!cleanCode) {
        return errorResponse(res, 'Vui lòng cung cấp mã thẻ NFC mở cửa!', 400);
      }
      if (cleanCode.length > 100) {
        return errorResponse(
          res,
          'Mã mở cửa NFC không được vượt quá 100 ký tự!',
          400
        );
      }

      const hashedCode = hashAccessCode(cleanCode);

      // Kiểm tra trùng mã thẻ NFC (đã băm) với cơ sở khác
      const existed = await KhuTroModel.findByMaMoCua(hashedCode);
      if (existed && Number(existed.MaKhu) !== maKhu) {
        return errorResponse(
          res,
          `Thẻ NFC này đã được gán cho cơ sở "${existed.TenKhu}"!`,
          409
        );
      }

      await KhuTroModel.updateMaMoCua(maKhu, hashedCode);
      const updated = await KhuTroModel.getById(maKhu);
      return successResponse(
        res,
        `Đã mã hóa và lưu thẻ NFC mở cửa cho ${khuTro.TenKhu} thành công!`,
        this.sanitizeKhuTro(updated)
      );
    } catch (error) {
      next(error);
    }
  }

  // 8. [DELETE] /api/khu-tro/:maKhu
  async deleteKhuTro(req, res, next) {
    try {
      if (req.user.quyen !== 'ChuTro') {
        return errorResponse(res, 'Chỉ Chủ trọ mới có quyền xóa khu trọ!', 403);
      }

      const maKhu = Number(req.params.maKhu);
      const roomCount = await PhongTroModel.countByMaKhu(maKhu);
      if (roomCount > 0) {
        return errorResponse(
          res,
          `Khu trọ này đang có ${roomCount} phòng hoạt động, không thể xóa!`,
          400
        );
      }

      await KhuTroModel.delete(maKhu);
      return successResponse(res, 'Đã xóa khu trọ thành công!');
    } catch (error) {
      next(error);
    }
  }
}

const controller = new KhuTroController();

module.exports = {
  getKhuTroList: controller.getKhuTroList.bind(controller),
  getDanhSachQuanLy: controller.getDanhSachQuanLy.bind(controller),
  getKhuTroDetail: controller.getKhuTroDetail.bind(controller),
  createKhuTro: controller.createKhuTro.bind(controller),
  updateKhuTro: controller.updateKhuTro.bind(controller),
  updateMatKhauCua: controller.updateMatKhauCua.bind(controller),
  updateMaMoCua: controller.updateMaMoCua.bind(controller),
  deleteKhuTro: controller.deleteKhuTro.bind(controller),
};