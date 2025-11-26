/*
 * ESP8266 RFID Gateway - Connection-4
 * Versão Integrada com Backend MongoDB
 * 
 * Hardware:
 * - NodeMCU ESP8266
 * - Módulo RFID RC522
 * - Sensor Ultrassônico HC-SR04
 * - LED para feedback
 * - Botão para configuração
 */

#include <SPI.h>
#include <MFRC522.h>
#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>
#include <ArduinoJson.h>
#include <math.h>

#ifndef DEG_TO_RAD
#define DEG_TO_RAD 0.01745329251f
#endif

// ========== CONFIGURAÇÕES DE REDE ==========
const char* WIFI_SSID = "casa 2";           // Sua rede WiFi
const char* WIFI_PASSWORD = "a1b2c3d4e5";  // Senha WiFi

// Servidor Backend Connection-4
const char* SERVER_URL = "http://192.168.0.102:3000";  // Ajustar IP do servidor
String AUTH_TOKEN = "";  // Token JWT será obtido no login

// ========== CONFIGURAÇÃO DAS ÁREAS ==========
// Estrutura para diferentes áreas
struct Area {
  const char* id;
  const char* name;
  float x;
  float y;
  bool isRiskZone;
  int requiredAccessLevel;
};

// Definir 3 áreas: Portaria, Área Risco 1, Área Risco 2
Area areas[3] = {
  {"entrada", "Portaria Principal", 0.08, 0.10, false, 1},
  {"risco1", "Area de Risco 1", 0.50, 0.30, true, 2},
  {"risco2", "Area de Risco 2", 0.80, 0.70, true, 3}
};

// Área ativa atual (começa na Portaria)
int currentAreaIndex = 0;

struct AreaBackendState {
  bool hasCenter = false;
  bool hasSensorOffset = false;
  bool hasScale = false;
  bool hasAreaSize = false;
  float centerX = 0.5f;
  float centerY = 0.5f;
  float areaWidth = 0.0f;
  float areaHeight = 0.0f;
  float sensorOffsetX = 0.0f;
  float sensorOffsetY = 0.0f;
  float orientationDeg = 0.0f;
  float scaleCmPerUnit = 100.0f;
  unsigned long lastFetch = 0;
  String zoneId = "";
  String zoneName = "";
  String measurementUnit = "normalized";
};

AreaBackendState backendAreaState;

void resetBackendAreaState() {
  backendAreaState.hasCenter = false;
  backendAreaState.hasSensorOffset = false;
  backendAreaState.hasScale = false;
  backendAreaState.hasAreaSize = false;
  backendAreaState.centerX = areas[currentAreaIndex].x;
  backendAreaState.centerY = areas[currentAreaIndex].y;
  backendAreaState.areaWidth = 0.0f;
  backendAreaState.areaHeight = 0.0f;
  backendAreaState.sensorOffsetX = 0.0f;
  backendAreaState.sensorOffsetY = 0.0f;
  backendAreaState.orientationDeg = 0.0f;
  backendAreaState.scaleCmPerUnit = 100.0f;
  backendAreaState.zoneId = "";
  backendAreaState.zoneName = "";
  backendAreaState.measurementUnit = "normalized";
  backendAreaState.lastFetch = millis();
}

float getActiveAreaCenterX() {
  return backendAreaState.hasCenter ? backendAreaState.centerX : areas[currentAreaIndex].x;
}

float getActiveAreaCenterY() {
  return backendAreaState.hasCenter ? backendAreaState.centerY : areas[currentAreaIndex].y;
}

const char* getCurrentAreaId() { return areas[currentAreaIndex].id; }
const char* getCurrentAreaName() {
  if (backendAreaState.zoneName.length() > 0) {
    return backendAreaState.zoneName.c_str();
  }
  return areas[currentAreaIndex].name;
}
float getCurrentAreaX() { return getActiveAreaCenterX(); }
float getCurrentAreaY() { return getActiveAreaCenterY(); }
bool isCurrentAreaRisk() { return areas[currentAreaIndex].isRiskZone; }
int getCurrentAreaRequiredAccessLevel() { return areas[currentAreaIndex].requiredAccessLevel; }

String getActiveAreaIdForPayload() {
  if (backendAreaState.zoneId.length() > 0) return backendAreaState.zoneId;
  return String(getCurrentAreaId());
}

String getActiveAreaNameForPayload() {
  if (backendAreaState.zoneName.length() > 0) return backendAreaState.zoneName;
  return String(getCurrentAreaName());
}

bool fetchAreaMetadataFromBackend();
bool estimatePositionFromDistance(float distanceCm, float &estimatedX, float &estimatedY);

bool isAccessAllowedForCurrentArea(int accessLevel) {
  return accessLevel >= getCurrentAreaRequiredAccessLevel();
}

// ========== PINAGEM ==========
#define SS_PIN 15           // D8
#define RST_PIN 16          // D0
#define LED_PIN 5           // D1 - LED de feedback
#define TRIG_PIN 2          // D4 - HC-SR04 TRIG
#define ECHO_PIN 4          // D2 - HC-SR04 ECHO
#define BTN_PIN 0           // D3 - Botão configuração

MFRC522 mfrc522(SS_PIN, RST_PIN);
WiFiClient wifiClient;

