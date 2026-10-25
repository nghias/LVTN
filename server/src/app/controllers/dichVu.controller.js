// server/src/app/controllers/dichVu.controller.js
const DichVuModel = require('../models/phiDichVu.model');
const ChiTietPhiDichVuModel = require('../models/chiTietPhiDichVu.model');

const DichVuController = {
  // 1. [GET] /api/dich-vu (?search=...)
  // Lấy danh sách phí dịch vụ + Tìm kiếm + Đếm số hợp đồng đang áp dụng
  getDanhSachDichVu: async (req, res) => {
    try {
      const { search = '' } = req.query;

      const [dsDichVu, dsChiTiet] = await Promise.all([
        DichVuModel.getAll(search),
        ChiTietPhiDichVuModel.getAll(),
      ]);

      const data = dsDichVu.map((dv) => {
        const assignedContracts = dsChiTiet.filter(
          (ct) => Number(ct.MaDV) === Number(dv.MaDV)
        );

        return {
          ...dv,
          SoHopDongApDung: assignedContracts.length,
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

  // 2. [GET] /api/dich-vu/:maDV
  // Lấy thông tin chi tiết 1 phí dịch vụ
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

      const dsChiTiet = await ChiTietPhiDichVuModel.getByMaDV(maDV);

      return res.status(200).json({
        success: true,
        data: {
          ...dichVu,
          SoHopDongApDung: dsChiTiet.length,
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

  // 3. [POST] /api/dich-vu
  // Thêm phí dịch vụ mới (Chỉ thêm thông tin dịch vụ thường)
  themDichVu: async (req, res) => {
    try {
      const { TenDV, DonGia, DonViTinh, MoTa } = req.body;

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
          message: 'Vui lòng nhập đơn vị tính (VD: Tháng, Xe/Tháng, Người/Tháng...)',
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

      const maDVMoi = await DichVuModel.create({
        TenDV,
        DonGia,
        DonViTinh,
        MoTa,
      });

      return res.status(201).json({
        success: true,
        message: 'Thêm phí dịch vụ mới thành công!',
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

  // 4. [PUT] /api/dich-vu/:maDV
  // Sửa thông tin phí dịch vụ
  suaDichVu: async (req, res) => {
    try {
      const maDV = Number(req.params.maDV);
      const { TenDV, DonGia, DonViTinh, MoTa } = req.body;

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

      await DichVuModel.update(maDV, {
        TenDV,
        DonGia,
        DonViTinh,
        MoTa,
      });

      return res.status(200).json({
        success: true,
        message: 'Cập nhật phí dịch vụ thành công!',
      });
    } catch (error) {
      console.error('Lỗi suaDichVu:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi cập nhật phí dịch vụ',
      });
    }
  },

  // 5. [DELETE] /api/dich-vu/:maDV
  // Xóa phí dịch vụ (Chặn xóa nếu đang có hợp đồng thuê sử dụng)
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

      const soHopDongDangDung = await ChiTietPhiDichVuModel.countByMaDV(maDV);
      if (soHopDongDangDung > 0) {
        return res.status(400).json({
          success: false,
          message: `Không thể xóa! Phí dịch vụ "${currentDV.TenDV}" đang được áp dụng trong ${soHopDongDangDung} hợp đồng thuê.`,
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