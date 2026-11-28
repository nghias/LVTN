// src/main.cpp
#include <Arduino.h>
#include <SPI.h>
#include <Wire.h>
#include <MFRC522.h>
#include <ESP32Servo.h>
#include <LiquidCrystal_I2C.h>
#include <Keypad.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ===== CẤU HÌNH CHÂN KẾT NỐI =====
#define SS_PIN    5     // Chân SDA của RC522
#define RST_PIN   27    // Chân RST của RC522
#define SERVO_PIN 13    // Chân tín hiệu Servo MG90S 180°
#define I2C_SDA   21    // Chân SDA của LCD 1602 I2C
#define I2C_SCL   22    // Chân SCL của LCD 1602 I2C
#define LCD_ADDR  0x27  // Đổi thành 0x3F nếu màn hình không hiện chữ

// ===== CẤU HÌNH BÀN PHÍM MA TRẬN 4x4 (HX-543) =====
const byte KEYPAD_ROWS = 4;
const byte KEYPAD_COLS = 4;

char keys[KEYPAD_ROWS][KEYPAD_COLS] = {
  {'D', 'C', 'B', 'A'},
  {'#', '9', '6', '3'},
  {'0', '8', '5', '2'},
  {'*', '7', '4', '1'}
};

// Chân 1..4 (Hàng R1..R4): D32, D33, D25, D26
byte rowPins[KEYPAD_ROWS] = {32, 33, 25, 26};
// Chân 5..8 (Cột C1..C4): D14, RX2(16), TX2(17), D4
byte colPins[KEYPAD_COLS] = {14, 16, 17, 4};

Keypad keypad = Keypad(makeKeymap(keys), rowPins, colPins, KEYPAD_ROWS, KEYPAD_COLS);

// ===== CẤU HÌNH MẬT KHẨU BÀN PHÍM =====
const int MAX_PIN_LEN             = 6;
const int MAX_WRONG_ATTEMPTS      = 5;
const unsigned long PIN_IDLE_MS   = 15000; // Tự xóa nếu ngừng bấm 15 giây
const unsigned long PIN_LOCK_MS   = 30000; // Khóa bàn phím 30 giây nếu sai 5 lần

// ===== CẤU HÌNH GÓC & TỐC ĐỘ MỞ CỬA =====
#define ANGLE_CLOSE    60     // Góc đóng mặc định
#define ANGLE_OPEN     160    // Góc mở cửa
#define STEP_DELAY_MS  10     // Xoay mượt 10ms/độ
#define OPEN_TIME      30000  // Giữ cửa mở 30 giây (đổi thành 3000 nếu muốn 3 giây)

// ===== CẤU HÌNH WI-FI & BACKEND RENDER (HTTPS) =====
const char* WIFI_SSID   = "Thanh_Nhan_2.4G";
const char* WIFI_PASS   = "13052004";
const String SERVER_URL = "https://lvtn-mvac.onrender.com/api/the-ra-vao/iot";
const String DEVICE_KEY = "IOT_SECRET_KEY_CS1";
const int    MA_KHU     = 1;

const byte TARGET_BLOCK = 4;

MFRC522 rfid(SS_PIN, RST_PIN);
MFRC522::MIFARE_Key key;
Servo doorServo;
LiquidCrystal_I2C lcd(LCD_ADDR, 16, 2);

// ===== BIẾN ĐỒNG BỘ ĐA LUỒNG (FreeRTOS) =====
enum DoorState {
  DOOR_IDLE,
  DOOR_OPENING,
  DOOR_OPEN,
  DOOR_CLOSING
};

portMUX_TYPE doorMux = portMUX_INITIALIZER_UNLOCKED;
SemaphoreHandle_t lcdMutex = NULL;

volatile DoorState g_doorState = DOOR_IDLE;
volatile int g_doorRemainSec = 0;
volatile bool g_doorTrigger = false;
volatile bool g_manualMoveReq = false;
volatile int g_manualTargetAngle = ANGLE_CLOSE;

// Trạng thái hiển thị LCD (được bảo vệ bởi lcdMutex)
bool g_opActive = false;
String g_opLine1 = "";
String g_opLine2 = "";

unsigned long g_toastUntil = 0;
String g_toastLine1 = "";
String g_toastLine2 = "";

bool g_lcdWriteMode = false;
unsigned long g_lcdWriteStartMs = 0;

// Trạng thái bàn phím đồng bộ lên LCD
bool g_lcdPinActive = false;
int g_lcdPinLen = 0;
unsigned long g_lcdPinLockUntil = 0;

String g_lastLine1 = "";
String g_lastLine2 = "";

