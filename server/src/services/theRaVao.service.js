// server/src/services/theRaVao.service.js
const crypto = require("crypto");
const db = require("../database/db");
const TheRaVaoModel = require("../app/models/theRaVao.model");
const LichSuTheModel = require("../app/models/lichSuThe.model");
const KhuTroModel = require("../app/models/khuTro.model");
const {
  decryptAES,
  comparePassword,
  hashAccessCode,
  buildCardGiaTriHash,
  isBcryptHash,
} = require("../utils/crypto.util");

// Quản lý phiên ghi thẻ tạm trong bộ nhớ (không sửa DB khi chưa quẹt thẻ)
const WRITE_SESSION_TTL_MS = 60000;
const activeSessionByKhu = new Map(); // maKhu -> sessionId
const sessionById = new Map();        // sessionId -> sessionObject

// Hàng đợi lệnh mở cửa từ điện thoại quét NFC theo từng MaKhu (tự hết hạn sau 20 giây)
const REMOTE_OPEN_TTL_MS = 20000;
const pendingDoorOpenByKhu = new Map(); // maKhu -> { hoTen, tenPhong, createdAt }

function taoMaBiMat(maKhu) {
  const rand = crypto.randomBytes(5).toString("hex").toUpperCase();
  return `K${maKhu}_${rand}`.slice(0, 16);
}

function safeDecrypt(value) {
  if (!value) return null;
  try {
    return decryptAES(value) || value;
  } catch {
    return value;
  }
}

function cleanupExpiredSessions() {
  const now = Date.now();
  for (const [sid, session] of sessionById.entries()) {
    if (session.status === "WAITING" && now > session.expiresAt) {
      session.status = "EXPIRED";
      if (activeSessionByKhu.get(session.maKhu) === sid) {
        activeSessionByKhu.delete(session.maKhu);
      }
    }
    if (session.status !== "WAITING" && now - session.updatedAt > 10 * 60 * 1000) {
      sessionById.delete(sid);
    }
  }

  for (const [maKhu, cmd] of pendingDoorOpenByKhu.entries()) {
    if (now - cmd.createdAt > REMOTE_OPEN_TTL_MS) {
      pendingDoorOpenByKhu.delete(maKhu);
    }
  }
}

const getUserId = (user) => Number(user?.MaND ?? user?.maND);
const getUserRole = (user) => user?.Quyen ?? user?.quyen ?? user?.vaiTro;
const isChuTro = (user) => getUserRole(user) === "ChuTro";
const isQuanLy = (user) => getUserRole(user) === "QuanLy";

async function loadReferenceData() {
  const [[khuTros], [phongs], [hopDongs], [cthdts], [thongTinCaNhans]] =
    await Promise.all([
      db.query(`SELECT MaKhu, TenKhu, MaND, MaMoCua FROM KhuTro ORDER BY MaKhu ASC`),
      db.query(`SELECT MaPhong, TenPhong, MaKhu FROM Phong`),
      db.query(`SELECT MaHDT, MaPhong, TrangThai FROM HopDongThue`),
      db.query(`SELECT MaHDT, MaND, NgayDi FROM ChiTietHopDongThue`),
      db.query(`SELECT MaND, HoTen, SDT FROM ThongTinCaNhan`),
    ]);

  const khuMap = new Map(khuTros.map((k) => [Number(k.MaKhu), k]));
  const phongMap = new Map(phongs.map((p) => [Number(p.MaPhong), p]));
  const profileMap = new Map(thongTinCaNhans.map((t) => [Number(t.MaND), t]));

  const activeHdIds = new Set(
    hopDongs
      .filter((h) => ["ConHieuLuc", "HieuLuc", "DangHieuLuc"].includes(h.TrangThai))
      .map((h) => Number(h.MaHDT))
  );
  const hdMap = new Map(hopDongs.map((h) => [Number(h.MaHDT), h]));

  const activeRentalByMaND = new Map();
  for (const ct of cthdts) {
    const maHDT = Number(ct.MaHDT);
    if (!activeHdIds.has(maHDT) || ct.NgayDi) continue;
    const hd = hdMap.get(maHDT);
    const phong = hd ? phongMap.get(Number(hd.MaPhong)) : null;
    const khu = phong ? khuMap.get(Number(phong.MaKhu)) : null;
    if (phong && khu) {
      activeRentalByMaND.set(Number(ct.MaND), {
        MaHDT: maHDT,
        MaPhong: Number(phong.MaPhong),
        TenPhong: phong.TenPhong,
        MaKhu: Number(khu.MaKhu),
        TenKhu: khu.TenKhu,
      });
    }
  }

  return { khuTros, khuMap, profileMap, activeRentalByMaND };
}

