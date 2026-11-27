// client/src/utils/webNfc.util.ts
interface NDEFRecordLike {
  recordType: string;
  encoding?: string;
  data?: DataView;
}

interface NDEFReadingEventLike {
  serialNumber?: string;
  message?: {
    records?: NDEFRecordLike[];
  };
}

interface NDEFReaderInstance {
  scan: (options?: { signal?: AbortSignal }) => Promise<void>;
  write: (
    message: { records: Array<{ recordType: string; data: string }> },
    options?: { signal?: AbortSignal }
  ) => Promise<void>;
  onreading: ((event: NDEFReadingEventLike) => void) | null;
  onreadingerror: (() => void) | null;
}

type NDEFReaderConstructor = new () => NDEFReaderInstance;

function getNDEFReaderCtor(): NDEFReaderConstructor | null {
  if (typeof window === "undefined") return null;
  const win = window as unknown as { NDEFReader?: NDEFReaderConstructor };
  return win.NDEFReader || null;
}

export function isWebNfcSupported(): boolean {
  return getNDEFReaderCtor() !== null;
}

export function normalizeSerialNumber(serial?: string): string {
  if (!serial) return "";
  return serial.replace(/:/g, "").trim().toUpperCase();
}

export function generateDoorNfcCode(maKhu: number): string {
  const randomBytes = new Uint8Array(6);
  crypto.getRandomValues(randomBytes);
  const hex = Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
  return `XT_DOOR_K${maKhu}_${hex}`;
}

/**
 * Đọc thẻ NFC gắn trên cửa:
 * - Ưu tiên đọc chuỗi mã NDEF dạng text đã ghi trên thẻ
 * - Nếu là thẻ trắng / Mifare chưa có NDEF -> tự động lấy serialNumber (UID)
 */
export async function readNfcDoorTag(
  timeoutMs = 25000,
  externalSignal?: AbortSignal
): Promise<{ code: string; source: "NDEF" | "UID" }> {
  const NDEFReaderCtor = getNDEFReaderCtor();
  if (!NDEFReaderCtor) {
    throw new Error(
      "Trình duyệt hoặc thiết bị chưa hỗ trợ Web NFC. Vui lòng mở bằng Google Chrome trên điện thoại Android (HTTPS)."
    );
  }

  const controller = new AbortController();
  const reader = new NDEFReaderCtor();

  return new Promise((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timer);
      if (externalSignal) {
        externalSignal.removeEventListener("abort", onExternalAbort);
      }
    };

    const onExternalAbort = () => {
      cleanup();
      controller.abort();
      reject(new Error("ABORTED_BY_USER"));
    };

    if (externalSignal) {
      if (externalSignal.aborted) {
        onExternalAbort();
        return;
      }
      externalSignal.addEventListener("abort", onExternalAbort, { once: true });
    }

    const timer = setTimeout(() => {
      cleanup();
      controller.abort();
      reject(new Error("Hết thời gian chờ chạm thẻ NFC. Vui lòng bấm quét lại."));
    }, timeoutMs);

    reader.onreading = (event: NDEFReadingEventLike) => {
      cleanup();
      controller.abort();

      // 1. Thử đọc bản ghi NDEF text
      const records = event.message?.records || [];
      for (const rec of records) {
        if (rec.recordType === "text" && rec.data) {
          const decoder = new TextDecoder(rec.encoding || "utf-8");
          const text = decoder.decode(rec.data).trim();
          if (text) {
            resolve({ code: text, source: "NDEF" });
            return;
          }
        }
      }

      // 2. Fallback sang UID (serialNumber) của thẻ
      const uid = normalizeSerialNumber(event.serialNumber);
      if (uid) {
        resolve({ code: uid, source: "UID" });
        return;
      }

      reject(new Error("Không đọc được mã từ thẻ NFC này."));
    };

    reader.onreadingerror = () => {
      cleanup();
      controller.abort();
      reject(
        new Error("Lỗi đọc thẻ NFC. Hãy giữ sát mặt lưng điện thoại vào thẻ trong 1-2 giây.")
      );
    };

    reader.scan({ signal: controller.signal }).catch((err: unknown) => {
      cleanup();
      const msg =
        err instanceof Error
          ? err.message
          : "Không thể bật NFC. Hãy kiểm tra quyền NFC trên điện thoại.";
      reject(new Error(msg));
    });
  });
}

/**
 * Ghi mã mở cửa mới trực tiếp lên thẻ NFC (NTAG213/215/216...)
 */
export async function writeNfcDoorTag(
  code: string,
  timeoutMs = 25000
): Promise<string> {
  const NDEFReaderCtor = getNDEFReaderCtor();
  if (!NDEFReaderCtor) {
    throw new Error(
      "Trình duyệt không hỗ trợ ghi Web NFC. Vui lòng dùng Chrome trên điện thoại Android (HTTPS)."
    );
  }

  const controller = new AbortController();
  const reader = new NDEFReaderCtor();

  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    await reader.write(
      { records: [{ recordType: "text", data: code }] },
      { signal: controller.signal }
    );
    clearTimeout(timer);
    return code;
  } catch (err: unknown) {
    clearTimeout(timer);
    if (controller.signal.aborted) {
      throw new Error("Hết thời gian chờ ghi thẻ NFC. Vui lòng thử lại.");
    }
    throw new Error(
      err instanceof Error
        ? `Không ghi được NDEF lên thẻ này (${err.message}). Nếu là thẻ chỉ đọc/Mifare, hãy dùng nút "Đọc thẻ có sẵn lưu hệ thống".`
        : "Ghi thẻ NFC thất bại."
    );
  }
}