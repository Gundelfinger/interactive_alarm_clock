const express = require('express');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

let arduinoData = { highscore: null };

app.post('/sendAlarm', (req, res) => {
  const { time, music } = req.body;
  if (!time || !music) {
    return res.status(400).send({ error: 'Missing time or music' });
  }
  console.log(`Received alarm time: ${time}, music: ${music}`);
  
  // Simulate communication with Arduino
  arduinoData.highscore = Math.floor(Math.random() * 100) + 1;

  res.send({ success: true });
});

app.get('/getHighscore', (req, res) => {
  if (arduinoData.highscore === null) {
    return res.status(400).send({ error: 'Highscore not available' });
  }
  res.send({ highscore: arduinoData.highscore });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
