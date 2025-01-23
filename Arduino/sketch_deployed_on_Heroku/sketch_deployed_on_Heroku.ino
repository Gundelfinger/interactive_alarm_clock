#include <Wire.h>
#include <RTClib.h>
#include <TM1637.h>
#include <Encoder.h>
#include <NewPing.h>
#include <WiFiNINA.h>

// ***** WLAN-DATEN *****
char ssid[] = "Pixel8";
char pass[] = "12345678";

// ***** SERVER-EINSTELLUNGEN *****
char server[] = "mein-wecker-99818310be53.herokuapp.com";

// Pins für Ultraschallsensoren
#define TRIG_PIN_1 6
#define ECHO_PIN_1 7
#define TRIG_PIN_2 4
#define ECHO_PIN_2 5
#define MAX_DISTANCE 500

// Pins für das 4-stellige 7-Segment-Display
#define CLK_PIN 2
#define DIO_PIN 3

// Pins für den Drehencoder
#define ENCODER_CLK 8
#define ENCODER_DT 9
#define ENCODER_SW 10

// Pins für Alarm (DFPlayer Mini)
#define PLAY_PIN 0
#define STOP_PIN 1

// (Optional) LED-Pin
#define LED_PIN A6

// RTC-Objekt
RTC_DS3231 rtc;

// Variablen für die Display-/Zeitsteuerung
unsigned long previousMillis = 0;
const long interval = 1000;
int lastDisplayedMinutes = -1;

// Globale Alarmzeit
int globalAlarmHour = 0;
int globalAlarmMinute = 0;

// WLAN-Client (unverschlüsselt, Port 80)
WiFiClient client;

// -----------------------------------------------------
// 1) Klasse: RotaryEncoderWithButton
// -----------------------------------------------------
class RotaryEncoderWithButton {
private:
  Encoder encoder;
  int buttonPin;
  int buttonState = HIGH;
  int lastButtonState = HIGH;
  unsigned long lastDebounceTime = 0;
  const unsigned long debounceDelay = 50;
  long lastEncoderPosition = 0;

public:
  RotaryEncoderWithButton(int clkPin, int dtPin, int swPin)
    : encoder(clkPin, dtPin), buttonPin(swPin) {
    pinMode(buttonPin, INPUT_PULLUP);
  }

  int readEncoder() {
    long encoderPosition = encoder.read() / 4;
    int rotation = encoderPosition - lastEncoderPosition;
    lastEncoderPosition = encoderPosition;
    if      (rotation > 0) return 1;
    else if (rotation < 0) return -1;
    else                   return 0;
  }

  bool isButtonPressed() {
    int reading = digitalRead(buttonPin);
    if (reading != lastButtonState) {
      lastDebounceTime = millis();
    }
    if ((millis() - lastDebounceTime) > debounceDelay) {
      if (reading != buttonState) {
        buttonState = reading;
        if (buttonState == LOW) {
          lastButtonState = reading;
          return true;
        }
      }
    }
    lastButtonState = reading;
    return false;
  }

  void resetEncoderPosition() {
    encoder.write(0);
    lastEncoderPosition = 0;
  }
};

// -----------------------------------------------------
// 2) Klasse: HighscoreCalculator
// -----------------------------------------------------
class HighscoreCalculator {
public:
  int calculateHighscore(unsigned long elapsedTimeSec) {
    int highscore = 0;
    if      (elapsedTimeSec >= 1 && elapsedTimeSec <= 10)   highscore = 2000 - ((elapsedTimeSec * 50) - 50);
    else if (elapsedTimeSec > 10 && elapsedTimeSec <= 300)  highscore = 1000 - (elapsedTimeSec - 10);
    else if (elapsedTimeSec > 300)                          highscore = 42;
    else                                                    highscore = 2000;
    return max(highscore, 0);
  }
};

// -----------------------------------------------------
// 3) Klasse: DisplayManager
// -----------------------------------------------------
class DisplayManager {
private:
  TM1637 display;
  unsigned long lastUpdateTime = 0;
  int displayDuration = 3000;
  bool showingAlarmTime = false;
  int brightnessLevel = 10;
  bool isDisplayOccupied = false;

public:
  DisplayManager(int clkPin, int dioPin) : display(clkPin, dioPin) {
    display.init();
    setBrightnessLevel(brightnessLevel);
  }

