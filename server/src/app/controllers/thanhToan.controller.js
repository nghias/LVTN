// server/src/app/controllers/ThanhToanController.js
const crypto = require('crypto');
const db = require('../../database/db');
const HoaDonModel = require('../models/hoaDon.model');
const ThanhToanModel = require('../models/thanhToan.model');
const ThongTinThanhToanModel = require('../models/thongTinThanhToan.model');

// Khóa cấu hình PayOS
const PAYOS_CLIENT_ID =
  process.env.PAYOS_CLIENT_ID || '8355a8cb-4e14-4b30-b467-0083dc9e73cd';
const PAYOS_API_KEY =
  process.env.PAYOS_API_KEY || '3d8a9833-d1eb-4fc1-805c-7ad441e82e7f';
const PAYOS_CHECKSUM_KEY =
  process.env.PAYOS_CHECKSUM_KEY ||
  'b434d4727cf7878f62d483190670ab1efe77a6d2e';

// Hàm lấy MaND đang đăng nhập (Tương thích cả req.user.maND, req.user.MaND, query, body)
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

// Lấy thông tin tài khoản thực tế từ DB để kiểm tra chính xác quyền ChuTro / QuanLy / KhachThue
async function getCurrentUserFromDB(req) {
  const maND = extractCurrentMaND(req);
  if (!maND) return null;
  const [rows] = await db.execute(
    `SELECT MaND, TenTK, Quyen FROM nguoidung WHERE MaND = ? LIMIT 1`,
    [Number(maND)]
  );
  return rows[0] || null;
}

// Kiểm tra có phải Chủ trọ hay không (Chỉ Chủ trọ mới được sửa ThongTinThanhToan)
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

  // 1. Chủ trọ: Toàn quyền tất cả các phòng & khu trọ
  if (role === 'ChuTro' || role === 'Admin' || maND === 1) {
    return {
      allowedRoomIds: allRooms.map((r) => Number(r.MaPhong)),
      allRooms,
      allKhu,
    };
  }

  // 2. Quản lý: Chỉ được xem và xác nhận trả tiền mặt cho các phòng thuộc Khu trọ mình quản lý
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

  // 3. Khách thuê: Chỉ xem và thanh toán hóa đơn của phòng mình đang thuê
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

// Hàm tạo chữ ký HMAC-SHA256 cho PayOS Create Payment Link
function createPayOSSignature({ amount, cancelUrl, description, orderCode, returnUrl }) {
  const dataStr = `amount=${amount}&cancelUrl=${cancelUrl}&description=${description}&orderCode=${orderCode}&returnUrl=${returnUrl}`;
  return crypto
    .createHmac('sha256', PAYOS_CHECKSUM_KEY)
    .update(dataStr)
    .digest('hex');
}

// Hàm xác thực chữ ký Webhook từ PayOS gửi về
function verifyPayOSWebhookSignature(webhookBody) {
  if (!webhookBody || !webhookBody.data || !webhookBody.signature) return false;
  const dataObj = webhookBody.data;
  const sortedKeys = Object.keys(dataObj).sort();
  const queryString = sortedKeys
    .map((key) => {
      let val = dataObj[key];
      if (val === null || val === undefined || val === 'undefined' || val === 'null') {
        val = '';
      } else if (typeof val === 'object') {
        val = JSON.stringify(val);
      }
      return `${key}=${val}`;
    })
    .join('&');

  const computedSig = crypto
    .createHmac('sha256', PAYOS_CHECKSUM_KEY)
    .update(queryString)
    .digest('hex');

  return computedSig === webhookBody.signature;
}

// Hàm đồng bộ lại cột TienDaTra trong bảng HoaDon từ tổng các giao dịch ThanhCong
async function syncHoaDonTienDaTra(maHD) {
  const hoaDon = await HoaDonModel.getById(maHD);
  if (!hoaDon) return null;
  const totalPaid = await ThanhToanModel.getTotalPaidByMaHD(maHD);
  await HoaDonModel.updateTienDaTra(maHD, totalPaid);
  return totalPaid;
}

