const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
app.use(bodyParser.json());

// Statische Dateien aus dem "frontend"-Ordner bereitstellen
app.use(express.static(path.join(__dirname, 'frontend')));

// Root-Endpunkt, der auf die Frontend-Dateien verweist
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// API-Endpunkt: POST /sendAlarm
app.post('/sendAlarm', (req, res) => {
  const { time, music } = req.body;
  if (!time || !music) {
    return res.status(400).send({ error: 'Missing time or music' });
  }
  console.log(`Received alarm time: ${time}`);
  console.log(`Received music: ${music}`);

  const highscore = Math.floor(Math.random() * 100) + 1;
  res.send({ success: true, highscore });
});

// API-Endpunkt: GET /getHighscore
app.get('/getHighscore', (req, res) => {
  const highscore = Math.floor(Math.random() * 100) + 1;
  res.send({ highscore });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
