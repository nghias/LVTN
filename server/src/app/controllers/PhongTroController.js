const KhuTroModel = require('../models/khuTro.model');
const PhongTroModel = require('../models/phongTro.model');
const ChiTietTienIchModel = require('../models/chiTietTienIch.model');
const AnhPhongModel = require('../models/anhPhong.model');
const TienIchModel = require('../models/tienIch.model');
const NguoiDungModel = require('../models/nguoiDung.model');

const { deleteImageFromCloudinary } = require('../config/cloudinary.config');
const { successResponse, errorResponse } = require('../../utils/response.util');
const { decryptAES } = require('../../utils/crypto.util');

class PhongTroController {
  // Hàm nội bộ: Kiểm tra quyền sở hữu Khu trọ của Quản lý
  async checkKhuTroPermission(maKhu, user) {
    const khuTro = await KhuTroModel.getById(maKhu);
    if (!khuTro) {
      return { error: 'Không tìm thấy khu trọ này!', status: 404, khuTro: null };
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

  // 1. [GET] /api/phong-tro/khu-tro
  async getKhuTroList(req, res, next) {
    try {
      const { quyen, maND } = req.user;

      // Bước 1: Gọi KhuTroModel lấy danh sách khu trọ theo quyền
      const khuList =
        quyen === 'QuanLy'
          ? await KhuTroModel.getByMaND(maND)
          : await KhuTroModel.getAll();

      if (khuList.length === 0) {
        return successResponse(res, 'Lấy danh sách khu trọ thành công!', []);
      }

      // Bước 2: Gọi NguoiDungModel để lấy tên & SĐT người quản lý
      const quanLyList = await NguoiDungModel.getDanhSachQuanLy();

      // Bước 3: Gọi PhongTroModel để đếm tổng số phòng & số phòng trống của từng khu
      const maKhuIds = khuList.map((k) => k.MaKhu);
      const allRooms = await PhongTroModel.getByMaKhuIds(maKhuIds);

      // Bước 4: Ghép dữ liệu tại Controller
      const result = khuList.map((khu) => {
        const ql = quanLyList.find((u) => u.MaND === khu.MaND);
        const roomsInKhu = allRooms.filter((r) => r.MaKhu === khu.MaKhu);
        const soPhongTrong = roomsInKhu.filter((r) => r.TrangThai === 'Trong').length;

        return {
          ...khu,
          TenQuanLy: ql ? ql.HoTen : 'Chưa gán',
          SDTQuanLy: ql && ql.SDT ? decryptAES(ql.SDT) : null,
          TongSoPhong: roomsInKhu.length,
          SoPhongTrong: soPhongTrong,
        };
      });

      return successResponse(res, 'Lấy danh sách khu trọ thành công!', result);
    } catch (error) {
      next(error);
    }
  }

  // 2. [GET] /api/phong-tro/khu-tro/:maKhu
  async getKhuTroDetail(req, res, next) {
    try {
      const maKhu = Number(req.params.maKhu);
      const { error, status, khuTro } = await this.checkKhuTroPermission(maKhu, req.user);
      if (error) return errorResponse(res, error, status);

      const ql = await NguoiDungModel.findById(khuTro.MaND);
      return successResponse(res, 'Lấy thông tin khu trọ thành công!', {
        ...khuTro,
        TenQuanLy: ql ? ql.HoTen : null,
      });
    } catch (error) {
      next(error);
    }
  }

  // 3. [GET] /api/phong-tro/quan-ly-list
  async getDanhSachQuanLy(req, res, next) {
    try {
      const list = await NguoiDungModel.getDanhSachQuanLy();
      const formatted = list.map((u) => ({
        MaND: u.MaND,
        HoTen: u.HoTen,
        SDT: u.SDT ? decryptAES(u.SDT) : '',
        Email: u.Email,
      }));
      return successResponse(res, 'Lấy danh sách người quản lý thành công!', formatted);
    } catch (error) {
      next(error);
    }
  }

  // 4. [POST] /api/phong-tro/khu-tro
  async createKhuTro(req, res, next) {
    try {
      if (req.user.quyen !== 'ChuTro') {
        return errorResponse(res, 'Chỉ Chủ trọ mới có quyền thêm khu trọ mới!', 403);
      }

      const { MaND, TenKhu, MoTa, DiaChi } = req.body;
      if (!TenKhu || !DiaChi) {
        return errorResponse(res, 'Vui lòng nhập tên khu trọ và địa chỉ!', 400);
      }

      const newMaKhu = await KhuTroModel.create({
        MaND: Number(MaND) || req.user.maND,
        TenKhu: TenKhu.trim(),
        MoTa: MoTa?.trim() || '',
        DiaChi: DiaChi.trim(),
      });

      const created = await KhuTroModel.getById(newMaKhu);
      return successResponse(res, 'Thêm khu trọ mới thành công!', created, 201);
    } catch (error) {
      next(error);
    }
  }

  // 5. [PUT] /api/phong-tro/khu-tro/:maKhu
  async updateKhuTro(req, res, next) {
    try {
      const maKhu = Number(req.params.maKhu);
      const { error, status, khuTro } = await this.checkKhuTroPermission(maKhu, req.user);
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
      return successResponse(res, 'Cập nhật khu trọ thành công!', updated);
    } catch (error) {
      next(error);
    }
  }

  // 6. [DELETE] /api/phong-tro/khu-tro/:maKhu
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

  // 7. [GET] /api/phong-tro/tien-ich
  async getAllTienIch(req, res, next) {
    try {
      const list = await TienIchModel.getAll();
      return successResponse(res, 'Lấy danh sách tiện ích thành công!', list);
    } catch (error) {
      next(error);
    }
  }

  // 8. [GET] /api/phong-tro/phong (Gọi 5 Model độc lập để ghép danh sách phòng)
  async getPhongList(req, res, next) {
    try {
      const { quyen, maND } = req.user;
      const { maKhu, trangThai, keyword } = req.query;

      // Bước 1: Lấy danh sách KhuTro mà user được phép xem từ KhuTroModel
      const allowedKhus =
        quyen === 'QuanLy'
          ? await KhuTroModel.getByMaND(maND)
          : await KhuTroModel.getAll();

      if (allowedKhus.length === 0) {
        return successResponse(res, 'Lấy danh sách phòng thành công!', []);
      }

      let targetMaKhuIds = allowedKhus.map((k) => k.MaKhu);
      if (maKhu) {
        const filterKhuId = Number(maKhu);
        if (!targetMaKhuIds.includes(filterKhuId)) {
          return errorResponse(res, 'Bạn không có quyền xem phòng của khu trọ này!', 403);
        }
        targetMaKhuIds = [filterKhuId];
      }

      // Bước 2: Gọi PhongTroModel lấy danh sách phòng
      const rooms = await PhongTroModel.getListByFilters({
        maKhuIds: targetMaKhuIds,
        trangThai,
        keyword,
      });

      if (rooms.length === 0) {
        return successResponse(res, 'Lấy danh sách phòng thành công!', []);
      }

      const roomIds = rooms.map((r) => r.MaPhong);

      // Bước 3: Gọi AnhPhongModel, ChiTietTienIchModel và TienIchModel độc lập
      const [allImages, allChiTietTI, allTienIch] = await Promise.all([
        AnhPhongModel.getByMaPhongList(roomIds),
        ChiTietTienIchModel.getByMaPhongList(roomIds),
        TienIchModel.getAll(),
      ]);

      // Bước 4: Ghép dữ liệu KhuTro, Ảnh chính (AnhChinh = 1) và Tiện ích vào từng Phòng
      const result = rooms.map((room) => {
        const khu = allowedKhus.find((k) => k.MaKhu === room.MaKhu);

        // Tìm ảnh của phòng (do AnhPhongModel đã sắp xếp AnhChinh DESC nên phần tử đầu là ảnh chính)
        const roomImages = allImages.filter((img) => img.MaPhong === room.MaPhong);
        const mainImage = roomImages.length > 0 ? roomImages[0].DuongDan : null;

        // Tìm danh sách tiện ích của phòng
        const roomMaTIs = allChiTietTI
          .filter((ct) => ct.MaPhong === room.MaPhong)
          .map((ct) => ct.MaTI);
        const roomTienIch = allTienIch.filter((ti) => roomMaTIs.includes(ti.MaTI));

        return {
          ...room,
          TenKhu: khu ? khu.TenKhu : '',
          DiaChi: khu ? khu.DiaChi : '',
          MaQuanLyKhu: khu ? khu.MaND : 0,
          AnhDaiDien: mainImage,
          TienIch: roomTienIch,
        };
      });

      return successResponse(res, 'Lấy danh sách phòng thành công!', result);
    } catch (error) {
      next(error);
    }
  }

  // 9. [GET] /api/phong-tro/phong/:maPhong (Gọi từng Model để lấy chi tiết phòng)
  async getPhongDetail(req, res, next) {
    try {
      const maPhong = Number(req.params.maPhong);

      // Bước 1: Gọi PhongTroModel
      const room = await PhongTroModel.getById(maPhong);
      if (!room) {
        return errorResponse(res, 'Không tìm thấy phòng trọ này!', 404);
      }

      // Bước 2: Gọi KhuTroModel & Kiểm tra phân quyền Quản lý
      const { error, status, khuTro } = await this.checkKhuTroPermission(room.MaKhu, req.user);
      if (error) return errorResponse(res, error, status);

      // Bước 3: Gọi AnhPhongModel, ChiTietTienIchModel, TienIchModel
      const [images, chiTietTI, allTienIch] = await Promise.all([
        AnhPhongModel.getByMaPhong(maPhong),
        ChiTietTienIchModel.getByMaPhong(maPhong),
        TienIchModel.getAll(),
      ]);

      const maTIList = chiTietTI.map((ct) => ct.MaTI);
      const roomTienIch = allTienIch.filter((ti) => maTIList.includes(ti.MaTI));

      return successResponse(res, 'Lấy chi tiết phòng thành công!', {
        ...room,
        TenKhu: khuTro.TenKhu,
        DiaChi: khuTro.DiaChi,
        MaQuanLyKhu: khuTro.MaND,
        DanhSachAnh: images,
        TienIch: roomTienIch,
      });
    } catch (error) {
      next(error);
    }
  }

  // 10. [POST] /api/phong-tro/phong (Gọi lần lượt PhongTroModel, ChiTietTienIchModel, AnhPhongModel)
  async createPhong(req, res, next) {
    try {
      const { MaKhu, TenPhong, DienTich, Gia, TrangThai, TienIchIds, MainImageIndex } = req.body;
      if (!MaKhu || !TenPhong || !DienTich || !Gia) {
        return errorResponse(res, 'Vui lòng nhập đầy đủ thông tin phòng trọ!', 400);
      }

      const maKhuNum = Number(MaKhu);
      const { error, status } = await this.checkKhuTroPermission(maKhuNum, req.user);
      if (error) return errorResponse(res, error, status);

      // Kiểm tra trùng tên phòng trong khu
      const isDup = await PhongTroModel.checkDuplicateTenPhong(maKhuNum, TenPhong);
      if (isDup) {
        return errorResponse(res, `Phòng "${TenPhong}" đã tồn tại trong khu trọ này!`, 400);
      }

      // Bước 1: Tạo bản ghi trong bảng Phong (PhongTroModel)
      const newMaPhong = await PhongTroModel.create({
        MaKhu: maKhuNum,
        TenPhong: TenPhong.trim(),
        DienTich: Number(DienTich),
        Gia: Number(Gia),
        TrangThai: TrangThai || 'Trong',
      });

      // Bước 2: Lưu danh sách tiện ích vào bảng ChiTietTienIch (ChiTietTienIchModel)
      const parsedTienIchIds = TienIchIds ? JSON.parse(TienIchIds) : [];
      if (Array.isArray(parsedTienIchIds) && parsedTienIchIds.length > 0) {
        for (const maTI of parsedTienIchIds) {
          await ChiTietTienIchModel.create(newMaPhong, Number(maTI));
        }
      }

      // Bước 3: Lưu danh sách ảnh vào bảng AnhPhong (AnhPhongModel)
      const files = req.files || [];
      const mainIdx = Number(MainImageIndex || 0);
      for (let i = 0; i < files.length; i++) {
        await AnhPhongModel.create({
          MaPhong: newMaPhong,
          DuongDan: files[i].path,
          AnhChinh: i === mainIdx ? 1 : 0,
        });
      }

      const createdRoom = await PhongTroModel.getById(newMaPhong);
      return successResponse(res, 'Thêm phòng trọ mới thành công!', createdRoom, 201);
    } catch (error) {
      next(error);
    }
  }

  // 11. [PUT] /api/phong-tro/phong/:maPhong
  async updatePhong(req, res, next) {
    try {
      const maPhong = Number(req.params.maPhong);
      const currentRoom = await PhongTroModel.getById(maPhong);
      if (!currentRoom) {
        return errorResponse(res, 'Không tìm thấy phòng trọ!', 404);
      }

      // Kiểm tra quyền trên khu hiện tại
      const permCurrent = await this.checkKhuTroPermission(currentRoom.MaKhu, req.user);
      if (permCurrent.error) return errorResponse(res, permCurrent.error, permCurrent.status);

      const targetMaKhu = Number(req.body.MaKhu || currentRoom.MaKhu);
      const permTarget = await this.checkKhuTroPermission(targetMaKhu, req.user);
      if (permTarget.error) return errorResponse(res, permTarget.error, permTarget.status);

      const { TenPhong, DienTich, Gia, TrangThai, TienIchIds, DeletedMaAnhs, MainMaAnh, NewMainIndex } = req.body;
      if (!TenPhong || !DienTich || !Gia) {
        return errorResponse(res, 'Vui lòng nhập đầy đủ tên phòng, diện tích và giá thuê!', 400);
      }

      const isDup = await PhongTroModel.checkDuplicateTenPhong(targetMaKhu, TenPhong, maPhong);
      if (isDup) {
        return errorResponse(res, `Tên phòng "${TenPhong}" đã tồn tại trong khu trọ này!`, 400);
      }

      // Bước 1: Cập nhật bảng Phong (PhongTroModel)
      await PhongTroModel.update(maPhong, {
        MaKhu: targetMaKhu,
        TenPhong: TenPhong.trim(),
        DienTich: Number(DienTich),
        Gia: Number(Gia),
        TrangThai: TrangThai || currentRoom.TrangThai,
      });

      // Bước 2: Cập nhật bảng ChiTietTienIch (ChiTietTienIchModel)
      await ChiTietTienIchModel.deleteByMaPhong(maPhong);
      const parsedTienIchIds = TienIchIds ? JSON.parse(TienIchIds) : [];
      if (Array.isArray(parsedTienIchIds) && parsedTienIchIds.length > 0) {
        for (const maTI of parsedTienIchIds) {
          await ChiTietTienIchModel.create(maPhong, Number(maTI));
        }
      }

      // Bước 3: Xóa ảnh cũ trên Cloudinary và trong bảng AnhPhong (AnhPhongModel)
      const parsedDeletedIds = DeletedMaAnhs ? JSON.parse(DeletedMaAnhs) : [];
      if (Array.isArray(parsedDeletedIds) && parsedDeletedIds.length > 0) {
        for (const idAnh of parsedDeletedIds) {
          const imgRecord = await AnhPhongModel.getById(Number(idAnh));
          if (imgRecord && Number(imgRecord.MaPhong) === maPhong) {
            await deleteImageFromCloudinary(imgRecord.DuongDan);
            await AnhPhongModel.deleteById(Number(idAnh));
          }
        }
      }

      // Bước 4: Thêm các ảnh mới vừa tải lên vào bảng AnhPhong (AnhPhongModel)
      const files = req.files || [];
      const insertedMaAnhs = [];
      for (const file of files) {
        const newMaAnh = await AnhPhongModel.create({
          MaPhong: maPhong,
          DuongDan: file.path,
          AnhChinh: 0,
        });
        insertedMaAnhs.push(newMaAnh);
      }

      // Bước 5: Đặt lại Ảnh chính (AnhChinh = 1) qua AnhPhongModel
      await AnhPhongModel.resetMainImageByRoom(maPhong);

      if (MainMaAnh && Number(MainMaAnh) > 0) {
        await AnhPhongModel.setMainImage(Number(MainMaAnh), maPhong);
      } else if (
        NewMainIndex !== undefined &&
        Number(NewMainIndex) >= 0 &&
        insertedMaAnhs[Number(NewMainIndex)]
      ) {
        await AnhPhongModel.setMainImage(insertedMaAnhs[Number(NewMainIndex)], maPhong);
      } else {
        const remainImgs = await AnhPhongModel.getByMaPhong(maPhong);
        if (remainImgs.length > 0) {
          await AnhPhongModel.setMainImage(remainImgs[0].MaAnh, maPhong);
        }
      }

      const updatedRoom = await PhongTroModel.getById(maPhong);
      return successResponse(res, 'Cập nhật phòng trọ thành công!', updatedRoom);
    } catch (error) {
      next(error);
    }
  }

  // 12. [DELETE] /api/phong-tro/phong/:maPhong
  async deletePhong(req, res, next) {
    try {
      const maPhong = Number(req.params.maPhong);
      const room = await PhongTroModel.getById(maPhong);
      if (!room) {
        return errorResponse(res, 'Phòng không tồn tại!', 404);
      }

      const { error, status } = await this.checkKhuTroPermission(room.MaKhu, req.user);
      if (error) return errorResponse(res, error, status);

      if (room.TrangThai === 'DangThue') {
        return errorResponse(res, 'Không thể xóa phòng đang có khách thuê!', 400);
      }

      // Lấy danh sách ảnh từ AnhPhongModel để xóa trên Cloudinary khi xóa phòng thành công
      const roomImages = await AnhPhongModel.getByMaPhong(maPhong);

      // Xóa tiện ích của phòng trước, sau đó xóa phòng
      await ChiTietTienIchModel.deleteByMaPhong(maPhong);
      await AnhPhongModel.deleteByMaPhong(maPhong);

      try {
        await PhongTroModel.delete(maPhong);
      } catch (dbErr) {
        // Nếu phòng vướng khóa ngoại ở bảng HopDongThue hoặc ChiSoDienNuoc
        return errorResponse(
          res,
          'Phòng này đã có lịch sử Hợp đồng hoặc Điện nước nên không thể xóa! Vui lòng chuyển trạng thái sang Bảo trì.',
          400
        );
      }

      // Xóa file ảnh thật trên Cloudinary
      if (roomImages.length > 0) {
        await Promise.all(
          roomImages.map((img) => deleteImageFromCloudinary(img.DuongDan))
        );
      }

      return successResponse(res, 'Đã xóa phòng trọ và hình ảnh trên Cloud thành công!');
    } catch (error) {
      next(error);
    }
  }
}

const controller = new PhongTroController();

// Bind ngữ cảnh this cho các phương thức trong Controller
module.exports = {
  getKhuTroList: controller.getKhuTroList.bind(controller),
  getKhuTroDetail: controller.getKhuTroDetail.bind(controller),
  getDanhSachQuanLy: controller.getDanhSachQuanLy.bind(controller),
  createKhuTro: controller.createKhuTro.bind(controller),
  updateKhuTro: controller.updateKhuTro.bind(controller),
  deleteKhuTro: controller.deleteKhuTro.bind(controller),
  getAllTienIch: controller.getAllTienIch.bind(controller),
  getPhongList: controller.getPhongList.bind(controller),
  getPhongDetail: controller.getPhongDetail.bind(controller),
  createPhong: controller.createPhong.bind(controller),
  updatePhong: controller.updatePhong.bind(controller),
  deletePhong: controller.deletePhong.bind(controller),
};