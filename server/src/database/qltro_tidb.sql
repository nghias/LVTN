-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Máy chủ: 127.0.0.1:3306
-- Thời gian đã tạo: Th10 14, 2026 lúc 12:54 PM
-- Phiên bản máy phục vụ: 8.4.7
-- Phiên bản PHP: 8.3.28

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Cơ sở dữ liệu: `qltro2`
--

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `anhphong`
--

DROP TABLE IF EXISTS `anhphong`;
CREATE TABLE IF NOT EXISTS `anhphong` (
  `MaAnh` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `MaPhong` int UNSIGNED NOT NULL,
  `DuongDan` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `AnhChinh` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`MaAnh`),
  KEY `idx_anhphong_maphong` (`MaPhong`)
) ENGINE=InnoDB AUTO_INCREMENT=150002 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `anhphong`
--

INSERT INTO `anhphong` (`MaAnh`, `MaPhong`, `DuongDan`, `AnhChinh`) VALUES
(1, 1, '/uploads/phong/khu1_p101_1.jpg', 1),
(2, 1, '/uploads/phong/khu1_p101_2.jpg', 0),
(3, 2, '/uploads/phong/khu1_p102_1.jpg', 1),
(4, 3, '/uploads/phong/khu1_p103_1.jpg', 1),
(5, 4, '/uploads/phong/khu1_p104_1.jpg', 1),
(6, 5, '/uploads/phong/khu1_p105_1.jpg', 1),
(7, 6, '/uploads/phong/khu1_p106_1.jpg', 1),
(8, 7, '/uploads/phong/khu1_p107_1.jpg', 1),
(9, 8, '/uploads/phong/khu1_p108_1.jpg', 1),
(10, 9, '/uploads/phong/khu1_p109_trong_1.jpg', 1),
(11, 9, '/uploads/phong/khu1_p109_trong_2.jpg', 0),
(12, 10, '/uploads/phong/khu1_p110_1.jpg', 1),
(13, 11, '/uploads/phong/khu2_p201_1.jpg', 1),
(14, 12, '/uploads/phong/khu2_p202_1.jpg', 1),
(15, 13, '/uploads/phong/khu2_p203_1.jpg', 1),
(16, 14, '/uploads/phong/khu2_p204_1.jpg', 1),
(17, 15, '/uploads/phong/khu2_p205_1.jpg', 1),
(18, 16, '/uploads/phong/khu2_p206_1.jpg', 1),
(19, 17, '/uploads/phong/khu2_p207_1.jpg', 1),
(20, 18, '/uploads/phong/khu2_p208_1.jpg', 1),
(21, 19, '/uploads/phong/khu2_p209_trong_1.jpg', 0),
(22, 19, '/uploads/phong/khu2_p209_trong_2.jpg', 0),
(23, 20, '/uploads/phong/khu2_p210_1.jpg', 1),
(24, 21, '/uploads/phong/khu3_p301_1.jpg', 1),
(25, 22, '/uploads/phong/khu3_p302_1.jpg', 1),
(26, 23, '/uploads/phong/khu3_p303_1.jpg', 1),
(27, 24, '/uploads/phong/khu3_p304_1.jpg', 1),
(28, 25, '/uploads/phong/khu3_p305_1.jpg', 1),
(29, 26, '/uploads/phong/khu3_p306_1.jpg', 1),
(30, 27, '/uploads/phong/khu3_p307_1.jpg', 1),
(31, 28, '/uploads/phong/khu3_p308_1.jpg', 1),
(32, 29, '/uploads/phong/khu3_p309_trong_1.jpg', 1),
(33, 29, '/uploads/phong/khu3_p309_trong_2.jpg', 0),
(34, 30, '/uploads/phong/khu3_p310_1.jpg', 1),
(90002, 19, 'https://res.cloudinary.com/dpkkmjpdt/image/upload/v1794317404/xomtro/phong/e33uduqabks87cfysgdx.jpg', 1);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `chisodiennuoc`
--

DROP TABLE IF EXISTS `chisodiennuoc`;
CREATE TABLE IF NOT EXISTS `chisodiennuoc` (
  `MaCS` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `MaPhong` int UNSIGNED NOT NULL,
  `SoDienCu` int UNSIGNED NOT NULL DEFAULT '0',
  `SoDienMoi` int UNSIGNED NOT NULL DEFAULT '0',
  `SoNuocCu` int UNSIGNED NOT NULL DEFAULT '0',
  `SoNuocMoi` int UNSIGNED NOT NULL DEFAULT '0',
  `NgayGhi` date NOT NULL,
  PRIMARY KEY (`MaCS`),
  KEY `idx_csdn_maphong` (`MaPhong`)
) ENGINE=InnoDB AUTO_INCREMENT=60002 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `chisodiennuoc`
--

INSERT INTO `chisodiennuoc` (`MaCS`, `MaPhong`, `SoDienCu`, `SoDienMoi`, `SoNuocCu`, `SoNuocMoi`, `NgayGhi`) VALUES
(1, 1, 1200, 1260, 80, 84, '2026-09-28'),
(2, 2, 1450, 1530, 95, 101, '2026-09-28'),
(3, 3, 980, 1080, 60, 68, '2026-09-28'),
(4, 4, 620, 670, 40, 43, '2026-09-28'),
(5, 5, 810, 885, 52, 57, '2026-09-28'),
(6, 6, 1100, 1190, 70, 77, '2026-09-28'),
(7, 7, 540, 590, 35, 38, '2026-09-28'),
(8, 8, 760, 840, 48, 54, '2026-09-28'),
(9, 11, 1320, 1370, 88, 91, '2026-09-28'),
(10, 12, 1510, 1585, 102, 107, '2026-09-28'),
(11, 13, 890, 980, 64, 71, '2026-09-28'),
(12, 14, 430, 475, 29, 32, '2026-09-28'),
(13, 15, 670, 740, 44, 49, '2026-09-28'),
(14, 16, 920, 1010, 61, 67, '2026-09-28'),
(15, 17, 380, 425, 25, 28, '2026-09-28'),
(16, 18, 510, 575, 34, 39, '2026-09-28'),
(17, 20, 640, 735, 42, 50, '2026-09-28'),
(18, 21, 1600, 1660, 110, 114, '2026-09-28'),
(19, 22, 870, 945, 58, 63, '2026-09-28'),
(20, 23, 950, 1045, 66, 73, '2026-09-28'),
(21, 24, 410, 460, 27, 30, '2026-09-28'),
(22, 25, 720, 790, 49, 54, '2026-09-28'),
(23, 26, 830, 915, 55, 61, '2026-09-28'),
(24, 27, 350, 395, 22, 25, '2026-09-28'),
(25, 28, 610, 695, 41, 47, '2026-09-28'),
(26, 1, 1260, 1325, 84, 88, '2026-10-18'),
(27, 2, 1530, 1615, 101, 107, '2026-10-18'),
(28, 3, 1080, 1190, 68, 77, '2026-10-18'),
(29, 4, 670, 670, 43, 43, '2026-10-18'),
(30, 5, 885, 960, 57, 62, '2026-10-18'),
(31, 11, 1370, 1425, 91, 95, '2026-10-18'),
(32, 12, 1585, 1660, 107, 112, '2026-10-18'),
(33, 13, 980, 1075, 71, 79, '2026-10-18'),
(34, 14, 475, 520, 32, 35, '2026-10-18'),
(35, 15, 740, 815, 49, 54, '2026-10-18'),
(36, 21, 1660, 1720, 114, 118, '2026-10-18'),
(37, 22, 945, 1020, 63, 68, '2026-10-18'),
(38, 23, 1045, 1145, 73, 81, '2026-10-18'),
(39, 24, 460, 510, 30, 33, '2026-10-18'),
(40, 25, 790, 865, 54, 59, '2026-10-18'),
(30002, 1, 1325, 1326, 88, 89, '2026-11-10'),
(30003, 2, 1615, 1615, 107, 107, '2026-11-10'),
(30004, 3, 1190, 1190, 77, 77, '2026-11-10'),
(30005, 4, 720, 720, 46, 46, '2026-11-10'),
(30006, 5, 960, 960, 62, 62, '2026-11-10'),
(30007, 6, 1190, 1190, 77, 77, '2026-11-10'),
(30008, 7, 590, 590, 38, 38, '2026-11-10'),
(30009, 8, 840, 840, 54, 54, '2026-11-10');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `chitiethopdongthue`
--

