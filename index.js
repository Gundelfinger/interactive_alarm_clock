/************************************************************************
 index.js
 Node.js-Backend MIT:
   - Persistenter Highscore-Speicherung in highscores.json
   - Endpunkten:
       * POST /api/highscore (Arduino schickt Score)
       * GET /getHighscores  (Frontend holt Top-10 + letzten Score)
       * POST /sendAlarm (Frontend stellt Alarm)
       * GET /api/alarmTime (Arduino holt Alarm)
   - NEU: Distanz-Abstände für Sensor 1:
       * POST /updateSensorRange (Frontend -> minDist, maxDist)
       * GET  /getSensorRange    (Arduino -> abfragen)
*************************************************************************/
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(bodyParser.json());

// ----------------------------------------------------------------
// Globale Variablen
// ----------------------------------------------------------------
let currentAlarmTime = null; // zuletzt gesetzte Alarmzeit

// Für persistente Highscores nutzen wir eine JSON-Datei:
const HIGHSCORE_FILE = path.join(__dirname, 'highscores.json');

// Interner Speicher: Array von Objekten { score, timeMin, timeSec, timestamp }
let highscores = []; 
// lastScore-Objekt: { score, timeMin, timeSec, timestamp }
let lastScore = null; 

// NEU: Globale Variablen für Sensor1-Min/Max-Distanz (Standardwerte)
let sensor1MinDist = 20;   // z. B. 20 cm
let sensor1MaxDist = 200;  // z. B. 200 cm

// ----------------------------------------------------------------
// 1) Highscores.json beim Serverstart laden
// ----------------------------------------------------------------
function loadHighscores() {
  try {
    if (fs.existsSync(HIGHSCORE_FILE)) {
      const data = fs.readFileSync(HIGHSCORE_FILE, 'utf8');
      highscores = JSON.parse(data);
      console.log('Highscores aus Datei geladen:', highscores);
      if (highscores.length > 0) {
        // Letzter Eintrag in der Datei als "lastScore"
        lastScore = highscores[highscores.length - 1];
      }
    } else {
      highscores = [];
    }
  } catch (err) {
    console.error('Fehler beim Laden der Highscore-Datei:', err);
    highscores = [];
  }
}

// ----------------------------------------------------------------
// 2) Highscores.json sichern (überschreiben)
// ----------------------------------------------------------------
function saveHighscores() {
  try {
    fs.writeFileSync(HIGHSCORE_FILE, JSON.stringify(highscores, null, 2), 'utf8');
    console.log('Highscores in Datei geschrieben.');
  } catch (err) {
    console.error('Fehler beim Speichern der Highscore-Datei:', err);
  }
}

// Beim Serverstart einmalig laden
loadHighscores();

// ----------------------------------------------------------------
// Statische Dateien aus "frontend"-Ordner
app.use(express.static(path.join(__dirname, 'frontend')));

// Root -> index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// ----------------------------------------------------------------
// POST /sendAlarm (Frontend stellt Weckzeit ein)
// ----------------------------------------------------------------
app.post('/sendAlarm', (req, res) => {
  const { time } = req.body;
  if (!time) {
    return res.status(400).send({ error: 'Missing time' });
  }
  console.log(`Received alarm time from Frontend: ${time}`);
  currentAlarmTime = time;
  return res.send({ success: true });
});

// ----------------------------------------------------------------
// 3) GET /getHighscores (Top-10 + lastScore)
// ----------------------------------------------------------------
app.get('/getHighscores', (req, res) => {
  const sorted = [...highscores].sort((a, b) => b.score - a.score);
  const bestScores = sorted.slice(0, 10);
  res.send({
    bestScores,
    lastScore
  });
});

// ----------------------------------------------------------------
// 4) GET /api/alarmTime -> Arduino holt die aktuelle Weckzeit
// ----------------------------------------------------------------
app.get('/api/alarmTime', (req, res) => {
  const alarmTimeString = currentAlarmTime || "00:00";
  res.json({ alarmTime: alarmTimeString });
});

// ----------------------------------------------------------------
// 5) POST /api/highscore -> Arduino schickt Highscore
// ----------------------------------------------------------------
app.post('/api/highscore', (req, res) => {
  const { highscore, timeMin, timeSec } = req.body;
  if (highscore === undefined || timeMin === undefined || timeSec === undefined) {
    return res.status(400).send({ error: 'Missing data' });
  }
  console.log(`Received highscore from Arduino: ${highscore} (Zeit: ${timeMin} min, ${timeSec} s)`);

  const newEntry = {
    score: highscore,
    timeMin,
    timeSec,
    timestamp: new Date().toISOString()
  };

  lastScore = newEntry;
  highscores.push(newEntry);
  saveHighscores();

  return res.send({ success: true });
});

// ----------------------------------------------------------------
// NEU: POST /updateSensorRange
//     -> Vom Frontend bekommen wir { minDist, maxDist }
app.post('/updateSensorRange', (req, res) => {
  const { minDist, maxDist } = req.body;
  if (typeof minDist !== 'number' || typeof maxDist !== 'number') {
    return res.status(400).json({ error: 'Missing or invalid minDist/maxDist' });
  }
  console.log(`Update Sensor1 Range: min=${minDist}, max=${maxDist}`);

  sensor1MinDist = minDist;
  sensor1MaxDist = maxDist;

  return res.json({ success: true });
});

// ----------------------------------------------------------------
// NEU: GET /getSensorRange
//     -> Arduino fragt die aktuellen minDist, maxDist ab
app.get('/getSensorRange', (req, res) => {
  res.json({
    minDist: sensor1MinDist,
    maxDist: sensor1MaxDist
  });
});

// Serverstart
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
