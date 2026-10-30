// C:\Users\nhat nguyen\Desktop\LVTN\server\src\app\controllers\hopDong.controller.js
const HopDongModel = require('../models/hopDong.model');

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

const HopDongController = {
  // GET /api/hop-dong/danh-sach & /api/hop-dong/tim-kiem
  layDanhSachHopDong: async (req, res) => {
    try {
      const currentMaND = extractCurrentMaND(req);
      if (!currentMaND) {
        return res.status(401).json({
          thanhCong: false,
          thongBao: 'Không xác định được tài khoản đang đăng nhập.',
        });
      }

      const nguoiDung = await HopDongModel.getNguoiDungById(Number(currentMaND));
      if (!nguoiDung) {
        return res.status(403).json({
          thanhCong: false,
          thongBao: 'Tài khoản người dùng không tồn tại hoặc không hợp lệ.',
        });
      }

      if (nguoiDung.Quyen !== 'ChuTro' && nguoiDung.Quyen !== 'QuanLy') {
        return res.status(403).json({
          thanhCong: false,
          thongBao: 'Bạn không có quyền truy cập trang quản lý hợp đồng.',
        });
      }

      const { tuKhoa, trangThai, maKhu, maPhong } = req.query;
      const danhSach = await HopDongModel.getDanhSachHopDong({
        tuKhoa,
        trangThai,
        maKhu,
        maPhong,
        maND: nguoiDung.MaND,
        quyen: nguoiDung.Quyen,
      });

      return res.status(200).json({
        thanhCong: true,
        thongBao: 'Lấy danh sách hợp đồng thành công',
        duLieu: danhSach,
        userRole: nguoiDung.Quyen,
      });
    } catch (error) {
      console.error('Lỗi layDanhSachHopDong:', error);
      return res.status(500).json({
        thanhCong: false,
        thongBao: 'Lỗi máy chủ khi lấy danh sách hợp đồng',
        loi: error.message,
      });
    }
  },

  // GET /api/hop-dong/du-lieu-tao-moi
  layDuLieuTaoMoi: async (req, res) => {
    try {
      const currentMaND = extractCurrentMaND(req);
      if (!currentMaND) {
        return res.status(401).json({
          thanhCong: false,
          thongBao: 'Không xác định được tài khoản đang đăng nhập.',
        });
      }

      const nguoiDung = await HopDongModel.getNguoiDungById(Number(currentMaND));
      if (!nguoiDung) {
        return res.status(403).json({
          thanhCong: false,
          thongBao: 'Tài khoản người dùng không tồn tại hoặc không hợp lệ.',
        });
      }

      if (nguoiDung.Quyen !== 'ChuTro' && nguoiDung.Quyen !== 'QuanLy') {
        return res.status(403).json({
          thanhCong: false,
          thongBao: 'Bạn không có quyền thực hiện thao tác này.',
        });
      }

      const duLieu = await HopDongModel.getDuLieuTaoMoi(
        nguoiDung.MaND,
        nguoiDung.Quyen
      );

      return res.status(200).json({
        thanhCong: true,
        duLieu,
      });
    } catch (error) {
      console.error('Lỗi layDuLieuTaoMoi:', error);
      return res.status(500).json({
        thanhCong: false,
        thongBao: 'Không thể tải dữ liệu khởi tạo hợp đồng',
        loi: error.message,
      });
    }
  },

  // GET /api/hop-dong/chi-tiet/:maHDT
  xemChiTietHopDong: async (req, res) => {
    try {
      const { maHDT } = req.params;
      const currentMaND = extractCurrentMaND(req);

      if (!currentMaND) {
        return res.status(401).json({
          thanhCong: false,
          thongBao: 'Không xác định được tài khoản đang đăng nhập.',
        });
      }

      const nguoiDung = await HopDongModel.getNguoiDungById(Number(currentMaND));
      if (!nguoiDung) {
        return res.status(403).json({
          thanhCong: false,
          thongBao: 'Tài khoản người dùng không hợp lệ.',
        });
      }

      if (nguoiDung.Quyen !== 'ChuTro' && nguoiDung.Quyen !== 'QuanLy') {
        return res.status(403).json({
          thanhCong: false,
          thongBao: 'Bạn không có quyền xem chi tiết hợp đồng.',
        });
      }

      const chiTiet = await HopDongModel.getChiTietHopDongById(Number(maHDT));
      if (!chiTiet) {
        return res.status(404).json({
          thanhCong: false,
          thongBao: 'Không tìm thấy hợp đồng',
        });
      }

      // Nếu là Quản lý thì chỉ được xem hợp đồng thuộc cơ sở mình quản lý
      if (nguoiDung.Quyen !== 'ChuTro') {
        const ownsHopDong = await HopDongModel.checkHopDongThuocQuanLy(
          Number(maHDT),
          nguoiDung.MaND
        );
        if (!ownsHopDong) {
          return res.status(403).json({
            thanhCong: false,
            thongBao: 'Bạn chỉ được phép xem hợp đồng thuộc khu trọ mình quản lý.',
          });
        }
      }

      return res.status(200).json({
        thanhCong: true,
        duLieu: chiTiet,
      });
    } catch (error) {
      console.error('Lỗi xemChiTietHopDong:', error);
      return res.status(500).json({
        thanhCong: false,
        thongBao: 'Lỗi máy chủ khi lấy chi tiết hợp đồng',
        loi: error.message,
      });
    }
  },

  // POST /api/hop-dong/tao-moi
  taoHopDong: async (req, res) => {
    try {
      const {
        MaPhong,
        NgayBD,
        NgayKT,
        NgayKy,
        DanhSachThanhVien,
        KieuHopDong,
      } = req.body;
      const currentMaND = extractCurrentMaND(req);

      if (!currentMaND) {
        return res.status(401).json({
          thanhCong: false,
          thongBao: 'Không xác định được người dùng thực hiện.',
        });
      }

      const nguoiDung = await HopDongModel.getNguoiDungById(Number(currentMaND));
      if (!nguoiDung) {
        return res.status(403).json({
          thanhCong: false,
          thongBao: 'Tài khoản người dùng không hợp lệ.',
        });
      }

      if (nguoiDung.Quyen !== 'ChuTro' && nguoiDung.Quyen !== 'QuanLy') {
        return res.status(403).json({
          thanhCong: false,
          thongBao: 'Bạn không có quyền tạo hợp đồng.',
        });
      }

      if (!MaPhong || !NgayBD || !NgayKT || !NgayKy) {
        return res.status(400).json({
          thanhCong: false,
          thongBao: 'Vui lòng nhập đầy đủ phòng, ngày ký, ngày bắt đầu và ngày kết thúc',
        });
      }

      // Chỉ ChuTro mới được tạo hợp đồng ở mọi cơ sở; QuanLy chỉ được tạo ở cơ sở mình quản lý
      if (nguoiDung.Quyen !== 'ChuTro') {
        const isAllowed = await HopDongModel.checkPhongThuocQuanLy(
          Number(MaPhong),
          nguoiDung.MaND
        );
        if (!isAllowed) {
          return res.status(403).json({
            thanhCong: false,
            thongBao: 'Bạn chỉ được phép tạo hợp đồng cho phòng thuộc khu trọ mình quản lý.',
          });
        }
      }

      if (!Array.isArray(DanhSachThanhVien) || DanhSachThanhVien.length === 0) {
        return res.status(400).json({
          thanhCong: false,
          thongBao: 'Hợp đồng phải có ít nhất 1 khách thuê',
        });
      }

      if (KieuHopDong !== 'TachHopDongRieng') {
        const coDaiDien = DanhSachThanhVien.some((tv) => tv.VaiTro === 'DaiDien');
        if (!coDaiDien) {
          DanhSachThanhVien[0].VaiTro = 'DaiDien';
        }
      }

      const payload = {
        ...req.body,
        DanhSachMaPDV:
          req.body.DanhSachMaPDV ||
          req.body.DanhSachMaDV ||
          req.body.DanhSachPhiDichVu ||
          [],
      };

      const danhSachMaHDT = await HopDongModel.createHopDong(payload);
      return res.status(201).json({
        thanhCong: true,
        thongBao:
          KieuHopDong === 'TachHopDongRieng'
            ? `Đã tạo thành công ${danhSachMaHDT.length} bản hợp đồng riêng biệt cho các thành viên cùng phòng`
            : 'Tạo hợp đồng thuê phòng thành công',
        duLieu: { danhSachMaHDT },
      });
    } catch (error) {
      console.error('Lỗi taoHopDong:', error);
      return res.status(500).json({
        thanhCong: false,
        thongBao: 'Lỗi khi tạo hợp đồng mới',
        loi: error.message,
      });
    }
  },

  // PUT /api/hop-dong/cap-nhat/:maHDT
  suaHopDong: async (req, res) => {
    try {
      const { maHDT } = req.params;
      const { MaPhong, NgayBD, NgayKT, NgayKy, DanhSachThanhVien } = req.body;
      const currentMaND = extractCurrentMaND(req);

      if (!currentMaND) {
        return res.status(401).json({
          thanhCong: false,
          thongBao: 'Không xác định được người dùng thực hiện.',
        });
      }

      const nguoiDung = await HopDongModel.getNguoiDungById(Number(currentMaND));
      if (!nguoiDung) {
        return res.status(403).json({
          thanhCong: false,
          thongBao: 'Tài khoản người dùng không hợp lệ.',
        });
      }

      if (nguoiDung.Quyen !== 'ChuTro' && nguoiDung.Quyen !== 'QuanLy') {
        return res.status(403).json({
          thanhCong: false,
          thongBao: 'Bạn không có quyền chỉnh sửa hợp đồng.',
        });
      }

      if (!MaPhong || !NgayBD || !NgayKT || !NgayKy) {
        return res.status(400).json({
          thanhCong: false,
          thongBao: 'Thông tin phòng và thời hạn hợp đồng không được để trống',
        });
      }

      if (!Array.isArray(DanhSachThanhVien) || DanhSachThanhVien.length === 0) {
        return res.status(400).json({
          thanhCong: false,
          thongBao: 'Phải có ít nhất 1 thành viên trong hợp đồng',
        });
      }

      // Kiểm tra hợp đồng có tồn tại không trước khi phân quyền
      const existingHD = await HopDongModel.getHopDongCoBanById(Number(maHDT));
      if (!existingHD) {
        return res.status(404).json({
          thanhCong: false,
          thongBao: 'Không tìm thấy hợp đồng cần chỉnh sửa.',
        });
      }

      // Nếu không phải ChuTro, kiểm tra cả hợp đồng hiện tại lẫn phòng mới phải thuộc khu trọ quản lý
      if (nguoiDung.Quyen !== 'ChuTro') {
        const [ownsHopDong, ownsPhong] = await Promise.all([
          HopDongModel.checkHopDongThuocQuanLy(Number(maHDT), nguoiDung.MaND),
          HopDongModel.checkPhongThuocQuanLy(Number(MaPhong), nguoiDung.MaND),
        ]);

        if (!ownsHopDong || !ownsPhong) {
          return res.status(403).json({
            thanhCong: false,
            thongBao: 'Bạn chỉ được phép chỉnh sửa hợp đồng thuộc khu trọ mình quản lý.',
          });
        }
      }

      const payload = {
        ...req.body,
        DanhSachMaPDV:
          req.body.DanhSachMaPDV ||
          req.body.DanhSachMaDV ||
          req.body.DanhSachPhiDichVu ||
          [],
      };

      await HopDongModel.updateHopDong(Number(maHDT), payload);
      return res.status(200).json({
        thanhCong: true,
        thongBao: 'Cập nhật hợp đồng thành công',
      });
    } catch (error) {
      console.error('Lỗi suaHopDong:', error);
      return res.status(500).json({
        thanhCong: false,
        thongBao: 'Lỗi khi cập nhật hợp đồng',
        loi: error.message,
      });
    }
  },

  // DELETE /api/hop-dong/xoa/:maHDT
  xoaHopDong: async (req, res) => {
    try {
      const { maHDT } = req.params;
      const currentMaND = extractCurrentMaND(req);

      if (!currentMaND) {
        return res.status(401).json({
          thanhCong: false,
          thongBao: 'Không xác định được người dùng thực hiện.',
        });
      }

      const nguoiDung = await HopDongModel.getNguoiDungById(Number(currentMaND));
      if (!nguoiDung) {
        return res.status(403).json({
          thanhCong: false,
          thongBao: 'Tài khoản người dùng không hợp lệ.',
        });
      }

      if (nguoiDung.Quyen !== 'ChuTro' && nguoiDung.Quyen !== 'QuanLy') {
        return res.status(403).json({
          thanhCong: false,
          thongBao: 'Bạn không có quyền xóa hợp đồng.',
        });
      }

      if (nguoiDung.Quyen !== 'ChuTro') {
        const ownsHopDong = await HopDongModel.checkHopDongThuocQuanLy(
          Number(maHDT),
          nguoiDung.MaND
        );
        if (!ownsHopDong) {
          return res.status(403).json({
            thanhCong: false,
            thongBao: 'Bạn không có quyền xóa hợp đồng của khu trọ khác.',
          });
        }
      }

      const daXoa = await HopDongModel.deleteHopDong(Number(maHDT));
      if (!daXoa) {
        return res.status(404).json({
          thanhCong: false,
          thongBao: 'Không tìm thấy hợp đồng cần xóa',
        });
      }

      return res.status(200).json({
        thanhCong: true,
        thongBao: 'Đã xóa hợp đồng thành công',
      });
    } catch (error) {
      console.error('Lỗi xoaHopDong:', error);
      return res.status(500).json({
        thanhCong: false,
        thongBao: 'Không thể xóa hợp đồng này',
        loi: error.message,
      });
    }
  },
};

module.exports = HopDongController;