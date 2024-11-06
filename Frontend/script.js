// JavaScript-Datei (script.js)
// Funktion zum Senden der Weckzeit und Musikauswahl an das Backend
document.getElementById('alarmForm').addEventListener('submit', function (event) {
  event.preventDefault(); // Verhindert den Seitenreload

  // Erfasse die Werte aus den Eingabefeldern
  const time = document.getElementById('time').value;
  const music = document.getElementById('music').value;

  // Sende die Daten als POST-Anfrage an das Backend
  fetch('http://localhost:3000/api/setAlarm', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ time: time, music: music }),
  })
  .then(response => response.json())
  .then(data => {
    console.log('Erfolg:', data);
    alert('Wecker erfolgreich gesetzt!');
  })
  .catch((error) => {
    console.error('Fehler:', error);
  });
});

// Funktion zum Abrufen des Highscores
document.getElementById('refreshHighscore').addEventListener('click', function () {
  fetch('http://localhost:3000/api/getHighscore')
  .then(response => response.json())
  .then(data => {
    document.getElementById('highscore').textContent = data.highscore;
  })
  .catch((error) => {
    console.error('Fehler beim Abrufen des Highscores:', error);
  });
});