bool fetchAreaMetadataFromBackend() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("⚠️ Não é possível buscar metadados da área: WiFi desconectado");
    return false;
  }
  if (AUTH_TOKEN == "") {
    Serial.println("⚠️ Token ausente - faça login antes de buscar metadados de área");
    return false;
  }

  String deviceId = String(getCurrentAreaId());
  String url = String(SERVER_URL) + "/api/zones/device/" + deviceId;
  HTTPClient http;
  http.setTimeout(10000);

  Serial.println("🌐 Sincronizando metadados da área via " + url);

  if (!http.begin(wifiClient, url)) {
    Serial.println("❌ Falha ao iniciar requisição de metadados da área");
    return false;
  }

  http.addHeader("Authorization", "Bearer " + AUTH_TOKEN);
  int httpCode = http.GET();

  if (httpCode != 200) {
    Serial.println("❌ Erro ao buscar metadados (HTTP " + String(httpCode) + ")");
    if (httpCode > 0) {
      Serial.println("📥 " + http.getString());
    }
    http.end();
    return false;
  }

  String response = http.getString();
  http.end();

  StaticJsonDocument<1536> doc;
  DeserializationError error = deserializeJson(doc, response);
  if (error) {
    Serial.println("❌ Erro ao parsear metadados da área: " + String(error.c_str()));
    return false;
  }

  if (!doc["success"].as<bool>()) {
    Serial.println("⚠️ Resposta sem sucesso ao buscar metadados da área");
    return false;
  }

  JsonObject data = doc["data"];
  if (data.isNull()) {
    Serial.println("⚠️ Payload de metadados vazio");
    return false;
  }

  backendAreaState.zoneId = data["id"].as<String>();
  backendAreaState.zoneName = data["name"].as<String>();

  float fallbackX = data["x"].isNull() ? getActiveAreaCenterX() : data["x"].as<float>();
  float fallbackY = data["y"].isNull() ? getActiveAreaCenterY() : data["y"].as<float>();
  float fallbackWidth = data["width"].isNull() ? 0.0f : data["width"].as<float>();
  float fallbackHeight = data["height"].isNull() ? 0.0f : data["height"].as<float>();

  JsonObject computedCenter = data["computedCenter"];
  if (!computedCenter.isNull()) {
    backendAreaState.centerX = computedCenter["x"].as<float>();
    backendAreaState.centerY = computedCenter["y"].as<float>();
    backendAreaState.hasCenter = true;
  } else if (!data["centerX"].isNull() && !data["centerY"].isNull()) {
    backendAreaState.centerX = data["centerX"].as<float>();
    backendAreaState.centerY = data["centerY"].as<float>();
    backendAreaState.hasCenter = true;
  } else {
    backendAreaState.centerX = fallbackX + (fallbackWidth / 2.0f);
    backendAreaState.centerY = fallbackY + (fallbackHeight / 2.0f);
    backendAreaState.hasCenter = true;
  }

  // Ler largura/altura da área (se fornecido) para permitir clamp interno
  float areaW = data["width"].isNull() ? fallbackWidth : data["width"].as<float>();
  float areaH = data["height"].isNull() ? fallbackHeight : data["height"].as<float>();
  if (areaW > 0.0f && areaH > 0.0f) {
    backendAreaState.areaWidth = areaW;
    backendAreaState.areaHeight = areaH;
    backendAreaState.hasAreaSize = true;
  } else {
    backendAreaState.areaWidth = 0.0f;
    backendAreaState.areaHeight = 0.0f;
    backendAreaState.hasAreaSize = false;
  }

  JsonObject sensorConfig = data["sensorConfig"];
  if (!sensorConfig.isNull()) {
    backendAreaState.orientationDeg = sensorConfig["orientationDeg"].isNull() ? 0.0f : sensorConfig["orientationDeg"].as<float>();
    backendAreaState.scaleCmPerUnit = sensorConfig["scaleCmPerUnit"].isNull() ? backendAreaState.scaleCmPerUnit : sensorConfig["scaleCmPerUnit"].as<float>();
    backendAreaState.measurementUnit = sensorConfig["measurementUnit"].isNull() ? backendAreaState.measurementUnit : sensorConfig["measurementUnit"].as<String>();

    JsonObject offset = sensorConfig["offset"];
    if (!offset.isNull()) {
      backendAreaState.sensorOffsetX = offset["x"].isNull() ? 0.0f : offset["x"].as<float>();
      backendAreaState.sensorOffsetY = offset["y"].isNull() ? 0.0f : offset["y"].as<float>();
      backendAreaState.hasSensorOffset = true;
    } else {
      backendAreaState.sensorOffsetX = 0.0f;
      backendAreaState.sensorOffsetY = 0.0f;
      backendAreaState.hasSensorOffset = false;
    }

    backendAreaState.hasScale = backendAreaState.scaleCmPerUnit > 0.0f;
  }

  backendAreaState.lastFetch = millis();
  Serial.println("✅ Metadados de área sincronizados: centro(" + String(backendAreaState.centerX, 4) + ", " + String(backendAreaState.centerY, 4) + ")");
  Serial.println("   Offset sensor: (" + String(backendAreaState.sensorOffsetX, 4) + ", " + String(backendAreaState.sensorOffsetY, 4) + ")  Escala: " + String(backendAreaState.scaleCmPerUnit, 2) + " cm/unidade");
  Serial.println("   Orientação: " + String(backendAreaState.orientationDeg, 2) + "°  Unidade: " + backendAreaState.measurementUnit);
  return true;
}

bool estimatePositionFromDistance(float distanceCm, float &estimatedX, float &estimatedY) {
  if (distanceCm <= 0) {
    return false;
  }

  float scale = backendAreaState.scaleCmPerUnit > 0.0f ? backendAreaState.scaleCmPerUnit : 100.0f;
  float distanceUnits = distanceCm / scale;
  float thetaRad = backendAreaState.orientationDeg * DEG_TO_RAD;
  float sensorX = getActiveAreaCenterX() + backendAreaState.sensorOffsetX;
  float sensorY = getActiveAreaCenterY() + backendAreaState.sensorOffsetY;
  float candidateX = sensorX + cos(thetaRad) * distanceUnits;
  float candidateY = sensorY + sin(thetaRad) * distanceUnits;
  // Se tivermos dimensão da área, forçar o resultado para DENTRO dos limites da área
  if (backendAreaState.hasAreaSize) {
    float halfW = backendAreaState.areaWidth / 2.0f;
    float halfH = backendAreaState.areaHeight / 2.0f;
    float minX = backendAreaState.centerX - halfW;
    float maxX = backendAreaState.centerX + halfW;
    float minY = backendAreaState.centerY - halfH;
    float maxY = backendAreaState.centerY + halfH;

    // Garantir limites entre 0 e 1
    if (minX < 0.0f) minX = 0.0f;
    if (minY < 0.0f) minY = 0.0f;
    if (maxX > 1.0f) maxX = 1.0f;
    if (maxY > 1.0f) maxY = 1.0f;

    // Clampeamos o candidato para dentro da área
    estimatedX = constrain(candidateX, minX, maxX);
    estimatedY = constrain(candidateY, minY, maxY);
  } else {
    // Fallback para clamp global
    estimatedX = constrain(candidateX, 0.0f, 1.0f);
    estimatedY = constrain(candidateY, 0.0f, 1.0f);
  }
  return true;
}

// ========== VARIÁVEIS DE CONTROLE ==========
unsigned long lastHeartbeat = 0;
const unsigned long HEARTBEAT_INTERVAL = 5000;  // 30 segundos

unsigned long lastUltrasonicCheck = 0;
const unsigned long ULTRASONIC_DEBOUNCE = 3000;  // 3 segundos

byte lastCardUID[4] = {0, 0, 0, 0};
bool lastCardValid = false;
String lastCardUIDStr = "";
String lastPersonName = "";
long lastDistanceReading = -1;
unsigned long lastCardValidationTime = 0;
const unsigned long CARD_VALIDITY_WINDOW = 15000; // 15 segundos
bool lastCardAuthorized = false;

// Controle de presença por ultrassom (consolidação de alertas)
bool riskPresenceActive = false;
unsigned long riskPresenceStart = 0;
unsigned long riskPresenceLastSeen = 0;
unsigned long riskPresenceLastSummary = 0;
String riskPresenceCardUid = "";
String riskPresencePersonName = "";
bool riskPresenceUnauthorized = false;
const unsigned long RISK_PRESENCE_CLEAR_DELAY = 7000; // 7s sem detecção encerra sessão
const unsigned long RISK_PRESENCE_SUMMARY_INTERVAL = 60000; // 60s entre notificações

// Controle de botão
unsigned long btnPressStart = 0;
bool btnPressed = false;
bool configMode = false;

// Thresholds de interação
const unsigned long SHORT_PRESS_THRESHOLD = 1000;   // <1s
const unsigned long MEDIUM_PRESS_THRESHOLD = 3000;  // 1-3s
const unsigned long DISCONNECT_PRESS_THRESHOLD = 7000; // >7s mantém disconnect gracioso
const unsigned long MODE_TIMEOUT = 10000; // 10 segundos para concluir modos especiais

