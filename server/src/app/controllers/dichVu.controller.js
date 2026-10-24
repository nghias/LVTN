// server/src/app/controllers/dichVu.controller.js
const DichVuModel = require('../models/dichVu.model');
const ChiTietDichVuModel = require('../models/chiTietDichVu.model');
const KhuTroModel = require('../models/khuTro.model');
const PhongTroModel = require('../models/phongTro.model');

const DichVuController = {
  // Hàm nội bộ: Lấy danh sách Khu trọ và Phòng trọ mà người dùng hiện tại có quyền thao tác
  getAccessibleKhusAndRooms: async (user) => {
    const { quyen, maND } = user;
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

  // 1. [GET] /api/dich-vu/phong-ap-dung-options
  // Trả về danh sách Cơ sở & Phòng mà user được phép gán dịch vụ
  getPhongOptions: async (req, res) => {
    try {
      const { allowedKhus, allowedRooms } =
        await DichVuController.getAccessibleKhusAndRooms(req.user);

      const roomsWithKhu = allowedRooms.map((room) => {
        const khu = allowedKhus.find((k) => Number(k.MaKhu) === Number(room.MaKhu));
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
      console.error('Lỗi getPhongOptions:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi tải danh sách phòng áp dụng',
      });
    }
  },

  // 2. [GET] /api/dich-vu (?search=...)
  // Danh sách dịch vụ + Tìm kiếm + Số phòng đang áp dụng (theo phạm vi quyền)
  getDanhSachDichVu: async (req, res) => {
    try {
      const { search = '' } = req.query;

      const [dsDichVu, dsChiTiet, accessInfo] = await Promise.all([
        DichVuModel.getAll(search),
        ChiTietDichVuModel.getAll(),
        DichVuController.getAccessibleKhusAndRooms(req.user),
      ]);

      const { allowedRoomIds } = accessInfo;

      const data = dsDichVu.map((dv) => {
        const allAssignedForDV = dsChiTiet.filter(
          (ct) => Number(ct.MaDV) === Number(dv.MaDV)
        );
        const managedAssignedForDV = allAssignedForDV.filter((ct) =>
          allowedRoomIds.includes(Number(ct.MaPhong))
        );

        return {
          ...dv,
          TongSoPhongApDung: allAssignedForDV.length,
          SoPhongApDungTrongQuyen: managedAssignedForDV.length,
        };
      });

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      console.error('Lỗi getDanhSachDichVu:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi tải danh sách phí dịch vụ',
      });
    }
  },

  // 3. [GET] /api/dich-vu/:maDV
  // Lấy chi tiết 1 dịch vụ kèm danh sách phòng đã gán (trong phạm vi quyền)
  getChiTietDichVu: async (req, res) => {
    try {
      const maDV = Number(req.params.maDV);
      if (!maDV) {
        return res.status(400).json({
          success: false,
          message: 'Mã dịch vụ không hợp lệ',
        });
      }

      const dichVu = await DichVuModel.getById(maDV);
      if (!dichVu) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy phí dịch vụ này',
        });
      }

      const [dsChiTiet, accessInfo] = await Promise.all([
        ChiTietDichVuModel.getByMaDV(maDV),
        DichVuController.getAccessibleKhusAndRooms(req.user),
      ]);

      const { allowedRoomIds } = accessInfo;

      // Chỉ trả về các phòng thuộc quyền quản lý của user để hiển thị trên form chọn phòng
      const phongApDung = dsChiTiet.filter((ct) =>
        allowedRoomIds.includes(Number(ct.MaPhong))
      );

      return res.status(200).json({
        success: true,
        data: {
          ...dichVu,
          TongSoPhongToanHeThong: dsChiTiet.length,
          PhongApDung: phongApDung, // [{ MaPhong, MaDV, SoLuong }]
        },
      });
    } catch (error) {
      console.error('Lỗi getChiTietDichVu:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi lấy thông tin phí dịch vụ',
      });
    }
  },

  // 4. [POST] /api/dich-vu
  // Thêm phí dịch vụ mới & Gán phòng áp dụng theo quyền
  themDichVu: async (req, res) => {
    try {
      const { TenDV, DonGia, DonViTinh, MoTa, PhongApDung } = req.body;

      if (!TenDV || !TenDV.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng nhập tên phí dịch vụ',
        });
      }

      if (DonGia === undefined || DonGia === '' || Number(DonGia) < 0) {
        return res.status(400).json({
          success: false,
          message: 'Đơn giá dịch vụ không hợp lệ',
        });
      }

      if (!DonViTinh || !DonViTinh.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng nhập đơn vị tính (VD: kWh, m3, Tháng, Xe/Tháng...)',
        });
      }

      // Kiểm tra trùng tên dịch vụ
      const existed = await DichVuModel.getByName(TenDV);
      if (existed) {
        return res.status(400).json({
          success: false,
          message: `Phí dịch vụ "${TenDV.trim()}" đã tồn tại trong hệ thống`,
        });
      }

      // Kiểm tra danh sách phòng gán có nằm trong phạm vi quyền không
      const { allowedRoomIds } = await DichVuController.getAccessibleKhusAndRooms(
        req.user
      );

      const roomsToAssign = Array.isArray(PhongApDung) ? PhongApDung : [];
      for (const item of roomsToAssign) {
        const roomId = Number(item.MaPhong);
        if (!allowedRoomIds.includes(roomId)) {
          return res.status(403).json({
            success: false,
            message: `Bạn không có quyền gán dịch vụ cho phòng mã #${roomId}!`,
          });
        }
      }

      // Bước 1: Tạo bản ghi trong bảng DichVu
      const maDVMoi = await DichVuModel.create({
        TenDV,
        DonGia,
        DonViTinh,
        MoTa,
      });

      // Bước 2: Gán các phòng đã chọn vào bảng ChiTietDichVu
      for (const item of roomsToAssign) {
        await ChiTietDichVuModel.create(
          Number(item.MaPhong),
          maDVMoi,
          Number(item.SoLuong) || 1
        );
      }

      return res.status(201).json({
        success: true,
        message: 'Thêm phí dịch vụ và gán phòng thành công!',
        data: { MaDV: maDVMoi },
      });
    } catch (error) {
      console.error('Lỗi themDichVu:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi thêm phí dịch vụ',
      });
    }
  },

  // 5. [PUT] /api/dich-vu/:maDV
  // Sửa phí dịch vụ & Cập nhật danh sách phòng áp dụng (Bảo toàn phòng của cơ sở khác nếu là Quản lý)
  suaDichVu: async (req, res) => {
    try {
      const maDV = Number(req.params.maDV);
      const { TenDV, DonGia, DonViTinh, MoTa, PhongApDung } = req.body;

      if (!maDV) {
        return res.status(400).json({
          success: false,
          message: 'Mã dịch vụ không hợp lệ',
        });
      }

      if (!TenDV || !TenDV.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng nhập tên phí dịch vụ',
        });
      }

      if (DonGia === undefined || DonGia === '' || Number(DonGia) < 0) {
        return res.status(400).json({
          success: false,
          message: 'Đơn giá dịch vụ không hợp lệ',
        });
      }

      if (!DonViTinh || !DonViTinh.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng nhập đơn vị tính',
        });
      }

      const currentDV = await DichVuModel.getById(maDV);
      if (!currentDV) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy phí dịch vụ cần sửa',
        });
      }

      const duplicate = await DichVuModel.getByName(TenDV, maDV);
      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: `Tên phí dịch vụ "${TenDV.trim()}" đã tồn tại ở mã #${duplicate.MaDV}`,
        });
      }

      const { allowedRoomIds } = await DichVuController.getAccessibleKhusAndRooms(
        req.user
      );

      const roomsToAssign = Array.isArray(PhongApDung) ? PhongApDung : [];
      for (const item of roomsToAssign) {
        const roomId = Number(item.MaPhong);
        if (!allowedRoomIds.includes(roomId)) {
          return res.status(403).json({
            success: false,
            message: `Bạn chỉ có quyền gán phòng thuộc cơ sở của mình quản lý!`,
          });
        }
      }

      // Bước 1: Cập nhật thông tin bảng DichVu
      await DichVuModel.update(maDV, {
        TenDV,
        DonGia,
        DonViTinh,
        MoTa,
      });

      // Bước 2: Cập nhật bảng ChiTietDichVu theo đúng phạm vi quyền
      if (req.user.quyen === 'ChuTro') {
        // Chủ trọ có quyền trên toàn bộ cơ sở nên làm mới toàn bộ phòng của MaDV này
        await ChiTietDichVuModel.deleteByMaDV(maDV);
      } else {
        // Quản lý chỉ xóa và cập nhật lại các phòng thuộc cơ sở của mình, giữ nguyên cơ sở khác
        await ChiTietDichVuModel.deleteByMaDVAndMaPhongList(maDV, allowedRoomIds);
      }

      for (const item of roomsToAssign) {
        await ChiTietDichVuModel.create(
          Number(item.MaPhong),
          maDV,
          Number(item.SoLuong) || 1
        );
      }

      return res.status(200).json({
        success: true,
        message: 'Cập nhật phí dịch vụ và danh sách phòng áp dụng thành công!',
      });
    } catch (error) {
      console.error('Lỗi suaDichVu:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi cập nhật phí dịch vụ',
      });
    }
  },

  // 6. [DELETE] /api/dich-vu/:maDV
  // Xóa phí dịch vụ
  xoaDichVu: async (req, res) => {
    try {
      const maDV = Number(req.params.maDV);
      if (!maDV) {
        return res.status(400).json({
          success: false,
          message: 'Mã dịch vụ không hợp lệ',
        });
      }

      const currentDV = await DichVuModel.getById(maDV);
      if (!currentDV) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy phí dịch vụ cần xóa',
        });
      }

      const soPhongDangDung = await ChiTietDichVuModel.countByMaDV(maDV);
      if (soPhongDangDung > 0) {
        return res.status(400).json({
          success: false,
          message: `Không thể xóa! Phí dịch vụ "${currentDV.TenDV}" đang được áp dụng cho ${soPhongDangDung} phòng trọ. Vui lòng gỡ gán phòng trước khi xóa.`,
        });
      }

      await DichVuModel.delete(maDV);

      return res.status(200).json({
        success: true,
        message: 'Đã xóa phí dịch vụ thành công!',
      });
    } catch (error) {
      console.error('Lỗi xoaDichVu:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi xóa phí dịch vụ',
      });
    }
  },
};

module.exports = DichVuController;