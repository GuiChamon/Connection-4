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
};

// Definir 3 áreas: Portaria, Área Risco 1, Área Risco 2
Area areas[3] = {
  {"entrada", "Portaria Principal", 0.08, 0.10, false},
  {"risco1", "Area de Risco 1", 0.50, 0.30, true},
  {"risco2", "Area de Risco 2", 0.80, 0.70, true}
};

// Área ativa atual (começa na Portaria)
int currentAreaIndex = 0;

// Funções auxiliares para área
const char* getCurrentAreaId() { return areas[currentAreaIndex].id; }
const char* getCurrentAreaName() { return areas[currentAreaIndex].name; }
float getCurrentAreaX() { return areas[currentAreaIndex].x; }
float getCurrentAreaY() { return areas[currentAreaIndex].y; }
bool isCurrentAreaRisk() { return areas[currentAreaIndex].isRiskZone; }

// ========== PINAGEM ==========
#define SS_PIN 15           // D8
#define RST_PIN 16          // D0
#define LED_PIN 5           // D1 - LED de feedback
#define TRIG_PIN 2          // D4 - HC-SR04 TRIG
#define ECHO_PIN 4          // D2 - HC-SR04 ECHO
#define BTN_PIN 0           // D3 - Botão configuração

MFRC522 mfrc522(SS_PIN, RST_PIN);
WiFiClient wifiClient;

// ========== VARIÁVEIS DE CONTROLE ==========
unsigned long lastHeartbeat = 0;
const unsigned long HEARTBEAT_INTERVAL = 5000;  // 30 segundos

unsigned long lastUltrasonicCheck = 0;
const unsigned long ULTRASONIC_DEBOUNCE = 3000;  // 3 segundos

byte lastCardUID[4] = {0, 0, 0, 0};
bool lastCardValid = false;

// Controle de botão
unsigned long btnPressStart = 0;
bool btnPressed = false;
bool configMode = false;

// ========== FUNÇÕES LED ==========
void ledSuccess() {
  digitalWrite(LED_PIN, HIGH);
  delay(2000);
  digitalWrite(LED_PIN, LOW);
}

void ledError() {
  for(int i=0; i<3; i++) {
    digitalWrite(LED_PIN, HIGH);
    delay(200);
    digitalWrite(LED_PIN, LOW);
    delay(200);
  }
}

void ledBlink() {
  digitalWrite(LED_PIN, HIGH);
  delay(100);
  digitalWrite(LED_PIN, LOW);
  delay(100);
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
bool sendPosition(String deviceId, bool inRiskZone) {
  if (WiFi.status() != WL_CONNECTED || AUTH_TOKEN == "") return false;
  
  HTTPClient http;
  http.begin(wifiClient, String(SERVER_URL) + "/api/positions");
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", "Bearer " + AUTH_TOKEN);
  
  StaticJsonDocument<300> doc;
  doc["deviceId"] = deviceId;
  doc["x"] = getCurrentAreaX();
  doc["y"] = getCurrentAreaY();
  doc["areaId"] = getCurrentAreaId();
  doc["areaName"] = getCurrentAreaName();
  doc["inRiskZone"] = isCurrentAreaRisk();
  doc["alertGenerated"] = isCurrentAreaRisk();
  
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

// ========== BUSCAR PESSOA POR DEVICE ==========
String getPersonByDevice(String deviceId) {
  if (WiFi.status() != WL_CONNECTED || AUTH_TOKEN == "") return "";
  
  HTTPClient http;
  http.begin(wifiClient, String(SERVER_URL) + "/api/people/device/" + deviceId);
  http.addHeader("Authorization", "Bearer " + AUTH_TOKEN);
  
  int httpCode = http.GET();
  
  if (httpCode == 200) {
    String response = http.getString();
    
    StaticJsonDocument<512> doc;
    deserializeJson(doc, response);
    
    if (doc["success"] == true) {
      String name = doc["data"]["name"].as<String>();
      http.end();
      return name;
    }
  }
  
  http.end();
  return "";
}

// ========== VALIDAR CARTÃO ==========
void validateCard(byte *uid) {
  String uidStr = formatUID(uid);
  Serial.println("🔍 Validando cartão: " + uidStr);
  
  // Buscar pessoa associada ao device
  String personName = getPersonByDevice(uidStr);
  
  if (personName != "") {
    Serial.println("✅ ACESSO PERMITIDO: " + personName);
    
    // Enviar posição para backend
    sendPosition(uidStr, false);
    
    // Armazenar último cartão válido
    copyUID(lastCardUID, uid);
    lastCardValid = true;
    
    ledSuccess();
  } else {
    Serial.println("❌ ACESSO NEGADO: Cartão não cadastrado");
    lastCardValid = false;
    ledError();
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
    
    // Feedback visual (piscar LED)
    for(int i = 0; i < currentAreaIndex + 1; i++) {
      digitalWrite(LED_PIN, HIGH);
      delay(200);
      digitalWrite(LED_PIN, LOW);
      delay(200);
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
    
    if (pressDuration >= 7000) {
      // Pressão muito longa (7+ segundos) - Marcar disconnect gracioso
      Serial.println("⏱️ Pressão muito longa detectada (7+ seg) - Enviando disconnect gracioso...");
      if (sendDisconnect(String(getCurrentAreaId()))) {
        Serial.println("✅ Disconnect enviado com sucesso");
        // Feedback visual
        for (int i = 0; i < 3; i++) { digitalWrite(LED_PIN, HIGH); delay(150); digitalWrite(LED_PIN, LOW); delay(150); }
      } else {
        Serial.println("❌ Falha ao enviar disconnect");
        ledError();
      }
    } else if (pressDuration >= 3000) {
      // Pressão longa (3-7 segundos) - Registrar novo cartão
      Serial.println("⏱️ Pressão longa detectada (3-7 seg)");
      Serial.println("🆕 Modo: REGISTRAR NOVO CARTÃO");
      Serial.println("📋 Aproxime o cartão do leitor RFID...");
      
      // Aguardar cartão por 10 segundos
      unsigned long registerStart = millis();
      while (millis() - registerStart < 10000) {
        if (mfrc522.PICC_IsNewCardPresent() && mfrc522.PICC_ReadCardSerial()) {
          String newUID = formatUID(mfrc522.uid.uidByte);
          Serial.println("✅ Novo cartão detectado: " + newUID);
          Serial.println("📝 Registre este UID no sistema backend!");
          ledSuccess();
          mfrc522.PICC_HaltA();
          break;
        }
        delay(100);
      }
      
    } else if (pressDuration >= 1000) {
      // Pressão curta (1-3 segundos) - Alternar área
      Serial.println("⏱️ Pressão curta detectada (1-3 seg)");
      switchArea();
    }
  }
  
  // Leitura do sensor ultrassônico
  long distance = readDistance();
  
  if (distance > 0 && distance < 15 && lastCardValid) {
    if (millis() - lastUltrasonicCheck > ULTRASONIC_DEBOUNCE) {
      Serial.println("👋 Presença detectada! Validando último cartão...");
      validateCard(lastCardUID);
      lastUltrasonicCheck = millis();
    }
  }
  
  // Leitura RFID
  if (mfrc522.PICC_IsNewCardPresent() && mfrc522.PICC_ReadCardSerial()) {
    validateCard(mfrc522.uid.uidByte);
    mfrc522.PICC_HaltA();
    delay(500);
  }
  
  delay(100);
}
