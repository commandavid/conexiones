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
        card.draggable = true;

        if (selected.has(idx)) {
            card.classList.add("selected");
        }

        card.addEventListener("click", () => {
            // Ignore the click that browsers may dispatch right after a drag
            if (didDrag) {
                didDrag = false;
                return;
            }
            toggleCard(idx);
        });

        attachDragHandlers(card, idx);
        gridEl.appendChild(card);
    }
}

// --- Drag & drop reordering of unmatched cards ----------------------------

function attachDragHandlers(card, idx) {
    card.addEventListener('dragstart', (e) => {
        dragSourceIdx = idx;
        didDrag = true;
        card.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        try { e.dataTransfer.setData('text/plain', String(idx)); } catch (_) {}
    });

    card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
        dragSourceIdx = null;
        document.querySelectorAll('.card.drag-over')
            .forEach(c => c.classList.remove('drag-over'));
    });

    card.addEventListener('dragover', (e) => {
        if (dragSourceIdx === null) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (idx !== dragSourceIdx) card.classList.add('drag-over');
    });

    card.addEventListener('dragleave', () => {
        card.classList.remove('drag-over');
    });

    card.addEventListener('drop', (e) => {
        e.preventDefault();
        card.classList.remove('drag-over');
        const dragIdx = dragSourceIdx;
        if (dragIdx === null || dragIdx === idx) return;
        swapCards(dragIdx, idx);
    });
}

// Swap the two affected cards (words-indices `aIdx` and `bIdx`) in place.
// Only these two positions change; every other card stays where it is.
// Selection follows each word to its new slot.
function swapCards(aIdx, bIdx) {
    if (aIdx === bIdx) return;

    const newWords = words.slice();
    [newWords[aIdx], newWords[bIdx]] = [newWords[bIdx], newWords[aIdx]];
    words = newWords;

    const aSelected = selected.has(aIdx);
    const bSelected = selected.has(bIdx);
    if (bSelected) selected.add(aIdx); else selected.delete(aIdx);
    if (aSelected) selected.add(bIdx); else selected.delete(bIdx);

    renderGrid();
}

let _puzzleListToken = 0;

function renderPuzzleList() {
    gridEl.classList.add('puzzle-list');
    gridEl.innerHTML = '';

    if (typeof PUZZLES === 'undefined' || !PUZZLES.length) return;

    // Chronological order (oldest first) drives the puzzle numbering: the
    // earliest puzzle is #1 and the count goes up from there.
    const chronological = PUZZLES.map((p, i) => i).sort((a, b) => {
        const da = Date.parse(PUZZLES[a].date || '');
        const db = Date.parse(PUZZLES[b].date || '');
        const ta = Number.isNaN(da) ? 0 : da;
        const tb = Number.isNaN(db) ? 0 : db;
        if (ta !== tb) return ta - tb;
        return a - b;
    });
    const numberByIndex = {};
    chronological.forEach((idx, k) => { numberByIndex[idx] = k + 1; });

    // The list itself is shown newest first.
    const displayOrder = [...chronological].reverse();

    // Token guards against stale async difficulty updates if the view changes
    // (e.g. the player navigates away before the Firestore reads resolve).
    const token = ++_puzzleListToken;

    displayOrder.forEach(i => {
        const p = PUZZLES[i];
        const tile = document.createElement('div');
        tile.className = 'puzzle-tile';

        const num = document.createElement('span');
        num.className = 'puzzle-num';
        num.textContent = numberByIndex[i];

        const name = document.createElement('span');
        name.className = 'puzzle-name';
        name.textContent = p.label || p.date || `Puzzle ${i + 1}`;

        const solvedKey = getPuzzleKey(i);
        if (solvedPuzzles.has(solvedKey)) {
            tile.classList.add('solved');
            const check = document.createElement('span');
            check.className = 'puzzle-solved-check';
            check.textContent = '✓';
            check.title = 'Resuelto';
            name.appendChild(check);
        }

        const diff = document.createElement('span');
        diff.className = 'puzzle-diff diff-loading';
        diff.textContent = '…';

        tile.appendChild(num);
        tile.appendChild(name);
        tile.appendChild(diff);

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

        // Difficulty is derived from the puzzle's completion stats in Firestore.
        if (typeof loadPuzzleDifficulty === 'function') {
            loadPuzzleDifficulty(solvedKey).then(d => {
                if (token !== _puzzleListToken || !diff.isConnected) return;
                diff.textContent = d.label;
                diff.className = `puzzle-diff diff-${d.level}`;
            }).catch(() => {});
        } else {
            diff.textContent = 'Sin probar';
            diff.className = 'puzzle-diff diff-untested';
        }
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

// --- Rules modal -----------------------------------------------------------
// Placeholder content for now; the full rules will be filled in later.
function showRules() {
    closeRulesModal();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'rulesOverlay';

    const dialog = document.createElement('div');
    dialog.className = 'modal-dialog rules-dialog';

    const h2 = document.createElement('h2');
    h2.textContent = 'Cómo jugar';

    const p = document.createElement('p');
    p.textContent = 'Encuentra los cuatro grupos de cuatro palabras que comparten algo en común. ' +
        'Selecciona cuatro tarjetas y pulsa «Aceptar». (Reglas detalladas próximamente.)';

    const close = document.createElement('button');
    close.className = 'btn-save';
    close.textContent = 'Entendido';
    close.addEventListener('click', closeRulesModal);

    dialog.appendChild(h2);
    dialog.appendChild(p);
    dialog.appendChild(close);
    overlay.appendChild(dialog);

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeRulesModal();
    });

    document.body.appendChild(overlay);
}

function closeRulesModal() {
    const overlay = document.getElementById('rulesOverlay');
    if (overlay) overlay.remove();
}