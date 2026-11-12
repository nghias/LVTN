// server/src/services/aiChat.service.js
const { GoogleGenAI, Type } = require('@google/genai');
const env = require('../app/config/env.config');
const AiChatModel = require('../app/models/aiChat.model');

const formatVND = (amount) => {
  const num = Math.round(Number(amount) || 0);
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' đ';
};

// Hàm sinh câu hỏi gợi ý động dựa trên dữ liệu thực tế của DB
const buildDynamicFollowUps = (
  userQuestion,
  phongTrongDaDangList,
  tienIchList,
  phiDichVuList
) => {
  const q = String(userQuestion || '').toLowerCase();
  const followUps = [];

  if (phongTrongDaDangList.length > 0) {
    const firstRoom = phongTrongDaDangList[0];
    const secondRoom = phongTrongDaDangList[1];

    if (q.includes('trống') || q.includes('phòng')) {
      followUps.push(`Phòng ${firstRoom.TenPhong} có những tiện ích gì?`);
      if (secondRoom) {
        followUps.push(
          `So sánh phòng ${firstRoom.TenPhong} và ${secondRoom.TenPhong}?`
        );
      }
      followUps.push('Phí dịch vụ hàng tháng ngoài tiền phòng gồm những gì?');
      followUps.push('Phòng nào hiện có Máy lạnh và Gác lửng?');
    } else if (q.includes('tiện ích') || q.includes('máy lạnh') || q.includes('gác')) {
      followUps.push('Tiện ích trong phòng có thu thêm phí hàng tháng không?');
      followUps.push(`Xem thông tin chi tiết phòng ${firstRoom.TenPhong}?`);
      followUps.push('Bảng giá phí dịch vụ Wifi, rác, giữ xe tính thế nào?');
      followUps.push('Hiện có những phòng nào đang trống?');
    } else if (
      q.includes('dịch vụ') ||
      q.includes('phí') ||
      q.includes('điện') ||
      q.includes('nước')
    ) {
      followUps.push('Các phòng trống hiện có những tiện ích gì đi kèm?');
      followUps.push('Chỉ số điện nước IoT được tính vào hóa đơn thế nào?');
      followUps.push(`Chi phí thuê trọn gói phòng ${firstRoom.TenPhong} khoảng bao nhiêu?`);
      followUps.push('Hiện có những phòng nào đang trống?');
    } else {
      followUps.push('Hiện có những phòng nào đang trống?');
      followUps.push('Các tiện ích có sẵn trong phòng gồm những gì?');
      followUps.push('Bảng giá phí dịch vụ (Wifi, rác, giữ xe) và điện nước?');
      followUps.push(`Phòng ${firstRoom.TenPhong} giá bao nhiêu và ở cơ sở nào?`);
    }
  } else {
    followUps.push('Bảng giá điện nước và phí dịch vụ tính như thế nào?');
    followUps.push('Các phòng trong hệ thống thường có tiện ích gì?');
    followUps.push('Cho mình xin thông tin liên hệ Chủ trọ và Quản lý cơ sở?');
  }

  return followUps.slice(0, 4);
};