// Biến điều khiển bàn phím ở luồng chính
String pinBuffer = "";
unsigned long lastKeyPressMs = 0;
int wrongPinCount = 0;
unsigned long pinLockUntilMs = 0;

// Biến điều khiển luồng chính (RFID + HTTP)
bool isWriteMode = false;
bool isRemoteWrite = false;
String pendingSessionId = "";
String dataToWrite = "";
unsigned long writeModeStartMs = 0;

unsigned long lastPollMs = 0;
unsigned long lastLcdRefreshMs = 0;
unsigned long lastWifiAttemptMs = 0;
bool wasWifiConnected = false;

// Chống quẹt lặp liên tục khi giữ thẻ trên đầu đọc
String lastCardUid = "";
unsigned long lastCardTimeMs = 0;

const unsigned long POLL_INTERVAL_MS     = 2000;  // 2 giây hỏi lệnh cấp thẻ / mở cửa NFC 1 lần
const unsigned long WRITE_TIMEOUT_MS     = 60000; // Hạn chờ đặt phôi thẻ: 60 giây
const unsigned long WIFI_RETRY_MS        = 10000; // Thử kết nối lại Wi-Fi mỗi 10 giây nếu rớt

// ===== HÀM HỖ TRỢ ĐỒNG BỘ LCD =====
void renderLcd() {
  if (lcdMutex == NULL) return;
  if (xSemaphoreTake(lcdMutex, pdMS_TO_TICKS(50)) != pdTRUE) return;

  DoorState dState;
  int dRemain;
  taskENTER_CRITICAL(&doorMux);
  dState = g_doorState;
  dRemain = g_doorRemainSec;
  taskEXIT_CRITICAL(&doorMux);

  String l1 = "";
  String l2 = "";
  unsigned long now = millis();

  if (g_opActive) {
    // Ưu tiên 1: Đang thực hiện tác vụ tức thời (xác thực / ghi thẻ / đồng bộ)
    l1 = g_opLine1;
    l2 = g_opLine2;
  } else if ((long)(g_toastUntil - now) > 0) {
    // Ưu tiên 2: Thông báo kết quả ngắn
    l1 = g_toastLine1;
    l2 = g_toastLine2;
  } else if (g_lcdPinActive) {
    // Ưu tiên 3: Đang nhập mật khẩu trên bàn phím
    l1 = "NHAP MAT KHAU:";
    String masked = "";
    for (int i = 0; i < MAX_PIN_LEN; i++) {
      masked += (i < g_lcdPinLen) ? "*" : "_";
    }
    l2 = masked + "  *:X #:OK";
  } else if (g_lcdWriteMode) {
    // Ưu tiên 4: Chế độ chờ ghi thẻ mới từ Web hoặc Serial
    unsigned long elapsed = now - g_lcdWriteStartMs;
    int wRemain = (elapsed >= WRITE_TIMEOUT_MS)
                    ? 0
                    : (int)((WRITE_TIMEOUT_MS - elapsed + 999) / 1000);

    if (dState == DOOR_OPEN) {
      l1 = "DUA THE VAO " + String(wRemain) + "s";
      l2 = "Cua mo con: " + String(dRemain) + "s";
    } else if (dState == DOOR_OPENING) {
      l1 = "DUA THE VAO " + String(wRemain) + "s";
      l2 = "Cua dang mo...";
    } else if (dState == DOOR_CLOSING) {
      l1 = "DUA THE VAO " + String(wRemain) + "s";
      l2 = "Cua dang dong...";
    } else {
      l1 = "DUA THE VAO DE";
      l2 = "GHI THE MOI " + String(wRemain) + "s";
    }
  } else if (dState != DOOR_IDLE) {
    // Ưu tiên 5: Trạng thái cửa đang mở / đếm ngược / đóng
    if (dState == DOOR_OPENING) {
      l1 = "THANH CONG!";
      l2 = "Dang mo cua...";
    } else if (dState == DOOR_OPEN) {
      l1 = "THANH CONG!";
      l2 = "Mo cua con: " + String(dRemain) + "s";
    } else {
      l1 = "DANG DONG CUA...";
      l2 = "Xin cam on!";
    }
  } else if ((long)(g_lcdPinLockUntil - now) > 0) {
    // Ưu tiên 6: Đang khóa tạm bàn phím do nhập sai nhiều lần
    int lockSec = (int)((g_lcdPinLockUntil - now + 999) / 1000);
    l1 = "SAI QUA 5 LAN!";
    l2 = "Thu lai sau " + String(lockSec) + "s";
  } else {
    // Ưu tiên 7: Màn hình mặc định
    if (WiFi.status() == WL_CONNECTED) {
      l1 = "QUET THE HOAC";
      l2 = "NHAP MAT KHAU...";
    } else {
      l1 = "MAT KET NOI WIFI";
      l2 = "Dang thu lai...";
    }
  }

  while (l1.length() < 16) l1 += " ";
  while (l2.length() < 16) l2 += " ";
  l1 = l1.substring(0, 16);
  l2 = l2.substring(0, 16);

  if (l1 != g_lastLine1 || l2 != g_lastLine2) {
    lcd.setCursor(0, 0);
    lcd.print(l1);
    lcd.setCursor(0, 1);
    lcd.print(l2);
    g_lastLine1 = l1;
    g_lastLine2 = l2;
  }

  xSemaphoreGive(lcdMutex);
}

