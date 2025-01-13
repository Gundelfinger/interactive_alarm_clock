/************************************************************************
 script.js
 Frontend-Logik:
   - Alarmzeit setzen (POST /sendAlarm)
   - Highscore-Liste abfragen (GET /getHighscores), 
     dann Top-10 & lastScore anzeigen
************************************************************************/

// 1) Alarmzeit ins Backend senden
document.getElementById('alarmForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const time = document.getElementById('time').value;

  try {
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
    console.error('Error sending alarm:', error);
    alert('Netzwerk- oder Serverfehler.');
  }
});

// 2) Button "Highscores aktualisieren"
document.getElementById('refreshHighscore').addEventListener('click', async () => {
  refreshHighscores();
});

// Beim Laden der Seite direkt einmal laden
window.addEventListener('DOMContentLoaded', () => {
  refreshHighscores();
});

// 3) Funktion, um /getHighscores zu holen und Tabelle + letzten Score zu aktualisieren
async function refreshHighscores() {
  try {
    const response = await fetch('/getHighscores');
    const data = await response.json();

    // data.bestScores => Array (max. 10 Einträge)
    // data.lastScore => das zuletzt erzielte Score-Objekt

    // 3a) Tabelle leeren + neu befüllen
    const tbody = document.querySelector('#highscoreTable tbody');
    tbody.innerHTML = '';

    if (data.bestScores && data.bestScores.length > 0) {
      data.bestScores.forEach((item, index) => {
        const tr = document.createElement('tr');

        const tdPlatz = document.createElement('td');
        tdPlatz.textContent = (index + 1).toString();
        tr.appendChild(tdPlatz);

        const tdScore = document.createElement('td');
        tdScore.textContent = item.score;
        tr.appendChild(tdScore);

        const tdZeit = document.createElement('td');
        tdZeit.textContent = `${item.timeMin} : ${item.timeSec}`;
        tr.appendChild(tdZeit);

        const tdDate = document.createElement('td');
        tdDate.textContent = item.timestamp 
          ? new Date(item.timestamp).toLocaleString() 
          : '---';
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
      const { score, timeMin, timeSec, timestamp } = data.lastScore;
      const dateString = timestamp ? new Date(timestamp).toLocaleString() : '---';
      lastScoreDiv.innerHTML = `
        <b>Score:</b> ${score}<br>
        <b>Zeit:</b> ${timeMin} : ${timeSec}<br>
        <b>Datum/Uhrzeit Eintrag:</b> ${dateString}
      `;
    } else {
      lastScoreDiv.textContent = 'Noch kein Score vorhanden';
    }

  } catch (error) {
    console.error('Error fetching highscores:', error);
    alert('Fehler beim Laden der Highscores');
  }
}
