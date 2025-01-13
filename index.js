/************************************************************************
 index.js
 Node.js-Backend mit:
   - Persistenter Highscore-Speicherung in highscores.json
   - Endpunkten für:
       * POST /api/highscore (Arduino schickt Score)
       * GET /getHighscores  (Frontend holt Top-10 + letzten Score)
       * "normale" Alarm-Endpunkte wie /sendAlarm (optional)
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

// Für persistente Highscores nutzen wir eine JSON-Datei
const HIGHSCORE_FILE = path.join(__dirname, 'highscores.json');

// Interner Speicher: Array von Objekten { score, timeMin, timeSec, timestamp }
let highscores = []; 
// lastScore-Objekt: { score, timeMin, timeSec, timestamp }
let lastScore = null; 

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
        // letzter Eintrag in der Datei als "lastScore"
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
// (hier liegen index.html, script.js, styles.css, ...)
app.use(express.static(path.join(__dirname, 'frontend')));

// Root -> index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// ----------------------------------------------------------------
// Beispiel: POST /sendAlarm (Frontend stellt Weckzeit ein)
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
// 3) GET /getHighscores
//    -> Liefert Top-10 Liste + lastScore
// ----------------------------------------------------------------
app.get('/getHighscores', (req, res) => {
  // Sortiere absteigend nach "score"
  const sorted = [...highscores].sort((a, b) => b.score - a.score);
  // Top 10
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
// 5) POST /api/highscore
//    -> Arduino schickt Highscore: { "highscore":..., "timeMin":..., "timeSec":... }
// ----------------------------------------------------------------
app.post('/api/highscore', (req, res) => {
  const { highscore, timeMin, timeSec } = req.body;
  if (highscore === undefined || timeMin === undefined || timeSec === undefined) {
    return res.status(400).send({ error: 'Missing data' });
  }
  console.log(`Received highscore from Arduino: ${highscore} (Zeit: ${timeMin} min, ${timeSec} s)`);

  // 1) Neuen Datensatz anlegen
  const newEntry = {
    score: highscore,
    timeMin,
    timeSec,
    timestamp: new Date().toISOString()
  };

  // 2) "lastScore" aktualisieren
  lastScore = newEntry;

  // 3) ins "highscores"-Array pushen
  highscores.push(newEntry);
  // 4) in Datei speichern
  saveHighscores();

  return res.send({ success: true });
});

// ----------------------------------------------------------------
// Serverstart
// ----------------------------------------------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
