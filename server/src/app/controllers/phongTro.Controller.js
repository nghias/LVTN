const KhuTroModel = require("../models/khuTro.model");
const PhongTroModel = require("../models/phongTro.model");
const ChiTietTienIchModel = require("../models/chiTietTienIch.model");
const AnhPhongModel = require("../models/anhPhong.model");
const TienIchModel = require("../models/tienIch.model");
const NguoiDungModel = require("../models/nguoiDung.model");

const { deleteImageFromCloudinary } = require("../config/cloudinary.config");
const { successResponse, errorResponse } = require("../../utils/response.util");
const { decryptAES } = require("../../utils/crypto.util");

class PhongTroController {
  // Hàm nội bộ: Kiểm tra quyền sở hữu Khu trọ của Chủ trọ / Quản lý
  async checkKhuTroPermission(maKhu, user) {
    if (!user || (user.quyen !== "ChuTro" && user.quyen !== "QuanLy")) {
      return {
        error: "Bạn không có quyền truy cập chức năng quản lý!",
        status: 403,
        khuTro: null,
      };
    }

    const khuTro = await KhuTroModel.getById(maKhu);
    if (!khuTro) {
      return {
        error: "Không tìm thấy khu trọ này!",
        status: 404,
        khuTro: null,
      };
    }

    if (user.quyen === "QuanLy" && Number(khuTro.MaND) !== Number(user.maND)) {
      return {
        error: "Bạn chỉ có quyền thao tác trên cơ sở do mình quản lý!",
        status: 403,
        khuTro: null,
      };
    }

    return { error: null, status: 200, khuTro };
  }

  // Hàm nội bộ: Lấy danh sách Khu trọ mà user hiện tại được phép xem/thao tác
  async getAllowedKhusByUser(user) {
    if (!user) return [];
    if (user.quyen === "ChuTro") {
      return await KhuTroModel.getAll();
    }
    if (user.quyen === "QuanLy") {
      return await KhuTroModel.getByMaND(user.maND);
    }
    return [];
  }

  // 1. [GET] /api/phong-tro/khu-tro
  async getKhuTroList(req, res, next) {
    try {
      // Bước 1: Gọi KhuTroModel lấy danh sách khu trọ theo quyền
      const khuList = await this.getAllowedKhusByUser(req.user);

      if (khuList.length === 0) {
        return successResponse(res, "Lấy danh sách khu trọ thành công!", []);
      }

      // Bước 2: Gọi NguoiDungModel để lấy tên & SĐT người quản lý
      const quanLyList = await NguoiDungModel.getDanhSachQuanLy();

      // Bước 3: Gọi PhongTroModel để đếm tổng số phòng & số phòng trống của từng khu
      const maKhuIds = khuList.map((k) => k.MaKhu);
      const allRooms = await PhongTroModel.getByMaKhuIds(maKhuIds);

      // Bước 4: Ghép dữ liệu tại Controller
      const result = khuList.map((khu) => {
        const ql = quanLyList.find((u) => Number(u.MaND) === Number(khu.MaND));
        const roomsInKhu = allRooms.filter((r) => Number(r.MaKhu) === Number(khu.MaKhu));
        const soPhongTrong = roomsInKhu.filter(
          (r) => r.TrangThai === "Trong",
        ).length;

        return {
          ...khu,
          TenQuanLy: ql ? ql.HoTen : "Chưa gán",
          SDTQuanLy: ql && ql.SDT ? decryptAES(ql.SDT) : null,
          TongSoPhong: roomsInKhu.length,
          SoPhongTrong: soPhongTrong,
        };
      });

      return successResponse(res, "Lấy danh sách khu trọ thành công!", result);
    } catch (error) {
      next(error);
    }
  }

