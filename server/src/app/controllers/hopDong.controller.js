// C:\Users\nhat nguyen\Desktop\LVTN\server\src\app\controllers\hopDong.controller.js
const HopDongModel = require('../models/hopDong.model');
const ChiTietHopDongModel = require('../models/chiTietHopDong.model');

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

// [BẢO MẬT]: Chỉ lấy MaND từ JWT đã xác thực (req.user) cho các tác vụ nhạy cảm
function extractVerifiedMaND(req) {
  const rawId = req.user?.maND ?? req.user?.MaND ?? req.user?.id ?? null;
  const parsed = Number(rawId);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

// Hàm làm sạch chuỗi đầu vào (chống XSS trong nội dung thông báo)
function sanitizeText(str = '', maxLength = 1000) {
  return String(str)
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, maxLength);
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
  // 1. Cập nhật lại hàm: GET /api/hop-dong/chi-tiet/:maHDT (Cho phép Khách thuê xem HĐ của chính mình)
  xemChiTietHopDong: async (req, res) => {
    try {
      const maHDT = Number(req.params.maHDT);
      const currentMaND = extractVerifiedMaND(req);

      if (!Number.isInteger(maHDT) || maHDT <= 0) {
        return res.status(400).json({
          thanhCong: false,
          thongBao: 'Mã hợp đồng không hợp lệ.',
        });
      }

      if (!currentMaND) {
        return res.status(401).json({
          thanhCong: false,
          thongBao: 'Vui lòng đăng nhập để xem hợp đồng.',
        });
      }

      const nguoiDung = await HopDongModel.getNguoiDungById(currentMaND);
      if (!nguoiDung) {
        return res.status(403).json({
          thanhCong: false,
          thongBao: 'Tài khoản người dùng không hợp lệ.',
        });
      }

      // Kiểm tra phân quyền chặt chẽ theo từng vai trò (Chống IDOR)
      if (nguoiDung.Quyen === 'KhachThue') {
        const ownsContract = await HopDongModel.checkHopDongThuocKhachThue(
          maHDT,
          nguoiDung.MaND
        );
        if (!ownsContract) {
          return res.status(403).json({
            thanhCong: false,
            thongBao: 'Bảo mật: Bạn chỉ được phép xem hợp đồng thuê phòng của riêng mình!',
          });
        }
      } else if (nguoiDung.Quyen === 'QuanLy') {
        const ownsHopDong = await HopDongModel.checkHopDongThuocQuanLy(
          maHDT,
          nguoiDung.MaND
        );
        if (!ownsHopDong) {
          return res.status(403).json({
            thanhCong: false,
            thongBao: 'Bạn chỉ được phép xem hợp đồng thuộc khu trọ mình quản lý.',
          });
        }
      } else if (nguoiDung.Quyen !== 'ChuTro') {
        return res.status(403).json({
          thanhCong: false,
          thongBao: 'Bạn không có quyền xem chi tiết hợp đồng.',
        });
      }

      const chiTiet = await HopDongModel.getChiTietHopDongById(maHDT);
      if (!chiTiet) {
        return res.status(404).json({
          thanhCong: false,
          thongBao: 'Không tìm thấy hợp đồng.',
        });
      }

      if (!chiTiet.DanhSachThanhVien) {
        chiTiet.DanhSachThanhVien = await ChiTietHopDongModel.getThanhVienByMaHDT(maHDT);
      }
      if (!chiTiet.ThanhVienCungPhong && chiTiet.MaPhong) {
        chiTiet.ThanhVienCungPhong = await ChiTietHopDongModel.getThanhVienCungPhong(
          Number(chiTiet.MaPhong)
        );
      }

      // Nếu là Khách thuê, đính kèm trạng thái đã gửi yêu cầu hủy hay chưa
      if (nguoiDung.Quyen === 'KhachThue') {
        const yeuCauHuy = await HopDongModel.checkDaGuiYeuCauHuy(maHDT, nguoiDung.MaND);
        chiTiet.DaGuiYeuCauHuy = Boolean(yeuCauHuy);
        chiTiet.ThoiGianGuiYeuCauHuy = yeuCauHuy?.NgayGui || null;
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
      });
    }
  },

  // 2. [MỚI] GET /api/hop-dong/cua-toi (Lấy danh sách hợp đồng của riêng người thuê)
  layDanhSachHopDongCuaToi: async (req, res) => {
    try {
      const currentMaND = extractVerifiedMaND(req);
      if (!currentMaND) {
        return res.status(401).json({
          thanhCong: false,
          thongBao: 'Không xác định được phiên đăng nhập. Vui lòng đăng nhập lại.',
        });
      }

      const nguoiDung = await HopDongModel.getNguoiDungById(currentMaND);
      if (!nguoiDung) {
        return res.status(403).json({
          thanhCong: false,
          thongBao: 'Tài khoản không tồn tại hoặc đã bị khóa.',
        });
      }

      const { trangThai = '', tuKhoa = '' } = req.query;
      const danhSach = await HopDongModel.getDanhSachHopDongCuaToi(nguoiDung.MaND, {
        trangThai: sanitizeText(trangThai, 30),
        tuKhoa: sanitizeText(tuKhoa, 100),
      });

      return res.status(200).json({
        thanhCong: true,
        thongBao: 'Tải danh sách hợp đồng cá nhân thành công.',
        duLieu: danhSach,
      });
    } catch (error) {
      console.error('Lỗi layDanhSachHopDongCuaToi:', error);
      return res.status(500).json({
        thanhCong: false,
        thongBao: 'Lỗi máy chủ khi tải hợp đồng của bạn.',
      });
    }
  },

  // 3. [MỚI] POST /api/hop-dong/cua-toi/:maHDT/yeu-cau-huy (Gửi yêu cầu hủy HĐ qua Thông báo)
  yeuCauHuyHopDong: async (req, res) => {
    try {
      const maHDT = Number(req.params.maHDT);
      const currentMaND = extractVerifiedMaND(req);

      if (!Number.isInteger(maHDT) || maHDT <= 0) {
        return res.status(400).json({
          thanhCong: false,
          thongBao: 'Mã hợp đồng không hợp lệ.',
        });
      }

      if (!currentMaND) {
        return res.status(401).json({
          thanhCong: false,
          thongBao: 'Vui lòng đăng nhập để thực hiện thao tác này.',
        });
      }

      // 1. Kiểm tra quyền sở hữu hợp đồng (Chống gửi yêu cầu hủy hợp đồng của phòng khác)
      const hopDongCuaToi = await HopDongModel.checkHopDongThuocKhachThue(
        maHDT,
        currentMaND
      );
      if (!hopDongCuaToi) {
        return res.status(403).json({
          thanhCong: false,
          thongBao: 'Bảo mật: Bạn không có tên trong hợp đồng này nên không thể yêu cầu hủy!',
        });
      }

      // 2. Chỉ hợp đồng đang còn hiệu lực mới được yêu cầu hủy
      if (hopDongCuaToi.TrangThaiHopDong !== 'ConHieuLuc') {
        return res.status(400).json({
          thanhCong: false,
          thongBao: 'Chỉ có thể gửi yêu cầu hủy đối với hợp đồng đang còn hiệu lực.',
        });
      }

      // 3. Kiểm tra xem đã gửi yêu cầu hủy trước đó chưa (Chống spam thông báo)
      const daGui = await HopDongModel.checkDaGuiYeuCauHuy(maHDT, currentMaND);
      if (daGui) {
        return res.status(409).json({
          thanhCong: false,
          thongBao: 'Bạn đã gửi yêu cầu hủy cho hợp đồng này rồi. Vui lòng chờ Quản lý/Chủ trọ phản hồi trong mục Thông báo.',
        });
      }

      // 4. Validate dữ liệu đầu vào
      const lyDoHuy = sanitizeText(req.body?.lyDoHuy, 1000);
      const ngayDuKienTraPhong = sanitizeText(req.body?.ngayDuKienTraPhong, 20);
      const sdtLienHe = sanitizeText(req.body?.sdtLienHe, 15);
      const ghiChuThem = sanitizeText(req.body?.ghiChuThem, 500);

      if (!lyDoHuy || lyDoHuy.length < 10) {
        return res.status(400).json({
          thanhCong: false,
          thongBao: 'Vui lòng nhập lý do hủy hợp đồng rõ ràng (tối thiểu 10 ký tự).',
        });
      }

      if (!ngayDuKienTraPhong || Number.isNaN(Date.parse(ngayDuKienTraPhong))) {
        return res.status(400).json({
          thanhCong: false,
          thongBao: 'Vui lòng chọn ngày dự kiến trả phòng hợp lệ.',
        });
      }

      // 5. Tìm danh sách Quản lý khu trọ & Chủ trọ quản lý hợp đồng đó
      const {
        dsNguoiNhan,
        maLTB,
        tenPhong,
        tenKhu,
        tenNguoiGui,
        sdtNguoiGui,
      } = await HopDongModel.getNguoiNhanYeuCauHuyHopDong(maHDT, currentMaND);

      if (!dsNguoiNhan || dsNguoiNhan.length === 0) {
        return res.status(404).json({
          thanhCong: false,
          thongBao: 'Không tìm thấy Quản lý hoặc Chủ trọ phụ trách hợp đồng này.',
        });
      }

      const vaiTroLabel =
        hopDongCuaToi.VaiTro === 'DaiDien' ? 'Người đại diện hợp đồng' : 'Thành viên cùng phòng';
      const ngayTraFormatted = new Date(ngayDuKienTraPhong).toLocaleDateString('vi-VN');
      const soDienThoai = sdtLienHe || sdtNguoiGui || 'Chưa cập nhật';

      const tieuDe = `[Yêu cầu hủy HĐ #${maHDT}] Phòng ${tenPhong} - ${tenKhu}`;
      const noiDung = [
        `Kính gửi Ban quản lý và Chủ trọ,`,
        `Khách thuê ${tenNguoiGui} (${vaiTroLabel}) vừa gửi yêu cầu chấm dứt/hủy hợp đồng thuê phòng với thông tin chi tiết:`,
        `• Mã hợp đồng: #${maHDT}`,
        `• Phòng / Khu trọ: Phòng ${tenPhong} - ${tenKhu}`,
        `• Ngày dự kiến bàn giao & trả phòng: ${ngayTraFormatted}`,
        `• Số điện thoại liên hệ: ${soDienThoai}`,
        `• Lý do xin hủy hợp đồng: ${lyDoHuy}`,
        ghiChuThem ? `• Đề xuất / Ghi chú bàn giao: ${ghiChuThem}` : null,
        `Vui lòng phản hồi trực tiếp tại luồng thông báo này để xác nhận lịch kiểm tra phòng và tất toán hợp đồng.`,
      ]
        .filter(Boolean)
        .join('\n');

      // 6. Tạo thông báo vào bảng ThongBao + NhanThongBao và bắn Socket Realtime
      const thongBaoMoi = await ThongBaoModel.createThongBao({
        ndGui: currentMaND,
        maLTB,
        tieuDe,
        noiDung,
        maTBGoc: null,
        dsNguoiNhan,
      });

      emitThongBaoMoi(dsNguoiNhan, thongBaoMoi);

      return res.status(201).json({
        thanhCong: true,
        thongBao: 'Đã gửi yêu cầu hủy hợp đồng tới Quản lý và Chủ trọ thành công!',
        duLieu: {
          maTB: thongBaoMoi?.MaTB,
          soNguoiNhan: dsNguoiNhan.length,
          thongBao: thongBaoMoi,
        },
      });
    } catch (error) {
      console.error('Lỗi yeuCauHuyHopDong:', error);
      return res.status(500).json({
        thanhCong: false,
        thongBao: 'Lỗi máy chủ khi gửi yêu cầu hủy hợp đồng.',
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
          thongBao:
            'Vui lòng nhập đầy đủ phòng, ngày ký, ngày bắt đầu và ngày kết thúc',
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
            thongBao:
              'Bạn chỉ được phép tạo hợp đồng cho phòng thuộc khu trọ mình quản lý.',
          });
        }
      }

      const danhSachTVHopLe = ChiTietHopDongModel.filterUniqueMembers(
        Array.isArray(DanhSachThanhVien) ? DanhSachThanhVien : []
      );

      if (danhSachTVHopLe.length === 0) {
        return res.status(400).json({
          thanhCong: false,
          thongBao: 'Hợp đồng phải có ít nhất 1 khách thuê',
        });
      }

      if (KieuHopDong !== 'TachHopDongRieng') {
        const coDaiDien = danhSachTVHopLe.some((tv) => tv.VaiTro === 'DaiDien');
        if (!coDaiDien) {
          danhSachTVHopLe[0].VaiTro = 'DaiDien';
        }
      }

      const payload = {
        ...req.body,
        DanhSachThanhVien: danhSachTVHopLe,
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

      const danhSachTVHopLe = ChiTietHopDongModel.filterUniqueMembers(
        Array.isArray(DanhSachThanhVien) ? DanhSachThanhVien : []
      );

      if (danhSachTVHopLe.length === 0) {
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
            thongBao:
              'Bạn chỉ được phép chỉnh sửa hợp đồng thuộc khu trọ mình quản lý.',
          });
        }
      }

      const payload = {
        ...req.body,
        DanhSachThanhVien: danhSachTVHopLe,
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