void setOpMessage(const String &l1, const String &l2) {
  if (lcdMutex && xSemaphoreTake(lcdMutex, pdMS_TO_TICKS(50)) == pdTRUE) {
    g_opActive = true;
    g_opLine1 = l1;
    g_opLine2 = l2;
    xSemaphoreGive(lcdMutex);
  }
  renderLcd();
}

void clearOpMessage() {
  if (lcdMutex && xSemaphoreTake(lcdMutex, pdMS_TO_TICKS(50)) == pdTRUE) {
    g_opActive = false;
    xSemaphoreGive(lcdMutex);
  }
  renderLcd();
}

void showToast(const String &l1, const String &l2, unsigned long durationMs) {
  if (lcdMutex && xSemaphoreTake(lcdMutex, pdMS_TO_TICKS(50)) == pdTRUE) {
    g_toastLine1 = l1;
    g_toastLine2 = l2;
    g_toastUntil = millis() + durationMs;
    xSemaphoreGive(lcdMutex);
  }
  renderLcd();
}

void syncWriteModeToLcd(bool active, unsigned long startMs) {
  if (lcdMutex && xSemaphoreTake(lcdMutex, pdMS_TO_TICKS(50)) == pdTRUE) {
    g_lcdWriteMode = active;
    g_lcdWriteStartMs = startMs;
    xSemaphoreGive(lcdMutex);
  }
  renderLcd();
}

void syncPinStateToLcd(bool active, int len, unsigned long lockUntil) {
  if (lcdMutex && xSemaphoreTake(lcdMutex, pdMS_TO_TICKS(50)) == pdTRUE) {
    g_lcdPinActive = active;
    g_lcdPinLen = len;
    g_lcdPinLockUntil = lockUntil;
    xSemaphoreGive(lcdMutex);
  }
  renderLcd();
}

// ===== TIẾN TRÌNH ĐỘC LẬP ĐIỀU KHIỂN CỬA (SERVO) =====
void triggerOpenDoor() {
  taskENTER_CRITICAL(&doorMux);
  g_doorTrigger = true;
  g_manualMoveReq = false;
  taskEXIT_CRITICAL(&doorMux);
}

void requestManualAngle(int angle) {
  angle = constrain(angle, 0, 180);
  taskENTER_CRITICAL(&doorMux);
  if (g_doorState == DOOR_IDLE) {
    g_manualTargetAngle = angle;
    g_manualMoveReq = true;
  }
  taskEXIT_CRITICAL(&doorMux);
}

