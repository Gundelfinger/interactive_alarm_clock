const express = require('express');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

// Globale Variable für den Highscore
let highscore = null;

// Root-Endpunkt
app.get('/', (req, res) => {
  res.send('Server is running. Use /sendAlarm or /getHighscore.');
});

// Endpunkt zum Setzen eines Alarms
app.post('/sendAlarm', (req, res) => {
  const { time, music } = req.body;
  if (!time || !music) {
    return res.status(400).send({ error: 'Missing time or music' });
  }
  console.log(`Received alarm time: ${time}`);
  console.log(`Received music: ${music}`);

  // Highscore zufällig generieren und speichern
  highscore = Math.floor(Math.random() * 100) + 1;

  res.send({ success: true });
});

// Endpunkt zum Abrufen eines Highscores
app.get('/getHighscore', (req, res) => {
  if (highscore === null) {
    return res.status(400).send({ error: 'Highscore not available' });
  }
  res.send({ highscore });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