function resolveUserContext(maND, { khuTros, profileMap, activeRentalByMaND }) {
  const id = Number(maND);
  const profile = profileMap.get(id);
  const rental = activeRentalByMaND.get(id);
  const qlKhu = khuTros.find((k) => Number(k.MaND) === id);

  return {
    MaND: id,
    HoTen: profile?.HoTen || "Chưa cập nhật",
    SDT: safeDecrypt(profile?.SDT),
    MaPhong: rental?.MaPhong || null,
    TenPhong: rental?.TenPhong || (qlKhu ? "Quản lý cơ sở" : null),
    MaKhu: rental?.MaKhu ?? (qlKhu ? Number(qlKhu.MaKhu) : null),
    TenKhu: rental?.TenKhu ?? qlKhu?.TenKhu ?? null,
    VaiTroHienThi: rental ? "Khách thuê" : qlKhu ? "Quản lý cơ sở" : "Chưa xếp phòng",
  };
}

const TheRaVaoService = {
  // =========================================================
  // A. THIẾT BỊ IOT (ESP32 + RC522 + KEYPAD HX-543)
  // =========================================================
  async xacThucQuetThe({ maKhu, uid, secret }) {
    if (!maKhu || !uid || !secret) {
      return { allow: false, message: "Thiếu thông tin thẻ hoặc mã khu trọ." };
    }

    // Băm HMAC(UID)|HMAC(UID|SECRET) để đối chiếu với cột GiaTri trong DB
    const giaTriHash = buildCardGiaTriHash(uid, secret);
    const the = await TheRaVaoModel.findByGiaTri(giaTriHash);

    if (!the) {
      return { allow: false, message: "Thẻ không tồn tại hoặc sai mã bảo mật." };
    }
    if (the.TrangThai !== "HoatDong") {
      return { allow: false, message: "Thẻ đang bị khóa hoặc không hoạt động." };
    }

    const ref = await loadReferenceData();
    const maND = Number(the.MaND);
    const ctx = resolveUserContext(maND, ref);

    const quanLyKhu = ref.khuTros.find(
      (k) => Number(k.MaND) === maND && Number(k.MaKhu) === Number(maKhu)
    );
    const rental = ref.activeRentalByMaND.get(maND);

    if (!quanLyKhu) {
      if (!rental) {
        return { allow: false, message: "Khách thuê không còn hợp đồng hiệu lực." };
      }
      if (Number(rental.MaKhu) !== Number(maKhu)) {
        return { allow: false, message: "Thẻ không thuộc cơ sở này." };
      }
    }

    await LichSuTheModel.create(the.MaThe);

    return {
      allow: true,
      message: "Mở cổng thành công",
      data: {
        hoTen: ctx.HoTen,
        tenPhong: ctx.TenPhong || "Ban quản lý",
        tenKhu: quanLyKhu ? quanLyKhu.TenKhu : rental.TenKhu,
      },
    };
  },

  async layLenhGhiThe(maKhu) {
    cleanupExpiredSessions();
    const khuId = Number(maKhu);

    // 1. Ưu tiên kiểm tra lệnh mở cổng qua NFC điện thoại
    const remoteCmd = pendingDoorOpenByKhu.get(khuId);
    if (remoteCmd) {
      pendingDoorOpenByKhu.delete(khuId);
      if (Date.now() - remoteCmd.createdAt <= REMOTE_OPEN_TTL_MS) {
        return {
          openDoor: true,
          source: "NFC",
          hoTen: remoteCmd.hoTen,
          tenPhong: remoteCmd.tenPhong,
          hasJob: false,
        };
      }
    }

    // 2. Kiểm tra lệnh ghi phôi thẻ RFID mới
    const sid = activeSessionByKhu.get(khuId);
    if (!sid) return { openDoor: false, hasJob: false };

    const session = sessionById.get(sid);
    if (!session || session.status !== "WAITING") {
      activeSessionByKhu.delete(khuId);
      return { openDoor: false, hasJob: false };
    }

    return {
      openDoor: false,
      hasJob: true,
      sessionId: session.sessionId,
      mode: session.mode,
      secret: session.secret,
      hoTen: session.hoTen,
      remainingSec: Math.max(0, Math.ceil((session.expiresAt - Date.now()) / 1000)),
    };
  },

  async xacNhanGhiThe({ maKhu, sessionId, uid, secret }) {
    cleanupExpiredSessions();
    const session = sessionById.get(String(sessionId || ""));

    if (!session || session.status !== "WAITING") {
      const err = new Error("Phiên ghi thẻ đã hết hạn hoặc bị hủy.");
      err.statusCode = 400;
      throw err;
    }
    if (Number(session.maKhu) !== Number(maKhu)) {
      const err = new Error("Thiết bị không đúng cơ sở của phiên ghi thẻ.");
      err.statusCode = 403;
      throw err;
    }
    if (session.secret !== String(secret || "").trim()) {
      const err = new Error("Mã bí mật xác nhận không khớp.");
      err.statusCode = 400;
      throw err;
    }

    const cleanUid = String(uid || "").trim().toUpperCase();
    if (!cleanUid) {
      const err = new Error("Thiếu mã UID của phôi thẻ.");
      err.statusCode = 400;
      throw err;
    }

    // Băm UID để kiểm tra phôi thẻ vật lý có đang thuộc về bản ghi khác không
    const hashedUid = hashAccessCode(cleanUid);
    const excludeMaThe = session.mode === "REISSUE" ? session.maThe : 0;
    const dup = await TheRaVaoModel.findByUidPrefix(hashedUid, excludeMaThe);
    if (dup) {
      session.lastError =
        "Phôi thẻ vừa đặt đã được gán cho tài khoản khác! Vui lòng dùng phôi thẻ trắng khác.";
      session.updatedAt = Date.now();
      const err = new Error(session.lastError);
      err.statusCode = 409;
      throw err;
    }

    const giaTriMoiHash = buildCardGiaTriHash(cleanUid, session.secret);
    let finalMaThe = session.maThe;

    if (session.mode === "NEW") {
      const existing = await TheRaVaoModel.findByMaND(session.maND);
      if (existing.length > 0) {
        session.status = "ERROR";
        session.lastError = "Người dùng này đã có thẻ trên hệ thống.";
        session.updatedAt = Date.now();
        activeSessionByKhu.delete(session.maKhu);
        const err = new Error(session.lastError);
        err.statusCode = 409;
        throw err;
      }

      finalMaThe = await TheRaVaoModel.create({
        maND: session.maND,
        giaTri: giaTriMoiHash,
        trangThai: "HoatDong",
        ghiChu: session.ghiChu || "Cấp thẻ mới",
      });
    } else {
      await TheRaVaoModel.reissueById(session.maThe, {
        giaTri: giaTriMoiHash,
        ghiChu: session.ghiChu || "Cấp lại mã thẻ mới",
      });
    }

    session.status = "SUCCESS";
    session.lastError = null;
    session.updatedAt = Date.now();
    // Không trả UID gốc ra Frontend
    session.result = {
      maThe: finalMaThe,
      maND: session.maND,
      trangThai: "HoatDong",
      daMaHoa: true,
    };

    if (activeSessionByKhu.get(session.maKhu) === session.sessionId) {
      activeSessionByKhu.delete(session.maKhu);
    }

    return session.result;
  },

  // Xác thực mật khẩu bàn phím bằng Bcrypt
  async xacThucMatKhau({ maKhu, matKhau }) {
    const khuId = Number(maKhu);
    const cleanPass = String(matKhau || "").trim();

    if (!khuId || !cleanPass) {
      return { allow: false, message: "Thiếu mã cơ sở hoặc mật khẩu." };
    }

    const khu = await KhuTroModel.getById(khuId);
    if (!khu) {
      return { allow: false, message: "Không tìm thấy cơ sở." };
    }

    if (!khu.MatKhau) {
      return { allow: false, message: "Cơ sở chưa thiết lập mật khẩu cửa." };
    }

    const isValid = isBcryptHash(khu.MatKhau)
      ? await comparePassword(cleanPass, khu.MatKhau)
      : false;

    if (!isValid) {
      return { allow: false, message: "Mật khẩu mở cửa không chính xác." };
    }

    return {
      allow: true,
      message: "Mật khẩu hợp lệ! Đang mở cổng...",
      data: {
        maKhu: khuId,
        tenKhu: khu.TenKhu,
      },
    };
  },

  // =========================================================
  // B. NGƯỜI THUÊ & MỞ CỔNG BẰNG NFC ĐIỆN THOẠI
  // =========================================================
  async moCuaBangNFC(user, { maMoCua }) {
    const cleanCode = String(maMoCua || "").trim();
    if (!cleanCode) {
      const err = new Error("Không đọc được mã mở cửa từ thẻ NFC.");
      err.statusCode = 400;
      throw err;
    }

    // Băm HMAC-SHA256 trước khi tìm trong KhuTro.MaMoCua
    const hashedDoorCode = hashAccessCode(cleanCode);
    const khu = await KhuTroModel.findByMaMoCua(hashedDoorCode);
    if (!khu) {
      const err = new Error(
        "Thẻ NFC này chưa được đăng ký làm thẻ mở cổng trên hệ thống."
      );
      err.statusCode = 404;
      throw err;
    }

    const maND = getUserId(user);
    const maKhu = Number(khu.MaKhu);
    const ref = await loadReferenceData();
    const ctx = resolveUserContext(maND, ref);
    const hoTen = ctx.HoTen || user?.HoTen || "Cư dân";
    const rental = ref.activeRentalByMaND.get(maND);

    let tenPhong = "Ban quản lý";
    if (isChuTro(user)) {
      tenPhong = "Chủ trọ";
    } else if (isQuanLy(user)) {
      if (Number(khu.MaND) !== maND) {
        const err = new Error(
          "Bạn chỉ có quyền mở cổng tại cơ sở mình phụ trách."
        );
        err.statusCode = 403;
        throw err;
      }
      tenPhong = "Quản lý";
    } else {
      if (!rental) {
        const err = new Error(
          "Bạn không có hợp đồng thuê phòng còn hiệu lực để mở cổng."
        );
        err.statusCode = 403;
        throw err;
      }
      if (Number(rental.MaKhu) !== maKhu) {
        const err = new Error("Thẻ cổng này không thuộc cơ sở bạn đang thuê.");
        err.statusCode = 403;
        throw err;
      }
      tenPhong = rental.TenPhong;
    }

    pendingDoorOpenByKhu.set(maKhu, {
      hoTen,
      tenPhong,
      createdAt: Date.now(),
    });

    const userCards = await TheRaVaoModel.findByMaND(maND);
    const targetCard =
      userCards.find((c) => c.TrangThai === "HoatDong") || userCards[0];
    if (targetCard) {
      await LichSuTheModel.create(targetCard.MaThe);
    }

    return {
      maKhu,
      tenKhu: khu.TenKhu,
      tenPhong,
      message: `Xác thực thành công! Cổng ${khu.TenKhu} đang mở...`,
    };
  },

  async getThongTinTheCuaToi(user, { tuNgay, denNgay } = {}) {
    const maND = getUserId(user);
    const ref = await loadReferenceData();
    const dsTheRaw = await TheRaVaoModel.findByMaND(maND);

    // Không trả MaUID / GiaTri
    const dsThe = dsTheRaw.map((t) => ({
      MaThe: t.MaThe,
      MaND: t.MaND,
      NgayTao: t.NgayTao,
      TrangThai: t.TrangThai,
      GhiChu: t.GhiChu,
      DaMaHoa: Boolean(t.GiaTri),
    }));

    const maTheList = dsTheRaw.map((t) => t.MaThe);
    const lichSuRaw = await LichSuTheModel.findByMaTheList(maTheList, {
      tuNgay,
      denNgay,
      limit: 100,
    });

    const rental = ref.activeRentalByMaND.get(maND) || null;
    const khuInfo = rental ? ref.khuMap.get(Number(rental.MaKhu)) : null;
    const thongTinThue = rental
      ? {
          ...rental,
          DaCaiDatTheCuaNFC: Boolean(khuInfo?.MaMoCua),
        }
      : null;

    const lichSu = lichSuRaw.map((ls) => ({
      MaLS: ls.MaLS,
      MaThe: ls.MaThe,
      NgayQuetThe: ls.NgayQuetThe,
      GioQuetThe: ls.GioQuetThe,
      TenPhong: thongTinThue?.TenPhong || null,
      TenKhu: thongTinThue?.TenKhu || null,
    }));

    return { dsThe, lichSu, thongTinThue };
  },

  async yeuCauCapLaiThe(user, { lyDo }) {
    const maND = getUserId(user);
    const ref = await loadReferenceData();
    const thongTinThue = ref.activeRentalByMaND.get(maND);

    if (!thongTinThue) {
      const err = new Error("Bạn chưa có hợp đồng thuê phòng còn hiệu lực.");
      err.statusCode = 400;
      throw err;
    }

    const dsThe = await TheRaVaoModel.findByMaND(maND);
    if (dsThe.length === 0) {
      const err = new Error(
        "Bạn chưa được cấp thẻ lần đầu. Vui lòng liên hệ Quản lý cơ sở để cấp thẻ mới."
      );
      err.statusCode = 400;
      throw err;
    }

    const theHienTai = dsThe[0];
    if (theHienTai.TrangThai === "ChoCapLai") {
      const err = new Error("Yêu cầu cấp lại thẻ của bạn đang chờ Quản lý xử lý.");
      err.statusCode = 400;
      throw err;
    }

    const ghiChu = (lyDo || "Khách thuê yêu cầu cấp lại thẻ").trim();
    await TheRaVaoModel.updateStatus(theHienTai.MaThe, "ChoCapLai", ghiChu);

    return {
      maThe: theHienTai.MaThe,
      maKhu: thongTinThue.MaKhu,
      trangThai: "ChoCapLai",
      ghiChu,
    };
  },

  // =========================================================
  // C. CHỦ TRỌ & QUẢN LÝ
  // =========================================================
  async getDanhSachThe(user, { maKhu, trangThai, keyword } = {}) {
    const ref = await loadReferenceData();
    const khuTroList = isQuanLy(user)
      ? ref.khuTros.filter((k) => Number(k.MaND) === getUserId(user))
      : ref.khuTros;

    const allowedKhuIds = new Set(khuTroList.map((k) => Number(k.MaKhu)));
    const allCards = await TheRaVaoModel.findAll();

    const kw = (keyword || "").trim().toLowerCase();
    const data = allCards
      .map((t) => {
        const ctx = resolveUserContext(t.MaND, ref);
        return {
          MaThe: t.MaThe,
          MaND: ctx.MaND,
          NgayTao: t.NgayTao,
          TrangThai: t.TrangThai,
          GhiChu: t.GhiChu,
          DaMaHoa: Boolean(t.GiaTri),
          HoTen: ctx.HoTen,
          SDT: ctx.SDT,
          MaPhong: ctx.MaPhong,
          TenPhong: ctx.TenPhong,
          MaKhu: ctx.MaKhu,
          TenKhu: ctx.TenKhu,
          VaiTroHienThi: ctx.VaiTroHienThi,
        };
      })
      .filter((item) => {
        if (isQuanLy(user) && (!item.MaKhu || !allowedKhuIds.has(Number(item.MaKhu)))) {
          return false;
        }
        if (isChuTro(user) && maKhu && Number(item.MaKhu) !== Number(maKhu)) {
          return false;
        }
        if (trangThai && item.TrangThai !== trangThai) return false;
        if (kw) {
          const hay = `${item.HoTen} ${item.TenPhong || ""} ${item.TenKhu || ""} ${item.GhiChu || ""}`.toLowerCase();
          if (!hay.includes(kw)) return false;
        }
        return true;
      });

    return {
      data,
      khuTroList: khuTroList.map((k) => ({ MaKhu: k.MaKhu, TenKhu: k.TenKhu })),
    };
  },

  async getNguoiChuaCoThe(user, { maKhu } = {}) {
    const ref = await loadReferenceData();
    const khuTroList = isQuanLy(user)
      ? ref.khuTros.filter((k) => Number(k.MaND) === getUserId(user))
      : ref.khuTros;

    const allowedKhuIds = new Set(khuTroList.map((k) => Number(k.MaKhu)));
    const allCards = await TheRaVaoModel.findAll();
    const usersWithCard = new Set(allCards.map((c) => Number(c.MaND)));

    const candidateIds = new Set();
    for (const [maND, rental] of ref.activeRentalByMaND.entries()) {
      if (allowedKhuIds.has(Number(rental.MaKhu))) candidateIds.add(Number(maND));
    }
    for (const khu of khuTroList) {
      if (khu.MaND) candidateIds.add(Number(khu.MaND));
    }

    const data = [];
    for (const maND of candidateIds) {
      if (usersWithCard.has(maND)) continue;
      const ctx = resolveUserContext(maND, ref);
      if (!ctx.MaKhu || !allowedKhuIds.has(Number(ctx.MaKhu))) continue;
      if (isChuTro(user) && maKhu && Number(ctx.MaKhu) !== Number(maKhu)) continue;
      data.push(ctx);
    }

    data.sort((a, b) =>
      `${a.TenKhu || ""}_${a.TenPhong || ""}_${a.HoTen}`.localeCompare(
        `${b.TenKhu || ""}_${b.TenPhong || ""}_${b.HoTen}`,
        "vi"
      )
    );

    return {
      data,
      khuTroList: khuTroList.map((k) => ({ MaKhu: k.MaKhu, TenKhu: k.TenKhu })),
    };
  },

  async getChiTietThe(user, maThe) {
    const the = await TheRaVaoModel.findById(maThe);
    if (!the) {
      const err = new Error("Không tìm thấy thông tin thẻ.");
      err.statusCode = 404;
      throw err;
    }

    const ref = await loadReferenceData();
    const ctx = resolveUserContext(the.MaND, ref);

    if (isQuanLy(user)) {
      const allowed = ref.khuTros.some(
        (k) => Number(k.MaND) === getUserId(user) && Number(k.MaKhu) === Number(ctx.MaKhu)
      );
      if (!allowed) {
        const err = new Error("Bạn không có quyền truy cập thẻ thuộc cơ sở khác.");
        err.statusCode = 403;
        throw err;
      }
    }

    return {
      MaThe: the.MaThe,
      MaND: ctx.MaND,
      NgayTao: the.NgayTao,
      TrangThai: the.TrangThai,
      GhiChu: the.GhiChu,
      DaMaHoa: Boolean(the.GiaTri),
      HoTen: ctx.HoTen,
      SDT: ctx.SDT,
      MaPhong: ctx.MaPhong,
      TenPhong: ctx.TenPhong,
      MaKhu: ctx.MaKhu,
      TenKhu: ctx.TenKhu,
      VaiTroHienThi: ctx.VaiTroHienThi,
    };
  },

  async batDauPhienGhi(user, { mode, maND, maThe, ghiChu }) {
    cleanupExpiredSessions();

    if (!["NEW", "REISSUE"].includes(mode)) {
      const err = new Error("Chế độ cấp thẻ không hợp lệ.");
      err.statusCode = 400;
      throw err;
    }

    const ref = await loadReferenceData();
    let targetMaND = Number(maND);
    let targetMaThe = maThe ? Number(maThe) : null;

    if (mode === "REISSUE") {
      if (!targetMaThe) {
        const err = new Error("Thiếu thông tin thẻ cần cấp lại.");
        err.statusCode = 400;
        throw err;
      }
      const existingCard = await TheRaVaoModel.findById(targetMaThe);
      if (!existingCard) {
        const err = new Error("Thẻ cần cấp lại không tồn tại.");
        err.statusCode = 404;
        throw err;
      }
      targetMaND = Number(existingCard.MaND);
    } else {
      if (!targetMaND) {
        const err = new Error("Vui lòng chọn người dùng cần cấp thẻ mới.");
        err.statusCode = 400;
        throw err;
      }
      const existingCards = await TheRaVaoModel.findByMaND(targetMaND);
      if (existingCards.length > 0) {
        const err = new Error(
          "Người dùng này đã có thẻ ra vào. Mỗi người chỉ được sở hữu 1 thẻ duy nhất, vui lòng dùng chức năng Cấp lại thẻ."
        );
        err.statusCode = 400;
        throw err;
      }
    }

    const ctx = resolveUserContext(targetMaND, ref);
    if (!ctx.MaKhu) {
      const err = new Error("Người dùng này chưa thuộc cơ sở nào đang hoạt động.");
      err.statusCode = 400;
      throw err;
    }

    if (isQuanLy(user)) {
      const allowed = ref.khuTros.some(
        (k) => Number(k.MaND) === getUserId(user) && Number(k.MaKhu) === Number(ctx.MaKhu)
      );
      if (!allowed) {
        const err = new Error("Bạn không có quyền cấp thẻ cho người thuộc cơ sở khác.");
        err.statusCode = 403;
        throw err;
      }
    }

    const oldSid = activeSessionByKhu.get(ctx.MaKhu);
    if (oldSid && sessionById.has(oldSid)) {
      const oldSession = sessionById.get(oldSid);
      if (oldSession.status === "WAITING") {
        oldSession.status = "CANCELLED";
        oldSession.updatedAt = Date.now();
      }
    }

    const sessionId = `S${ctx.MaKhu}_${Date.now()}_${crypto.randomBytes(2).toString("hex")}`;
    const secret = taoMaBiMat(ctx.MaKhu);
    const now = Date.now();

    const session = {
      sessionId,
      mode,
      maThe: targetMaThe,
      maND: targetMaND,
      hoTen: ctx.HoTen,
      tenPhong: ctx.TenPhong,
      maKhu: ctx.MaKhu,
      tenKhu: ctx.TenKhu,
      secret,
      ghiChu: (ghiChu || (mode === "NEW" ? "Cấp thẻ mới" : "Cấp lại thẻ")).trim(),
      status: "WAITING",
      lastError: null,
      result: null,
      createdAt: now,
      updatedAt: now,
      expiresAt: now + WRITE_SESSION_TTL_MS,
    };

    sessionById.set(sessionId, session);
    activeSessionByKhu.set(ctx.MaKhu, sessionId);

    return {
      sessionId,
      mode,
      maThe: targetMaThe,
      maKhu: ctx.MaKhu,
      tenKhu: ctx.TenKhu,
      timeoutSec: WRITE_SESSION_TTL_MS / 1000,
      expiresAt: session.expiresAt,
      message: `Đã gửi lệnh xuống đầu đọc RC522 (${ctx.TenKhu}). Vui lòng đặt phôi thẻ lên thiết bị trong 60 giây!`,
    };
  },

  async getTrangThaiPhienGhi(sessionId) {
    cleanupExpiredSessions();
    const session = sessionById.get(String(sessionId || ""));
    if (!session) {
      return { status: "EXPIRED", remainingSec: 0, lastError: null, result: null };
    }

    return {
      sessionId: session.sessionId,
      mode: session.mode,
      status: session.status,
      remainingSec:
        session.status === "WAITING"
          ? Math.max(0, Math.ceil((session.expiresAt - Date.now()) / 1000))
          : 0,
      lastError: session.lastError,
      result: session.result,
    };
  },

  async huyPhienGhi(sessionId) {
    const session = sessionById.get(String(sessionId || ""));
    if (!session) return { cancelled: true };

    if (session.status === "WAITING") {
      session.status = "CANCELLED";
      session.updatedAt = Date.now();
    }
    if (activeSessionByKhu.get(session.maKhu) === session.sessionId) {
      activeSessionByKhu.delete(session.maKhu);
    }
    return { cancelled: true };
  },

  async khoaThe(user, maThe, lyDo) {
    const the = await TheRaVaoModel.findById(maThe);
    if (!the) {
      const err = new Error("Không tìm thấy thẻ.");
      err.statusCode = 404;
      throw err;
    }

    if (isQuanLy(user)) {
      const ref = await loadReferenceData();
      const ctx = resolveUserContext(the.MaND, ref);
      const allowed = ref.khuTros.some(
        (k) => Number(k.MaND) === getUserId(user) && Number(k.MaKhu) === Number(ctx.MaKhu)
      );
      if (!allowed) {
        const err = new Error("Bạn không có quyền khóa thẻ thuộc cơ sở khác.");
        err.statusCode = 403;
        throw err;
      }
    }

    await TheRaVaoModel.updateStatus(
      maThe,
      "BiKhoa",
      (lyDo || "Khóa thẻ bởi quản lý").trim()
    );
    return { maThe, trangThai: "BiKhoa" };
  },

  async xoaThe(user, maThe) {
    const the = await TheRaVaoModel.findById(maThe);
    if (!the) {
      const err = new Error("Không tìm thấy thẻ cần xóa.");
      err.statusCode = 404;
      throw err;
    }

    if (!["BiKhoa", "ThuHoi"].includes(the.TrangThai)) {
      const err = new Error("Chỉ được xóa thẻ khi thẻ đang ở trạng thái Bị khóa!");
      err.statusCode = 400;
      throw err;
    }

    if (isQuanLy(user)) {
      const ref = await loadReferenceData();
      const ctx = resolveUserContext(the.MaND, ref);
      const allowed = ref.khuTros.some(
        (k) => Number(k.MaND) === getUserId(user) && Number(k.MaKhu) === Number(ctx.MaKhu)
      );
      if (!allowed) {
        const err = new Error("Bạn không có quyền xóa thẻ thuộc cơ sở khác.");
        err.statusCode = 403;
        throw err;
      }
    }

    await LichSuTheModel.deleteByMaThe(maThe);
    await TheRaVaoModel.deleteById(maThe);

    return { maThe, deleted: true };
  },

  async getLichSuRaVao(user, { maKhu, tuNgay, denNgay, keyword } = {}) {
    const { data: cardsInScope, khuTroList } = await this.getDanhSachThe(user, { maKhu });
    if (cardsInScope.length === 0) return { data: [], khuTroList };

    const cardMap = new Map(cardsInScope.map((c) => [c.MaThe, c]));
    const maTheList = cardsInScope.map((c) => c.MaThe);
    const logs = await LichSuTheModel.findByMaTheList(maTheList, {
      tuNgay,
      denNgay,
      limit: 200,
    });

    const kw = (keyword || "").trim().toLowerCase();
    const data = logs
      .map((ls) => {
        const card = cardMap.get(ls.MaThe);
        return {
          MaLS: ls.MaLS,
          MaThe: ls.MaThe,
          NgayQuetThe: ls.NgayQuetThe,
          GioQuetThe: ls.GioQuetThe,
          MaND: card?.MaND,
          HoTen: card?.HoTen || "Chưa cập nhật",
          TenPhong: card?.TenPhong || null,
          MaKhu: card?.MaKhu || null,
          TenKhu: card?.TenKhu || null,
        };
      })
      .filter((item) => {
        if (!kw) return true;
        return `${item.HoTen} ${item.TenPhong || ""} ${item.TenKhu || ""}`
          .toLowerCase()
          .includes(kw);
      });

    return { data, khuTroList };
  },
};

module.exports = TheRaVaoService;