// Sensor de risco (ultrassônico) - alcance de 1 metro (100 cm)
const unsigned int RISK_DISTANCE_CM = 100;

// Estados para modos especiais
bool changeLevelModeActive = false;
unsigned long changeLevelModeStarted = 0;

// Janela de ativação do ultrassônico apenas para o cartão que gerou a notificação
const unsigned long ULTRASONIC_ACTIVE_WINDOW = 15000; // 15 segundos
String ultrasonicSessionUid = "";
String ultrasonicSessionPersonName = "";
unsigned long ultrasonicSessionExpires = 0;
bool ultrasonicSessionUnauthorized = false;

// ========== FUNÇÕES LED ==========
void ledAccessGranted() {
  for(int i=0; i<2; i++) {
    digitalWrite(LED_PIN, HIGH);
    delay(250);
    digitalWrite(LED_PIN, LOW);
    delay(150);
  }
}

void ledAccessDenied() {
  for(int i=0; i<3; i++) {
    digitalWrite(LED_PIN, HIGH);
    delay(150);
    digitalWrite(LED_PIN, LOW);
    delay(150);
  }
  delay(200);
}

void ledRegistrationMode() {
  digitalWrite(LED_PIN, HIGH);
  delay(600);
  digitalWrite(LED_PIN, LOW);
  delay(300);
}

void ledLevelChangeMode() {
  for(int i=0; i<2; i++) {
    digitalWrite(LED_PIN, HIGH);
    delay(120);
    digitalWrite(LED_PIN, LOW);
    delay(120);
  }
}

void ledAreaSwitch() {
  for(int i=0; i<2; i++) {
    digitalWrite(LED_PIN, HIGH);
    delay(90);
    digitalWrite(LED_PIN, LOW);
    delay(90);
  }
  delay(120);
}

// ========== SENSOR ULTRASSÔNICO ==========
long readDistance() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  
  long duration = pulseIn(ECHO_PIN, HIGH, 30000);  // Timeout 30ms
  if (duration == 0) return -1;
  
  long distance = duration * 0.034 / 2;
  return distance;
}

// ========== FORMATAÇÃO UID ==========
String formatUID(byte *uid) {
  String s = "";
  for (byte i = 0; i < 4; i++) {
    if (i > 0) s += " ";
    if (uid[i] < 0x10) s += "0";
    s += String(uid[i], HEX);
  }
  s.toUpperCase();
  return s;
}

String urlEncode(const String& value) {
  String encoded = "";
  char hexBuffer[4];
  for (unsigned int i = 0; i < value.length(); i++) {
    char c = value.charAt(i);
    if ((c >= '0' && c <= '9') || (c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') || c == '-' || c == '_' || c == '.' || c == '~') {
      encoded += c;
    } else if (c == ' ') {
      encoded += "%20";
    } else {
      sprintf(hexBuffer, "%%%02X", static_cast<unsigned char>(c));
      encoded += hexBuffer;
    }
  }
  return encoded;
}

void copyUID(byte *dest, byte *src) {
  for (byte i = 0; i < 4; i++) {
    dest[i] = src[i];
  }
}

bool compareUID(byte *uid1, byte *uid2) {
  for (byte i = 0; i < 4; i++) {
    if (uid1[i] != uid2[i]) return false;
  }
  return true;
}

bool hasRecentValidCard() {
  if (!lastCardValid || lastCardValidationTime == 0) {
    return false;
  }
  return (millis() - lastCardValidationTime) <= CARD_VALIDITY_WINDOW;
}

// ========== AUTENTICAÇÃO ==========
bool loginDevice() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ WiFi não conectado!");
    return false;
  }
  
  String url = String(SERVER_URL) + "/api/auth/device-login";
  Serial.println("🔐 Tentando login em: " + url);
  Serial.println("📡 Device ID: " + String(getCurrentAreaId()));
  
  HTTPClient http;
  http.setTimeout(10000);  // Timeout de 10 segundos
  
  if (!http.begin(wifiClient, url)) {
    Serial.println("❌ Falha ao iniciar HTTP Client");
    return false;
  }
  
  http.addHeader("Content-Type", "application/json");
  
  // Criar JSON de login
  StaticJsonDocument<200> doc;
  doc["deviceId"] = getCurrentAreaId();
  doc["deviceSecret"] = "device_secret_" + String(getCurrentAreaId());
  
  String jsonString;
  serializeJson(doc, jsonString);
  Serial.println("📤 Enviando: " + jsonString);
  
  int httpCode = http.POST(jsonString);
  Serial.println("📥 HTTP Code: " + String(httpCode));
  
  if (httpCode == 200) {
    String response = http.getString();
    Serial.println("📥 Response: " + response);
    
    StaticJsonDocument<512> responseDoc;
    DeserializationError error = deserializeJson(responseDoc, response);
    
    if (error) {
      Serial.println("❌ Erro ao parsear JSON: " + String(error.c_str()));
      http.end();
      return false;
    }
    
    if (responseDoc["success"] == true) {
      AUTH_TOKEN = responseDoc["token"].as<String>();
      Serial.println("✅ Login realizado com sucesso!");
      Serial.println("Token: " + AUTH_TOKEN.substring(0, 20) + "...");
      http.end();
      return true;
    }
  } else if (httpCode == -1) {
    Serial.println("❌ Erro de conexão! Verifique:");
    Serial.println("   - IP do servidor: " + String(SERVER_URL));
    Serial.println("   - Backend rodando na porta 3000?");
    Serial.println("   - Firewall bloqueando conexões?");
    Serial.println("   - ESP e servidor na mesma rede?");
  } else if (httpCode > 0) {
    String response = http.getString();
    Serial.println("📥 Response: " + response);
  }
  
  Serial.println("❌ Falha no login. Code: " + String(httpCode));
  http.end();
  return false;
}

// ========== REGISTRO DE DISPOSITIVO ==========
bool registerDevice() {
  if (WiFi.status() != WL_CONNECTED) return false;
  
  HTTPClient http;
  http.begin(wifiClient, String(SERVER_URL) + "/api/devices");
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", "Bearer " + AUTH_TOKEN);
  
  StaticJsonDocument<200> doc;
  doc["id"] = getCurrentAreaId();
  doc["type"] = "sensor";
  doc["active"] = true;
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  int httpCode = http.POST(jsonString);
  
  if (httpCode == 200 || httpCode == 201) {
    Serial.println("✅ Dispositivo registrado!");
    http.end();
    return true;
  }
  
  Serial.println("⚠️ Device já existe ou erro: " + String(httpCode));
  http.end();
  return false;
}