DROP TABLE IF EXISTS `chitiethopdongthue`;
CREATE TABLE IF NOT EXISTS `chitiethopdongthue` (
  `MaND` int UNSIGNED NOT NULL,
  `MaHDT` int UNSIGNED NOT NULL,
  `NgayDi` date DEFAULT NULL,
  `NgayVao` date NOT NULL,
  `VaiTro` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ThanhVien' COMMENT 'DaiDien, ThanhVien',
  `TamTru` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ChuaDangKy' COMMENT 'DaDangKy, ChuaDangKy, DangCho',
  PRIMARY KEY (`MaND`,`MaHDT`),
  KEY `idx_cthdt_mahdt` (`MaHDT`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `chitiethopdongthue`
--

INSERT INTO `chitiethopdongthue` (`MaND`, `MaHDT`, `NgayDi`, `NgayVao`, `VaiTro`, `TamTru`) VALUES
(5, 1, NULL, '2025-01-05', 'DaiDien', 'DaDangKy'),
(5, 6, NULL, '2025-01-05', 'DaiDien', 'DaGiaHan'),
(6, 2, NULL, '2025-02-01', 'DaiDien', 'DaDangKy'),
(6, 7, NULL, '2025-02-01', 'DaiDien', 'DaGiaHan'),
(7, 2, NULL, '2025-02-01', 'ThanhVien', 'DaDangKy'),
(7, 7, NULL, '2025-02-01', 'ThanhVien', 'HetHan'),
(8, 8, NULL, '2026-01-10', 'DaiDien', 'DaDangKy'),
(9, 8, NULL, '2026-01-10', 'ThanhVien', 'DaDangKy'),
(10, 8, NULL, '2026-10-05', 'ThanhVien', 'ChuaDangKy'),
(11, 9, NULL, '2026-11-10', 'DaiDien', 'HetHan'),
(12, 10, NULL, '2026-02-15', 'DaiDien', 'DaGiaHan'),
(13, 10, NULL, '2026-02-15', 'ThanhVien', 'DaGiaHan'),
(14, 11, NULL, '2026-03-01', 'DaiDien', 'DaDangKy'),
(15, 11, NULL, '2026-03-01', 'ThanhVien', 'DaDangKy'),
(16, 11, NULL, '2026-10-08', 'ThanhVien', 'DangCho'),
(17, 12, NULL, '2026-03-10', 'DaiDien', 'DaDangKy'),
(18, 13, NULL, '2026-04-01', 'DaiDien', 'DaDangKy'),
(19, 13, NULL, '2026-04-01', 'ThanhVien', 'HetHan'),
(20, 13, '2026-09-15', '2026-04-01', 'ThanhVien', 'DaHuyTamTru'),
(21, 31, '2026-09-01', '2025-09-01', 'DaiDien', 'DaHuyTamTru'),
(22, 32, '2026-10-01', '2025-10-01', 'DaiDien', 'DaHuyTamTru'),
(23, 32, '2026-10-01', '2025-10-01', 'ThanhVien', 'DaHuyTamTru'),
(24, 3, NULL, '2025-01-10', 'DaiDien', 'DaDangKy'),
(24, 14, NULL, '2025-01-10', 'DaiDien', 'DaGiaHan'),
(25, 4, NULL, '2025-03-01', 'DaiDien', 'DaDangKy'),
(25, 15, NULL, '2025-03-01', 'DaiDien', 'DaGiaHan'),
(26, 4, NULL, '2025-03-01', 'ThanhVien', 'DaDangKy'),
(26, 15, NULL, '2025-03-01', 'ThanhVien', 'HetHan'),
(27, 16, NULL, '2026-01-15', 'DaiDien', 'DaDangKy'),
(28, 16, NULL, '2026-01-15', 'ThanhVien', 'DaDangKy'),
(29, 16, NULL, '2026-10-02', 'ThanhVien', 'ChuaDangKy'),
(30, 17, NULL, '2026-02-01', 'DaiDien', 'DaDangKy'),
(31, 18, NULL, '2026-02-20', 'DaiDien', 'DaDangKy'),
(32, 18, NULL, '2026-02-20', 'ThanhVien', 'DaGiaHan'),
(33, 19, NULL, '2026-03-05', 'DaiDien', 'DaDangKy'),
(34, 19, NULL, '2026-03-05', 'ThanhVien', 'DaDangKy'),
(35, 19, '2026-08-31', '2026-03-05', 'ThanhVien', 'DaHuyTamTru'),
(36, 20, NULL, '2026-04-01', 'DaiDien', 'HetHan'),
(37, 21, NULL, '2026-04-10', 'DaiDien', 'DaDangKy'),
(38, 21, NULL, '2026-10-10', 'ThanhVien', 'DangCho'),
(39, 33, '2026-08-01', '2025-08-01', 'DaiDien', 'DaHuyTamTru'),
(40, 33, '2026-08-01', '2025-08-01', 'ThanhVien', 'DaHuyTamTru'),
(41, 22, NULL, '2026-05-01', 'DaiDien', 'DaDangKy'),
(42, 22, NULL, '2026-05-01', 'ThanhVien', 'DaDangKy'),
(43, 22, NULL, '2026-05-01', 'ThanhVien', 'DaGiaHan'),
(44, 5, NULL, '2025-02-01', 'DaiDien', 'DaDangKy'),
(44, 23, NULL, '2025-02-01', 'DaiDien', 'DaGiaHan'),
(45, 24, NULL, '2026-01-01', 'DaiDien', 'DaGiaHan'),
(46, 24, NULL, '2026-01-01', 'ThanhVien', 'DaGiaHan'),
(47, 25, NULL, '2026-02-01', 'DaiDien', 'DaDangKy'),
(48, 25, NULL, '2026-02-01', 'ThanhVien', 'HetHan'),
(49, 25, NULL, '2026-10-12', 'ThanhVien', 'ChuaDangKy'),
(50, 26, NULL, '2026-03-01', 'DaiDien', 'DaDangKy'),
(51, 27, NULL, '2026-03-15', 'DaiDien', 'DaDangKy'),
(52, 27, NULL, '2026-03-15', 'ThanhVien', 'HetHan'),
(53, 28, NULL, '2026-04-01', 'DaiDien', 'DaDangKy'),
(54, 28, NULL, '2026-04-01', 'ThanhVien', 'DaDangKy'),
(55, 28, '2026-09-20', '2026-04-01', 'ThanhVien', 'DaHuyTamTru'),
(56, 29, NULL, '2026-05-01', 'DaiDien', 'DaDangKy'),
(57, 30, NULL, '2026-05-10', 'DaiDien', 'DaDangKy'),
(58, 30, NULL, '2026-05-10', 'ThanhVien', 'DaDangKy'),
(59, 30, NULL, '2026-10-14', 'ThanhVien', 'ChuaDangKy'),
(60, 34, '2026-08-30', '2025-08-30', 'DaiDien', 'DaHuyTamTru'),
(61, 35, '2026-10-04', '2025-10-31', 'DaiDien', 'DaHuyTamTru'),
(62, 35, '2026-10-04', '2025-10-31', 'ThanhVien', 'DaHuyTamTru');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `chitietphidichvu`
--

DROP TABLE IF EXISTS `chitietphidichvu`;
CREATE TABLE IF NOT EXISTS `chitietphidichvu` (
  `MaHDT` int UNSIGNED NOT NULL COMMENT 'Khóa ngoại trỏ về HopDongThue',
  `MaDV` int NOT NULL COMMENT 'Khóa ngoại trỏ về PhiDichVu',
  `SoLuong` int NOT NULL DEFAULT '1' COMMENT 'Số lượng sử dụng (VD: số xe máy, số gói)',
  PRIMARY KEY (`MaHDT`,`MaDV`),
  KEY `fk_2` (`MaDV`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `chitietphidichvu`
--

INSERT INTO `chitietphidichvu` (`MaHDT`, `MaDV`, `SoLuong`) VALUES
(1, 1, 1),
(1, 3, 1),
(1, 4, 1),
(2, 1, 1),
(2, 2, 1),
(2, 3, 1),
(2, 4, 2),
(3, 1, 1),
(3, 3, 1),
(3, 4, 1),
(4, 1, 1),
(4, 2, 1),
(4, 3, 1),
(4, 4, 2),
(5, 1, 1),
(5, 2, 1),
(5, 3, 1),
(5, 4, 1),
(6, 1, 1),
(6, 3, 1),
(6, 4, 1),
(7, 1, 1),
(7, 2, 1),
(7, 3, 1),
(7, 4, 2),
(8, 1, 1),
(8, 2, 1),
(8, 3, 1),
(8, 4, 3),
(10, 1, 1),
(10, 2, 1),
(10, 3, 1),
(10, 4, 2),
(11, 1, 1),
(11, 2, 1),
(11, 3, 1),
(11, 4, 2),
(12, 1, 1),
(12, 2, 1),
(12, 3, 1),
(12, 4, 1),
(13, 1, 1),
(13, 3, 1),
(13, 4, 2),
(14, 1, 1),
(14, 3, 1),
(14, 4, 1),
(15, 1, 1),
(15, 2, 1),
(15, 3, 1),
(15, 4, 2),
(16, 1, 1),
(16, 2, 1),
(16, 3, 1),
(16, 4, 2),
(17, 1, 1),
(17, 3, 1),
(17, 4, 1),
(18, 1, 1),
(18, 2, 1),
(18, 3, 1),
(18, 4, 2),
(19, 1, 1),
(19, 3, 1),
(19, 4, 2),
(20, 1, 1),
(20, 2, 1),
(20, 3, 1),
(21, 1, 1),
(21, 2, 1),
(21, 3, 1),
(21, 4, 2),
(22, 1, 1),
(22, 2, 1),
(22, 3, 1),
(22, 4, 3),
(23, 1, 1),
(23, 2, 1),
(23, 3, 1),
(23, 4, 1),
(24, 1, 1),
(24, 3, 1),
(24, 4, 2),
(25, 1, 1),
(25, 2, 1),
(25, 3, 1),
(25, 4, 3),
(26, 1, 1),
(26, 3, 1),
(26, 4, 1),
(27, 1, 1),
(27, 2, 1),
(27, 3, 1),
(27, 4, 2),
(28, 1, 1),
(28, 2, 1),
(28, 3, 1),
(28, 4, 2),
(29, 1, 1),
(29, 3, 1),
(29, 4, 1),
(30, 1, 1),
(30, 2, 1),
(30, 3, 1),
(30, 4, 2),
(31, 1, 1),
(31, 3, 1),
(31, 4, 1),
(32, 1, 1),
(32, 2, 1),
(32, 3, 1),
(32, 4, 2),
(33, 1, 1),
(33, 2, 1),
(33, 3, 1),
(33, 4, 1),
(34, 1, 1),
(34, 3, 1),
(34, 4, 1),
(35, 1, 1),
(35, 2, 1),
(35, 3, 1),
(35, 4, 2);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `chitiettienich`
--

DROP TABLE IF EXISTS `chitiettienich`;
CREATE TABLE IF NOT EXISTS `chitiettienich` (
  `MaPhong` int UNSIGNED NOT NULL,
  `MaTI` int UNSIGNED NOT NULL,
  PRIMARY KEY (`MaPhong`,`MaTI`),
  KEY `idx_ctti_mati` (`MaTI`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `chitiettienich`
--

INSERT INTO `chitiettienich` (`MaPhong`, `MaTI`) VALUES
(1, 1),
(2, 1),
(3, 1),
(4, 1),
(5, 1),
(6, 1),
(7, 1),
(8, 1),
(9, 1),
(10, 1),
(11, 1),
(12, 1),
(13, 1),
(14, 1),
(15, 1),
(16, 1),
(17, 1),
(18, 1),
(19, 1),
(20, 1),
(21, 1),
(22, 1),
(23, 1),
(24, 1),
(25, 1),
(26, 1),
(27, 1),
(28, 1),
(29, 1),
(30, 1),
(1, 2),
(2, 2),
(3, 2),
(5, 2),
(6, 2),
(7, 2),
(8, 2),
(9, 2),
(10, 2),
(12, 2),
(13, 2),
(15, 2),
(16, 2),
(18, 2),
(20, 2),
(21, 2),
(22, 2),
(23, 2),
(24, 2),
(25, 2),
(26, 2),
(27, 2),
(28, 2),
(29, 2),
(30, 2),
(3, 3),
(4, 3),
(6, 3),
(13, 3),
(16, 3),
(22, 3),
(23, 3),
(26, 3),
(28, 3),
(29, 3),
(1, 4),
(2, 4),
(3, 4),
(4, 4),
(5, 4),
(6, 4),
(7, 4),
(8, 4),
(9, 4),
(10, 4),
(11, 4),
(12, 4),
(13, 4),
(14, 4),
(15, 4),
(16, 4),
(17, 4),
(18, 4),
(19, 4),
(20, 4),
(21, 4),
(22, 4),
(23, 4),
(24, 4),
(25, 4),
(26, 4),
(27, 4),
(28, 4),
(29, 4),
(30, 4),
(2, 5),
(3, 5),
(5, 5),
(6, 5),
(8, 5),
(12, 5),
(13, 5),
(15, 5),
(16, 5),
(18, 5),
(19, 5),
(20, 5),
(23, 5),
(25, 5),
(26, 5),
(28, 5),
(1, 6),
(2, 6),
(3, 6),
(4, 6),
(5, 6),
(6, 6),
(7, 6),
(8, 6),
(9, 6),
(10, 6),
(11, 6),
(12, 6),
(13, 6),
(14, 6),
(15, 6),
(16, 6),
(17, 6),
(18, 6),
(19, 6),
(20, 6),
(21, 6),
(22, 6),
(23, 6),
(24, 6),
(25, 6),
(26, 6),
(27, 6),
(28, 6),
(29, 6),
(30, 6),
(1, 7),
(2, 7),
(3, 7),
(4, 7),
(5, 7),
(6, 7),
(7, 7),
(8, 7),
(9, 7),
(10, 7),
(11, 7),
(12, 7),
(13, 7),
(14, 7),
(15, 7),
(16, 7),
(17, 7),
(18, 7),
(19, 7),
(20, 7),
(21, 7),
(22, 7),
(23, 7),
(24, 7),
(25, 7),
(26, 7),
(27, 7),
(28, 7),
(29, 7),
(30, 7);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `giadiennuoc`
--

DROP TABLE IF EXISTS `giadiennuoc`;
CREATE TABLE IF NOT EXISTS `giadiennuoc` (
  `MaGia` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `GiaDien` decimal(12,2) NOT NULL DEFAULT '0.00',
  `GiaNuoc` decimal(12,2) NOT NULL DEFAULT '0.00',
  `NgayApDung` date NOT NULL,
  PRIMARY KEY (`MaGia`)
) ENGINE=InnoDB AUTO_INCREMENT=30002 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `giadiennuoc`
--

INSERT INTO `giadiennuoc` (`MaGia`, `GiaDien`, `GiaNuoc`, `NgayApDung`) VALUES
(1, 3500.00, 15000.00, '2025-01-01'),
(2, 3800.00, 18000.00, '2026-08-01');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `hoadon`
--

DROP TABLE IF EXISTS `hoadon`;
CREATE TABLE IF NOT EXISTS `hoadon` (
  `MaHD` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `MaCS` int UNSIGNED NOT NULL,
  `MaPhong` int UNSIGNED NOT NULL,
  `MaGia` int UNSIGNED NOT NULL,
  `TienPhong` decimal(12,2) NOT NULL DEFAULT '0.00',
  `TienDien` decimal(12,2) NOT NULL DEFAULT '0.00',
  `TienNuoc` decimal(12,2) NOT NULL DEFAULT '0.00',
  `TienPhuPhi` decimal(12,2) NOT NULL DEFAULT '0.00',
  `TienPhatSinh` decimal(12,2) NOT NULL DEFAULT '0.00',
  `TongTien` decimal(12,2) NOT NULL DEFAULT '0.00',
  `TienDaTra` decimal(12,2) NOT NULL DEFAULT '0.00',
  `NgayTinh` date NOT NULL,
  PRIMARY KEY (`MaHD`),
  KEY `idx_hoadon_macs` (`MaCS`),
  KEY `idx_hoadon_maphong` (`MaPhong`),
  KEY `idx_hoadon_magia` (`MaGia`)
) ENGINE=InnoDB AUTO_INCREMENT=60002 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `hoadon`
--

INSERT INTO `hoadon` (`MaHD`, `MaCS`, `MaPhong`, `MaGia`, `TienPhong`, `TienDien`, `TienNuoc`, `TienPhuPhi`, `TienPhatSinh`, `TongTien`, `TienDaTra`, `NgayTinh`) VALUES
(1, 1, 1, 2, 2200000.00, 228000.00, 72000.00, 180000.00, 0.00, 2680000.00, 2680000.00, '2026-09-29'),
(2, 2, 2, 2, 2300000.00, 304000.00, 108000.00, 220000.00, 0.00, 2932000.00, 2932000.00, '2026-09-29'),
(3, 3, 3, 2, 2500000.00, 380000.00, 144000.00, 220000.00, 50000.00, 3294000.00, 3294000.00, '2026-09-29'),
(4, 4, 4, 2, 2000000.00, 190000.00, 54000.00, 180000.00, 0.00, 2424000.00, 2424000.00, '2026-09-29'),
(5, 5, 5, 2, 2300000.00, 285000.00, 90000.00, 220000.00, 120000.00, 3015000.00, 2000000.00, '2026-09-29'),
(6, 6, 6, 2, 2500000.00, 342000.00, 126000.00, 220000.00, 0.00, 3188000.00, 3188000.00, '2026-09-29'),
(7, 7, 7, 2, 2200000.00, 190000.00, 54000.00, 180000.00, 0.00, 2624000.00, 2624000.00, '2026-09-29'),
(8, 8, 8, 2, 2300000.00, 304000.00, 108000.00, 220000.00, 0.00, 2932000.00, 1500000.00, '2026-09-29'),
(9, 9, 11, 2, 1900000.00, 190000.00, 54000.00, 180000.00, 0.00, 2324000.00, 2324000.00, '2026-09-29'),
(10, 10, 12, 2, 2100000.00, 285000.00, 90000.00, 220000.00, 0.00, 2695000.00, 2695000.00, '2026-09-29'),
(11, 11, 13, 2, 2300000.00, 342000.00, 126000.00, 220000.00, 80000.00, 3068000.00, 3068000.00, '2026-09-29'),
(12, 12, 14, 2, 1900000.00, 171000.00, 54000.00, 180000.00, 0.00, 2305000.00, 2305000.00, '2026-09-29'),
(13, 13, 15, 2, 2200000.00, 266000.00, 90000.00, 220000.00, 0.00, 2776000.00, 1776000.00, '2026-09-29'),
(14, 14, 16, 2, 2400000.00, 342000.00, 108000.00, 220000.00, 0.00, 3070000.00, 3070000.00, '2026-09-29'),
(15, 15, 17, 2, 2000000.00, 171000.00, 54000.00, 180000.00, 0.00, 2405000.00, 0.00, '2026-09-29'),
(16, 16, 18, 2, 2200000.00, 247000.00, 90000.00, 220000.00, 150000.00, 2907000.00, 2907000.00, '2026-09-29'),
(17, 17, 20, 2, 2300000.00, 361000.00, 144000.00, 220000.00, 0.00, 3025000.00, 3025000.00, '2026-09-29'),
(18, 18, 21, 2, 2300000.00, 228000.00, 72000.00, 180000.00, 0.00, 2780000.00, 2780000.00, '2026-09-29'),
(19, 19, 22, 2, 2400000.00, 285000.00, 90000.00, 220000.00, 0.00, 2995000.00, 2995000.00, '2026-09-29'),
(20, 20, 23, 2, 2500000.00, 361000.00, 126000.00, 220000.00, 100000.00, 3307000.00, 2307000.00, '2026-09-29'),
(21, 21, 24, 2, 2100000.00, 190000.00, 54000.00, 180000.00, 0.00, 2524000.00, 2524000.00, '2026-09-29'),
(22, 22, 25, 2, 2300000.00, 266000.00, 90000.00, 220000.00, 0.00, 2876000.00, 2876000.00, '2026-09-29'),
(23, 23, 26, 2, 2500000.00, 323000.00, 108000.00, 220000.00, 0.00, 3151000.00, 3151000.00, '2026-09-29'),
(24, 24, 27, 2, 2200000.00, 171000.00, 54000.00, 180000.00, 0.00, 2605000.00, 0.00, '2026-09-29'),
(25, 25, 28, 2, 2400000.00, 323000.00, 108000.00, 220000.00, 0.00, 3051000.00, 3051000.00, '2026-09-29'),
(26, 26, 1, 2, 2200000.00, 247000.00, 72000.00, 180000.00, 0.00, 2699000.00, 2699000.00, '2026-10-18'),
(27, 27, 2, 2, 2300000.00, 323000.00, 108000.00, 220000.00, 0.00, 2951000.00, 0.00, '2026-10-18'),
(28, 28, 3, 2, 2500000.00, 418000.00, 162000.00, 220000.00, 0.00, 3300000.00, 0.00, '2026-10-18'),
(29, 31, 11, 2, 1900000.00, 209000.00, 72000.00, 180000.00, 0.00, 2361000.00, 2361000.00, '2026-10-18'),
(30, 32, 12, 2, 2100000.00, 285000.00, 90000.00, 220000.00, 0.00, 2695000.00, 1500000.00, '2026-10-18'),
(31, 33, 13, 2, 2300000.00, 361000.00, 144000.00, 220000.00, 0.00, 3025000.00, 0.00, '2026-10-18'),
(32, 36, 21, 2, 2300000.00, 228000.00, 72000.00, 180000.00, 0.00, 2780000.00, 2780000.00, '2026-10-18'),
(33, 37, 22, 2, 2400000.00, 285000.00, 90000.00, 220000.00, 0.00, 2995000.00, 0.00, '2026-10-18'),
(34, 38, 23, 2, 2500000.00, 380000.00, 144000.00, 220000.00, 0.00, 3244000.00, 0.00, '2026-10-18'),
(30003, 30, 5, 2, 2300000.00, 285000.00, 90000.00, 480000.00, 0.00, 3155000.00, 0.00, '2026-11-10'),
(30004, 30002, 1, 2, 2250000.00, 3800.00, 18000.00, 330000.00, 0.00, 2601800.00, 0.00, '2026-11-10'),
(30005, 30003, 2, 2, 2300000.00, 0.00, 0.00, 480000.00, 0.00, 2780000.00, 0.00, '2026-11-10'),
(30006, 30004, 3, 2, 2500000.00, 0.00, 0.00, 580000.00, 0.00, 3080000.00, 0.00, '2026-11-10'),
(30008, 30007, 6, 2, 2500000.00, 0.00, 0.00, 480000.00, 0.00, 2980000.00, 0.00, '2026-11-10'),
(30009, 30008, 7, 2, 2200000.00, 0.00, 0.00, 380000.00, 0.00, 2580000.00, 0.00, '2026-11-10'),
(30010, 30009, 8, 2, 2300000.00, 0.00, 0.00, 430000.00, 0.00, 2730000.00, 0.00, '2026-11-10'),
(30012, 30005, 4, 2, 10000.00, 0.00, 0.00, 0.00, 0.00, 10000.00, 10000.00, '2026-11-10');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `hopdongthue`
--

DROP TABLE IF EXISTS `hopdongthue`;
CREATE TABLE IF NOT EXISTS `hopdongthue` (
  `MaHDT` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `MaPhong` int UNSIGNED NOT NULL,
  `MaHDTCu` int UNSIGNED DEFAULT NULL,
  `NgayBD` date NOT NULL,
  `NgayKT` date NOT NULL,
  `NgayKy` date NOT NULL,
  `TienCoc` decimal(12,2) NOT NULL DEFAULT '0.00',
  `TrangThai` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ConHieuLuc' COMMENT 'ConHieuLuc, HetHan, DaHuy',
  PRIMARY KEY (`MaHDT`),
  KEY `idx_hdt_maphong` (`MaPhong`),
  KEY `idx_hdt_mahdtcu` (`MaHDTCu`)
) ENGINE=InnoDB AUTO_INCREMENT=30002 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `hopdongthue`
--

INSERT INTO `hopdongthue` (`MaHDT`, `MaPhong`, `MaHDTCu`, `NgayBD`, `NgayKT`, `NgayKy`, `TienCoc`, `TrangThai`) VALUES
(1, 1, NULL, '2025-01-05', '2026-01-05', '2025-01-03', 2000000.00, 'HetHan'),
(2, 2, NULL, '2025-02-01', '2026-02-01', '2025-01-28', 2200000.00, 'HetHan'),
(3, 11, NULL, '2025-01-10', '2026-01-10', '2025-01-08', 1800000.00, 'HetHan'),
(4, 12, NULL, '2025-03-01', '2026-03-01', '2025-02-25', 2000000.00, 'HetHan'),
(5, 21, NULL, '2025-02-01', '2026-02-01', '2025-01-29', 2200000.00, 'HetHan'),
(6, 1, 1, '2026-01-06', '2027-01-06', '2026-01-05', 2200000.00, 'ConHieuLuc'),
(7, 2, 2, '2026-02-02', '2027-02-02', '2026-02-01', 2300000.00, 'ConHieuLuc'),
(8, 3, NULL, '2026-01-10', '2027-01-10', '2026-01-08', 2500000.00, 'ConHieuLuc'),
(9, 4, NULL, '2026-11-10', '2027-01-31', '2026-11-10', 2000000.00, 'ConHieuLuc'),
(10, 5, NULL, '2026-02-15', '2027-02-15', '2026-02-12', 2300000.00, 'ConHieuLuc'),
(11, 6, NULL, '2026-03-01', '2027-03-01', '2026-02-27', 2500000.00, 'ConHieuLuc'),
(12, 7, NULL, '2026-03-10', '2027-03-10', '2026-03-08', 2200000.00, 'ConHieuLuc'),
(13, 8, NULL, '2026-04-01', '2027-04-01', '2026-03-29', 2300000.00, 'ConHieuLuc'),
(14, 11, 3, '2026-01-11', '2027-01-11', '2026-01-10', 1900000.00, 'ConHieuLuc'),
(15, 12, 4, '2026-03-02', '2027-03-02', '2026-03-01', 2100000.00, 'ConHieuLuc'),
(16, 13, NULL, '2026-01-15', '2027-01-15', '2026-01-12', 2300000.00, 'ConHieuLuc'),
(17, 14, NULL, '2026-02-01', '2027-02-01', '2026-01-28', 1900000.00, 'ConHieuLuc'),
(18, 15, NULL, '2026-02-20', '2027-02-20', '2026-02-18', 2200000.00, 'ConHieuLuc'),
(19, 16, NULL, '2026-03-05', '2027-03-05', '2026-03-03', 2400000.00, 'ConHieuLuc'),
(20, 17, NULL, '2026-04-01', '2027-04-01', '2026-03-28', 2000000.00, 'ConHieuLuc'),
(21, 18, NULL, '2026-04-10', '2027-04-10', '2026-04-08', 2200000.00, 'ConHieuLuc'),
(22, 20, NULL, '2026-05-01', '2027-05-01', '2026-04-28', 2300000.00, 'ConHieuLuc'),
(23, 21, 5, '2026-02-02', '2027-02-02', '2026-02-01', 2300000.00, 'ConHieuLuc'),
(24, 22, NULL, '2026-01-01', '2027-01-01', '2025-12-28', 2400000.00, 'ConHieuLuc'),
(25, 23, NULL, '2026-02-01', '2027-02-01', '2026-01-29', 2500000.00, 'ConHieuLuc'),
(26, 24, NULL, '2026-03-01', '2027-03-01', '2026-02-26', 2100000.00, 'ConHieuLuc'),
(27, 25, NULL, '2026-03-15', '2027-03-15', '2026-03-12', 2300000.00, 'ConHieuLuc'),
(28, 26, NULL, '2026-04-01', '2027-04-01', '2026-03-29', 2500000.00, 'ConHieuLuc'),
(29, 27, NULL, '2026-05-01', '2027-05-01', '2026-04-29', 2200000.00, 'ConHieuLuc'),
(30, 28, NULL, '2026-05-10', '2027-05-10', '2026-05-08', 2400000.00, 'ConHieuLuc'),
(31, 9, NULL, '2025-09-01', '2026-09-01', '2025-08-28', 2200000.00, 'HetHan'),
(32, 10, NULL, '2025-10-01', '2026-10-01', '2025-09-29', 2300000.00, 'HetHan'),
(33, 19, NULL, '2025-08-01', '2026-08-01', '2025-07-29', 2000000.00, 'HetHan'),
(34, 29, NULL, '2025-08-30', '2026-08-30', '2025-08-27', 2200000.00, 'ConHieuLuc'),
(35, 30, NULL, '2025-10-31', '2026-11-20', '2025-10-27', 2300000.00, 'ConHieuLuc');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `khutro`
--

DROP TABLE IF EXISTS `khutro`;
CREATE TABLE IF NOT EXISTS `khutro` (
  `MaKhu` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `MaND` int UNSIGNED NOT NULL,
  `TenKhu` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `MoTa` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `DiaChi` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`MaKhu`),
  KEY `idx_khutro_mand` (`MaND`)
) ENGINE=InnoDB AUTO_INCREMENT=30002 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `khutro`
--

INSERT INTO `khutro` (`MaKhu`, `MaND`, `TenKhu`, `MoTa`, `DiaChi`) VALUES
(1, 2, 'Xóm Trọ Cơ sở 1 - Tạ Quang Bửu', 'Khu trọ sinh viên gần cầu Chánh Hưng, thoáng mát, gần chợ và trạm xe buýt', 'Số 854 Tạ Quang Bửu, Phường 5, Quận 8, TP.HCM'),
(2, 3, 'Xóm Trọ Cơ sở 2 - Hưng Long', 'Khu trọ yên tĩnh, phòng có gác lửng rộng, giá bình dân cho sinh viên và người đi làm', 'Đường Đoàn Nguyễn Tuấn, Xã Hưng Long, Huyện Bình Chánh, TP.HCM'),
(3, 4, 'Xóm Trọ Cơ sở 3 - Nguyễn Thị Thập', 'Khu trọ gần ĐH Tôn Đức Thắng và ĐH Tài chính - Marketing, đầy đủ tiện nghi', 'Hẻm 420 Nguyễn Thị Thập, Phường Tân Quy, Quận 7, TP.HCM');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `lichsuthe`
--

DROP TABLE IF EXISTS `lichsuthe`;
CREATE TABLE IF NOT EXISTS `lichsuthe` (
  `MaLS` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `MaThe` int UNSIGNED NOT NULL,
  `NgayQuetThe` date NOT NULL,
  `GioQuetThe` time NOT NULL,
  PRIMARY KEY (`MaLS`),
  KEY `idx_lichsuthe_mathe` (`MaThe`)
) ENGINE=InnoDB AUTO_INCREMENT=30002 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `lichsuthe`
--

INSERT INTO `lichsuthe` (`MaLS`, `MaThe`, `NgayQuetThe`, `GioQuetThe`) VALUES
(1, 4, '2026-10-17', '07:15:20'),
(2, 5, '2026-10-17', '07:30:10'),
(3, 8, '2026-10-17', '07:45:00'),
(4, 10, '2026-10-17', '08:00:05'),
(5, 14, '2026-10-17', '17:40:30'),
(6, 16, '2026-10-17', '18:15:45'),
(7, 4, '2026-10-17', '21:10:12'),
(8, 18, '2026-10-17', '23:45:50'),
(9, 24, '2026-10-18', '06:50:15'),
(10, 27, '2026-10-18', '07:20:40'),
(11, 29, '2026-10-18', '08:10:00'),
(12, 31, '2026-10-18', '18:05:22'),
(13, 38, '2026-10-18', '20:30:18'),
(14, 41, '2026-10-18', '23:55:09'),
(15, 44, '2026-10-18', '07:05:33'),
(16, 47, '2026-10-18', '07:35:19'),
(17, 49, '2026-10-18', '19:20:44'),
(18, 53, '2026-10-18', '21:40:11'),
(19, 59, '2026-10-19', '00:15:27'),
(20, 1, '2026-10-19', '08:00:00');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `loaithongbao`
--

DROP TABLE IF EXISTS `loaithongbao`;
CREATE TABLE IF NOT EXISTS `loaithongbao` (
  `MaLTB` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `TenLTB` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `MoTa` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`MaLTB`)
) ENGINE=InnoDB AUTO_INCREMENT=30002 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `loaithongbao`
--

INSERT INTO `loaithongbao` (`MaLTB`, `TenLTB`, `MoTa`) VALUES
(1, 'Thông báo chung', 'Nội quy, lịch cúp điện nước, kiểm tra PCCC định kỳ'),
(2, 'Hóa đơn & Thanh toán', 'Nhắc nhở đóng tiền phòng, xác nhận thanh toán'),
(3, 'Tạm trú & Hợp đồng', 'Thông báo hết hạn tạm trú, gia hạn tạm trú và hợp đồng'),
(4, 'Phản ánh & Sửa chữa', 'Khách báo hỏng thiết bị hoặc phản ánh sinh hoạt'),
(5, 'Tư vấn thuê trọ', 'Tin nhắn hỏi thông tin phòng trống từ khách mới');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `nguoidung`
--

DROP TABLE IF EXISTS `nguoidung`;
CREATE TABLE IF NOT EXISTS `nguoidung` (
  `MaND` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `TenTK` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `MatKhau` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `Quyen` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'KhachThue' COMMENT 'ChuTro, KhachThue, Admin',
  PRIMARY KEY (`MaND`),
  UNIQUE KEY `TenTK` (`TenTK`)
) ENGINE=InnoDB AUTO_INCREMENT=30002 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `nguoidung`
--

INSERT INTO `nguoidung` (`MaND`, `TenTK`, `MatKhau`, `Quyen`) VALUES
(1, 'quynhdu.nguyenthi@gmail.com', '$2b$10$niHghBnxNwjdNS3R9YL5oOEgnyIK0YKGX1s1rQ.jb2aLsr9eNKMwm', 'ChuTro'),
(2, 'tuannghia123441@gmail.com', '$2b$10$HgxVq7JQ6Bh/ZA14CSsbn.cTutFXuSRE4scoiE0EpRqHkM/C6kBFi', 'QuanLy'),
(3, 'phamvannhatnguyen@gmail.com', '$2b$10$niHghBnxNwjdNS3R9YL5oOEgnyIK0YKGX1s1rQ.jb2aLsr9eNKMwm', 'QuanLy'),
(4, 'lehoangnam99@gmail.com', '$2b$10$niHghBnxNwjdNS3R9YL5oOEgnyIK0YKGX1s1rQ.jb2aLsr9eNKMwm', 'QuanLy'),
(5, 'minhkhoi.nguyen02@gmail.com', '$2b$10$niHghBnxNwjdNS3R9YL5oOEgnyIK0YKGX1s1rQ.jb2aLsr9eNKMwm', 'KhachThue'),
(6, 'quocdat.tran03@gmail.com', '$2b$10$niHghBnxNwjdNS3R9YL5oOEgnyIK0YKGX1s1rQ.jb2aLsr9eNKMwm', 'KhachThue'),
(7, 'vanhai.le01@gmail.com', '$2b$10$niHghBnxNwjdNS3R9YL5oOEgnyIK0YKGX1s1rQ.jb2aLsr9eNKMwm', 'KhachThue'),
(8, 'minhthu.pham03@gmail.com', '$2b$10$niHghBnxNwjdNS3R9YL5oOEgnyIK0YKGX1s1rQ.jb2aLsr9eNKMwm', 'KhachThue'),
(9, 'ngoctram.vo00@gmail.com', '$2b$10$niHghBnxNwjdNS3R9YL5oOEgnyIK0YKGX1s1rQ.jb2aLsr9eNKMwm', 'KhachThue'),
(10, 'minhhieu.hoang04@gmail.com', '$2b$10$niHghBnxNwjdNS3R9YL5oOEgnyIK0YKGX1s1rQ.jb2aLsr9eNKMwm', 'KhachThue'),
(11, 'giabao.bui04@gmail.com', '$2b$10$niHghBnxNwjdNS3R9YL5oOEgnyIK0YKGX1s1rQ.jb2aLsr9eNKMwm', 'KhachThue'),
(12, 'thanhtam.do99@gmail.com', '$2b$10$niHghBnxNwjdNS3R9YL5oOEgnyIK0YKGX1s1rQ.jb2aLsr9eNKMwm', 'KhachThue'),
(13, 'ngocanh.ngo01@gmail.com', '$2b$10$niHghBnxNwjdNS3R9YL5oOEgnyIK0YKGX1s1rQ.jb2aLsr9eNKMwm', 'KhachThue'),
(14, 'ducthinh.ly02@gmail.com', '$2b$10$niHghBnxNwjdNS3R9YL5oOEgnyIK0YKGX1s1rQ.jb2aLsr9eNKMwm', 'KhachThue'),
(15, 'thanhthao.truong03@gmail.com', '$2b$10$niHghBnxNwjdNS3R9YL5oOEgnyIK0YKGX1s1rQ.jb2aLsr9eNKMwm', 'KhachThue'),
(16, 'vankiet.phan05@gmail.com', '$2b$10$niHghBnxNwjdNS3R9YL5oOEgnyIK0YKGX1s1rQ.jb2aLsr9eNKMwm', 'KhachThue'),
(17, 'mylinh.vu02@gmail.com', '$2b$10$niHghBnxNwjdNS3R9YL5oOEgnyIK0YKGX1s1rQ.jb2aLsr9eNKMwm', 'KhachThue'),
(18, 'dinhkhoa.dinh00@gmail.com', '$2b$10$niHghBnxNwjdNS3R9YL5oOEgnyIK0YKGX1s1rQ.jb2aLsr9eNKMwm', 'KhachThue'),
(19, 'kimngan.lam01@gmail.com', '$2b$10$niHghBnxNwjdNS3R9YL5oOEgnyIK0YKGX1s1rQ.jb2aLsr9eNKMwm', 'KhachThue'),
(20, 'quochuy.mai04@gmail.com', '$2b$10$niHghBnxNwjdNS3R9YL5oOEgnyIK0YKGX1s1rQ.jb2aLsr9eNKMwm', 'KhachThue'),
(21, 'yennhi.trinh98@gmail.com', '$2b$10$niHghBnxNwjdNS3R9YL5oOEgnyIK0YKGX1s1rQ.jb2aLsr9eNKMwm', 'KhachThue'),
(22, 'minhquan.ho99@gmail.com', '$2b$10$niHghBnxNwjdNS3R9YL5oOEgnyIK0YKGX1s1rQ.jb2aLsr9eNKMwm', 'KhachThue'),
(23, 'thanhtung.luong00@gmail.com', '$2b$10$niHghBnxNwjdNS3R9YL5oOEgnyIK0YKGX1s1rQ.jb2aLsr9eNKMwm', 'KhachThue'),
(24, 'thehien.chau99@gmail.com', '$2b$10$niHghBnxNwjdNS3R9YL5oOEgnyIK0YKGX1s1rQ.jb2aLsr9eNKMwm', 'KhachThue'),
(25, 'tuyetmai.kieu01@gmail.com', '$2b$10$niHghBnxNwjdNS3R9YL5oOEgnyIK0YKGX1s1rQ.jb2aLsr9eNKMwm', 'KhachThue'),
(26, 'minhtuan.doan02@gmail.com', '$2b$10$niHghBnxNwjdNS3R9YL5oOEgnyIK0YKGX1s1rQ.jb2aLsr9eNKMwm', 'KhachThue'),
(27, 'trongnhan.nguyen03@gmail.com', '$2b$10$niHghBnxNwjdNS3R9YL5oOEgnyIK0YKGX1s1rQ.jb2aLsr9eNKMwm', 'KhachThue'),
(28, 'quockhanh.ha00@gmail.com', '$2b$10$niHghBnxNwjdNS3R9YL5oOEgnyIK0YKGX1s1rQ.jb2aLsr9eNKMwm', 'KhachThue'),
(29, 'ducduy.bui04@gmail.com', '$2b$10$niHghBnxNwjdNS3R9YL5oOEgnyIK0YKGX1s1rQ.jb2aLsr9eNKMwm', 'KhachThue'),
(30, 'dinhtrung.tran01@gmail.com', '$2b$10$niHghBnxNwjdNS3R9YL5oOEgnyIK0YKGX1s1rQ.jb2aLsr9eNKMwm', 'KhachThue'),
(31, 'hoanglong.do02@gmail.com', '$2b$10$niHghBnxNwjdNS3R9YL5oOEgnyIK0YKGX1s1rQ.jb2aLsr9eNKMwm', 'KhachThue'),
(32, 'minhtam.phan00@gmail.com', '$2b$10$niHghBnxNwjdNS3R9YL5oOEgnyIK0YKGX1s1rQ.jb2aLsr9eNKMwm', 'KhachThue'),
(33, 'congthanh.nguyen05@gmail.com', '$2b$10$niHghBnxNwjdNS3R9YL5oOEgnyIK0YKGX1s1rQ.jb2aLsr9eNKMwm', 'KhachThue'),
(34, 'xuanbach.luong99@gmail.com', '$2b$10$niHghBnxNwjdNS3R9YL5oOEgnyIK0YKGX1s1rQ.jb2aLsr9eNKMwm', 'KhachThue'),
(35, 'quoccuong.vu01@gmail.com', '$2b$10$niHghBnxNwjdNS3R9YL5oOEgnyIK0YKGX1s1rQ.jb2aLsr9eNKMwm', 'KhachThue'),
(36, 'hongphuc.nguyen02@gmail.com', '$2b$10$niHghBnxNwjdNS3R9YL5oOEgnyIK0YKGX1s1rQ.jb2aLsr9eNKMwm', 'KhachThue'),
(37, 'nhatminh.tran03@gmail.com', '$2b$10$niHghBnxNwjdNS3R9YL5oOEgnyIK0YKGX1s1rQ.jb2aLsr9eNKMwm', 'KhachThue'),
(38, 'tuananh.le04@gmail.com', '$2b$10$niHghBnxNwjdNS3R9YL5oOEgnyIK0YKGX1s1rQ.jb2aLsr9eNKMwm', 'KhachThue'),
(39, 'huunghia.pham98@gmail.com', '$2b$10$niHghBnxNwjdNS3R9YL5oOEgnyIK0YKGX1s1rQ.jb2aLsr9eNKMwm', 'KhachThue'),
(40, 'thanhdat.vo97@gmail.com', '$2b$10$niHghBnxNwjdNS3R9YL5oOEgnyIK0YKGX1s1rQ.jb2aLsr9eNKMwm', 'KhachThue'),
(41, 'minhduc.hoang02@gmail.com', '$2b$10$niHghBnxNwjdNS3R9YL5oOEgnyIK0YKGX1s1rQ.jb2aLsr9eNKMwm', 'KhachThue'),
(42, 'giahung.dang03@gmail.com', '$2b$10$niHghBnxNwjdNS3R9YL5oOEgnyIK0YKGX1s1rQ.jb2aLsr9eNKMwm', 'KhachThue'),
(43, 'tanphat.ngo98@gmail.com', '$2b$10$niHghBnxNwjdNS3R9YL5oOEgnyIK0YKGX1s1rQ.jb2aLsr9eNKMwm', 'KhachThue'),
(44, 'thaovy.tran02@gmail.com', '$2b$10$niHghBnxNwjdNS3R9YL5oOEgnyIK0YKGX1s1rQ.jb2aLsr9eNKMwm', 'KhachThue'),
(45, 'thuylinh.do00@gmail.com', '$2b$10$niHghBnxNwjdNS3R9YL5oOEgnyIK0YKGX1s1rQ.jb2aLsr9eNKMwm', 'KhachThue'),
(46, 'camtu.luong03@gmail.com', '$2b$10$niHghBnxNwjdNS3R9YL5oOEgnyIK0YKGX1s1rQ.jb2aLsr9eNKMwm', 'KhachThue'),
(47, 'thuytrang.nguyen01@gmail.com', '$2b$10$niHghBnxNwjdNS3R9YL5oOEgnyIK0YKGX1s1rQ.jb2aLsr9eNKMwm', 'KhachThue'),
(48, 'ngochuyen.huynh04@gmail.com', '$2b$10$niHghBnxNwjdNS3R9YL5oOEgnyIK0YKGX1s1rQ.jb2aLsr9eNKMwm', 'KhachThue'),
(49, 'baongoc.le03@gmail.com', '$2b$10$niHghBnxNwjdNS3R9YL5oOEgnyIK0YKGX1s1rQ.jb2aLsr9eNKMwm', 'KhachThue'),
(50, 'minhtriet.doan02@gmail.com', '$2b$10$niHghBnxNwjdNS3R9YL5oOEgnyIK0YKGX1s1rQ.jb2aLsr9eNKMwm', 'KhachThue'),
(51, 'thuhuong.pham99@gmail.com', '$2b$10$niHghBnxNwjdNS3R9YL5oOEgnyIK0YKGX1s1rQ.jb2aLsr9eNKMwm', 'KhachThue'),
(52, 'hongnhung.vo00@gmail.com', '$2b$10$niHghBnxNwjdNS3R9YL5oOEgnyIK0YKGX1s1rQ.jb2aLsr9eNKMwm', 'KhachThue'),
(53, 'bichphuong.nguyen01@gmail.com', '$2b$10$niHghBnxNwjdNS3R9YL5oOEgnyIK0YKGX1s1rQ.jb2aLsr9eNKMwm', 'KhachThue'),
(54, 'kimoanh.ngo05@gmail.com', '$2b$10$niHghBnxNwjdNS3R9YL5oOEgnyIK0YKGX1s1rQ.jb2aLsr9eNKMwm', 'KhachThue'),
(55, 'minhkhang.truong98@gmail.com', '$2b$10$niHghBnxNwjdNS3R9YL5oOEgnyIK0YKGX1s1rQ.jb2aLsr9eNKMwm', 'KhachThue'),
(56, 'quocviet.ngo99@gmail.com', '$2b$10$niHghBnxNwjdNS3R9YL5oOEgnyIK0YKGX1s1rQ.jb2aLsr9eNKMwm', 'KhachThue'),
(57, 'anhtuan.pham00@gmail.com', '$2b$10$niHghBnxNwjdNS3R9YL5oOEgnyIK0YKGX1s1rQ.jb2aLsr9eNKMwm', 'KhachThue'),
(58, 'quangvinh.le01@gmail.com', '$2b$10$niHghBnxNwjdNS3R9YL5oOEgnyIK0YKGX1s1rQ.jb2aLsr9eNKMwm', 'KhachThue'),
(59, 'giakhiem.pham99@gmail.com', '$2b$10$niHghBnxNwjdNS3R9YL5oOEgnyIK0YKGX1s1rQ.jb2aLsr9eNKMwm', 'KhachThue'),
(60, 'tantai.bui00@gmail.com', '$2b$10$niHghBnxNwjdNS3R9YL5oOEgnyIK0YKGX1s1rQ.jb2aLsr9eNKMwm', 'KhachThue'),
(61, 'hoangkhoa.pham98@gmail.com', '$2b$10$niHghBnxNwjdNS3R9YL5oOEgnyIK0YKGX1s1rQ.jb2aLsr9eNKMwm', 'KhachThue'),
(62, 'lananh.ninh00@gmail.com', '$2b$10$niHghBnxNwjdNS3R9YL5oOEgnyIK0YKGX1s1rQ.jb2aLsr9eNKMwm', 'KhachThue'),
(63, 'hoangkhang.le05@gmail.com', '$2b$10$niHghBnxNwjdNS3R9YL5oOEgnyIK0YKGX1s1rQ.jb2aLsr9eNKMwm', 'KhachThue'),
(64, 'quocbao.tran04@gmail.com', '$2b$10$niHghBnxNwjdNS3R9YL5oOEgnyIK0YKGX1s1rQ.jb2aLsr9eNKMwm', 'KhachThue');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `nhanthongbao`
--

DROP TABLE IF EXISTS `nhanthongbao`;
CREATE TABLE IF NOT EXISTS `nhanthongbao` (
  `MaTB` int UNSIGNED NOT NULL,
  `NDNhan` int UNSIGNED NOT NULL,
  `TrangThai` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ChuaDoc' COMMENT 'ChuaDoc, DaDoc',
  PRIMARY KEY (`MaTB`,`NDNhan`),
  KEY `idx_ntb_ndnhan` (`NDNhan`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `nhanthongbao`
--

INSERT INTO `nhanthongbao` (`MaTB`, `NDNhan`, `TrangThai`) VALUES
(1, 2, 'DaDoc'),
(1, 3, 'DaDoc'),
(1, 4, 'DaDoc'),
(1, 5, 'DaDoc'),
(1, 6, 'ChuaDoc'),
(1, 8, 'DaDoc'),
(1, 24, 'ChuaDoc'),
(1, 44, 'DaDoc'),
(2, 7, 'DaDoc'),
(2, 11, 'DaDoc'),
(2, 19, 'ChuaDoc'),
(3, 2, 'DaDoc'),
(4, 10, 'DaDoc'),
(4, 16, 'ChuaDoc'),
(5, 24, 'DaDoc'),
(5, 25, 'DaDoc'),
(5, 32, 'ChuaDoc'),
(5, 43, 'DaDoc'),
(6, 2, 'DaDoc'),
(7, 12, 'DaDoc'),
(8, 31, 'DaDoc'),
(8, 36, 'ChuaDoc'),
(9, 44, 'DaDoc'),
(9, 45, 'DaDoc'),
(9, 47, 'ChuaDoc'),
(9, 50, 'ChuaDoc'),
(9, 51, 'DaDoc'),
(9, 53, 'ChuaDoc'),
(9, 56, 'ChuaDoc'),
(9, 57, 'ChuaDoc'),
(10, 2, 'DaDoc'),
(11, 63, 'ChuaDoc'),
(12, 3, 'DaDoc'),
(30002, 64, 'DaDoc'),
(30003, 64, 'DaDoc'),
(30004, 1, 'ChuaDoc'),
(30005, 64, 'DaDoc'),
(30006, 64, 'DaDoc'),
(60002, 64, 'DaDoc'),
(60003, 64, 'DaDoc'),
(60004, 1, 'ChuaDoc'),
(60005, 64, 'DaDoc'),
(90002, 1, 'ChuaDoc'),
(90002, 2, 'DaDoc'),
(90003, 3, 'DaDoc'),
(120002, 1, 'ChuaDoc'),
(120002, 2, 'ChuaDoc');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `phatsinh`
--

DROP TABLE IF EXISTS `phatsinh`;
CREATE TABLE IF NOT EXISTS `phatsinh` (
  `MaPS` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `MaHD` int UNSIGNED NOT NULL,
  `TenPS` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `Gia` decimal(12,2) NOT NULL DEFAULT '0.00',
  `GhiChu` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`MaPS`),
  KEY `idx_phatsinh_mahd` (`MaHD`)
) ENGINE=InnoDB AUTO_INCREMENT=30002 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `phatsinh`
--

INSERT INTO `phatsinh` (`MaPS`, `MaHD`, `TenPS`, `Gia`, `GhiChu`) VALUES
(1, 3, 'Phí làm lại thẻ từ ra vào', 50000.00, 'Cấp lại thẻ từ mới cho Phạm Thị Minh Thư (P.103) do làm rơi mất thẻ cũ'),
(2, 5, 'Thay vòi sen và dây cấp nước nhà vệ sinh', 120000.00, 'Vòi sen bị gãy khớp nối theo yêu cầu sửa chữa của P.105'),
(3, 11, 'Thay bóng đèn LED tuýp 1m2', 80000.00, 'Thay bóng đèn chính trong phòng P.203'),
(4, 16, 'Sửa ổ khóa tay nắm cửa chính', 150000.00, 'Thay ruột ổ khóa mới cho phòng P.208'),
(5, 20, 'Mua mới remote máy lạnh', 100000.00, 'Khách làm hỏng màn hình remote máy lạnh phòng P.303');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `phidichvu`
--

DROP TABLE IF EXISTS `phidichvu`;
CREATE TABLE IF NOT EXISTS `phidichvu` (
  `MaDV` int NOT NULL AUTO_INCREMENT,
  `TenDV` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `DonGia` decimal(10,2) NOT NULL,
  `DonViTinh` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `MoTa` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`MaDV`)
) ENGINE=InnoDB AUTO_INCREMENT=30002 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `phidichvu`
--

INSERT INTO `phidichvu` (`MaDV`, `TenDV`, `DonGia`, `DonViTinh`, `MoTa`) VALUES
(1, 'WiFi tốc độ cao', 200000.00, 'Tháng', 'Hệ thống WiFi Mesh phủ sóng từng tầng'),
(2, 'Máy giặt chung', 50000.00, 'Tháng', 'Khu vực máy giặt và sân phơi đồ chung'),
(3, 'Vệ sinh & Rác', 30000.00, 'Tháng', 'Phi thu gom rác sinh hoạt và vệ sinh hành lang'),
(4, 'Giữ xe máy', 100000.00, 'Xe/Tháng', 'Bãi để xe tầng trệt có camera an ninh');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `phong`
--

DROP TABLE IF EXISTS `phong`;
CREATE TABLE IF NOT EXISTS `phong` (
  `MaPhong` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `MaKhu` int UNSIGNED NOT NULL,
  `TenPhong` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `DienTich` decimal(8,2) NOT NULL DEFAULT '0.00',
  `Gia` decimal(12,2) NOT NULL DEFAULT '0.00',
  `TrangThai` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Trong' COMMENT 'Trong, DangThue, BaoTri',
  PRIMARY KEY (`MaPhong`),
  KEY `idx_phong_makhu` (`MaKhu`)
) ENGINE=InnoDB AUTO_INCREMENT=60002 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `phong`
--

INSERT INTO `phong` (`MaPhong`, `MaKhu`, `TenPhong`, `DienTich`, `Gia`, `TrangThai`) VALUES
(1, 1, 'P.101', 21.00, 2250000.00, 'DangThue'),
(2, 1, 'P.102', 22.00, 2300000.00, 'DangThue'),
(3, 1, 'P.103', 24.00, 2500000.00, 'DangThue'),
(4, 1, 'P.104', 18.00, 10000.00, 'DangThue'),
(5, 1, 'P.105', 22.00, 2300000.00, 'DangThue'),
(6, 1, 'P.106', 25.00, 2500000.00, 'DangThue'),
(7, 1, 'P.107', 20.00, 2200000.00, 'DangThue'),
(8, 1, 'P.108', 22.00, 2300000.00, 'DangThue'),
(9, 1, 'P.109', 20.00, 2200000.00, 'Trong'),
(10, 1, 'P.110', 22.00, 2300000.00, 'BaoTri'),
(11, 2, 'P.201', 20.00, 1900000.00, 'DangThue'),
(12, 2, 'P.202', 22.00, 2100000.00, 'DangThue'),
(13, 2, 'P.203', 25.00, 2300000.00, 'DangThue'),
(14, 2, 'P.204', 18.00, 2300000.00, 'DangThue'),
(15, 2, 'P.205', 22.00, 2200000.00, 'DangThue'),
(16, 2, 'P.206', 25.00, 2400000.00, 'DangThue'),
(17, 2, 'P.207', 20.00, 2000000.00, 'DangThue'),
(18, 2, 'P.208', 22.00, 2200000.00, 'DangThue'),
(19, 2, 'P.209', 20.00, 2500000.00, 'Trong'),
(20, 2, 'P.210', 24.00, 2300000.00, 'DangThue'),
(21, 3, 'P.301', 20.00, 2300000.00, 'DangThue'),
(22, 3, 'P.302', 22.00, 2400000.00, 'DangThue'),
(23, 3, 'P.303', 25.00, 2500000.00, 'DangThue'),
(24, 3, 'P.304', 18.00, 2100000.00, 'DangThue'),
(25, 3, 'P.305', 22.00, 2300000.00, 'DangThue'),
(26, 3, 'P.306', 25.00, 2500000.00, 'DangThue'),
(27, 3, 'P.307', 20.00, 2200000.00, 'DangThue'),
(28, 3, 'P.308', 22.00, 2400000.00, 'DangThue'),
(29, 3, 'P.309', 20.00, 2200000.00, 'DangThue'),
(30, 3, 'P.310', 22.00, 2300000.00, 'DangThue');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `thanhtoan`
--

DROP TABLE IF EXISTS `thanhtoan`;
CREATE TABLE IF NOT EXISTS `thanhtoan` (
  `MaTT` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `MaHD` int UNSIGNED NOT NULL,
  `NgayTT` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `SoTien` decimal(12,2) NOT NULL DEFAULT '0.00',
  `PhuongThuc` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ChuyenKhoan' COMMENT 'TienMat, ChuyenKhoan, ViDienTu',
  `OrderCode` bigint DEFAULT NULL,
  `MinhChung` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Đường dẫn ảnh biên lai giao dịch',
  `GhiChu` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `TrangThai` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ChoXacNhan' COMMENT 'ChoXacNhan, DaXacNhan, TuChoi',
  PRIMARY KEY (`MaTT`),
  KEY `idx_thanhtoan_mahd` (`MaHD`),
  KEY `idx_thanhtoan_ordercode` (`OrderCode`)
) ENGINE=InnoDB AUTO_INCREMENT=210002 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `thanhtoan`
--

INSERT INTO `thanhtoan` (`MaTT`, `MaHD`, `NgayTT`, `SoTien`, `PhuongThuc`, `OrderCode`, `MinhChung`, `GhiChu`, `TrangThai`) VALUES
(1, 1, '2026-10-01 09:15:00', 2680000.00, 'ChuyenKhoan', 126100101, '/uploads/bill/hd1_p101.jpg', 'P.101 chuyển khoản đủ tháng 9', 'ThanhCong'),
(2, 2, '2026-10-01 14:20:00', 2932000.00, 'ChuyenKhoan', 226100102, '/uploads/bill/hd2_p102.jpg', 'P.102 thanh toán đủ tháng 9', 'ThanhCong'),
(3, 3, '2026-10-02 10:05:00', 3294000.00, 'ChuyenKhoan', 326100203, '/uploads/bill/hd3_p103.jpg', 'P.103 thanh toán đủ tháng 9', 'ThanhCong'),
(4, 4, '2026-10-02 18:30:00', 2424000.00, 'TienMat', NULL, NULL, 'Đóng tiền mặt trực tiếp cho quản lý Trần Tuấn Nghĩa', 'ThanhCong'),
(5, 5, '2026-10-03 11:00:00', 2000000.00, 'ChuyenKhoan', 526100305, '/uploads/bill/hd5_dot1.jpg', 'P.105 đóng trước 2 triệu, xin khất phần còn lại', 'ThanhCong'),
(6, 5, '2026-10-18 20:10:00', 1015000.00, 'ChuyenKhoan', 526101806, '/uploads/bill/hd5_dot2.jpg', 'P.105 chuyển khoản nốt phần nợ tháng 9 (chờ duyệt)', 'ChoXacNhan'),
(7, 6, '2026-10-03 16:45:00', 3188000.00, 'ChuyenKhoan', 626100307, '/uploads/bill/hd6_p106.jpg', 'P.106 thanh toán đủ', 'ThanhCong'),
(8, 7, '2026-10-04 08:50:00', 2624000.00, 'ChuyenKhoan', 726100408, '/uploads/bill/hd7_p107.jpg', 'P.107 thanh toán đủ', 'ThanhCong'),
(9, 8, '2026-10-04 19:00:00', 1500000.00, 'ChuyenKhoan', 826100409, '/uploads/bill/hd8_dot1.jpg', 'P.108 đóng đợt 1', 'ThanhCong'),
(10, 9, '2026-10-01 10:00:00', 2324000.00, 'ChuyenKhoan', 926100110, '/uploads/bill/hd9_p201.jpg', 'P.201 thanh toán đủ', 'ThanhCong'),
(11, 10, '2026-10-02 09:30:00', 2695000.00, 'ChuyenKhoan', 1026100211, '/uploads/bill/hd10_p202.jpg', 'P.202 thanh toán đủ', 'ThanhCong'),
(12, 11, '2026-10-02 15:10:00', 3068000.00, 'ChuyenKhoan', 1126100212, '/uploads/bill/hd11_p203.jpg', 'P.203 thanh toán đủ', 'ThanhCong'),
(13, 12, '2026-10-03 12:00:00', 2305000.00, 'TienMat', NULL, NULL, 'P.204 đóng tiền mặt cho quản lý Phạm Văn Nhật Nguyên', 'ThanhCong'),
(14, 13, '2026-10-05 17:20:00', 1776000.00, 'ChuyenKhoan', 1326100514, '/uploads/bill/hd13_dot1.jpg', 'P.205 đóng trước 1.776.000đ', 'ThanhCong'),
(15, 14, '2026-10-03 20:00:00', 3070000.00, 'ChuyenKhoan', 1426100315, '/uploads/bill/hd14_p206.jpg', 'P.206 thanh toán đủ', 'ThanhCong'),
(16, 15, '2026-10-10 21:00:00', 2405000.00, 'ChuyenKhoan', 1526101016, '/uploads/bill/hd15_anh_loi.jpg', 'Ảnh biên lai bị mờ và chưa nhận được tiền vào TK', 'TuChoi'),
(17, 16, '2026-10-04 11:30:00', 2907000.00, 'ChuyenKhoan', 1626100417, '/uploads/bill/hd16_p208.jpg', 'P.208 thanh toán đủ', 'ThanhCong'),
(18, 17, '2026-10-04 16:00:00', 3025000.00, 'ChuyenKhoan', 1726100418, '/uploads/bill/hd17_p210.jpg', 'P.210 thanh toán đủ', 'ThanhCong'),
(19, 18, '2026-10-01 08:30:00', 2780000.00, 'ChuyenKhoan', 1826100119, '/uploads/bill/hd18_p301.jpg', 'P.301 thanh toán đủ', 'ThanhCong'),
(20, 19, '2026-10-02 13:45:00', 2995000.00, 'ChuyenKhoan', 1926100220, '/uploads/bill/hd19_p302.jpg', 'P.302 thanh toán đủ', 'ThanhCong'),
(21, 20, '2026-10-05 10:20:00', 2307000.00, 'ChuyenKhoan', 2026100521, '/uploads/bill/hd20_dot1.jpg', 'P.303 thanh toán đợt 1', 'ThanhCong'),
(22, 21, '2026-10-03 09:00:00', 2524000.00, 'ChuyenKhoan', 2126100322, '/uploads/bill/hd21_p304.jpg', 'P.304 thanh toán đủ', 'ThanhCong'),
(23, 22, '2026-10-03 19:30:00', 2876000.00, 'ChuyenKhoan', 2226100323, '/uploads/bill/hd22_p305.jpg', 'P.305 thanh toán đủ', 'ThanhCong'),
(24, 23, '2026-10-04 14:15:00', 3151000.00, 'ChuyenKhoan', 2326100424, '/uploads/bill/hd23_p306.jpg', 'P.306 thanh toán đủ', 'ThanhCong'),
(25, 25, '2026-10-04 18:00:00', 3051000.00, 'ChuyenKhoan', 2526100425, '/uploads/bill/hd25_p308.jpg', 'P.308 thanh toán đủ', 'ThanhCong'),
(26, 26, '2026-10-19 08:30:00', 2699000.00, 'ChuyenKhoan', 2626101926, '/uploads/bill/hd26_p101_t10.jpg', 'P.101 thanh toán sớm hóa đơn tháng 10', 'ThanhCong'),
(27, 27, '2026-10-19 10:15:00', 2951000.00, 'ChuyenKhoan', 2726101927, '/uploads/bill/hd27_p102_t10.jpg', 'P.102 vừa chuyển khoản tháng 10, chờ duyệt | Quản lý đã từ chối giao dịch', 'TuChoi'),
(28, 29, '2026-10-19 09:00:00', 2361000.00, 'ChuyenKhoan', 2926101928, '/uploads/bill/hd29_p201_t10.jpg', 'P.201 thanh toán đủ tháng 10', 'ThanhCong'),
(29, 30, '2026-10-19 11:00:00', 1500000.00, 'ChuyenKhoan', 3026101929, '/uploads/bill/hd30_p202_dot1.jpg', 'P.202 thanh toán đợt 1 tháng 10', 'ThanhCong'),
(30, 32, '2026-10-19 09:45:00', 2780000.00, 'ChuyenKhoan', 3226101930, '/uploads/bill/hd32_p301_t10.jpg', 'P.301 thanh toán đủ tháng 10', 'ThanhCong'),
(30002, 27, '2026-11-01 11:06:43', 2951000.00, 'ChuyenKhoan', 271202644, '271202644', '[PAYOS:271202644] Tự động xác thực HDT7 HD27 P102 | Quản lý đã từ chối giao dịch', 'TuChoi'),
(30003, 27, '2026-11-01 11:06:44', 2951000.00, 'ChuyenKhoan', 271203547, '271203547', '[PAYOS:271203547] Tự động xác thực HDT7 HD27 P102 | Quản lý đã từ chối giao dịch', 'TuChoi'),
(60002, 28, '2026-11-02 21:42:03', 3300000.00, 'ChuyenKhoan', 285721817, '285721817', '[PAYOS:285721817] Tự động xác thực HDT8 HD28 P103 | Quản lý đã từ chối giao dịch', 'TuChoi'),
(60003, 28, '2026-11-02 21:42:04', 3300000.00, 'ChuyenKhoan', 285722191, '285722191', '[PAYOS:285722191] Tự động xác thực HDT8 HD28 P103 | Quản lý đã từ chối giao dịch', 'TuChoi'),
(90002, 28, '2026-11-07 11:26:02', 3300000.00, 'ChuyenKhoan', 280761920, '280761920', '[PAYOS:280761920] Tự động xác thực HDT8 HD28 P103 | Quản lý đã từ chối giao dịch', 'TuChoi'),
(120002, 27, '2026-11-10 10:50:24', 2951000.00, 'ChuyenKhoan', 277824532, '277824532', '[PAYOS:277824532] Tự động xác thực HDT7 HD27 P102 | Quản lý đã từ chối giao dịch', 'TuChoi'),
(120003, 27, '2026-11-10 10:55:22', 2951000.00, 'ChuyenKhoan', 278122250, '278122250', '[PAYOS:278122250] Tự động xác thực HDT7 HD27 P102 | Quản lý đã từ chối giao dịch | Quản lý đã từ chối giao dịch', 'TuChoi'),
(120004, 28, '2026-11-10 10:56:08', 3300000.00, 'ChuyenKhoan', 288168500, '288168500', '[PAYOS:288168500] Tự động xác thực HDT8 HD28 P103 | Quản lý đã từ chối giao dịch', 'TuChoi'),
(120005, 27, '2026-11-10 10:58:10', 2951000.00, 'ChuyenKhoan', 278290760, '278290760', '[PAYOS:278290760] Tự động xác thực HDT7 HD27 P102 | Quản lý đã từ chối giao dịch', 'TuChoi'),
(150002, 27, '2026-11-10 14:41:50', 2951000.00, 'ChuyenKhoan', 271710291, '271710291', '[PAYOS:271710291] Tự động xác thực HDT7 HD27 P102 | Quản lý đã từ chối giao dịch', 'TuChoi'),
(150003, 30012, '2026-11-10 14:54:09', 10000.00, 'ChuyenKhoan', 300122215294, 'FT26314050972576', '[PAYOS:300122215294] Tự động xác thực HDT9 HD30012 P104 | Đã xác thực tự động qua PayOS (Mã GD: FT26314050972576)', 'ThanhCong'),
(180002, 30010, '2026-11-13 06:51:34', 2730000.00, 'ChuyenKhoan', 300102694682, '300102694682', '[PAYOS:300102694682] Tự động xác thực HDT13 HD30010 P108', 'ChoXacNhan');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `theravao`
--

DROP TABLE IF EXISTS `theravao`;
CREATE TABLE IF NOT EXISTS `theravao` (
  `MaThe` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `MaND` int UNSIGNED NOT NULL,
  `GiaTri` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Mã UID/RFID của thẻ từ',
  `NgayTao` date NOT NULL,
  `TrangThai` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'HoatDong' COMMENT 'HoatDong, BiKhoa, ThuHoi',
  `GhiChu` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`MaThe`),
  UNIQUE KEY `GiaTri` (`GiaTri`),
  KEY `idx_theravao_mand` (`MaND`)
) ENGINE=InnoDB AUTO_INCREMENT=30002 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `theravao`
--

INSERT INTO `theravao` (`MaThe`, `MaND`, `GiaTri`, `NgayTao`, `TrangThai`, `GhiChu`) VALUES
(1, 2, 'RFID-QL-0002', '2025-01-01', 'HoatDong', 'Thẻ quản lý Khu 1 - Trần Tuấn Nghĩa'),
(2, 3, 'RFID-QL-0003', '2025-01-01', 'HoatDong', 'Thẻ quản lý Khu 2 - Phạm Văn Nhật Nguyên'),
(3, 4, 'RFID-QL-0004', '2025-01-01', 'HoatDong', 'Thẻ quản lý Khu 3 - Lê Hoàng Nam'),
(4, 5, 'RFID-K1-0005', '2025-01-05', 'HoatDong', 'Khách ở lâu năm P.101'),
(5, 6, 'RFID-K1-0006', '2025-02-01', 'HoatDong', 'Khách ở lâu năm P.102'),
(6, 7, 'RFID-K1-0007', '2025-02-01', 'HoatDong', 'Khách ở lâu năm P.102'),
(7, 8, 'RFID-K1-0008A', '2026-01-10', 'BiKhoa', 'Khách Phạm Thị Minh Thư báo rơi mất thẻ ngày 15/09/2026'),
(8, 8, 'RFID-K1-0008B', '2026-09-16', 'HoatDong', 'Thẻ cấp lại lần 2 cho Phạm Thị Minh Thư (P.103)'),
(9, 9, 'RFID-K1-0009', '2026-01-10', 'HoatDong', 'Thẻ thành viên P.103'),
(10, 10, 'RFID-K1-0010', '2026-10-05', 'HoatDong', 'Thẻ cấp cho Hoàng Minh Hiếu mới ghép vào P.103'),
(11, 11, 'RFID-K1-0011', '2026-02-01', 'HoatDong', 'Thẻ P.104'),
(12, 12, 'RFID-K1-0012', '2026-02-15', 'HoatDong', 'Thẻ P.105'),
(13, 13, 'RFID-K1-0013', '2026-02-15', 'HoatDong', 'Thẻ P.105'),
(14, 14, 'RFID-K1-0014', '2026-03-01', 'HoatDong', 'Thẻ P.106'),
(15, 15, 'RFID-K1-0015', '2026-03-01', 'HoatDong', 'Thẻ P.106'),
(16, 16, 'RFID-K1-0016', '2026-10-08', 'HoatDong', 'Thẻ cấp cho Phan Văn Kiệt mới ghép vào P.106'),
(17, 17, 'RFID-K1-0017', '2026-03-10', 'HoatDong', 'Thẻ P.107'),
(18, 18, 'RFID-K1-0018', '2026-04-01', 'HoatDong', 'Thẻ P.108'),
(19, 19, 'RFID-K1-0019', '2026-04-01', 'HoatDong', 'Thẻ P.108'),
(20, 20, 'RFID-K1-0020', '2026-04-01', 'ThuHoi', 'Đã thu hồi do Mai Quốc Huy chuyển đi trước (P.108)'),
(21, 21, 'RFID-K1-0021', '2025-09-01', 'ThuHoi', 'Đã thu hồi khi trả phòng P.109'),
(22, 22, 'RFID-K1-0022', '2025-10-01', 'ThuHoi', 'Đã thu hồi khi trả phòng P.110'),
(23, 23, 'RFID-K1-0023', '2025-10-01', 'ThuHoi', 'Đã thu hồi khi trả phòng P.110'),
(24, 24, 'RFID-K2-0024', '2025-01-10', 'HoatDong', 'Khách ở lâu năm P.201'),
(25, 25, 'RFID-K2-0025', '2025-03-01', 'HoatDong', 'Khách ở lâu năm P.202'),
(26, 26, 'RFID-K2-0026', '2025-03-01', 'HoatDong', 'Khách ở lâu năm P.202'),
(27, 27, 'RFID-K2-0027', '2026-01-15', 'HoatDong', 'Thẻ P.203'),
(28, 28, 'RFID-K2-0028', '2026-01-15', 'HoatDong', 'Thẻ P.203'),
(29, 29, 'RFID-K2-0029', '2026-10-02', 'HoatDong', 'Thẻ thành viên mới ghép P.203'),
(30, 30, 'RFID-K2-0030', '2026-02-01', 'HoatDong', 'Thẻ P.204'),
(31, 31, 'RFID-K2-0031', '2026-02-20', 'HoatDong', 'Thẻ P.205'),
(32, 32, 'RFID-K2-0032', '2026-02-20', 'HoatDong', 'Thẻ P.205'),
(33, 33, 'RFID-K2-0033', '2026-03-05', 'HoatDong', 'Thẻ P.206'),
(34, 34, 'RFID-K2-0034', '2026-03-05', 'HoatDong', 'Thẻ P.206'),
(35, 35, 'RFID-K2-0035', '2026-03-05', 'ThuHoi', 'Thu hồi do Vũ Quốc Cường (P.206) chuyển đi ngày 31/08/2026'),
(36, 36, 'RFID-K2-0036', '2026-04-01', 'HoatDong', 'Thẻ P.207'),
(37, 37, 'RFID-K2-0037', '2026-04-10', 'HoatDong', 'Thẻ P.208'),
(38, 38, 'RFID-K2-0038', '2026-10-10', 'HoatDong', 'Thẻ thành viên mới ghép P.208'),
(39, 39, 'RFID-K2-0039', '2025-08-01', 'ThuHoi', 'Đã thu hồi khi trả phòng P.209'),
(40, 40, 'RFID-K2-0040', '2025-08-01', 'ThuHoi', 'Đã thu hồi khi trả phòng P.209'),
(41, 41, 'RFID-K2-0041', '2026-05-01', 'HoatDong', 'Thẻ P.210'),
(42, 42, 'RFID-K2-0042', '2026-05-01', 'HoatDong', 'Thẻ P.210'),
(43, 43, 'RFID-K2-0043', '2026-05-01', 'HoatDong', 'Thẻ P.210'),
(44, 44, 'RFID-K3-0044', '2025-02-01', 'HoatDong', 'Khách ở lâu năm P.301'),
(45, 45, 'RFID-K3-0045', '2026-01-01', 'HoatDong', 'Thẻ P.302'),
(46, 46, 'RFID-K3-0046', '2026-01-01', 'HoatDong', 'Thẻ P.302'),
(47, 47, 'RFID-K3-0047', '2026-02-01', 'HoatDong', 'Thẻ P.303'),
(48, 48, 'RFID-K3-0048', '2026-02-01', 'HoatDong', 'Thẻ P.303'),
(49, 49, 'RFID-K3-0049', '2026-10-12', 'HoatDong', 'Thẻ thành viên mới ghép P.303'),
(50, 50, 'RFID-K3-0050', '2026-03-01', 'HoatDong', 'Thẻ P.304'),
(51, 51, 'RFID-K3-0051', '2026-03-15', 'HoatDong', 'Thẻ P.305'),
(52, 52, 'RFID-K3-0052', '2026-03-15', 'HoatDong', 'Thẻ P.305'),
(53, 53, 'RFID-K3-0053', '2026-04-01', 'HoatDong', 'Thẻ P.306'),
(54, 54, 'RFID-K3-0054', '2026-04-01', 'HoatDong', 'Thẻ P.306'),
(55, 55, 'RFID-K3-0055', '2026-04-01', 'ThuHoi', 'Thu hồi do Trương Minh Khang (P.306) dọn đi riêng'),
(56, 56, 'RFID-K3-0056', '2026-05-01', 'HoatDong', 'Thẻ P.307'),
(57, 57, 'RFID-K3-0057', '2026-05-10', 'HoatDong', 'Thẻ P.308'),
(58, 58, 'RFID-K3-0058', '2026-05-10', 'HoatDong', 'Thẻ P.308'),
(59, 59, 'RFID-K3-0059', '2026-10-14', 'HoatDong', 'Thẻ thành viên mới ghép P.308'),
(60, 60, 'RFID-K3-0060', '2025-09-01', 'ThuHoi', 'Thu hồi do trả phòng P.309'),
(61, 61, 'RFID-K3-0061', '2025-11-01', 'ThuHoi', 'Thu hồi do trả phòng P.310'),
(62, 62, 'RFID-K3-0062', '2025-11-01', 'ThuHoi', 'Thu hồi do trả phòng P.310');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `thongbao`
--

DROP TABLE IF EXISTS `thongbao`;
CREATE TABLE IF NOT EXISTS `thongbao` (
  `MaTB` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `MaTBGoc` int UNSIGNED DEFAULT NULL,
  `NDGui` int UNSIGNED NOT NULL,
  `MaLTB` int UNSIGNED NOT NULL,
  `TieuDe` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `NoiDung` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `NgayGui` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`MaTB`),
  KEY `idx_thongbao_matbgoc` (`MaTBGoc`),
  KEY `idx_thongbao_ndgui` (`NDGui`),
  KEY `idx_thongbao_maltb` (`MaLTB`)
) ENGINE=InnoDB AUTO_INCREMENT=150002 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `thongbao`
--

INSERT INTO `thongbao` (`MaTB`, `MaTBGoc`, `NDGui`, `MaLTB`, `TieuDe`, `NoiDung`, `NgayGui`) VALUES
(1, NULL, 1, 1, 'Thông báo kiểm tra thiết bị PCCC định kỳ tháng 10/2026', 'Chủ trọ Nguyễn Thị Quỳnh Dư phối hợp cùng quản lý 3 cơ sở kiểm tra bình chữa cháy và lối thoát hiểm vào 09:00 sáng Chủ Nhật tuần này.', '2026-10-10 08:00:00'),
(2, NULL, 2, 3, 'Nhắc nhở bổ sung hồ sơ gia hạn tạm trú Khu 1', 'Các bạn ở P.102 (Lê Văn Hải), P.104 (Bùi Gia Bảo), P.108 (Lâm Thị Kim Ngân) đã hết hạn tạm trú, vui lòng gửi ảnh CCCD/VNeID để quản lý Trần Tuấn Nghĩa làm thủ tục gia hạn.', '2026-10-12 09:30:00'),
(3, 2, 11, 3, 'Re: Nhắc nhở bổ sung hồ sơ gia hạn tạm trú Khu 1', 'Mình ở P.104 đã cập nhật thông tin trên VNeID rồi, nhờ Nghĩa kiểm tra giúp mình nhé.', '2026-10-12 10:15:00'),
(4, NULL, 2, 3, 'Xác nhận hoàn tất đăng ký tạm trú cho thành viên mới ghép phòng', 'Quản lý Trần Tuấn Nghĩa đã tiếp nhận hồ sơ của bạn Hoàng Minh Hiếu (mới ghép vào P.103) và Phan Văn Kiệt (mới ghép vào P.106).', '2026-10-13 14:00:00'),
(5, NULL, 3, 3, 'Thông báo đã gia hạn tạm trú thành công Khu 2', 'Quản lý Phạm Văn Nhật Nguyên thông báo: Các phòng P.201, P.202, P.205, P.210 đã được Công an xã Hưng Long duyệt gia hạn tạm trú thêm 1 năm.', '2026-10-14 15:20:00'),
(6, NULL, 12, 4, 'Báo hỏng vòi sen phòng P.105', 'Nghĩa ơi, vòi sen phòng 105 bị rỉ nước mạnh ở khớp nối, nhờ bạn báo thợ lên thay giúp phòng mình nhé.', '2026-09-25 18:00:00'),
(7, 6, 2, 4, 'Re: Báo hỏng vòi sen phòng P.105', 'Ok bạn, sáng mai 8h30 mình mang vòi mới lên thay cho phòng 105 nhé.', '2026-09-25 18:15:00'),
(8, NULL, 3, 2, 'Nhắc thanh toán công nợ hóa đơn tháng 09/2026', 'Phòng P.205 (còn thiếu 1.000.000đ) và P.207 (chưa thanh toán) vui lòng hoàn tất thanh toán sớm nhé.', '2026-10-15 09:00:00'),
(9, NULL, 4, 2, 'Thông báo đã có hóa đơn điện nước tháng 10/2026 Khu 3', 'Quản lý Lê Hoàng Nam đã chốt chỉ số điện nước và lập hóa đơn tháng 10, các phòng kiểm tra trên hệ thống nhé.', '2026-10-18 17:00:00'),
(10, NULL, 63, 5, 'Hỏi thuê phòng P.109 Khu 1 Tạ Quang Bửu', 'Chào bạn, mình thấy tin đăng phòng P.109 giá 2,2 triệu đang trống, chiều mai 17h mình ghé xem phòng được không?', '2026-10-18 19:30:00'),
(11, 10, 2, 5, 'Re: Hỏi thuê phòng P.109 Khu 1 Tạ Quang Bửu', 'Chào Khang, phòng P.109 vẫn còn trống nhé. Chiều mai 17h bạn ghé số 854 Tạ Quang Bửu gọi số 0931493785 mình (Nghĩa) dẫn lên xem phòng.', '2026-10-18 19:45:00'),
(12, NULL, 64, 5, 'Hỏi phòng trống Khu 2 Bình Chánh dưới 2,1 triệu', 'Chào Nguyên, bên Khu 2 Hưng Long còn phòng nào giá khoảng 2 triệu ở được 2 người không ạ?', '2026-10-19 08:15:00'),
(30002, 12, 3, 5, 'Phản hồi: Hỏi phòng trống Khu 2 Bình Chánh dưới 2,1 triệu', 'được em', '2026-10-27 04:00:04'),
(30003, 12, 3, 5, 'Phản hồi: Hỏi phòng trống Khu 2 Bình Chánh dưới 2,1 triệu', 'được em', '2026-10-27 04:01:09'),
(30004, 1, 3, 1, 'Phản hồi: Thông báo kiểm tra thiết bị PCCC định kỳ tháng 10/2026', 'Dạ', '2026-10-27 04:05:12'),
(30005, 12, 3, 5, 'Phản hồi: Hỏi phòng trống Khu 2 Bình Chánh dưới 2,1 triệu', 'ở 2 người được em', '2026-10-27 04:09:19'),
(30006, 12, 3, 5, 'Phản hồi: Hỏi phòng trống Khu 2 Bình Chánh dưới 2,1 triệu', 'ở 2 người được em', '2026-10-27 04:09:25'),
(60002, 12, 3, 5, 'Phản hồi: Hỏi phòng trống Khu 2 Bình Chánh dưới 2,1 triệu', 'ở 2 người thoải mái em', '2026-10-27 04:21:02'),
(60003, 12, 3, 5, 'Phản hồi: Hỏi phòng trống Khu 2 Bình Chánh dưới 2,1 triệu', 'ok em', '2026-10-27 04:25:12'),
(60004, 1, 3, 1, 'Phản hồi: Thông báo kiểm tra thiết bị PCCC định kỳ tháng 10/2026', 'dạ', '2026-10-27 04:26:11'),
(60005, 12, 3, 5, 'Phản hồi: Hỏi phòng trống Khu 2 Bình Chánh dưới 2,1 triệu', 'ok', '2026-10-27 04:29:39'),
(90002, NULL, 5, 4, '[P.101 - Xóm Trọ Cơ sở 1 - Tạ Quang Bửu] Hư máy lạnh', 'máy lạnh không chạy', '2026-10-31 04:02:06'),
(90003, 12, 64, 5, 'Phản hồi: Hỏi phòng trống Khu 2 Bình Chánh dưới 2,1 triệu', 'dạ', '2026-10-31 04:09:03'),
(120002, 90002, 5, 4, 'Re: [P.101 - Xóm Trọ Cơ sở 1 - Tạ Quang Bửu] Hư máy lạnh', 'sưa máy lạnh', '2026-11-07 02:15:38');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `thongtincanhan`
--

DROP TABLE IF EXISTS `thongtincanhan`;
CREATE TABLE IF NOT EXISTS `thongtincanhan` (
  `MaTT` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `MaND` int UNSIGNED NOT NULL,
  `HoTen` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `GioiTinh` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Nam' COMMENT 'Nam, Nữ, Khác',
  `NamSinh` int DEFAULT NULL,
  `CCCD` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `NgayCap` date DEFAULT NULL,
  `NoiCap` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Cục Cảnh sát QLHC về TTXH',
  `SDT` varchar(15) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `Email` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `DiaChi` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `NgheNghiep` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`MaTT`),
  UNIQUE KEY `uk_ttcn_mand` (`MaND`),
  UNIQUE KEY `uk_ttcn_sdt` (`SDT`),
  UNIQUE KEY `uk_ttcn_cccd` (`CCCD`),
  UNIQUE KEY `uk_ttcn_email` (`Email`)
) ENGINE=InnoDB AUTO_INCREMENT=439496 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `thongtincanhan`
--

INSERT INTO `thongtincanhan` (`MaTT`, `MaND`, `HoTen`, `GioiTinh`, `NamSinh`, `CCCD`, `NgayCap`, `NoiCap`, `SDT`, `Email`, `DiaChi`, `NgheNghiep`) VALUES
(1, 1, 'Nguyễn Thị Quỳnh Dư', 'Nữ', 1985, '079185001001', '2021-05-17', 'Cục Cảnh sát QLHC về TTXH', '0903112233', 'quynhdu.nguyenthi@gmail.com', 'Quận 8, TP.HCM', 'Chủ hệ thống nhà trọ'),
(2, 2, 'Trần Tuấn Nghĩa', 'Nam', 2004, '079204001002', '2021-05-24', 'Cục Cảnh sát QLHC về TTXH', '0931493785', 'tuannghia123441@gmail.com', 'Bình Chánh, TP.HCM', 'Quản lý cơ sở'),
(3, 3, 'Phạm Văn Nhật Nguyên', 'Nam', 2004, '079204001003', '2021-05-31', 'Cục Cảnh sát QLHC về TTXH', '0383193961', 'phamvannhatnguyen@gmail.com', 'Bình Chánh, TP.HCM', 'Quản lý cơ sở'),
(4, 4, 'Lê Hoàng Nam', 'Nam', 1999, '079099001004', '2021-06-07', 'Cục Cảnh sát QLHC về TTXH', '0908451236', 'lehoangnam99@gmail.com', 'Quận 7, TP.HCM', 'Quản lý cơ sở'),
(5, 5, 'Nguyễn Minh Khôi', 'Nam', 2002, '079202000005', '2021-06-14', 'Cục Cảnh sát QLHC về TTXH', '0912000005', 'minhkhoi.nguyen02@gmail.com', 'Tiền Giang', 'Nhân viên văn phòng'),
(6, 6, 'Trần Quốc Đạt', 'Nam', 2003, '079203000006', '2021-06-21', 'Cục Cảnh sát QLHC về TTXH', '0912000006', 'quocdat.tran03@gmail.com', 'Long An', 'Sinh viên'),
(7, 7, 'Lê Văn Hải', 'Nam', 2001, '079201000007', '2021-06-28', 'Cục Cảnh sát QLHC về TTXH', '0912000007', 'vanhai.le01@gmail.com', 'Bến Tre', 'Nhân viên văn phòng'),
(8, 8, 'Phạm Thị Minh Thư', 'Nữ', 2003, '079203000008', '2021-07-05', 'Cục Cảnh sát QLHC về TTXH', '0912000008', 'minhthu.pham03@gmail.com', 'Đồng Tháp', 'Sinh viên'),
(9, 9, 'Võ Thị Ngọc Trâm', 'Nữ', 2000, '079200000009', '2021-07-12', 'Cục Cảnh sát QLHC về TTXH', '0912000009', 'ngoctram.vo00@gmail.com', 'Vĩnh Long', 'Nhân viên văn phòng'),
(10, 10, 'Hoàng Minh Hiếu', 'Nam', 2004, '079204000010', '2021-07-19', 'Cục Cảnh sát QLHC về TTXH', '0912000010', 'minhhieu.hoang04@gmail.com', 'Cần Thơ', 'Sinh viên'),
(11, 11, 'Bùi Gia Bảo', 'Nam', 2004, '079204000011', '2021-07-26', 'Cục Cảnh sát QLHC về TTXH', '0912000011', 'giabao.bui04@gmail.com', 'An Giang', 'Sinh viên'),
(12, 12, 'Đỗ Thanh Tâm', 'Nữ', 1999, '079199000012', '2021-08-02', 'Cục Cảnh sát QLHC về TTXH', '0912000012', 'thanhtam.do99@gmail.com', 'Tây Ninh', 'Nhân viên văn phòng'),
(13, 13, 'Ngô Thị Ngọc Ánh', 'Nữ', 2001, '079201000013', '2021-08-09', 'Cục Cảnh sát QLHC về TTXH', '0912000013', 'ngocanh.ngo01@gmail.com', 'Bình Dương', 'Nhân viên văn phòng'),
(14, 14, 'Lý Đức Thịnh', 'Nữ', 2002, '079202000014', '2021-08-16', 'Cục Cảnh sát QLHC về TTXH', '0912000014', 'ducthinh.ly02@gmail.com', 'Đồng Nai', 'Nhân viên văn phòng'),
(15, 15, 'Trương Thanh Thảo', 'Nữ', 2003, '079203000015', '2021-08-23', 'Cục Cảnh sát QLHC về TTXH', '0912000015', 'thanhthao.truong03@gmail.com', 'Bà Rịa - Vũng Tàu', 'Sinh viên'),
(16, 16, 'Phan Văn Kiệt', 'Nam', 2005, '079205000016', '2021-08-30', 'Cục Cảnh sát QLHC về TTXH', '0912000016', 'vankiet.phan05@gmail.com', 'Trà Vinh', 'Sinh viên'),
(17, 17, 'Vũ Thị Mỹ Linh', 'Nữ', 2002, '079202000017', '2021-09-06', 'Cục Cảnh sát QLHC về TTXH', '0912000017', 'mylinh.vu02@gmail.com', 'Sóc Trăng', 'Nhân viên văn phòng'),
(18, 18, 'Đinh Đình Khoa', 'Nam', 2000, '079200000018', '2021-09-13', 'Cục Cảnh sát QLHC về TTXH', '0912000018', 'dinhkhoa.dinh00@gmail.com', 'Bình Thuận', 'Nhân viên văn phòng'),
(19, 19, 'Lâm Thị Kim Ngân', 'Nữ', 2001, '079201000019', '2021-09-20', 'Cục Cảnh sát QLHC về TTXH', '0912000019', 'kimngan.lam01@gmail.com', 'Khánh Hòa', 'Nhân viên văn phòng'),
(20, 20, 'Mai Quốc Huy', 'Nữ', 2004, '079204000020', '2021-09-27', 'Cục Cảnh sát QLHC về TTXH', '0912000020', 'quochuy.mai04@gmail.com', 'Lâm Đồng', 'Sinh viên'),
(21, 21, 'Trịnh Thị Yến Nhi', 'Nữ', 1998, '079198000021', '2021-10-04', 'Cục Cảnh sát QLHC về TTXH', '0912000021', 'yennhi.trinh98@gmail.com', 'Kiên Giang', 'Nhân viên văn phòng'),
(22, 22, 'Hồ Minh Quân', 'Nam', 1999, '079199000022', '2021-10-11', 'Cục Cảnh sát QLHC về TTXH', '0912000022', 'minhquan.ho99@gmail.com', 'Cà Mau', 'Nhân viên văn phòng'),
(23, 23, 'Lương Thanh Tùng', 'Nam', 2000, '079200000023', '2021-10-18', 'Cục Cảnh sát QLHC về TTXH', '0912000023', 'thanhtung.luong00@gmail.com', 'Bạc Liêu', 'Nhân viên văn phòng'),
(24, 24, 'Châu Thế Hiển', 'Nam', 1999, '079199000024', '2021-10-25', 'Cục Cảnh sát QLHC về TTXH', '0912000024', 'thehien.chau99@gmail.com', 'Tiền Giang', 'Nhân viên văn phòng'),
(25, 25, 'Kiều Thị Tuyết Mai', 'Nữ', 2001, '079201000025', '2021-11-01', 'Cục Cảnh sát QLHC về TTXH', '0912000025', 'tuyetmai.kieu01@gmail.com', 'Long An', 'Nhân viên văn phòng'),
(26, 26, 'Đoàn Minh Tuấn', 'Nam', 2002, '079202000026', '2021-11-08', 'Cục Cảnh sát QLHC về TTXH', '0912000026', 'minhtuan.doan02@gmail.com', 'Bến Tre', 'Nhân viên văn phòng'),
(27, 27, 'Nguyễn Trọng Nhân', 'Nam', 2003, '079203000027', '2021-11-15', 'Cục Cảnh sát QLHC về TTXH', '0912000027', 'trongnhan.nguyen03@gmail.com', 'Đồng Tháp', 'Sinh viên'),
(28, 28, 'Hà Quốc Khánh', 'Nam', 2000, '079200000028', '2021-11-22', 'Cục Cảnh sát QLHC về TTXH', '0912000028', 'quockhanh.ha00@gmail.com', 'Vĩnh Long', 'Nhân viên văn phòng'),
(29, 29, 'Bùi Đức Duy', 'Nam', 2004, '079204000029', '2021-11-29', 'Cục Cảnh sát QLHC về TTXH', '0912000029', 'ducduy.bui04@gmail.com', 'Cần Thơ', 'Sinh viên'),
(30, 30, 'Trần Đình Trung', 'Nam', 2001, '079201000030', '2021-12-06', 'Cục Cảnh sát QLHC về TTXH', '0912000030', 'dinhtrung.tran01@gmail.com', 'An Giang', 'Nhân viên văn phòng'),
(31, 31, 'Đỗ Hoàng Long', 'Nam', 2002, '079202000031', '2021-12-13', 'Cục Cảnh sát QLHC về TTXH', '0912000031', 'hoanglong.do02@gmail.com', 'Tây Ninh', 'Nhân viên văn phòng'),
(32, 32, 'Phan Minh Tâm', 'Nữ', 2000, '079200000032', '2021-12-20', 'Cục Cảnh sát QLHC về TTXH', '0912000032', 'minhtam.phan00@gmail.com', 'Bình Dương', 'Nhân viên văn phòng'),
(33, 33, 'Nguyễn Công Thành', 'Nam', 2005, '079205000033', '2021-12-27', 'Cục Cảnh sát QLHC về TTXH', '0912000033', 'congthanh.nguyen05@gmail.com', 'Nghệ An', 'Sinh viên'),
(34, 34, 'Lương Xuân Bách', 'Nam', 1999, '079199000034', '2022-01-03', 'Cục Cảnh sát QLHC về TTXH', '0912000034', 'xuanbach.luong99@gmail.com', 'Gia Lai', 'Nhân viên văn phòng'),
(35, 35, 'Vũ Quốc Cường', 'Nam', 2001, '079201000035', '2022-01-10', 'Cục Cảnh sát QLHC về TTXH', '0912000035', 'quoccuong.vu01@gmail.com', 'Lâm Đồng', 'Nhân viên văn phòng'),
(36, 36, 'Nguyễn Hồng Phúc', 'Nam', 2002, '079202000036', '2022-01-17', 'Cục Cảnh sát QLHC về TTXH', '0912000036', 'hongphuc.nguyen02@gmail.com', 'Đắk Lắk', 'Nhân viên văn phòng'),
(37, 37, 'Trần Nhật Minh', 'Nam', 2003, '079203000037', '2022-01-24', 'Cục Cảnh sát QLHC về TTXH', '0912000037', 'nhatminh.tran03@gmail.com', 'Bình Phước', 'Sinh viên'),
(38, 38, 'Lê Tuấn Anh', 'Nam', 2004, '079204000038', '2022-01-31', 'Cục Cảnh sát QLHC về TTXH', '0912000038', 'tuananh.le04@gmail.com', 'Ninh Thuận', 'Sinh viên'),
(39, 39, 'Phạm Hữu Nghĩa', 'Nam', 1998, '079198000039', '2022-02-07', 'Cục Cảnh sát QLHC về TTXH', '0912000039', 'huunghia.pham98@gmail.com', 'Phú Yên', 'Nhân viên văn phòng'),
(40, 40, 'Võ Thành Đạt', 'Nam', 1997, '079197000040', '2022-02-14', 'Cục Cảnh sát QLHC về TTXH', '0912000040', 'thanhdat.vo97@gmail.com', 'Bình Định', 'Nhân viên văn phòng'),
(41, 41, 'Hoàng Minh Đức', 'Nam', 2002, '079202000041', '2022-02-21', 'Cục Cảnh sát QLHC về TTXH', '0912000041', 'minhduc.hoang02@gmail.com', 'Bình Dương', 'Nhân viên văn phòng'),
(42, 42, 'Đặng Gia Hưng', 'Nam', 2003, '079203000042', '2022-02-28', 'Cục Cảnh sát QLHC về TTXH', '0912000042', 'giahung.dang03@gmail.com', 'Hải Dương', 'Sinh viên'),
(43, 43, 'Ngô Tấn Phát', 'Nam', 1998, '079198000043', '2022-03-07', 'Cục Cảnh sát QLHC về TTXH', '0912000043', 'tanphat.ngo98@gmail.com', 'TP.HCM', 'Nhân viên văn phòng'),
(44, 44, 'Trần Thị Thảo Vy', 'Nữ', 2002, '079202000044', '2022-03-14', 'Cục Cảnh sát QLHC về TTXH', '0912000044', 'thaovy.tran02@gmail.com', 'Quảng Nam', 'Nhân viên văn phòng'),
(45, 45, 'Đỗ Thị Thùy Linh', 'Nữ', 2000, '079200000045', '2022-03-21', 'Cục Cảnh sát QLHC về TTXH', '0912000045', 'thuylinh.do00@gmail.com', 'Hà Nội', 'Nhân viên văn phòng'),
(46, 46, 'Lương Thị Cẩm Tú', 'Nữ', 2003, '079203000046', '2022-03-28', 'Cục Cảnh sát QLHC về TTXH', '0912000046', 'camtu.luong03@gmail.com', 'Quảng Ngãi', 'Sinh viên'),
(47, 47, 'Nguyễn Thị Thùy Trang', 'Nữ', 2001, '079201000047', '2022-04-04', 'Cục Cảnh sát QLHC về TTXH', '0912000047', 'thuytrang.nguyen01@gmail.com', 'TP.HCM', 'Nhân viên văn phòng'),
(48, 48, 'Huỳnh Ngọc Huyền', 'Nữ', 2004, '079204000048', '2022-04-11', 'Cục Cảnh sát QLHC về TTXH', '0912000048', 'ngochuyen.huynh04@gmail.com', 'Đà Nẵng', 'Sinh viên'),
(49, 49, 'Lê Thị Bảo Ngọc', 'Nữ', 2003, '079203000049', '2022-04-18', 'Cục Cảnh sát QLHC về TTXH', '0912000049', 'baongoc.le03@gmail.com', 'Cần Thơ', 'Sinh viên'),
(50, 50, 'Đoàn Minh Triết', 'Nam', 2002, '079202000050', '2022-04-25', 'Cục Cảnh sát QLHC về TTXH', '0912000050', 'minhtriet.doan02@gmail.com', 'Long An', 'Nhân viên văn phòng'),
(51, 51, 'Phạm Thị Thu Hương', 'Nữ', 1999, '079199000051', '2022-05-02', 'Cục Cảnh sát QLHC về TTXH', '0912000051', 'thuhuong.pham99@gmail.com', 'Hải Phòng', 'Nhân viên văn phòng'),
(52, 52, 'Võ Thị Hồng Nhung', 'Nữ', 2000, '079200000052', '2022-05-09', 'Cục Cảnh sát QLHC về TTXH', '0912000052', 'hongnhung.vo00@gmail.com', 'Đắk Lắk', 'Nhân viên văn phòng'),
(53, 53, 'Nguyễn Thị Bích Phương', 'Nữ', 2001, '079201000053', '2022-05-16', 'Cục Cảnh sát QLHC về TTXH', '0912000053', 'bichphuong.nguyen01@gmail.com', 'TP.HCM', 'Nhân viên văn phòng'),
(54, 54, 'Ngô Thị Kim Oanh', 'Nữ', 2005, '079205000054', '2022-05-23', 'Cục Cảnh sát QLHC về TTXH', '0912000054', 'kimoanh.ngo05@gmail.com', 'Đồng Nai', 'Sinh viên'),
(55, 55, 'Trương Minh Khang', 'Nam', 1998, '079198000055', '2022-05-30', 'Cục Cảnh sát QLHC về TTXH', '0912000055', 'minhkhang.truong98@gmail.com', 'TP.HCM', 'Nhân viên văn phòng'),
(56, 56, 'Ngô Quốc Việt', 'Nam', 1999, '079199000056', '2022-06-06', 'Cục Cảnh sát QLHC về TTXH', '0912000056', 'quocviet.ngo99@gmail.com', 'TP.HCM', 'Nhân viên văn phòng'),
(57, 57, 'Phạm Anh Tuấn', 'Nam', 2000, '079200000057', '2022-06-13', 'Cục Cảnh sát QLHC về TTXH', '0912000057', 'anhtuan.pham00@gmail.com', 'TP.HCM', 'Nhân viên văn phòng'),
(58, 58, 'Lê Quang Vinh', 'Nam', 2001, '079201000058', '2022-06-20', 'Cục Cảnh sát QLHC về TTXH', '0912000058', 'quangvinh.le01@gmail.com', 'TP.HCM', 'Nhân viên văn phòng'),
(59, 59, 'Phạm Gia Khiêm', 'Nam', 1999, '079199000059', '2022-06-27', 'Cục Cảnh sát QLHC về TTXH', '0912000059', 'giakhiem.pham99@gmail.com', 'Cần Thơ', 'Nhân viên văn phòng'),
(60, 60, 'Bùi Tấn Tài', 'Nam', 2000, '079200000060', '2022-07-04', 'Cục Cảnh sát QLHC về TTXH', '0912000060', 'tantai.bui00@gmail.com', 'Kiên Giang', 'Nhân viên văn phòng'),
(61, 61, 'Phạm Hoàng Khoa', 'Nam', 1998, '079198000061', '2022-07-11', 'Cục Cảnh sát QLHC về TTXH', '0912000061', 'hoangkhoa.pham98@gmail.com', 'Hà Nam', 'Nhân viên văn phòng'),
(62, 62, 'Ninh Thị Lan Anh', 'Nữ', 2000, '079200000062', '2022-07-18', 'Cục Cảnh sát QLHC về TTXH', '0912000062', 'lananh.ninh00@gmail.com', 'TP.HCM', 'Nhân viên văn phòng'),
(63, 63, 'Lê Hoàng Khang', 'Nam', 2005, '079205000063', '2022-07-25', 'Cục Cảnh sát QLHC về TTXH', '0912000063', 'hoangkhang.le05@gmail.com', 'Đồng Tháp', 'Sinh viên'),
(64, 64, 'Trần Quốc Bảo', 'Nam', 2004, '079204000064', '2022-08-01', 'Cục Cảnh sát QLHC về TTXH', '0912000064', 'quocbao.tran04@gmail.com', 'TP.HCM', 'Sinh viên');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `thongtinthanhtoan`
--

DROP TABLE IF EXISTS `thongtinthanhtoan`;
CREATE TABLE IF NOT EXISTS `thongtinthanhtoan` (
  `MaTT` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `MaND` int UNSIGNED NOT NULL,
  `TenNganHang` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `STK` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `ChuTaiKhoan` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`MaTT`),
  KEY `idx_tttt_mand` (`MaND`)
) ENGINE=InnoDB AUTO_INCREMENT=30002 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `thongtinthanhtoan`
--