void doorTask(void *pvParameters) {
  int currentAngle = ANGLE_CLOSE;
  DoorState localState = DOOR_IDLE;
  unsigned long openDeadlineMs = 0;
  int lastReportedSec = -1;

  for (;;) {
    bool triggered = false;
    bool manualReq = false;
    int manualTarget = ANGLE_CLOSE;

    taskENTER_CRITICAL(&doorMux);
    if (g_doorTrigger) {
      triggered = true;
      g_doorTrigger = false;
    }
    if (g_manualMoveReq) {
      manualReq = true;
      manualTarget = g_manualTargetAngle;
    }
    taskEXIT_CRITICAL(&doorMux);

    if (triggered) {
      if (localState == DOOR_OPEN) {
        openDeadlineMs = millis() + OPEN_TIME;
        Serial.println(">>> [CUA] Gia han thoi gian giu cua mo.");
      } else {
        localState = DOOR_OPENING;
        taskENTER_CRITICAL(&doorMux);
        g_doorState = DOOR_OPENING;
        taskEXIT_CRITICAL(&doorMux);
        Serial.printf(">>> [MO CUA] Xoay tu %d do -> %d do (chay ngam)...\n", currentAngle, ANGLE_OPEN);
        renderLcd();
      }
    }

    if (localState == DOOR_OPENING) {
      if (currentAngle != ANGLE_OPEN) {
        currentAngle += (ANGLE_OPEN > currentAngle) ? 1 : -1;
        doorServo.write(currentAngle);
      } else {
        localState = DOOR_OPEN;
        openDeadlineMs = millis() + OPEN_TIME;
        lastReportedSec = (int)(OPEN_TIME / 1000);
        taskENTER_CRITICAL(&doorMux);
        g_doorState = DOOR_OPEN;
        g_doorRemainSec = lastReportedSec;
        taskEXIT_CRITICAL(&doorMux);
        renderLcd();
      }
    } else if (localState == DOOR_OPEN) {
      long remainMs = (long)(openDeadlineMs - millis());
      if (remainMs <= 0) {
        localState = DOOR_CLOSING;
        lastReportedSec = -1;
        taskENTER_CRITICAL(&doorMux);
        g_doorState = DOOR_CLOSING;
        g_doorRemainSec = 0;
        taskEXIT_CRITICAL(&doorMux);
        Serial.printf(">>> [DONG CUA] Xoay ve %d do...\n", ANGLE_CLOSE);
        renderLcd();
      } else {
        int sec = (int)((remainMs + 999) / 1000);
        if (sec != lastReportedSec) {
          lastReportedSec = sec;
          taskENTER_CRITICAL(&doorMux);
          g_doorRemainSec = sec;
          taskEXIT_CRITICAL(&doorMux);
          renderLcd();
        }
      }
    } else if (localState == DOOR_CLOSING) {
      if (currentAngle != ANGLE_CLOSE) {
        currentAngle += (ANGLE_CLOSE > currentAngle) ? 1 : -1;
        doorServo.write(currentAngle);
      } else {
        localState = DOOR_IDLE;
        taskENTER_CRITICAL(&doorMux);
        g_doorState = DOOR_IDLE;
        g_doorRemainSec = 0;
        taskEXIT_CRITICAL(&doorMux);
        Serial.println(">>> Da dong cua hoan tat.");
        renderLcd();
      }
    } else if (manualReq) {
      if (currentAngle != manualTarget) {
        currentAngle += (manualTarget > currentAngle) ? 1 : -1;
        doorServo.write(currentAngle);
      } else {
        taskENTER_CRITICAL(&doorMux);
        g_manualMoveReq = false;
        taskEXIT_CRITICAL(&doorMux);
      }
    }

    vTaskDelay(pdMS_TO_TICKS(STEP_DELAY_MS));
  }
}

// ===== KẾT NỐI WI-FI (KHÔNG CHẶN LUỒNG) =====
void checkWiFiNonBlocking() {
  if (WiFi.status() == WL_CONNECTED) {
    if (!wasWifiConnected) {
      wasWifiConnected = true;
      Serial.print("\n[WIFI] Da ket noi! IP: ");
      Serial.println(WiFi.localIP());
      showToast("DA KET NOI WIFI", WiFi.localIP().toString(), 1800);
    }
    return;
  }

  if (wasWifiConnected) {
    wasWifiConnected = false;
    Serial.println("[WIFI] Mat ket noi Wi-Fi!");
    renderLcd();
  }

  if (millis() - lastWifiAttemptMs >= WIFI_RETRY_MS) {
    lastWifiAttemptMs = millis();
    Serial.printf("[WIFI] Dang thu ket noi lai toi %s...\n", WIFI_SSID);
    WiFi.disconnect();
    WiFi.begin(WIFI_SSID, WIFI_PASS);
  }
}

// ===== ĐỌC / GHI RFID RC522 =====
String getCardUID() {
  String uidStr = "";
  for (byte i = 0; i < rfid.uid.size; i++) {
    if (rfid.uid.uidByte[i] < 0x10) uidStr += "0";
    uidStr += String(rfid.uid.uidByte[i], HEX);
  }
  uidStr.toUpperCase();
  return uidStr;
}

bool writeSecretToCard(String secret) {
  byte buffer[16];
  memset(buffer, 0, 16);
  int len = min((int)secret.length(), 16);
  for (int i = 0; i < len; i++) buffer[i] = secret[i];

  MFRC522::StatusCode status = rfid.PCD_Authenticate(
    MFRC522::PICC_CMD_MF_AUTH_KEY_A, TARGET_BLOCK, &key, &(rfid.uid)
  );
  if (status != MFRC522::STATUS_OK) return false;

  status = rfid.MIFARE_Write(TARGET_BLOCK, buffer, 16);
  return (status == MFRC522::STATUS_OK);
}

bool readSecretFromCard(String &outSecret) {
  byte buffer[18];
  byte size = sizeof(buffer);

  MFRC522::StatusCode status = rfid.PCD_Authenticate(
    MFRC522::PICC_CMD_MF_AUTH_KEY_A, TARGET_BLOCK, &key, &(rfid.uid)
  );
  if (status != MFRC522::STATUS_OK) return false;

  status = rfid.MIFARE_Read(TARGET_BLOCK, buffer, &size);
  if (status != MFRC522::STATUS_OK) return false;

  outSecret = "";
  for (byte i = 0; i < 16; i++) {
    if (buffer[i] == 0) break;
    outSecret += (char)buffer[i];
  }
  outSecret.trim();
  return true;
}

