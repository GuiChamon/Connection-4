#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <cstring>

// ======================== CONFIGURAÇÕES ========================
const char* WIFI_SSID = "iPhone de Marquinho";           // Sua rede WiFi
const char* WIFI_PASSWORD = "marco12345";  // Senha WiFi

// Servidor Backend Connection-4
const char* SERVER_URL = "http://172.20.10.3:3000";  // Ajustar IP do servidor
  // Ajustar IP do servidor
const char* DEVICE_ID = "esp32_alerta_01";     // ID utilizado em /api/auth/device-login

// Pinos de saída
#define BUZZER_PIN 18
#define VIBRA_PIN  33
#define LED_PIN    27

// Tempos e padrões
const unsigned long POLL_INTERVAL_MS = 5000;      // 5s entre consultas ao backend
const unsigned long ALERT_DURATION_MS = 8000;     // tempo total do alerta
const unsigned long LED_BLINK_INTERVAL_MS = 180;  // piscar LED a cada 180ms
const unsigned long BUZZER_PULSE_INTERVAL_MS = 140; // alternar buzzer a cada 140ms

// ======================== ESTADO GLOBAL ========================
WiFiClient wifiClient;
String authToken = "";
unsigned long lastPoll = 0;
bool firstSyncDone = false;

struct AlertEffect {
  bool active = false;
  unsigned long startedAt = 0;
  unsigned long lastLedToggle = 0;
  unsigned long lastBuzzerToggle = 0;
  bool ledOn = false;
  bool buzzerOn = false;
  String sourceId = "";
} alert;

// ======================== FUNÇÕES AUXILIARES ========================
void logMessage(const String& msg) {
  Serial.println(msg);
}

void connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  logMessage("📡 Conectando ao WiFi...");

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 40) {
    delay(500);
    Serial.print('.');
    attempts++;
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    logMessage("✅ WiFi conectado: " + WiFi.localIP().toString());
  } else {
    logMessage("❌ Não foi possível conectar ao WiFi. Verifique SSID/senha.");
  }
}

bool ensureWiFi() {
  if (WiFi.status() == WL_CONNECTED) return true;
  connectWiFi();
  return WiFi.status() == WL_CONNECTED;
}

bool loginDevice() {
  if (!ensureWiFi()) return false;

  HTTPClient http;
  String url = String(SERVER_URL) + "/api/auth/device-login";
  logMessage("🔐 Autenticando dispositivo em " + url);

  if (!http.begin(wifiClient, url)) {
    logMessage("❌ Falha ao iniciar HTTPClient para login");
    return false;
  }

  http.addHeader("Content-Type", "application/json");
  StaticJsonDocument<256> doc;
  doc["deviceId"] = DEVICE_ID;
  doc["deviceSecret"] = String("device_secret_") + DEVICE_ID;

  String payload;
  serializeJson(doc, payload);

  int httpCode = http.POST(payload);
  if (httpCode == 200) {
    String response = http.getString();
    StaticJsonDocument<512> resp;
    auto err = deserializeJson(resp, response);
    if (!err && resp["success"].as<bool>()) {
      authToken = resp["token"].as<String>();
      logMessage("✅ Token recebido com sucesso");
      http.end();
      return true;
    }
    logMessage("⚠️ Resposta inesperada no login: " + response);
  } else {
    logMessage("❌ Login falhou. HTTP " + String(httpCode));
    if (httpCode > 0) {
      logMessage(http.getString());
    }
  }
  http.end();
  authToken = "";
  return false;
}

bool ensureAuthToken() {
  if (authToken.length() > 0) return true;
  return loginDevice();
}

void startAlertEffect(const String& notificationId, const String& workerName, const String& message) {
  alert.active = true;
  alert.startedAt = millis();
  alert.lastLedToggle = alert.startedAt;
  alert.lastBuzzerToggle = alert.startedAt;
  alert.ledOn = false;
  alert.buzzerOn = true;
  alert.sourceId = notificationId;

  digitalWrite(VIBRA_PIN, HIGH);
  digitalWrite(BUZZER_PIN, HIGH);
  digitalWrite(LED_PIN, HIGH);
  alert.ledOn = true;

  logMessage("🚨 ALERTA ATIVADO para " + workerName + " -> " + message);
}

void stopAlertEffect() {
  alert.active = false;
  alert.sourceId = "";
  digitalWrite(VIBRA_PIN, LOW);
  digitalWrite(BUZZER_PIN, LOW);
  digitalWrite(LED_PIN, LOW);
  alert.ledOn = false;
  alert.buzzerOn = false;
}

