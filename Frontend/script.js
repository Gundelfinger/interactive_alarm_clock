document.getElementById('alarmForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const time = document.getElementById('time').value;
    const music = document.getElementById('music').value;
  
    try {
      const response = await fetch('/sendAlarm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ time, music }),
      });
      const result = await response.json();
      if (result.success) {
        alert('Weckzeit erfolgreich gesendet!');
      } else {
        alert('Fehler beim Senden der Weckzeit');
      }
    } catch (error) {
      console.error('Error sending alarm:', error);
    }
  });
  
  document.getElementById('refreshHighscore').addEventListener('click', async () => {
    try {
      const response = await fetch('/getHighscore');
      const data = await response.json();
      if (data.highscore !== undefined) {
        document.getElementById('highscore').innerText = data.highscore;
      } else {
        alert('Highscore nicht verfügbar');
      }
    } catch (error) {
      console.error('Error fetching highscore:', error);
    }
  });
  