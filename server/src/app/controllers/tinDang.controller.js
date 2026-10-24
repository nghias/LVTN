const TinDangModel = require('../models/tinDang.model');

const TinDangController = {
  // GET /api/tin-dang
  async getList(req, res) {
    try {
      const maND = req.user?.MaND || req.query.MaND || req.query.maND;
      if (!maND) {
        return res.status(401).json({
          success: false,
          message: 'Không xác định được người dùng đang đăng nhập.',
        });
      }

      const nguoiDung = await TinDangModel.getNguoiDungById(Number(maND));
      if (!nguoiDung) {
        return res.status(403).json({
          success: false,
          message: 'Tài khoản không tồn tại trong hệ thống.',
        });
      }

      const [tinDangList, phongList] = await Promise.all([
        TinDangModel.getAllTinDang(nguoiDung.MaND, nguoiDung.Quyen),
        TinDangModel.getPhongListForSelect(nguoiDung.MaND, nguoiDung.Quyen),
      ]);

      return res.status(200).json({
        success: true,
        data: { tinDangList, phongList },
      });
    } catch (error) {
      console.error('❌ Lỗi lấy danh sách tin đăng:', error);
      return res.status(500).json({
        success: false,
        message: 'Không thể tải danh sách tin đăng từ cơ sở dữ liệu.',
      });
    }
  },

  // POST /api/tin-dang
  async create(req, res) {
    try {
      const { MaPhong, MaND, TieuDe, MoTa, NgayHetHan, TrangThai } = req.body;
      const currentMaND = req.user?.MaND || MaND;

      if (!MaPhong || !TieuDe) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng chọn phòng và nhập tiêu đề bài đăng.',
        });
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

      // Nếu không phải Chủ trọ / Admin thì kiểm tra phòng có thuộc khu trọ mình quản lý không
      const isChuTro = nguoiDung.Quyen === 'ChuTro' || nguoiDung.Quyen === 'Admin';
      if (!isChuTro) {
        const isAllowed = await TinDangModel.checkPhongThuocQuanLy(
          Number(MaPhong),
          nguoiDung.MaND
        );
        if (!isAllowed) {
          return res.status(403).json({
            success: false,
            message: 'Bạn chỉ được phép đăng tin ở cơ sở mình quản lý.',
          });
        }
      }

      const insertId = await TinDangModel.createTinDang({
        MaPhong,
        MaND: nguoiDung.MaND,
        TieuDe,
        MoTa,
        NgayHetHan,
        TrangThai,
      });

      return res.status(201).json({
        success: true,
        message: 'Đăng tin mới thành công.',
        data: { MaTin: insertId },
      });
    } catch (error) {
      console.error('❌ Lỗi tạo tin đăng:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi tạo tin đăng mới.',
      });
    }
  },

  // PUT /api/tin-dang/:maTin
  async update(req, res) {
    try {
      const { maTin } = req.params;
      const { MaPhong, TieuDe, MoTa, NgayHetHan, TrangThai } = req.body;

      const updated = await TinDangModel.updateTinDang(Number(maTin), {
        MaPhong,
        TieuDe,
        MoTa,
        NgayHetHan,
        TrangThai,
      });

      if (!updated) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy tin đăng cần chỉnh sửa.',
        });
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

  // DELETE /api/tin-dang/:maTin
  async remove(req, res) {
    try {
      const { maTin } = req.params;
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