// ========== ENVIO DE POSIÇÃO ==========
bool sendPosition(
  const String& deviceId,
  bool inRiskZone,
  bool alertGenerated,
  float measuredDistanceCm = -1.0f,
  bool hasEstimate = false,
  float estimatedX = 0.0f,
  float estimatedY = 0.0f,
  const char* source = "rfid"
) {
  if (WiFi.status() != WL_CONNECTED || AUTH_TOKEN == "") return false;
  
  HTTPClient http;
  http.begin(wifiClient, String(SERVER_URL) + "/api/positions");
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", "Bearer " + AUTH_TOKEN);
  
  StaticJsonDocument<600> doc;
  float baseX = getActiveAreaCenterX();
  float baseY = getActiveAreaCenterY();
  float payloadX = hasEstimate ? estimatedX : baseX;
  float payloadY = hasEstimate ? estimatedY : baseY;
  if (payloadX < 0) payloadX = 0;
  if (payloadY < 0) payloadY = 0;
  if (payloadX > 1) payloadX = 1;
  if (payloadY > 1) payloadY = 1;
  if (!source) source = "unknown";
  doc["deviceId"] = deviceId;
  doc["x"] = payloadX;
  doc["y"] = payloadY;
  doc["estimatedX"] = hasEstimate ? payloadX : baseX;
  doc["estimatedY"] = hasEstimate ? payloadY : baseY;
  doc["areaId"] = getActiveAreaIdForPayload();
  doc["areaName"] = getActiveAreaNameForPayload();
  doc["inRiskZone"] = inRiskZone;
  doc["alertGenerated"] = alertGenerated;
  doc["source"] = source;
  doc["deviceTimestamp"] = millis();
  if (measuredDistanceCm >= 0) {
    doc["distanceCm"] = measuredDistanceCm;
  }
  JsonObject areaCenter = doc.createNestedObject("areaCenter");
  areaCenter["x"] = baseX;
  areaCenter["y"] = baseY;
  JsonObject areaMetadata = doc.createNestedObject("areaMetadata");
  areaMetadata["measurementUnit"] = backendAreaState.measurementUnit;
  areaMetadata["orientationDeg"] = backendAreaState.orientationDeg;
  areaMetadata["scaleCmPerUnit"] = backendAreaState.scaleCmPerUnit;
  areaMetadata["sensorOffsetX"] = backendAreaState.sensorOffsetX;
  areaMetadata["sensorOffsetY"] = backendAreaState.sensorOffsetY;
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  int httpCode = http.POST(jsonString);
  
  if (httpCode == 200 || httpCode == 201) {
    Serial.println("📍 Posição enviada: " + deviceId + " em " + String(getCurrentAreaName()));
    http.end();
    return true;
  }
  
  Serial.println("❌ Erro ao enviar posição. Code: " + String(httpCode));
  if (httpCode > 0) {
    String response = http.getString();
    Serial.println("📥 Response: " + response);
  }
  http.end();
  return false;
}

bool logRiskZoneEntry(const String& cardUid, long distanceCm, const String& personName) {
  if (WiFi.status() != WL_CONNECTED || AUTH_TOKEN == "") return false;

  HTTPClient http;
  http.begin(wifiClient, String(SERVER_URL) + "/api/notifications");
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", "Bearer " + AUTH_TOKEN);

  StaticJsonDocument<512> doc;
  doc["type"] = "UNAUTHORIZED_ACCESS";
  doc["severity"] = "CRITICAL";
  doc["title"] = "Acesso não autorizado em zona de risco";
  doc["message"] = String("ACESSO NEGADO: Cartão ") + cardUid + " detectado a " + distanceCm + "cm (<=1m).";
  doc["deviceId"] = getCurrentAreaId();
  doc["areaId"] = getActiveAreaIdForPayload();
  doc["areaName"] = getActiveAreaNameForPayload();
  doc["workerName"] = personName;
  
  JsonObject position = doc.createNestedObject("position");
  position["x"] = getCurrentAreaX();
  position["y"] = getCurrentAreaY();

  JsonObject metadata = doc.createNestedObject("metadata");
  metadata["cardUid"] = cardUid;
  metadata["distanceCm"] = distanceCm;
  metadata["sensor"] = "HC-SR04";
  metadata["accessStatus"] = "denied";
  metadata["requiredLevel"] = getCurrentAreaRequiredAccessLevel();

  String payload;
  serializeJson(doc, payload);
  int httpCode = http.POST(payload);
  if (httpCode == 201 || httpCode == 200) {
    http.end();
    return true;
  }

  if (httpCode > 0) {
    Serial.println("❌ Falha ao registrar notificação de risco: " + String(httpCode));
    Serial.println("📥 " + http.getString());
  }
  http.end();
  return false;
}

String formatDuration(unsigned long durationMs) {
  unsigned long totalSeconds = durationMs / 1000;
  unsigned long minutes = totalSeconds / 60;
  unsigned long seconds = totalSeconds % 60;
  char buffer[16];
  if (minutes > 0) {
    sprintf(buffer, "%lu:%02lu", minutes, seconds);
  } else {
    sprintf(buffer, "0:%02lu", seconds);
  }
  return String(buffer);
}

bool logRiskZonePresenceSummary(const String& cardUid, unsigned long durationMs, const String& personName, bool sessionEnded) {
  if (WiFi.status() != WL_CONNECTED || AUTH_TOKEN == "") return false;

  HTTPClient http;
  http.begin(wifiClient, String(SERVER_URL) + "/api/notifications");
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", "Bearer " + AUTH_TOKEN);

  String durationLabel = formatDuration(durationMs);

  StaticJsonDocument<512> doc;
  // O modelo Notification valida 'type' dentro do enum. Usar 'INFO' para updates/saídas.
  doc["type"] = "INFO";
  doc["severity"] = sessionEnded ? "MEDIUM" : "LOW";
  doc["title"] = sessionEnded ? "Saída de zona de risco" : "Permanência em zona de risco";
  doc["message"] = String("Cartão ") + cardUid + (sessionEnded ? " deixou a zona de risco" : " permanece em zona de risco") +
                    String(" por ") + durationLabel + ".";
  doc["deviceId"] = getCurrentAreaId();
  doc["areaId"] = getActiveAreaIdForPayload();
  doc["areaName"] = getActiveAreaNameForPayload();
  doc["workerName"] = personName;

  JsonObject metadata = doc.createNestedObject("metadata");
  metadata["cardUid"] = cardUid;
  metadata["durationMs"] = durationMs;
  metadata["formattedDuration"] = durationLabel;
  metadata["sessionEnded"] = sessionEnded;

  String payload;
  serializeJson(doc, payload);
  int httpCode = http.POST(payload);
  if (httpCode == 201 || httpCode == 200) {
    http.end();
    return true;
  }

  if (httpCode > 0) {
    Serial.println("❌ Falha ao registrar resumo de permanência: " + String(httpCode));
    Serial.println("📥 " + http.getString());
  }
  http.end();
  return false;
}

void closeRiskPresenceSession(bool forceNow) {
  if (!riskPresenceActive) return;
  unsigned long inactiveTime = millis() - riskPresenceLastSeen;
  if (!forceNow && inactiveTime < RISK_PRESENCE_CLEAR_DELAY) return;

  unsigned long duration = millis() - riskPresenceStart;
  if (riskPresenceUnauthorized) {
    logRiskZonePresenceSummary(riskPresenceCardUid, duration, riskPresencePersonName, true);
  }

  riskPresenceActive = false;
  riskPresenceCardUid = "";
  riskPresencePersonName = "";
  riskPresenceUnauthorized = false;
  riskPresenceStart = 0;
  riskPresenceLastSeen = 0;
  riskPresenceLastSummary = 0;
}

