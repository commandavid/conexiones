// ==========================================================================
// puzzle-loader.js
// Picking which puzzle is active, and remembering which ones the player
// already solved (persisted in sessionStorage for the current browser tab).
// ==========================================================================

function findLatestPuzzleIndex() {
    if (typeof PUZZLES === 'undefined' || !PUZZLES.length) return 0;
    let bestIdx = -1;
    let bestTime = -Infinity;
    for (let i = 0; i < PUZZLES.length; i++) {
        const p = PUZZLES[i];
        if (p && p.date) {
            const t = Date.parse(p.date);
            if (!Number.isNaN(t) && t >= bestTime) {
                bestTime = t;
                bestIdx = i;
            }
        }
    }
    if (bestIdx >= 0) return bestIdx;
    // fallback to last element
    return PUZZLES.length - 1;
}

function loadPuzzle(index) {
    if (!PUZZLES || !PUZZLES[index]) return;
    currentPuzzleIndex = index;
    CATEGORIES = PUZZLES[index].categories;
    CATEGORIES_TITLES = PUZZLES[index].titles;
    if (puzzleTitleEl) {
        puzzleTitleEl.textContent = PUZZLES[index].label || PUZZLES[index].date || `Puzzle ${index + 1}`;
    }
    // reset state
    resetCount = 0;
    totalFails = 0;
    resetGame();
}

function getPuzzleKey(index) {
    return (PUZZLES[index] && PUZZLES[index].date) ? PUZZLES[index].date : `puzzle-${index}`;
}

function loadSolvedFromSession() {
    try {
        const raw = sessionStorage.getItem('solvedPuzzles');
        const arr = raw ? JSON.parse(raw) : [];
        solvedPuzzles = new Set(arr);
    } catch (e) {
        solvedPuzzles = new Set();
    }
}

function saveSolvedToSession() {
    sessionStorage.setItem('solvedPuzzles', JSON.stringify([...solvedPuzzles]));
}

function markPuzzleSolved(index) {
    const key = getPuzzleKey(index);
    solvedPuzzles.add(key);
    saveSolvedToSession();
    if (isShowingPuzzleList) renderPuzzleList();
}
