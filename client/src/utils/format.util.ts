// 1. Làm sạch đuôi .00 từ kiểu DECIMAL của MySQL/TiDB (VD: "2200000.00" -> "2200000", "21.00" -> "21")
export function cleanDecimalString(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '';
  const num = Number(value);
  if (isNaN(num)) return '';
  return String(Math.round(num));
}

// 2. Định dạng hiển thị kiểu tiền tệ / số Việt Nam có dấu chấm phân cách (VD: 2200000 -> "2.200.000")
export function formatVNDInput(value: string | number | null | undefined): string {
  const clean = cleanDecimalString(value);
  if (!clean) return '';
  return Number(clean).toLocaleString('vi-VN');
}

// 3. Chuyển chuỗi người dùng đang gõ (có dấu chấm "2.200.000") về chuỗi số nguyên sạch ("2200000") để lưu vào State/DB
export function parseVNDInput(rawInput: string): string {
  const digitsOnly = rawInput.replace(/\D/g, '');
  if (!digitsOnly) return '';
  return String(Number(digitsOnly));
}