void registerRiskPresenceDetection(long distanceCm, bool unauthorized) {
  riskPresenceLastSeen = millis();
  if (!riskPresenceActive || riskPresenceCardUid != lastCardUIDStr) {
    if (riskPresenceActive && riskPresenceCardUid != lastCardUIDStr) {
      closeRiskPresenceSession(true);
    }

    riskPresenceActive = true;
    riskPresenceStart = millis();
    riskPresenceLastSummary = millis();
    riskPresenceCardUid = lastCardUIDStr;
    riskPresencePersonName = lastPersonName;
    riskPresenceUnauthorized = unauthorized;
    if (riskPresenceUnauthorized) {
      logRiskZoneEntry(lastCardUIDStr, distanceCm, lastPersonName);
    }
    return;
  }

  if (riskPresenceUnauthorized && millis() - riskPresenceLastSummary >= RISK_PRESENCE_SUMMARY_INTERVAL) {
    unsigned long duration = millis() - riskPresenceStart;
    logRiskZonePresenceSummary(riskPresenceCardUid, duration, riskPresencePersonName, false);
    riskPresenceLastSummary = millis();
  }
}

bool logCardLevelChangeRequest(const String& cardUid, const String& personName) {
  if (WiFi.status() != WL_CONNECTED || AUTH_TOKEN == "") return false;

  HTTPClient http;
  http.begin(wifiClient, String(SERVER_URL) + "/api/notifications");
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", "Bearer " + AUTH_TOKEN);

  StaticJsonDocument<512> doc;
  doc["type"] = "INFO";
  doc["severity"] = "LOW";
  doc["title"] = "Solicitação de alteração de nível";
  doc["message"] = String("Cartão ") + cardUid + " (" + personName + ") solicitou alteração de nível na área " + getCurrentAreaName();
  doc["deviceId"] = getCurrentAreaId();
  doc["areaId"] = getActiveAreaIdForPayload();
  doc["areaName"] = getActiveAreaNameForPayload();
  doc["workerName"] = personName;

  JsonObject metadata = doc.createNestedObject("metadata");
  metadata["cardUid"] = cardUid;
  metadata["requestedBy"] = personName;
  metadata["area"] = getCurrentAreaName();

  String payload;
  serializeJson(doc, payload);
  int httpCode = http.POST(payload);
  if (httpCode == 201 || httpCode == 200) {
    http.end();
    return true;
  }

  if (httpCode > 0) {
    Serial.println("❌ Falha ao registrar solicitação de nível: " + String(httpCode));
    Serial.println("📥 " + http.getString());
  }
  http.end();
  return false;
}

bool registerCardInBackend(const String& cardUid, String &registeredName, bool &alreadyExists) {
  registeredName = "";
  alreadyExists = false;

  if (WiFi.status() != WL_CONNECTED || AUTH_TOKEN == "") return false;

  HTTPClient http;
  http.begin(wifiClient, String(SERVER_URL) + "/api/people/register-card");
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", "Bearer " + AUTH_TOKEN);

  StaticJsonDocument<256> doc;
  doc["deviceId"] = cardUid;
  doc["name"] = String("Cartão ") + cardUid;
  doc["role"] = "Pendente";

  String payload;
  serializeJson(doc, payload);

  int httpCode = http.POST(payload);
  String responseBody = http.getString();

  if (httpCode == 200 || httpCode == 201) {
    if (responseBody.length() > 0) {
      StaticJsonDocument<768> responseDoc;
      DeserializationError error = deserializeJson(responseDoc, responseBody);
      if (!error) {
        if (responseDoc.containsKey("alreadyExists")) {
          alreadyExists = responseDoc["alreadyExists"].as<bool>();
        }
        if (responseDoc.containsKey("data") && responseDoc["data"].containsKey("name")) {
          registeredName = responseDoc["data"]["name"].as<String>();
        }
      } else {
        Serial.println("⚠️ Não foi possível interpretar resposta de registro: " + String(error.c_str()));
      }
    }

    if (registeredName.length() == 0) {
      registeredName = String("Cartão ") + cardUid;
    }

    http.end();
    return true;
  }

  if (httpCode > 0) {
    Serial.println("❌ Falha ao registrar cartão no backend: " + String(httpCode));
    if (responseBody.length() > 0) {
      Serial.println("📥 " + responseBody);
    }
  }
  http.end();
  return false;
}

bool isWithinRiskDistance(long distanceCm) {
  return (distanceCm > 0 && distanceCm <= RISK_DISTANCE_CM);
}

void startChangeLevelMode() {
  changeLevelModeActive = true;
  changeLevelModeStarted = millis();
  Serial.println("🟡 Modo ALTERAR NÍVEL ativado. Aproxime o cartão em até 10s.");
  ledLevelChangeMode();
}

// ========== BUSCAR PESSOA POR DEVICE ==========
bool getPersonByDevice(const String& deviceId, String &personName, int &accessLevel, String &personId) {
  personName = "";
  accessLevel = 1;
  personId = "";

  if (WiFi.status() != WL_CONNECTED || AUTH_TOKEN == "") return false;
  
  HTTPClient http;
  String encodedId = urlEncode(deviceId);
  http.begin(wifiClient, String(SERVER_URL) + "/api/people/device/" + encodedId);
  http.addHeader("Authorization", "Bearer " + AUTH_TOKEN);
  
  int httpCode = http.GET();
  if (httpCode == 200) {
    String response = http.getString();
    StaticJsonDocument<512> doc;
    DeserializationError error = deserializeJson(doc, response);
    if (!error && doc["success"] == true && doc["data"].containsKey("name")) {
      personName = doc["data"]["name"].as<String>();
      if (doc["data"].containsKey("accessLevel")) {
        accessLevel = doc["data"]["accessLevel"].as<int>();
      }
      if (doc["data"].containsKey("_id")) {
        personId = doc["data"]["_id"].as<String>();
      }
      http.end();
      return true;
    } else if (error) {
      Serial.println("❌ Erro ao parsear pessoa por device: " + String(error.c_str()));
    }
  } else if (httpCode > 0) {
    Serial.println("❌ Falha ao buscar pessoa (" + String(httpCode) + ")");
    String response = http.getString();
    if (response.length() > 0) {
      Serial.println("📥 " + response);
    }
  }
  
  http.end();
  return false;
}

