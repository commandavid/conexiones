// ==========================================================================
// main.js
// Wires up event listeners and boots the app. Loaded last, after every
// other script has defined the functions/state it depends on.
// ==========================================================================

puzzleBtn.addEventListener('click', () => {
    if (typeof PUZZLES === 'undefined') return;
    if (!isShowingPuzzleList) showPuzzleList(); else hidePuzzleList();
});

acceptBtn.addEventListener("click", checkAnswer);
resetBtn.addEventListener("click", resetGame);

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