  // 2. [GET] /api/phong-tro/khu-tro/:maKhu
  async getKhuTroDetail(req, res, next) {
    try {
      const maKhu = Number(req.params.maKhu);
      const { error, status, khuTro } = await this.checkKhuTroPermission(
        maKhu,
        req.user,
      );
      if (error) return errorResponse(res, error, status);

      const ql = await NguoiDungModel.findById(khuTro.MaND);
      return successResponse(res, "Lấy thông tin khu trọ thành công!", {
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
        SDT: u.SDT ? decryptAES(u.SDT) : "",
        Email: u.Email,
      }));
      return successResponse(
        res,
        "Lấy danh sách người quản lý thành công!",
        formatted,
      );
    } catch (error) {
      next(error);
    }
  }

  // 4. [POST] /api/phong-tro/khu-tro
  async createKhuTro(req, res, next) {
    try {
      if (req.user.quyen !== "ChuTro") {
        return errorResponse(
          res,
          "Chỉ Chủ trọ mới có quyền thêm khu trọ mới!",
          403,
        );
      }

      const { MaND, TenKhu, MoTa, DiaChi } = req.body;
      if (!TenKhu || !DiaChi) {
        return errorResponse(res, "Vui lòng nhập tên khu trọ và địa chỉ!", 400);
      }

      const newMaKhu = await KhuTroModel.create({
        MaND: Number(MaND) || req.user.maND,
        TenKhu: TenKhu.trim(),
        MoTa: MoTa?.trim() || "",
        DiaChi: DiaChi.trim(),
      });

      const created = await KhuTroModel.getById(newMaKhu);
      return successResponse(res, "Thêm khu trọ mới thành công!", created, 201);
    } catch (error) {
      next(error);
    }
  }

  // 5. [PUT] /api/phong-tro/khu-tro/:maKhu
  async updateKhuTro(req, res, next) {
    try {
      const maKhu = Number(req.params.maKhu);
      const { error, status, khuTro } = await this.checkKhuTroPermission(
        maKhu,
        req.user,
      );
      if (error) return errorResponse(res, error, status);

      const { MaND, TenKhu, MoTa, DiaChi } = req.body;
      if (!TenKhu || !DiaChi) {
        return errorResponse(res, "Vui lòng nhập tên khu trọ và địa chỉ!", 400);
      }

      const targetMaND =
        req.user.quyen === "ChuTro" && MaND ? Number(MaND) : khuTro.MaND;

      await KhuTroModel.update(maKhu, {
        MaND: targetMaND,
        TenKhu: TenKhu.trim(),
        MoTa: MoTa?.trim() || "",
        DiaChi: DiaChi.trim(),
      });

      const updated = await KhuTroModel.getById(maKhu);
      return successResponse(res, "Cập nhật khu trọ thành công!", updated);
    } catch (error) {
      next(error);
    }
  }

  // 6. [DELETE] /api/phong-tro/khu-tro/:maKhu
  async deleteKhuTro(req, res, next) {
    try {
      if (req.user.quyen !== "ChuTro") {
        return errorResponse(res, "Chỉ Chủ trọ mới có quyền xóa khu trọ!", 403);
      }

      const maKhu = Number(req.params.maKhu);
      const roomCount = await PhongTroModel.countByMaKhu(maKhu);
      if (roomCount > 0) {
        return errorResponse(
          res,
          `Khu trọ này đang có ${roomCount} phòng hoạt động, không thể xóa!`,
          400,
        );
      }

      await KhuTroModel.delete(maKhu);
      return successResponse(res, "Đã xóa khu trọ thành công!");
    } catch (error) {
      next(error);
    }
  }

  // 7. [GET] /api/phong-tro/tien-ich
  async getAllTienIch(req, res, next) {
    try {
      const list = await TienIchModel.getAll();
      return successResponse(res, "Lấy danh sách tiện ích thành công!", list);
    } catch (error) {
      next(error);
    }
  }

  // 8. [GET] /api/phong-tro/phong (Gọi 5 Model độc lập để ghép danh sách phòng)
  async getPhongList(req, res, next) {
    try {
      const { maKhu, trangThai, keyword } = req.query;

      // Bước 1: Lấy danh sách KhuTro mà user được phép xem
      const allowedKhus = await this.getAllowedKhusByUser(req.user);

      if (allowedKhus.length === 0) {
        return successResponse(res, "Lấy danh sách phòng thành công!", []);
      }

      let targetMaKhuIds = allowedKhus.map((k) => Number(k.MaKhu));
      if (maKhu) {
        const filterKhuId = Number(maKhu);
        if (!targetMaKhuIds.includes(filterKhuId)) {
          return errorResponse(
            res,
            "Bạn không có quyền xem phòng của khu trọ này!",
            403,
          );
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
        return successResponse(res, "Lấy danh sách phòng thành công!", []);
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
        const khu = allowedKhus.find((k) => Number(k.MaKhu) === Number(room.MaKhu));

        const roomImages = allImages.filter(
          (img) => Number(img.MaPhong) === Number(room.MaPhong),
        );
        const mainImage = roomImages.length > 0 ? roomImages[0].DuongDan : null;

        const roomMaTIs = allChiTietTI
          .filter((ct) => Number(ct.MaPhong) === Number(room.MaPhong))
          .map((ct) => Number(ct.MaTI));
        const roomTienIch = allTienIch.filter((ti) =>
          roomMaTIs.includes(Number(ti.MaTI)),
        );

        return {
          ...room,
          TenKhu: khu ? khu.TenKhu : "",
          DiaChi: khu ? khu.DiaChi : "",
          MaQuanLyKhu: khu ? khu.MaND : 0,
          AnhDaiDien: mainImage,
          TienIch: roomTienIch,
        };
      });

      return successResponse(res, "Lấy danh sách phòng thành công!", result);
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
        return errorResponse(res, "Không tìm thấy phòng trọ này!", 404);
      }

      // Bước 2: Gọi KhuTroModel & Kiểm tra phân quyền Quản lý
      const { error, status, khuTro } = await this.checkKhuTroPermission(
        room.MaKhu,
        req.user,
      );
      if (error) return errorResponse(res, error, status);

      // Bước 3: Gọi AnhPhongModel, ChiTietTienIchModel, TienIchModel
      const [images, chiTietTI, allTienIch] = await Promise.all([
        AnhPhongModel.getByMaPhong(maPhong),
        ChiTietTienIchModel.getByMaPhong(maPhong),
        TienIchModel.getAll(),
      ]);

      const maTIList = chiTietTI.map((ct) => Number(ct.MaTI));
      const roomTienIch = allTienIch.filter((ti) =>
        maTIList.includes(Number(ti.MaTI)),
      );

      return successResponse(res, "Lấy chi tiết phòng thành công!", {
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

  // 10. [POST] /api/phong-tro/phong
  async createPhong(req, res, next) {
    try {
      const {
        MaKhu,
        TenPhong,
        DienTich,
        Gia,
        TrangThai,
        TienIchIds,
        MainImageIndex,
      } = req.body;
      if (!MaKhu || !TenPhong || !DienTich || !Gia) {
        return errorResponse(
          res,
          "Vui lòng nhập đầy đủ thông tin phòng trọ!",
          400,
        );
      }

      const maKhuNum = Number(MaKhu);
      const { error, status } = await this.checkKhuTroPermission(
        maKhuNum,
        req.user,
      );
      if (error) return errorResponse(res, error, status);

      const isDup = await PhongTroModel.checkDuplicateTenPhong(
        maKhuNum,
        TenPhong,
      );
      if (isDup) {
        return errorResponse(
          res,
          `Phòng "${TenPhong}" đã tồn tại trong khu trọ này!`,
          400,
        );
      }

      const newMaPhong = await PhongTroModel.create({
        MaKhu: maKhuNum,
        TenPhong: TenPhong.trim(),
        DienTich: Number(DienTich),
        Gia: Number(Gia),
        TrangThai: TrangThai || "Trong",
      });

      const parsedTienIchIds = TienIchIds ? JSON.parse(TienIchIds) : [];
      if (Array.isArray(parsedTienIchIds) && parsedTienIchIds.length > 0) {
        for (const maTI of parsedTienIchIds) {
          await ChiTietTienIchModel.create(newMaPhong, Number(maTI));
        }
      }

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
      return successResponse(
        res,
        "Thêm phòng trọ mới thành công!",
        createdRoom,
        201,
      );
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
        return errorResponse(res, "Không tìm thấy phòng trọ!", 404);
      }

      const permCurrent = await this.checkKhuTroPermission(
        currentRoom.MaKhu,
        req.user,
      );
      if (permCurrent.error)
        return errorResponse(res, permCurrent.error, permCurrent.status);

      const targetMaKhu = Number(req.body.MaKhu || currentRoom.MaKhu);
      const permTarget = await this.checkKhuTroPermission(
        targetMaKhu,
        req.user,
      );
      if (permTarget.error)
        return errorResponse(res, permTarget.error, permTarget.status);

      const {
        TenPhong,
        DienTich,
        Gia,
        TrangThai,
        TienIchIds,
        DeletedMaAnhs,
        MainMaAnh,
        NewMainIndex,
      } = req.body;
      if (!TenPhong || !DienTich || !Gia) {
        return errorResponse(
          res,
          "Vui lòng nhập đầy đủ tên phòng, diện tích và giá thuê!",
          400,
        );
      }

      const isDup = await PhongTroModel.checkDuplicateTenPhong(
        targetMaKhu,
        TenPhong,
        maPhong,
      );
      if (isDup) {
        return errorResponse(
          res,
          `Tên phòng "${TenPhong}" đã tồn tại trong khu trọ này!`,
          400,
        );
      }

      await PhongTroModel.update(maPhong, {
        MaKhu: targetMaKhu,
        TenPhong: TenPhong.trim(),
        DienTich: Number(DienTich),
        Gia: Number(Gia),
        TrangThai: TrangThai || currentRoom.TrangThai,
      });

      await ChiTietTienIchModel.deleteByMaPhong(maPhong);
      const parsedTienIchIds = TienIchIds ? JSON.parse(TienIchIds) : [];
      if (Array.isArray(parsedTienIchIds) && parsedTienIchIds.length > 0) {
        for (const maTI of parsedTienIchIds) {
          await ChiTietTienIchModel.create(maPhong, Number(maTI));
        }
      }

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

      await AnhPhongModel.resetMainImageByRoom(maPhong);

      if (MainMaAnh && Number(MainMaAnh) > 0) {
        await AnhPhongModel.setMainImage(Number(MainMaAnh), maPhong);
      } else if (
        NewMainIndex !== undefined &&
        Number(NewMainIndex) >= 0 &&
        insertedMaAnhs[Number(NewMainIndex)]
      ) {
        await AnhPhongModel.setMainImage(
          insertedMaAnhs[Number(NewMainIndex)],
          maPhong,
        );
      } else {
        const remainImgs = await AnhPhongModel.getByMaPhong(maPhong);
        if (remainImgs.length > 0) {
          await AnhPhongModel.setMainImage(remainImgs[0].MaAnh, maPhong);
        }
      }

      const updatedRoom = await PhongTroModel.getById(maPhong);
      return successResponse(
        res,
        "Cập nhật phòng trọ thành công!",
        updatedRoom,
      );
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
        return errorResponse(res, "Phòng không tồn tại!", 404);
      }

      const { error, status } = await this.checkKhuTroPermission(
        room.MaKhu,
        req.user,
      );
      if (error) return errorResponse(res, error, status);

      if (room.TrangThai === "DangThue") {
        return errorResponse(
          res,
          "Không thể xóa phòng đang có khách thuê!",
          400,
        );
      }

      const roomImages = await AnhPhongModel.getByMaPhong(maPhong);

      await ChiTietTienIchModel.deleteByMaPhong(maPhong);
      await AnhPhongModel.deleteByMaPhong(maPhong);

      try {
        await PhongTroModel.delete(maPhong);
      } catch (dbErr) {
        return errorResponse(
          res,
          "Phòng này đã có lịch sử Hợp đồng hoặc Điện nước nên không thể xóa! Vui lòng chuyển trạng thái sang Bảo trì.",
          400,
        );
      }

      if (roomImages.length > 0) {
        await Promise.all(
          roomImages.map((img) => deleteImageFromCloudinary(img.DuongDan)),
        );
      }

      return successResponse(
        res,
        "Đã xóa phòng trọ và hình ảnh trên Cloud thành công!",
      );
    } catch (error) {
      next(error);
    }
  }

  // 13. [GET] /api/phong-tro/public/home-init
  async getPublicHomeInit(req, res, next) {
    try {
      const [khuList, tienIchList, quanLyList] = await Promise.all([
        KhuTroModel.getAll(),
        TienIchModel.getAll(),
        NguoiDungModel.getDanhSachQuanLy(),
      ]);

      const maKhuIds = khuList.map((k) => k.MaKhu);
      const allRooms =
        maKhuIds.length > 0 ? await PhongTroModel.getByMaKhuIds(maKhuIds) : [];

      const formattedKhuTro = khuList.map((khu) => {
        const ql = quanLyList.find((u) => Number(u.MaND) === Number(khu.MaND));
        const roomsInKhu = allRooms.filter((r) => Number(r.MaKhu) === Number(khu.MaKhu));
        const soPhongTrong = roomsInKhu.filter(
          (r) => r.TrangThai === "Trong",
        ).length;

        return {
          ...khu,
          TenQuanLy: ql ? ql.HoTen : "Chủ trọ",
          SDTQuanLy: ql && ql.SDT ? decryptAES(ql.SDT) : null,
          TongSoPhong: roomsInKhu.length,
          SoPhongTrong: soPhongTrong,
        };
      });

      const thongKe = {
        TongSoKhu: khuList.length,
        TongSoPhong: allRooms.length,
        SoPhongTrong: allRooms.filter((r) => r.TrangThai === "Trong").length,
      };

      return successResponse(
        res,
        "Lấy dữ liệu khởi tạo trang Home thành công!",
        {
          thongKe,
          khuTroList: formattedKhuTro,
          tienIchList,
        },
      );
    } catch (error) {
      next(error);
    }
  }

  // 14. [GET] /api/phong-tro/public/phong
  async getPublicPhongList(req, res, next) {
    try {
      const [allKhus, rooms] = await Promise.all([
        KhuTroModel.getAll(),
        PhongTroModel.getPublicListByFilters(),
      ]);

      if (rooms.length === 0) {
        return successResponse(
          res,
          "Lấy danh sách phòng trang chủ thành công!",
          [],
        );
      }

      const roomIds = rooms.map((r) => r.MaPhong);

      const [allImages, allChiTietTI, allTienIch, quanLyList] =
        await Promise.all([
          AnhPhongModel.getByMaPhongList(roomIds),
          ChiTietTienIchModel.getByMaPhongList(roomIds),
          TienIchModel.getAll(),
          NguoiDungModel.getDanhSachQuanLy(),
        ]);

      const result = rooms.map((room) => {
        const khu = allKhus.find((k) => Number(k.MaKhu) === Number(room.MaKhu));
        const ql = khu
          ? quanLyList.find((u) => Number(u.MaND) === Number(khu.MaND))
          : null;

        const roomImages = allImages.filter(
          (img) => Number(img.MaPhong) === Number(room.MaPhong),
        );
        const mainImage = roomImages.length > 0 ? roomImages[0].DuongDan : null;

        const roomMaTIs = allChiTietTI
          .filter((ct) => Number(ct.MaPhong) === Number(room.MaPhong))
          .map((ct) => Number(ct.MaTI));
        const roomTienIch = allTienIch.filter((ti) =>
          roomMaTIs.includes(Number(ti.MaTI)),
        );

        return {
          ...room,
          TenKhu: khu ? khu.TenKhu : "",
          DiaChi: khu ? khu.DiaChi : "",
          MoTaKhu: khu ? khu.MoTa : "",
          TenNguoiLienHe: ql ? ql.HoTen : "Ban quản lý",
          SDTLienHe: ql && ql.SDT ? decryptAES(ql.SDT) : null,
          AnhDaiDien: mainImage,
          DanhSachAnh: roomImages,
          TienIch: roomTienIch,
        };
      });

      return successResponse(
        res,
        "Lấy danh sách phòng trang chủ thành công!",
        result,
      );
    } catch (error) {
      next(error);
    }
  }

  // 15. [GET] /api/phong-tro/public/phong/:maPhong
  async getPublicPhongDetail(req, res, next) {
    try {
      const maPhong = Number(req.params.maPhong);

      const room = await PhongTroModel.getById(maPhong);
      if (!room) {
        return errorResponse(res, "Không tìm thấy phòng trọ này!", 404);
      }

      const [khuTro, images, chiTietTI, allTienIch] = await Promise.all([
        KhuTroModel.getById(room.MaKhu),
        AnhPhongModel.getByMaPhong(maPhong),
        ChiTietTienIchModel.getByMaPhong(maPhong),
        TienIchModel.getAll(),
      ]);

      const ql = khuTro ? await NguoiDungModel.findById(khuTro.MaND) : null;

      const maTIList = chiTietTI.map((ct) => Number(ct.MaTI));
      const roomTienIch = allTienIch.filter((ti) =>
        maTIList.includes(Number(ti.MaTI)),
      );

      return successResponse(res, "Lấy chi tiết phòng thành công!", {
        ...room,
        TenKhu: khuTro ? khuTro.TenKhu : "",
        DiaChi: khuTro ? khuTro.DiaChi : "",
        MoTaKhu: khuTro ? khuTro.MoTa : "",
        TenNguoiLienHe: ql ? ql.HoTen : "Ban quản lý",
        SDTLienHe: ql && ql.SDT ? decryptAES(ql.SDT) : null,
        EmailLienHe: ql ? ql.Email : null,
        AnhDaiDien: images.length > 0 ? images[0].DuongDan : null,
        DanhSachAnh: images,
        TienIch: roomTienIch,
      });
    } catch (error) {
      next(error);
    }
  }

  // 16. [GET] /api/phong-tro/public/home-data
  async getHomeData(req, res, next) {
    try {
      const [
        khuList,
        rooms,
        tinDangRows,
        tienIchList,
        phuPhiRows,
        giaDienNuocRow,
        quanLyList,
      ] = await Promise.all([
        KhuTroModel.getAll(),
        PhongTroModel.getAllPublicRooms(),
        PhongTroModel.getActiveTinDang(),
        TienIchModel.getAll(),
        PhongTroModel.getAllPhuPhi(),
        PhongTroModel.getLatestGiaDienNuoc(),
        NguoiDungModel.getDanhSachQuanLy(),
      ]);

      const roomIds = rooms.map((r) => r.MaPhong);

      const [allImages, allChiTietTI] =
        roomIds.length > 0
          ? await Promise.all([
              AnhPhongModel.getByMaPhongList(roomIds),
              ChiTietTienIchModel.getByMaPhongList(roomIds),
            ])
          : [[], []];

      const khuTro = khuList.map((khu) => {
        const roomsInKhu = rooms.filter(
          (r) => Number(r.MaKhu) === Number(khu.MaKhu),
        );
        const soPhongTrong = roomsInKhu.filter(
          (r) => r.TrangThai === "Trong",
        ).length;
        return {
          MaKhu: khu.MaKhu,
          TenKhu: khu.TenKhu,
          DiaChi: khu.DiaChi,
          MoTa: khu.MoTa || "",
          TongSoPhong: roomsInKhu.length,
          SoPhongTrong: soPhongTrong,
        };
      });

      // Chỉ hiển thị các tin đăng đang ở trạng thái DangHienThi và phòng đang Trong
      const tinDang = tinDangRows
        .map((tin) => {
          const room = rooms.find(
            (r) => Number(r.MaPhong) === Number(tin.MaPhong),
          );
          if (!room) return null;

          const khu = khuList.find(
            (k) => Number(k.MaKhu) === Number(room.MaKhu),
          );
          const ql = khu
            ? quanLyList.find((u) => Number(u.MaND) === Number(khu.MaND))
            : null;

          const roomImages = allImages
            .filter((img) => Number(img.MaPhong) === Number(room.MaPhong))
            .map((img) => img.DuongDan);

          const roomMaTIs = allChiTietTI
            .filter((ct) => Number(ct.MaPhong) === Number(room.MaPhong))
            .map((ct) => Number(ct.MaTI));
          const roomTienIch = tienIchList.filter((ti) =>
            roomMaTIs.includes(Number(ti.MaTI)),
          );

          let sdtChuTro = "0901234567";
          if (ql && ql.SDT) {
            try {
              sdtChuTro = decryptAES(ql.SDT) || ql.SDT;
            } catch {
              sdtChuTro = ql.SDT;
            }
          }

          return {
            MaTin: tin.MaTin,
            MaPhong: room.MaPhong,
            MaKhu: room.MaKhu,
            TieuDe: tin.TieuDe,
            MoTa: tin.MoTa || khu?.MoTa || "",
            NgayDang: tin.NgayDang,
            NgayHetHan: tin.NgayHetHan,
            TenPhong: room.TenPhong,
            TenKhu: khu ? khu.TenKhu : "",
            DiaChi: khu ? khu.DiaChi : "",
            Gia: Number(room.Gia),
            DienTich: Number(room.DienTich),
            TrangThaiPhong: room.TrangThai,
            DanhSachAnh: roomImages,
            DanhSachTienIch: roomTienIch,
            TenChuTro: ql ? ql.HoTen : "Ban quản lý Xóm Trọ",
            SDTChuTro: sdtChuTro,
          };
        })
        .filter(Boolean);

      const phuPhi = phuPhiRows.map((pp) => ({
        MaPP: pp.MaPP,
        TenPP: pp.TenPP,
        Gia: Number(pp.Gia),
        GhiChu: pp.GhiChu || "",
      }));

      const giaDienNuoc = giaDienNuocRow
        ? {
            MaGia: giaDienNuocRow.MaGia,
            GiaDien: Number(giaDienNuocRow.GiaDien),
            GiaNuoc: Number(giaDienNuocRow.GiaNuoc),
            NgayApDung: giaDienNuocRow.NgayApDung,
          }
        : {
            MaGia: 1,
            GiaDien: 3500,
            GiaNuoc: 15000,
            NgayApDung: new Date().toISOString().split("T")[0],
          };

      return successResponse(res, "Lấy dữ liệu trang chủ thành công!", {
        tinDang,
        tienIch: tienIchList,
        phuPhi,
        khuTro,
        giaDienNuoc,
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================================================
  // QUẢN LÝ LUỒNG ĐĂNG TIN (PHÂN QUYỀN CHỦ TRỌ & QUẢN LÝ CƠ SỞ)
  // ============================================================================

  // 17. [GET] /api/phong-tro/tin-dang
  // - Chủ trọ: Xem toàn bộ tin đăng của tất cả cơ sở
  // - Quản lý: Chỉ xem tin đăng thuộc các cơ sở mình quản lý
  async getTinDangList(req, res, next) {
    try {
      const { maKhu, maPhong, trangThai, keyword } = req.query;

      // Bước 1: Lấy danh sách cơ sở (KhuTro) mà user có quyền xem
      const allowedKhus = await this.getAllowedKhusByUser(req.user);
      if (allowedKhus.length === 0) {
        return successResponse(res, "Lấy danh sách tin đăng thành công!", []);
      }

      let targetMaKhuIds = allowedKhus.map((k) => Number(k.MaKhu));
      if (maKhu) {
        const filterKhuId = Number(maKhu);
        if (!targetMaKhuIds.includes(filterKhuId)) {
          return errorResponse(
            res,
            "Bạn không có quyền xem tin đăng của cơ sở này!",
            403,
          );
        }
        targetMaKhuIds = [filterKhuId];
      }

      // Bước 2: Lấy tất cả các phòng thuộc danh sách cơ sở được phép
      const allowedRooms = await PhongTroModel.getByMaKhuIds(targetMaKhuIds);
      if (allowedRooms.length === 0) {
        return successResponse(res, "Lấy danh sách tin đăng thành công!", []);
      }

      let targetMaPhongIds = allowedRooms.map((r) => Number(r.MaPhong));
      if (maPhong) {
        const filterPhongId = Number(maPhong);
        if (!targetMaPhongIds.includes(filterPhongId)) {
          return errorResponse(
            res,
            "Bạn không có quyền xem tin đăng của phòng này!",
            403,
          );
        }
        targetMaPhongIds = [filterPhongId];
      }

      // Bước 3: Lấy danh sách tin đăng theo danh sách MaPhong đã lọc quyền
      const tinDangList = await PhongTroModel.getTinDangByFilters({
        maPhongIds: targetMaPhongIds,
        trangThai,
        keyword,
      });

      if (tinDangList.length === 0) {
        return successResponse(res, "Lấy danh sách tin đăng thành công!", []);
      }

      // Bước 4: Lấy ảnh phòng, tiện ích và thông tin người đăng
      const postedRoomIds = [
        ...new Set(tinDangList.map((t) => Number(t.MaPhong))),
      ];
      const posterIds = [...new Set(tinDangList.map((t) => Number(t.MaND)))];

      const [allImages, allChiTietTI, allTienIch, posterUsers] =
        await Promise.all([
          AnhPhongModel.getByMaPhongList(postedRoomIds),
          ChiTietTienIchModel.getByMaPhongList(postedRoomIds),
          TienIchModel.getAll(),
          Promise.all(posterIds.map((id) => NguoiDungModel.findById(id))),
        ]);

      // Bước 5: Ghép dữ liệu trả về cho Frontend
      const result = tinDangList.map((tin) => {
        const room = allowedRooms.find(
          (r) => Number(r.MaPhong) === Number(tin.MaPhong),
        );
        const khu = room
          ? allowedKhus.find((k) => Number(k.MaKhu) === Number(room.MaKhu))
          : null;
        const poster = posterUsers.find(
          (u) => u && Number(u.MaND) === Number(tin.MaND),
        );

        const roomImages = allImages.filter(
          (img) => Number(img.MaPhong) === Number(tin.MaPhong),
        );
        const mainImage = roomImages.length > 0 ? roomImages[0].DuongDan : null;

        const roomMaTIs = allChiTietTI
          .filter((ct) => Number(ct.MaPhong) === Number(tin.MaPhong))
          .map((ct) => Number(ct.MaTI));
        const roomTienIch = allTienIch.filter((ti) =>
          roomMaTIs.includes(Number(ti.MaTI)),
        );

        return {
          ...tin,
          MaKhu: room ? room.MaKhu : null,
          TenPhong: room ? room.TenPhong : "",
          DienTich: room ? Number(room.DienTich) : 0,
          Gia: room ? Number(room.Gia) : 0,
          TrangThaiPhong: room ? room.TrangThai : "",
          TenKhu: khu ? khu.TenKhu : "",
          DiaChi: khu ? khu.DiaChi : "",
          TenNguoiDang: poster ? poster.HoTen : "Hệ thống",
          QuyenNguoiDang: poster ? poster.Quyen : "",
          AnhDaiDien: mainImage,
          DanhSachAnh: roomImages,
          TienIch: roomTienIch,
        };
      });

      return successResponse(res, "Lấy danh sách tin đăng thành công!", result);
    } catch (error) {
      next(error);
    }
  }

  // 18. [GET] /api/phong-tro/tin-dang/:maTin
  async getTinDangDetail(req, res, next) {
    try {
      const maTin = Number(req.params.maTin);

      // Bước 1: Kiểm tra tin đăng tồn tại
      const tin = await PhongTroModel.getTinDangById(maTin);
      if (!tin) {
        return errorResponse(res, "Không tìm thấy tin đăng này!", 404);
      }

      // Bước 2: Lấy thông tin phòng của tin đăng
      const room = await PhongTroModel.getById(tin.MaPhong);
      if (!room) {
        return errorResponse(res, "Phòng của tin đăng không tồn tại!", 404);
      }

      // Bước 3: Kiểm tra quyền cơ sở (Chủ trọ xem tất cả, Quản lý chỉ xem cơ sở của mình)
      const { error, status, khuTro } = await this.checkKhuTroPermission(
        room.MaKhu,
        req.user,
      );
      if (error) return errorResponse(res, error, status);

      // Bước 4: Lấy ảnh, tiện ích và người đăng
      const [images, chiTietTI, allTienIch, poster] = await Promise.all([
        AnhPhongModel.getByMaPhong(room.MaPhong),
        ChiTietTienIchModel.getByMaPhong(room.MaPhong),
        TienIchModel.getAll(),
        NguoiDungModel.findById(tin.MaND),
      ]);

      const maTIList = chiTietTI.map((ct) => Number(ct.MaTI));
      const roomTienIch = allTienIch.filter((ti) =>
        maTIList.includes(Number(ti.MaTI)),
      );

      return successResponse(res, "Lấy chi tiết tin đăng thành công!", {
        ...tin,
        MaKhu: room.MaKhu,
        TenPhong: room.TenPhong,
        DienTich: Number(room.DienTich),
        Gia: Number(room.Gia),
        TrangThaiPhong: room.TrangThai,
        TenKhu: khuTro.TenKhu,
        DiaChi: khuTro.DiaChi,
        TenNguoiDang: poster ? poster.HoTen : "Hệ thống",
        AnhDaiDien: images.length > 0 ? images[0].DuongDan : null,
        DanhSachAnh: images,
        TienIch: roomTienIch,
      });
    } catch (error) {
      next(error);
    }
  }

  // 19. [POST] /api/phong-tro/tin-dang
  // - Chủ trọ: Đăng tin ở tất cả cơ sở
  // - Quản lý: Chỉ được đăng tin ở cơ sở mình quản lý
  async createTinDang(req, res, next) {
    try {
      const { MaPhong, TieuDe, MoTa, NgayHetHan, TrangThai } = req.body;

      if (!MaPhong || !TieuDe || !TieuDe.trim()) {
        return errorResponse(
          res,
          "Vui lòng chọn phòng và nhập tiêu đề tin đăng!",
          400,
        );
      }

      const maPhongNum = Number(MaPhong);

      // Bước 1: Kiểm tra phòng có tồn tại không
      const room = await PhongTroModel.getById(maPhongNum);
      if (!room) {
        return errorResponse(res, "Phòng trọ không tồn tại!", 404);
      }

      // Bước 2: Kiểm tra quyền trên KhuTrọ chứa phòng này
      const { error, status, khuTro } = await this.checkKhuTroPermission(
        room.MaKhu,
        req.user,
      );
      if (error) {
        return errorResponse(
          res,
          req.user.quyen === "QuanLy"
            ? "Bạn chỉ được phép đăng tin cho phòng thuộc cơ sở mình quản lý!"
            : error,
          status,
        );
      }

      // Bước 3: Nếu trạng thái là DangHienThi, kiểm tra phòng đã có tin active chưa
      const targetTrangThai = TrangThai || "DangHienThi";
      if (targetTrangThai === "DangHienThi") {
        const hasActive =
          await PhongTroModel.checkActiveTinDangByPhong(maPhongNum);
        if (hasActive) {
          return errorResponse(
            res,
            `Phòng "${room.TenPhong}" (${khuTro.TenKhu}) hiện đã có một tin đăng đang hiển thị!`,
            400,
          );
        }
      }

      // Bước 4: Lưu tin đăng mới vào bảng TinDang
      const newMaTin = await PhongTroModel.createTinDang({
        MaPhong: maPhongNum,
        MaND: req.user.maND,
        TieuDe: TieuDe.trim(),
        MoTa: MoTa ? MoTa.trim() : null,
        NgayHetHan: NgayHetHan || null,
        TrangThai: targetTrangThai,
      });

      const createdTin = await PhongTroModel.getTinDangById(newMaTin);
      return successResponse(
        res,
        "Đăng tin phòng trọ thành công!",
        {
          ...createdTin,
          MaKhu: room.MaKhu,
          TenPhong: room.TenPhong,
          TenKhu: khuTro.TenKhu,
        },
        201,
      );
    } catch (error) {
      next(error);
    }
  }

  // 20. [PUT] /api/phong-tro/tin-dang/:maTin
  async updateTinDang(req, res, next) {
    try {
      const maTin = Number(req.params.maTin);
      const { MaPhong, TieuDe, MoTa, NgayHetHan, TrangThai } = req.body;

      // Bước 1: Kiểm tra tin đăng hiện tại
      const currentTin = await PhongTroModel.getTinDangById(maTin);
      if (!currentTin) {
        return errorResponse(res, "Không tìm thấy tin đăng!", 404);
      }

      // Bước 2: Kiểm tra quyền của user trên phòng/cơ sở hiện tại của tin đăng
      const currentRoom = await PhongTroModel.getById(currentTin.MaPhong);
      if (!currentRoom) {
        return errorResponse(res, "Phòng của tin đăng không tồn tại!", 404);
      }

      const permCurrent = await this.checkKhuTroPermission(
        currentRoom.MaKhu,
        req.user,
      );
      if (permCurrent.error) {
        return errorResponse(res, permCurrent.error, permCurrent.status);
      }

      // Bước 3: Nếu đổi sang phòng khác, kiểm tra quyền trên cơ sở của phòng mới
      const targetMaPhong = MaPhong ? Number(MaPhong) : currentTin.MaPhong;
      let targetRoom = currentRoom;
      let targetKhuTro = permCurrent.khuTro;

      if (targetMaPhong !== Number(currentTin.MaPhong)) {
        targetRoom = await PhongTroModel.getById(targetMaPhong);
        if (!targetRoom) {
          return errorResponse(res, "Phòng mới được chọn không tồn tại!", 404);
        }

        const permTarget = await this.checkKhuTroPermission(
          targetRoom.MaKhu,
          req.user,
        );
        if (permTarget.error) {
          return errorResponse(
            res,
            "Bạn không có quyền chuyển tin đăng sang phòng thuộc cơ sở khác!",
            permTarget.status,
          );
        }
        targetKhuTro = permTarget.khuTro;
      }

      if (!TieuDe || !TieuDe.trim()) {
        return errorResponse(res, "Vui lòng nhập tiêu đề tin đăng!", 400);
      }

      // Bước 4: Kiểm tra trùng tin DangHienThi trên phòng đích
      const targetTrangThai = TrangThai || currentTin.TrangThai;
      if (targetTrangThai === "DangHienThi") {
        const hasActive = await PhongTroModel.checkActiveTinDangByPhong(
          targetMaPhong,
          maTin,
        );
        if (hasActive) {
          return errorResponse(
            res,
            `Phòng "${targetRoom.TenPhong}" hiện đã có một tin đăng khác đang hiển thị!`,
            400,
          );
        }
      }

      // Bước 5: Cập nhật bản ghi trong bảng TinDang
      await PhongTroModel.updateTinDang(maTin, {
        MaPhong: targetMaPhong,
        TieuDe: TieuDe.trim(),
        MoTa: MoTa !== undefined ? (MoTa ? MoTa.trim() : null) : currentTin.MoTa,
        NgayHetHan:
          NgayHetHan !== undefined ? NgayHetHan || null : currentTin.NgayHetHan,
        TrangThai: targetTrangThai,
      });

      const updatedTin = await PhongTroModel.getTinDangById(maTin);
      return successResponse(res, "Cập nhật tin đăng thành công!", {
        ...updatedTin,
        MaKhu: targetRoom.MaKhu,
        TenPhong: targetRoom.TenPhong,
        TenKhu: targetKhuTro.TenKhu,
      });
    } catch (error) {
      next(error);
    }
  }

  // 21. [PATCH] /api/phong-tro/tin-dang/:maTin/trang-thai
  async updateTrangThaiTinDang(req, res, next) {
    try {
      const maTin = Number(req.params.maTin);
      const { TrangThai } = req.body;

      const validStatuses = ["DangHienThi", "DaAn", "HetHan"];
      if (!TrangThai || !validStatuses.includes(TrangThai)) {
        return errorResponse(
          res,
          "Trạng thái không hợp lệ (DangHienThi, DaAn, HetHan)!",
          400,
        );
      }

      const currentTin = await PhongTroModel.getTinDangById(maTin);
      if (!currentTin) {
        return errorResponse(res, "Không tìm thấy tin đăng!", 404);
      }

      const room = await PhongTroModel.getById(currentTin.MaPhong);
      if (!room) {
        return errorResponse(res, "Phòng của tin đăng không tồn tại!", 404);
      }

      const { error, status } = await this.checkKhuTroPermission(
        room.MaKhu,
        req.user,
      );
      if (error) return errorResponse(res, error, status);

      if (TrangThai === "DangHienThi") {
        const hasActive = await PhongTroModel.checkActiveTinDangByPhong(
          room.MaPhong,
          maTin,
        );
        if (hasActive) {
          return errorResponse(
            res,
            `Phòng "${room.TenPhong}" đã có một tin đăng khác đang hiển thị!`,
            400,
          );
        }
      }

      await PhongTroModel.updateTrangThaiTinDang(maTin, TrangThai);
      const updated = await PhongTroModel.getTinDangById(maTin);

      return successResponse(
        res,
        "Cập nhật trạng thái tin đăng thành công!",
        updated,
      );
    } catch (error) {
      next(error);
    }
  }

  // 22. [DELETE] /api/phong-tro/tin-dang/:maTin
  async deleteTinDang(req, res, next) {
    try {
      const maTin = Number(req.params.maTin);

      const currentTin = await PhongTroModel.getTinDangById(maTin);
      if (!currentTin) {
        return errorResponse(res, "Không tìm thấy tin đăng!", 404);
      }

      const room = await PhongTroModel.getById(currentTin.MaPhong);
      if (room) {
        const { error, status } = await this.checkKhuTroPermission(
          room.MaKhu,
          req.user,
        );
        if (error) return errorResponse(res, error, status);
      } else if (req.user.quyen !== "ChuTro") {
        return errorResponse(res, "Bạn không có quyền xóa tin đăng này!", 403);
      }

      await PhongTroModel.deleteTinDang(maTin);
      return successResponse(res, "Đã xóa tin đăng thành công!");
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
  getPublicHomeInit: controller.getPublicHomeInit.bind(controller),
  getPublicPhongList: controller.getPublicPhongList.bind(controller),
  getPublicPhongDetail: controller.getPublicPhongDetail.bind(controller),
  getHomeData: controller.getHomeData.bind(controller),
  // Các phương thức quản lý Tin đăng
  getTinDangList: controller.getTinDangList.bind(controller),
  getTinDangDetail: controller.getTinDangDetail.bind(controller),
  createTinDang: controller.createTinDang.bind(controller),
  updateTinDang: controller.updateTinDang.bind(controller),
  updateTrangThaiTinDang: controller.updateTrangThaiTinDang.bind(controller),
  deleteTinDang: controller.deleteTinDang.bind(controller),
};