// Atualizar nível de acesso de uma pessoa (PUT /api/people/:id)
bool updatePersonAccessLevel(const String& personId, int newLevel) {
  if (WiFi.status() != WL_CONNECTED || AUTH_TOKEN == "") return false;

  HTTPClient http;
  String url = String(SERVER_URL) + "/api/people/" + urlEncode(personId);
  http.begin(wifiClient, url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", "Bearer " + AUTH_TOKEN);

  StaticJsonDocument<200> doc;
  doc["accessLevel"] = newLevel;

  String payload;
  serializeJson(doc, payload);

  int httpCode = http.PUT(payload);
  String response = "";
  if (httpCode > 0) response = http.getString();

  if (httpCode == 200) {
    Serial.println("✅ PUT /api/people/ - retorno 200. Body: " + response);
    http.end();

    // Verificar leitura atualizada do backend
    HTTPClient http2;
    String url2 = String(SERVER_URL) + "/api/people/" + urlEncode(personId);
    http2.begin(wifiClient, url2);
    http2.addHeader("Authorization", "Bearer " + AUTH_TOKEN);
    int getCode = http2.GET();
    String getBody = "";
    if (getCode > 0) getBody = http2.getString();
    if (getCode == 200) {
      Serial.println("🔎 GET /api/people/:id -> " + getBody);
      StaticJsonDocument<512> respDoc;
      DeserializationError err = deserializeJson(respDoc, getBody);
      if (!err && respDoc.containsKey("data") && respDoc["data"].containsKey("accessLevel")) {
        int persisted = respDoc["data"]["accessLevel"].as<int>();
        Serial.println("ℹ️ AccessLevel persistido: " + String(persisted) + " (esperado: " + String(newLevel) + ")");
        http2.end();
        return persisted == newLevel;
      }
    }
    Serial.println("⚠️ Não foi possível verificar via GET (HTTP " + String(getCode) + ") Body: " + getBody);
    http2.end();
    return true;
  }

  Serial.println("❌ Falha ao atualizar nível (HTTP " + String(httpCode) + ")");
  if (response.length() > 0) Serial.println("📥 " + response);
  http.end();
  return false;
}

// ========== VALIDAR CARTÃO ==========
void validateCard(byte *uid) {
  String uidStr = formatUID(uid);
  Serial.println("🔍 Validando cartão: " + uidStr);
  long measuredDistance = readDistance();
  if (measuredDistance > 0) {
    lastDistanceReading = measuredDistance;
  }
  bool sensorRisk = isWithinRiskDistance(measuredDistance);
  bool zoneRisk = isCurrentAreaRisk();
  bool finalRisk = sensorRisk || zoneRisk;
  
  // Buscar pessoa associada ao device
  String personName = "";
  int personAccessLevel = 1;
  String personId = "";
  bool personFound = getPersonByDevice(uidStr, personName, personAccessLevel, personId);
  
  if (changeLevelModeActive) {
    changeLevelModeActive = false;
    Serial.println("🟡 Processando alteração de nível...");
    if (!personFound) {
      Serial.println("❌ Cartão não cadastrado. Não é possível alterar nível.");
      ledAccessDenied();
      return;
    }

    // Decidir novo nível baseado no nível atual: ciclar 1->2->3->1
    int newLevel = (personAccessLevel % 3) + 1;
    Serial.println("🔁 Nível atual: " + String(personAccessLevel) + " -> Tentando mudar para: " + String(newLevel));
    if (personId.length() > 0 && updatePersonAccessLevel(personId, newLevel)) {
      Serial.println("✅ Nível atualizado com sucesso no backend para: " + String(newLevel));
      ledAccessGranted();
    } else {
      Serial.println("⚠️ Não foi possível atualizar diretamente. Enviando solicitação de alteração para revisão.");
      if (logCardLevelChangeRequest(uidStr, personName)) {
        Serial.println("✅ Solicitação de alteração registrada no backend");
        ledAccessGranted();
      } else {
        Serial.println("❌ Falha ao registrar alteração de nível");
        ledAccessDenied();
      }
    }
    return;
  }

  if (personFound) {
    if (!isAccessAllowedForCurrentArea(personAccessLevel)) {
      Serial.println("❌ ACESSO NEGADO: Nível insuficiente para esta área.");
      Serial.println("   Necessário: " + String(getCurrentAreaRequiredAccessLevel()) + " | Cartão: " + String(personAccessLevel));
      // Se o sensor indica risco, registre imediatamente uma notificação de risco (não autorizado)
      if (sensorRisk) {
        Serial.println("⚠️ Risco detectado mas acesso negado — registrando alerta NÃO AUTORIZADO.");
        // Ativar janela ultrassônica para este cartão por ULTRASONIC_ACTIVE_WINDOW
        ultrasonicSessionUid = uidStr;
        ultrasonicSessionPersonName = personName;
        ultrasonicSessionExpires = millis() + ULTRASONIC_ACTIVE_WINDOW;
        ultrasonicSessionUnauthorized = true;

        // Manter UID local temporariamente para correlação do ultrassom
        lastCardUIDStr = uidStr;
        lastPersonName = personName;
        lastCardAuthorized = false;

        // Registrar notificação de risco não autorizado
        logRiskZoneEntry(uidStr, measuredDistance, personName);

        // Enviar posição mesmo sem autorização para atualizar mapa/dashboard
        float estX = 0.0f;
        float estY = 0.0f;
        bool hasEstimate = estimatePositionFromDistance(measuredDistance, estX, estY);
        sendPosition(uidStr, true, true, measuredDistance, hasEstimate, estX, estY, "rfid");

        // Iniciar sessão de presença por ultrassom imediatamente
        registerRiskPresenceDetection(measuredDistance, true);

        lastCardValid = false;
        lastCardValidationTime = 0;
        ledAccessDenied();
        return;
      }
      // Sem risco detectado: apenas negar acesso
      lastCardValid = false;
      lastCardValidationTime = 0;
      lastCardAuthorized = false;
      ledAccessDenied();
      closeRiskPresenceSession(true);
      return;
    }

    Serial.println("✅ ACESSO PERMITIDO: " + personName);
    
    // Enviar posição para backend com flag de risco
    float estX = 0.0f;
    float estY = 0.0f;
    bool hasEstimate = measuredDistance > 0 ? estimatePositionFromDistance(measuredDistance, estX, estY) : false;
    sendPosition(uidStr, finalRisk, finalRisk, measuredDistance, hasEstimate, estX, estY, "rfid");
    
    // Armazenar último cartão válido
    copyUID(lastCardUID, uid);
    lastCardValid = true;
    lastCardUIDStr = uidStr;
    lastPersonName = personName;
    lastCardValidationTime = millis();
    lastCardAuthorized = true;
    ultrasonicSessionUnauthorized = false;
    
    ledAccessGranted();
  } else {
    Serial.println("❌ ACESSO NEGADO: Cartão não cadastrado");
    lastCardValid = false;
    lastCardUIDStr = "";
    lastPersonName = "";
    lastCardValidationTime = 0;
    lastCardAuthorized = false;
    ledAccessDenied();
    closeRiskPresenceSession(true);
  }
}

// ========== HEARTBEAT ==========
void sendHeartbeat() {
  if (WiFi.status() != WL_CONNECTED || AUTH_TOKEN == "") return;
  
  HTTPClient http;
  http.begin(wifiClient, String(SERVER_URL) + "/api/devices/" + String(getCurrentAreaId()) + "/heartbeat");
  http.addHeader("Authorization", "Bearer " + AUTH_TOKEN);
  
  int httpCode = http.POST("");
  
  if (httpCode == 200) {
    Serial.println("💓 Heartbeat enviado");
  }
  
  http.end();
}

// Enviar 'graceful disconnect' informando ao backend que o dispositivo ficará inativo
bool sendDisconnect(String deviceId) {
  if (WiFi.status() != WL_CONNECTED || AUTH_TOKEN == "") return false;

  HTTPClient http;
  String url = String(SERVER_URL) + "/api/devices/" + deviceId;
  http.begin(wifiClient, url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", "Bearer " + AUTH_TOKEN);

  StaticJsonDocument<200> doc;
  doc["active"] = false;

  String body;
  serializeJson(doc, body);

  int httpCode = http.PUT(body);
  if (httpCode == 200) {
    Serial.println("🔌 Dispositivo marcado como INATIVO (graceful)");
    http.end();
    return true;
  } else {
    Serial.println("❌ Falha ao marcar dispositivo inativo: " + String(httpCode));
    if (httpCode > 0) {
      Serial.println("📥 " + http.getString());
    }
  }
  http.end();
  return false;
}

// ========== ALTERNAR ÁREA ==========
void switchArea() {
  // Ciclo: Portaria (0) -> Risco1 (1) -> Risco2 (2) -> Portaria (0)
  currentAreaIndex = (currentAreaIndex + 1) % 3;
  resetBackendAreaState();
  
  Serial.println();
  Serial.println("🔄 ===== ÁREA ALTERADA =====");
  Serial.println("   ID: " + String(getCurrentAreaId()));
  Serial.println("   Nome: " + String(getCurrentAreaName()));
  Serial.println("   Posição: X=" + String(getCurrentAreaX(), 2) + " Y=" + String(getCurrentAreaY(), 2));
  Serial.println("   Zona de Risco: " + String(isCurrentAreaRisk() ? "SIM" : "NÃO"));
  Serial.println("============================");
  Serial.println();
  
  // PRIMEIRO: Fazer login com a nova área
  Serial.println("🔐 Fazendo login com nova área...");
  AUTH_TOKEN = "";  // Limpar token antigo
  
  if (loginDevice()) {
    Serial.println("✅ Login realizado! Agora ativando área no backend...");
    delay(500);  // Pequeno delay para garantir estabilidade
    
    // SEGUNDO: Ativar área no backend (atualiza currentlyActive)
    if (activateAreaInBackend(getCurrentAreaId())) {
      Serial.println("✅ Área ativada no backend com sucesso!");
    } else {
      Serial.println("❌ Falha ao ativar área no backend");
    }
    
    // TERCEIRO: Registrar dispositivo se necessário
    delay(500);
      registerDevice();
      fetchAreaMetadataFromBackend();
    
    // Feedback visual (padrão específico para troca de área)
    for (int i = 0; i < currentAreaIndex + 1; i++) {
      ledAreaSwitch();
    }
  } else {
    Serial.println("❌ Falha no login! Não foi possível ativar área no backend");
  }
}

// ========== ATIVAR ÁREA NO BACKEND ==========
bool activateAreaInBackend(const char* deviceId) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ WiFi não conectado!");
    return false;
  }
  
  if (AUTH_TOKEN == "") {
    Serial.println("❌ Token ausente! Faça login primeiro.");
    return false;
  }
  
  Serial.println("📤 Ativando área no backend...");
  Serial.println("   URL: " + String(SERVER_URL) + "/api/zones/activate-device");
  Serial.println("   Device ID: " + String(deviceId));
  
  HTTPClient http;
  http.setTimeout(10000);  // Timeout de 10 segundos
  
  if (!http.begin(wifiClient, String(SERVER_URL) + "/api/zones/activate-device")) {
    Serial.println("❌ Falha ao iniciar HTTP Client");
    return false;
  }
  
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", "Bearer " + AUTH_TOKEN);
  
  StaticJsonDocument<100> doc;
  doc["deviceId"] = deviceId;
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  Serial.println("📤 Enviando JSON: " + jsonString);
  
  int httpCode = http.POST(jsonString);
  
  Serial.println("📥 HTTP Code: " + String(httpCode));
  
  if (httpCode == 200) {
    String response = http.getString();
    Serial.println("✅ Área ativada no backend!");
    Serial.println("📥 Response: " + response);
    http.end();
    return true;
  } else if (httpCode == 404) {
    Serial.println("❌ Erro 404: Rota não encontrada!");
    Serial.println("   Verifique se o backend está rodando");
    Serial.println("   Verifique se a rota /api/zones/activate-device existe");
  } else if (httpCode == 401) {
    Serial.println("❌ Erro 401: Token inválido!");
    Serial.println("   Token usado: " + AUTH_TOKEN.substring(0, 20) + "...");
  } else if (httpCode > 0) {
    String response = http.getString();
    Serial.println("❌ Erro HTTP " + String(httpCode));
    Serial.println("📥 Response: " + response);
  } else {
    Serial.println("❌ Erro de conexão! Code: " + String(httpCode));
    Serial.println("   Verifique se o backend está acessível em: " + String(SERVER_URL));
  }
  
  http.end();
  return false;
}