// ===== GIAO TIẾP HTTPS VỚI BACKEND RENDER =====
int verifyCardWithServer(String uid, String secret) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[LOI] Mat Wi-Fi, khong the xac thuc the!");
    return -1;
  }

  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient http;
  http.setTimeout(10000);
  if (!http.begin(client, SERVER_URL + "/quet-the")) return -1;

  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-device-key", DEVICE_KEY);

  JsonDocument reqDoc;
  reqDoc["maKhu"]  = MA_KHU;
  reqDoc["uid"]    = uid;
  reqDoc["secret"] = secret;

  String payload;
  serializeJson(reqDoc, payload);

  int httpCode = http.POST(payload);
  int result = -1;

  if (httpCode > 0) {
    String response = http.getString();
    Serial.printf("[SERVER %d] %s\n", httpCode, response.c_str());

    JsonDocument resDoc;
    if (deserializeJson(resDoc, response) == DeserializationError::Ok) {
      bool allow = resDoc["allow"] | false;
      result = allow ? 1 : 0;
      const char *msg = resDoc["message"] | "";
      Serial.printf(">>> Ket qua the: %s (%s)\n", allow ? "HOP LE" : "TU CHOI", msg);
    }
  } else {
    Serial.printf("[LOI HTTPS] %s\n", http.errorToString(httpCode).c_str());
  }

  http.end();
  return result;
}

int verifyPasswordWithServer(String matKhau) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[LOI] Mat Wi-Fi, khong the kiem tra mat khau!");
    return -1;
  }

  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient http;
  http.setTimeout(10000);
  if (!http.begin(client, SERVER_URL + "/kiem-tra-mat-khau")) return -1;

  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-device-key", DEVICE_KEY);

  JsonDocument reqDoc;
  reqDoc["maKhu"]   = MA_KHU;
  reqDoc["matKhau"] = matKhau;

  String payload;
  serializeJson(reqDoc, payload);

  int httpCode = http.POST(payload);
  int result = -1;

  if (httpCode > 0) {
    String response = http.getString();
    Serial.printf("[MAT KHAU %d] %s\n", httpCode, response.c_str());

    JsonDocument resDoc;
    if (deserializeJson(resDoc, response) == DeserializationError::Ok) {
      bool allow = resDoc["allow"] | false;
      result = allow ? 1 : 0;
      const char *msg = resDoc["message"] | "";
      Serial.printf(">>> Ket qua PIN: %s (%s)\n", allow ? "HOP LE" : "TU CHOI", msg);
    }
  } else {
    Serial.printf("[LOI HTTPS PIN] %s\n", http.errorToString(httpCode).c_str());
  }

  http.end();
  return result;
}

void pollPendingWriteCommand() {
  if (WiFi.status() != WL_CONNECTED) return;
  if (isWriteMode && !isRemoteWrite) return;

  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient http;
  http.setTimeout(5000);
  if (!http.begin(client, SERVER_URL + "/lenh-ghi?maKhu=" + String(MA_KHU))) return;
  http.addHeader("x-device-key", DEVICE_KEY);

  int httpCode = http.GET();
  if (httpCode == 200) {
    String response = http.getString();
    JsonDocument resDoc;
    if (deserializeJson(resDoc, response) == DeserializationError::Ok) {
      // 1. Lệnh mở cổng qua NFC điện thoại
      bool remoteOpen = resDoc["openDoor"] | false;
      if (remoteOpen) {
        const char *tenPhong = resDoc["tenPhong"] | "NFC";
        Serial.printf("\n>>> [MO CUA NFC] Mo cong cho: %s\n", tenPhong);
        showToast("MO CUA BANG NFC", String(tenPhong), 1600);
        triggerOpenDoor();
      }

      // 2. Lệnh ghi phôi thẻ RFID mới
      bool hasJob = resDoc["hasJob"] | false;
      if (!hasJob) {
        if (isWriteMode && isRemoteWrite) {
          isWriteMode      = false;
          isRemoteWrite    = false;
          pendingSessionId = "";
          syncWriteModeToLcd(false, 0);
          Serial.println("[HUY TU WEB] Phien ghi the da huy, quay ve mac dinh.");
        }
      } else {
        String sid    = String((const char *)(resDoc["sessionId"] | ""));
        String secret = String((const char *)(resDoc["secret"] | ""));

        if (sid.length() > 0 && secret.length() > 0 && secret.length() <= 16 && sid != pendingSessionId) {
          pendingSessionId = sid;
          dataToWrite      = secret;
          isWriteMode      = true;
          isRemoteWrite    = true;
          writeModeStartMs = millis();
          lastCardUid      = "";
          pinBuffer        = "";
          syncPinStateToLcd(false, 0, pinLockUntilMs);
          syncWriteModeToLcd(true, writeModeStartMs);
          Serial.println("\n==========================================");
          Serial.printf("[LENH TU WEB] Phien moi (%s) - Dua the vao RC522!\n", sid.c_str());
          Serial.println("==========================================");
        }
      }
    }
  }
  http.end();
}

