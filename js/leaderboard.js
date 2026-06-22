// ==========================================================================
// leaderboard.js
// Firebase leaderboard functionality
// ==========================================================================

// --- Leaderboard state ---
let isShowingLeaderboard = false;

// --- Save score after winning ---
async function saveScore(name, attempts, resets) {
  const puzzleDate = PUZZLES[currentPuzzleIndex]?.date || 'unknown';
  const score = calculateScore(attempts, resets);
  
  try {
    await db.collection('leaderboards')
      .doc(puzzleDate)
      .collection('scores')
      .add({
        name: name.toUpperCase().slice(0, 3),
        attempts: attempts,
        resets: resets,
        score: score,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });
    return true;
  } catch (error) {
    console.error('Error saving score:', error);
    return false;
  }
}

// --- Calculate score ---
function calculateScore(attempts, resets) {
  // Intentos restantes (0-4) * 10 - resets
  return (TRIES_INIT - attempts) * 10 - resets;
}

// --- Load leaderboard for current puzzle ---
async function loadLeaderboard() {
  const puzzleDate = PUZZLES[currentPuzzleIndex]?.date || 'unknown';
  
  try {
    const snapshot = await db.collection('leaderboards')
      .doc(puzzleDate)
      .collection('scores')
      .orderBy('score', 'desc')
      .limit(10)
      .get();
    
    const scores = [];
    snapshot.forEach(doc => {
      scores.push({
        id: doc.id,
        ...doc.data()
      });
    });
    return scores;
  } catch (error) {
    console.error('Error loading leaderboard:', error);
    return [];
  }
}

// --- Show leaderboard UI ---
async function showLeaderboard() {
  isShowingLeaderboard = true;
  const scores = await loadLeaderboard();
  
  // Guardar estado actual del grid
  const currentGridHTML = gridEl.innerHTML;
  
  // Reemplazar contenido con leaderboard
  gridEl.classList.add('leaderboard-list');
  gridEl.innerHTML = `
    <div class="leaderboard-header">
      <h2>🏆 LEADERBOARD</h2>
      <p class="leaderboard-subtitle">${PUZZLES[currentPuzzleIndex]?.date || 'Puzzle'}</p>
    </div>
    <div class="leaderboard-table">
      ${scores.length === 0 ? '<div class="empty-leaderboard">Aún no hay puntuaciones. ¡Sé el primero!</div>' : ''}
      ${scores.map((score, index) => `
        <div class="leaderboard-row ${index === 0 ? 'first' : ''}">
          <span class="rank">#${index + 1}</span>
          <span class="name">${score.name}</span>
          <span class="score">${score.score} pts</span>
          <span class="details">${score.attempts} fallos · ${score.resets} reinicios</span>
        </div>
      `).join('')}
    </div>
    <div class="leaderboard-controls">
      <button class="btn-leaderboard-close" onclick="hideLeaderboard()">Volver al juego</button>
    </div>
  `;
  
  // Ocultar controles
  document.querySelector('.controls').style.display = 'none';
  document.getElementById('puzzleBtn').style.display = 'none';
}

// --- Hide leaderboard ---
function hideLeaderboard() {
  isShowingLeaderboard = false;
  gridEl.classList.remove('leaderboard-list');
  renderGrid();
  document.querySelector('.controls').style.display = '';
  document.getElementById('puzzleBtn').style.display = '';
}

// --- Show score submission dialog ---
function showScoreSubmission(attempts, resets) {
  const overlay = document.createElement('div');
  overlay.className = 'score-overlay';
  overlay.innerHTML = `
    <div class="score-dialog">
      <h2>🎉 ¡Puzzle completado!</h2>
      <p>Fallos: ${TRIES_INIT - attempts} | Reinicios: ${resets}</p>
      <p>Puntuación: ${calculateScore(attempts, resets)} pts</p>
      <label for="playerName">Introduce tus iniciales (3 letras):</label>
      <input type="text" id="playerName" maxlength="3" placeholder="ABC" autofocus>
      <div class="dialog-buttons">
        <button class="btn-save" onclick="submitScore()">Guardar puntuación</button>
        <button class="btn-skip" onclick="closeScoreDialog()">Omitir</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  document.getElementById('playerName').focus();
  
  // Enter key to submit
  document.getElementById('playerName').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') submitScore();
  });
}

// --- Submit score ---
async function submitScore() {
  const nameInput = document.getElementById('playerName');
  const name = nameInput.value.trim().toUpperCase() || 'AAA';
  
  // Guardar puntuación
  const success = await saveScore(name.slice(0, 3), tries, getResetCount());
  
  // Cerrar diálogo
  closeScoreDialog();
  
  if (success) {
    showMessage('¡Puntuación guardada! 🏆', 'success');
    // Mostrar leaderboard automáticamente
    setTimeout(() => showLeaderboard(), 1000);
  } else {
    showMessage('Error al guardar la puntuación', 'error');
  }
}

// --- Close score dialog ---
function closeScoreDialog() {
  const overlay = document.querySelector('.score-overlay');
  if (overlay) overlay.remove();
}

// --- Get reset count ---
let resetCount = 0;

// Modificar resetGame para contar reinicios
const originalResetGame = resetGame;
resetGame = function() {
  if (!isShowingLeaderboard) {
    resetCount++;
  }
  originalResetGame();
};