INSERT INTO `thongtinthanhtoan` (`MaTT`, `MaND`, `TenNganHang`, `STK`, `ChuTaiKhoan`) VALUES
(1, 1, 'MB Bank', '0931493785', 'TRAN TUAN NGHIA');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `tienich`
--

DROP TABLE IF EXISTS `tienich`;
CREATE TABLE IF NOT EXISTS `tienich` (
  `MaTI` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `TenTI` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `MoTa` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`MaTI`)
) ENGINE=InnoDB AUTO_INCREMENT=30002 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `tienich`
--

INSERT INTO `tienich` (`MaTI`, `TenTI`, `MoTa`) VALUES
(1, 'Gác lửng', 'Gác lửng đúc kiên cố giúp tăng diện tích sinh hoạt'),
(2, 'Máy lạnh', 'Máy lạnh Inverter tiết kiệm điện lắp sẵn trong phòng'),
(3, 'Tủ lạnh mini', 'Tủ lạnh 90L tiện bảo quản thực phẩm'),
(4, 'Wifi tốc độ cao', 'Hệ thống Wifi Mesh phủ sóng từng tầng'),
(5, 'Máy giặt chung', 'Khu vực máy giặt và sân phơi đồ chung trên sân thượng'),
(6, 'Chỗ để xe rộng rãi', 'Bãi để xe tầng trệt có vạch phân luồng'),
(7, 'Giờ giấc tự do', 'Không giới hạn giờ đi về của cư dân');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `tindang`
--