int confirmWriteToServer(String sessionId, String uid, String secret) {
  if (WiFi.status() != WL_CONNECTED) return -1;

  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient http;
  http.setTimeout(10000);
  if (!http.begin(client, SERVER_URL + "/xac-nhan-ghi")) return -1;

  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-device-key", DEVICE_KEY);

  JsonDocument reqDoc;
  reqDoc["maKhu"]     = MA_KHU;
  reqDoc["sessionId"] = sessionId;
  reqDoc["uid"]       = uid;
  reqDoc["secret"]    = secret;

  String payload;
  serializeJson(reqDoc, payload);

  int httpCode = http.POST(payload);
  if (httpCode > 0) {
    Serial.printf("[XAC NHAN GHI %d] %s\n", httpCode, http.getString().c_str());
  } else {
    Serial.printf("[LOI XAC NHAN GHI] %s\n", http.errorToString(httpCode).c_str());
  }
  http.end();
  return httpCode;
}

// ===== XỬ LÝ BÀN PHÍM NHẬP MẬT KHẨU (HX-543) =====
void handleKeypadInput() {
  unsigned long now = millis();

  // Tự động xóa ô nhập nếu ngừng bấm quá 15 giây
  if (pinBuffer.length() > 0 && (now - lastKeyPressMs >= PIN_IDLE_MS)) {
    pinBuffer = "";
    syncPinStateToLcd(false, 0, pinLockUntilMs);
    Serial.println("[KEYPAD] Het thoi gian nhap, da xoa bo dem.");
  }

  // Hết thời gian khóa tạm sau 5 lần nhập sai
  if (pinLockUntilMs > 0 && (long)(pinLockUntilMs - now) <= 0) {
    pinLockUntilMs = 0;
    wrongPinCount = 0;
    syncPinStateToLcd(pinBuffer.length() > 0, pinBuffer.length(), 0);
  }

  char k = keypad.getKey();
  if (!k) return;

  // Đang ở chế độ ghi thẻ từ Web -> không nhận nhập PIN
  if (isWriteMode) {
    showToast("DANG GHI THE MOI", "Vui long cho...", 1200);
    return;
  }

  // Đang bị khóa tạm do sai quá 5 lần
  if (pinLockUntilMs > 0 && (long)(pinLockUntilMs - now) > 0) {
    int lockSec = (int)((pinLockUntilMs - now + 999) / 1000);
    showToast("BAN PHIM BI KHOA", "Cho them " + String(lockSec) + "s", 1200);
    return;
  }

  lastKeyPressMs = now;

  if (k >= '0' && k <= '9') {
    if ((int)pinBuffer.length() < MAX_PIN_LEN) {
      pinBuffer += k;
      syncPinStateToLcd(true, pinBuffer.length(), pinLockUntilMs);
    }
  } else if (k == '*') {
    // Xóa 1 ký tự vừa nhập (Backspace)
    if (pinBuffer.length() > 0) {
      pinBuffer.remove(pinBuffer.length() - 1);
      syncPinStateToLcd(pinBuffer.length() > 0, pinBuffer.length(), pinLockUntilMs);
    }
  } else if (k == 'D') {
    // Hủy nhập hoàn toàn
    if (pinBuffer.length() > 0) {
      pinBuffer = "";
      syncPinStateToLcd(false, 0, pinLockUntilMs);
      showToast("DA HUY NHAP PIN", "Quay ve mac dinh", 1000);
    }
  } else if (k == '#') {
    // Yêu cầu nhập đủ 6 chữ số mới gửi xác thực
    if ((int)pinBuffer.length() < MAX_PIN_LEN) {
      showToast("CHUA DU 6 SO!", "Nhap du 6 so + #", 1500);
      return;
    }

    String submittedPin = pinBuffer;
    pinBuffer = "";
    syncPinStateToLcd(false, 0, pinLockUntilMs);

    setOpMessage("DANG KIEM TRA", "MAT KHAU...");
    int verifyRes = verifyPasswordWithServer(submittedPin);
    clearOpMessage();

    if (verifyRes == 1) {
      wrongPinCount = 0;
      pinLockUntilMs = 0;
      syncPinStateToLcd(false, 0, 0);
      triggerOpenDoor();
    } else if (verifyRes == 0) {
      wrongPinCount++;
      if (wrongPinCount >= MAX_WRONG_ATTEMPTS) {
        pinLockUntilMs = millis() + PIN_LOCK_MS;
        syncPinStateToLcd(false, 0, pinLockUntilMs);
        Serial.println(">>> [CANH BAO] Sai mat khau 5 lan! Khoa ban phim 30s.");
        showToast("SAI QUA 5 LAN!", "Khoa ban phim 30s", 2200);
      } else {
        int remainTries = MAX_WRONG_ATTEMPTS - wrongPinCount;
        showToast("SAI MAT KHAU!", "Con " + String(remainTries) + " lan thu", 2000);
      }
    } else {
      showToast("LOI KET NOI", "Thu nhap lai!", 2000);
    }
  }
}

