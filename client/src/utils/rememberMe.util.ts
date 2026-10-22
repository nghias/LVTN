const STORAGE_KEY = 'xt_remembered_auth_v1';
const SECRET_SALT = 'XomTro_AES_GCM_Client_Salt_2026_SecureKey';
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000; // Đúng 30 ngày

interface RememberedData {
  tenTK: string;
  matKhau: string;
  expiresAt: number;
}

// Sinh khóa AES-GCM 256-bit từ Web Crypto API
async function getCryptoKey(): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(SECRET_SALT),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: enc.encode('xomtro_static_iv_salt'),
      iterations: 10000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// 1. Mã hóa AES-GCM và lưu thông tin đăng nhập trong 30 ngày
export async function saveRememberedCredentials(
  tenTK: string,
  matKhau: string
): Promise<void> {
  if (typeof window === 'undefined' || !window.crypto?.subtle) return;

  try {
    const key = await getCryptoKey();
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const payload: RememberedData = {
      tenTK,
      matKhau,
      expiresAt: Date.now() + THIRTY_DAYS_MS,
    };

    const encodedData = new TextEncoder().encode(JSON.stringify(payload));
    const encryptedBuffer = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encodedData
    );

    const ivBase64 = btoa(String.fromCharCode(...iv));
    const cipherBase64 = btoa(
      String.fromCharCode(...new Uint8Array(encryptedBuffer))
    );

    localStorage.setItem(STORAGE_KEY, `${ivBase64}.${cipherBase64}`);
  } catch (error) {
    console.error('Lỗi mã hóa ghi nhớ mật khẩu:', error);
  }
}

// 2. Giải mã và kiểm tra hạn 30 ngày (Nếu quá 30 ngày tự động xóa sạch)
export async function getRememberedCredentials(): Promise<{
  tenTK: string;
  matKhau: string;
} | null> {
  if (typeof window === 'undefined' || !window.crypto?.subtle) return null;

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw || !raw.includes('.')) return null;

  try {
    const [ivBase64, cipherBase64] = raw.split('.');
    const iv = Uint8Array.from(atob(ivBase64), (c) => c.charCodeAt(0));
    const cipherBytes = Uint8Array.from(atob(cipherBase64), (c) =>
      c.charCodeAt(0)
    );

    const key = await getCryptoKey();
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      cipherBytes
    );

    const decodedText = new TextDecoder().decode(decryptedBuffer);
    const data: RememberedData = JSON.parse(decodedText);

    // Kiểm tra thời hạn 30 ngày
    if (!data.expiresAt || Date.now() > data.expiresAt) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return {
      tenTK: data.tenTK,
      matKhau: data.matKhau,
    };
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

// 3. Xóa thông tin ghi nhớ khi người dùng bỏ tích
export function clearRememberedCredentials(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}