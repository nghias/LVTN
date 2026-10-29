// server/src/app/controllers/TienIchController.js
const TienIchModel = require('../models/tienIch.model');
const ChiTietTienIchModel = require('../models/chiTietTienIch.model');
const KhuTroModel = require('../models/khuTro.model');
const PhongTroModel = require('../models/phongTro.model');

const TienIchController = {
  // Hàm nội bộ: Lấy danh sách Khu trọ và Phòng trọ theo quyền người dùng
  getAccessibleKhusAndRooms: async (user) => {
    const quyen = user?.quyen || user?.Quyen;
    const maND = user?.maND || user?.MaND;

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

  // 1. [GET] /api/tien-ich/phong-ap-dung-options
  // Trả về danh sách Cơ sở & Phòng mà người dùng có quyền gán tiện ích
  getPhongOptions: async (req, res) => {
    try {
      const { allowedKhus, allowedRooms } =
        await TienIchController.getAccessibleKhusAndRooms(req.user);

      const roomsWithKhu = allowedRooms.map((room) => {
        const khu = allowedKhus.find(
          (k) => Number(k.MaKhu) === Number(room.MaKhu)
        );
        return {
          MaPhong: room.MaPhong,
          MaKhu: room.MaKhu,
          TenPhong: room.TenPhong,
          Gia: room.Gia,
          TrangThai: room.TrangThai,
          TenKhu: khu ? khu.TenKhu : '',
        };
      });

      return res.status(200).json({
        success: true,
        data: {
          khuTroList: allowedKhus,
          phongList: roomsWithKhu,
        },
      });
    } catch (error) {
      console.error('Lỗi getPhongOptions (Tiện ích):', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi tải danh sách phòng áp dụng',
      });
    }
  },

  // 2. [GET] /api/tien-ich (?search=...)
  // Danh sách tiện ích + Tìm kiếm + Số lượng phòng đang sử dụng
  getDanhSachTienIch: async (req, res) => {
    try {
      const { search = '' } = req.query;

      const [dsTienIch, dsChiTiet, accessInfo] = await Promise.all([
        TienIchModel.getAll(search),
        ChiTietTienIchModel.getAll(),
         req.user
          ? TienIchController.getAccessibleKhusAndRooms(req.user)
          : Promise.resolve({ allowedRoomIds: [] }),
      ]);

      const { allowedRoomIds } = accessInfo;

      const data = dsTienIch.map((ti) => {
        const allAssignedForTI = dsChiTiet.filter(
          (ct) => Number(ct.MaTI) === Number(ti.MaTI)
        );
        const managedAssignedForTI = allAssignedForTI.filter((ct) =>
          allowedRoomIds.includes(Number(ct.MaPhong))
        );

        return {
          ...ti,
          SoPhongSuDung: allAssignedForTI.length,
          TongSoPhongApDung: allAssignedForTI.length,
          SoPhongApDungTrongQuyen: managedAssignedForTI.length,
        };
      });

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      console.error('Lỗi getDanhSachTienIch:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi tải danh sách tiện ích',
      });
    }
  },

  // 3. [GET] /api/tien-ich/:maTI
  // Lấy chi tiết 1 tiện ích kèm danh sách MaPhong đã gán trong phạm vi quyền
  getChiTietTienIch: async (req, res) => {
    try {
      const maTI = Number(req.params.maTI);
      if (!maTI) {
        return res.status(400).json({
          success: false,
          message: 'Mã tiện ích không hợp lệ',
        });
      }

      const tienIch = await TienIchModel.getById(maTI);
      if (!tienIch) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy tiện ích này',
        });
      }

      const [dsChiTiet, accessInfo] = await Promise.all([
        ChiTietTienIchModel.getByMaTI(maTI),
        TienIchController.getAccessibleKhusAndRooms(req.user),
      ]);

      const { allowedRoomIds } = accessInfo;

      // Chỉ trả về danh sách MaPhong thuộc quyền quản lý của user để hiển thị trên form
      const phongApDung = dsChiTiet
        .filter((ct) => allowedRoomIds.includes(Number(ct.MaPhong)))
        .map((ct) => Number(ct.MaPhong));

      return res.status(200).json({
        success: true,
        data: {
          ...tienIch,
          SoPhongSuDung: dsChiTiet.length,
          PhongApDung: phongApDung, // Mảng MaPhong: [1, 2, 5...]
        },
      });
    } catch (error) {
      console.error('Lỗi getChiTietTienIch:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi lấy thông tin tiện ích',
      });
    }
  },

  // 4. [POST] /api/tien-ich
  // Thêm tiện ích mới & Gán danh sách phòng áp dụng
  themTienIch: async (req, res) => {
    try {
      const { TenTI, MoTa, PhongApDung } = req.body;

      if (!TenTI || !TenTI.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng nhập tên tiện ích',
        });
      }

      const existed = await TienIchModel.getByName(TenTI);
      if (existed) {
        return res.status(400).json({
          success: false,
          message: `Tiện ích "${TenTI.trim()}" đã tồn tại trong hệ thống`,
        });
      }

      const { allowedRoomIds } =
        await TienIchController.getAccessibleKhusAndRooms(req.user);

      const rawRooms = Array.isArray(PhongApDung) ? PhongApDung : [];
      const uniqueRoomIds = [
        ...new Set(rawRooms.map((id) => Number(id)).filter(Boolean)),
      ];

      for (const roomId of uniqueRoomIds) {
        if (!allowedRoomIds.includes(roomId)) {
          return res.status(403).json({
            success: false,
            message: `Bạn không có quyền gán tiện ích cho phòng mã #${roomId}!`,
          });
        }
      }

      // Bước 1: Tạo tiện ích trong bảng TienIch
      const maTIMoi = await TienIchModel.create({ TenTI, MoTa });

      // Bước 2: Gán các phòng đã chọn vào bảng ChiTietTienIch
      for (const roomId of uniqueRoomIds) {
        await ChiTietTienIchModel.create(roomId, maTIMoi);
      }

      return res.status(201).json({
        success: true,
        message: 'Thêm tiện ích mới và gán phòng thành công!',
        data: { MaTI: maTIMoi },
      });
    } catch (error) {
      console.error('Lỗi themTienIch:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi thêm tiện ích',
      });
    }
  },

  // 5. [PUT] /api/tien-ich/:maTI
  // Sửa thông tin tiện ích & Cập nhật danh sách phòng áp dụng theo quyền
  suaTienIch: async (req, res) => {
    try {
      const maTI = Number(req.params.maTI);
      const { TenTI, MoTa, PhongApDung } = req.body;

      if (!maTI) {
        return res.status(400).json({
          success: false,
          message: 'Mã tiện ích không hợp lệ',
        });
      }

      if (!TenTI || !TenTI.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng nhập tên tiện ích',
        });
      }

      const currentTI = await TienIchModel.getById(maTI);
      if (!currentTI) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy tiện ích cần sửa',
        });
      }

      const duplicate = await TienIchModel.getByName(TenTI, maTI);
      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: `Tên tiện ích "${TenTI.trim()}" đã tồn tại ở mã #${duplicate.MaTI}`,
        });
      }

      const { allowedRoomIds } =
        await TienIchController.getAccessibleKhusAndRooms(req.user);

      const rawRooms = Array.isArray(PhongApDung) ? PhongApDung : [];
      const uniqueRoomIds = [
        ...new Set(rawRooms.map((id) => Number(id)).filter(Boolean)),
      ];

      for (const roomId of uniqueRoomIds) {
        if (!allowedRoomIds.includes(roomId)) {
          return res.status(403).json({
            success: false,
            message: 'Bạn chỉ có quyền gán phòng thuộc cơ sở của mình quản lý!',
          });
        }
      }

      // Bước 1: Cập nhật bảng TienIch
      await TienIchModel.update(maTI, { TenTI, MoTa });

      // Bước 2: Cập nhật bảng ChiTietTienIch theo đúng phạm vi quyền
      const quyen = req.user?.quyen || req.user?.Quyen;
      if (quyen === 'ChuTro') {
        await ChiTietTienIchModel.deleteByMaTI(maTI);
      } else {
        await ChiTietTienIchModel.deleteByMaTIAndMaPhongList(
          maTI,
          allowedRoomIds
        );
      }

      for (const roomId of uniqueRoomIds) {
        await ChiTietTienIchModel.create(roomId, maTI);
      }

      return res.status(200).json({
        success: true,
        message: 'Cập nhật tiện ích và danh sách phòng áp dụng thành công!',
      });
    } catch (error) {
      console.error('Lỗi suaTienIch:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi cập nhật tiện ích',
      });
    }
  },

  // 6. [DELETE] /api/tien-ich/:maTI
  // Xóa tiện ích (Chặn xóa nếu vẫn còn phòng đang gắn tiện ích này)
  xoaTienIch: async (req, res) => {
    try {
      const maTI = Number(req.params.maTI);
      if (!maTI) {
        return res.status(400).json({
          success: false,
          message: 'Mã tiện ích không hợp lệ',
        });
      }

      const currentTI = await TienIchModel.getById(maTI);
      if (!currentTI) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy tiện ích cần xóa',
        });
      }

      const soPhongDangDung = await ChiTietTienIchModel.countByMaTI(maTI);
      if (soPhongDangDung > 0) {
        return res.status(400).json({
          success: false,
          message: `Không thể xóa! Tiện ích "${currentTI.TenTI}" đang được gắn cho ${soPhongDangDung} phòng trọ. Vui lòng gỡ gán phòng trước khi xóa.`,
        });
      }

      await TienIchModel.delete(maTI);

      return res.status(200).json({
        success: true,
        message: 'Đã xóa tiện ích thành công!',
      });
    } catch (error) {
      console.error('Lỗi xoaTienIch:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi xóa tiện ích',
      });
    }
  },
};

module.exports = TienIchController;