// ========== SETUP ==========
void setup() {
  Serial.begin(115200);
  delay(100);

  resetBackendAreaState();
  
  // Configurar pinos
  pinMode(LED_PIN, OUTPUT);
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(BTN_PIN, INPUT_PULLUP);
  digitalWrite(LED_PIN, LOW);
  
  // Inicializar SPI e RFID
  SPI.begin();
  mfrc522.PCD_Init();
  
  Serial.println();
  Serial.println("========================================");
  Serial.println("  ESP8266 RFID Gateway - Connection-4");
  Serial.println("========================================");
  Serial.println("Área Inicial: " + String(getCurrentAreaName()));
  Serial.println("ID: " + String(getCurrentAreaId()));
  Serial.println();
  
  // Conectar WiFi
  Serial.println("📡 Configuração WiFi:");
  Serial.println("   SSID: " + String(WIFI_SSID));
  Serial.print("   Conectando");
  
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  Serial.println();
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("✅ WiFi conectado!");
    Serial.println("   IP Local: " + WiFi.localIP().toString());
    Serial.println("   Gateway: " + WiFi.gatewayIP().toString());
    Serial.println("   Servidor: " + String(SERVER_URL));
    Serial.println();
    
    // Login no backend
    if (loginDevice()) {
      // Registrar dispositivo
      delay(1000);
      registerDevice();
      fetchAreaMetadataFromBackend();
    }
  } else {
    Serial.println("❌ Falha ao conectar WiFi");
    Serial.println("   Verifique SSID e senha!");
  }
  
  Serial.println("========================================");
  Serial.println("Sistema pronto!");
  Serial.println("📋 Controles:");
  Serial.println("   - Pressione botão 1 seg: Alternar área");
  Serial.println("   - Pressione botão 3 seg: Registrar novo cartão");
  Serial.println();
}

