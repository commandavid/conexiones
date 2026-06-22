// ==========================================================================
// render.js
// Everything that draws into #grid: the main game board, the merged
// "matched category" tiles, and the puzzle-day picker view.
// ==========================================================================

function renderGrid() {
    gridEl.innerHTML = "";

    // Primero, agregar las categorías acertadas (en orden)
    const sortedMatched = Array.from(matchedCategories.entries())
        .sort((a, b) => a[1] - b[1]);  // Ordenar por número de fila

    for (const [catName] of sortedMatched) {
        // Create a single merged element that spans the full row
        const merged = document.createElement('div');
        merged.className = `card merged-category ${catName} disabled`;
        const titleEl = document.createElement('div');
        titleEl.className = 'title';
        titleEl.textContent = CATEGORIES_TITLES[catName] || catName;
        const wordsEl = document.createElement('div');
        wordsEl.className = 'words';
        wordsEl.textContent = (CATEGORIES[catName] || []).join(' · ');
        merged.appendChild(titleEl);
        merged.appendChild(wordsEl);
        gridEl.appendChild(merged);
    }

    // Luego, agregar las palabras sin acertar (en el orden actual)
    const unmatchedIndices = [];
    for (let idx = 0; idx < words.length; idx++) {
        if (!matchedWords.has(idx)) {
            unmatchedIndices.push(idx);
        }
    }

    for (const idx of unmatchedIndices) {
        const word = words[idx];
        const card = document.createElement("div");
        card.className = "card";
        card.textContent = word;
        card.dataset.idx = idx;

        if (selected.has(idx)) {
            card.classList.add("selected");
        }

        card.addEventListener("click", () => toggleCard(idx));
        gridEl.appendChild(card);
    }
}

function renderPuzzleList() {
    gridEl.classList.add('puzzle-list');
    gridEl.innerHTML = '';
    // Order puzzles by date desc if date present else by index desc
    const indices = PUZZLES.map((p, i) => i).sort((a, b) => {
        const da = PUZZLES[a].date || '';
        const db = PUZZLES[b].date || '';
        if (da && db) return db.localeCompare(da);
        return b - a;
    });

    indices.forEach(i => {
        const p = PUZZLES[i];
        const tile = document.createElement('div');
        tile.className = 'puzzle-tile';
        const dateEl = document.createElement('div');
        dateEl.className = 'date';
        dateEl.textContent = p.date || `Puzzle ${i + 1}`;
        const metaEl = document.createElement('div');
        metaEl.className = 'meta';
        // Show puzzle label (single title) instead of listing categories
        metaEl.textContent = p.label || p.date || `Puzzle ${i + 1}`;
        const solvedKey = getPuzzleKey(i);
        if (solvedPuzzles.has(solvedKey)) {
            const solvedEl = document.createElement('div');
            solvedEl.className = 'solved';
            solvedEl.textContent = '✓ resuelto';
            tile.appendChild(solvedEl);
        }

        tile.appendChild(dateEl);
        tile.appendChild(metaEl);

        tile.addEventListener('click', () => {
            // If there is game progress, confirm
            const inProgress = matchedWords.size > 0 || matchedCategories.size > 0 || selected.size > 0 || tries !== TRIES_INIT;
            if (inProgress) {
                const ok = confirm('Cargar otro día eliminará el progreso actual. ¿Continuar?');
                if (!ok) return;
            }
            loadPuzzle(i);
            hidePuzzleList();
        });

        gridEl.appendChild(tile);
    });
}

function showPuzzleList() {
    isShowingPuzzleList = true;
    // Clear any visible message immediately when entering puzzle selection
    clearMessage();
    renderPuzzleList();
    puzzleBtn.textContent = '📅';
    // Hide controls while selecting puzzles
    try {
        const triesSpan = document.getElementById('tries').parentElement;
        if (triesSpan) triesSpan.style.display = 'none';
    } catch (e) {}
    const controlsEl = document.querySelector('.controls');
    if (controlsEl) controlsEl.style.display = 'none';
    // Ocultar botón de leaderboard también
    const leaderboardBtn = document.getElementById('leaderboardBtn');
    if (leaderboardBtn) leaderboardBtn.style.display = 'none';
}

function hidePuzzleList() {
    isShowingPuzzleList = false;
    gridEl.classList.remove('puzzle-list');
    puzzleBtn.textContent = '📅';
    renderGrid();
    // Restore controls
    try {
        const triesSpan = document.getElementById('tries').parentElement;
        if (triesSpan) triesSpan.style.display = '';
    } catch (e) {}
    const controlsEl = document.querySelector('.controls');
    if (controlsEl) controlsEl.style.display = '';
    // Restaurar botón de leaderboard
    const leaderboardBtn = document.getElementById('leaderboardBtn');
    if (leaderboardBtn) leaderboardBtn.style.display = '';
}

// --- Leaderboard rendering functions ---

// Escape any value before inserting it into innerHTML to prevent XSS.
// Leaderboard entries come from Firestore and may have been tampered with
// (e.g. a malicious client writing arbitrary HTML into the `name` field).
function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[ch]);
}

function renderLeaderboard(scores) {
    gridEl.classList.add('leaderboard-list');
    gridEl.innerHTML = `
        <div class="leaderboard-header">
            <h2>MEJORES PUNTUACIONES</h2>
            <p class="leaderboard-subtitle">${escapeHtml(getLeaderboardKey())}</p>
        </div>
        <div class="leaderboard-table">
            ${scores.length === 0 ? '<div class="empty-leaderboard">Aún no hay puntuaciones. ¡Sé el primero!</div>' : ''}
            ${scores.map((score, index) => {
                const name = escapeHtml((score.name || '???').toString().slice(0, 5));
                const fails = Number(score.fails) || 0;
                const resets = Number(score.resets) || 0;
                return `
                <div class="leaderboard-row ${index === 0 ? 'first' : ''}">
                    <span class="rank">#${index + 1}</span>
                    <span class="name">${name}</span>
                    <span class="details">${fails} fallos · ${resets} reinicios</span>
                </div>
            `;
            }).join('')}
        </div>
        <div class="leaderboard-controls">
            <button class="btn-leaderboard-close" onclick="hideLeaderboard()">Volver al juego</button>
        </div>
    `;
}

function showScoreSubmission(fails, resets) {
    // Remover overlay existente si hay
    closeScoreDialog();
    
    const overlay = document.createElement('div');
    overlay.className = 'score-overlay';
    overlay.id = 'scoreOverlay';
    overlay.innerHTML = `
        <div class="score-dialog">
            <h2>¡Puzzle completado!</h2>
            <p>Fallos: ${fails} | Reinicios: ${resets}</p>
            <label for="playerName">Introduce tus iniciales (5 letras):</label>
            <input type="text" id="playerName" maxlength="5" placeholder="ABCDE" autofocus>
            <div class="dialog-buttons">
                <button class="btn-save" onclick="submitScore()">Guardar puntuación</button>
                <button class="btn-skip" onclick="skipScoreSubmission()">Omitir</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    
    const input = document.getElementById('playerName');
    input.focus();
    input.select();
    
    // Enter key to submit
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') submitScore();
    });
}

function closeScoreDialog() {
    const overlay = document.getElementById('scoreOverlay');
    if (overlay) overlay.remove();
}