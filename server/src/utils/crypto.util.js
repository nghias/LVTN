const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const env = require('../app/config/env.config');

// 1. Cấu hình mã hóa 2 chiều AES-256 cho thông tin cá nhân (CCCD, SĐT)
const ALGORITHM = 'aes-256-cbc';
const SECRET_KEY = crypto
  .createHash('sha256')
  .update(String(env.aesSecretKey))
  .digest('base64')
  .substring(0, 32);

const encryptAES = (plainText) => {
  if (!plainText) return plainText;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(SECRET_KEY), iv);
  let encrypted = cipher.update(String(plainText), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
};

const decryptAES = (cipherText) => {
  if (!cipherText || !String(cipherText).includes(':')) {
    return cipherText;
  }
  try {
    const [ivHex, encryptedHex] = String(cipherText).split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(SECRET_KEY), iv);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    return cipherText;
  }
};

// 2. Băm mật khẩu 1 chiều bằng BCRYPT (Dùng khi đăng ký, đổi mật khẩu, mật khẩu cửa)
const hashPassword = async (plainPassword) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(String(plainPassword), salt);
};

// 3. So khớp mật khẩu bằng BCRYPT (Dùng khi đăng nhập, mở cửa bằng bàn phím)
const comparePassword = async (plainPassword, hashedPassword) => {
  if (!plainPassword || !hashedPassword) return false;
  return bcrypt.compare(String(plainPassword), hashedPassword);
};

// 4. Băm 1 chiều HMAC-SHA256 cho MaMoCua (NFC) và TheRaVao.GiaTri (UID thẻ RFID)
const getAccessHmacSecret = () => {
  const secret = process.env.ACCESS_HMAC_SECRET || env.aesSecretKey;
  if (!secret) {
    throw new Error('Thiếu biến môi trường ACCESS_HMAC_SECRET trong .env');
  }
  return String(secret);
};

const normalizeAccessCode = (rawValue) => {
  if (!rawValue) return '';
  return String(rawValue).trim().toUpperCase();
};

const hashAccessCode = (rawValue) => {
  const normalized = normalizeAccessCode(rawValue);
  if (!normalized) return null;
  return crypto
    .createHmac('sha256', getAccessHmacSecret())
    .update(normalized)
    .digest('hex');
};

// Tạo chuỗi lưu vào TheRaVao.GiaTri theo dạng HMAC(UID)|HMAC(UID|SECRET)
const buildCardGiaTriHash = (uid, secret) => {
  const cleanUid = normalizeAccessCode(uid);
  const cleanSecret = String(secret || '').trim();
  if (!cleanUid || !cleanSecret) return null;
  const uidHash = hashAccessCode(cleanUid);
  const pairHash = crypto
    .createHmac('sha256', getAccessHmacSecret())
    .update(`${cleanUid}|${cleanSecret}`)
    .digest('hex');
  return `${uidHash}|${pairHash}`;
};

// 5. Các hàm kiểm tra định dạng đã mã hóa (tránh mã hóa lặp)
const isSha256Hex = (value) =>
  typeof value === 'string' && /^[a-f0-9]{64}$/i.test(value);

const isHashedCardGiaTri = (value) =>
  typeof value === 'string' && /^[a-f0-9]{64}(\|[a-f0-9]{64})?$/i.test(value);

const isBcryptHash = (value) =>
  typeof value === 'string' && /^\$2[aby]\$\d{2}\$.{53}$/.test(value);

module.exports = {
  encryptAES,
  decryptAES,
  hashPassword,
  comparePassword,
  normalizeAccessCode,
  hashAccessCode,
  buildCardGiaTriHash,
  isSha256Hex,
  isHashedCardGiaTri,
  isBcryptHash,
};