// server/src/app/controllers/ThanhToanController.js
const crypto = require('crypto');
const db = require('../../database/db');
const HoaDonModel = require('../models/hoaDon.model');
const ThanhToanModel = require('../models/thanhToan.model');
const ThongTinThanhToanModel = require('../models/thongTinThanhToan.model');
const DatPhongController = require('./datPhong.controller');

// Hàm lấy bộ khóa PayOS đang hoạt động: Ưu tiên đọc từ DB (ThongTinThanhToan) -> Fallback về .env
function resolvePayOSCredentials(thongTinNH) {
  const clientId = (
    thongTinNH?.PayosClientId || process.env.PAYOS_CLIENT_ID
  ).trim();
  const apiKey = (
    thongTinNH?.PayosApiKey || process.env.PAYOS_API_KEY
  ).trim();
  const checksumKey = (
    thongTinNH?.PayosChecksumKey || process.env.PAYOS_CHECKSUM_KEY
  ).trim();

  return { clientId, apiKey, checksumKey };
}

// Ẩn khóa bí mật PayOS khi trả dữ liệu về cho Khách thuê hoặc Quản lý (Chỉ Chủ trọ mới xem được khóa)
function sanitizeThongTinNH(info, includeSecrets = false) {
  if (!info) return null;
  const hasCustomPayosKeys = Boolean(
    info.PayosClientId && info.PayosApiKey && info.PayosChecksumKey
  );

  if (includeSecrets) {
    return {
      ...info,
      PayosClientId: info.PayosClientId || '',
      PayosApiKey: info.PayosApiKey || '',
      PayosChecksumKey: info.PayosChecksumKey || '',
      hasCustomPayosKeys,
    };
  }

  const {
    PayosClientId,
    PayosApiKey,
    PayosChecksumKey,
    ...publicFields
  } = info;
  return {
    ...publicFields,
    hasCustomPayosKeys,
  };
}

// Hàm lấy MaND đang đăng nhập
function extractCurrentMaND(req) {
  return (
    req.user?.maND ||
    req.user?.MaND ||
    req.user?.id ||
    req.query?.MaND ||
    req.body?.MaND ||
    null
  );
}

// Lấy thông tin tài khoản thực tế từ DB
async function getCurrentUserFromDB(req) {
  const maND = extractCurrentMaND(req);
  if (!maND) return null;
  const [rows] = await db.execute(
    `SELECT MaND, TenTK, Quyen FROM nguoidung WHERE MaND = ? LIMIT 1`,
    [Number(maND)]
  );
  return rows[0] || null;
}

// Kiểm tra có phải Chủ trọ hay không
function isLandlordRole(user) {
  if (!user) return false;
  const role = String(user.Quyen || '').trim();
  return role === 'ChuTro' || role === 'Admin' || Number(user.MaND) === 1;
}

// Lấy danh sách Phòng và Khu trọ mà user hiện tại được phép truy cập
async function getAccessibleRoomsAndKhu(user) {
  const role = String(user?.Quyen || '').trim();
  const maND = Number(user?.MaND);

  const [allRooms] = await db.execute(
    `SELECT MaPhong, MaKhu, TenPhong, Gia, TrangThai FROM phong ORDER BY MaKhu ASC, TenPhong ASC`
  );
  const [allKhu] = await db.execute(
    `SELECT MaKhu, MaND, TenKhu, DiaChi FROM khutro ORDER BY MaKhu ASC`
  );

  if (role === 'ChuTro' || role === 'Admin' || maND === 1) {
    return {
      allowedRoomIds: allRooms.map((r) => Number(r.MaPhong)),
      allRooms,
      allKhu,
    };
  }

  if (role === 'QuanLy') {
    const myKhuIds = allKhu
      .filter((k) => Number(k.MaND) === maND)
      .map((k) => Number(k.MaKhu));
    const allowedRoomIds = allRooms
      .filter((r) => myKhuIds.includes(Number(r.MaKhu)))
      .map((r) => Number(r.MaPhong));
    return {
      allowedRoomIds,
      allRooms: allRooms.filter((r) => myKhuIds.includes(Number(r.MaKhu))),
      allKhu: allKhu.filter((k) => myKhuIds.includes(Number(k.MaKhu))),
    };
  }

  const [myRoomRows] = await db.execute(
    `SELECT DISTINCT hdt.MaPhong
     FROM chitiethopdongthue ct
     INNER JOIN hopdongthue hdt ON ct.MaHDT = hdt.MaHDT
     WHERE ct.MaND = ?`,
    [maND]
  );
  const myRoomIds = myRoomRows.map((r) => Number(r.MaPhong));

  return {
    allowedRoomIds: myRoomIds,
    allRooms: allRooms.filter((r) => myRoomIds.includes(Number(r.MaPhong))),
    allKhu,
  };
}

// Hàm tạo chữ ký HMAC-SHA256 cho PayOS Create Payment Link (Nhận checksumKey động)
function createPayOSSignature(
  { amount, cancelUrl, description, orderCode, returnUrl },
  checksumKey = ENV_PAYOS_CHECKSUM_KEY
) {
  const dataStr = `amount=${amount}&cancelUrl=${cancelUrl}&description=${description}&orderCode=${orderCode}&returnUrl=${returnUrl}`;
  return crypto
    .createHmac('sha256', checksumKey)
    .update(dataStr)
    .digest('hex');
}

