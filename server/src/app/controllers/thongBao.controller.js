// server/src/app/controllers/thongBao.controller.js
const ThongBaoService = require("../../services/thongBao.service");
const {
  emitThongBaoMoi,
  emitPhanHoiMoi,
  emitXoaThongBao,
} = require("../../services/socket.service");

const ThongBaoController = {
  // GET /api/thong-bao/metadata
  async getMetadata(req, res) {
    try {
      const data = await ThongBaoService.getMetadata(req.user);
      return res.status(200).json({ success: true, data });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Lỗi máy chủ khi tải dữ liệu phân quyền thông báo.",
      });
    }
  },

  // GET /api/thong-bao?keyword=...&maLTB=...&tab=da_gui
  async getDanhSach(req, res) {
    try {
      const data = await ThongBaoService.searchThongBao(req.user, req.query);
      return res.status(200).json({ success: true, data });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Lỗi khi tìm kiếm thông báo.",
      });
    }
  },

// GET /api/thong-bao/cua-toi
  async getThongBaoCuaToi(req, res) {
    try {
      const data = await ThongBaoService.getThongBaoCuaToi(req.user, req.query);
      return res.status(200).json({ success: true, data });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Lỗi khi tải thông báo cá nhân.",
      });
    }
  },

  // POST /api/thong-bao/phan-anh (Dành cho Khách thuê gửi báo cáo sự cố / phản ánh)
  async taoPhanAnhKhachThue(req, res) {
    try {
      const { thongBao, dsNguoiNhan } =
        await ThongBaoService.createPhanAnhKhachThue(req.user, req.body);

      emitThongBaoMoi(dsNguoiNhan, thongBao);

      return res.status(201).json({
        success: true,
        message: "Đã gửi phản ánh / báo cáo sự cố tới Ban quản lý!",
        data: thongBao,
      });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Lỗi khi gửi phản ánh.",
      });
    }
  },

  // GET /api/thong-bao/:maTB/chi-tiet
  async getChiTiet(req, res) {
    try {
      const maTB = Number(req.params.maTB);
      const data = await ThongBaoService.getChiTietThongBao(req.user, maTB);
      return res.status(200).json({ success: true, data });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Lỗi khi tải chi tiết thông báo.",
      });
    }
  },

  // POST /api/thong-bao
  async taoThongBao(req, res) {
    try {
      const { thongBao, dsNguoiNhan } = await ThongBaoService.createThongBao(
        req.user,
        req.body
      );

      emitThongBaoMoi(dsNguoiNhan, thongBao);

      return res.status(201).json({
        success: true,
        message: `Đã phát thông báo thành công tới ${dsNguoiNhan.length} người nhận.`,
        data: thongBao,
      });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Lỗi khi tạo thông báo.",
      });
    }
  },

  // POST /api/thong-bao/:maTB/tra-loi
  async traLoiThongBao(req, res) {
    try {
      const maTB = Number(req.params.maTB);
      const { phanHoi, rootMaTB, dsNguoiNhan } =
        await ThongBaoService.replyThongBao(req.user, maTB, req.body);

      emitPhanHoiMoi(dsNguoiNhan, { rootMaTB, phanHoi });

      return res.status(201).json({
        success: true,
        message: "Đã gửi phản hồi thành công.",
        data: phanHoi,
      });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Lỗi khi gửi phản hồi thông báo.",
      });
    }
  },

  // PATCH /api/thong-bao/:maTB/da-doc
  async danhDauDaDoc(req, res) {
    try {
      const maTB = Number(req.params.maTB);
      const data = await ThongBaoService.markAsRead(req.user, maTB);
      return res.status(200).json({ success: true, data });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Lỗi khi đánh dấu đã đọc.",
      });
    }
  },

  // PATCH /api/thong-bao/da-doc-tat-ca
  async danhDauDaDocTatCa(req, res) {
    try {
      const data = await ThongBaoService.markAllAsRead(req.user);
      return res.status(200).json({
        success: true,
        message: "Đã đánh dấu đọc tất cả thông báo.",
        data,
      });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Lỗi khi đánh dấu đã đọc tất cả.",
      });
    }
  },

  // DELETE /api/thong-bao/:maTB
  async xoaThongBao(req, res) {
    try {
      const { maTB } = req.params;
      const result = await ThongBaoService.deleteThongBao(req.user, Number(maTB));

      emitXoaThongBao(result.MaTB);

      return res.status(200).json({
        success: true,
        message: "Đã xóa thông báo thành công.",
        data: result,
      });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Lỗi khi xóa thông báo.",
      });
    }
  },
};

module.exports = ThongBaoController;