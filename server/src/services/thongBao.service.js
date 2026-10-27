// server/src/services/thongBao.service.js
const ThongBaoModel = require("../app/models/thongBao.model");

const ThongBaoService = {
  // Hàm trích xuất thông tin User an toàn (tương thích cả maND/MaND)
  extractUser(user) {
    const maND = Number(user?.maND ?? user?.MaND);
    const quyen = user?.quyen ?? user?.Quyen;
    if (isNaN(maND) || !maND) {
      const err = new Error("Không xác định được danh tính người dùng từ Token.");
      err.statusCode = 401;
      throw err;
    }
    return { maND, quyen };
  },

  // Xác định phạm vi quyền hạn cho trang Quản lý (Chủ trọ / Quản lý khu)
  async resolveUserPermission(user) {
    const { maND, quyen } = this.extractUser(user);

    if (quyen === "KhachThue") {
      const error = new Error("Khách thuê không có quyền truy cập trang quản lý thông báo.");
      error.statusCode = 403;
      throw error;
    }

    const allKhuTro = await ThongBaoModel.getAllKhuTro();
    const myKhuTro = await ThongBaoModel.getKhuTroByManager(maND);

    const isSupremeLandlord =
      quyen === "Admin" ||
      (quyen === "ChuTro" && (myKhuTro.length === 0 || myKhuTro.length === allKhuTro.length));

    const allowedKhuTro = isSupremeLandlord ? allKhuTro : myKhuTro;
    const allowedKhuIds = allowedKhuTro.map((k) => k.MaKhu);

    if (!isSupremeLandlord && allowedKhuIds.length === 0) {
      const error = new Error("Tài khoản quản lý của bạn chưa được phân công Khu trọ nào.");
      error.statusCode = 403;
      throw error;
    }

    return {
      maND,
      quyen,
      isSupremeLandlord,
      allowedKhuTro,
      allowedKhuIds,
    };
  },

  async getMetadata(user) {
    const perm = await this.resolveUserPermission(user);
    const [loaiThongBao, danhSachPhong] = await Promise.all([
      ThongBaoModel.getLoaiThongBao(),
      ThongBaoModel.getPhongByKhuIds(perm.allowedKhuIds),
    ]);

    return {
      vaiTroHienThi: perm.isSupremeLandlord ? "CHU_TRO_TONG" : "QUAN_LY_KHU",
      isSupremeLandlord: perm.isSupremeLandlord,
      khuTroList: perm.allowedKhuTro,
      phongList: danhSachPhong,
      loaiThongBaoList: loaiThongBao,
    };
  },

  async createThongBao(user, body) {
    const perm = await this.resolveUserPermission(user);
    const { maLTB, tieuDe, noiDung, phamVi, maKhu, maPhong } = body;

    if (!maLTB || !tieuDe?.trim() || !noiDung?.trim()) {
      const err = new Error("Vui lòng nhập đầy đủ loại thông báo, tiêu đề và nội dung.");
      err.statusCode = 400;
      throw err;
    }

    let dsNguoiNhan = [];

    switch (phamVi) {
      case "TOAN_HE_THONG": {
        if (!perm.isSupremeLandlord) {
          const err = new Error("Chỉ Chủ trọ mới có quyền gửi thông báo cho toàn bộ hệ thống!");
          err.statusCode = 403;
          throw err;
        }
        dsNguoiNhan = await ThongBaoModel.getAllSystemRecipientIds(perm.maND);
        break;
      }

      case "TAT_CA_QUAN_LY": {
        if (!perm.isSupremeLandlord) {
          const err = new Error("Chỉ Chủ trọ mới có quyền gửi thông báo cho các Quản lý khu trọ!");
          err.statusCode = 403;
          throw err;
        }
        dsNguoiNhan = await ThongBaoModel.getAllManagerIds(perm.maND);
        break;
      }

      case "THEO_KHU": {
        const targetKhuId = Number(maKhu);
        if (!targetKhuId) {
          if (!perm.isSupremeLandlord) {
            dsNguoiNhan = await ThongBaoModel.getTenantIdsByKhu(perm.allowedKhuIds, perm.maND);
            break;
          }
          const err = new Error("Vui lòng chọn Khu trọ cần gửi thông báo.");
          err.statusCode = 400;
          throw err;
        }

        if (!perm.allowedKhuIds.includes(targetKhuId)) {
          const err = new Error("Bạn không có quyền gửi thông báo cho Khu trọ này!");
          err.statusCode = 403;
          throw err;
        }

        dsNguoiNhan = await ThongBaoModel.getTenantIdsByKhu([targetKhuId], perm.maND);
        break;
      }

      case "THEO_PHONG": {
        const targetPhongId = Number(maPhong);
        if (!targetPhongId) {
          const err = new Error("Vui lòng chọn Phòng cần gửi thông báo.");
          err.statusCode = 400;
          throw err;
        }
        dsNguoiNhan = await ThongBaoModel.getTenantIdsByPhong(
          targetPhongId,
          perm.allowedKhuIds,
          perm.maND
        );
        break;
      }

      default: {
        const err = new Error("Phạm vi gửi thông báo không hợp lệ.");
        err.statusCode = 400;
        throw err;
      }
    }

    if (dsNguoiNhan.length === 0) {
      const err = new Error(
        "Không tìm thấy người nhận hợp lệ (hoặc khu/phòng hiện chưa có khách thuê đang ở)."
      );
      err.statusCode = 400;
      throw err;
    }

    const thongBaoMoi = await ThongBaoModel.createThongBao({
      ndGui: perm.maND,
      maLTB: Number(maLTB),
      tieuDe: tieuDe.trim(),
      noiDung: noiDung.trim(),
      maTBGoc: null,
      dsNguoiNhan,
    });

    return {
      thongBao: thongBaoMoi,
      dsNguoiNhan,
    };
  },

  async searchThongBao(user, query) {
    const perm = await this.resolveUserPermission(user);
    return await ThongBaoModel.searchThongBao({
      maND: perm.maND,
      isSupremeLandlord: perm.isSupremeLandlord,
      keyword: query.keyword || "",
      maLTB: query.maLTB || "",
      tab: query.tab || "da_gui",
    });
  },

  // --- CÁC TÍNH NĂNG DÀNH CHO NGƯỜI DÙNG & NOTIFICATION BELL ---

  // 1. Lấy danh sách thông báo cho NotificationBell & Trang Thông báo Người thuê
  async getThongBaoCuaToi(user, query = {}) {
    const { maND } = this.extractUser(user);
    const options =
      typeof query === "number"
        ? { limit: query }
        : {
            limit: Number(query.limit) || 50,
            keyword: query.keyword || "",
            maLTB: query.maLTB || "",
            trangThai: query.trangThai || "",
            tab: query.tab || "da_nhan",
          };

    const [notiData, loaiThongBaoList, roomData] = await Promise.all([
      ThongBaoModel.getThongBaoCuaToi(maND, options),
      ThongBaoModel.getLoaiThongBao(),
      ThongBaoModel.getThongTinPhongVaNguoiNhanCuaKhach(maND),
    ]);

    return {
      ...notiData,
      loaiThongBaoList,
      thongTinPhong: roomData.thongTinPhong,
    };
  },

  // 1b. Khách thuê gửi phản ánh / báo cáo sự cố lên Quản lý khu & Chủ trọ
  async createPhanAnhKhachThue(user, body) {
    const { maND } = this.extractUser(user);
    const { maLTB, tieuDe, noiDung } = body;

    if (!maLTB || !tieuDe?.trim() || !noiDung?.trim()) {
      const err = new Error("Vui lòng chọn loại thông báo, nhập tiêu đề và nội dung chi tiết.");
      err.statusCode = 400;
      throw err;
    }

    const { thongTinPhong, recipients } =
      await ThongBaoModel.getThongTinPhongVaNguoiNhanCuaKhach(maND);

    if (recipients.length === 0) {
      const err = new Error("Không tìm thấy Ban quản lý để nhận phản ánh.");
      err.statusCode = 400;
      throw err;
    }

    // Tự động gắn nhãn Phòng - Khu vào tiêu đề để Quản lý biết ngay sự cố ở phòng nào
    const prefix = thongTinPhong
      ? `[${thongTinPhong.TenPhong} - ${thongTinPhong.TenKhu}] `
      : "";
    const finalTitle = tieuDe.trim().startsWith("[")
      ? tieuDe.trim()
      : `${prefix}${tieuDe.trim()}`;

    const thongBaoMoi = await ThongBaoModel.createThongBao({
      ndGui: maND,
      maLTB: Number(maLTB),
      tieuDe: finalTitle,
      noiDung: noiDung.trim(),
      maTBGoc: null,
      dsNguoiNhan: recipients,
    });

    return {
      thongBao: thongBaoMoi,
      dsNguoiNhan: recipients,
    };
  },

  // 2. Xem chi tiết thông báo + Tự động đánh dấu đã đọc
  async getChiTietThongBao(user, maTB) {
    const { maND } = this.extractUser(user);
    if (!maTB || isNaN(maTB)) {
      const err = new Error("Mã thông báo không hợp lệ.");
      err.statusCode = 400;
      throw err;
    }

    // Tự động đánh dấu đã đọc khi mở xem chi tiết
    await ThongBaoModel.markAsRead(maTB, maND);

    const detail = await ThongBaoModel.getChiTietThongBao(maTB, maND);
    if (!detail) {
      const err = new Error("Không tìm thấy thông báo này.");
      err.statusCode = 404;
      throw err;
    }

    return detail;
  },

  // 3. Trả lời thông báo
  async replyThongBao(user, maTB, body) {
    const { maND } = this.extractUser(user);
    const { noiDung } = body;

    if (!noiDung || !noiDung.trim()) {
      const err = new Error("Vui lòng nhập nội dung phản hồi.");
      err.statusCode = 400;
      throw err;
    }

    const target = await ThongBaoModel.getThongBaoById(maTB);
    if (!target) {
      const err = new Error("Thông báo cần trả lời không tồn tại.");
      err.statusCode = 404;
      throw err;
    }

    const rootMaTB = target.MaTBGoc || target.MaTB;
    const { root, recipients } = await ThongBaoModel.getReplyRecipients(
      rootMaTB,
      target.MaTB,
      maND
    );

    if (!root) {
      const err = new Error("Không tìm thấy thông báo gốc.");
      err.statusCode = 404;
      throw err;
    }

    const tieuDePhanHoi = root.TieuDe.startsWith("Phản hồi:")
      ? root.TieuDe
      : `Phản hồi: ${root.TieuDe}`;

    const phanHoiMoi = await ThongBaoModel.createThongBao({
      ndGui: maND,
      maLTB: root.MaLTB,
      tieuDe: tieuDePhanHoi,
      noiDung: noiDung.trim(),
      maTBGoc: rootMaTB,
      dsNguoiNhan: recipients,
    });

    return {
      phanHoi: phanHoiMoi,
      rootMaTB,
      dsNguoiNhan: recipients,
    };
  },

  // 4. Đánh dấu đã đọc 1 thông báo
  async markAsRead(user, maTB) {
    const { maND } = this.extractUser(user);
    await ThongBaoModel.markAsRead(maTB, maND);
    return { MaTB: maTB, TrangThai: "DaDoc" };
  },

  // 5. Đánh dấu đã đọc tất cả
  async markAllAsRead(user) {
    const { maND } = this.extractUser(user);
    const updatedCount = await ThongBaoModel.markAllAsRead(maND);
    return { updatedCount };
  },

  async deleteThongBao(user, maTB) {
    const perm = await this.resolveUserPermission(user);
    const existing = await ThongBaoModel.getThongBaoById(maTB);

    if (!existing) {
      const err = new Error("Thông báo không tồn tại hoặc đã bị xóa.");
      err.statusCode = 404;
      throw err;
    }

    if (!perm.isSupremeLandlord && Number(existing.NDGui) !== perm.maND) {
      const err = new Error("Bạn chỉ có quyền xóa những thông báo do chính mình tạo!");
      err.statusCode = 403;
      throw err;
    }

    await ThongBaoModel.deleteThongBao(maTB);
    return { MaTB: Number(maTB) };
  },
};

module.exports = ThongBaoService;