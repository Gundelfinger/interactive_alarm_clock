const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
app.use(bodyParser.json());

// Globale Variablen für Alarmzeit / Highscore
let currentAlarmTime = null;
let globalHighscore = 0;
let globalTimeMin = 0;
let globalTimeSec = 0;

// Statische Dateien aus "frontend"-Ordner (oder wie dein Ordner heißt)
app.use(express.static(path.join(__dirname, 'frontend')));

// Root-Endpunkt -> index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// POST /sendAlarm -> vom Frontend (User stellt Alarm ein)
app.post('/sendAlarm', (req, res) => {
  const { time } = req.body;
  if (!time) {
    return res.status(400).send({ error: 'Missing time' });
  }
  console.log(`Received alarm time from Frontend: ${time}`);
  currentAlarmTime = time;
  return res.send({ success: true });
});

// GET /getHighscore -> vom Frontend -> liefert Highscore + Zeit
app.get('/getHighscore', (req, res) => {
  res.send({
    highscore: globalHighscore,
    timeMin: globalTimeMin,
    timeSec: globalTimeSec
  });
});

// NEU: Arduino holt hier die Alarmzeit ab
app.get('/api/alarmTime', (req, res) => {
  const alarmTimeString = currentAlarmTime || "00:00";
  res.json({ alarmTime: alarmTimeString });
});

// NEU: Arduino schickt hier Highscore + Zeit in Min/Sec
app.post('/api/highscore', (req, res) => {
  const { highscore, timeMin, timeSec } = req.body;
  if (highscore === undefined || timeMin === undefined || timeSec === undefined) {
    return res.status(400).send({ error: 'Missing data' });
  }
  console.log(`Received highscore from Arduino: ${highscore}`);
  console.log(`Time used: ${timeMin} min, ${timeSec} sec`);

  // Speichern in globalen Variablen
  globalHighscore = highscore;
  globalTimeMin = timeMin;
  globalTimeSec = timeSec;

  return res.send({ success: true });
});

// Server-Start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
