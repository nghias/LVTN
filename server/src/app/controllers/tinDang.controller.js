const TinDangModel = require('../models/tinDang.model');

// Hàm phụ lấy MaND từ JWT Cookie (req.user.maND) hoặc từ query/body
function extractCurrentMaND(req) {
  return (
    req.user?.maND ||
    req.user?.MaND ||
    req.query?.MaND ||
    req.body?.MaND ||
    null
  );
}

const TinDangController = {
  // GET /tin-dang/public (Dùng cho khách xem ở trang chủ không cần đăng nhập)
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

  // GET /tin-dang (Dùng cho trang Quản lý tin đăng - Xét theo quyền ChuTro / QuanLy)
  async getList(req, res) {
    try {
      const currentMaND = extractCurrentMaND(req);

      if (!currentMaND) {
        return res.status(401).json({
          success: false,
          message: 'Không xác định được tài khoản đang đăng nhập.',
        });
      }

      const nguoiDung = await TinDangModel.getNguoiDungById(Number(currentMaND));
      if (!nguoiDung) {
        return res.status(403).json({
          success: false,
          message: 'Tài khoản người dùng không tồn tại hoặc không hợp lệ.',
        });
      }

      // Chỉ cho phép ChuTro hoặc QuanLy truy cập danh sách quản lý
      if (nguoiDung.Quyen !== 'ChuTro' && nguoiDung.Quyen !== 'QuanLy') {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền truy cập trang quản lý tin đăng.',
        });
      }

      // phongList chỉ chứa các phòng còn trống và chưa có trạng thái tin
      const [tinDangList, phongList] = await Promise.all([
        TinDangModel.getAllTinDang(nguoiDung.MaND, nguoiDung.Quyen),
        TinDangModel.getPhongListForSelect(nguoiDung.MaND, nguoiDung.Quyen),
      ]);

      return res.status(200).json({
        success: true,
        data: {
          tinDangList,
          phongList,
          userRole: nguoiDung.Quyen,
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

  // POST /tin-dang (Đăng tin mới + Gán trạng thái tin + Cập nhật giá niêm yết phòng nếu có)
  async create(req, res) {
    try {
      const { MaPhong, Gia, TieuDe, MoTa, NgayHetHan, TrangThai } = req.body;
      const currentMaND = extractCurrentMaND(req);

      if (!MaPhong || !TieuDe) {
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

      if (!currentMaND) {
        return res.status(401).json({
          success: false,
          message: 'Không xác định được người dùng đăng tin.',
        });
      }

      const nguoiDung = await TinDangModel.getNguoiDungById(Number(currentMaND));
      if (!nguoiDung) {
        return res.status(403).json({
          success: false,
          message: 'Tài khoản người dùng không hợp lệ.',
        });
      }

      // Chỉ tài khoản có quyền ChuTro mới được đăng tin ở tất cả cơ sở
      const isChuTro = nguoiDung.Quyen === 'ChuTro';
      if (!isChuTro) {
        const isAllowed = await TinDangModel.checkPhongThuocQuanLy(
          Number(MaPhong),
          nguoiDung.MaND
        );
        if (!isAllowed) {
          return res.status(403).json({
            success: false,
            message: 'Bạn chỉ được phép đăng tin cho phòng thuộc khu trọ mình quản lý.',
          });
        }
      }

      // Kiểm tra phòng phải đang còn trống và chưa có trạng thái tin đăng
      const checkPhong = await TinDangModel.checkPhongCoTheDangTin(Number(MaPhong));
      if (!checkPhong.valid) {
        const errorMessages = {
          NOT_FOUND: 'Phòng không tồn tại trong hệ thống.',
          NOT_EMPTY: 'Chỉ được phép đăng tin cho phòng đang còn trống.',
          ALREADY_HAS_STATUS: 'Phòng này đã có tin đăng hoạt động, không thể thêm tin trùng.',
        };
        return res.status(400).json({
          success: false,
          message: errorMessages[checkPhong.reason] || 'Phòng không hợp lệ để đăng tin.',
        });
      }

      // Nếu người dùng truyền Gia lên thì cập nhật giá niêm yết của phòng đó
      if (Gia !== undefined && Gia !== null && Gia !== '') {
        await TinDangModel.updateGiaPhong(Number(MaPhong), Number(Gia));
      }

      // Khi tạo tin mới, trạng thái tin mới chính thức được thiết lập (mặc định: DangHienThi)
      const trangThaiMoi =
        TrangThai && String(TrangThai).trim() !== ''
          ? String(TrangThai).trim()
          : 'DangHienThi';

      const insertId = await TinDangModel.createTinDang({
        MaPhong: Number(MaPhong),
        MaND: nguoiDung.MaND,
        TieuDe,
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

  // PUT /tin-dang/:maTin (Cập nhật tin đăng + Cập nhật giá niêm yết phòng nếu có)
  async update(req, res) {
    try {
      const { maTin } = req.params;
      const { MaPhong, Gia, TieuDe, MoTa, NgayHetHan, TrangThai } = req.body;
      const currentMaND = extractCurrentMaND(req);

      if (!currentMaND) {
        return res.status(401).json({
          success: false,
          message: 'Không xác định được người dùng thực hiện.',
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

      const existingTin = await TinDangModel.getTinDangById(Number(maTin));
      if (!existingTin) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy tin đăng cần chỉnh sửa.',
        });
      }

      // Giữ lại MaPhong cũ nếu FE không truyền MaPhong mới khi sửa
      const targetMaPhong = MaPhong ? Number(MaPhong) : Number(existingTin.MaPhong);

      const nguoiDung = await TinDangModel.getNguoiDungById(Number(currentMaND));
      if (!nguoiDung) {
        return res.status(403).json({
          success: false,
          message: 'Tài khoản người dùng không hợp lệ.',
        });
      }

      const isChuTro = nguoiDung.Quyen === 'ChuTro';
      if (!isChuTro) {
        const [ownsTin, ownsPhong] = await Promise.all([
          TinDangModel.checkTinThuocQuanLy(Number(maTin), nguoiDung.MaND),
          TinDangModel.checkPhongThuocQuanLy(targetMaPhong, nguoiDung.MaND),
        ]);

        if (!ownsTin || !ownsPhong) {
          return res.status(403).json({
            success: false,
            message: 'Bạn chỉ được phép chỉnh sửa tin đăng thuộc khu trọ mình quản lý.',
          });
        }
      }

      // Nếu đổi sang phòng khác, kiểm tra phòng mới có trống và chưa có tin đăng không
      if (targetMaPhong !== Number(existingTin.MaPhong)) {
        const checkPhong = await TinDangModel.checkPhongCoTheDangTin(
          targetMaPhong,
          Number(maTin)
        );
        if (!checkPhong.valid) {
          return res.status(400).json({
            success: false,
            message: 'Phòng được chọn phải đang còn trống và chưa có tin đăng khác.',
          });
        }
      }

      const updated = await TinDangModel.updateTinDang(Number(maTin), {
        MaPhong: targetMaPhong,
        TieuDe: TieuDe ?? existingTin.TieuDe,
        MoTa: MoTa !== undefined ? MoTa : existingTin.MoTa,
        NgayHetHan: NgayHetHan !== undefined ? NgayHetHan : existingTin.NgayHetHan,
        TrangThai: TrangThai || existingTin.TrangThai || 'DangHienThi',
      });

      if (!updated) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy tin đăng cần chỉnh sửa.',
        });
      }

      // Cập nhật giá niêm yết của phòng trong bảng Phong
      if (Gia !== undefined && Gia !== null && Gia !== '') {
        await TinDangModel.updateGiaPhong(targetMaPhong, Number(Gia));
      }

      return res.status(200).json({
        success: true,
        message: 'Cập nhật tin đăng thành công.',
      });
    } catch (error) {
      console.error('❌ Lỗi cập nhật tin đăng:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi cập nhật tin đăng.',
      });
    }
  },

  // DELETE /tin-dang/:maTin (Xóa tin đăng + xóa luôn trạng thái tin để phòng xuất hiện lại ở danh sách thêm tin)
  async remove(req, res) {
    try {
      const { maTin } = req.params;
      const currentMaND = extractCurrentMaND(req);

      if (currentMaND) {
        const nguoiDung = await TinDangModel.getNguoiDungById(Number(currentMaND));
        if (nguoiDung && nguoiDung.Quyen !== 'ChuTro') {
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
        message: 'Đã xóa tin đăng và trạng thái tin thành công. Phòng đã có thể đăng tin lại.',
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