// ===== LỆNH DEBUG QUA SERIAL =====
void handleSerialCommand() {
  if (!Serial.available()) return;

  String cmd = Serial.readStringUntil('\n');
  cmd.trim();

  if (cmd == "test") {
    triggerOpenDoor();
  } else if (cmd.startsWith("g:")) {
    int angle = cmd.substring(2).toInt();
    Serial.printf("[CHINH GOC] Xoay den %d do...\n", angle);
    requestManualAngle(angle);
    showToast("CHINH GOC SERVO", "Goc: " + String(angle) + " do", 1500);
  } else if (cmd.startsWith("w:")) {
    dataToWrite = cmd.substring(2);
    dataToWrite.trim();
    if (dataToWrite.length() == 0 || dataToWrite.length() > 16) {
      Serial.println("[LOI] Ma bi mat phai tu 1 den 16 ky tu!");
      return;
    }
    isWriteMode      = true;
    isRemoteWrite    = false;
    pendingSessionId = "";
    writeModeStartMs = millis();
    lastCardUid      = "";
    pinBuffer        = "";
    syncPinStateToLcd(false, 0, pinLockUntilMs);
    syncWriteModeToLcd(true, writeModeStartMs);
    Serial.println("[CHE DO GHI THU CONG] Dat the len RC522 de nap ma.");
  } else if (cmd == "c") {
    isWriteMode      = false;
    isRemoteWrite    = false;
    pendingSessionId = "";
    syncWriteModeToLcd(false, 0);
    Serial.println("[DA HUY] Quay ve che do kiem soat ra vao.");
    showToast("DA HUY GHI THE", "Quay ve mac dinh", 1200);
  }
}

void setup() {
  Serial.begin(115200);

  lcdMutex = xSemaphoreCreateMutex();

  // Khởi tạo LCD 1602 I2C (SDA=21, SCL=22)
  Wire.begin(I2C_SDA, I2C_SCL);
  lcd.init();
  lcd.backlight();
  setOpMessage("HE THONG XOM TRO", "Dang khoi dong..");

  SPI.begin();
  rfid.PCD_Init();
  for (byte i = 0; i < 6; i++) key.keyByte[i] = 0xFF;

  // Cấu hình độ nhạy chống dội phím HX-543
  keypad.setDebounceTime(35);

  // Khởi tạo Servo & tạo tiến trình độc lập điều khiển cửa
  doorServo.setPeriodHertz(50);
  doorServo.attach(SERVO_PIN, 600, 2400);
  doorServo.write(ANGLE_CLOSE);

  xTaskCreatePinnedToCore(
    doorTask,
    "DoorTask",
    4096,
    NULL,
    2,
    NULL,
    1
  );

  // Kết nối Wi-Fi lần đầu
  setOpMessage("DANG KET NOI", "Wi-Fi...");
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  unsigned long startAttempt = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startAttempt < 10000) {
    delay(250);
    Serial.print(".");
  }
  clearOpMessage();

  if (WiFi.status() == WL_CONNECTED) {
    wasWifiConnected = true;
    Serial.print("\n[WIFI] Ket noi thanh cong! IP: ");
    Serial.println(WiFi.localIP());
    showToast("DA KET NOI WIFI", WiFi.localIP().toString(), 1500);
  } else {
    lastWifiAttemptMs = millis();
    Serial.println("\n[WIFI] Chua ket noi duoc, se tu thu lai ngam...");
    renderLcd();
  }

  Serial.println("\n=== HE THONG RFID + KEYPAD HX-543 + NFC + SERVO FreeRTOS ===");
  Serial.printf("MaKhu: %d | Server: %s\n", MA_KHU, SERVER_URL.c_str());
}