  void showTime(int hours, int minutes) {
    if (!isDisplayOccupied) {
      int8_t digits[4];
      digits[0] = hours / 10;
      digits[1] = hours % 10;
      digits[2] = minutes / 10;
      digits[3] = minutes % 10;
      display.point(true);
      display.display(digits);
    }
  }

  void showAlarmTime(int hours, int minutes) {
    int8_t digits[4];
    digits[0] = hours / 10;
    digits[1] = hours % 10;
    digits[2] = minutes / 10;
    digits[3] = minutes % 10;
    display.point(false);
    display.display(digits);
    showingAlarmTime = true;
    lastUpdateTime = millis();
  }

  void showModeNumber(int mode) {
    int8_t digits[4] = {0, 0, 0, 0};
    digits[3] = mode % 10;
    display.point(false);
    display.display(digits);
  }

  void showBrightnessLevel(int level) {
    int8_t digits[4] = {0, 0, 0, 0};
    digits[3] = level % 10;
    display.point(false);
    display.display(digits);
  }

  void clearModeDisplay() {
    display.clearDisplay();
    showingAlarmTime = false;
  }

  void setBrightnessLevel(int level) {
    brightnessLevel = level;
    int brightness = map(brightnessLevel, 1, 10, 0, 7);
    display.set(brightness);
  }

  int getBrightnessLevel() {
    return brightnessLevel;
  }

  void setDisplayOccupied(bool occupied) {
    isDisplayOccupied = occupied;
  }

  bool getDisplayOccupied() {
    return isDisplayOccupied;
  }

  void update() {
    if (showingAlarmTime && (millis() - lastUpdateTime >= displayDuration)) {
      showingAlarmTime = false;
    }
  }

  bool isShowingAlarmTime() {
    return showingAlarmTime;
  }
};

// -----------------------------------------------------
// 4) Klasse: DualUltrasonicSensor
// -----------------------------------------------------
class DualUltrasonicSensor {
private:
  NewPing sensor1;
  NewPing sensor2;

  float distance1 = -1;
  float distance2 = -1;

  bool highSignalSensor1 = false;
  unsigned long sensor1StartMillis = 0;
  unsigned long highscoreStartMillis = 0;
  unsigned long HighscoreTime = 0;

  bool highSignalSensor2 = false;
  bool highscoreFinished = false;

  const unsigned long sensor1Duration = 3000;

  HighscoreCalculator highscoreCalculator;
  int lastCalculatedHighscore = 0;

public:
  DualUltrasonicSensor(int trigPin1, int echoPin1, int trigPin2, int echoPin2)
    : sensor1(trigPin1, echoPin1, MAX_DISTANCE), sensor2(trigPin2, echoPin2, MAX_DISTANCE) {}

  void updateUltrasonicSensor(bool alarmActive) {
    measureDistances();

    if (!alarmActive) {
      // Kein Alarm -> reset states
      highSignalSensor1 = false;
      highSignalSensor2 = false;
      highscoreFinished = false;
      HighscoreTime = 0;
      lastCalculatedHighscore = 0;
      return;
    }

    evaluateSensor1();
    evaluateSensor2();
  }

  bool isHighscoreFinished() {
    return highscoreFinished;
  }

  unsigned long getElapsedTimeSec() {
    return HighscoreTime / 1000;
  }

  int getLastCalculatedHighscore() {
    return lastCalculatedHighscore;
  }

  bool isSensor1HighSignal() {
    return highSignalSensor1;
  }

private:
  void measureDistances() {
    unsigned int uS1 = sensor1.ping();
    distance1 = calculateDistance(uS1);

    unsigned int uS2 = sensor2.ping();
    distance2 = calculateDistance(uS2);

    printDistances();
  }

