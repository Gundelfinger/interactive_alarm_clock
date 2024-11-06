// Funktion zum Senden der Weckzeit und Musikauswahl
document.getElementById('alarmForm').addEventListener('submit', function(event) {
  event.preventDefault();  // Verhindert den Seitenreload

  // Erfasse die Werte aus den Eingabefeldern
  const time = document.getElementById('time').value;
  const music = document.getElementById('music').value;

  // Sende die Daten an das Backend
  fetch('http://192.168.0.139:3000/api/setAlarm', {  // Aktualisierte IP-Adresse des Backends
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ time: time, music: music }),  // Daten im JSON-Format senden
  })
  .then(response => response.json())  // Die Antwort des Servers in JSON umwandeln
  .then(data => {
    console.log('Erfolg:', data);  // Rückmeldung des Servers anzeigen
    alert(data.message);  // Zeigt eine Bestätigung für den Benutzer
  })
  .catch((error) => {
    console.error('Fehler:', error);  // Fehlerbehandlung
  });
});

// Funktion zum Abrufen des Highscores
document.getElementById('refreshHighscore').addEventListener('click', function() {
  // Sende eine GET-Anfrage an das Backend, um den Highscore abzurufen
  fetch('http://192.168.0.139:3000/api/getHighscore')
  .then(response => response.json())  // Die Antwort in JSON umwandeln
  .then(data => {
    // Den erhaltenen Highscore im HTML anzeigen
    document.getElementById('highscore').textContent = data.highscore;
  })
  .catch((error) => {
    console.error('Fehler beim Abrufen des Highscores:', error);  // Fehlerbehandlung
  });
});