void loop() {
  checkWiFiNonBlocking();
  handleSerialCommand();
  handleKeypadInput();

  // Kiểm tra hết hạn chế độ ghi thẻ
  if (isWriteMode && (millis() - writeModeStartMs > WRITE_TIMEOUT_MS)) {
    isWriteMode      = false;
    isRemoteWrite    = false;
    pendingSessionId = "";
    syncWriteModeToLcd(false, 0);
    Serial.println("[HET GIO] Da huy che do cho ghi the.");
    showToast("HET GIO GHI THE", "Quay ve mac dinh", 1800);
  }

  // Làm mới LCD định kỳ mỗi 300ms
  if (millis() - lastLcdRefreshMs >= 300) {
    lastLcdRefreshMs = millis();
    renderLcd();
  }

  // Hỏi lệnh cấp thẻ / mở cửa NFC từ Web mỗi 2 giây (tạm hoãn nếu đang gõ dở phím để không khựng phím)
  if (pinBuffer.length() == 0 && (millis() - lastPollMs >= POLL_INTERVAL_MS)) {
    lastPollMs = millis();
    pollPendingWriteCommand();
  }

  // Đọc thẻ RC522
  if (!rfid.PICC_IsNewCardPresent() || !rfid.PICC_ReadCardSerial()) {
    delay(15);
    return;
  }

  String uid = getCardUID();
  unsigned long cooldownMs = isWriteMode ? 1500 : 2500;
  if (uid == lastCardUid && (millis() - lastCardTimeMs < cooldownMs)) {
    rfid.PICC_HaltA();
    rfid.PCD_StopCrypto1();
    delay(15);
    return;
  }
  lastCardUid = uid;
  lastCardTimeMs = millis();

  // Nếu đang gõ dở PIN mà người dùng quẹt thẻ -> xóa ô PIN để ưu tiên quẹt thẻ
  if (pinBuffer.length() > 0) {
    pinBuffer = "";
    syncPinStateToLcd(false, 0, pinLockUntilMs);
  }

  Serial.println("\n[RFID] Phat hien the tren dau doc.");

  if (isWriteMode) {
    setOpMessage("DANG GHI THE...", "Giu nguyen the!");
    if (writeSecretToCard(dataToWrite)) {
      Serial.println(">>> [THANH CONG] Da nap ma bao mat vao the!");
      if (isRemoteWrite && pendingSessionId.length() > 0) {
        setOpMessage("DANG DONG BO...", "Vui long cho!");
        int code = confirmWriteToServer(pendingSessionId, uid, dataToWrite);
        clearOpMessage();

        if (code == 200) {
          Serial.println(">>> [DONG BO] Da kich hoat the thanh cong tren Server!");
          isWriteMode      = false;
          isRemoteWrite    = false;
          pendingSessionId = "";
          syncWriteModeToLcd(false, 0);
          showToast("GHI THE MOI", "THANH CONG!", 2200);
        } else if (code == 409) {
          Serial.println(">>> [TRUNG THE] Phoi the da duoc gan cho tai khoan khac!");
          showToast("THE DA DUOC DUNG", "Dung the khac!", 2200);
        } else {
          Serial.println(">>> [CANH BAO] Loi dong bo Server.");
          isWriteMode      = false;
          isRemoteWrite    = false;
          pendingSessionId = "";
          syncWriteModeToLcd(false, 0);
          showToast("LOI DONG BO", "Thu lai sau!", 2200);
        }
      } else {
        clearOpMessage();
        isWriteMode = false;
        syncWriteModeToLcd(false, 0);
        showToast("GHI THE MOI", "THANH CONG!", 2200);
      }
    } else {
      clearOpMessage();
      Serial.println(">>> [THAT BAI] Khong the ghi the, giu sat the vao RC522.");
      showToast("GHI THE THAT BAI", "Dat sat the lai!", 1800);
    }
  } else {
    setOpMessage("DANG CHO", "XAC NHAN...");

    String cardSecret = "";
    if (readSecretFromCard(cardSecret)) {
      int verifyRes = verifyCardWithServer(uid, cardSecret);
      clearOpMessage();

      if (verifyRes == 1) {
        triggerOpenDoor();
      } else if (verifyRes == 0) {
        showToast("KHONG THANH CONG", "Moi quet lai!", 2200);
      } else {
        showToast("LOI KET NOI", "Thu quet lai!", 2200);
      }
    } else {
      clearOpMessage();
      Serial.println(">>> [TU CHOI] Khong doc duoc ma bao mat tren the!");
      showToast("KHONG THANH CONG", "Moi quet lai!", 2200);
    }
  }

  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();
  delay(15);
}