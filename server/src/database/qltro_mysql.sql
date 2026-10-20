-- ============================================================================
-- CƠ SỞ DỮ LIỆU: qltro (Dành cho MySQL 8.0+)
-- Hệ thống Quản lý Nhà trọ
-- ============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE DATABASE IF NOT EXISTS `qltro`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `qltro`;

-- ----------------------------------------------------------------------------
-- 1. Bảng NguoiDung
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `NguoiDung`;
CREATE TABLE `NguoiDung` (
  `MaND` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `HoTen` VARCHAR(100) NOT NULL,
  `CCCD` VARCHAR(20) DEFAULT NULL UNIQUE,
  `NamSinh` YEAR DEFAULT NULL,
  `SDT` VARCHAR(15) NOT NULL UNIQUE,
  `Email` VARCHAR(100) DEFAULT NULL UNIQUE,
  `DiaChi` VARCHAR(255) DEFAULT NULL,
  `TenTK` VARCHAR(50) NOT NULL UNIQUE,
  `MatKhau` VARCHAR(255) NOT NULL,
  `Quyen` VARCHAR(30) NOT NULL DEFAULT 'KhachThue' COMMENT 'ChuTro, KhachThue, Admin',
  PRIMARY KEY (`MaND`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 2. Bảng TienIch
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `TienIch`;
CREATE TABLE `TienIch` (
  `MaTI` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `TenTI` VARCHAR(100) NOT NULL,
  `MoTa` TEXT DEFAULT NULL,
  PRIMARY KEY (`MaTI`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 3. Bảng GiaDienNuoc
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `GiaDienNuoc`;
CREATE TABLE `GiaDienNuoc` (
  `MaGia` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `GiaDien` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `GiaNuoc` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `NgayApDung` DATE NOT NULL,
  PRIMARY KEY (`MaGia`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 4. Bảng PhuPhi
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `PhuPhi`;
CREATE TABLE `PhuPhi` (
  `MaPP` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `TenPP` VARCHAR(100) NOT NULL,
  `Gia` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `GhiChu` TEXT DEFAULT NULL,
  PRIMARY KEY (`MaPP`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 5. Bảng LoaiThongBao
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `LoaiThongBao`;
CREATE TABLE `LoaiThongBao` (
  `MaLTB` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `TenLTB` VARCHAR(100) NOT NULL,
  `MoTa` TEXT DEFAULT NULL,
  PRIMARY KEY (`MaLTB`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 6. Bảng KhuTro
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `KhuTro`;
CREATE TABLE `KhuTro` (
  `MaKhu` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `MaND` INT UNSIGNED NOT NULL,
  `TenKhu` VARCHAR(150) NOT NULL,
  `MoTa` TEXT DEFAULT NULL,
  `DiaChi` VARCHAR(255) NOT NULL,
  PRIMARY KEY (`MaKhu`),
  KEY `idx_khutro_mand` (`MaND`),
  CONSTRAINT `fk_khutro_nguoidung` FOREIGN KEY (`MaND`) REFERENCES `NguoiDung` (`MaND`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 7. Bảng Phong
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `Phong`;
CREATE TABLE `Phong` (
  `MaPhong` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `MaKhu` INT UNSIGNED NOT NULL,
  `TenPhong` VARCHAR(50) NOT NULL,
  `DienTich` DECIMAL(8, 2) NOT NULL DEFAULT 0.00,
  `Gia` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `TrangThai` VARCHAR(30) NOT NULL DEFAULT 'Trong' COMMENT 'Trong, DangThue, BaoTri',
  PRIMARY KEY (`MaPhong`),
  KEY `idx_phong_makhu` (`MaKhu`),
  CONSTRAINT `fk_phong_khutro` FOREIGN KEY (`MaKhu`) REFERENCES `KhuTro` (`MaKhu`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 8. Bảng TheRaVao
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `TheRaVao`;
CREATE TABLE `TheRaVao` (
  `MaThe` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `MaND` INT UNSIGNED NOT NULL,
  `GiaTri` VARCHAR(100) NOT NULL UNIQUE COMMENT 'Mã UID/RFID của thẻ từ',
  `NgayTao` DATE NOT NULL DEFAULT (CURRENT_DATE),
  `TrangThai` VARCHAR(30) NOT NULL DEFAULT 'HoatDong' COMMENT 'HoatDong, BiKhoa, ThuHoi',
  `GhiChu` TEXT DEFAULT NULL,
  PRIMARY KEY (`MaThe`),
  KEY `idx_theravao_mand` (`MaND`),
  CONSTRAINT `fk_theravao_nguoidung` FOREIGN KEY (`MaND`) REFERENCES `NguoiDung` (`MaND`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 9. Bảng ThongTinThanhToan
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `ThongTinThanhToan`;
CREATE TABLE `ThongTinThanhToan` (
  `MaTT` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `MaND` INT UNSIGNED NOT NULL,
  `TenNganHang` VARCHAR(100) NOT NULL,
  `STK` VARCHAR(50) NOT NULL,
  `ChuTaiKhoan` VARCHAR(100) NOT NULL,
  PRIMARY KEY (`MaTT`),
  KEY `idx_tttt_mand` (`MaND`),
  CONSTRAINT `fk_tttt_nguoidung` FOREIGN KEY (`MaND`) REFERENCES `NguoiDung` (`MaND`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 10. Bảng AnhPhong
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `AnhPhong`;
CREATE TABLE `AnhPhong` (
  `MaAnh` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `MaPhong` INT UNSIGNED NOT NULL,
  `DuongDan` VARCHAR(500) NOT NULL,
  PRIMARY KEY (`MaAnh`),
  KEY `idx_anhphong_maphong` (`MaPhong`),
  CONSTRAINT `fk_anhphong_phong` FOREIGN KEY (`MaPhong`) REFERENCES `Phong` (`MaPhong`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 11. Bảng HopDongThue
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `HopDongThue`;
CREATE TABLE `HopDongThue` (
  `MaHDT` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `MaPhong` INT UNSIGNED NOT NULL,
  `MaHDTCu` INT UNSIGNED DEFAULT NULL,
  `NgayBD` DATE NOT NULL,
  `NgayKT` DATE NOT NULL,
  `NgayKy` DATE NOT NULL,
  `TienCoc` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `TrangThai` VARCHAR(30) NOT NULL DEFAULT 'ConHieuLuc' COMMENT 'ConHieuLuc, HetHan, DaHuy',
  PRIMARY KEY (`MaHDT`),
  KEY `idx_hdt_maphong` (`MaPhong`),
  KEY `idx_hdt_mahdtcu` (`MaHDTCu`),
  CONSTRAINT `fk_hdt_phong` FOREIGN KEY (`MaPhong`) REFERENCES `Phong` (`MaPhong`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_hdt_hdtcu` FOREIGN KEY (`MaHDTCu`) REFERENCES `HopDongThue` (`MaHDT`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 12. Bảng ChiSoDienNuoc
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `ChiSoDienNuoc`;
CREATE TABLE `ChiSoDienNuoc` (
  `MaCS` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `MaPhong` INT UNSIGNED NOT NULL,
  `SoDienCu` INT UNSIGNED NOT NULL DEFAULT 0,
  `SoDienMoi` INT UNSIGNED NOT NULL DEFAULT 0,
  `SoNuocCu` INT UNSIGNED NOT NULL DEFAULT 0,
  `SoNuocMoi` INT UNSIGNED NOT NULL DEFAULT 0,
  `NgayGhi` DATE NOT NULL,
  PRIMARY KEY (`MaCS`),
  KEY `idx_csdn_maphong` (`MaPhong`),
  CONSTRAINT `fk_csdn_phong` FOREIGN KEY (`MaPhong`) REFERENCES `Phong` (`MaPhong`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 13. Bảng HoaDon
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `HoaDon`;
CREATE TABLE `HoaDon` (
  `MaHD` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `MaCS` INT UNSIGNED NOT NULL,
  `MaPhong` INT UNSIGNED NOT NULL,
  `MaGia` INT UNSIGNED NOT NULL,
  `TienPhong` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `TienDien` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `TienNuoc` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `TienPhuPhi` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `TienPhatSinh` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `TongTien` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `TienDaTra` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `NgayTinh` DATE NOT NULL,
  PRIMARY KEY (`MaHD`),
  KEY `idx_hoadon_macs` (`MaCS`),
  KEY `idx_hoadon_maphong` (`MaPhong`),
  KEY `idx_hoadon_magia` (`MaGia`),
  CONSTRAINT `fk_hoadon_csdn` FOREIGN KEY (`MaCS`) REFERENCES `ChiSoDienNuoc` (`MaCS`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_hoadon_phong` FOREIGN KEY (`MaPhong`) REFERENCES `Phong` (`MaPhong`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_hoadon_gia` FOREIGN KEY (`MaGia`) REFERENCES `GiaDienNuoc` (`MaGia`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 14. Bảng PhatSinh
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `PhatSinh`;
CREATE TABLE `PhatSinh` (
  `MaPS` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `MaHD` INT UNSIGNED NOT NULL,
  `TenPS` VARCHAR(150) NOT NULL,
  `Gia` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `GhiChu` TEXT DEFAULT NULL,
  PRIMARY KEY (`MaPS`),
  KEY `idx_phatsinh_mahd` (`MaHD`),
  CONSTRAINT `fk_phatsinh_hoadon` FOREIGN KEY (`MaHD`) REFERENCES `HoaDon` (`MaHD`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 15. Bảng ThanhToan
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `ThanhToan`;
CREATE TABLE `ThanhToan` (
  `MaTT` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `MaHD` INT UNSIGNED NOT NULL,
  `NgayTT` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `SoTien` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `PhuongThuc` VARCHAR(50) NOT NULL DEFAULT 'ChuyenKhoan' COMMENT 'TienMat, ChuyenKhoan, ViDienTu',
  `MinhChung` VARCHAR(500) DEFAULT NULL COMMENT 'Đường dẫn ảnh biên lai giao dịch',
  `GhiChu` TEXT DEFAULT NULL,
  `TrangThai` VARCHAR(30) NOT NULL DEFAULT 'ChoXacNhan' COMMENT 'ChoXacNhan, DaXacNhan, TuChoi',
  PRIMARY KEY (`MaTT`),
  KEY `idx_thanhtoan_mahd` (`MaHD`),
  CONSTRAINT `fk_thanhtoan_hoadon` FOREIGN KEY (`MaHD`) REFERENCES `HoaDon` (`MaHD`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 16. Bảng ThongBao
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `ThongBao`;
CREATE TABLE `ThongBao` (
  `MaTB` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `MaTBGoc` INT UNSIGNED DEFAULT NULL,
  `NDGui` INT UNSIGNED NOT NULL,
  `MaLTB` INT UNSIGNED NOT NULL,
  `TieuDe` VARCHAR(200) NOT NULL,
  `NoiDung` TEXT NOT NULL,
  `NgayGui` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `TrangThai` VARCHAR(30) NOT NULL DEFAULT 'ChuaDoc' COMMENT 'ChuaDoc, DaDoc',
  PRIMARY KEY (`MaTB`),
  KEY `idx_thongbao_matbgoc` (`MaTBGoc`),
  KEY `idx_thongbao_ndgui` (`NDGui`),
  KEY `idx_thongbao_maltb` (`MaLTB`),
  CONSTRAINT `fk_thongbao_tbgoc` FOREIGN KEY (`MaTBGoc`) REFERENCES `ThongBao` (`MaTB`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_thongbao_nguoigui` FOREIGN KEY (`NDGui`) REFERENCES `NguoiDung` (`MaND`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_thongbao_loaithongbao` FOREIGN KEY (`MaLTB`) REFERENCES `LoaiThongBao` (`MaLTB`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 17. Bảng TinDang
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `TinDang`;
CREATE TABLE `TinDang` (
  `MaTin` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `MaPhong` INT UNSIGNED NOT NULL,
  `MaND` INT UNSIGNED NOT NULL,
  `TieuDe` VARCHAR(200) NOT NULL,
  `MoTa` TEXT DEFAULT NULL,
  `NgayDang` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `NgayHetHan` DATE DEFAULT NULL,
  `TrangThai` VARCHAR(30) NOT NULL DEFAULT 'DangHienThi' COMMENT 'DangHienThi, DaAn, HetHan',
  PRIMARY KEY (`MaTin`),
  KEY `idx_tindang_maphong` (`MaPhong`),
  KEY `idx_tindang_mand` (`MaND`),
  CONSTRAINT `fk_tindang_phong` FOREIGN KEY (`MaPhong`) REFERENCES `Phong` (`MaPhong`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_tindang_nguoidung` FOREIGN KEY (`MaND`) REFERENCES `NguoiDung` (`MaND`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 18. Bảng ChiTietHopDongThue
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `ChiTietHopDongThue`;
CREATE TABLE `ChiTietHopDongThue` (
  `MaND` INT UNSIGNED NOT NULL,
  `MaHDT` INT UNSIGNED NOT NULL,
  `NgayDi` DATE DEFAULT NULL,
  `NgayVao` DATE NOT NULL,
  `VaiTro` VARCHAR(50) NOT NULL DEFAULT 'ThanhVien' COMMENT 'DaiDien, ThanhVien',
  `TamTru` VARCHAR(50) NOT NULL DEFAULT 'ChuaDangKy' COMMENT 'DaDangKy, ChuaDangKy, DangCho',
  PRIMARY KEY (`MaND`, `MaHDT`),
  KEY `idx_cthdt_mahdt` (`MaHDT`),
  CONSTRAINT `fk_cthdt_nguoidung` FOREIGN KEY (`MaND`) REFERENCES `NguoiDung` (`MaND`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_cthdt_hopdongthue` FOREIGN KEY (`MaHDT`) REFERENCES `HopDongThue` (`MaHDT`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 19. Bảng LichSuThe
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `LichSuThe`;
CREATE TABLE `LichSuThe` (
  `MaLS` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `MaThe` INT UNSIGNED NOT NULL,
  `NgayQuetThe` DATE NOT NULL,
  `GioQuetThe` TIME NOT NULL,
  PRIMARY KEY (`MaLS`),
  KEY `idx_lichsuthe_mathe` (`MaThe`),
  CONSTRAINT `fk_lichsuthe_theravao` FOREIGN KEY (`MaThe`) REFERENCES `TheRaVao` (`MaThe`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 20. Bảng ChiTietPhuPhi
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `ChiTietPhuPhi`;
CREATE TABLE `ChiTietPhuPhi` (
  `MaPP` INT UNSIGNED NOT NULL,
  `MaHDT` INT UNSIGNED NOT NULL,
  PRIMARY KEY (`MaPP`, `MaHDT`),
  KEY `idx_ctpp_mahdt` (`MaHDT`),
  CONSTRAINT `fk_ctpp_phuphi` FOREIGN KEY (`MaPP`) REFERENCES `PhuPhi` (`MaPP`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_ctpp_hopdongthue` FOREIGN KEY (`MaHDT`) REFERENCES `HopDongThue` (`MaHDT`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 21. Bảng ChiTietTienIch
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `ChiTietTienIch`;
CREATE TABLE `ChiTietTienIch` (
  `MaPhong` INT UNSIGNED NOT NULL,
  `MaTI` INT UNSIGNED NOT NULL,
  PRIMARY KEY (`MaPhong`, `MaTI`),
  KEY `idx_ctti_mati` (`MaTI`),
  CONSTRAINT `fk_ctti_phong` FOREIGN KEY (`MaPhong`) REFERENCES `Phong` (`MaPhong`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_ctti_tienich` FOREIGN KEY (`MaTI`) REFERENCES `TienIch` (`MaTI`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 22. Bảng NhanThongBao
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `NhanThongBao`;
CREATE TABLE `NhanThongBao` (
  `MaTB` INT UNSIGNED NOT NULL,
  `NDNhan` INT UNSIGNED NOT NULL,
  PRIMARY KEY (`MaTB`, `NDNhan`),
  KEY `idx_ntb_ndnhan` (`NDNhan`),
  CONSTRAINT `fk_ntb_thongbao` FOREIGN KEY (`MaTB`) REFERENCES `ThongBao` (`MaTB`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_ntb_nguoinhan` FOREIGN KEY (`NDNhan`) REFERENCES `NguoiDung` (`MaND`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
