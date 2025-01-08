const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
app.use(bodyParser.json());

// ************************************
// Globale Variablen für Alarmzeit/Highscore
// ************************************
let currentAlarmTime = null;     // wird auf "HH:MM" gesetzt
let globalHighscore = 0;         // letzter Highscore vom Arduino

// Statische Dateien aus "frontend"-Ordner bereitstellen
app.use(express.static(path.join(__dirname, 'frontend')));

// Root-Endpunkt -> index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// POST /sendAlarm -> wird vom Frontend aufgerufen, wenn User eine neue Alarmzeit einstellt
app.post('/sendAlarm', (req, res) => {
  const { time } = req.body;
  if (!time) {
    return res.status(400).send({ error: 'Missing time' });
  }
  console.log(`Received alarm time from Frontend: ${time}`);
  currentAlarmTime = time;  // Speichere in globaler Variable
  // Schicke Erfolg zurück
  return res.send({ success: true });
});

// GET /getHighscore -> vom Frontend um Highscore zu holen
app.get('/getHighscore', (req, res) => {
  // Hier wird jetzt der echte globalHighscore zurückgegeben
  res.send({ highscore: globalHighscore });
});

// ************************************
// NEU: Der Arduino ruft GET /api/alarmTime auf
//      und erhält die aktuelle Alarmzeit als JSON
// ************************************
app.get('/api/alarmTime', (req, res) => {
  // Falls noch keine Alarmzeit gesetzt: Default auf "00:00"
  const alarmTimeString = currentAlarmTime || "00:00";
  res.json({ alarmTime: alarmTimeString });
});

// ************************************
// NEU: Der Arduino schickt hier per POST /api/highscore
//      seinen neuen Highscore
// ************************************
app.post('/api/highscore', (req, res) => {
  const { highscore } = req.body;
  if (highscore === undefined) {
    return res.status(400).send({ error: 'Missing highscore' });
  }
  console.log(`Received highscore from Arduino: ${highscore}`);
  globalHighscore = highscore; // Globale Variable aktualisieren
  return res.send({ success: true });
});

// Starte den Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

