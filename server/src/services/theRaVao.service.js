// server/src/services/theRaVao.service.js
const crypto = require("crypto");
const db = require("../database/db");
const TheRaVaoModel = require("../app/models/theRaVao.model");
const LichSuTheModel = require("../app/models/lichSuThe.model");

function taoMaBiMat(maKhu) {
  const rand = crypto.randomBytes(5).toString("hex").toUpperCase();
  return `K${maKhu}_${rand}`.slice(0, 16);
}

function tachMaUID(giaTri) {
  if (!giaTri) return null;
  if (giaTri.startsWith("WAIT|") || giaTri.startsWith("PENDING_")) return null;
  return giaTri.includes("|") ? giaTri.split("|")[0] : giaTri;
}

const getUserId = (user) => Number(user?.MaND ?? user?.maND);
const getUserRole = (user) => user?.Quyen ?? user?.quyen ?? user?.vaiTro;
const isChuTro = (user) => getUserRole(user) === "ChuTro";
const isQuanLy = (user) => getUserRole(user) === "QuanLy";

// Đọc danh sách đơn bảng để ghép dữ liệu tại tầng Service (không JOIN trong Model)
async function loadReferenceData() {
  const [[khuTros], [phongs], [hopDongs], [cthdts], [thongTinCaNhans]] =
    await Promise.all([
      db.query(`SELECT MaKhu, TenKhu, MaND FROM KhuTro ORDER BY MaKhu ASC`),
      db.query(`SELECT MaPhong, TenPhong, MaKhu FROM Phong`),
      db.query(`SELECT MaHDT, MaPhong, TrangThai FROM HopDongThue`),
      db.query(`SELECT MaHDT, MaND, NgayDi FROM CTHDT`),
      db.query(`SELECT MaND, HoTen FROM ThongTinCaNhan`),
    ]);

  const khuMap = new Map(khuTros.map((k) => [Number(k.MaKhu), k]));
  const phongMap = new Map(phongs.map((p) => [Number(p.MaPhong), p]));
  const hoTenMap = new Map(thongTinCaNhans.map((t) => [Number(t.MaND), t.HoTen]));

  // Map hợp đồng đang hiệu lực: MaND -> { MaHDT, MaPhong, TenPhong, MaKhu, TenKhu }
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

  return { khuTros, khuMap, hoTenMap, activeRentalByMaND };
}