DROP TABLE IF EXISTS `tindang`;
CREATE TABLE IF NOT EXISTS `tindang` (
  `MaTin` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `MaPhong` int UNSIGNED NOT NULL,
  `MaND` int UNSIGNED NOT NULL,
  `TieuDe` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `MoTa` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `NgayDang` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `NgayHetHan` date DEFAULT NULL,
  `TrangThai` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'DangHienThi' COMMENT 'DangHienThi, DaAn, HetHan',
  PRIMARY KEY (`MaTin`),
  KEY `idx_tindang_maphong` (`MaPhong`),
  KEY `idx_tindang_mand` (`MaND`)
) ENGINE=InnoDB AUTO_INCREMENT=90002 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `tindang`
--

INSERT INTO `tindang` (`MaTin`, `MaPhong`, `MaND`, `TieuDe`, `MoTa`, `NgayDang`, `NgayHetHan`, `TrangThai`) VALUES
(1, 9, 2, 'Cho thuê phòng trọ P.109 có gác lửng đường Tạ Quang Bửu, Quận 8 - Giá 2,2 triệu', 'Phòng rộng 20m2 có gác lửng, máy lạnh, wifi tốc độ cao, giờ giấc tự do, gần cầu Chánh Hưng. Liên hệ quản lý Tuấn Nghĩa: 0931493785.', '2026-10-01 08:00:00', '2026-11-15', 'DangHienThi'),
(2, 19, 3, 'Phòng trọ sinh viên P.209 Hưng Long, Bình Chánh thoáng mát chỉ 2 triệu/tháng', 'Phòng 20m2 sạch đẹp, có gác lửng, sân để xe rộng rãi, máy giặt chung, điện 3.8k, nước 18k. Liên hệ quản lý Nhật Nguyên: 0383193961.', '2026-10-02 09:00:00', '2026-11-27', 'DangHienThi'),
(3, 29, 4, 'Cho thuê phòng P.309 Nguyễn Thị Thập, Quận 7 gần ĐH Tôn Đức Thắng - 2,2 triệu', 'Phòng 20m2 có máy lạnh, tủ lạnh mini, gác lửng, giờ giấc tự do, phù hợp 1-2 sinh viên hoặc nhân viên văn phòng.', '2026-10-03 10:30:00', '2026-11-20', 'DangHienThi'),
(4, 10, 2, 'Phòng trọ P.110 rộng 22m2 Quận 8 (Nhận cọc giữ chỗ sau bảo trì)', 'Phòng đang sơn mới lại toàn bộ, diện tích 22m2, giá 2,3 triệu/tháng, nhận dọn vào từ cuối tháng 10.', '2026-10-10 14:00:00', '2026-11-10', 'DangHienThi'),
(5, 8, 2, 'Cho thuê phòng P.108 Quận 8 đầy đủ tiện nghi', 'Tin đăng cũ đã cho thuê xong.', '2026-03-15 08:00:00', '2026-04-14', 'HetHan');