// Lấy mã OrderCode từ cột OrderCode (ưu tiên) hoặc trích xuất dự phòng từ GhiChu / MinhChung
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
      const primary = await ThongTinThanhToanModel.getPrimary();
      const allList = await ThongTinThanhToanModel.getAll();

      return res.status(200).json({
        success: true,
        data: primary,
        list: allList,
        canEdit: isLandlordRole(currentUser),
      });
    } catch (error) {
      console.error('Lỗi getThongTinThanhToan:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi lấy thông tin thanh toán',
      });
    }
  },

  // 2. PUT /api/thanh-toan/thong-tin (CHỈ CHỦ TRỌ MỚI CÓ QUYỀN CẬP NHẬT)
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

      const { MaTT, TenNganHang, STK, ChuTaiKhoan } = req.body;
      if (!TenNganHang || !STK || !ChuTaiKhoan) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng nhập đầy đủ Tên ngân hàng, Số tài khoản và Chủ tài khoản',
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
        });
      } else {
        await ThongTinThanhToanModel.create({
          MaND: currentUser.MaND || 1,
          TenNganHang,
          STK,
          ChuTaiKhoan,
        });
      }

      const updated = await ThongTinThanhToanModel.getPrimary();
      return res.status(200).json({
        success: true,
        message: 'Cập nhật thông tin tài khoản nhận thanh toán thành công!',
        data: updated,
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

      const { allowedRoomIds, allRooms, allKhu } = await getAccessibleRoomsAndKhu(
        currentUser
      );
      const thongTinNH = await ThongTinThanhToanModel.getPrimary();
      const canEditPaymentInfo = isLandlordRole(currentUser);

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

      // Lấy danh sách hóa đơn của các phòng được phép truy cập
      const hoaDons = await HoaDonModel.getByRoomIds(allowedRoomIds);
      const maHDList = hoaDons.map((hd) => Number(hd.MaHD));

      // Lấy lịch sử thanh toán của các hóa đơn đó
      const thanhToans = await ThanhToanModel.getByMaHDList(maHDList);

      // Lấy tên khách đại diện theo từng phòng
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
            HoTen: row.HoTen || `Khách #${row.MaND}`,
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
          TenPhong: room?.TenPhong || `Phòng #${hd.MaPhong}`,
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
        message: 'Lỗi máy chủ khi tải dữ liệu quản lý thanh toán: ' + error.message,
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

      const { allowedRoomIds, allRooms, allKhu } = await getAccessibleRoomsAndKhu(
        currentUser
      );
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

      // Lấy Hợp đồng đang có hiệu lực và người đại diện của phòng
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

      const [lichSu, thongTinNH] = await Promise.all([
        ThanhToanModel.getByMaHD(maHD),
        ThongTinThanhToanModel.getPrimary(),
      ]);

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
            TenPhong: room?.TenPhong || `Phòng #${hoaDon.MaPhong}`,
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

      // Lấy MaHDT của hợp đồng phòng đó để gắn vào nội dung chuyển khoản
      const [hdRows] = await db.execute(
        `SELECT MaHDT FROM hopdongthue WHERE MaPhong = ? ORDER BY CASE WHEN TrangThai = 'ConHieuLuc' THEN 0 ELSE 1 END, MaHDT DESC LIMIT 1`,
        [Number(hoaDon.MaPhong)]
      );
      const maHDT = hdRows[0]?.MaHDT || null;

      // Nội dung chuyển khoản có sẵn thông tin Hợp đồng & Hóa đơn (Tối đa 25 ký tự theo chuẩn Napas/PayOS)
      const rawDesc = maHDT
        ? `HDT${maHDT} HD${hoaDon.MaHD} ${tenPhong}`
        : `HD${hoaDon.MaHD} ${tenPhong}`;
      const description = rawDesc.replace(/[^a-zA-Z0-9 ]/g, '').slice(0, 25);

      const thongTinNH = await ThongTinThanhToanModel.getPrimary();

      // Kiểm tra xem hóa đơn này đã có giao dịch PayOS đang chờ (ChoXacNhan) với cùng số tiền chưa
      if (!forceNew) {
        const existingList = await ThanhToanModel.getByMaHD(hoaDon.MaHD);
        const pendingPayOS = existingList.find(
          (item) =>
            item.PhuongThuc === 'ChuyenKhoan' &&
            item.TrangThai === 'ChoXacNhan' &&
            Number(item.SoTien) === soTienThanhToan &&
            extractOrderCode(
              item.OrderCode ?? item.orderCode,
              item.GhiChu,
              item.MinhChung
            )
        );

        if (pendingPayOS) {
          const existingOrderCode = extractOrderCode(
            pendingPayOS.OrderCode ?? pendingPayOS.orderCode,
            pendingPayOS.GhiChu,
            pendingPayOS.MinhChung
          );
          try {
            const checkRes = await fetch(
              `https://api-merchant.payos.vn/v2/payment-requests/${existingOrderCode}`,
              {
                method: 'GET',
                headers: {
                  'x-client-id': PAYOS_CLIENT_ID,
                  'x-api-key': PAYOS_API_KEY,
                },
              }
            );
            const checkJson = await checkRes.json();

            if (checkJson?.code === '00' && checkJson?.data) {
              // Nếu đơn cũ đã được thanh toán trên PayOS -> Tự động gạch nợ luôn!
              if (checkJson.data.status === 'PAID') {
                await ThanhToanModel.updateStatus(pendingPayOS.MaTT, {
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
                    MaTT: pendingPayOS.MaTT,
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
                  },
                });
              }
            }
          } catch (e) {
            // Nếu lỗi kết nối thì tiếp tục tạo mới bên dưới
          }
        }
      }

      const orderCode = Number(
        `${hoaDon.MaHD}${Date.now().toString().slice(-7)}`
      );
      const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
      const returnUrl = `${clientUrl}/chuTro/thanhToan/xacNhan/${hoaDon.MaHD}?payos=success&orderCode=${orderCode}`;
      const cancelUrl = `${clientUrl}/chuTro/thanhToan/xacNhan/${hoaDon.MaHD}?payos=cancel`;

      const maTT = await ThanhToanModel.create({
        MaHD: hoaDon.MaHD,
        SoTien: soTienThanhToan,
        PhuongThuc: 'ChuyenKhoan',
        OrderCode: orderCode,
        MinhChung: String(orderCode),
        GhiChu: `[PAYOS:${orderCode}] Tự động xác thực ${description}`,
        TrangThai: 'ChoXacNhan',
      });

      const signature = createPayOSSignature({
        amount: soTienThanhToan,
        cancelUrl,
        description,
        orderCode,
        returnUrl,
      });

      const response = await fetch(
        'https://api-merchant.payos.vn/v2/payment-requests',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-client-id': PAYOS_CLIENT_ID,
            'x-api-key': PAYOS_API_KEY,
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
              payosResult.data.accountNumber || thongTinNH?.STK || '0931493785',
            accountName:
              payosResult.data.accountName ||
              thongTinNH?.ChuTaiKhoan ||
              'TRAN TUAN NGHIA',
            bin: payosResult.data.bin || '970422',
            thongTinNganHang: thongTinNH,
          },
        });
      }

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
          payosNote: payosResult?.desc || '',
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

      // 1. Trả về 200 OK ngay lập tức cho gói tin kiểm tra Webhook của PayOS (orderCode = 123)
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

      // 2. Kiểm tra chữ ký HMAC hoặc đối chiếu trực tiếp với PayOS API
      let isVerified = verifyPayOSWebhookSignature(body) && body.code === '00';

      if (!isVerified) {
        try {
          const checkRes = await fetch(
            `https://api-merchant.payos.vn/v2/payment-requests/${orderCode}`,
            {
              method: 'GET',
              headers: {
                'x-client-id': PAYOS_CLIENT_ID,
                'x-api-key': PAYOS_API_KEY,
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
          console.error('Lỗi đối chiếu PayOS API trong Webhook:', verifyErr.message);
        }
      }

      // 3. Nếu đã xác thực thanh toán thành công -> Cập nhật bảng ThanhToan và HoaDon
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

      const response = await fetch(
        `https://api-merchant.payos.vn/v2/payment-requests/${orderCode}`,
        {
          method: 'GET',
          headers: {
            'x-client-id': PAYOS_CLIENT_ID,
            'x-api-key': PAYOS_API_KEY,
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
      return res.status(500).json({
        success: false,
        message: 'Không thể kiểm tra trạng thái giao dịch PayOS',
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
      if (!['ChuTro', 'QuanLy', 'Admin'].includes(role) && Number(currentUser?.MaND) !== 1) {
        return res.status(403).json({
          success: false,
          message: 'Chỉ Chủ trọ hoặc Quản lý khu trọ mới có quyền xác nhận thu tiền!',
        });
      }

      const { MaHD, SoTien, PhuongThuc = 'TienMat', OrderCode = null, GhiChu, MinhChung } = req.body;
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
          message: 'Bạn không có quyền xác nhận thanh toán cho phòng thuộc khu trọ khác!',
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
          `${nguoiXacNhan} xác nhận đã thu ${PhuongThuc === 'TienMat' ? 'tiền mặt' : 'chuyển khoản'}`,
        TrangThai: 'ThanhCong',
      });

      const totalPaid = await syncHoaDonTienDaTra(hoaDon.MaHD);

      return res.status(201).json({
        success: true,
        message: 'Đã xác nhận trả tiền và cập nhật công nợ hóa đơn thành công!',
        data: {
          MaTT: maTT,
          TienDaTraMoi: totalPaid,
        },
      });
    } catch (error) {
      console.error('Lỗi thuTienMatTrucTiep:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi xác nhận thu tiền mặt',
      });
    }
  },

  // 10. PUT /api/thanh-toan/duyet/:maTT
  duyetGiaoDichThanhToan: async (req, res) => {
    try {
      const currentUser = await getCurrentUserFromDB(req);
      const role = String(currentUser?.Quyen || '').trim();
      if (!['ChuTro', 'QuanLy', 'Admin'].includes(role) && Number(currentUser?.MaND) !== 1) {
        return res.status(403).json({
          success: false,
          message: 'Chỉ Chủ trọ hoặc Quản lý mới được quyền duyệt xác nhận trả tiền!',
        });
      }

      const maTT = Number(req.params.maTT);
      const { TrangThai, GhiChu } = req.body;

      if (!['ThanhCong', 'TuChoi'].includes(TrangThai)) {
        return res.status(400).json({
          success: false,
          message: 'Trạng thái duyệt không hợp lệ (Chỉ nhận ThanhCong hoặc TuChoi)',
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
            TrangThai === 'ThanhCong' ? 'xác nhận nhận tiền' : 'từ chối giao dịch'
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
        message: 'Lỗi máy chủ khi duyệt xác nhận thanh toán',
      });
    }
  },
};

module.exports = ThanhToanController;