// ========== LOOP PRINCIPAL ==========
void loop() {
  // Verificar conexão WiFi
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("⚠️ WiFi desconectado. Reconectando...");
    WiFi.reconnect();
    delay(5000);
    return;
  }
  
  // Heartbeat periódico
  if (millis() - lastHeartbeat > HEARTBEAT_INTERVAL) {
    sendHeartbeat();
    lastHeartbeat = millis();
  }

  // Timeout do modo alterar nível
  if (changeLevelModeActive && (millis() - changeLevelModeStarted > MODE_TIMEOUT)) {
    changeLevelModeActive = false;
    Serial.println("⏹️ Tempo do modo ALTERAR NÍVEL expirou");
  }
  
  // ========== CONTROLE DE BOTÃO ==========
  bool btnState = digitalRead(BTN_PIN) == LOW;
  
  if (btnState && !btnPressed) {
    btnPressed = true;
    btnPressStart = millis();
    Serial.println("🔘 Botão pressionado...");
  }
  
  if (!btnState && btnPressed) {
    btnPressed = false;
    unsigned long pressDuration = millis() - btnPressStart;
    
    if (pressDuration >= DISCONNECT_PRESS_THRESHOLD) {
      Serial.println("⏱️ Pressão muito longa detectada (>=7s) - Enviando disconnect gracioso...");
      if (sendDisconnect(String(getCurrentAreaId()))) {
        Serial.println("✅ Disconnect enviado com sucesso");
        for (int i = 0; i < 3; i++) { digitalWrite(LED_PIN, HIGH); delay(150); digitalWrite(LED_PIN, LOW); delay(150); }
      } else {
        Serial.println("❌ Falha ao enviar disconnect");
        ledAccessDenied();
      }
    } else if (pressDuration >= MEDIUM_PRESS_THRESHOLD) {
      Serial.println("⏱️ Pressão longa detectada (>3s e <7s)");
      Serial.println("🆕 Modo: REGISTRAR NOVO CARTÃO");
      Serial.println("📋 Aproxime o cartão do leitor RFID em até 10s...");
      ledRegistrationMode();
      
      unsigned long registerStart = millis();
      bool registrationCompleted = false;
      while (millis() - registerStart < 10000) {
        if (mfrc522.PICC_IsNewCardPresent() && mfrc522.PICC_ReadCardSerial()) {
          String newUID = formatUID(mfrc522.uid.uidByte);
          Serial.println("✅ Novo cartão detectado: " + newUID);
          String registeredName;
          bool alreadyExists = false;
          if (registerCardInBackend(newUID, registeredName, alreadyExists)) {
            if (alreadyExists) {
              Serial.println("ℹ️ Cartão já estava cadastrado. Associado a: " + registeredName);
            } else {
              Serial.println("📝 Cartão cadastrado automaticamente no backend para: " + registeredName);
            }

            // Garantir que os dados locais sejam atualizados para o modo ultrassônico
            copyUID(lastCardUID, mfrc522.uid.uidByte);
            lastCardValid = true;
            lastCardUIDStr = newUID;
            lastPersonName = registeredName.length() > 0 ? registeredName : String("Cartão ") + newUID;
            lastCardValidationTime = millis();

            Serial.println("💾 Último cartão atualizado para monitoramento ultrassônico.");
            ledAccessGranted();
            mfrc522.PICC_HaltA();
            registrationCompleted = true;
            break;
          } else {
            Serial.println("❌ Falha ao cadastrar automaticamente. Registre manualmente este UID.");
            ledAccessDenied();
            mfrc522.PICC_HaltA();
          }
        }
        delay(100);
      }

      if (!registrationCompleted) {
        Serial.println("⌛ Tempo limite atingido. Nenhum cartão registrado.");
        ledAccessDenied();
      }
    } else if (pressDuration >= SHORT_PRESS_THRESHOLD) {
      Serial.println("⏱️ Pressão média detectada (1-3s): entrando em modo ALTERAR NÍVEL");
      startChangeLevelMode();
    } else {
      Serial.println("⏱️ Pressão rápida (<1s): alternando área");
      switchArea();
    }
  }
  
  // Leitura do sensor ultrassônico
  // Limpar sessão ultrassônica se expirou
  if (ultrasonicSessionExpires > 0 && millis() > ultrasonicSessionExpires) {
    Serial.println("ℹ️ Janela ultrassônica expirada para UID: " + ultrasonicSessionUid);
    // limpar UID temporário se não há validação recente
    if (lastCardUIDStr.length() > 0 && lastCardUIDStr == ultrasonicSessionUid && !lastCardValid) {
      lastCardUIDStr = "";
      lastPersonName = "";
      lastCardAuthorized = false;
    }
    ultrasonicSessionUid = "";
    ultrasonicSessionPersonName = "";
    ultrasonicSessionExpires = 0;
    ultrasonicSessionUnauthorized = false;
  }

  long distance = readDistance();
  if (distance > 0) {
    lastDistanceReading = distance;
  }

  // Se o ultrassom detectar presença dentro do limite de risco, logamos no Serial
  if (isWithinRiskDistance(distance)) {
    if (millis() - lastUltrasonicCheck > ULTRASONIC_DEBOUNCE) {
      bool recentCard = hasRecentValidCard();
      bool sessionActive = (ultrasonicSessionExpires > 0 && millis() <= ultrasonicSessionExpires && ultrasonicSessionUid.length() > 0);

      if ((recentCard && lastCardUIDStr.length() > 0) || sessionActive) {
        // Escolher UID/nome a usar (priorizar sessão ultrassônica)
        String uidToUse = sessionActive ? ultrasonicSessionUid : lastCardUIDStr;
        String nameToUse = sessionActive ? ultrasonicSessionPersonName : lastPersonName;
        bool unauthorized = sessionActive ? ultrasonicSessionUnauthorized : !lastCardAuthorized;

        if (sessionActive) {
          Serial.println("👋 Presença detectada (janela ultrassônica ativa) para UID: " + uidToUse);
        } else {
          Serial.println("👋 Presença detectada pelo ultrassom (<=1m). Verificando cartão na área...");
        }

        Serial.println("   Distância: " + String(distance) + " cm");
        Serial.println("   Cartão associado: UID: " + uidToUse + "  Nome: " + nameToUse);
        Serial.println("   Enviando posição e registrando notificação de risco.");

        // Garantir que os métodos que usam variáveis globais funcionem: ajustar temporariamente
        lastCardUIDStr = uidToUse;
        lastPersonName = nameToUse;

        float estX = 0.0f;
        float estY = 0.0f;
        bool hasEstimate = estimatePositionFromDistance(distance, estX, estY);
        sendPosition(uidToUse, true, true, distance, hasEstimate, estX, estY, "ultrasonic");
        registerRiskPresenceDetection(distance, unauthorized);
      } else {
        Serial.println("👋 Presença detectada pelo ultrassom (<=1m) mas sem sessão/UID ativo.");
        if (lastCardValid && !recentCard) {
          Serial.println("   O último cartão foi validado há mais de " + String(CARD_VALIDITY_WINDOW / 1000) + "s. Ignorando leitura antiga.");
        }
        Serial.println("   Distância: " + String(distance) + " cm");
        closeRiskPresenceSession(false);
      }

      lastUltrasonicCheck = millis();
    }
  } else {
    closeRiskPresenceSession(false);
  }
  
  // Leitura RFID
  if (mfrc522.PICC_IsNewCardPresent() && mfrc522.PICC_ReadCardSerial()) {
    validateCard(mfrc522.uid.uidByte);
    mfrc522.PICC_HaltA();
    delay(500);
  }
  
  delay(100);
}
