// server/src/app/controllers/thongKe.controller.js
const db = require('../../database/db');

// Chuẩn hóa giá trị ngày từ MySQL (Date hoặc String) về chuỗi YYYY-MM-DD
const toYMD = (val) => {
  if (!val) return '';
  if (val instanceof Date && !Number.isNaN(val.getTime())) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return String(val).slice(0, 10);
};

// Sinh danh sách các tháng liên tục định dạng YYYY-MM
const buildMonthRange = (tuThang, denThang, soThangDefault = 6) => {
  const now = new Date();
  let endYear = now.getFullYear();
  let endMonth = now.getMonth() + 1;

  if (denThang && /^\d{4}-\d{2}$/.test(String(denThang).trim())) {
    const [y, m] = String(denThang).trim().split('-').map(Number);
    endYear = y;
    endMonth = m;
  }

  let startYear = endYear;
  let startMonth = endMonth - ((Number(soThangDefault) || 6) - 1);
  while (startMonth <= 0) {
    startMonth += 12;
    startYear -= 1;
  }

  if (tuThang && /^\d{4}-\d{2}$/.test(String(tuThang).trim())) {
    const [y, m] = String(tuThang).trim().split('-').map(Number);
    startYear = y;
    startMonth = m;
  }

  const months = [];
  let curY = startYear;
  let curM = startMonth;
  let guard = 0;

  while (
    (curY < endYear || (curY === endYear && curM <= endMonth)) &&
    guard < 24
  ) {
    const ym = `${curY}-${String(curM).padStart(2, '0')}`;
    const label = `T${String(curM).padStart(2, '0')}/${String(curY).slice(-2)}`;
    months.push({ thangNam: ym, nhan: label });
    curM += 1;
    if (curM > 12) {
      curM = 1;
      curY += 1;
    }
    guard += 1;
  }

  if (months.length === 0) {
    const ym = `${endYear}-${String(endMonth).padStart(2, '0')}`;
    months.push({
      thangNam: ym,
      nhan: `T${String(endMonth).padStart(2, '0')}/${String(endYear).slice(-2)}`,
    });
  }

  return {
    months,
    tuThangApDung: months[0].thangNam,
    denThangApDung: months[months.length - 1].thangNam,
  };
};

// Hàm chạy câu lệnh SQL an toàn (không làm sập API nếu bảng trống)
const safeQuery = async (sql, params = []) => {
  try {
    const [rows] = await db.query(sql, params);
    return Array.isArray(rows) ? rows : [];
  } catch (err) {
    console.error('Lỗi truy vấn thống kê:', err.message);
    return [];
  }
};

