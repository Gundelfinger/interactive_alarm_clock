// Funktion zum Senden der Weckzeit und Musikauswahl
document.getElementById('alarmForm').addEventListener('submit', function(event) {
  event.preventDefault();  // Verhindert den Seitenreload

  // Erfasse die Werte aus den Eingabefeldern
  const time = document.getElementById('time').value;
  const music = document.getElementById('music').value;

  // Sende die Daten an das Backend
  fetch('http://localhost:3000/api/setAlarm', {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',
      },
      body: JSON.stringify({ time: time, music: music }),
  })
  .then(response => {
      if (!response.ok) {
          throw new Error('Netzwerkantwort war nicht ok');
      }
      return response.json();
  })
  .then(data => {
      alert(data.message);
  })
  .catch((error) => {
      console.error('Fehler:', error);
      alert('Fehler beim Senden der Weckzeit. Überprüfen Sie die Verbindung.');
  });
});

// Funktion zum Abrufen des Highscores
document.getElementById('refreshHighscore').addEventListener('click', function() {
  fetch('http://localhost:3000/api/getHighscore')
  .then(response => {
      if (!response.ok) {
          throw new Error('Netzwerkantwort war nicht ok');
      }
      return response.json();
  })
  .then(data => {
      document.getElementById('highscore').textContent = data.highscore;
  })
  .catch((error) => {
      console.error('Fehler beim Abrufen des Highscores:', error);
      alert('Fehler beim Abrufen des Highscores. Überprüfen Sie die Verbindung.');
  });
});
