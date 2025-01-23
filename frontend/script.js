/************************************************************************
 script.js
 Frontend-Logik:
   - Alarmzeit setzen (POST /sendAlarm)
   - Highscore-Liste abfragen (GET /getHighscores),
     dann Top-10 & lastScore anzeigen
************************************************************************/

// 1) Alarmzeit ins Backend senden
document.getElementById('alarmForm').addEventListener('submit', async (e) => {
  e.preventDefault(); // Verhindert das Neuladen der Seite
  const time = document.getElementById('time').value; 
  // Holt den Wert aus dem <input type="time">

  try {
    // Schickt die Weckzeit an /sendAlarm im Backend
    const response = await fetch('/sendAlarm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ time }),
    });
    const result = await response.json();
    if (result.success) {
      alert('Weckzeit erfolgreich gesendet!');
    } else {
      alert('Fehler beim Senden der Weckzeit');
    }
  } catch (error) {
    // Falls was mit dem Netzwerk oder Server nicht passt
    console.error('Error sending alarm:', error);
    alert('Netzwerk- oder Serverfehler.');
  }
});

// 2) Button "Highscores aktualisieren"
document.getElementById('refreshHighscore').addEventListener('click', async () => {
  // Ruft die Funktion auf, um die Highscores vom Server zu holen
  refreshHighscores();
});

// Beim Laden der Seite direkt einmal laden
window.addEventListener('DOMContentLoaded', () => {
  // Sobald das DOM bereit ist, holen wir schonmal die Highscores
  refreshHighscores();
});

// 3) Funktion, um /getHighscores zu holen und Tabelle + letzten Score zu aktualisieren
async function refreshHighscores() {
  try {
    // Fragt das Backend nach den Highscores
    const response = await fetch('/getHighscores');
    const data = await response.json();

    // data.bestScores => Array (max. 10 Einträge)
    // data.lastScore => das zuletzt erzielte Score-Objekt

    // 3a) Tabelle leeren + neu befüllen
    const tbody = document.querySelector('#highscoreTable tbody');
    tbody.innerHTML = ''; // Löscht alle bisherigen Zeilen

    if (data.bestScores && data.bestScores.length > 0) {
      // Wenn wir Einträge haben, bauen wir Zeilen für jede Highscore
      data.bestScores.forEach((item, index) => {
        const tr = document.createElement('tr');

        const tdPlatz = document.createElement('td');
        tdPlatz.textContent = (index + 1).toString(); 
        // Platz 1,2,3 ... basierend auf dem Array-Index
        tr.appendChild(tdPlatz);

        const tdScore = document.createElement('td');
        tdScore.textContent = item.score;
        tr.appendChild(tdScore);

        const tdZeit = document.createElement('td');
        tdZeit.textContent = `${item.timeMin} : ${item.timeSec}`;
        // Zeigt z. B. "1 : 28" an
        tr.appendChild(tdZeit);

        const tdDate = document.createElement('td');
        tdDate.textContent = item.timestamp 
          ? new Date(item.timestamp).toLocaleString() 
          : '---';
        // Datum in etwas lesbare Form
        tr.appendChild(tdDate);

        tbody.appendChild(tr);
      });
    } else {
      // Keine Highscores
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 4;
      td.textContent = 'Keine Highscores vorhanden';
      tr.appendChild(td);
      tbody.appendChild(tr);
    }

    // 3b) Letzter Score anzeigen
    const lastScoreDiv = document.getElementById('lastScore');
    if (data.lastScore) {
      // Zerlegt das Objekt in seine Felder
      const { score, timeMin, timeSec, timestamp } = data.lastScore;
      const dateString = timestamp ? new Date(timestamp).toLocaleString() : '---';
      // Erzeugt HTML-Code für die Anzeige
      lastScoreDiv.innerHTML = `
        <b>Score:</b> ${score}<br>
        <b>Zeit:</b> ${timeMin} : ${timeSec}<br>
        <b>Datum/Uhrzeit Eintrag:</b> ${dateString}
      `;
    } else {
      // Wenn wirklich noch gar kein Score existiert
      lastScoreDiv.textContent = 'Noch kein Score vorhanden';
    }

  } catch (error) {
    // Fängt Netzwerkfehler o. Ä. ab
    console.error('Error fetching highscores:', error);
    alert('Fehler beim Laden der Highscores');
  }
}