const AiChatService = {
  consultWithRag: async (userQuestion, chatHistory = []) => {
    // 1. RETRIEVAL: Truy vấn dữ liệu thực tế từ TiDB Cloud
    const {
      phongTrongDaDangList,
      chuTroInfo,
      khuTroList,
      phiDichVuList,
      tienIchList,
      giaDienNuoc,
    } = await AiChatModel.getRagContextData();

    // 2. AUGMENTATION: Đóng gói dữ liệu nội bộ thành Context
    const chuTroContactText = `Chủ trọ chung toàn hệ thống: ${chuTroInfo.TenChuTro} - SĐT/Zalo: ${
      chuTroInfo.SDTChuTro || 'Đang cập nhật'
    }`;

    const khuTroContextText =
      khuTroList.length > 0
        ? khuTroList
            .map(
              (k) =>
                `- Cơ sở ${k.MaKhu} (${k.TenKhu}): Địa chỉ tại ${k.DiaChi}. ` +
                `Người quản lý phụ trách cơ sở: ${k.TenQuanLy} (SĐT/Zalo: ${
                  k.SDTQuanLy || 'Đang cập nhật'
                }). ${chuTroContactText}.`
            )
            .join('\n')
        : 'Chưa có thông tin cơ sở.';

    const phongContextText =
      phongTrongDaDangList.length > 0
        ? phongTrongDaDangList
            .map(
              (p, idx) =>
                `${idx + 1}. [MaPhong=${p.MaPhong} | MaTin=${p.MaTin}] Phòng ${p.TenPhong} thuộc "${p.TenKhu}" (Đ/c: ${p.DiaChiKhu}):\n` +
                `   + Giá thuê: ${formatVND(p.Gia)}/tháng | Diện tích: ${p.DienTich}m²\n` +
                `   + Tiện ích trang bị sẵn theo phòng: ${p.DanhSachTienIch}\n` +
                `   + Tiêu đề tin đăng: "${p.TieuDe}" ${p.MoTa ? `- Mô tả: ${p.MoTa}` : ''}\n` +
                `   + Quản lý cơ sở (${p.TenKhu}): ${p.TenQuanLy} (${
                  p.SDTQuanLy || 'Đang cập nhật'
                }) | Chủ trọ: ${p.TenChuTro} (${p.SDTChuTro || 'Đang cập nhật'})`
            )
            .join('\n\n')
        : 'Hiện tại không có phòng trống nào đang mở đăng tin cho thuê.';

    const tienIchContextText =
      tienIchList.length > 0
        ? tienIchList
            .map(
              (ti) =>
                `- Tiện ích "${ti.TenTI}"${ti.MoTa ? ` (${ti.MoTa})` : ''}: ` +
                `${
                  ti.DanhSachPhongTrongCoTienIch
                    ? `Hiện có tại các phòng trống: ${ti.DanhSachPhongTrongCoTienIch}`
                    : 'Hiện chưa có trong phòng trống đang đăng tin'
                }. (Lưu ý: Tiện ích phòng được trang bị sẵn theo phòng, đã bao gồm trong giá thuê phòng).`
            )
            .join('\n')
        : 'Chưa có danh mục tiện ích.';

    const dichVuContextText = [
      `- Tiền điện: ${formatVND(giaDienNuoc?.GiaDien || 3500)} / kWh (Đo tự động bằng đồng hồ điện tử IoT riêng từng phòng)`,
      `- Tiền nước: ${formatVND(giaDienNuoc?.GiaNuoc || 15000)} / m³ (Đo tự động bằng đồng hồ điện tử IoT riêng từng phòng)`,
      ...phiDichVuList.map(
        (dv) =>
          `- Phí dịch vụ "${dv.TenDV}": ${formatVND(dv.DonGia)} / ${dv.DonViTinh} (Áp dụng minh bạch theo hợp đồng thuê hàng tháng)`
      ),
    ].join('\n');

    const systemInstruction = `
Bạn là Trợ lý ảo AI tư vấn tìm phòng trọ của hệ thống "Xóm Trọ".
Nhiệm vụ của bạn là giải đáp chính xác về Phòng trống, Tiện ích phòng, Phí dịch vụ & Điện nước IoT, và Thông tin liên hệ dựa TUYỆT ĐỐI vào [DỮ LIỆU HỆ THỐNG THỜI GIAN THỰC] bên dưới (Kiến trúc RAG).

QUY TẮC BẮT BUỘC:
1. CHỈ tư vấn các phòng có trong mục "DANH SÁCH PHÒNG TRỐNG ĐÃ ĐĂNG TIN". Không tự bịa đặt tên phòng, mức giá, diện tích, tiện ích hay phí dịch vụ ngoài dữ liệu.
2. TƯ VẤN TIỆN ÍCH & PHÍ DỊCH VỤ:
   - Khi khách hỏi về Tiện ích (gác lửng, máy lạnh, quạt, máy giặt chung, wifi, chỗ để xe, giờ giấc...): Hãy giải thích rõ mô tả tiện ích đó, liệt kê chính xác phòng trống nào đang có tiện ích đó và nói rõ tiện ích phòng được trang bị sẵn theo phòng.
   - Khi khách hỏi về Phí dịch vụ hoặc Chi phí hàng tháng: Hãy liệt kê đầy đủ đơn giá Điện, Nước (ghi tự động qua đồng hồ IoT) và toàn bộ các khoản Phí dịch vụ trong mục 4 (kèm Đơn giá và Đơn vị tính).
3. QUY TẮC LIÊN HỆ:
   - Khi giới thiệu phòng, cung cấp tên & SĐT của Quản lý phụ trách trực tiếp cơ sở đó VÀ luôn kèm thông tin Chủ trọ (${chuTroInfo.TenChuTro} - SĐT: ${chuTroInfo.SDTChuTro || 'Đang cập nhật'}).
   - Hướng dẫn khách bấm vào nút "Xem chi tiết phòng P.xxx" ngay bên dưới tin nhắn để mở trang chi tiết tin đăng của phòng đó.
4. CÂU HỎI GỢI Ý ĐỘNG ("suggestedQuestions"):
   - Luôn tạo 3 đến 4 câu hỏi ngắn gọn (dưới 12 từ mỗi câu), tự nhiên, đóng vai người tìm phòng hỏi tiếp dựa trên câu trả lời vừa rồi (ví dụ: hỏi sâu hơn về tiện ích của phòng vừa gợi ý, hỏi phí dịch vụ hàng tháng, so sánh 2 phòng trống...).

[DỮ LIỆU HỆ THỐNG THỜI GIAN THỰC]
1. CÁC CƠ SỞ & NGƯỜI QUẢN LÝ / CHỦ TRỌ:
${khuTroContextText}

2. DANH SÁCH PHÒNG TRỐNG ĐÃ ĐĂNG TIN CÔNG KHAI (${phongTrongDaDangList.length} phòng):
${phongContextText}

3. DANH MỤC TIỆN ÍCH PHÒNG TRỌ (${tienIchList.length} tiện ích):
${tienIchContextText}

4. BẢNG GIÁ ĐIỆN NƯỚC IOT & PHÍ DỊCH VỤ HÀNG THÁNG:
${dichVuContextText}
`.trim();

    if (!env.gemini.apiKey) {
      return AiChatService.buildFallbackResponse(
        userQuestion,
        phongTrongDaDangList,
        chuTroInfo,
        khuTroList,
        phiDichVuList,
        tienIchList,
        giaDienNuoc
      );
    }

    try {
      const ai = new GoogleGenAI({ apiKey: env.gemini.apiKey });

      // Lọc lịch sử hội thoại và loại bỏ các tin nhắn 'model' ở đầu mảng (Gemini bắt buộc phần tử đầu là 'user')
      const validHistory = (Array.isArray(chatHistory) ? chatHistory.slice(-6) : [])
        .filter((m) => m && m.text && String(m.text).trim())
        .map((m) => ({
          role: m.sender === 'user' ? 'user' : 'model',
          parts: [{ text: String(m.text).trim() }],
        }));

      while (validHistory.length > 0 && validHistory[0].role !== 'user') {
        validHistory.shift();
      }

      const contents = [
        ...validHistory,
        {
          role: 'user',
          parts: [{ text: String(userQuestion).trim() }],
        },
      ];

      const response = await ai.models.generateContent({
        model: env.gemini.model || 'gemini-2.5-flash',
        contents,
        config: {
          systemInstruction,
          temperature: 0.25,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              reply: {
                type: Type.STRING,
                description:
                  'Câu trả lời tư vấn chi tiết cho khách tìm phòng dựa trên dữ liệu thực tế.',
              },
              suggestedMaPhongList: {
                type: Type.ARRAY,
                items: { type: Type.INTEGER },
                description:
                  'Danh sách MaPhong của các phòng trống liên quan trực tiếp đến câu trả lời.',
              },
              suggestedQuestions: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description:
                  'Danh sách 3-4 câu hỏi gợi ý tiếp theo liên quan đến phòng trống, tiện ích hoặc phí dịch vụ.',
              },
            },
            required: ['reply', 'suggestedMaPhongList', 'suggestedQuestions'],
          },
        },
      });

      const rawText = response.text || '{}';
      const parsed = JSON.parse(rawText);

      const aiReply =
        parsed.reply ||
        'Xin lỗi, hiện tại tôi chưa thể tổng hợp câu trả lời. Bạn vui lòng thử lại nhé!';

      const maPhongIds = Array.isArray(parsed.suggestedMaPhongList)
        ? parsed.suggestedMaPhongList.map((id) => Number(id))
        : [];

      let suggestedRooms = phongTrongDaDangList.filter((p) =>
        maPhongIds.includes(Number(p.MaPhong))
      );

      if (suggestedRooms.length === 0) {
        suggestedRooms = phongTrongDaDangList.filter((p) =>
          aiReply.toLowerCase().includes(String(p.TenPhong).toLowerCase())
        );
      }

      const suggestedQuestions =
        Array.isArray(parsed.suggestedQuestions) &&
        parsed.suggestedQuestions.length > 0
          ? parsed.suggestedQuestions.slice(0, 4)
          : buildDynamicFollowUps(
              userQuestion,
              phongTrongDaDangList,
              tienIchList,
              phiDichVuList
            );

      return {
        reply: aiReply,
        suggestedRooms: suggestedRooms.slice(0, 4),
        suggestedQuestions,
      };
    } catch (error) {
      console.error('Lỗi khi gọi Gemini 2.5 Flash API:', error);
      return AiChatService.buildFallbackResponse(
        userQuestion,
        phongTrongDaDangList,
        chuTroInfo,
        khuTroList,
        phiDichVuList,
        tienIchList,
        giaDienNuoc
      );
    }
  },

  /**
   * Chế độ dự phòng thông minh: Trả lời đầy đủ Tiện ích, Phí dịch vụ, Phòng trống và Câu hỏi động
   */
  buildFallbackResponse: (
    userQuestion,
    phongTrongDaDangList,
    chuTroInfo,
    khuTroList,
    phiDichVuList,
    tienIchList,
    giaDienNuoc
  ) => {
    const q = String(userQuestion || '').toLowerCase();
    const suggestedQuestions = buildDynamicFollowUps(
      userQuestion,
      phongTrongDaDangList,
      tienIchList,
      phiDichVuList
    );

    // 1. Khi khách hỏi về Tiện ích (máy lạnh, gác lửng, quạt, máy giặt, tiện ích...)
    if (
      q.includes('tiện ích') ||
      q.includes('máy lạnh') ||
      q.includes('gác') ||
      q.includes('máy giặt') ||
      q.includes('quạt') ||
      q.includes('nội thất') ||
      q.includes('giờ giấc')
    ) {
      const matchedRooms = phongTrongDaDangList.filter((p) => {
        const tiLower = String(p.DanhSachTienIch || '').toLowerCase();
        if (q.includes('máy lạnh')) return tiLower.includes('máy lạnh');
        if (q.includes('gác')) return tiLower.includes('gác');
        if (q.includes('máy giặt')) return tiLower.includes('máy giặt');
        if (q.includes('quạt')) return tiLower.includes('quạt');
        return true;
      });

      const tiLines =
        tienIchList.length > 0
          ? tienIchList
              .map(
                (ti) =>
                  `• ${ti.TenTI}${ti.MoTa ? ` (${ti.MoTa})` : ''}${
                    ti.DanhSachPhongTrongCoTienIch
                      ? ` — Có tại phòng: ${ti.DanhSachPhongTrongCoTienIch}`
                      : ''
                  }`
              )
              .join('\n')
          : phongTrongDaDangList
              .map((p) => `• Phòng ${p.TenPhong}: ${p.DanhSachTienIch}`)
              .join('\n');

      return {
        reply:
          `Các tiện ích được trang bị tại hệ thống Xóm Trọ (đã bao gồm trong giá thuê phòng):\n` +
          `${tiLines}\n\n` +
          `Bạn có thể bấm vào nút "Xem chi tiết phòng" bên dưới để xem chi tiết từng phòng trống nhé!`,
        suggestedRooms: (matchedRooms.length > 0
          ? matchedRooms
          : phongTrongDaDangList
        ).slice(0, 4),
        suggestedQuestions,
      };
    }

    // 2. Khi khách hỏi về Phí dịch vụ, Điện, Nước, Wifi, Rác, Giữ xe
    if (
      q.includes('điện') ||
      q.includes('nước') ||
      q.includes('dịch vụ') ||
      q.includes('phí') ||
      q.includes('rác') ||
      q.includes('vệ sinh') ||
      q.includes('wifi') ||
      q.includes('xe')
    ) {
      const dvLines =
        phiDichVuList.length > 0
          ? phiDichVuList
              .map(
                (d) => `• ${d.TenDV}: ${formatVND(d.DonGia)} / ${d.DonViTinh}`
              )
              .join('\n')
          : '• Đang cập nhật danh mục phí dịch vụ.';

      return {
        reply:
          `Bảng giá điện, nước IoT và các khoản phí dịch vụ hàng tháng tại hệ thống:\n` +
          `• Giá điện: ${formatVND(giaDienNuoc?.GiaDien || 3500)} / kWh (Đo tự động qua đồng hồ IoT)\n` +
          `• Giá nước: ${formatVND(giaDienNuoc?.GiaNuoc || 15000)} / m³ (Đo tự động qua đồng hồ IoT)\n` +
          `${dvLines}\n\n` +
          `• Liên hệ Chủ trọ (hỗ trợ mọi cơ sở): ${chuTroInfo.TenChuTro} (${
            chuTroInfo.SDTChuTro || 'Đang cập nhật'
          })`,
        suggestedRooms: phongTrongDaDangList.slice(0, 2),
        suggestedQuestions,
      };
    }

    // 3. Khi khách hỏi về Phòng trống / Tư vấn phòng
    if (phongTrongDaDangList.length === 0) {
      return {
        reply:
          `Hiện tại hệ thống chưa có phòng trống nào đang mở đăng tin cho thuê. ` +
          `Bạn có thể liên hệ trực tiếp Chủ trọ ${chuTroInfo.TenChuTro} qua SĐT/Zalo: ${
            chuTroInfo.SDTChuTro || 'Đang cập nhật'
          } để được hỗ trợ báo phòng sớm nhất nhé!`,
        suggestedRooms: [],
        suggestedQuestions,
      };
    }

    const topRooms = phongTrongDaDangList.slice(0, 4);
    const roomLines = topRooms
      .map(
        (p) =>
          `• Phòng ${p.TenPhong} (${p.TenKhu}): ${formatVND(p.Gia)}/tháng - ${p.DienTich}m²\n` +
          `  Tiện ích: ${p.DanhSachTienIch}\n` +
          `  Quản lý cơ sở: ${p.TenQuanLy} (${p.SDTQuanLy || 'Đang cập nhật'}) | Chủ trọ: ${p.TenChuTro} (${
            p.SDTChuTro || 'Đang cập nhật'
          })`
      )
      .join('\n\n');

    return {
      reply:
        `Hiện hệ thống đang có ${phongTrongDaDangList.length} phòng trống đã kiểm tra hoàn tất và mở đăng tin:\n\n` +
        `${roomLines}\n\n` +
        `Bạn hãy bấm trực tiếp vào nút "Xem chi tiết phòng" bên dưới để mở trang chi tiết tin đăng của phòng đó nhé!`,
      suggestedRooms: topRooms,
      suggestedQuestions,
    };
  },
};

module.exports = AiChatService;