  void evaluateSensor1() {
    if (distance1 != -1) {
      if (distance1 >= 20 && !highSignalSensor1) {
        highSignalSensor1 = true;
        sensor1StartMillis = 0;
        highscoreStartMillis = millis();
        HighscoreTime = 0;
        highscoreFinished = false;
        Serial.println("Sensor 1: HighSignal aktiviert, Distanz >= 20 cm");
      } 
      else if (distance1 < 20 && highSignalSensor1) {
        if (sensor1StartMillis == 0) {
          sensor1StartMillis = millis();
        }
        if (millis() - sensor1StartMillis >= sensor1Duration) {
          highSignalSensor1 = false;
          sensor1StartMillis = 0;
          HighscoreTime = 0;
          highscoreFinished = false;
          Serial.println("Sensor 1: HighSignal deaktiviert, 3 Sekunden Distanz < 20 cm");
        }
      }
    } else {
      Serial.println("Sensor 1: Keine gültige Messung");
      if (highSignalSensor1) {
        if (sensor1StartMillis == 0) {
          sensor1StartMillis = millis();
        }
        if (millis() - sensor1StartMillis >= sensor1Duration) {
          highSignalSensor1 = false;
          sensor1StartMillis = 0;
          HighscoreTime = 0;
          highscoreFinished = false;
          Serial.println("Sensor 1: HighSignal deaktiviert wegen ungültiger Messung");
        }
      }
    }
    if (highSignalSensor1) {
      HighscoreTime = millis() - highscoreStartMillis;
    }
  }

  void evaluateSensor2() {
    if (distance2 != -1) {
      if (distance2 <= 5 && highSignalSensor1 && !highSignalSensor2 && !highscoreFinished) {
        highSignalSensor2 = true;
        unsigned long elapsedSec = (HighscoreTime / 1000);
        int highscore = highscoreCalculator.calculateHighscore(elapsedSec);
        lastCalculatedHighscore = highscore;
        highscoreFinished = true;
        Serial.print("Sensor 2: HighSignal aktiviert, Highscore berechnet: ");
        Serial.println(highscore);
      }
    }
    if ((distance2 > 5 || distance2 == -1) && highSignalSensor2) {
      highSignalSensor2 = false;
      Serial.println("Sensor 2: HighSignal deaktiviert");
    }
  }

  float calculateDistance(unsigned int uS) {
    if (uS == 0) {
      return -1;
    }
    return (uS * 0.034) / 2.0;
  }

  void printDistances() {
    Serial.print("Sensor 1 Entfernung: ");
    if (distance1 != -1) {
      Serial.print(distance1);
      Serial.println(" cm");
    } else {
      Serial.println("Keine Messung");
    }

    Serial.print("Sensor 2 Entfernung: ");
    if (distance2 != -1) {
      Serial.print(distance2);
      Serial.println(" cm");
    } else {
      Serial.println("Keine Messung");
    }
    Serial.println("-----------------------------");
  }
};

// -----------------------------------------------------
// 5) Vorwärtsdeklaration unserer Funktion, 
//    damit wir sie in AlarmManager::checkAlarm() aufrufen können
void sendHighscoreIfNeeded();

// -----------------------------------------------------
// 6) Klasse: AlarmManager (mit 5sek / 5min Audio-Logik)
// -----------------------------------------------------
class AlarmManager {
private:
  RTC_DS3231& rtc;
  DisplayManager& displayManager;
  RotaryEncoderWithButton& encoder;
  DualUltrasonicSensor& dualSensor;

  int alarmHour = 0;
  int alarmMinute = 0;
  bool alarmSet = false;
  bool alarmActive = false;
  bool alarmDismissed = false;
  bool settingAlarm = false;

  bool alarmTriggeredThisMinute = false;

  unsigned long lastAudioTime = 0;
  bool audioPlaying = false;
  static const unsigned long AUDIO_PLAY_DURATION = 5000UL;  // 5 sek
  static const unsigned long AUDIO_DELAY = 300000UL;        // 5 min

  unsigned long lastRotationTime = 0;
  unsigned long lastEncoderEventTime = 0;
  int incrementStep = 5;

public:
  AlarmManager(RTC_DS3231& rtc, DisplayManager& displayManager, 
               RotaryEncoderWithButton& encoder, DualUltrasonicSensor& dualSensor)
    : rtc(rtc), displayManager(displayManager), encoder(encoder), dualSensor(dualSensor) {}

  void update() {
    checkAlarm();
    updateAudio();
  }

  void startAlarmSetting() {
    settingAlarm = true;
    lastRotationTime = millis();
    encoder.resetEncoderPosition();
    displayManager.showAlarmTime(alarmHour, alarmMinute);
    displayManager.setDisplayOccupied(true);
  }

  bool updateAlarmSetting() {
    if (settingAlarm) {
      handleAlarmSetting();
    }
    return settingAlarm;
  }

  bool isAlarmActive() {
    return alarmActive;
  }