const TheRaVaoService = {
  // =========================================================
  // A. THIẾT BỊ IOT (ESP32 + RC522)
  // =========================================================
  async xacThucQuetThe({ maKhu, uid, secret }) {
    if (!maKhu || !uid || !secret) {
      return { allow: false, message: "Thiếu thông tin thẻ hoặc mã khu trọ." };
    }

    const giaTri = `${String(uid).trim().toUpperCase()}|${String(secret).trim()}`;
    const the = await TheRaVaoModel.findByGiaTri(giaTri);

    if (!the) {
      return { allow: false, message: "Thẻ không tồn tại hoặc sai mã bảo mật." };
    }
    if (the.TrangThai !== "HoatDong") {
      return { allow: false, message: `Thẻ đang ở trạng thái ${the.TrangThai}.` };
    }

    const { khuTros, hoTenMap, activeRentalByMaND } = await loadReferenceData();
    const maND = Number(the.MaND);
    const hoTen = hoTenMap.get(maND) || "Người dùng";

    // Cho phép thẻ Quản lý khu trọ mở đúng khu mình phụ trách
    const quanLyKhu = khuTros.find(
      (k) => Number(k.MaND) === maND && Number(k.MaKhu) === Number(maKhu)
    );
    const rental = activeRentalByMaND.get(maND);

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
        hoTen,
        tenPhong: rental ? rental.TenPhong : "Ban quản lý",
        tenKhu: quanLyKhu ? quanLyKhu.TenKhu : rental.TenKhu,
      },
    };
  },

  async layLenhGhiThe(maKhu) {
    const { hoTenMap, activeRentalByMaND } = await loadReferenceData();
    const maNDThuocKhu = [];
    for (const [maND, info] of activeRentalByMaND.entries()) {
      if (Number(info.MaKhu) === Number(maKhu)) maNDThuocKhu.push(maND);
    }

    const jobs = await TheRaVaoModel.findPendingWriteJobsByMaNDList(maNDThuocKhu);
    if (jobs.length === 0) return { hasJob: false };

    const job = jobs[0];
    return {
      hasJob: true,
      maThe: job.MaThe,
      secret: job.GiaTri.replace("WAIT|", ""),
      hoTen: hoTenMap.get(Number(job.MaND)) || "",
    };
  },

  async xacNhanGhiThe({ maKhu, maThe, uid, secret }) {
    const the = await TheRaVaoModel.findById(maThe);
    if (!the || the.TrangThai !== "DangGhiThe") {
      const err = new Error("Không tìm thấy lệnh ghi thẻ hợp lệ.");
      err.statusCode = 400;
      throw err;
    }

    const expectedSecret = the.GiaTri.replace("WAIT|", "");
    if (expectedSecret !== String(secret).trim()) {
      const err = new Error("Mã bí mật xác nhận không khớp.");
      err.statusCode = 400;
      throw err;
    }

    const cleanUid = String(uid).trim().toUpperCase();
    const dup = await TheRaVaoModel.findActiveByUidPrefix(cleanUid, maThe);
    if (dup) {
      const err = new Error("Phôi thẻ này đang được kích hoạt cho một tài khoản khác.");
      err.statusCode = 409;
      throw err;
    }

    await TheRaVaoModel.activateCard(maThe, `${cleanUid}|${expectedSecret}`);
    return { maThe, maND: the.MaND, maKhu, uid: cleanUid };
  },

  // =========================================================
  // B. NGƯỜI THUÊ (KhachThue)
  // =========================================================
  async getThongTinTheCuaToi(user, { tuNgay, denNgay } = {}) {
    const maND = getUserId(user);
    const { activeRentalByMaND } = await loadReferenceData();
    const dsTheRaw = await TheRaVaoModel.findByMaND(maND);

    const dsThe = dsTheRaw.map((t) => ({
      MaThe: t.MaThe,
      MaND: t.MaND,
      MaUID: tachMaUID(t.GiaTri),
      NgayTao: t.NgayTao,
      TrangThai: t.TrangThai,
      GhiChu: t.GhiChu,
    }));

    const maTheList = dsTheRaw.map((t) => t.MaThe);
    const lichSuRaw = await LichSuTheModel.findByMaTheList(maTheList, {
      tuNgay,
      denNgay,
      limit: 100,
    });

    const theMap = new Map(dsThe.map((t) => [t.MaThe, t]));
    const thongTinThue = activeRentalByMaND.get(maND) || null;

    const lichSu = lichSuRaw.map((ls) => ({
      MaLS: ls.MaLS,
      MaThe: ls.MaThe,
      MaUID: theMap.get(ls.MaThe)?.MaUID || null,
      NgayQuetThe: ls.NgayQuetThe,
      GioQuetThe: ls.GioQuetThe,
      TenPhong: thongTinThue?.TenPhong || null,
      TenKhu: thongTinThue?.TenKhu || null,
    }));

    return { dsThe, lichSu, thongTinThue };
  },

  async yeuCauCapLaiThe(user, { lyDo, khoaTheCu = true }) {
    const maND = getUserId(user);
    const { activeRentalByMaND } = await loadReferenceData();
    const thongTinThue = activeRentalByMaND.get(maND);

    if (!thongTinThue) {
      const err = new Error("Bạn chưa có hợp đồng thuê phòng còn hiệu lực.");
      err.statusCode = 400;
      throw err;
    }

    const dangCho = await TheRaVaoModel.findPendingByMaND(maND);
    if (dangCho) {
      const err = new Error("Bạn đã có một yêu cầu cấp lại thẻ đang được xử lý.");
      err.statusCode = 400;
      throw err;
    }

    if (khoaTheCu) {
      await TheRaVaoModel.lockActiveByMaND(maND, "Khóa do khách yêu cầu cấp lại");
    }

    const ghiChu = (lyDo || "Khách thuê yêu cầu cấp lại thẻ").trim();
    const maThe = await TheRaVaoModel.create({
      maND,
      giaTri: `PENDING_${Date.now()}_${maND}`,
      trangThai: "ChoCapLai",
      ghiChu,
    });

    return { maThe, maKhu: thongTinThue.MaKhu, trangThai: "ChoCapLai", ghiChu };
  },

  // =========================================================
  // C. CHỦ TRỌ & QUẢN LÝ
  // =========================================================
  async getDanhSachThe(user, { maKhu, trangThai, keyword } = {}) {
    const { khuTros, hoTenMap, activeRentalByMaND } = await loadReferenceData();

    const khuTroList = isQuanLy(user)
      ? khuTros.filter((k) => Number(k.MaND) === getUserId(user))
      : khuTros;

    const allowedKhuIds = new Set(khuTroList.map((k) => Number(k.MaKhu)));
    const allCards = await TheRaVaoModel.findAll();

    const kw = (keyword || "").trim().toLowerCase();
    const data = allCards
      .map((t) => {
        const maND = Number(t.MaND);
        const rental = activeRentalByMaND.get(maND);
        const qlKhu = khuTros.find((k) => Number(k.MaND) === maND);
        const cardMaKhu = rental?.MaKhu ?? (qlKhu ? Number(qlKhu.MaKhu) : null);
        const cardTenKhu = rental?.TenKhu ?? qlKhu?.TenKhu ?? null;

        return {
          MaThe: t.MaThe,
          MaND: maND,
          MaUID: tachMaUID(t.GiaTri),
          NgayTao: t.NgayTao,
          TrangThai: t.TrangThai,
          GhiChu: t.GhiChu,
          HoTen: hoTenMap.get(maND) || "Chưa cập nhật",
          MaPhong: rental?.MaPhong || null,
          TenPhong: rental?.TenPhong || (qlKhu ? "Quản lý cơ sở" : null),
          MaKhu: cardMaKhu,
          TenKhu: cardTenKhu,
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

  async batDauCapLaiThe(user, { maND, maTheYeuCau, ghiChu }) {
    const { khuTros, activeRentalByMaND } = await loadReferenceData();
    const rental = activeRentalByMaND.get(Number(maND));
    if (!rental) {
      const err = new Error("Khách thuê không có hợp đồng đang hiệu lực.");
      err.statusCode = 400;
      throw err;
    }

    if (isQuanLy(user)) {
      const allowed = khuTros.some(
        (k) => Number(k.MaND) === getUserId(user) && Number(k.MaKhu) === Number(rental.MaKhu)
      );
      if (!allowed) {
        const err = new Error("Bạn không có quyền cấp thẻ cho khách thuộc cơ sở khác.");
        err.statusCode = 403;
        throw err;
      }
    }

    // Hủy các lệnh DangGhiThe đang treo tại cùng cơ sở
    const maNDThuocKhu = [];
    for (const [id, info] of activeRentalByMaND.entries()) {
      if (Number(info.MaKhu) === Number(rental.MaKhu)) maNDThuocKhu.push(id);
    }
    const hangingJobs = await TheRaVaoModel.findPendingWriteJobsByMaNDList(maNDThuocKhu);
    for (const job of hangingJobs) {
      await TheRaVaoModel.lockById(job.MaThe, "Hủy do tạo phiên ghi mới");
    }

    await TheRaVaoModel.lockActiveByMaND(maND, "Đã cấp thẻ mới");

    const secret = taoMaBiMat(rental.MaKhu);
    const giaTriCho = `WAIT|${secret}`;
    const noteText = (ghiChu || "Quản lý cấp lại thẻ do quên/mất thẻ").trim();

    let maTheMoi;
    if (maTheYeuCau) {
      await TheRaVaoModel.updateForWrite(maTheYeuCau, maND, {
        giaTri: giaTriCho,
        ghiChu: noteText,
      });
      maTheMoi = maTheYeuCau;
    } else {
      maTheMoi = await TheRaVaoModel.create({
        maND,
        giaTri: giaTriCho,
        trangThai: "DangGhiThe",
        ghiChu: noteText,
      });
    }

    return {
      maThe: maTheMoi,
      maKhu: rental.MaKhu,
      tenKhu: rental.TenKhu,
      message: `Đã gửi lệnh xuống đầu đọc RC522 (${rental.TenKhu}). Hãy đặt phôi thẻ trắng lên thiết bị trong 60 giây!`,
    };
  },

  async khoaThe(user, maThe, lyDo) {
    const the = await TheRaVaoModel.findById(maThe);
    if (!the) {
      const err = new Error("Không tìm thấy thẻ.");
      err.statusCode = 404;
      throw err;
    }

    if (isQuanLy(user)) {
      const { khuTros, activeRentalByMaND } = await loadReferenceData();
      const rental = activeRentalByMaND.get(Number(the.MaND));
      const allowed =
        rental &&
        khuTros.some(
          (k) => Number(k.MaND) === getUserId(user) && Number(k.MaKhu) === Number(rental.MaKhu)
        );
      if (!allowed) {
        const err = new Error("Bạn không có quyền khóa thẻ thuộc cơ sở khác.");
        err.statusCode = 403;
        throw err;
      }
    }

    await TheRaVaoModel.lockById(maThe, lyDo || "Khóa thủ công bởi quản lý");
    return { maThe, trangThai: "BiKhoa" };
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
          MaUID: card?.MaUID || null,
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