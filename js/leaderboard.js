// ==========================================================================
// leaderboard.js
// Firebase leaderboard functionality
// ==========================================================================

// --- Leaderboard state ---
let isShowingLeaderboard = false;

// --- Leaderboard key ---
// Each puzzle has its OWN leaderboard, keyed by the puzzle's date (or a
// stable per-index fallback). Because puzzles are daily, this also gives a
// fresh board each day.
function getLeaderboardKey() {
  return getPuzzleKey(currentPuzzleIndex);
}

// --- Save score after winning ---
async function saveScore(name, fails, resets) {
  const dayKey = getLeaderboardKey();
  
  try {
    await db.collection('leaderboards')
      .doc(dayKey)
      .collection('scores')
      .add({
        name: name.toUpperCase().slice(0, 5),
        fails: fails,
        resets: resets,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });
    // A new completion changes this puzzle's difficulty stats.
    _difficultyCache.delete(dayKey);
    return true;
  } catch (error) {
    console.error('Error saving score:', error);
    return false;
  }
}

// --- Load leaderboard for current puzzle ---
async function loadLeaderboard() {
  const dayKey = getLeaderboardKey();
  
  try {
    const snapshot = await db.collection('leaderboards')
      .doc(dayKey)
      .collection('scores')
      .orderBy('fails', 'asc')
      .limit(50)
      .get();
    
    const scores = [];
    snapshot.forEach(doc => {
      scores.push({
        id: doc.id,
        ...doc.data()
      });
    });
    // Mejor = menos fallos, luego menos reinicios
    scores.sort((a, b) => {
      const failsA = Number(a.fails) || 0;
      const failsB = Number(b.fails) || 0;
      if (failsA !== failsB) return failsA - failsB;
      return (Number(a.resets) || 0) - (Number(b.resets) || 0);
    });
    return scores.slice(0, 10);
  } catch (error) {
    console.error('Error loading leaderboard:', error);
    return [];
  }
}

// --- Leaderboard view ---
// showLeaderboard / hideLeaderboard are defined in main.js (loaded last) and
// render the table via renderLeaderboard() in render.js.

// --- Score submission dialog ---
// The dialog UI lives in render.js (showScoreSubmission / closeScoreDialog)
// and the submit/skip handlers in main.js. Both are loaded after this file,
// so they are the single source of truth.

// --- Reset counter ---
// Solo se incrementa cuando el jugador pulsa el botón "Reiniciar"
// (ver el listener en main.js). Se pone a 0 al cargar un puzzle.
let resetCount = 0;

// --- Puzzle difficulty (derived from completion stats) ---------------------
// A "completion" is one submitted winning score; its `fails` field is that
// run's error count. Classification:
//   - no completions               -> untested
//   - more than half with < 4 fails -> easy
//   - more than half with > 12 fails -> hard
//   - anything in between           -> medium
const _difficultyCache = new Map();

function classifyDifficulty(scores) {
  const n = scores.length;
  if (n === 0) return { level: 'untested', label: 'Sin probar' };
  let easy = 0;
  let hard = 0;
  for (const s of scores) {
    const fails = Number(s.fails) || 0;
    if (fails < 4) easy++;
    else if (fails > 12) hard++;
  }
  if (easy > n / 2) return { level: 'easy', label: 'Fácil' };
  if (hard > n / 2) return { level: 'hard', label: 'Difícil' };
  return { level: 'medium', label: 'Medio' };
}

async function loadPuzzleDifficulty(dayKey) {
  if (_difficultyCache.has(dayKey)) return _difficultyCache.get(dayKey);
  try {
    const snapshot = await db.collection('leaderboards')
      .doc(dayKey)
      .collection('scores')
      .limit(500)
      .get();
    const scores = [];
    snapshot.forEach(doc => scores.push(doc.data()));
    const result = classifyDifficulty(scores);
    _difficultyCache.set(dayKey, result);
    return result;
  } catch (error) {
    console.error('Error loading difficulty:', error);
    return { level: 'untested', label: 'Sin probar' };
  }
}