// ==========================================================================
// puzzle-loader.js
// Picking which puzzle is active, and remembering which ones the player
// already solved (persisted in sessionStorage for the current browser tab).
// ==========================================================================

// A puzzle only becomes playable once its date has arrived in the player's
// local time. Future-dated puzzles stay hidden until then, even though they
// already ship inside data/puzzles.js.
function parsePuzzleDateLocal(dateStr) {
    // Parse "YYYY-MM-DD" as local midnight. Date.parse() would treat a
    // date-only string as UTC, which can shift the day across time zones.
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr || '');
    if (m) return new Date(+m[1], +m[2] - 1, +m[3]).getTime();
    return Date.parse(dateStr);
}

function isPuzzleAvailable(p) {
    if (!p || !p.date) return true; // dateless puzzles are always available
    const t = parsePuzzleDateLocal(p.date);
    if (Number.isNaN(t)) return true; // unparseable date => don't hide it
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    return t <= todayStart;
}

function findLatestPuzzleIndex() {
    if (typeof PUZZLES === 'undefined' || !PUZZLES.length) return 0;
    let bestIdx = -1;
    let bestTime = -Infinity;
    for (let i = 0; i < PUZZLES.length; i++) {
        const p = PUZZLES[i];
        if (p && p.date && isPuzzleAvailable(p)) {
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
