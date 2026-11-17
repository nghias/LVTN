// src/controllers/tinDang.controller.js
const TinDangModel = require('../models/tinDang.model');

// Lấy MaND từ query/body hoặc từ JWT Cookie (req.user)
function extractCurrentMaND(req) {
  const fromQueryOrBody =
    req.query?.MaND ||
    req.query?.maND ||
    req.body?.MaND ||
    req.body?.maND ||
    req.headers?.['x-ma-nd'];

  const fromUser =
    req.user?.MaND ||
    req.user?.maND ||
    req.user?.id ||
    req.user?.userId;

  // Ưu tiên thông tin xác thực từ req.user, nếu không có thì lấy từ query/body
  return fromUser || fromQueryOrBody || null;
}

// Xác định người dùng hiện tại (nếu không truyền MaND sẽ fallback về tài khoản ChuTro)
async function resolveCurrentUser(req) {
  const rawMaND = extractCurrentMaND(req);
  if (rawMaND && !isNaN(Number(rawMaND))) {
    const user = await TinDangModel.getNguoiDungById(Number(rawMaND));
    if (user) return user;
  }
  return null;
}

const TinDangController = {
  // GET /tin-dang/public (Lấy danh sách phòng còn trống & tin đang hiển thị kèm toàn bộ ảnh)
  async getPublicList(req, res) {
    try {
      const tinDangList = await TinDangModel.getPublicTinDang();
      return res.status(200).json({
        success: true,
        data: { tinDangList },
      });
    } catch (error) {
      console.error('❌ Lỗi lấy danh sách tin đăng công khai:', error);
      return res.status(500).json({
        success: false,
        message: 'Không thể tải danh sách tin đăng công khai.',
      });
    }
  },

  // GET /tin-dang/public/:maTin (Xem chi tiết 1 phòng còn trống & tin đang hiển thị kèm tất cả ảnh)
  async getPublicDetail(req, res) {
    try {
      const { maTin } = req.params;
      if (!maTin || isNaN(Number(maTin))) {
        return res.status(400).json({
          success: false,
          message: 'Mã tin đăng không hợp lệ.',
        });
      }

      const tinDang = await TinDangModel.getPublicTinDangById(Number(maTin));
      if (!tinDang) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy phòng hoặc tin đăng đã ngừng hiển thị.',
        });
      }

      return res.status(200).json({
        success: true,
        data: { tinDang },
      });
    } catch (error) {
      console.error('❌ Lỗi lấy chi tiết tin đăng công khai:', error);
      return res.status(500).json({
        success: false,
        message: 'Không thể tải thông tin chi tiết phòng.',
      });
    }
  },

  // GET /tin-dang (Quản lý tin đăng & lấy danh sách phòng trống theo quyền ChuTro / QuanLy khu)
  async getList(req, res) {
    try {
      let nguoiDung = await resolveCurrentUser(req);

      // Nếu FE không gửi MaND và chưa có cookie, fallback về tài khoản Chủ trọ mặc định
      if (!nguoiDung) {
        nguoiDung = await TinDangModel.getChuTroMacDinh();
      }

      if (!nguoiDung) {
        return res.status(401).json({
          success: false,
          message: 'Không xác định được tài khoản đang đăng nhập.',
        });
      }

      if (
        nguoiDung.Quyen !== 'ChuTro' &&
        nguoiDung.Quyen !== 'QuanLy' &&
        nguoiDung.Quyen !== 'Admin'
      ) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền truy cập trang quản lý tin đăng.',
        });
      }

      const excludeMaTin = req.query?.excludeMaTin
        ? Number(req.query.excludeMaTin)
        : null;

      // Đồng bộ các tin đã quá NgayHetHan sang trạng thái 'HetHan' trước khi lấy dữ liệu
      await TinDangModel.syncExpiredTinDang();

      const [tinDangList, phongList, khuTroList] = await Promise.all([
        TinDangModel.getAllTinDang(nguoiDung.MaND, nguoiDung.Quyen),
        TinDangModel.getPhongListForSelect(
          nguoiDung.MaND,
          nguoiDung.Quyen,
          excludeMaTin
        ),
        TinDangModel.getKhuTroList(nguoiDung.MaND, nguoiDung.Quyen),
      ]);

      return res.status(200).json({
        success: true,
        data: {
          tinDangList,
          phongList,
          khuTroList,
          userRole: nguoiDung.Quyen,
          currentMaND: nguoiDung.MaND,
        },
      });
    } catch (error) {
      console.error('❌ Lỗi lấy danh sách tin đăng:', error);
      return res.status(500).json({
        success: false,
        message: 'Không thể tải danh sách tin đăng từ cơ sở dữ liệu.',
      });
    }
  },

  // POST /tin-dang
  async create(req, res) {
    try {
      const { MaPhong, Gia, TieuDe, MoTa, NgayHetHan, TrangThai } = req.body;

      if (!MaPhong || !TieuDe || !String(TieuDe).trim()) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng chọn phòng và nhập tiêu đề bài đăng.',
        });
      }

      if (Gia !== undefined && Gia !== null && Gia !== '') {
        const giaNum = Number(Gia);
        if (isNaN(giaNum) || giaNum <= 0) {
          return res.status(400).json({
            success: false,
            message: 'Giá niêm yết phòng không hợp lệ.',
          });
        }
      }

      let nguoiDung = await resolveCurrentUser(req);
      if (!nguoiDung) {
        nguoiDung = await TinDangModel.getChuTroMacDinh();
      }

      if (!nguoiDung) {
        return res.status(401).json({
          success: false,
          message: 'Không xác định được người dùng đăng tin.',
        });
      }

      const hasFullAccess =
        nguoiDung.Quyen === 'ChuTro' || nguoiDung.Quyen === 'Admin';

      // Nếu là Quản lý: kiểm tra phòng có thuộc khu trọ do người này quản lý (khutro.MaND) hay không
      if (!hasFullAccess) {
        const isAllowed = await TinDangModel.checkPhongThuocQuanLy(
          Number(MaPhong),
          nguoiDung.MaND
        );
        if (!isAllowed) {
          return res.status(403).json({
            success: false,
            message:
              'Bạn chỉ được phép đăng tin cho phòng thuộc khu trọ mình quản lý.',
          });
        }
      }

      // Đồng bộ tin hết hạn trước khi kiểm tra phòng
      await TinDangModel.syncExpiredTinDang();

      const checkPhong = await TinDangModel.checkPhongCoTheDangTin(
        Number(MaPhong)
      );
      if (!checkPhong.valid) {
        const errorMessages = {
          NOT_FOUND: 'Phòng không tồn tại trong hệ thống.',
          NOT_EMPTY:
            'Chỉ được phép đăng tin cho phòng đang còn trống hoặc đang bảo trì.',
          ALREADY_HAS_STATUS:
            'Phòng này đang có tin hiển thị còn hiệu lực, không thể đăng trùng.',
        };
        return res.status(400).json({
          success: false,
          message:
            errorMessages[checkPhong.reason] ||
            'Phòng không hợp lệ để đăng tin.',
        });
      }

      if (Gia !== undefined && Gia !== null && Gia !== '') {
        await TinDangModel.updateGiaPhong(Number(MaPhong), Number(Gia));
      }

      const trangThaiMoi = TinDangModel.normalizeTrangThaiTin(TrangThai);

      const insertId = await TinDangModel.createTinDang({
        MaPhong: Number(MaPhong),
        MaND: nguoiDung.MaND,
        TieuDe: String(TieuDe).trim(),
        MoTa,
        NgayHetHan,
        TrangThai: trangThaiMoi,
      });

      return res.status(201).json({
        success: true,
        message: 'Đăng tin mới thành công.',
        data: {
          MaTin: insertId,
          TrangThai: trangThaiMoi,
        },
      });
    } catch (error) {
      console.error('❌ Lỗi tạo tin đăng:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi tạo tin đăng mới.',
      });
    }
  },

  // PUT /tin-dang/:maTin
  async update(req, res) {
    try {
      const { maTin } = req.params;
      const { MaPhong, Gia, TieuDe, MoTa, NgayHetHan, TrangThai } = req.body;

      if (Gia !== undefined && Gia !== null && Gia !== '') {
        const giaNum = Number(Gia);
        if (isNaN(giaNum) || giaNum <= 0) {
          return res.status(400).json({
            success: false,
            message: 'Giá niêm yết phòng không hợp lệ.',
          });
        }
      }

      const existingTin = await TinDangModel.getTinDangById(Number(maTin));
      if (!existingTin) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy tin đăng cần chỉnh sửa.',
        });
      }

      const targetMaPhong = MaPhong
        ? Number(MaPhong)
        : Number(existingTin.MaPhong);

      let nguoiDung = await resolveCurrentUser(req);
      if (!nguoiDung) {
        nguoiDung = await TinDangModel.getChuTroMacDinh();
      }

      if (!nguoiDung) {
        return res.status(401).json({
          success: false,
          message: 'Không xác định được người dùng thực hiện.',
        });
      }

      const hasFullAccess =
        nguoiDung.Quyen === 'ChuTro' || nguoiDung.Quyen === 'Admin';

      // Nếu là Quản lý: kiểm tra theo khu trọ quản lý (khutro.MaND), không lọc theo tindang.MaND
      if (!hasFullAccess) {
        const [ownsTin, ownsPhong] = await Promise.all([
          TinDangModel.checkTinThuocQuanLy(Number(maTin), nguoiDung.MaND),
          TinDangModel.checkPhongThuocQuanLy(targetMaPhong, nguoiDung.MaND),
        ]);

        if (!ownsTin || !ownsPhong) {
          return res.status(403).json({
            success: false,
            message:
              'Bạn chỉ được phép chỉnh sửa tin đăng thuộc khu trọ mình quản lý.',
          });
        }
      }

      const trangThaiCapNhat = TinDangModel.normalizeTrangThaiTin(
        TrangThai || existingTin.TrangThai || 'DangHienThi'
      );

      // Nếu đổi sang phòng khác hoặc đang để trạng thái DangHienThi thì kiểm tra phòng có bị trùng tin đang hiển thị khác không
      if (
        targetMaPhong !== Number(existingTin.MaPhong) ||
        trangThaiCapNhat === 'DangHienThi'
      ) {
        const checkPhong = await TinDangModel.checkPhongCoTheDangTin(
          targetMaPhong,
          Number(maTin)
        );
        if (!checkPhong.valid && checkPhong.reason === 'ALREADY_HAS_STATUS') {
          return res.status(400).json({
            success: false,
            message:
              'Phòng được chọn đang có một tin đăng hiển thị khác còn hiệu lực.',
          });
        }
      }

      const updated = await TinDangModel.updateTinDang(Number(maTin), {
        MaPhong: targetMaPhong,
        TieuDe:
          TieuDe !== undefined && String(TieuDe).trim() !== ''
            ? String(TieuDe).trim()
            : existingTin.TieuDe,
        MoTa: MoTa !== undefined ? MoTa : existingTin.MoTa,
        NgayHetHan:
          NgayHetHan !== undefined ? NgayHetHan : existingTin.NgayHetHan,
        TrangThai: trangThaiCapNhat,
      });

      if (!updated) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy tin đăng cần chỉnh sửa.',
        });
      }

      if (Gia !== undefined && Gia !== null && Gia !== '') {
        await TinDangModel.updateGiaPhong(targetMaPhong, Number(Gia));
      }

      return res.status(200).json({
        success: true,
        message: 'Cập nhật tin đăng thành công.',
        data: {
          MaTin: Number(maTin),
          TrangThai: trangThaiCapNhat,
        },
      });
    } catch (error) {
      console.error('❌ Lỗi cập nhật tin đăng:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi cập nhật tin đăng.',
      });
    }
  },

  // DELETE /tin-dang/:maTin
  async remove(req, res) {
    try {
      const { maTin } = req.params;
      const nguoiDung = await resolveCurrentUser(req);

      if (
        nguoiDung &&
        nguoiDung.Quyen !== 'ChuTro' &&
        nguoiDung.Quyen !== 'Admin'
      ) {
        const ownsTin = await TinDangModel.checkTinThuocQuanLy(
          Number(maTin),
          nguoiDung.MaND
        );
        if (!ownsTin) {
          return res.status(403).json({
            success: false,
            message: 'Bạn không có quyền xóa tin đăng của khu trọ khác.',
          });
        }
      }

      const deleted = await TinDangModel.deleteTinDang(Number(maTin));

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy tin đăng cần xóa.',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Đã xóa tin đăng thành công.',
      });
    } catch (error) {
      console.error('❌ Lỗi xóa tin đăng:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi xóa tin đăng.',
      });
    }
  },
};

module.exports = TinDangController;