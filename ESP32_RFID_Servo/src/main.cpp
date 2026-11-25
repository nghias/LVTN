// src/main.cpp
#include <Arduino.h>
#include <SPI.h>
#include <Wire.h>
#include <MFRC522.h>
#include <ESP32Servo.h>
#include <LiquidCrystal_I2C.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ===== CẤU HÌNH CHÂN KẾT NỐI =====
#define SS_PIN    5     // Chân SDA của RC522
#define RST_PIN   27    // Chân RST của RC522 (đã chuyển từ GPIO 22 sang 27 để nhường I2C SCL)
#define SERVO_PIN 13    // Chân tín hiệu Servo MG90S 180°
#define I2C_SDA   21    // Chân SDA của LCD 1602 I2C
#define I2C_SCL   22    // Chân SCL của LCD 1602 I2C

// Địa chỉ I2C phổ biến của LCD 1602 là 0x27 (nếu không hiện chữ, đổi thành 0x3F)
#define LCD_ADDR  0x27

// ===== CẤU HÌNH GÓC & TỐC ĐỘ MỞ CỬA =====
#define ANGLE_CLOSE    60     // Góc đóng mặc định
#define ANGLE_OPEN     160    // Góc mở cửa
#define STEP_DELAY_MS  10     // Xoay mượt 10ms/độ
#define OPEN_TIME      30000  // Giữ cửa mở 30 giây

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

int currentAngle = ANGLE_CLOSE;
bool isWriteMode = false;
bool isRemoteWrite = false;
String pendingSessionId = "";
String dataToWrite = "";
unsigned long writeModeStartMs = 0;
unsigned long lastPollMs = 0;
unsigned long lastWriteLcdMs = 0;
bool wasWifiConnected = false;

const unsigned long POLL_INTERVAL_MS = 2500;
const unsigned long WRITE_TIMEOUT_MS = 60000;

// ===== HÀM HIỂN THỊ LCD 1602 KHÔNG NHẤP NHÁY =====
void lcdShow(String line1, String line2) {
  while (line1.length() < 16) line1 += " ";
  while (line2.length() < 16) line2 += " ";
  lcd.setCursor(0, 0);
  lcd.print(line1.substring(0, 16));
  lcd.setCursor(0, 1);
  lcd.print(line2.substring(0, 16));
}

void showDefaultScreen() {
  if (WiFi.status() == WL_CONNECTED) {
    lcdShow("QUET THE DE", "MO CUA...");
  } else {
    lcdShow("MAT KET NOI WIFI", "Dang thu lai...");
  }
}

void showWriteModeScreen() {
  unsigned long elapsed = millis() - writeModeStartMs;
  int remainSec = (elapsed >= WRITE_TIMEOUT_MS)
                    ? 0
                    : (int)((WRITE_TIMEOUT_MS - elapsed + 999) / 1000);
  lcdShow("DUA THE VAO DE", "GHI THE MOI " + String(remainSec) + "s");
}

// ===== ĐIỀU KHIỂN SERVO =====
void moveServoSmooth(int targetAngle) {
  targetAngle = constrain(targetAngle, 0, 180);
  if (targetAngle == currentAngle) return;

  int step = (targetAngle > currentAngle) ? 1 : -1;
  while (currentAngle != targetAngle) {
    currentAngle += step;
    doorServo.write(currentAngle);
    delay(STEP_DELAY_MS);
  }
}

void openDoor() {
  Serial.printf(">>> [MO CUA] Xoay tu %d do -> %d do...\n", ANGLE_CLOSE, ANGLE_OPEN);
  lcdShow("THANH CONG!", "Dang mo cua...");
  moveServoSmooth(ANGLE_OPEN);

  // Đếm ngược thời gian mở cửa trực tiếp trên LCD
  int openSeconds = max(1, (int)(OPEN_TIME / 1000));
  for (int sec = openSeconds; sec > 0; sec--) {
    lcdShow("THANH CONG!", "Mo cua con: " + String(sec) + "s");
    delay(1000);
  }

  Serial.printf(">>> [DONG CUA] Xoay ve %d do...\n", ANGLE_CLOSE);
  lcdShow("DANG DONG CUA...", "Xin cam on!");
  moveServoSmooth(ANGLE_CLOSE);
  Serial.println(">>> Da dong cua.");
  delay(600);
  showDefaultScreen();
}

