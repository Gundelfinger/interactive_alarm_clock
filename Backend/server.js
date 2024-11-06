const express = require('express');
const cors = require('cors');
const app = express();
const port = 3000;

// Middleware-Konfiguration
app.use(cors()); // Erlaubt Anfragen von anderen Quellen
app.use(express.json()); // Middleware, um JSON-Anfragen zu verarbeiten

// Dummy-Daten für den Highscore, Weckzeit und Musik
let highscore = '00:00';
let alarmTime = '07:00';
let selectedMusic = 'song1.mp3';

// API-Endpunkt zum Empfangen des Highscores vom Arduino
app.post('/api/submitHighscore', (req, res) => {
    const { highscore: receivedHighscore } = req.body;
    highscore = receivedHighscore; // Speichere den empfangenen Highscore
    console.log(`Empfangener Highscore vom Arduino: ${highscore}`);
    res.json({ message: `Highscore ${highscore} erfolgreich empfangen` });
});

// API-Endpunkt für den Arduino, um die Weckzeit und Musiktitel zu erhalten
app.get('/api/getAlarmSettings', (req, res) => {
    res.json({ alarmTime, selectedMusic });
});

// API-Endpunkt zum Setzen der Weckzeit und Musikauswahl von der Webanwendung
app.post('/api/setAlarm', (req, res) => {
    const { time, music } = req.body;
    alarmTime = time;  // Setze die neue Weckzeit
    selectedMusic = music;  // Setze die neue Musikauswahl
    console.log(`Weckzeit: ${alarmTime}, Musik: ${selectedMusic}`);
    res.json({ message: `Weckzeit auf ${alarmTime} gesetzt. Musik: ${selectedMusic} ausgewählt.` });
});

// API-Endpunkt zum Abrufen des aktuellen Highscores und der Weckzeit von der Webanwendung
app.get('/api/getHighscore', (req, res) => {
    res.json({ highscore, alarmTime, selectedMusic });  // Gibt Highscore, Weckzeit und Musik zurück
});

// Start des Servers
app.listen(port, () => {
    console.log(`Backend-Server läuft auf http://localhost:${port}`);
});