  void setAlarmTime(int h, int m) {
    alarmHour = h;
    alarmMinute = m;
    alarmSet = true;
    alarmDismissed = false;
    Serial.print("Alarmzeit via setAlarmTime aktualisiert: ");
    Serial.print(alarmHour);
    Serial.print(":");
    Serial.println(alarmMinute);
  }

private:
  void updateAudio() {
    if (!alarmActive) {
      // Alarm ist nicht aktiv -> DFPlayer stoppen
      if (audioPlaying) {
        stopTrack();
        audioPlaying = false;
      }
      return;
    }

    unsigned long now = millis();

    if (audioPlaying) {
      // Spielt gerade -> nach 5s stoppen
      if (now - lastAudioTime >= AUDIO_PLAY_DURATION) {
        stopTrack();
        audioPlaying = false;
        lastAudioTime = now;
      }
    } else {
      // Spielt nicht
      if ((lastAudioTime == 0)
          || (now - lastAudioTime >= AUDIO_DELAY + AUDIO_PLAY_DURATION)) {
        startTrack();
        audioPlaying = true;
        lastAudioTime = now;
      }
    }
  }

  void handleAlarmSetting() {
    int rotation = encoder.readEncoder();
    if (rotation != 0) {
      lastRotationTime = millis();
      unsigned long currentTime = millis();
      unsigned long timeSinceLastEvent = currentTime - lastEncoderEventTime;
      if      (timeSinceLastEvent < 100) incrementStep = 15;
      else if (timeSinceLastEvent < 300) incrementStep = 10;
      else                               incrementStep = 5;

      lastEncoderEventTime = currentTime;
      if (rotation > 0) incrementAlarmTime(incrementStep);
      else              decrementAlarmTime(incrementStep);

      displayManager.showAlarmTime(alarmHour, alarmMinute);
    }
    if (millis() - lastRotationTime > 10000) {
      settingAlarm = false;
      displayManager.clearModeDisplay();
      displayManager.setDisplayOccupied(false);
    }
    if (encoder.isButtonPressed()) {
      alarmSet = true;
      alarmDismissed = false;
      Serial.print("Weckzeit gespeichert: ");
      Serial.print(alarmHour);
      Serial.print(":");
      Serial.println(alarmMinute);
      settingAlarm = false;
      displayManager.clearModeDisplay();
      displayManager.setDisplayOccupied(false);
      lastDisplayedMinutes = -1;
    }
  }

  void incrementAlarmTime(int step) {
    alarmMinute += step;
    while (alarmMinute >= 60) {
      alarmMinute -= 60;
      alarmHour++;
      if (alarmHour >= 24) {
        alarmHour = 0;
      }
    }
  }

  void decrementAlarmTime(int step) {
    alarmMinute -= step;
    while (alarmMinute < 0) {
      alarmMinute += 60;
      alarmHour--;
      if (alarmHour < 0) {
        alarmHour = 23;
      }
    }
  }

  void checkAlarm() {
    DateTime now = rtc.now();

    static int lastMinuteLocal = -1;
    if (lastMinuteLocal != now.minute()) {
      lastMinuteLocal = now.minute();
      alarmTriggeredThisMinute = false;
    }

    if (alarmDismissed && (now.hour() != alarmHour || now.minute() != alarmMinute)) {
      alarmDismissed = false;
    }

    // Alarm aktivieren
    if (alarmSet && !alarmActive && !alarmDismissed && !alarmTriggeredThisMinute) {
      if (now.hour() == alarmHour && now.minute() == alarmMinute) {
        alarmActive = true;
        alarmTriggeredThisMinute = true;
        Serial.println("Alarm aktiviert!");

        // WICHTIG: Timer zurücksetzen
        lastAudioTime = 0; 
        audioPlaying = false;
      }
    }


    // 1) Alarm ausschalten per Taster
    if (alarmActive && encoder.isButtonPressed()) {
      // STOP-Signal
      digitalWrite(STOP_PIN, HIGH);
      delay(300);
      digitalWrite(STOP_PIN, LOW);

      alarmActive = false;
      alarmDismissed = true;
      Serial.println("Alarm ausgeschaltet (Taster).");

      stopTrack();
      audioPlaying = false;
      lastAudioTime = millis();
    }

    // 2) Alarm ausschalten per Highscore
    if (alarmActive && dualSensor.isHighscoreFinished()) {
      // *** NEU: Highscore wird SOFORT gesendet, bevor Alarm = false ***
      Serial.println("Sensor2 hat Alarm ausgeschaltet -> Highscore senden...");
      sendHighscoreIfNeeded();

      // Dann STOP-Signal
      digitalWrite(STOP_PIN, HIGH);
      delay(300);
      digitalWrite(STOP_PIN, LOW);

      alarmActive = false;
      alarmDismissed = true;
      Serial.println("Alarm ausgeschaltet (Highscore).");

      stopTrack();
      audioPlaying = false;
      lastAudioTime = millis();
    }
  }