--
-- Ràng buộc đối với các bảng kết xuất
--

--
-- Ràng buộc cho bảng `anhphong`
--
ALTER TABLE `anhphong`
  ADD CONSTRAINT `fk_anhphong_phong` FOREIGN KEY (`MaPhong`) REFERENCES `phong` (`MaPhong`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Ràng buộc cho bảng `chisodiennuoc`
--
ALTER TABLE `chisodiennuoc`
  ADD CONSTRAINT `fk_csdn_phong` FOREIGN KEY (`MaPhong`) REFERENCES `phong` (`MaPhong`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Ràng buộc cho bảng `chitiethopdongthue`
--
ALTER TABLE `chitiethopdongthue`
  ADD CONSTRAINT `fk_cthdt_hopdongthue` FOREIGN KEY (`MaHDT`) REFERENCES `hopdongthue` (`MaHDT`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_cthdt_nguoidung` FOREIGN KEY (`MaND`) REFERENCES `nguoidung` (`MaND`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Ràng buộc cho bảng `chitietphidichvu`
--
ALTER TABLE `chitietphidichvu`
  ADD CONSTRAINT `fk_1` FOREIGN KEY (`MaHDT`) REFERENCES `hopdongthue` (`MaHDT`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_2` FOREIGN KEY (`MaDV`) REFERENCES `phidichvu` (`MaDV`) ON DELETE CASCADE;

--
-- Ràng buộc cho bảng `chitiettienich`
--
ALTER TABLE `chitiettienich`
  ADD CONSTRAINT `fk_ctti_phong` FOREIGN KEY (`MaPhong`) REFERENCES `phong` (`MaPhong`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_ctti_tienich` FOREIGN KEY (`MaTI`) REFERENCES `tienich` (`MaTI`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Ràng buộc cho bảng `hoadon`
--
ALTER TABLE `hoadon`
  ADD CONSTRAINT `fk_hoadon_csdn` FOREIGN KEY (`MaCS`) REFERENCES `chisodiennuoc` (`MaCS`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_hoadon_gia` FOREIGN KEY (`MaGia`) REFERENCES `giadiennuoc` (`MaGia`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_hoadon_phong` FOREIGN KEY (`MaPhong`) REFERENCES `phong` (`MaPhong`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Ràng buộc cho bảng `hopdongthue`
--
ALTER TABLE `hopdongthue`
  ADD CONSTRAINT `fk_hdt_hdtcu` FOREIGN KEY (`MaHDTCu`) REFERENCES `hopdongthue` (`MaHDT`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_hdt_phong` FOREIGN KEY (`MaPhong`) REFERENCES `phong` (`MaPhong`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Ràng buộc cho bảng `khutro`
--
ALTER TABLE `khutro`
  ADD CONSTRAINT `fk_khutro_nguoidung` FOREIGN KEY (`MaND`) REFERENCES `nguoidung` (`MaND`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Ràng buộc cho bảng `lichsuthe`
--
ALTER TABLE `lichsuthe`
  ADD CONSTRAINT `fk_lichsuthe_theravao` FOREIGN KEY (`MaThe`) REFERENCES `theravao` (`MaThe`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Ràng buộc cho bảng `nhanthongbao`
--
ALTER TABLE `nhanthongbao`
  ADD CONSTRAINT `fk_ntb_nguoinhan` FOREIGN KEY (`NDNhan`) REFERENCES `nguoidung` (`MaND`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_ntb_thongbao` FOREIGN KEY (`MaTB`) REFERENCES `thongbao` (`MaTB`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Ràng buộc cho bảng `phatsinh`
--
ALTER TABLE `phatsinh`
  ADD CONSTRAINT `fk_phatsinh_hoadon` FOREIGN KEY (`MaHD`) REFERENCES `hoadon` (`MaHD`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Ràng buộc cho bảng `phong`
--
ALTER TABLE `phong`
  ADD CONSTRAINT `fk_phong_khutro` FOREIGN KEY (`MaKhu`) REFERENCES `khutro` (`MaKhu`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Ràng buộc cho bảng `thanhtoan`
--
ALTER TABLE `thanhtoan`
  ADD CONSTRAINT `fk_thanhtoan_hoadon` FOREIGN KEY (`MaHD`) REFERENCES `hoadon` (`MaHD`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Ràng buộc cho bảng `theravao`
--
ALTER TABLE `theravao`
  ADD CONSTRAINT `fk_theravao_nguoidung` FOREIGN KEY (`MaND`) REFERENCES `nguoidung` (`MaND`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Ràng buộc cho bảng `thongbao`
--
ALTER TABLE `thongbao`
  ADD CONSTRAINT `fk_thongbao_loaithongbao` FOREIGN KEY (`MaLTB`) REFERENCES `loaithongbao` (`MaLTB`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_thongbao_nguoigui` FOREIGN KEY (`NDGui`) REFERENCES `nguoidung` (`MaND`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_thongbao_tbgoc` FOREIGN KEY (`MaTBGoc`) REFERENCES `thongbao` (`MaTB`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Ràng buộc cho bảng `thongtincanhan`
--
ALTER TABLE `thongtincanhan`
  ADD CONSTRAINT `fk_ttcn_nguoidung` FOREIGN KEY (`MaND`) REFERENCES `nguoidung` (`MaND`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Ràng buộc cho bảng `thongtinthanhtoan`
--
ALTER TABLE `thongtinthanhtoan`
  ADD CONSTRAINT `fk_tttt_nguoidung` FOREIGN KEY (`MaND`) REFERENCES `nguoidung` (`MaND`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Ràng buộc cho bảng `tindang`
--
ALTER TABLE `tindang`
  ADD CONSTRAINT `fk_tindang_nguoidung` FOREIGN KEY (`MaND`) REFERENCES `nguoidung` (`MaND`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_tindang_phong` FOREIGN KEY (`MaPhong`) REFERENCES `phong` (`MaPhong`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
