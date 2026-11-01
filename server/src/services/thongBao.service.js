// server/src/services/thongBao.service.js
const ThongBaoModel = require("../app/models/thongBao.model");

const createError = (message, statusCode = 400) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

const ThongBaoService = {
  // Xác định quyền hạn & khu trọ được phép thao tác của người dùng
  async resolveUserPermission(user) {
    const maND = Number(user?.maND ?? user?.MaND);
    const quyen = user?.quyen ?? user?.Quyen ?? "";

    if (!maND) {
      throw createError("Không xác định được người dùng đăng nhập.", 401);
    }

    const isSupremeLandlord = quyen === "ChuTro" || quyen === "Admin";

    const khuTroList = isSupremeLandlord
      ? await ThongBaoModel.getAllKhuTro()
      : await ThongBaoModel.getKhuTroByManager(maND);

    const allowedKhuIds = khuTroList.map((k) => Number(k.MaKhu));

    return {
      maND,
      quyen,
      isSupremeLandlord,
      vaiTroHienThi: isSupremeLandlord ? "CHU_TRO_TONG" : "QUAN_LY_KHU",
      khuTroList,
      allowedKhuIds,
    };
  },

  // 1. Lấy dữ liệu khởi tạo cho trang Quản lý thông báo & Modal Soạn thông báo
  async getMetadata(user) {
    const perm = await this.resolveUserPermission(user);

    const [loaiThongBaoList, phongList, nguoiNhanList] = await Promise.all([
      ThongBaoModel.getLoaiThongBao(),
      ThongBaoModel.getPhongByKhuIds(perm.allowedKhuIds),
      ThongBaoModel.getSelectableRecipients({
        isSupremeLandlord: perm.isSupremeLandlord,
        allowedKhuIds: perm.allowedKhuIds,
        excludeMaND: perm.maND,
      }),
    ]);

    return {
      vaiTroHienThi: perm.vaiTroHienThi,
      isSupremeLandlord: perm.isSupremeLandlord,
      khuTroList: perm.khuTroList,
      phongList,
      loaiThongBaoList,
      nguoiNhanList,
    };
  },

  // 2. Tạo và phát thông báo (Tất cả mọi người / Theo khu / Theo phòng / 1 người / Nhiều người)
  async createThongBao(user, payload) {
    const perm = await this.resolveUserPermission(user);
    const {
      maLTB,
      tieuDe,
      noiDung,
      phamVi,
      maKhu,
      maPhong,
      nguoiNhanIds,
    } = payload || {};

    if (!maLTB || !tieuDe?.trim() || !noiDung?.trim()) {
      throw createError("Vui lòng nhập đầy đủ loại thông báo, tiêu đề và nội dung.");
    }

    let dsNguoiNhan = [];

    switch (phamVi) {
      case "TOAN_HE_THONG": {
        if (!perm.isSupremeLandlord) {
          throw createError(
            "Chỉ Chủ trọ mới có quyền phát thông báo toàn hệ thống.",
            403
          );
        }
        dsNguoiNhan = await ThongBaoModel.getAllSystemRecipientIds(perm.maND);
        break;
      }

      case "TAT_CA_QUAN_LY": {
        if (!perm.isSupremeLandlord) {
          throw createError(
            "Chỉ Chủ trọ mới có quyền gửi thông báo cho tất cả Quản lý.",
            403
          );
        }
        dsNguoiNhan = await ThongBaoModel.getAllManagerIds(perm.maND);
        break;
      }

      case "THEO_KHU": {
        const targetKhuIds = maKhu
          ? [Number(maKhu)]
          : perm.allowedKhuIds;

        const isAllowed = targetKhuIds.every((id) =>
          perm.allowedKhuIds.includes(id)
        );
        if (!isAllowed || targetKhuIds.length === 0) {
          throw createError(
            "Bạn không có quyền gửi thông báo cho khu trọ này.",
            403
          );
        }

        dsNguoiNhan = await ThongBaoModel.getTenantIdsByKhu(
          targetKhuIds,
          perm.maND
        );
        break;
      }

      case "THEO_PHONG": {
        if (!maPhong) {
          throw createError("Vui lòng chọn phòng nhận thông báo.");
        }
        dsNguoiNhan = await ThongBaoModel.getTenantIdsByPhong(
          Number(maPhong),
          perm.allowedKhuIds,
          perm.maND
        );
        break;
      }

      case "MOT_NGUOI":
      case "NHIEU_NGUOI": {
        const rawIds = Array.isArray(nguoiNhanIds) ? nguoiNhanIds : [];
        if (phamVi === "MOT_NGUOI" && rawIds.length !== 1) {
          throw createError("Vui lòng chọn đúng 1 người nhận thông báo.");
        }
        if (rawIds.length === 0) {
          throw createError("Vui lòng chọn ít nhất 1 người nhận thông báo.");
        }

        dsNguoiNhan = await ThongBaoModel.filterValidRecipientIds({
          targetIds: rawIds,
          isSupremeLandlord: perm.isSupremeLandlord,
          allowedKhuIds: perm.allowedKhuIds,
          excludeMaND: perm.maND,
        });
        break;
      }

      default:
        throw createError("Phạm vi nhận thông báo không hợp lệ.");
    }

    if (!dsNguoiNhan || dsNguoiNhan.length === 0) {
      throw createError(
        "Không tìm thấy người nhận hợp lệ trong phạm vi đã chọn."
      );
    }

    const thongBao = await ThongBaoModel.createThongBao({
      ndGui: perm.maND,
      maLTB: Number(maLTB),
      tieuDe: tieuDe.trim(),
      noiDung: noiDung.trim(),
      maTBGoc: null,
      dsNguoiNhan,
    });

    return { thongBao, dsNguoiNhan };
  },

  // 3. Tìm kiếm danh sách thông báo ở trang Quản lý
  async searchThongBao(user, query = {}) {
    const perm = await this.resolveUserPermission(user);
    return ThongBaoModel.searchThongBao({
      maND: perm.maND,
      isSupremeLandlord: perm.isSupremeLandlord,
      keyword: query.keyword || "",
      maLTB: query.maLTB || "",
      tab: query.tab || "da_gui",
    });
  },

  // 4. Lấy danh sách thông báo cá nhân (NotificationBell & Trang khách thuê)
  async getThongBaoCuaToi(user, query = {}) {
    const maND = Number(user?.maND ?? user?.MaND);
    if (!maND) {
      throw createError("Chưa đăng nhập.", 401);
    }

    const data = await ThongBaoModel.getThongBaoCuaToi(maND, {
      limit: query.limit,
      keyword: query.keyword,
      maLTB: query.maLTB,
      trangThai: query.trangThai,
      tab: query.tab,
    });

    const { thongTinPhong } =
      await ThongBaoModel.getThongTinPhongVaNguoiNhanCuaKhach(maND);

    return {
      ...data,
      thongTinPhong,
    };
  },

  // 5. Khách thuê gửi phản ánh / báo cáo sự cố
  async createPhanAnhKhachThue(user, body = {}) {
    const maND = Number(user?.maND ?? user?.MaND);
    if (!maND) {
      throw createError("Chưa đăng nhập.", 401);
    }

    const { maLTB, tieuDe, noiDung } = body;
    if (!tieuDe?.trim() || !noiDung?.trim()) {
      throw createError("Vui lòng nhập đầy đủ tiêu đề và nội dung phản ánh.");
    }

    const { thongTinPhong, recipients } =
      await ThongBaoModel.getThongTinPhongVaNguoiNhanCuaKhach(maND);

    if (!recipients || recipients.length === 0) {
      throw createError(
        "Không tìm thấy Ban quản lý để nhận phản ánh lúc này."
      );
    }

    const prefixRoom = thongTinPhong?.TenPhong
      ? `[${thongTinPhong.TenPhong} - ${thongTinPhong.TenKhu}] `
      : "";
    const finalTitle = tieuDe.trim().startsWith("[")
      ? tieuDe.trim()
      : `${prefixRoom}${tieuDe.trim()}`;

    const thongBao = await ThongBaoModel.createThongBao({
      ndGui: maND,
      maLTB: Number(maLTB) || 1,
      tieuDe: finalTitle,
      noiDung: noiDung.trim(),
      maTBGoc: null,
      dsNguoiNhan: recipients,
    });

    return {
      thongBao,
      dsNguoiNhan: recipients,
    };
  },

  // 6. Xem chi tiết thông báo & tự động đánh dấu đã đọc
  async getChiTietThongBao(user, maTB) {
    const maND = Number(user?.maND ?? user?.MaND);
    if (!maND || !maTB) {
      throw createError("Thông tin truy vấn không hợp lệ.");
    }

    await ThongBaoModel.markAsRead(maTB, maND);
    const detail = await ThongBaoModel.getChiTietThongBao(maTB, maND);
    if (!detail) {
      throw createError("Không tìm thấy thông báo.", 404);
    }

    return detail;
  },

  // 7. Trả lời thông báo
  async replyThongBao(user, maTB, body = {}) {
    const maND = Number(user?.maND ?? user?.MaND);
    const { noiDung } = body;

    if (!maND) {
      throw createError("Chưa đăng nhập.", 401);
    }
    if (!noiDung || !noiDung.trim()) {
      throw createError("Vui lòng nhập nội dung phản hồi.");
    }

    const target = await ThongBaoModel.getThongBaoById(maTB);
    if (!target) {
      throw createError("Thông báo không tồn tại hoặc đã bị xóa.", 404);
    }

    const rootMaTB = target.MaTBGoc || target.MaTB;
    const { root, recipients } = await ThongBaoModel.getReplyRecipients(
      rootMaTB,
      maTB,
      maND
    );

    if (!root) {
      throw createError("Không tìm thấy thông báo gốc.", 404);
    }

    const replyTitle = root.TieuDe.startsWith("Re:")
      ? root.TieuDe
      : `Re: ${root.TieuDe}`;

    const phanHoi = await ThongBaoModel.createThongBao({
      ndGui: maND,
      maLTB: root.MaLTB,
      tieuDe: replyTitle,
      noiDung: noiDung.trim(),
      maTBGoc: rootMaTB,
      dsNguoiNhan: recipients,
    });

    return {
      phanHoi,
      rootMaTB,
      dsNguoiNhan: recipients,
    };
  },

  // 8. Đánh dấu đã đọc 1 thông báo
  async markAsRead(user, maTB) {
    const maND = Number(user?.maND ?? user?.MaND);
    if (!maND || !maTB) {
      throw createError("Dữ liệu không hợp lệ.");
    }
    await ThongBaoModel.markAsRead(maTB, maND);
    return { MaTB: maTB, TrangThai: "DaDoc" };
  },

  // 9. Đánh dấu đã đọc tất cả
  async markAllAsRead(user) {
    const maND = Number(user?.maND ?? user?.MaND);
    if (!maND) {
      throw createError("Chưa đăng nhập.", 401);
    }
    const updatedCount = await ThongBaoModel.markAllAsRead(maND);
    return { updatedCount };
  },

  // 10. Xóa thông báo
  async deleteThongBao(user, maTB) {
    const perm = await this.resolveUserPermission(user);
    const target = await ThongBaoModel.getThongBaoById(maTB);

    if (!target) {
      throw createError("Thông báo không tồn tại.", 404);
    }

    if (!perm.isSupremeLandlord && Number(target.NDGui) !== perm.maND) {
      throw createError("Bạn chỉ có quyền xóa thông báo do chính mình gửi.", 403);
    }

    await ThongBaoModel.deleteThongBao(maTB);
    return { MaTB: maTB };
  },
};

module.exports = ThongBaoService;