  void startTrack() {
    Serial.println("startTrack() -> DFPlayer PLAY");
    // Falls STOP_PIN noch HIGH, auf LOW
    digitalWrite(STOP_PIN, LOW);
    digitalWrite(PLAY_PIN, LOW);
    delay(50);

    // PLAY_PIN HIGH ~300ms
    digitalWrite(PLAY_PIN, HIGH);
    delay(300);
    digitalWrite(PLAY_PIN, LOW);
  }

  void stopTrack() {
    Serial.println("stopTrack() -> DFPlayer STOP");
    // PLAY_PIN low
    digitalWrite(PLAY_PIN, LOW);

    // STOP_PIN high 500ms
    digitalWrite(STOP_PIN, HIGH);
    delay(500);
    digitalWrite(STOP_PIN, LOW);
  }
};

// -----------------------------------------------------
// 7) Klasse: MenuManager
// -----------------------------------------------------
class MenuManager {
private:
  enum MenuState { NORMAL, SELECTION, SET_ALARM, SET_BRIGHTNESS };
  MenuState menuState = NORMAL;
  RotaryEncoderWithButton& encoder;
  DisplayManager& displayManager;
  AlarmManager& alarmManager;
  unsigned long menuStartTime = 0;
  unsigned long menuTimeout = 10000;
  int currentMode = 1;
  int brightnessLevel;
  bool inSubMenu = false;

public:
  MenuManager(RotaryEncoderWithButton& encoder, DisplayManager& displayManager, AlarmManager& alarmManager)
    : encoder(encoder), displayManager(displayManager), alarmManager(alarmManager) {
    brightnessLevel = displayManager.getBrightnessLevel();
  }

  void update() {
    switch (menuState) {
      case NORMAL:
        handleNormalMode();
        break;
      case SELECTION:
        handleSelectionMode();
        break;
      case SET_ALARM:
        if (!alarmManager.updateAlarmSetting()) {
          menuState = NORMAL;
          displayManager.setDisplayOccupied(false);
        }
        break;
      case SET_BRIGHTNESS:
        handleBrightnessSetting();
        break;
    }
  }

private:
  void handleNormalMode() {
    if (alarmManager.isAlarmActive()) {
      return;
    }
    if (encoder.isButtonPressed()) {
      Serial.println("Button pressed in NORMAL mode");
      menuState = SELECTION;
      menuStartTime = millis();
      displayManager.setDisplayOccupied(true);
      displayManager.showModeNumber(currentMode);
      encoder.resetEncoderPosition();
      Serial.println("Eingang in den Auswahlmodus");
    }
  }

  void handleSelectionMode() {
    if (millis() - menuStartTime > menuTimeout) {
      menuState = NORMAL;
      displayManager.clearModeDisplay();
      displayManager.setDisplayOccupied(false);
      Serial.println("Timeout im Auswahlmodus, Rückkehr zum Normalmodus");
    } else {
      int rotation = encoder.readEncoder();
      if (rotation != 0) {
        menuStartTime = millis();
        currentMode += rotation;
        if (currentMode < 1) currentMode = 2;
        if (currentMode > 2) currentMode = 1;
        displayManager.showModeNumber(currentMode);
        Serial.print("Aktueller Modus im Auswahlmodus: ");
        Serial.println(currentMode);
      }
      if (encoder.isButtonPressed()) {
        Serial.println("Button pressed in SELECTION mode");
        if (currentMode == 1) {
          menuState = SET_ALARM;
          alarmManager.startAlarmSetting();
          Serial.println("Wechsel in den Weckzeit-Einstellmodus");
        } else if (currentMode == 2) {
          menuState = SET_BRIGHTNESS;
          encoder.resetEncoderPosition();
          brightnessLevel = displayManager.getBrightnessLevel();
          displayManager.showBrightnessLevel(brightnessLevel);
          Serial.println("Wechsel in den Helligkeit-Einstellmodus");
        }
        menuStartTime = millis();
      }
    }
  }

