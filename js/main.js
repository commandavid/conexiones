// ==========================================================================
// main.js
// Wires up event listeners and boots the app. Loaded last, after every
// other script has defined the functions/state it depends on.
// ==========================================================================

// --- Event Listeners ---

puzzleBtn.addEventListener('click', () => {
    if (typeof PUZZLES === 'undefined') return;
    if (!isShowingPuzzleList) showPuzzleList(); else hidePuzzleList();
});

// Leaderboard button
const leaderboardBtn = document.getElementById('leaderboardBtn');
if (leaderboardBtn) {
    leaderboardBtn.addEventListener('click', () => {
        if (isShowingPuzzleList) return;
        if (isShowingLeaderboard) {
            hideLeaderboard();
        } else {
            showLeaderboard();
        }
    });
}

acceptBtn.addEventListener("click", checkAnswer);
resetBtn.addEventListener("click", resetGame);

// --- Initialization ---

loadSolvedFromSession();

// Choose latest puzzle chronologically if puzzles are available
if (typeof PUZZLES !== 'undefined' && PUZZLES.length) {
    currentPuzzleIndex = findLatestPuzzleIndex();
}

// Inicializar
// Si hay un archivo de puzzles, cargar el puzzle más reciente por defecto
if (typeof PUZZLES !== 'undefined') {
    loadPuzzle(currentPuzzleIndex);
} else {
    resetGame();
}

// --- Leaderboard functions (exposed globally) ---

// Submit score from dialog
async function submitScore() {
    const nameInput = document.getElementById('playerName');
    const name = nameInput.value.trim().toUpperCase() || 'AAA';
    
    // Guardar puntuación
    const success = await saveScore(name.slice(0, 3), tries, resetCount);
    
    // Cerrar diálogo
    closeScoreDialog();
    
    if (success) {
        showMessage('¡Puntuación guardada! 🏆', 'success');
        // Mostrar leaderboard automáticamente después de un momento
        setTimeout(() => {
            showLeaderboard();
        }, 1000);
    } else {
        showMessage('Error al guardar la puntuación', 'error');
    }
}

// Show leaderboard
async function showLeaderboard() {
    if (isShowingPuzzleList) return;
    
    isShowingLeaderboard = true;
    const scores = await loadLeaderboard();
    
    // Ocultar controles
    document.querySelector('.controls').style.display = 'none';
    document.getElementById('puzzleBtn').style.display = 'none';
    if (leaderboardBtn) leaderboardBtn.style.display = 'none';
    
    renderLeaderboard(scores);
}

// Hide leaderboard
function hideLeaderboard() {
    isShowingLeaderboard = false;
    gridEl.classList.remove('leaderboard-list');
    renderGrid();
    document.querySelector('.controls').style.display = '';
    document.getElementById('puzzleBtn').style.display = '';
    if (leaderboardBtn) leaderboardBtn.style.display = '';
}

// Expose functions globally for inline onclick handlers
window.submitScore = submitScore;
window.showLeaderboard = showLeaderboard;
window.hideLeaderboard = hideLeaderboard;
window.closeScoreDialog = closeScoreDialog;