const ThongKeController = {
  // 1. [GET] /api/thong-ke/quan-ly
  // Dùng cho Chủ trọ (ChuTro) và Quản lý cơ sở (QuanLy)
  getThongKeQuanLy: async (req, res) => {
    try {
      const {
        maKhu = '',
        soThang = '6',
        tuThang = '',
        denThang = '',
      } = req.query;

      const quyen = req.user?.quyen || req.user?.Quyen || 'ChuTro';
      const maND = Number(
        req.user?.maND || req.user?.MaND || req.query?.maND || 0
      );

      const { months, tuThangApDung, denThangApDung } = buildMonthRange(
        tuThang,
        denThang,
        Number(soThang) || 6
      );
      const monthKeys = new Set(months.map((m) => m.thangNam));
      const thangHienTai = months[months.length - 1].thangNam;

      const [
        allKhus,
        allRooms,
        dsHoaDonRaw,
        dsChiSoRaw,
        dsGiaDienNuoc,
        dsHopDongRaw,
        dsChiTietHDRaw,
        dsThongTinCaNhan,
        dsThanhToanRaw,
      ] = await Promise.all([
        quyen === 'QuanLy' && maND > 0
          ? safeQuery(`SELECT * FROM KhuTro WHERE MaND = ? ORDER BY MaKhu ASC`, [
              maND,
            ])
          : safeQuery(`SELECT * FROM KhuTro ORDER BY MaKhu ASC`),
        safeQuery(`SELECT * FROM Phong ORDER BY MaKhu ASC, TenPhong ASC`),
        safeQuery(`SELECT * FROM HoaDon ORDER BY NgayTinh DESC, MaHD DESC`),
        safeQuery(
          `SELECT * FROM ChiSoDienNuoc ORDER BY NgayGhi DESC, MaCS DESC`
        ),
        safeQuery(`SELECT * FROM GiaDienNuoc ORDER BY NgayApDung DESC`),
        safeQuery(`SELECT * FROM HopDongThue ORDER BY MaHDT DESC`),
        safeQuery(`SELECT * FROM ChiTietHopDongThue`),
        safeQuery(`SELECT * FROM ThongTinCaNhan`),
        safeQuery(`SELECT * FROM ThanhToan ORDER BY MaTT DESC`),
      ]);

      const selectedKhus = maKhu
        ? allKhus.filter((k) => Number(k.MaKhu) === Number(maKhu))
        : allKhus;

      const selectedKhuIds = new Set(
        selectedKhus.map((k) => Number(k.MaKhu))
      );

      const allowedRooms = allRooms.filter((r) =>
        selectedKhuIds.has(Number(r.MaKhu))
      );

      const roomMap = new Map(
        allowedRooms.map((r) => [Number(r.MaPhong), r])
      );
      const khuMap = new Map(allKhus.map((k) => [Number(k.MaKhu), k]));
      const profileMap = new Map(
        dsThongTinCaNhan.map((tt) => [Number(tt.MaND), tt])
      );

      const dsHoaDon = dsHoaDonRaw
        .filter((hd) => roomMap.has(Number(hd.MaPhong)))
        .map((hd) => ({ ...hd, NgayTinhStr: toYMD(hd.NgayTinh) }));

      const dsChiSo = dsChiSoRaw
        .filter((cs) => roomMap.has(Number(cs.MaPhong)))
        .map((cs) => ({ ...cs, NgayGhiStr: toYMD(cs.NgayGhi) }));

      const dsHopDong = dsHopDongRaw
        .filter((hdt) => roomMap.has(Number(hdt.MaPhong)))
        .map((hdt) => ({
          ...hdt,
          NgayBDStr: toYMD(hdt.NgayBD),
          NgayKTStr: toYMD(hdt.NgayKT),
        }));

      // A. THỐNG KÊ TÌNH TRẠNG PHÒNG
      const tongSoPhong = allowedRooms.length;
      const phongDangThue = allowedRooms.filter(
        (r) => r.TrangThai === 'DangThue'
      ).length;
      const phongTrong = allowedRooms.filter(
        (r) => r.TrangThai === 'Trong'
      ).length;
      const phongBaoTri = allowedRooms.filter(
        (r) => r.TrangThai === 'BaoTri'
      ).length;
      const tyLeLapDay =
        tongSoPhong > 0 ? Math.round((phongDangThue / tongSoPhong) * 100) : 0;

      const tinhTrangPhongTheoKhu = selectedKhus.map((khu) => {
        const roomsInKhu = allowedRooms.filter(
          (r) => Number(r.MaKhu) === Number(khu.MaKhu)
        );
        const dangThue = roomsInKhu.filter(
          (r) => r.TrangThai === 'DangThue'
        ).length;
        const trong = roomsInKhu.filter((r) => r.TrangThai === 'Trong').length;
        const baoTri = roomsInKhu.filter(
          (r) => r.TrangThai === 'BaoTri'
        ).length;
        return {
          MaKhu: khu.MaKhu,
          TenKhu: khu.TenKhu,
          TongPhong: roomsInKhu.length,
          DangThue: dangThue,
          Trong: trong,
          BaoTri: baoTri,
          TyLeLapDay:
            roomsInKhu.length > 0
              ? Math.round((dangThue / roomsInKhu.length) * 100)
              : 0,
        };
      });

      // B. THỐNG KÊ DOANH THU & CÔNG NỢ
      const hoaDonTrongKy = dsHoaDon.filter((hd) =>
        monthKeys.has(hd.NgayTinhStr.slice(0, 7))
      );

      let tongPhaiThu = 0;
      let tongThucThu = 0;
      let tongCongNo = 0;
      let coCauTienPhong = 0;
      let coCauTienDien = 0;
      let coCauTienNuoc = 0;
      let coCauTienPhuPhi = 0;
      let coCauTienPhatSinh = 0;

      for (const hd of hoaDonTrongKy) {
        const tong = Number(hd.TongTien) || 0;
        const daTra = Number(hd.TienDaTra) || 0;
        const conNo = Math.max(0, tong - daTra);

        tongPhaiThu += tong;
        tongThucThu += daTra;
        tongCongNo += conNo;

        coCauTienPhong += Number(hd.TienPhong) || 0;
        coCauTienDien += Number(hd.TienDien) || 0;
        coCauTienNuoc += Number(hd.TienNuoc) || 0;
        coCauTienPhuPhi += Number(hd.TienPhuPhi) || 0;
        coCauTienPhatSinh += Number(hd.TienPhatSinh) || 0;
      }

      const tyLeThuHoi =
        tongPhaiThu > 0 ? Math.round((tongThucThu / tongPhaiThu) * 100) : 100;

      const bieuDoDoanhThuCongNo = months.map(({ thangNam, nhan }) => {
        const hdMonth = hoaDonTrongKy.filter(
          (hd) => hd.NgayTinhStr.slice(0, 7) === thangNam
        );
        const phaiThu = hdMonth.reduce(
          (sum, h) => sum + (Number(h.TongTien) || 0),
          0
        );
        const thucThu = hdMonth.reduce(
          (sum, h) => sum + (Number(h.TienDaTra) || 0),
          0
        );
        const congNo = hdMonth.reduce(
          (sum, h) =>
            sum +
            Math.max(
              0,
              (Number(h.TongTien) || 0) - (Number(h.TienDaTra) || 0)
            ),
          0
        );
        return {
          thangNam,
          nhan,
          phaiThu,
          thucThu,
          congNo,
          soHoaDon: hdMonth.length,
        };
      });

      const activeContracts = dsHopDong.filter((hdt) =>
        ['ConHieuLuc', 'DangThue', 'HieuLuc'].includes(String(hdt.TrangThai))
      );
      const activeContractIds = new Set(
        activeContracts.map((hdt) => Number(hdt.MaHDT))
      );
      const dsChiTietActive = dsChiTietHDRaw.filter(
        (ct) => activeContractIds.has(Number(ct.MaHDT)) && !ct.NgayDi
      );

      const daiDienByRoom = new Map();
      for (const hdt of activeContracts) {
        const ctDaiDien =
          dsChiTietActive.find(
            (ct) =>
              Number(ct.MaHDT) === Number(hdt.MaHDT) &&
              String(ct.VaiTro) === 'DaiDien'
          ) ||
          dsChiTietActive.find(
            (ct) => Number(ct.MaHDT) === Number(hdt.MaHDT)
          );
        if (ctDaiDien) {
          const prof = profileMap.get(Number(ctDaiDien.MaND));
          daiDienByRoom.set(Number(hdt.MaPhong), {
            HoTen: prof ? prof.HoTen : `Khách`,
            SDT: prof ? prof.SDT : '',
          });
        }
      }

      const danhSachCongNo = hoaDonTrongKy
        .map((hd) => {
          const tong = Number(hd.TongTien) || 0;
          const daTra = Number(hd.TienDaTra) || 0;
          const conNo = Math.max(0, tong - daTra);
          if (conNo <= 0) return null;

          const room = roomMap.get(Number(hd.MaPhong));
          const khu = room ? khuMap.get(Number(room.MaKhu)) : null;
          const daiDien = daiDienByRoom.get(Number(hd.MaPhong));

          return {
            MaHD: hd.MaHD,
            MaPhong: hd.MaPhong,
            TenPhong: room ? room.TenPhong : ``,
            TenKhu: khu ? khu.TenKhu : '',
            NgayTinh: hd.NgayTinhStr,
            KyThang: hd.NgayTinhStr.slice(0, 7),
            TongTien: tong,
            TienDaTra: daTra,
            ConNo: conNo,
            TenKhachDaiDien: daiDien ? daiDien.HoTen : 'Chưa cập nhật',
            SDTKhach: daiDien ? daiDien.SDT : '',
          };
        })
        .filter(Boolean)
        .sort((a, b) => b.ConNo - a.ConNo);

      const soPhongDangNo = new Set(danhSachCongNo.map((item) => item.MaPhong))
        .size;

      // C. THỐNG KÊ NGƯỜI THUÊ & HỢP ĐỒNG
      const uniqueActiveTenantIds = [
        ...new Set(dsChiTietActive.map((ct) => Number(ct.MaND))),
      ];

      let tamTruDaDangKy = 0;
      let tamTruChuaDangKy = 0;
      let tamTruKhac = 0;
      let khachMoiTrongKy = 0;

      for (const ct of dsChiTietActive) {
        const tt = String(ct.TamTru || 'ChuaDangKy');
        if (tt === 'DaDangKy' || tt === '1') tamTruDaDangKy += 1;
        else if (tt === 'ChuaDangKy' || tt === '0') tamTruChuaDangKy += 1;
        else tamTruKhac += 1;

        const ymVao = toYMD(ct.NgayVao).slice(0, 7);
        if (monthKeys.has(ymVao)) {
          khachMoiTrongKy += 1;
        }
      }

      let gioiTinhNam = 0;
      let gioiTinhNu = 0;
      for (const id of uniqueActiveTenantIds) {
        const prof = profileMap.get(id);
        if (prof && String(prof.GioiTinh || '').toLowerCase().includes('nữ')) {
          gioiTinhNu += 1;
        } else {
          gioiTinhNam += 1;
        }
      }

      const todayStr = new Date().toISOString().slice(0, 10);
      const next30Days = new Date(Date.now() + 30 * 86400000)
        .toISOString()
        .slice(0, 10);

      const hopDongSapHetHan = activeContracts
        .filter(
          (hdt) =>
            hdt.NgayKTStr &&
            hdt.NgayKTStr >= todayStr &&
            hdt.NgayKTStr <= next30Days
        )
        .map((hdt) => {
          const room = roomMap.get(Number(hdt.MaPhong));
          const khu = room ? khuMap.get(Number(room.MaKhu)) : null;
          const daiDien = daiDienByRoom.get(Number(hdt.MaPhong));
          const soNgayConLai = Math.max(
            0,
            Math.ceil(
              (new Date(hdt.NgayKTStr).getTime() -
                new Date(todayStr).getTime()) /
                86400000
            )
          );
          return {
            MaHDT: hdt.MaHDT,
            MaPhong: hdt.MaPhong,
            TenPhong: room ? room.TenPhong : ``,
            TenKhu: khu ? khu.TenKhu : '',
            NgayKT: hdt.NgayKTStr,
            TienCoc: Number(hdt.TienCoc) || 0,
            TenDaiDien: daiDien ? daiDien.HoTen : '',
            SDT: daiDien ? daiDien.SDT : '',
            SoNgayConLai: soNgayConLai,
          };
        })
        .sort((a, b) => a.SoNgayConLai - b.SoNgayConLai);

      const tongTienCocDangGiu = activeContracts.reduce(
        (sum, hdt) => sum + (Number(hdt.TienCoc) || 0),
        0
      );

      // D. THỐNG KÊ TIÊU THỤ ĐIỆN NƯỚC
      const giaMacDinh = dsGiaDienNuoc[0] || {
        GiaDien: 3800,
        GiaNuoc: 18000,
      };

      const chiSoTrongKy = dsChiSo
        .filter((cs) => monthKeys.has(cs.NgayGhiStr.slice(0, 7)))
        .map((cs) => {
          const soDien = Math.max(
            0,
            (Number(cs.SoDienMoi) || 0) - (Number(cs.SoDienCu) || 0)
          );
          const soNuoc = Math.max(
            0,
            (Number(cs.SoNuocMoi) || 0) - (Number(cs.SoNuocCu) || 0)
          );
          const matchedPrice =
            dsGiaDienNuoc.find(
              (g) => toYMD(g.NgayApDung) <= cs.NgayGhiStr
            ) || giaMacDinh;
          const tienDien = soDien * (Number(matchedPrice.GiaDien) || 3800);
          const tienNuoc = soNuoc * (Number(matchedPrice.GiaNuoc) || 18000);
          return {
            ...cs,
            KyThang: cs.NgayGhiStr.slice(0, 7),
            SoDienTieuThu: soDien,
            SoNuocTieuThu: soNuoc,
            TienDien: tienDien,
            TienNuoc: tienNuoc,
          };
        });

      const tongDienTieuThu = chiSoTrongKy.reduce(
        (s, c) => s + c.SoDienTieuThu,
        0
      );
      const tongNuocTieuThu = chiSoTrongKy.reduce(
        (s, c) => s + c.SoNuocTieuThu,
        0
      );
      const tongTienDienTrongKy = chiSoTrongKy.reduce(
        (s, c) => s + c.TienDien,
        0
      );
      const tongTienNuocTrongKy = chiSoTrongKy.reduce(
        (s, c) => s + c.TienNuoc,
        0
      );

      const bieuDoDienNuoc = months.map(({ thangNam, nhan }) => {
        const csMonth = chiSoTrongKy.filter((c) => c.KyThang === thangNam);
        return {
          thangNam,
          nhan,
          soDien: csMonth.reduce((s, c) => s + c.SoDienTieuThu, 0),
          soNuoc: csMonth.reduce((s, c) => s + c.SoNuocTieuThu, 0),
          tienDien: csMonth.reduce((s, c) => s + c.TienDien, 0),
          tienNuoc: csMonth.reduce((s, c) => s + c.TienNuoc, 0),
        };
      });

      const tieuThuTheoPhongMap = new Map();
      for (const cs of chiSoTrongKy) {
        const rId = Number(cs.MaPhong);
        const cur = tieuThuTheoPhongMap.get(rId) || {
          MaPhong: rId,
          SoDien: 0,
          SoNuoc: 0,
          TongTienDienNuoc: 0,
        };
        cur.SoDien += cs.SoDienTieuThu;
        cur.SoNuoc += cs.SoNuocTieuThu;
        cur.TongTienDienNuoc += cs.TienDien + cs.TienNuoc;
        tieuThuTheoPhongMap.set(rId, cur);
      }

      const topPhongTieuThu = [...tieuThuTheoPhongMap.values()]
        .map((item) => {
          const room = roomMap.get(item.MaPhong);
          const khu = room ? khuMap.get(Number(room.MaKhu)) : null;
          return {
            ...item,
            TenPhong: room ? room.TenPhong : ``,
            TenKhu: khu ? khu.TenKhu : '',
          };
        })
        .sort((a, b) => b.TongTienDienNuoc - a.TongTienDienNuoc)
        .slice(0, 5);

      // E. TIẾN ĐỘ VẬN HÀNH KỲ HIỆN TẠI
      const soPhongDaGhiDienNuocKyNay = new Set(
        dsChiSo
          .filter((cs) => cs.NgayGhiStr.startsWith(thangHienTai))
          .map((cs) => Number(cs.MaPhong))
      ).size;

      const soPhongDaLapHoaDonKyNay = new Set(
        dsHoaDon
          .filter((hd) => hd.NgayTinhStr.startsWith(thangHienTai))
          .map((hd) => Number(hd.MaPhong))
      ).size;

      const maHDSet = new Set(dsHoaDon.map((h) => Number(h.MaHD)));
      const giaoDichChoDuyet = dsThanhToanRaw.filter(
        (tt) =>
          (!tt.MaHD || maHDSet.has(Number(tt.MaHD))) &&
          ['ChoXacNhan', 'ChoDuyet', 'Pending', '0'].includes(
            String(tt.TrangThai)
          )
      ).length;

      return res.status(200).json({
        success: true,
        data: {
          boLoc: {
            tuThang: tuThangApDung,
            denThang: denThangApDung,
            thangKiemTraVanHanh: thangHienTai,
            khuTroList: allKhus,
          },
          thongKeDoanhThu: {
            tongPhaiThu,
            tongThucThu,
            tyLeThuHoi,
            coCauDoanhThu: {
              tienPhong: coCauTienPhong,
              tienDien: coCauTienDien,
              tienNuoc: coCauTienNuoc,
              tienPhuPhi: coCauTienPhuPhi,
              tienPhatSinh: coCauTienPhatSinh,
            },
            bieuDoTheoThang: bieuDoDoanhThuCongNo,
          },
          thongKeCongNo: {
            tongCongNo,
            soPhongDangNo,
            soHoaDonNo: danhSachCongNo.length,
            danhSachCongNo,
          },
          thongKePhong: {
            tongSoPhong,
            phongDangThue,
            phongTrong,
            phongBaoTri,
            tyLeLapDay,
            theoKhu: tinhTrangPhongTheoKhu,
          },
          thongKeNguoiThue: {
            tongKhachDangO: uniqueActiveTenantIds.length,
            khachMoiTrongKy,
            gioiTinh: {
              nam: gioiTinhNam,
              nu: gioiTinhNu,
            },
            tamTru: {
              daDangKy: tamTruDaDangKy,
              chuaDangKy: tamTruChuaDangKy,
              khac: tamTruKhac,
            },
            hopDong: {
              soHopDongHieuLuc: activeContracts.length,
              tongTienCocDangGiu,
              soHopDongSapHetHan: hopDongSapHetHan.length,
              danhSachSapHetHan: hopDongSapHetHan,
            },
          },
          thongKeDienNuoc: {
            tongDienTieuThu,
            tongNuocTieuThu,
            tongTienDienTrongKy,
            tongTienNuocTrongKy,
            bieuDoTheoThang: bieuDoDienNuoc,
            topPhongTieuThu,
          },
          tienDoVanHanh: {
            kyHienTai: thangHienTai,
            tongPhongDangThue: phongDangThue,
            soPhongDaGhiDienNuoc: soPhongDaGhiDienNuocKyNay,
            soPhongDaLapHoaDon: soPhongDaLapHoaDonKyNay,
            giaoDichChoDuyet,
            thongBaoChuaDoc: 0,
          },
        },
      });
    } catch (error) {
      console.error('Lỗi getThongKeQuanLy:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi tải dữ liệu thống kê quản lý',
      });
    }
  },

  // 2. [GET] /api/thong-ke/nguoi-thue
  // Phục vụ riêng cho Người thuê (KhachThue)
  getThongKeNguoiThue: async (req, res) => {
    try {
      const {
        maPhong = '',
        soThang = '6',
        tuThang = '',
        denThang = '',
      } = req.query;

      const maND = Number(
        req.user?.maND ||
          req.user?.MaND ||
          req.query?.maND ||
          req.query?.MaND ||
          0
      );

      // Lấy song song toàn bộ dữ liệu liên quan đến người thuê qua safeQuery
      const [dsChiTietCuaToi, allHopDong, allKhus, allRooms, dsGiaDienNuoc] =
        await Promise.all([
          maND > 0
            ? safeQuery(
                `SELECT * FROM ChiTietHopDongThue WHERE MaND = ? ORDER BY MaHDT DESC`,
                [maND]
              )
            : Promise.resolve([]),
          safeQuery(`SELECT * FROM HopDongThue ORDER BY MaHDT DESC`),
          safeQuery(`SELECT * FROM KhuTro ORDER BY MaKhu ASC`),
          safeQuery(`SELECT * FROM Phong ORDER BY MaPhong ASC`),
          safeQuery(`SELECT * FROM GiaDienNuoc ORDER BY NgayApDung DESC`),
        ]);

      const myMaHDTSet = new Set(
        dsChiTietCuaToi.map((ct) => Number(ct.MaHDT))
      );

      const myContracts = allHopDong
        .filter((hd) => myMaHDTSet.has(Number(hd.MaHDT)))
        .map((hd) => ({
          ...hd,
          NgayBD: toYMD(hd.NgayBD),
          NgayKT: toYMD(hd.NgayKT),
          NgayKy: toYMD(hd.NgayKy),
        }));

      const myRoomIds = [
        ...new Set(
          myContracts.map((hd) => Number(hd.MaPhong)).filter(Boolean)
        ),
      ];

      const myRooms = allRooms
        .filter((r) => myRoomIds.includes(Number(r.MaPhong)))
        .map((r) => {
          const khu = allKhus.find(
            (k) => Number(k.MaKhu) === Number(r.MaKhu)
          );
          return {
            MaPhong: r.MaPhong,
            TenPhong: r.TenPhong,
            MaKhu: r.MaKhu,
            TenKhu: khu ? khu.TenKhu : '',
            DienTich: r.DienTich,
            GiaPhong: Number(r.Gia) || 0,
            TrangThai: r.TrangThai,
          };
        });

      const targetRoomIds =
        maPhong && maPhong !== 'ALL'
          ? myRoomIds.filter((id) => id === Number(maPhong))
          : myRoomIds;

      const { months, tuThangApDung, denThangApDung } = buildMonthRange(
        tuThang,
        denThang,
        Number(soThang) || 6
      );
      const monthKeys = new Set(months.map((m) => m.thangNam));

      if (targetRoomIds.length === 0) {
        return res.status(200).json({
          success: true,
          data: {
            boLoc: {
              tuThang: tuThangApDung,
              denThang: denThangApDung,
              phongList: myRooms,
            },
            tongQuan: {
              tongChiPhiTrongKy: 0,
              tongDaThanhToan: 0,
              tongCongNoHienTai: 0,
              dienTieuThuKyGanNhat: 0,
              nuocTieuThuKyGanNhat: 0,
              kyDienNuocGanNhat: null,
              soNgayHopDongConLai: null,
              trangThaiTamTru: 'ChuaDangKy',
            },
            coCauChiPhi: {
              tienPhong: 0,
              tienDien: 0,
              tienNuoc: 0,
              tienPhuPhi: 0,
              tienPhatSinh: 0,
            },
            bieuDoChiPhiTheoThang: months.map(({ thangNam, nhan }) => ({
              thangNam,
              nhan,
              tongTien: 0,
              daTra: 0,
              conNo: 0,
            })),
            bieuDoDienNuocTheoThang: months.map(({ thangNam, nhan }) => ({
              thangNam,
              nhan,
              soDien: 0,
              soNuoc: 0,
              tienDien: 0,
              tienNuoc: 0,
            })),
            hoaDonGanNhat: null,
            hopDongHienTai: null,
          },
        });
      }

      const placeholders = targetRoomIds.map(() => '?').join(',');
      const [dsHoaDonRaw, dsChiSoRaw] = await Promise.all([
        safeQuery(
          `SELECT * FROM HoaDon WHERE MaPhong IN (${placeholders}) ORDER BY NgayTinh DESC, MaHD DESC`,
          targetRoomIds
        ),
        safeQuery(
          `SELECT * FROM ChiSoDienNuoc WHERE MaPhong IN (${placeholders}) ORDER BY NgayGhi DESC, MaCS DESC`,
          targetRoomIds
        ),
      ]);

      const dsHoaDon = dsHoaDonRaw.map((hd) => ({
        ...hd,
        NgayTinhStr: toYMD(hd.NgayTinh),
      }));

      const dsChiSo = dsChiSoRaw.map((cs) => ({
        ...cs,
        NgayGhiStr: toYMD(cs.NgayGhi),
      }));

      const hoaDonTrongKy = dsHoaDon.filter((hd) =>
        monthKeys.has(hd.NgayTinhStr.slice(0, 7))
      );

      let tongChiPhiTrongKy = 0;
      let tongDaThanhToan = 0;
      let coCauTienPhong = 0;
      let coCauTienDien = 0;
      let coCauTienNuoc = 0;
      let coCauTienPhuPhi = 0;
      let coCauTienPhatSinh = 0;

      for (const hd of hoaDonTrongKy) {
        tongChiPhiTrongKy += Number(hd.TongTien) || 0;
        tongDaThanhToan += Number(hd.TienDaTra) || 0;
        coCauTienPhong += Number(hd.TienPhong) || 0;
        coCauTienDien += Number(hd.TienDien) || 0;
        coCauTienNuoc += Number(hd.TienNuoc) || 0;
        coCauTienPhuPhi += Number(hd.TienPhuPhi) || 0;
        coCauTienPhatSinh += Number(hd.TienPhatSinh) || 0;
      }

      const tongCongNoHienTai = dsHoaDon.reduce(
        (sum, hd) =>
          sum +
          Math.max(
            0,
            (Number(hd.TongTien) || 0) - (Number(hd.TienDaTra) || 0)
          ),
        0
      );

      const bieuDoChiPhiTheoThang = months.map(({ thangNam, nhan }) => {
        const hdMonth = hoaDonTrongKy.filter(
          (h) => h.NgayTinhStr.slice(0, 7) === thangNam
        );
        const tongTien = hdMonth.reduce(
          (s, h) => s + (Number(h.TongTien) || 0),
          0
        );
        const daTra = hdMonth.reduce(
          (s, h) => s + (Number(h.TienDaTra) || 0),
          0
        );
        return {
          thangNam,
          nhan,
          tongTien,
          daTra,
          conNo: Math.max(0, tongTien - daTra),
        };
      });

      const giaMacDinh = dsGiaDienNuoc[0] || {
        GiaDien: 3800,
        GiaNuoc: 18000,
      };

      const chiSoFormatted = dsChiSo.map((cs) => {
        const soDien = Math.max(
          0,
          (Number(cs.SoDienMoi) || 0) - (Number(cs.SoDienCu) || 0)
        );
        const soNuoc = Math.max(
          0,
          (Number(cs.SoNuocMoi) || 0) - (Number(cs.SoNuocCu) || 0)
        );
        const matchedPrice =
          dsGiaDienNuoc.find(
            (g) => toYMD(g.NgayApDung) <= cs.NgayGhiStr
          ) || giaMacDinh;
        return {
          ...cs,
          KyThang: cs.NgayGhiStr.slice(0, 7),
          SoDienTieuThu: soDien,
          SoNuocTieuThu: soNuoc,
          TienDien: soDien * (Number(matchedPrice.GiaDien) || 3800),
          TienNuoc: soNuoc * (Number(matchedPrice.GiaNuoc) || 18000),
        };
      });

      const bieuDoDienNuocTheoThang = months.map(({ thangNam, nhan }) => {
        const csMonth = chiSoFormatted.filter((c) => c.KyThang === thangNam);
        return {
          thangNam,
          nhan,
          soDien: csMonth.reduce((s, c) => s + c.SoDienTieuThu, 0),
          soNuoc: csMonth.reduce((s, c) => s + c.SoNuocTieuThu, 0),
          tienDien: csMonth.reduce((s, c) => s + c.TienDien, 0),
          tienNuoc: csMonth.reduce((s, c) => s + c.TienNuoc, 0),
        };
      });

      const chiSoMoiNhat = chiSoFormatted[0] || null;
      const hoaDonGanNhat = dsHoaDon[0] || null;

      const hopDongHienTai =
        myContracts.find(
          (hd) =>
            targetRoomIds.includes(Number(hd.MaPhong)) &&
            ['ConHieuLuc', 'DangThue', 'HieuLuc'].includes(String(hd.TrangThai))
        ) ||
        myContracts[0] ||
        null;

      let soNgayHopDongConLai = null;
      if (hopDongHienTai && hopDongHienTai.NgayKT) {
        const todayStr = new Date().toISOString().slice(0, 10);
        soNgayHopDongConLai = Math.ceil(
          (new Date(hopDongHienTai.NgayKT).getTime() -
            new Date(todayStr).getTime()) /
            86400000
        );
      }

      const ctCurrent =
        dsChiTietCuaToi.find(
          (ct) =>
            hopDongHienTai &&
            Number(ct.MaHDT) === Number(hopDongHienTai.MaHDT)
        ) ||
        dsChiTietCuaToi[0] ||
        null;

      const roomOfHopDong = hopDongHienTai
        ? myRooms.find(
            (r) => Number(r.MaPhong) === Number(hopDongHienTai.MaPhong)
          )
        : null;

      return res.status(200).json({
        success: true,
        data: {
          boLoc: {
            tuThang: tuThangApDung,
            denThang: denThangApDung,
            phongList: myRooms,
          },
          tongQuan: {
            tongChiPhiTrongKy,
            tongDaThanhToan,
            tongCongNoHienTai,
            dienTieuThuKyGanNhat: chiSoMoiNhat
              ? chiSoMoiNhat.SoDienTieuThu
              : 0,
            nuocTieuThuKyGanNhat: chiSoMoiNhat
              ? chiSoMoiNhat.SoNuocTieuThu
              : 0,
            kyDienNuocGanNhat: chiSoMoiNhat ? chiSoMoiNhat.NgayGhiStr : null,
            soNgayHopDongConLai,
            trangThaiTamTru: ctCurrent ? ctCurrent.TamTru : 'ChuaDangKy',
          },
          coCauChiPhi: {
            tienPhong: coCauTienPhong,
            tienDien: coCauTienDien,
            tienNuoc: coCauTienNuoc,
            tienPhuPhi: coCauTienPhuPhi,
            tienPhatSinh: coCauTienPhatSinh,
          },
          bieuDoChiPhiTheoThang,
          bieuDoDienNuocTheoThang,
          hoaDonGanNhat,
          hopDongHienTai: hopDongHienTai
            ? {
                ...hopDongHienTai,
                TenPhong: roomOfHopDong ? roomOfHopDong.TenPhong : '',
                TenKhu: roomOfHopDong ? roomOfHopDong.TenKhu : '',
              }
            : null,
        },
      });
    } catch (error) {
      console.error('Lỗi getThongKeNguoiThue:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi tải dữ liệu thống kê của người thuê',
      });
    }
  },
};

module.exports = ThongKeController;