// ===== KẾT NỐI WI-FI =====
void ensureWiFiConnected() {
  if (WiFi.status() == WL_CONNECTED) {
    if (!wasWifiConnected) {
      wasWifiConnected = true;
      lcdShow("DA KET NOI WIFI", WiFi.localIP().toString());
      delay(1500);
      showDefaultScreen();
    }
    return;
  }

  wasWifiConnected = false;
  Serial.printf("[WIFI] Dang ket noi toi %s", WIFI_SSID);
  lcdShow("DANG KET NOI", "Wi-Fi...");
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  unsigned long startAttempt = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startAttempt < 12000) {
    delay(300);
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED) {
    wasWifiConnected = true;
    Serial.print("\n[WIFI] Ket noi thanh cong! IP: ");
    Serial.println(WiFi.localIP());
    lcdShow("DA KET NOI WIFI", WiFi.localIP().toString());
    delay(1500);
    showDefaultScreen();
  } else {
    Serial.println("\n[WIFI] Ket noi that bai, se thu lai...");
    lcdShow("MAT KET NOI WIFI", "Dang thu lai...");
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
// Trả về: 1 = Hợp lệ, 0 = Không hợp lệ/Bị khóa, -1 = Lỗi mạng/Server
int verifyCardWithServer(String uid, String secret) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[LOI] Mat Wi-Fi, khong the xac thuc the!");
    return -1;
  }

  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient http;
  http.setTimeout(10000);
  if (!http.begin(client, SERVER_URL + "/quet-the")) {
    return -1;
  }

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
      const char* msg = resDoc["message"] | "";
      Serial.printf(">>> Ket qua: %s (%s)\n", allow ? "HOP LE" : "TU CHOI", msg);
    }
  } else {
    Serial.printf("[LOI HTTPS] %s\n", http.errorToString(httpCode).c_str());
  }

  http.end();
  return result;
}

// Hỏi Backend phiên ghi thẻ mới / cấp lại (đồng thời bắt lệnh hủy nếu Web đóng trang)
void pollPendingWriteCommand() {
  if (WiFi.status() != WL_CONNECTED) return;
  // Không ghi đè nếu đang ghi thủ công bằng lệnh w: qua Serial
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
      bool hasJob = resDoc["hasJob"] | false;

      if (!hasJob) {
        // Phiên trên Web đã bị hủy hoặc hết hạn -> tự quay về mặc định
        if (isWriteMode && isRemoteWrite) {
          isWriteMode      = false;
          isRemoteWrite    = false;
          pendingSessionId = "";
          Serial.println("[HUY TU WEB] Phien ghi the da huy, quay ve mac dinh.");
          showDefaultScreen();
        }
      } else {
        String sid    = String((const char*)(resDoc["sessionId"] | ""));
        String secret = String((const char*)(resDoc["secret"] | ""));

        if (sid.length() > 0 && secret.length() > 0 && secret.length() <= 16 && sid != pendingSessionId) {
          pendingSessionId = sid;
          dataToWrite      = secret;
          isWriteMode      = true;
          isRemoteWrite    = true;
          writeModeStartMs = millis();
          lastWriteLcdMs   = 0;
          showWriteModeScreen();
          Serial.println("\n==========================================");
          Serial.printf("[LENH TU WEB] Phien moi (%s) - Dua the vao RC522!\n", sid.c_str());
          Serial.println("==========================================");
        }
      }
    }
  }
  http.end();
}

// Trả về HTTP code: 200 = thành công, 409 = phôi thẻ đã thuộc người khác, < 0 = lỗi mạng
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

// ===== LỆNH DEBUG QUA SERIAL =====
void handleSerialCommand() {
  if (!Serial.available()) return;

  String cmd = Serial.readStringUntil('\n');
  cmd.trim();

  if (cmd == "test") {
    openDoor();
  } else if (cmd.startsWith("g:")) {
    int angle = cmd.substring(2).toInt();
    Serial.printf("[CHINH GOC] Xoay den %d do...\n", angle);
    lcdShow("CHINH GOC SERVO", "Goc: " + String(angle) + " do");
    moveServoSmooth(angle);
    delay(1000);
    showDefaultScreen();
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
    lastWriteLcdMs   = 0;
    showWriteModeScreen();
    Serial.print("[CHE DO GHI THU CONG] Dat the len RC522 de nap ma: ");
    Serial.println(dataToWrite);
  } else if (cmd == "c") {
    isWriteMode      = false;
    isRemoteWrite    = false;
    pendingSessionId = "";
    Serial.println("[DA HUY] Quay ve che do kiem soat ra vao.");
    lcdShow("DA HUY GHI THE", "Quay ve mac dinh");
    delay(1200);
    showDefaultScreen();
  }
}

