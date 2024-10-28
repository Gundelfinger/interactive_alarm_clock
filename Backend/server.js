const express = require('express');
const cors = require('cors');
const app = express();
const port = 3000;

app.use(cors());  // Erlaubt Anfragen von anderen Quellen
app.use(express.json());  // Middleware, um JSON-Anfragen zu verarbeiten

// Variablen für die Weckzeit und Musik
let alarmTime = '07:00';  // Initiale Weckzeit
let selectedMusic = 'song1.mp3';
let highscore = '01:00';  // Initialer Highscore

// API-Endpunkt zum Setzen der Weckzeit und Musikauswahl von der Webanwendung
app.post('/api/setAlarm', (req, res) => {
    const { time, music } = req.body;
    alarmTime = time;  // Setze die neue Weckzeit
    selectedMusic = music;  // Setze die neue Musikauswahl
    console.log(`Weckzeit: ${alarmTime}, Musik: ${selectedMusic}`);
    res.json({ message: `Weckzeit auf ${alarmTime} gesetzt. Musik: ${selectedMusic} ausgewählt.` });
});

// API-Endpunkt zum Abrufen des aktuellen Highscores und der Weckzeit
app.get('/api/getHighscore', (req, res) => {
    res.json({ highscore, alarmTime, selectedMusic });  // Gibt Highscore, Weckzeit und Musik zurück
});

// Start des Servers
app.listen(port, () => {
    console.log(`Backend-Server läuft auf http://localhost:${port}`);
});