void updateAlertEffect() {
  if (!alert.active) return;
  unsigned long now = millis();

  if (now - alert.startedAt >= ALERT_DURATION_MS) {
    stopAlertEffect();
    logMessage("ℹ️ Alerta encerrado automaticamente");
    return;
  }

  if (now - alert.lastLedToggle >= LED_BLINK_INTERVAL_MS) {
    alert.ledOn = !alert.ledOn;
    digitalWrite(LED_PIN, alert.ledOn ? HIGH : LOW);
    alert.lastLedToggle = now;
  }

  if (now - alert.lastBuzzerToggle >= BUZZER_PULSE_INTERVAL_MS) {
    alert.buzzerOn = !alert.buzzerOn;
    digitalWrite(BUZZER_PIN, alert.buzzerOn ? HIGH : LOW);
    digitalWrite(VIBRA_PIN, alert.buzzerOn ? HIGH : LOW);
    alert.lastBuzzerToggle = now;
  }
}

bool markNotificationRead(const String& notificationId) {
  if (!ensureAuthToken()) return false;

  HTTPClient http;
  String url = String(SERVER_URL) + "/api/notifications/" + notificationId + "/read";
  if (!http.begin(wifiClient, url)) {
    logMessage("❌ Falha ao iniciar HTTPClient para PATCH");
    return false;
  }
  http.addHeader("Authorization", "Bearer " + authToken);
  http.addHeader("Content-Type", "application/json");

  int httpCode = http.sendRequest("PATCH", "{}");
  if (httpCode == 200) {
    logMessage("📬 Notificação " + notificationId + " marcada como lida");
    http.end();
    return true;
  }

  if (httpCode == 401) {
    logMessage("⚠️ Token inválido ao marcar notificação. Renovando token...");
    authToken = "";
  } else if (httpCode > 0) {
    logMessage("⚠️ Falha ao marcar notificação (HTTP " + String(httpCode) + ")");
    logMessage(http.getString());
  }
  http.end();
  return false;
}

void handleNotification(JsonObject notification) {
  String id = notification["_id"].as<String>();
  String worker = notification["workerName"].as<String>();
  String message = notification["message"].as<String>();
  const char* accessStatus = notification["metadata"]["accessStatus"] | "";
  if (strlen(accessStatus) > 0 && String(accessStatus) != "denied") {
    logMessage("ℹ️ Notificação " + id + " ignorada (status=" + String(accessStatus) + ")");
    markNotificationRead(id);
    return;
  }
  if (worker.length() == 0) worker = notification["metadata"]["cardUid"].as<String>();
  if (worker.length() == 0) worker = "Colaborador não identificado";

  startAlertEffect(id, worker, message);
  markNotificationRead(id);
}

void fetchNotifications() {
  if (!ensureAuthToken()) return;
  if (!ensureWiFi()) return;

  HTTPClient http;
  String url = String(SERVER_URL) + "/api/notifications?severity=CRITICAL&type=UNAUTHORIZED_ACCESS&read=false&limit=5";
  if (!http.begin(wifiClient, url)) {
    logMessage("❌ Falha ao iniciar HTTPClient para notificações");
    return;
  }

  http.addHeader("Authorization", "Bearer " + authToken);
  int httpCode = http.GET();
  if (httpCode == 401) {
    logMessage("⚠️ Token expirado/inválido. Renovando...");
    authToken = "";
    http.end();
    loginDevice();
    return;
  }

  if (httpCode != 200) {
    logMessage("⚠️ Erro ao consultar notificações. HTTP " + String(httpCode));
    if (httpCode > 0) logMessage(http.getString());
    http.end();
    return;
  }

  String body = http.getString();
  http.end();

  StaticJsonDocument<4096> doc;
  auto err = deserializeJson(doc, body);
  if (err) {
    logMessage("❌ Erro ao parsear notificações: " + String(err.c_str()));
    return;
  }

  JsonArray notifications = doc["data"].as<JsonArray>();
  if (notifications.isNull() || notifications.size() == 0) {
    if (!firstSyncDone) {
      logMessage("ℹ️ Nenhuma notificação pendente no backend.");
      firstSyncDone = true;
    }
    return;
  }

  // Processar da mais antiga para a mais recente para manter ordem cronológica
  for (int i = notifications.size() - 1; i >= 0; --i) {
    JsonObject notif = notifications[i];
    handleNotification(notif);
  }

  firstSyncDone = true;
}

void handleSerialCommands() {
  if (!Serial.available()) return;
  int cmd = Serial.read();
  if (cmd == '1') {
    startAlertEffect("serial-test", "Teste Manual", "Comando via Serial");
  } else if (cmd == '0') {
    stopAlertEffect();
    logMessage("🛑 Alerta cancelado manualmente");
  }
}

// ======================== SETUP / LOOP ========================
void setup() {
  Serial.begin(115200);
  delay(100);

  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(VIBRA_PIN, OUTPUT);
  pinMode(LED_PIN, OUTPUT);
  stopAlertEffect();

  logMessage("========================================");
  logMessage(" ESP32 RISK ALERT - Connection-4");
  logMessage("========================================");

  connectWiFi();
  loginDevice();
}

void loop() {
  handleSerialCommands();
  updateAlertEffect();

  unsigned long now = millis();
  if (now - lastPoll >= POLL_INTERVAL_MS) {
    fetchNotifications();
    lastPoll = now;
  }

  delay(10);  // Pequeno respiro para o watchdog
}
