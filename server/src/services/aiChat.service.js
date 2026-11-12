// server/src/services/aiChat.service.js
const { GoogleGenAI, Type } = require('@google/genai');
const env = require('../app/config/env.config');
const AiChatModel = require('../app/models/aiChat.model');

const formatVND = (amount) =>
  new Intl.NumberFormat('vi-VN').format(Number(amount) || 0) + ' đ';

const AiChatService = {
  /**
   * Xử lý câu hỏi của khách bằng kiến trúc RAG + Gemini 2.5 Flash
   */
  consultWithRag: async (userQuestion, chatHistory = []) => {
    // 1. RETRIEVAL: Truy vấn dữ liệu thực tế từ Database TiDB Cloud
    const {
      phongTrongDaDangList,
      chuTroInfo,
      khuTroList,
      phiDichVuList,
      giaDienNuoc,
    } = await AiChatModel.getRagContextData();

    // 2. AUGMENTATION: Đóng gói dữ liệu nội bộ thành Context văn bản
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
                `${idx + 1}. [MaPhong=${p.MaPhong}] Phòng ${p.TenPhong} thuộc "${p.TenKhu}" (Đ/c: ${p.DiaChiKhu}):\n` +
                `   + Giá thuê: ${formatVND(p.Gia)}/tháng | Diện tích: ${p.DienTich}m²\n` +
                `   + Tiện ích có sẵn: ${p.DanhSachTienIch}\n` +
                `   + Tiêu đề tin đăng: "${p.TieuDe}" ${p.MoTa ? `- Mô tả: ${p.MoTa}` : ''}\n` +
                `   + Liên hệ Quản lý cơ sở (${p.TenKhu}): ${p.TenQuanLy} - SĐT/Zalo: ${
                  p.SDTQuanLy || 'Đang cập nhật'
                }\n` +
                `   + Liên hệ Chủ trọ (hỗ trợ mọi cơ sở): ${p.TenChuTro} - SĐT/Zalo: ${
                  p.SDTChuTro || 'Đang cập nhật'
                }`
            )
            .join('\n\n')
        : 'Hiện tại không có phòng trống nào đang mở đăng tin cho thuê.';

    const dichVuContextText = [
      `- Giá điện: ${formatVND(giaDienNuoc?.GiaDien || 3500)} / kWh (Ghi chỉ số tự động qua đồng hồ IoT)`,
      `- Giá nước: ${formatVND(giaDienNuoc?.GiaNuoc || 15000)} / m³ (Ghi chỉ số tự động qua đồng hồ IoT)`,
      ...phiDichVuList.map(
        (dv) => `- ${dv.TenDV}: ${formatVND(dv.DonGia)} / ${dv.DonViTinh}`
      ),
    ].join('\n');

    const systemInstruction = `
Bạn là Trợ lý ảo AI tư vấn tìm phòng trọ của hệ thống "Xóm Trọ".
Nhiệm vụ của bạn là trả lời câu hỏi của khách tìm phòng dựa TUYỆT ĐỐI vào dữ liệu thực tế trong phần [DỮ LIỆU HỆ THỐNG THỜI GIAN THỰC] bên dưới (Kiến trúc RAG).

QUY TẮC BẮT BUỘC:
1. CHỈ tư vấn các phòng có trong mục "DANH SÁCH PHÒNG TRỐNG ĐÃ ĐĂNG TIN". Tuyệt đối KHÔNG tự bịa ra tên phòng, mức giá, diện tích, tiện ích hay địa chỉ ngoài danh sách.
2. QUY TẮC LIÊN HỆ BẮT BUỘC:
   - Khi giới thiệu bất kỳ phòng nào hoặc khi khách hỏi thông tin liên hệ, bạn PHẢI cung cấp thông tin liên hệ của Người quản lý phụ trách trực tiếp cơ sở của phòng đó (Họ tên + SĐT/Zalo).
   - ĐỒNG THỜI, LUÔN LUÔN cung cấp kèm thông tin liên hệ của Chủ trọ (${chuTroInfo.TenChuTro} - SĐT/Zalo: ${chuTroInfo.SDTChuTro || 'Đang cập nhật'}) vì Chủ trọ hỗ trợ chung cho bất kỳ cơ sở nào.
3. Nếu khách tìm phòng theo tiêu chí (giá, diện tích, tiện ích, khu vực) mà không có phòng nào khớp 100%, hãy thông báo lịch sự và gợi ý các phòng đang trống có tiêu chí gần nhất trong danh sách.
4. Trình bày câu trả lời (trường "reply") bằng tiếng Việt thân thiện, rõ ràng, dễ đọc, xuống dòng hợp lý và hướng dẫn khách có thể bấm trực tiếp vào nút "Liên hệ / Xem phòng P.xxx" ngay bên dưới tin nhắn để mở cửa sổ nhắn Zalo hoặc gọi điện ngay.
5. Trong trường "suggestedMaPhongList", hãy trả về mảng các số nguyên MaPhong của những phòng bạn vừa giới thiệu hoặc phù hợp với câu hỏi của khách (tối đa 4 phòng tiêu biểu nhất). Nếu câu hỏi chỉ hỏi về giá điện nước hoặc quy định chung không liên quan đến phòng, trả về mảng rỗng [].

[DỮ LIỆU HỆ THỐNG THỜI GIAN THỰC]
1. THÔNG TIN CÁC CƠ SỞ & QUẢN LÝ / CHỦ TRỌ:
${khuTroContextText}

2. DANH SÁCH PHÒNG TRỐNG ĐÃ ĐĂNG TIN CÔNG KHAI (${phongTrongDaDangList.length} phòng):
${phongContextText}

3. BẢNG GIÁ ĐIỆN NƯỚC IOT & PHÍ DỊCH VỤ NIÊM YẾT:
${dichVuContextText}
`.trim();

    // Nếu chưa cấu hình GEMINI_API_KEY, sử dụng chế độ trả lời dự phòng từ dữ liệu DB
    if (!env.gemini.apiKey) {
      return AiChatService.buildFallbackResponse(
        userQuestion,
        phongTrongDaDangList,
        chuTroInfo,
        khuTroList,
        phiDichVuList,
        giaDienNuoc
      );
    }

    try {
      const ai = new GoogleGenAI({ apiKey: env.gemini.apiKey });

      // Chuẩn bị lịch sử hội thoại ngắn (tối đa 6 lượt gần nhất)
      const contents = [
        ...(Array.isArray(chatHistory) ? chatHistory.slice(-6) : [])
          .filter((m) => m && m.text)
          .map((m) => ({
            role: m.sender === 'user' ? 'user' : 'model',
            parts: [{ text: String(m.text) }],
          })),
        {
          role: 'user',
          parts: [{ text: String(userQuestion) }],
        },
      ];

      // 3. GENERATION: Gọi mô hình gemini-2.5-flash với JSON Schema chuẩn
      const response = await ai.models.generateContent({
        model: env.gemini.model || 'gemini-2.5-flash',
        contents,
        config: {
          systemInstruction,
          temperature: 0.2,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              reply: {
                type: Type.STRING,
                description:
                  'Nội dung câu trả lời tư vấn chi tiết cho khách hàng, kèm SĐT Quản lý cơ sở và SĐT Chủ trọ.',
              },
              suggestedMaPhongList: {
                type: Type.ARRAY,
                items: { type: Type.INTEGER },
                description:
                  'Danh sách MaPhong của các phòng trống đã đăng tin liên quan đến câu trả lời.',
              },
            },
            required: ['reply', 'suggestedMaPhongList'],
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

      // Đối chiếu MaPhong từ AI với danh sách phòng thực tế trong DB (chống AI trả về mã phòng ảo)
      let suggestedRooms = phongTrongDaDangList.filter((p) =>
        maPhongIds.includes(Number(p.MaPhong))
      );

      // Nếu câu trả lời có nhắc tên phòng (VD: P.109) nhưng mảng suggestedMaPhongList thiếu, tự động bắt thêm
      if (suggestedRooms.length === 0) {
        suggestedRooms = phongTrongDaDangList.filter((p) =>
          aiReply.toLowerCase().includes(String(p.TenPhong).toLowerCase())
        );
      }

      return {
        reply: aiReply,
        suggestedRooms: suggestedRooms.slice(0, 4),
      };
    } catch (error) {
      console.error('Lỗi khi gọi Gemini 2.5 Flash API:', error);
      // Nếu API Gemini quá tải hoặc lỗi mạng, tự động chuyển sang trả lời dựa trên DB thực tế
      return AiChatService.buildFallbackResponse(
        userQuestion,
        phongTrongDaDangList,
        chuTroInfo,
        khuTroList,
        phiDichVuList,
        giaDienNuoc
      );
    }
  },

  /**
   * Hàm dự phòng thông minh: Vẫn trả lời đúng số liệu DB + kèm nút phòng nếu chưa điền API Key hoặc đứt cáp
   */
  buildFallbackResponse: (
    userQuestion,
    phongTrongDaDangList,
    chuTroInfo,
    khuTroList,
    phiDichVuList,
    giaDienNuoc
  ) => {
    const q = String(userQuestion || '').toLowerCase();

    if (q.includes('điện') || q.includes('nước') || q.includes('dịch vụ') || q.includes('phí')) {
      const dvText = phiDichVuList
        .map((d) => `• ${d.TenDV}: ${formatVND(d.DonGia)}/${d.DonViTinh}`)
        .join('\n');
      return {
        reply:
          `Bảng giá điện, nước IoT và phí dịch vụ niêm yết tại hệ thống:\n` +
          `• Giá điện: ${formatVND(giaDienNuoc?.GiaDien || 3500)}/kWh\n` +
          `• Giá nước: ${formatVND(giaDienNuoc?.GiaNuoc || 15000)}/m³\n` +
          `${dvText ? dvText + '\n' : ''}` +
          `• Liên hệ Chủ trọ (hỗ trợ mọi cơ sở): ${chuTroInfo.TenChuTro} (${
            chuTroInfo.SDTChuTro || 'Đang cập nhật'
          })`,
        suggestedRooms: [],
      };
    }

    if (phongTrongDaDangList.length === 0) {
      return {
        reply:
          `Hiện tại hệ thống chưa có phòng trống nào đang mở đăng tin cho thuê. ` +
          `Bạn có thể liên hệ trực tiếp Chủ trọ ${chuTroInfo.TenChuTro} qua SĐT/Zalo: ${
            chuTroInfo.SDTChuTro || 'Đang cập nhật'
          } để được hỗ trợ giữ chỗ sớm nhất nhé!`,
        suggestedRooms: [],
      };
    }

    const topRooms = phongTrongDaDangList.slice(0, 4);
    const roomLines = topRooms
      .map(
        (p) =>
          `• Phòng ${p.TenPhong} (${p.TenKhu}): ${formatVND(p.Gia)}/tháng - ${p.DienTich}m² (${p.DanhSachTienIch}).\n` +
          `  Quản lý cơ sở: ${p.TenQuanLy} (${p.SDTQuanLy || 'Đang cập nhật'}) | Chủ trọ: ${p.TenChuTro} (${
            p.SDTChuTro || 'Đang cập nhật'
          })`
      )
      .join('\n');

    return {
      reply:
        `Hiện hệ thống đang có ${phongTrongDaDangList.length} phòng trống đã kiểm tra hoàn tất và mở đăng tin:\n` +
        `${roomLines}\n\n` +
        `Bạn hãy bấm trực tiếp vào nút "Liên hệ / Xem phòng" bên dưới để kết nối Zalo hoặc gọi điện ngay nhé!`,
      suggestedRooms: topRooms,
    };
  },
};

module.exports = AiChatService;