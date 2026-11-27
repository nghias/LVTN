// server/src/app/controllers/theRaVao.controller.js
const TheRaVaoService = require("../../services/theRaVao.service");

const TheRaVaoController = {
  // === IoT ESP32 ===
  async iotQuetThe(req, res) {
    try {
      const result = await TheRaVaoService.xacThucQuetThe(req.body);
      return res.status(200).json(result);
    } catch (error) {
      return res.status(500).json({ allow: false, message: error.message });
    }
  },

  async iotLayLenhGhi(req, res) {
    try {
      const maKhu = Number(req.query.maKhu);
      const data = await TheRaVaoService.layLenhGhiThe(maKhu);
      return res.status(200).json(data);
    } catch (error) {
      return res
        .status(500)
        .json({ openDoor: false, hasJob: false, message: error.message });
    }
  },

  async iotXacNhanGhi(req, res) {
    try {
      const data = await TheRaVaoService.xacNhanGhiThe(req.body);
      return res
        .status(200)
        .json({ success: true, message: "Kích hoạt thẻ thành công", data });
    } catch (error) {
      return res
        .status(error.statusCode || 500)
        .json({ success: false, message: error.message });
    }
  },

  // === Mở cổng bằng NFC điện thoại (Khách thuê, Quản lý, Chủ trọ) ===
  async moCuaBangNFC(req, res) {
    try {
      const data = await TheRaVaoService.moCuaBangNFC(req.user, req.body);
      return res.status(200).json({ success: true, ...data });
    } catch (error) {
      return res
        .status(error.statusCode || 500)
        .json({ success: false, message: error.message });
    }
  },

  // === Người thuê ===
  async getTheCuaToi(req, res) {
    try {
      const data = await TheRaVaoService.getThongTinTheCuaToi(req.user, req.query);
      return res.status(200).json({ success: true, data });
    } catch (error) {
      return res
        .status(error.statusCode || 500)
        .json({ success: false, message: error.message });
    }
  },

  async yeuCauCapLai(req, res) {
    try {
      const data = await TheRaVaoService.yeuCauCapLaiThe(req.user, req.body);
      return res.status(200).json({
        success: true,
        message: "Đã gửi yêu cầu cấp lại thẻ và tạm khóa thẻ cũ.",
        data,
      });
    } catch (error) {
      return res
        .status(error.statusCode || 500)
        .json({ success: false, message: error.message });
    }
  },

  // === Chủ trọ & Quản lý ===
  async getLichSuRaVao(req, res) {
    try {
      const result = await TheRaVaoService.getLichSuRaVao(req.user, req.query);
      return res.status(200).json({ success: true, ...result });
    } catch (error) {
      return res
        .status(error.statusCode || 500)
        .json({ success: false, message: error.message });
    }
  },

  async getDanhSachThe(req, res) {
    try {
      const result = await TheRaVaoService.getDanhSachThe(req.user, req.query);
      return res.status(200).json({ success: true, ...result });
    } catch (error) {
      return res
        .status(error.statusCode || 500)
        .json({ success: false, message: error.message });
    }
  },

  async getNguoiChuaCoThe(req, res) {
    try {
      const result = await TheRaVaoService.getNguoiChuaCoThe(req.user, req.query);
      return res.status(200).json({ success: true, ...result });
    } catch (error) {
      return res
        .status(error.statusCode || 500)
        .json({ success: false, message: error.message });
    }
  },

  async getChiTietThe(req, res) {
    try {
      const data = await TheRaVaoService.getChiTietThe(req.user, Number(req.params.maThe));
      return res.status(200).json({ success: true, data });
    } catch (error) {
      return res
        .status(error.statusCode || 500)
        .json({ success: false, message: error.message });
    }
  },

  async batDauPhienGhi(req, res) {
    try {
      const data = await TheRaVaoService.batDauPhienGhi(req.user, req.body);
      return res.status(200).json({ success: true, ...data });
    } catch (error) {
      return res
        .status(error.statusCode || 500)
        .json({ success: false, message: error.message });
    }
  },

  async getTrangThaiPhienGhi(req, res) {
    try {
      const data = await TheRaVaoService.getTrangThaiPhienGhi(req.params.sessionId);
      return res.status(200).json({ success: true, data });
    } catch (error) {
      return res
        .status(error.statusCode || 500)
        .json({ success: false, message: error.message });
    }
  },

  async huyPhienGhi(req, res) {
    try {
      const data = await TheRaVaoService.huyPhienGhi(req.params.sessionId);
      return res.status(200).json({ success: true, data });
    } catch (error) {
      return res
        .status(error.statusCode || 500)
        .json({ success: false, message: error.message });
    }
  },

  async khoaThe(req, res) {
    try {
      const data = await TheRaVaoService.khoaThe(
        req.user,
        Number(req.params.maThe),
        req.body?.lyDo
      );
      return res
        .status(200)
        .json({ success: true, message: "Đã khóa thẻ thành công!", data });
    } catch (error) {
      return res
        .status(error.statusCode || 500)
        .json({ success: false, message: error.message });
    }
  },

  async xoaThe(req, res) {
    try {
      const data = await TheRaVaoService.xoaThe(req.user, Number(req.params.maThe));
      return res
        .status(200)
        .json({ success: true, message: "Đã xóa thẻ thành công!", data });
    } catch (error) {
      return res
        .status(error.statusCode || 500)
        .json({ success: false, message: error.message });
    }
  },

  async iotKiemTraMatKhau(req, res) {
    try {
      const result = await TheRaVaoService.xacThucMatKhau(req.body);
      return res.status(200).json(result);
    } catch (error) {
      return res.status(500).json({ allow: false, message: error.message });
    }
  },
};

module.exports = TheRaVaoController;