// Hàm xác thực chữ ký Webhook từ PayOS gửi về (Nhận checksumKey động)
function verifyPayOSWebhookSignature(
  webhookBody,
  checksumKey = ENV_PAYOS_CHECKSUM_KEY
) {
  if (!webhookBody || !webhookBody.data || !webhookBody.signature) return false;
  const dataObj = webhookBody.data;
  const sortedKeys = Object.keys(dataObj).sort();
  const queryString = sortedKeys
    .map((key) => {
      let val = dataObj[key];
      if (
        val === null ||
        val === undefined ||
        val === 'undefined' ||
        val === 'null'
      ) {
        val = '';
      } else if (typeof val === 'object') {
        val = JSON.stringify(val);
      }
      return `${key}=${val}`;
    })
    .join('&');

  const computedSig = crypto
    .createHmac('sha256', checksumKey)
    .update(queryString)
    .digest('hex');

  return computedSig === webhookBody.signature;
}

// Hàm đồng bộ lại cột TienDaTra trong bảng HoaDon an toàn
async function syncHoaDonTienDaTra(maHD) {
  const hoaDon = await HoaDonModel.getById(maHD);
  if (!hoaDon) return null;
  const totalPaid = await ThanhToanModel.getTotalPaidByMaHD(maHD);

  if (typeof HoaDonModel.updateTienDaTra === 'function') {
    await HoaDonModel.updateTienDaTra(maHD, totalPaid);
  } else {
    try {
      await db.execute(`UPDATE hoadon SET TienDaTra = ? WHERE MaHD = ?`, [
        Number(totalPaid) || 0,
        Number(maHD),
      ]);
    } catch {
      await db.execute(`UPDATE HoaDon SET TienDaTra = ? WHERE MaHD = ?`, [
        Number(totalPaid) || 0,
        Number(maHD),
      ]);
    }
  }

  if (
    Number(totalPaid) >= Number(hoaDon.TongTien) &&
    Number(hoaDon.TongTien) > 0
  ) {
    await ThanhToanModel.cleanupDuplicatePendingPayOS(maHD, null);
  }

  return totalPaid;
}

// Lấy mã OrderCode từ cột OrderCode hoặc trích xuất từ GhiChu / MinhChung
function extractOrderCode(orderCodeColumn, ghiChu, minhChung) {
  if (
    orderCodeColumn !== null &&
    orderCodeColumn !== undefined &&
    String(orderCodeColumn).trim() !== ''
  ) {
    const parsed = Number(orderCodeColumn);
    if (!Number.isNaN(parsed) && parsed > 0) return parsed;
  }
  if (ghiChu) {
    const match = String(ghiChu).match(/\[PAYOS:(\d+)\]/);
    if (match) return Number(match[1]);
  }
  if (minhChung && /^\d+$/.test(String(minhChung).trim())) {
    return Number(String(minhChung).trim());
  }
  return null;
}

