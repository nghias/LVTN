const TienIchModel = require('../models/tienIch.model');
const ChiTietTienIchModel = require('../models/chiTietTienIch.model');

const TienIchController = {
  // [GET] Danh sách tiện ích + Tìm kiếm + Ghép số lượng phòng đang sử dụng
  getDanhSachTienIch: async (req, res) => {
    try {
      const { search = '' } = req.query;

      const [dsTienIch, dsChiTiet] = await Promise.all([
        TienIchModel.getAll(search),
        ChiTietTienIchModel.getAll(),
      ]);

      // Đếm số phòng sử dụng cho từng MaTI
      const countMap = {};
      for (const item of dsChiTiet) {
        countMap[item.MaTI] = (countMap[item.MaTI] || 0) + 1;
      }

      const data = dsTienIch.map((ti) => ({
        ...ti,
        SoPhongSuDung: countMap[ti.MaTI] || 0,
      }));

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

  // [GET] Lấy chi tiết 1 tiện ích theo MaTI
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

      const soPhongSuDung = await ChiTietTienIchModel.countByMaTI(maTI);

      return res.status(200).json({
        success: true,
        data: {
          ...tienIch,
          SoPhongSuDung: soPhongSuDung,
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

  // [POST] Thêm tiện ích mới
  themTienIch: async (req, res) => {
    try {
      const { TenTI, MoTa } = req.body;

      if (!TenTI || !TenTI.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng nhập tên tiện ích',
        });
      }

      // Kiểm tra trùng tên tiện ích
      const existed = await TienIchModel.getByName(TenTI);
      if (existed) {
        return res.status(400).json({
          success: false,
          message: `Tiện ích "${TenTI.trim()}" đã tồn tại trong hệ thống`,
        });
      }

      const maTIMoi = await TienIchModel.create({ TenTI, MoTa });

      return res.status(201).json({
        success: true,
        message: 'Thêm tiện ích mới thành công',
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

  // [PUT] Sửa tiện ích
  suaTienIch: async (req, res) => {
    try {
      const maTI = Number(req.params.maTI);
      const { TenTI, MoTa } = req.body;

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

      // Kiểm tra trùng tên với tiện ích khác
      const duplicate = await TienIchModel.getByName(TenTI, maTI);
      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: `Tên tiện ích "${TenTI.trim()}" đã tồn tại ở mã #${duplicate.MaTI}`,
        });
      }

      await TienIchModel.update(maTI, { TenTI, MoTa });

      return res.status(200).json({
        success: true,
        message: 'Cập nhật tiện ích thành công',
      });
    } catch (error) {
      console.error('Lỗi suaTienIch:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi cập nhật tiện ích',
      });
    }
  },

  // [DELETE] Xóa tiện ích
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

      // Kiểm tra xem có phòng nào đang gắn tiện ích này không
      const soPhongDangDung = await ChiTietTienIchModel.countByMaTI(maTI);
      if (soPhongDangDung > 0) {
        return res.status(400).json({
          success: false,
          message: `Không thể xóa! Tiện ích "${currentTI.TenTI}" đang được gắn cho ${soPhongDangDung} phòng trọ.`,
        });
      }

      await TienIchModel.delete(maTI);

      return res.status(200).json({
        success: true,
        message: 'Đã xóa tiện ích thành công',
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