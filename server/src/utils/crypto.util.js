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

// 2. Băm mật khẩu 1 chiều bằng BCRYPT (Dùng khi đăng ký hoặc đổi mật khẩu)
const hashPassword = async (plainPassword) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plainPassword, salt);
};

// 3. So khớp mật khẩu bằng BCRYPT (Dùng khi đăng nhập)
const comparePassword = async (plainPassword, hashedPassword) => {
  if (!plainPassword || !hashedPassword) return false;
  return bcrypt.compare(plainPassword, hashedPassword);
};

module.exports = {
  encryptAES,
  decryptAES,
  hashPassword,
  comparePassword,
};