const ThanhToanController = {
  // 1. GET /api/thanh-toan/thong-tin
  getThongTinThanhToan: async (req, res) => {
    try {
      const currentUser = await getCurrentUserFromDB(req);
      const canEdit = isLandlordRole(currentUser);
      const primary = await ThongTinThanhToanModel.getPrimary();
      const allList = await ThongTinThanhToanModel.getAll();

      return res.status(200).json({
        success: true,
        data: sanitizeThongTinNH(primary, canEdit),
        list: allList.map((item) => sanitizeThongTinNH(item, canEdit)),
        canEdit,
      });
    } catch (error) {
      console.error('Lỗi getThongTinThanhToan:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi lấy thông tin thanh toán',
      });
    }
  },

  // 2. PUT /api/thanh-toan/thong-tin (Hỗ trợ cập nhật cả STK lẫn bộ 3 khóa PayOS)
  updateThongTinThanhToan: async (req, res) => {
    try {
      const currentUser = await getCurrentUserFromDB(req);
      if (!isLandlordRole(currentUser)) {
        return res.status(403).json({
          success: false,
          message:
            'Chỉ Chủ trọ mới có quyền cập nhật thông tin thanh toán. Quản lý không có quyền thực hiện thao tác này!',
        });
      }

      const {
        MaTT,
        TenNganHang,
        STK,
        ChuTaiKhoan,
        PayosClientId,
        PayosApiKey,
        PayosChecksumKey,
      } = req.body;

      if (!TenNganHang || !STK || !ChuTaiKhoan) {
        return res.status(400).json({
          success: false,
          message:
            'Vui lòng nhập đầy đủ Tên ngân hàng, Số tài khoản và Chủ tài khoản',
        });
      }

      // Kiểm tra nếu Chủ trọ có nhập khóa PayOS thì phải nhập đủ cả 3 khóa
      const cId = PayosClientId !== undefined ? String(PayosClientId).trim() : undefined;
      const aKey = PayosApiKey !== undefined ? String(PayosApiKey).trim() : undefined;
      const csKey = PayosChecksumKey !== undefined ? String(PayosChecksumKey).trim() : undefined;

      const hasAnyKey = Boolean(cId || aKey || csKey);
      const hasAllKeys = Boolean(cId && aKey && csKey);

      if (hasAnyKey && !hasAllKeys) {
        return res.status(400).json({
          success: false,
          message:
            'Nếu cấu hình liên kết PayOS mới, vui lòng nhập đầy đủ cả 3 khóa: Client ID, API Key và Checksum Key (hoặc để trống cả 3 để dùng cấu hình mặc định)!',
        });
      }

      const existing = MaTT
        ? await ThongTinThanhToanModel.getById(MaTT)
        : await ThongTinThanhToanModel.getPrimary();

      if (existing) {
        await ThongTinThanhToanModel.update(existing.MaTT, {
          TenNganHang,
          STK,
          ChuTaiKhoan,
          PayosClientId: cId,
          PayosApiKey: aKey,
          PayosChecksumKey: csKey,
        });
      } else {
        await ThongTinThanhToanModel.create({
          MaND: currentUser.MaND || 1,
          TenNganHang,
          STK,
          ChuTaiKhoan,
          PayosClientId: cId || null,
          PayosApiKey: aKey || null,
          PayosChecksumKey: csKey || null,
        });
      }

      // Xóa các giao dịch QR ChoXacNhan cũ để lần tạo QR kế tiếp dùng ngay tài khoản/khóa PayOS mới
      try {
        await db.execute(
          `DELETE FROM ThanhToan WHERE PhuongThuc = 'ChuyenKhoan' AND TrangThai = 'ChoXacNhan'`
        );
      } catch {
        // Bỏ qua nếu bảng không có bản ghi ChoXacNhan
      }

      const updated = await ThongTinThanhToanModel.getPrimary();
      return res.status(200).json({
        success: true,
        message:
          'Cập nhật thông tin tài khoản nhận thanh toán & cấu hình PayOS thành công!',
        data: sanitizeThongTinNH(updated, true),
      });
    } catch (error) {
      console.error('Lỗi updateThongTinThanhToan:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi cập nhật thông tin thanh toán',
      });
    }
  },

  // 3. GET /api/thanh-toan/tong-hop
  getDanhSachVaLichSu: async (req, res) => {
    try {
      const currentUser = await getCurrentUserFromDB(req);
      if (!currentUser) {
        return res.status(401).json({
          success: false,
          message: 'Vui lòng đăng nhập để xem thông tin thanh toán',
        });
      }

      const { allowedRoomIds, allRooms, allKhu } =
        await getAccessibleRoomsAndKhu(currentUser);
      const rawThongTinNH = await ThongTinThanhToanModel.getPrimary();
      const canEditPaymentInfo = isLandlordRole(currentUser);
      const thongTinNH = sanitizeThongTinNH(rawThongTinNH, false);

      if (allowedRoomIds.length === 0) {
        return res.status(200).json({
          success: true,
          data: {
            thongTinThanhToan: thongTinNH,
            canEditPaymentInfo,
            khuTroList: allKhu,
            hoaDonList: [],
            lichSuThanhToan: [],
          },
        });
      }

      const hoaDons = await HoaDonModel.getByRoomIds(allowedRoomIds);
      const maHDList = hoaDons.map((hd) => Number(hd.MaHD));
      const thanhToans = await ThanhToanModel.getByMaHDList(maHDList);

      const [repRows] = await db.execute(
        `SELECT hdt.MaPhong, ct.MaND, COALESCE(ttcn.HoTen, nd.TenTK) AS HoTen, ttcn.SDT, ct.VaiTro
         FROM hopdongthue hdt
         INNER JOIN chitiethopdongthue ct ON hdt.MaHDT = ct.MaHDT
         INNER JOIN nguoidung nd ON ct.MaND = nd.MaND
         LEFT JOIN thongtincanhan ttcn ON nd.MaND = ttcn.MaND
         WHERE hdt.TrangThai = 'ConHieuLuc' AND ct.NgayDi IS NULL
         ORDER BY CASE WHEN ct.VaiTro = 'DaiDien' THEN 0 ELSE 1 END`
      );

      const roomTenantMap = new Map();
      repRows.forEach((row) => {
        const maP = Number(row.MaPhong);
        if (!roomTenantMap.has(maP)) {
          roomTenantMap.set(maP, {
            MaND: row.MaND,
            HoTen: row.HoTen || `Khách`,
            SDT: row.SDT || '',
          });
        }
      });

      const roomMap = new Map(allRooms.map((r) => [Number(r.MaPhong), r]));
      const khuMap = new Map(allKhu.map((k) => [Number(k.MaKhu), k]));
      const hoaDonMap = new Map();

      const enrichedHoaDons = hoaDons.map((hd) => {
        const room = roomMap.get(Number(hd.MaPhong));
        const khu = room ? khuMap.get(Number(room.MaKhu)) : null;
        const tenant = roomTenantMap.get(Number(hd.MaPhong));

        const tongTien = Number(hd.TongTien) || 0;
        const tienDaTra = Number(hd.TienDaTra) || 0;
        const conNo = Math.max(0, tongTien - tienDaTra);

        const gdCuaHD = thanhToans.filter(
          (tt) => Number(tt.MaHD) === Number(hd.MaHD)
        );
        const coChoXacNhan = gdCuaHD.some(
          (tt) =>
            tt.TrangThai === 'ChoXacNhan' ||
            tt.TrangThai === 0 ||
            tt.TrangThai === '0'
        );

        let trangThaiThanhToan = 'ChuaThanhToan';
        if (tienDaTra >= tongTien && tongTien > 0) {
          trangThaiThanhToan = 'DaThanhToan';
        } else if (tienDaTra > 0 && tienDaTra < tongTien) {
          trangThaiThanhToan = 'MotPhan';
        }

        const item = {
          ...hd,
          TongTien: tongTien,
          TienDaTra: tienDaTra,
          ConNo: conNo,
          TrangThaiThanhToan: trangThaiThanhToan,
          CoGiaoDichChoXacNhan: coChoXacNhan,
          MaKhu: room ? Number(room.MaKhu) : null,
          TenPhong: room?.TenPhong || ``,
          TenKhu: khu?.TenKhu || '',
          TenKhachThue: tenant?.HoTen || 'Chưa gắn khách',
          SDTKhachThue: tenant?.SDT || '',
        };
        hoaDonMap.set(Number(hd.MaHD), item);
        return item;
      });

      const enrichedThanhToans = thanhToans.map((tt) => {
        const hdInfo = hoaDonMap.get(Number(tt.MaHD));
        const resolvedOrderCode = extractOrderCode(
          tt.OrderCode ?? tt.orderCode,
          tt.GhiChu,
          tt.MinhChung
        );
        return {
          ...tt,
          SoTien: Number(tt.SoTien) || 0,
          MaPhong: hdInfo?.MaPhong || null,
          MaKhu: hdInfo?.MaKhu || null,
          TenPhong: hdInfo?.TenPhong || '',
          TenKhu: hdInfo?.TenKhu || '',
          TenKhachThue: hdInfo?.TenKhachThue || '',
          NgayTinhHoaDon: hdInfo?.NgayTinh || '',
          TongTienHoaDon: hdInfo?.TongTien || 0,
          OrderCode: resolvedOrderCode,
          orderCode: resolvedOrderCode,
        };
      });

      return res.status(200).json({
        success: true,
        data: {
          thongTinThanhToan: thongTinNH,
          canEditPaymentInfo,
          khuTroList: allKhu,
          hoaDonList: enrichedHoaDons,
          lichSuThanhToan: enrichedThanhToans,
        },
      });
    } catch (error) {
      console.error('Lỗi getDanhSachVaLichSu:', error);
      return res.status(500).json({
        success: false,
        message:
          'Lỗi máy chủ khi tải dữ liệu quản lý thanh toán: ' + error.message,
      });
    }
  },

  // 4. GET /api/thanh-toan/hoa-don/:maHD
  getChiTietThanhToanHoaDon: async (req, res) => {
    try {
      const currentUser = await getCurrentUserFromDB(req);
      if (!currentUser) {
        return res.status(401).json({
          success: false,
          message: 'Vui lòng đăng nhập',
        });
      }

      const maHD = Number(req.params.maHD);
      const hoaDon = await HoaDonModel.getById(maHD);
      if (!hoaDon) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy hóa đơn',
        });
      }

      const { allowedRoomIds, allRooms, allKhu } =
        await getAccessibleRoomsAndKhu(currentUser);
      if (!allowedRoomIds.includes(Number(hoaDon.MaPhong))) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền truy cập hóa đơn của phòng này',
        });
      }

      const room = allRooms.find(
        (r) => Number(r.MaPhong) === Number(hoaDon.MaPhong)
      );
      const khu = room
        ? allKhu.find((k) => Number(k.MaKhu) === Number(room.MaKhu))
        : null;

      const [hdRows] = await db.execute(
        `SELECT hdt.MaHDT, COALESCE(ttcn.HoTen, nd.TenTK) AS TenKhachThue, ttcn.SDT
         FROM hopdongthue hdt
         LEFT JOIN chitiethopdongthue ct ON hdt.MaHDT = ct.MaHDT AND ct.NgayDi IS NULL
         LEFT JOIN nguoidung nd ON ct.MaND = nd.MaND
         LEFT JOIN thongtincanhan ttcn ON nd.MaND = ttcn.MaND
         WHERE hdt.MaPhong = ?
         ORDER BY CASE WHEN hdt.TrangThai = 'ConHieuLuc' THEN 0 ELSE 1 END,
                  CASE WHEN ct.VaiTro = 'DaiDien' THEN 0 ELSE 1 END,
                  hdt.MaHDT DESC
         LIMIT 1`,
        [Number(hoaDon.MaPhong)]
      );
      const hopDongInfo = hdRows[0] || null;

      const [lichSu, rawThongTinNH] = await Promise.all([
        ThanhToanModel.getByMaHD(maHD),
        ThongTinThanhToanModel.getPrimary(),
      ]);
      const thongTinNH = sanitizeThongTinNH(rawThongTinNH, false);

      const tongTien = Number(hoaDon.TongTien) || 0;
      const tienDaTra = Number(hoaDon.TienDaTra) || 0;
      const conNo = Math.max(0, tongTien - tienDaTra);

      return res.status(200).json({
        success: true,
        data: {
          hoaDon: {
            ...hoaDon,
            TongTien: tongTien,
            TienDaTra: tienDaTra,
            ConNo: conNo,
            TenPhong: room?.TenPhong || ``,
            TenKhu: khu?.TenKhu || '',
            MaHDT: hopDongInfo?.MaHDT || null,
            TenKhachThue: hopDongInfo?.TenKhachThue || 'Khách thuê phòng',
            SDTKhachThue: hopDongInfo?.SDT || '',
          },
          thongTinThanhToan: thongTinNH,
          lichSuThanhToan: lichSu.map((tt) => {
            const resolvedOrderCode = extractOrderCode(
              tt.OrderCode ?? tt.orderCode,
              tt.GhiChu,
              tt.MinhChung
            );
            return {
              ...tt,
              SoTien: Number(tt.SoTien) || 0,
              OrderCode: resolvedOrderCode,
              orderCode: resolvedOrderCode,
            };
          }),
        },
      });
    } catch (error) {
      console.error('Lỗi getChiTietThanhToanHoaDon:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi lấy chi tiết thanh toán hóa đơn',
      });
    }
  },

  // 5. POST /api/thanh-toan/tao-link-payos
  taoLinkChuyenKhoanPayOS: async (req, res) => {
    try {
      const currentUser = await getCurrentUserFromDB(req);
      if (!currentUser) {
        return res.status(401).json({
          success: false,
          message: 'Vui lòng đăng nhập',
        });
      }

      const { MaHD, SoTien, forceNew = false } = req.body;
      const hoaDon = await HoaDonModel.getById(MaHD);
      if (!hoaDon) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy hóa đơn cần thanh toán',
        });
      }

      const { allowedRoomIds, allRooms } = await getAccessibleRoomsAndKhu(
        currentUser
      );
      if (!allowedRoomIds.includes(Number(hoaDon.MaPhong))) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền thao tác trên hóa đơn này',
        });
      }

      const conNo = Math.max(
        0,
        Number(hoaDon.TongTien) - Number(hoaDon.TienDaTra)
      );
      if (conNo <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Hóa đơn này đã được thanh toán đủ!',
        });
      }

      const soTienThanhToan =
        SoTien && Number(SoTien) > 0 && Number(SoTien) <= conNo
          ? Math.round(Number(SoTien))
          : Math.round(conNo);

      const room = allRooms.find(
        (r) => Number(r.MaPhong) === Number(hoaDon.MaPhong)
      );
      const tenPhong = (room?.TenPhong || `P${hoaDon.MaPhong}`).replace(
        /[^a-zA-Z0-9]/g,
        ''
      );

      const [hdRows] = await db.execute(
        `SELECT MaHDT FROM hopdongthue WHERE MaPhong = ? ORDER BY CASE WHEN TrangThai = 'ConHieuLuc' THEN 0 ELSE 1 END, MaHDT DESC LIMIT 1`,
        [Number(hoaDon.MaPhong)]
      );
      const maHDT = hdRows[0]?.MaHDT || null;

      const rawDesc = maHDT
        ? `HDT${maHDT} HD${hoaDon.MaHD} ${tenPhong}`
        : `HD${hoaDon.MaHD} ${tenPhong}`;
      const description = rawDesc.replace(/[^a-zA-Z0-9 ]/g, '').slice(0, 25);

      const rawThongTinNH = await ThongTinThanhToanModel.getPrimary();
      const { clientId, apiKey, checksumKey } =
        resolvePayOSCredentials(rawThongTinNH);
      const thongTinNH = sanitizeThongTinNH(rawThongTinNH, false);

      // Bước 1: Kiểm tra giao dịch ChuyenKhoan ChoXacNhan hiện có của hóa đơn này
      const existingList = await ThanhToanModel.getByMaHD(hoaDon.MaHD);
      const pendingPayOSList = existingList.filter(
        (item) =>
          item.PhuongThuc === 'ChuyenKhoan' &&
          item.TrangThai === 'ChoXacNhan'
      );

      let reusableMaTT = null;

      if (pendingPayOSList.length > 0) {
        const latestPending = pendingPayOSList[0];
        reusableMaTT = latestPending.MaTT;

        if (pendingPayOSList.length > 1) {
          await ThanhToanModel.cleanupDuplicatePendingPayOS(
            hoaDon.MaHD,
            reusableMaTT
          );
        }

        const existingOrderCode = extractOrderCode(
          latestPending.OrderCode ?? latestPending.orderCode,
          latestPending.GhiChu,
          latestPending.MinhChung
        );

        if (
          !forceNew &&
          existingOrderCode &&
          Number(latestPending.SoTien) === soTienThanhToan
        ) {
          try {
            const checkRes = await fetch(
              `https://api-merchant.payos.vn/v2/payment-requests/${existingOrderCode}`,
              {
                method: 'GET',
                headers: {
                  'x-client-id': clientId,
                  'x-api-key': apiKey,
                },
              }
            );
            const checkJson = await checkRes.json();

            if (checkJson?.code === '00' && checkJson?.data) {
              if (checkJson.data.status === 'PAID') {
                await ThanhToanModel.updateStatus(reusableMaTT, {
                  TrangThai: 'ThanhCong',
                  OrderCode: existingOrderCode,
                  NgayTT: true,
                });
                await syncHoaDonTienDaTra(hoaDon.MaHD);
              } else if (checkJson.data.status === 'PENDING') {
                return res.status(200).json({
                  success: true,
                  message: 'Đã tải mã QR PayOS của hợp đồng & hóa đơn',
                  data: {
                    MaTT: reusableMaTT,
                    MaHD: hoaDon.MaHD,
                    MaHDT: maHDT,
                    OrderCode: existingOrderCode,
                    orderCode: existingOrderCode,
                    amount: soTienThanhToan,
                    description: checkJson.data.description || description,
                    checkoutUrl: `https://pay.payos.vn/web/${checkJson.data.id}`,
                    qrCode: checkJson.data.qrCode || null,
                    accountNumber:
                      checkJson.data.accountNumber ||
                      thongTinNH?.STK ||
                      '0931493785',
                    accountName:
                      checkJson.data.accountName ||
                      thongTinNH?.ChuTaiKhoan ||
                      'TRAN TUAN NGHIA',
                    bin: checkJson.data.bin || '970422',
                    thongTinNganHang: thongTinNH,
                    payosCreated: true,
                  },
                });
              }
            }
          } catch (err) {
            console.error('Lỗi kiểm tra đơn PayOS cũ:', err.message);
          }

          if (!forceNew) {
            const createdTime = latestPending.NgayTT
              ? new Date(latestPending.NgayTT).getTime()
              : 0;
            if (createdTime > 0 && Date.now() - createdTime < 60000) {
              return res.status(200).json({
                success: true,
                message: 'Giữ nguyên mã giao dịch đang chờ xác nhận',
                data: {
                  MaTT: reusableMaTT,
                  MaHD: hoaDon.MaHD,
                  MaHDT: maHDT,
                  OrderCode: existingOrderCode,
                  orderCode: existingOrderCode,
                  amount: soTienThanhToan,
                  description,
                  checkoutUrl: null,
                  qrCode: null,
                  accountNumber: thongTinNH?.STK || '0931493785',
                  accountName: thongTinNH?.ChuTaiKhoan || 'TRAN TUAN NGHIA',
                  bin: '970422',
                  thongTinNganHang: thongTinNH,
                  payosCreated: false,
                  payosNote:
                    'Đơn hàng chưa tạo được trên PayOS (Kiểm tra lại bộ khóa PayOS trong mục Thiết lập thanh toán).',
                },
              });
            }
          }
        }
      }

      // Bước 2: Sinh orderCode mới
      const orderCode = Number(
        `${hoaDon.MaHD}${Date.now().toString().slice(-7)}`
      );
      const clientUrl =
        process.env.CLIENT_URL || 'https://thexomtro.vercel.app';
      const returnUrl = `${clientUrl}/chuTro/thanhToan/xacNhan/${hoaDon.MaHD}?payos=success&orderCode=${orderCode}`;
      const cancelUrl = `${clientUrl}/chuTro/thanhToan/xacNhan/${hoaDon.MaHD}?payos=cancel`;

      let maTT = reusableMaTT;
      if (maTT) {
        await ThanhToanModel.updateStatus(maTT, {
          TrangThai: 'ChoXacNhan',
          OrderCode: orderCode,
          MinhChung: String(orderCode),
          GhiChu: `[PAYOS:${orderCode}] Tự động xác thực ${description}`,
          NgayTT: true,
        });
      } else {
        maTT = await ThanhToanModel.create({
          MaHD: hoaDon.MaHD,
          SoTien: soTienThanhToan,
          PhuongThuc: 'ChuyenKhoan',
          OrderCode: orderCode,
          MinhChung: String(orderCode),
          GhiChu: `[PAYOS:${orderCode}] Tự động xác thực ${description}`,
          TrangThai: 'ChoXacNhan',
        });
      }

      // Bước 3: Gọi API tạo Payment Link của PayOS bằng khóa động từ DB
      const signature = createPayOSSignature(
        {
          amount: soTienThanhToan,
          cancelUrl,
          description,
          orderCode,
          returnUrl,
        },
        checksumKey
      );

      const response = await fetch(
        'https://api-merchant.payos.vn/v2/payment-requests',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-client-id': clientId,
            'x-api-key': apiKey,
          },
          body: JSON.stringify({
            orderCode,
            amount: soTienThanhToan,
            description,
            cancelUrl,
            returnUrl,
            signature,
          }),
        }
      );

      const payosResult = await response.json();

      if (payosResult && payosResult.code === '00' && payosResult.data) {
        return res.status(200).json({
          success: true,
          message: 'Đã tạo mã QR chuyển khoản tự động PayOS!',
          data: {
            MaTT: maTT,
            MaHD: hoaDon.MaHD,
            MaHDT: maHDT,
            OrderCode: orderCode,
            orderCode,
            amount: payosResult.data.amount || soTienThanhToan,
            description: payosResult.data.description || description,
            checkoutUrl: payosResult.data.checkoutUrl,
            qrCode: payosResult.data.qrCode,
            accountNumber:
              payosResult.data.accountNumber ||
              thongTinNH?.STK ||
              '0931493785',
            accountName:
              payosResult.data.accountName ||
              thongTinNH?.ChuTaiKhoan ||
              'TRAN TUAN NGHIA',
            bin: payosResult.data.bin || '970422',
            thongTinNganHang: thongTinNH,
            payosCreated: true,
          },
        });
      }

      console.error('PayOS từ chối tạo Payment Link:', payosResult);

      return res.status(200).json({
        success: true,
        message: 'Đã khởi tạo mã QR chuyển khoản theo hợp đồng',
        data: {
          MaTT: maTT,
          MaHD: hoaDon.MaHD,
          MaHDT: maHDT,
          OrderCode: orderCode,
          orderCode,
          amount: soTienThanhToan,
          description,
          checkoutUrl: null,
          qrCode: null,
          accountNumber: thongTinNH?.STK || '0931493785',
          accountName: thongTinNH?.ChuTaiKhoan || 'TRAN TUAN NGHIA',
          bin: '970422',
          thongTinNganHang: thongTinNH,
          payosCreated: false,
          payosNote:
            payosResult?.desc ||
            'PayOS từ chối tạo đơn (Vui lòng kiểm tra lại Client ID, API Key và Checksum Key trong mục Thiết lập thanh toán)',
        },
      });
    } catch (error) {
      console.error('Lỗi taoLinkChuyenKhoanPayOS:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi khởi tạo mã QR chuyển khoản tự động',
      });
    }
  },

  // 6. POST /api/thanh-toan/webhook
  handlePayOSWebhook: async (req, res) => {
    try {
      const body = req.body || {};

      if (
        !body.data ||
        Number(body.data.orderCode) === 123 ||
        body.data.description === 'VQRIO123'
      ) {
        return res.status(200).json({
          error: 0,
          success: true,
          message: 'Webhook PayOS kết nối thành công!',
          data: null,
        });
      }

      const { orderCode, reference } = body.data;
      if (!orderCode) {
        return res.status(200).json({ error: 0, success: true });
      }
      
      const bookingCheck = await DatPhongController.xacNhanThanhToanCocTuDong(orderCode);
      if (bookingCheck.found) {
        return res.status(200).json({
          success: true,
          message: 'Đã xử lý Webhook PayOS cho đơn đặt cọc giữ phòng.',
        });
      }

      const rawThongTinNH = await ThongTinThanhToanModel.getPrimary();
      const { clientId, apiKey, checksumKey } =
        resolvePayOSCredentials(rawThongTinNH);

      let isVerified =
        (verifyPayOSWebhookSignature(body, checksumKey) ||
          verifyPayOSWebhookSignature(body, ENV_PAYOS_CHECKSUM_KEY)) &&
        body.code === '00';

      if (!isVerified) {
        try {
          const checkRes = await fetch(
            `https://api-merchant.payos.vn/v2/payment-requests/${orderCode}`,
            {
              method: 'GET',
              headers: {
                'x-client-id': clientId,
                'x-api-key': apiKey,
              },
            }
          );
          const checkJson = await checkRes.json();
          if (
            checkJson &&
            checkJson.code === '00' &&
            checkJson.data?.status === 'PAID'
          ) {
            isVerified = true;
          }
        } catch (verifyErr) {
          console.error(
            'Lỗi đối chiếu PayOS API trong Webhook:',
            verifyErr.message
          );
        }
      }

      if (isVerified) {
        const giaoDich = await ThanhToanModel.findByPayOSOrderCode(orderCode);

        if (giaoDich && giaoDich.TrangThai !== 'ThanhCong') {
          await ThanhToanModel.updateStatus(giaoDich.MaTT, {
            TrangThai: 'ThanhCong',
            OrderCode: Number(orderCode),
            MinhChung: reference || String(orderCode),
            GhiChu: `${giaoDich.GhiChu || ''} | Đã xác thực tự động qua PayOS (Mã GD: ${reference || orderCode})`,
            NgayTT: true,
          });

          await syncHoaDonTienDaTra(giaoDich.MaHD);
        }
      }

      return res.status(200).json({
        error: 0,
        success: true,
        message: 'Ok',
        data: null,
      });
    } catch (error) {
      console.error('Lỗi handlePayOSWebhook:', error);
      return res.status(200).json({
        error: 0,
        success: true,
      });
    }
  },

  // 7. GET /api/thanh-toan/kiem-tra-payos/:maTT
  kiemTraTrangThaiPayOS: async (req, res) => {
    try {
      const maTT = Number(req.params.maTT);
      const giaoDich = await ThanhToanModel.getById(maTT);
      if (!giaoDich) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy giao dịch',
        });
      }

      if (giaoDich.TrangThai === 'ThanhCong') {
        const totalPaid = await syncHoaDonTienDaTra(giaoDich.MaHD);
        return res.status(200).json({
          success: true,
          paid: true,
          status: 'PAID',
          orderCode: extractOrderCode(
            giaoDich.OrderCode ?? giaoDich.orderCode,
            giaoDich.GhiChu,
            giaoDich.MinhChung
          ),
          tienDaTra: totalPaid,
          message: 'Giao dịch đã được xác thực thành công!',
        });
      }

      const orderCode = extractOrderCode(
        giaoDich.OrderCode ?? giaoDich.orderCode,
        giaoDich.GhiChu,
        giaoDich.MinhChung
      );
      if (!orderCode) {
        return res.status(200).json({
          success: true,
          paid: false,
          status: 'PENDING',
        });
      }

      const rawThongTinNH = await ThongTinThanhToanModel.getPrimary();
      const { clientId, apiKey } = resolvePayOSCredentials(rawThongTinNH);

      const response = await fetch(
        `https://api-merchant.payos.vn/v2/payment-requests/${orderCode}`,
        {
          method: 'GET',
          headers: {
            'x-client-id': clientId,
            'x-api-key': apiKey,
          },
        }
      );

      const payosInfo = await response.json();
      if (
        payosInfo &&
        payosInfo.code === '00' &&
        payosInfo.data &&
        payosInfo.data.status === 'PAID'
      ) {
        const ref =
          payosInfo.data.transactions?.[0]?.reference || String(orderCode);

        await ThanhToanModel.updateStatus(giaoDich.MaTT, {
          TrangThai: 'ThanhCong',
          OrderCode: Number(orderCode),
          MinhChung: ref,
          GhiChu: `[PAYOS:${orderCode}] Xác thực chuyển khoản tự động thành công`,
          NgayTT: true,
        });

        const totalPaid = await syncHoaDonTienDaTra(giaoDich.MaHD);

        return res.status(200).json({
          success: true,
          paid: true,
          status: 'PAID',
          orderCode: Number(orderCode),
          tienDaTra: totalPaid,
          message: 'Xác thực chuyển khoản tự động thành công!',
        });
      }

      return res.status(200).json({
        success: true,
        paid: false,
        orderCode: Number(orderCode),
        status: payosInfo?.data?.status || 'PENDING',
      });
    } catch (error) {
      console.error('Lỗi kiemTraTrangThaiPayOS:', error);
      return res.status(200).json({
        success: true,
        paid: false,
        status: 'PENDING',
      });
    }
  },

  // 8. POST /api/thanh-toan/tien-mat/yeu-cau
  guiYeuCauTraTienMat: async (req, res) => {
    try {
      const currentUser = await getCurrentUserFromDB(req);
      if (!currentUser) {
        return res.status(401).json({
          success: false,
          message: 'Vui lòng đăng nhập',
        });
      }

      const { MaHD, SoTien, GhiChu, MinhChung } = req.body;
      const hoaDon = await HoaDonModel.getById(MaHD);
      if (!hoaDon) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy hóa đơn',
        });
      }

      const { allowedRoomIds } = await getAccessibleRoomsAndKhu(currentUser);
      if (!allowedRoomIds.includes(Number(hoaDon.MaPhong))) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền thao tác trên hóa đơn này',
        });
      }

      const conNo = Math.max(
        0,
        Number(hoaDon.TongTien) - Number(hoaDon.TienDaTra)
      );
      if (conNo <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Hóa đơn này đã được thanh toán đủ!',
        });
      }

      const soTienTra =
        SoTien && Number(SoTien) > 0 ? Number(SoTien) : conNo;

      const maTT = await ThanhToanModel.create({
        MaHD: hoaDon.MaHD,
        SoTien: soTienTra,
        PhuongThuc: 'TienMat',
        OrderCode: null,
        MinhChung: MinhChung || null,
        GhiChu: GhiChu || 'Người thuê báo trả tiền mặt trực tiếp',
        TrangThai: 'ChoXacNhan',
      });

      return res.status(201).json({
        success: true,
        message:
          'Đã gửi yêu cầu xác nhận trả tiền mặt. Chủ trọ / Quản lý sẽ kiểm tra và xác nhận!',
        data: { MaTT: maTT },
      });
    } catch (error) {
      console.error('Lỗi guiYeuCauTraTienMat:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi gửi yêu cầu trả tiền mặt',
      });
    }
  },

  // 9. POST /api/thanh-toan/xac-nhan-truc-tiep
  thuTienMatTrucTiep: async (req, res) => {
    try {
      const currentUser = await getCurrentUserFromDB(req);
      const role = String(currentUser?.Quyen || '').trim();
      if (
        !['ChuTro', 'QuanLy', 'Admin'].includes(role) &&
        Number(currentUser?.MaND) !== 1
      ) {
        return res.status(403).json({
          success: false,
          message:
            'Chỉ Chủ trọ hoặc Quản lý khu trọ mới có quyền xác nhận thu tiền!',
        });
      }

      const {
        MaHD,
        SoTien,
        PhuongThuc = 'TienMat',
        OrderCode = null,
        GhiChu,
        MinhChung,
      } = req.body;
      const hoaDon = await HoaDonModel.getById(MaHD);
      if (!hoaDon) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy hóa đơn',
        });
      }

      const { allowedRoomIds } = await getAccessibleRoomsAndKhu(currentUser);
      if (!allowedRoomIds.includes(Number(hoaDon.MaPhong))) {
        return res.status(403).json({
          success: false,
          message:
            'Bạn không có quyền xác nhận thanh toán cho phòng thuộc khu trọ khác!',
        });
      }

      const conNo = Math.max(
        0,
        Number(hoaDon.TongTien) - Number(hoaDon.TienDaTra)
      );
      const soTienThu = SoTien && Number(SoTien) > 0 ? Number(SoTien) : conNo;

      if (soTienThu <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Số tiền xác nhận thu phải lớn hơn 0',
        });
      }

      const nguoiXacNhan = isLandlordRole(currentUser) ? 'Chủ trọ' : 'Quản lý';
      const maTT = await ThanhToanModel.create({
        MaHD: hoaDon.MaHD,
        SoTien: soTienThu,
        PhuongThuc,
        OrderCode: OrderCode ? Number(OrderCode) : null,
        MinhChung: MinhChung || null,
        GhiChu:
          GhiChu ||
          `${nguoiXacNhan} xác nhận đã thu ${
            PhuongThuc === 'TienMat' ? 'tiền mặt' : 'chuyển khoản'
          }`,
        TrangThai: 'ThanhCong',
      });

      const totalPaid = await syncHoaDonTienDaTra(hoaDon.MaHD);

      return res.status(201).json({
        success: true,
        message:
          'Đã xác nhận trả tiền và cập nhật công nợ hóa đơn thành công!',
        data: {
          MaTT: maTT,
          TienDaTraMoi: totalPaid,
        },
      });
    } catch (error) {
      console.error('Lỗi thuTienMatTrucTiep:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi xác nhận thu tiền mặt: ' + error.message,
      });
    }
  },

  // 10. PUT /api/thanh-toan/duyet/:maTT
  duyetGiaoDichThanhToan: async (req, res) => {
    try {
      const currentUser = await getCurrentUserFromDB(req);
      const role = String(currentUser?.Quyen || '').trim();
      if (
        !['ChuTro', 'QuanLy', 'Admin'].includes(role) &&
        Number(currentUser?.MaND) !== 1
      ) {
        return res.status(403).json({
          success: false,
          message:
            'Chỉ Chủ trọ hoặc Quản lý mới được quyền duyệt xác nhận trả tiền!',
        });
      }

      const maTT = Number(req.params.maTT);
      const { TrangThai, GhiChu } = req.body;

      if (!['ThanhCong', 'TuChoi'].includes(TrangThai)) {
        return res.status(400).json({
          success: false,
          message:
            'Trạng thái duyệt không hợp lệ (Chỉ nhận ThanhCong hoặc TuChoi)',
        });
      }

      const giaoDich = await ThanhToanModel.getById(maTT);
      if (!giaoDich) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy giao dịch thanh toán',
        });
      }

      const hoaDon = await HoaDonModel.getById(giaoDich.MaHD);
      if (!hoaDon) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy hóa đơn liên kết với giao dịch này',
        });
      }

      const { allowedRoomIds } = await getAccessibleRoomsAndKhu(currentUser);
      if (!allowedRoomIds.includes(Number(hoaDon.MaPhong))) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền xác nhận giao dịch của khu trọ khác!',
        });
      }

      const nguoiDuyet = isLandlordRole(currentUser) ? 'Chủ trọ' : 'Quản lý';
      const ghiChuMoi = GhiChu
        ? `${giaoDich.GhiChu ? giaoDich.GhiChu + ' | ' : ''}${GhiChu}`
        : `${giaoDich.GhiChu ? giaoDich.GhiChu + ' | ' : ''}${nguoiDuyet} đã ${
            TrangThai === 'ThanhCong'
              ? 'xác nhận nhận tiền'
              : 'từ chối giao dịch'
          }`;

      await ThanhToanModel.updateStatus(maTT, {
        TrangThai,
        GhiChu: ghiChuMoi,
        NgayTT: TrangThai === 'ThanhCong',
      });

      const totalPaid = await syncHoaDonTienDaTra(giaoDich.MaHD);

      return res.status(200).json({
        success: true,
        message:
          TrangThai === 'ThanhCong'
            ? 'Xác nhận người thuê đã trả tiền thành công!'
            : 'Đã từ chối giao dịch thanh toán!',
        data: {
          MaTT: maTT,
          TrangThai,
          TienDaTraMoi: totalPaid,
        },
      });
    } catch (error) {
      console.error('Lỗi duyetGiaoDichThanhToan:', error);
      return res.status(500).json({
        success: false,
        message:
          'Lỗi máy chủ khi duyệt xác nhận thanh toán: ' + error.message,
      });
    }
  },
};

module.exports = ThanhToanController;