  void handleBrightnessSetting() {
    if (millis() - menuStartTime > menuTimeout) {
      menuState = NORMAL;
      displayManager.clearModeDisplay();
      displayManager.setDisplayOccupied(false);
      Serial.println("Timeout im Helligkeit-Einstellmodus");
    } else {
      int rotation = encoder.readEncoder();
      if (rotation != 0) {
        menuStartTime = millis();
        brightnessLevel += rotation;
        if (brightnessLevel < 1) brightnessLevel = 1;
        if (brightnessLevel > 10) brightnessLevel = 10;
        displayManager.setBrightnessLevel(brightnessLevel);
        displayManager.showBrightnessLevel(brightnessLevel);
        Serial.print("Aktuelle Helligkeitsstufe: ");
        Serial.println(brightnessLevel);
      }
      if (encoder.isButtonPressed()) {
        Serial.println("Button pressed in SET_BRIGHTNESS mode");
        menuState = NORMAL;
        displayManager.clearModeDisplay();
        displayManager.setDisplayOccupied(false);
        Serial.println("Helligkeitseinstellung gespeichert");
        lastDisplayedMinutes = -1;
      }
    }
  }
};

// -----------------------------------------------------
// 8) Globale Objekte
// -----------------------------------------------------
DualUltrasonicSensor dualSensor(TRIG_PIN_1, ECHO_PIN_1, TRIG_PIN_2, ECHO_PIN_2);
DisplayManager displayManager(CLK_PIN, DIO_PIN);
HighscoreCalculator highscoreCalculator;
RotaryEncoderWithButton encoder(ENCODER_CLK, ENCODER_DT, ENCODER_SW);
AlarmManager alarmManager(rtc, displayManager, encoder, dualSensor);
MenuManager menuManager(encoder, displayManager, alarmManager);

// Sensor-Intervalle
unsigned long previousSensorMillis = 0;
const long sensorInterval = 1000;

// Server-Intervalle
unsigned long lastServerCheck = 0;
const long serverCheckInterval = 10000;

// -----------------------------------------------------
// setup()
// -----------------------------------------------------
void setup() {
  Serial.begin(9600);
  Wire.begin();

  if (!rtc.begin()) {
    Serial.println("RTC nicht gefunden!");
    while (1);
  }
  // Folgende Zeile NUR EINMAL oder zum Setzen der korrekten Zeit,
  // danach auskommentieren!
  //rtc.adjust(DateTime(F(__DATE__), F(__TIME__)));

  DateTime now = rtc.now();
  Serial.print("RTC aktualisiert: ");
  Serial.print(now.year(), DEC);
  Serial.print('-');
  Serial.print(now.month(), DEC);
  Serial.print('-');
  Serial.print(now.day(), DEC);
  Serial.print(' ');
  Serial.print(now.hour(), DEC);
  Serial.print(':');
  Serial.print(now.minute(), DEC);
  Serial.print(':');
  Serial.print(now.second(), DEC);
  Serial.println();

  pinMode(PLAY_PIN, OUTPUT);
  digitalWrite(PLAY_PIN, LOW);
  pinMode(STOP_PIN, OUTPUT);
  digitalWrite(STOP_PIN, LOW);

  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  Serial.println("Verbinde mit WLAN...");
  int status = WL_IDLE_STATUS;
  while (status != WL_CONNECTED) {
    status = WiFi.begin(ssid, pass);
    delay(1000);
    Serial.print(".");
  }
  Serial.println("\nVerbunden mit WLAN!");
  Serial.print("IP-Adresse: ");
  Serial.println(WiFi.localIP());

  Serial.println("Setup abgeschlossen. System bereit.");
}

