const mqtt = require('mqtt');
const express = require('express');
const bodyParser = require('body-parser');

// MQTT Broker-Verbindungseinstellungen
const mqttServer = 'mqtt://broker.hivemq.com'; // HiveMQ Broker
const clientId = 'BackendClient_' + Math.random().toString(16).substr(2, 8);

// Erstelle eine MQTT-Verbindung
const client = mqtt.connect(mqttServer, {
  clientId: clientId,
  clean: true,
  connectTimeout: 4000,
  reconnectPeriod: 1000,
});

// Verbinde mit dem MQTT-Broker und abonniere notwendige Topics
client.on('connect', () => {
  console.log('Verbunden mit MQTT Broker');

  // Abonniere das Topic für den Highscore
  client.subscribe('highscore', (err) => {
    if (!err) {
      console.log('Highscore-Topic abonniert');
    } else {
      console.error('Fehler beim Abonnieren des Highscore-Topics:', err);
    }
  });
});

// Event-Handler für empfangene Nachrichten
client.on('message', (topic, message) => {
  if (topic === 'highscore') {
    console.log(`Highscore empfangen: ${message.toString()}`);
    currentHighscore = message.toString(); // Speichert den aktuellen Highscore
  }
});

// Express Server erstellen
const app = express();
const port = 3000;

// Middleware
app.use(bodyParser.json());

// Speicher für den aktuellen Highscore und Alarmdaten
let currentHighscore = '--:--';

// REST API zum Setzen der Alarmzeit
app.post('/api/setAlarm', (req, res) => {
  const { time, music } = req.body;

  // Nachricht formatieren und an den Broker senden
  const message = JSON.stringify({ alarmTime: time, selectedMusic: music });
  client.publish('alarm/settings', message, (err) => {
    if (err) {
      console.error('Fehler beim Senden der Alarmeinstellungen:', err);
      res.status(500).send({ error: 'Fehler beim Setzen der Weckzeit.' });
    } else {
      console.log('Alarmeinstellungen gesendet:', message);
      res.send({ message: `Wecker erfolgreich auf ${time} mit ${music} gesetzt.` });
    }
  });
});

// REST API zum Abrufen des Highscores
app.get('/api/getHighscore', (req, res) => {
  res.send({ highscore: currentHighscore });
});

// Server starten
app.listen(port, () => {
  console.log(`Backend-Server läuft auf http://localhost:${port}`);
});