void setup() {
  Serial.begin(115200);

  // Khởi tạo LCD 1602 I2C (SDA=21, SCL=22)
  Wire.begin(I2C_SDA, I2C_SCL);
  lcd.init();
  lcd.backlight();
  lcdShow("HE THONG XOM TRO", "Dang khoi dong..");

  SPI.begin();
  rfid.PCD_Init();
  for (byte i = 0; i < 6; i++) key.keyByte[i] = 0xFF;

  doorServo.setPeriodHertz(50);
  doorServo.attach(SERVO_PIN, 600, 2400);
  doorServo.write(ANGLE_CLOSE);
  currentAngle = ANGLE_CLOSE;

  ensureWiFiConnected();

  Serial.println("\n=== HE THONG RFID + SERVO MG90S + LCD 1602 I2C ===");
  Serial.printf("MaKhu: %d | Server: %s\n", MA_KHU, SERVER_URL.c_str());
}

void loop() {
  ensureWiFiConnected();
  handleSerialCommand();

  // Cập nhật đếm ngược 60s trên LCD khi đang ở chế độ ghi thẻ
  if (isWriteMode) {
    if (millis() - writeModeStartMs > WRITE_TIMEOUT_MS) {
      isWriteMode      = false;
      isRemoteWrite    = false;
      pendingSessionId = "";
      Serial.println("[HET GIO] Da huy che do cho ghi the.");
      lcdShow("HET GIO GHI THE", "Quay ve mac dinh");
      delay(1800);
      showDefaultScreen();
    } else if (millis() - lastWriteLcdMs >= 1000) {
      lastWriteLcdMs = millis();
      showWriteModeScreen();
    }
  }

  // Định kỳ kiểm tra lệnh mới / lệnh hủy phiên từ Web
  if (millis() - lastPollMs >= POLL_INTERVAL_MS) {
    lastPollMs = millis();
    pollPendingWriteCommand();
  }

  if (!rfid.PICC_IsNewCardPresent() || !rfid.PICC_ReadCardSerial()) return;

  String uid = getCardUID();
  Serial.print("\nPhat hien the - UID: ");
  Serial.println(uid);

  if (isWriteMode) {
    lcdShow("DANG GHI THE...", "Giu nguyen the!");
    if (writeSecretToCard(dataToWrite)) {
      Serial.println(">>> [THANH CONG] Da nap ma bao mat vao the!");
      if (isRemoteWrite && pendingSessionId.length() > 0) {
        lcdShow("DANG DONG BO...", "Vui long cho!");
        int code = confirmWriteToServer(pendingSessionId, uid, dataToWrite);
        if (code == 200) {
          Serial.println(">>> [DONG BO] Da kich hoat the thanh cong tren Server!");
          lcdShow("GHI THE MOI", "THANH CONG!");
          isWriteMode      = false;
          isRemoteWrite    = false;
          pendingSessionId = "";
          delay(2200);
          showDefaultScreen();
        } else if (code == 409) {
          // Phôi thẻ đã thuộc người khác -> giữ nguyên phiên để đặt phôi thẻ khác
          Serial.println(">>> [TRUNG THE] Phoi the da duoc gan cho tai khoan khac!");
          lcdShow("THE DA DUOC DUNG", "Dung the khac!");
          delay(2200);
          showWriteModeScreen();
        } else {
          Serial.println(">>> [CANH BAO] Loi dong bo Server.");
          lcdShow("LOI DONG BO", "Thu lai sau!");
          isWriteMode      = false;
          isRemoteWrite    = false;
          pendingSessionId = "";
          delay(2200);
          showDefaultScreen();
        }
      } else {
        lcdShow("GHI THE MOI", "THANH CONG!");
        isWriteMode = false;
        delay(2200);
        showDefaultScreen();
      }
    } else {
      Serial.println(">>> [THAT BAI] Khong the ghi the, giu sat the vao RC522.");
      lcdShow("GHI THE THAT BAI", "Dat sat the lai!");
      delay(1800);
      showWriteModeScreen();
    }
  } else {
    // Báo ngay trạng thái chờ xác nhận khi vừa quẹt thẻ
    lcdShow("DANG CHO", "XAC NHAN...");

    String cardSecret = "";
    if (readSecretFromCard(cardSecret)) {
      int verifyRes = verifyCardWithServer(uid, cardSecret);
      if (verifyRes == 1) {
        openDoor();
      } else if (verifyRes == 0) {
        lcdShow("KHONG THANH CONG", "Moi quet lai!");
        delay(2500);
        showDefaultScreen();
      } else {
        lcdShow("LOI KET NOI", "Thu quet lai!");
        delay(2500);
        showDefaultScreen();
      }
    } else {
      Serial.println(">>> [TU CHOI] Khong doc duoc ma bao mat tren the!");
      lcdShow("KHONG THANH CONG", "Moi quet lai!");
      delay(2500);
      showDefaultScreen();
    }
  }

  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();
  delay(500);
}