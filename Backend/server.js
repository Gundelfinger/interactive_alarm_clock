// Importiere die benötigten Module
const mqtt = require('mqtt');

// MQTT Broker-Verbindungseinstellungen
const mqttServer = 'mqtt://broker.hivemq.com'; // HiveMQ Broker
const clientId = 'BackendClient';

// Erstelle eine Verbindung zum MQTT-Broker
const client = mqtt.connect(mqttServer, {
  clientId: clientId,
  clean: true,
  connectTimeout: 4000,
  reconnectPeriod: 1000,
});

// Wenn die Verbindung erfolgreich hergestellt wurde
client.on('connect', () => {
  console.log('Verbunden mit MQTT Broker');

  // Abonniere das Topic, um die Alarmeinstellungen vom Arduino zu empfangen
  client.subscribe('alarm/settings', (err) => {
    if (!err) {
      console.log('Abonniert: alarm/settings');
    } else {
      console.error('Fehler beim Abonnieren des Topics alarm/settings:', err);
    }
  });

  // Abonniere das Topic für Highscores
  client.subscribe('highscore', (err) => {
    if (!err) {
      console.log('Abonniert: highscore');
    } else {
      console.error('Fehler beim Abonnieren des Topics highscore:', err);
    }
  });

  // Beispiel: Schicke eine Alarmzeit an den Arduino
  sendAlarmSettings('08:00', 'song1.mp3');
});

// Wenn eine Nachricht empfangen wird
client.on('message', (topic, message) => {
  // Die Nachricht ist ein Buffer, daher in String umwandeln
  const msg = message.toString();
  console.log(`Nachricht erhalten [${topic}]: ${msg}`);

  // Verarbeite die Nachricht entsprechend dem Topic
  if (topic === 'alarm/settings') {
    console.log('Alarmeinstellungen vom Arduino empfangen:', msg);
  } else if (topic === 'highscore') {
    console.log('Highscore vom Arduino empfangen:', msg);
  }
});

// Funktion zum Senden der Alarmzeit an das Arduino-Topic
function sendAlarmSettings(time, music) {
  const message = JSON.stringify({ alarmTime: time, selectedMusic: music });
  client.publish('alarm/settings', message, (err) => {
    if (err) {
      console.error('Fehler beim Senden der Alarmeinstellungen:', err);
    } else {
      console.log('Alarmeinstellungen erfolgreich gesendet:', message);
    }
  });
}

// Fehlerbehandlung für Verbindungsprobleme
client.on('error', (err) => {
  console.error('MQTT Verbindungsfehler:', err);
});

client.on('offline', () => {
  console.log('MQTT ist offline. Versuche erneut zu verbinden...');
});

client.on('reconnect', () => {
  console.log('MQTT versucht, die Verbindung erneut herzustellen...');
});
