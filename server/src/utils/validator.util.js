// 1. Làm sạch chuỗi đầu vào: Chống XSS, Script Injection và ký tự điều khiển
const sanitizeText = (input) => {
  if (typeof input !== 'string') return '';
  return input
    .replace(/<[^>]*>?/gm, '') // Loại bỏ toàn bộ thẻ HTML (<script>, <img>, <iframe>...)
    .replace(/javascript:|data:|vbscript:/gi, '') // Loại bỏ giao thức thực thi mã độc
    .replace(/on\w+\s*=/gi, '') // Loại bỏ các sự kiện inline (onload=, onerror=, onclick=...)
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Loại bỏ ký tự điều khiển ẩn
    .replace(/\s+/g, ' ') // Chuẩn hóa khoảng trắng thừa
    .trim();
};

// 2. Phát hiện các mẫu tấn công SQL Injection / XSS phổ biến
const containsMaliciousPattern = (input) => {
  if (typeof input !== 'string') return false;
  const dangerousPattern =
    /(<script|javascript:|onerror=|onload=|union\s+select|drop\s+table|insert\s+into|delete\s+from|update\s+.*set|--\s|\/\*|\*\/|;\s*(drop|delete|update|insert))/i;
  return dangerousPattern.test(input);
};

// 3. Kiểm tra và chuẩn hóa dữ liệu cập nhật Thông tin cá nhân
const validateAndSanitizeProfile = (body = {}) => {
  const rawFields = [body.HoTen, body.CCCD, body.SDT, body.Email, body.DiaChi];
  if (rawFields.some((val) => typeof val === 'string' && containsMaliciousPattern(val))) {
    return {
      isValid: false,
      message: 'Phát hiện ký tự hoặc cú pháp không an toàn trong dữ liệu đầu vào!',
    };
  }

  const HoTen = sanitizeText(body.HoTen);
  const CCCD = sanitizeText(body.CCCD);
  const SDT = sanitizeText(body.SDT);
  const Email = sanitizeText(body.Email).toLowerCase();
  const DiaChi = sanitizeText(body.DiaChi);
  const NamSinh =
    body.NamSinh !== undefined && body.NamSinh !== null && String(body.NamSinh).trim() !== ''
      ? Number(body.NamSinh)
      : null;

  // Kiểm tra Họ và tên: 2 - 100 ký tự, chỉ chứa chữ cái tiếng Việt và khoảng trắng
  const nameRegex = /^[a-zA-ZÀ-ỹ\s]{2,100}$/u;
  if (!HoTen || !nameRegex.test(HoTen)) {
    return {
      isValid: false,
      message: 'Họ và tên phải từ 2-100 ký tự và chỉ bao gồm chữ cái (không chứa số hoặc ký tự đặc biệt)!',
    };
  }

  // Kiểm tra Số điện thoại Việt Nam: 10 chữ số, bắt đầu bằng 03, 05, 07, 08, 09
  const phoneRegex = /^0(3|5|7|8|9)\d{8}$/;
  if (!SDT || !phoneRegex.test(SDT)) {
    return {
      isValid: false,
      message: 'Số điện thoại không hợp lệ (phải gồm 10 chữ số chuẩn nhà mạng Việt Nam)!',
    };
  }

  // Kiểm tra Số CCCD / Định danh: 12 chữ số
  if (CCCD) {
    const cccdRegex = /^\d{12}$/;
    if (!cccdRegex.test(CCCD)) {
      return {
        isValid: false,
        message: 'Số CCCD / Định danh phải bao gồm đúng 12 chữ số!',
      };
    }
  }

  // Kiểm tra Năm sinh: Từ 1925 đến (Năm hiện tại - 15)
  const currentYear = new Date().getFullYear();
  if (NamSinh !== null) {
    if (!Number.isInteger(NamSinh) || NamSinh < 1925 || NamSinh > currentYear - 15) {
      return {
        isValid: false,
        message: `Năm sinh không hợp lệ (phải từ 1925 đến ${currentYear - 15})!`,
      };
    }
  }

  // Kiểm tra Email
  if (Email) {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (Email.length > 100 || !emailRegex.test(Email)) {
      return {
        isValid: false,
        message: 'Địa chỉ Email liên hệ không đúng định dạng!',
      };
    }
  }

  // Kiểm tra Địa chỉ thường trú: Tối đa 255 ký tự, không chứa ký tự < >
  if (DiaChi) {
    if (DiaChi.length > 255 || /[<>]/.test(DiaChi)) {
      return {
        isValid: false,
        message: 'Địa chỉ thường trú không được vượt quá 255 ký tự hoặc chứa ký tự lạ!',
      };
    }
  }

  return {
    isValid: true,
    cleanData: {
      HoTen,
      CCCD: CCCD || null,
      SDT,
      NamSinh,
      Email: Email || null,
      DiaChi: DiaChi || null,
    },
  };
};

module.exports = {
  sanitizeText,
  validateAndSanitizeProfile,
};