// -----------------------------------------------------
// loop()
// -----------------------------------------------------
void loop() {
  unsigned long currentMillis = millis();

  // Ultraschallsensoren
  if (currentMillis - previousSensorMillis >= sensorInterval) {
    previousSensorMillis = currentMillis;
    dualSensor.updateUltrasonicSensor(alarmManager.isAlarmActive());
  }

  // Uhrzeit / Display
  if (currentMillis - previousMillis >= interval) {
    previousMillis = currentMillis;
    DateTime now = rtc.now();
    int hours = now.hour();
    int minutes = now.minute();
    if (minutes != lastDisplayedMinutes) {
      displayManager.showTime(hours, minutes);
      lastDisplayedMinutes = minutes;
    }
  }

  menuManager.update();
  alarmManager.update();
  displayManager.update();

  // LED an/aus
  if (alarmManager.isAlarmActive() && dualSensor.isSensor1HighSignal()) {
    digitalWrite(LED_PIN, HIGH);
  } else {
    digitalWrite(LED_PIN, LOW);
  }

  // Regelmäßige Server-Abfragen
  if (currentMillis - lastServerCheck >= serverCheckInterval) {
    lastServerCheck = currentMillis;
    checkServerForAlarmTime();
    sendHighscoreIfNeeded();  // Hier weiterhin fürs "manuelle" Nachreichen
  }
}

// ----------------------------------------------------------------------------
// 9) Alarmzeit vom Server abrufen (GET /api/alarmTime)
// ----------------------------------------------------------------------------
void checkServerForAlarmTime() {
  if (client.connect(server, 80)) {
    client.print("GET /api/alarmTime HTTP/1.1\r\n");
    client.print("Host: ");
    client.print(server);
    client.print("\r\nConnection: close\r\n\r\n");

    unsigned long start = millis();
    while (client.available() == 0) {
      if (millis() - start > 5000) {
        Serial.println(">>> Timeout bei alarmTime-GET.");
        client.stop();
        return;
      }
    }

    String response;
    while (client.available()) {
      response += client.readString();
    }
    client.stop();

    int index = response.indexOf("\"alarmTime\":\"");
    if (index >= 0) {
      int startPos = index + 13;
      int endPos = response.indexOf("\"", startPos);
      if (endPos > startPos) {
        String alarmTimeStr = response.substring(startPos, endPos);
        Serial.print("Alarmzeit aus Server-Response: ");
        Serial.println(alarmTimeStr);

        int sep = alarmTimeStr.indexOf(":");
        if (sep >= 0) {
          String hourStr = alarmTimeStr.substring(0, sep);
          String minStr = alarmTimeStr.substring(sep + 1);
          int h = hourStr.toInt();
          int m = minStr.toInt();
          alarmManager.setAlarmTime(h, m);
        }
      }
    }
  } else {
    Serial.println("Verbindung zu Server fehlgeschlagen (GET /api/alarmTime).");
  }
}

// ----------------------------------------------------------------------------
// 10) Highscore an Server schicken (POST /api/highscore)
// ----------------------------------------------------------------------------
void sendHighscoreIfNeeded() {
  if (dualSensor.isHighscoreFinished()) {
    int highscore = dualSensor.getLastCalculatedHighscore();
    unsigned long elapsedSec = dualSensor.getElapsedTimeSec();
    unsigned long usedMin = elapsedSec / 60;
    unsigned long usedSec = elapsedSec % 60;

    Serial.print("Sende Highscore an Server: ");
    Serial.println(highscore);
    Serial.print("Benötigte Zeit: ");
    Serial.print(usedMin);
    Serial.print("min ");
    Serial.print(usedSec);
    Serial.println("s");

    if (client.connect(server, 80)) {
      String postData = String("{\"highscore\":") + highscore +
                        String(",\"timeMin\":") + usedMin +
                        String(",\"timeSec\":") + usedSec +
                        String("}");

      client.print("POST /api/highscore HTTP/1.1\r\n");
      client.print("Host: ");
      client.print(server);
      client.print("\r\n");
      client.print("Content-Type: application/json\r\n");
      client.print("Content-Length: ");
      client.print(postData.length());
      client.print("\r\n");
      client.print("Connection: close\r\n\r\n");
      client.print(postData);

      unsigned long start = millis();
      while (client.available() == 0) {
        if (millis() - start > 5000) {
          Serial.println(">>> Timeout bei highscore-POST.");
          client.stop();
          return;
        }
      }
      while (client.available()) {
        String line = client.readStringUntil('\r');
      }
      client.stop();
      Serial.println("Highscore + Zeit erfolgreich gepostet!");
    } else {
      Serial.println("Verbindung zu Server fehlgeschlagen (POST /api/highscore).");
    }
  }
}
