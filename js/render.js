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
    // earliest puzzle is #1 and the count goes up from there. Future-dated
    // puzzles are filtered out so they stay hidden until their day arrives.
    const chronological = PUZZLES.map((p, i) => i)
        .filter(i => isPuzzleAvailable(PUZZLES[i]))
        .sort((a, b) => {
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
    // Hide the current puzzle title while the picker is open
    if (puzzleTitleEl) puzzleTitleEl.style.display = 'none';
    // Hide the stats (Intentos/Reinicios) while selecting puzzles
    const statGroup = document.querySelector('.info-bar .stat-group');
    if (statGroup) statGroup.style.display = 'none';
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
    // Restore the current puzzle title
    if (puzzleTitleEl) puzzleTitleEl.style.display = '';
    // Restore the stats
    const statGroup = document.querySelector('.info-bar .stat-group');
    if (statGroup) statGroup.style.display = '';
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

// --- Welcome overlay (shown once, on the very first visit) ------------------
function showWelcome() {
    closeWelcome();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'welcomeOverlay';

    const dialog = document.createElement('div');
    dialog.className = 'modal-dialog welcome-dialog';

    const h2 = document.createElement('h2');
    h2.textContent = '¡Bienvenido a Conexiones!';

    const p = document.createElement('p');
    p.textContent = 'Esta es la versión no oficial en español del famoso juego "Connections" del NYT.\n¡Agrupa las 16 palabras en grupos de cuatro para ganar!.';

    const buttons = document.createElement('div');
    buttons.className = 'dialog-buttons';

    const playBtn = document.createElement('button');
    playBtn.className = 'btn-save';
    playBtn.textContent = 'Jugar';
    playBtn.addEventListener('click', closeWelcome);

    const howBtn = document.createElement('button');
    howBtn.className = 'btn-skip';
    howBtn.textContent = 'Cómo jugar';
    howBtn.addEventListener('click', () => {
        closeWelcome();
        showRules();
    });

    buttons.appendChild(playBtn);
    buttons.appendChild(howBtn);

    dialog.appendChild(h2);
    dialog.appendChild(p);
    dialog.appendChild(buttons);
    overlay.appendChild(dialog);

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeWelcome();
    });

    document.body.appendChild(overlay);
}

function closeWelcome() {
    const overlay = document.getElementById('welcomeOverlay');
    if (overlay) overlay.remove();
}

// --- How-to-play carousel --------------------------------------------------
// Temporary placeholder cards. Drop the real media into assets/instructions/
// using the filename shown in each card's `media.file` (no code change needed):
//   - type 'image'     -> an <img> (e.g. a .jpg)
//   - type 'video'     -> an autoplaying, looping, muted <video> (e.g. a .mov)
//   - type 'highlight' -> a highlighted text box (uses `media.content`)
// Edit `text` to change the description shown below each title.
const RULES_CARDS = [
    {
        title: '¿Cómo ganar?',
        text: 'Tienes que conseguir hacer cuatro grupos de cuatro palabras con las 16 de la cuadrícula. Cada grupo tiene una conexión que las relaciona.',
        media: { type: 'image', file: 'card1.jpg' }
    },
    {
        title: 'Selecciona las palabras',
        text: 'Toca las cuatro palabras que creas que van juntas y pulsa «Aceptar».',
        media: { type: 'video', file: 'card2.mov' }
    },
    {
        title: 'Ordénalas como prefieras',
        text: 'Si te ayuda, puedes reordenar las palabras a tu gusto arrastrándolas (manteniendo pulsado y arrastrando en móvil).',
        media: { type: 'video', file: 'card3.mov' }
    },
    {
        title: 'Cómo reiniciar',
        text: 'Si te quedas sin intentos... ¡No te rindas! Pulsa «Reiniciar» para volver a empezar.',
        media: { type: 'video', file: 'card4.mov' }
    },
    {
        title: 'Botones',
        text: '¿Para qué sirven el resto de botones?',
        media: {
            type: 'highlight',
            content: '🎨  Cambia el tema de la aplicación\n🌙/☀️  Cambia el modo claro/oscuro\n⭐  Déjanos tu correo y te avisaremos de nuevos puzzles\n🏆  Consulta las mejores puntuaciones del puzzle\n📅  Juega puzzles de otros días'
        },
        note: 'Este es un proyecto pasional, no busca lucro ni almacenar datos personales con otro fin que no sea informar de nuevos puzzles. Esperamos que lo disfrutes y nos dejes tu feedback. ¡Gracias por jugar!'
    }
];

let _rulesIndex = 0;
let _rulesKeyHandler = null;

// Builds the media area for a rules card: an image, an autoplaying/looping
// video, or a highlighted text box. Images and videos fall back to a labelled
// placeholder until the real file is dropped into assets/instructions/.
function buildRulesMedia(card) {
    const media = card.media || {};

    if (media.type === 'highlight') {
        const box = document.createElement('div');
        box.className = 'rules-highlight';
        box.textContent = media.content || '';
        return box;
    }

    const box = document.createElement('div');
    box.className = 'rules-gif';

    const fallback = document.createElement('div');
    fallback.className = 'rules-gif-fallback';
    const icon = document.createElement('span');
    icon.className = 'rules-gif-icon';
    icon.textContent = media.type === 'video' ? '🎬' : '🖼️';
    const name = document.createElement('span');
    name.className = 'rules-gif-name';
    name.textContent = media.file || '';
    fallback.appendChild(icon);
    fallback.appendChild(name);
    box.appendChild(fallback);

    const src = `assets/instructions/${media.file}`;
    let el, readyEvent;
    if (media.type === 'video') {
        el = document.createElement('video');
        el.src = src;
        el.autoplay = true;
        el.loop = true;
        el.muted = true;
        el.playsInline = true;
        el.setAttribute('playsinline', '');
        readyEvent = 'loadeddata';
    } else {
        el = document.createElement('img');
        el.src = src;
        el.alt = card.title;
        readyEvent = 'load';
    }
    el.className = 'rules-gif-img';
    el.hidden = true;
    // Reveal the media only once it actually loads, and drop the placeholder,
    // so the dashed outline hugs the media instead of the whole box. If the
    // file is missing, the media stays hidden and the placeholder shows.
    el.addEventListener(readyEvent, () => {
        el.hidden = false;
        fallback.style.display = 'none';
    });
    el.addEventListener('error', () => { el.hidden = true; });
    box.appendChild(el);

    return box;
}

function showRules() {
    closeRulesModal();
    _rulesIndex = 0;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'rulesOverlay';

    const dialog = document.createElement('div');
    dialog.className = 'modal-dialog rules-carousel-dialog';

    // "Cerrar" button in the bottom-right corner — only visible on mobile.
    const closeBtn = document.createElement('button');
    closeBtn.className = 'rules-close';
    closeBtn.textContent = 'Cerrar';
    closeBtn.addEventListener('click', closeRulesModal);

    const row = document.createElement('div');
    row.className = 'rules-carousel-row';

    const prev = document.createElement('button');
    prev.className = 'rules-arrow rules-arrow--prev';
    prev.setAttribute('aria-label', 'Anterior');
    prev.textContent = '‹';
    prev.addEventListener('click', () => goToRule(_rulesIndex - 1));

    const carousel = document.createElement('div');
    carousel.className = 'rules-carousel';

    const track = document.createElement('div');
    track.className = 'rules-track';
    track.id = 'rulesTrack';

    RULES_CARDS.forEach(card => {
        const cardEl = document.createElement('div');
        cardEl.className = 'rules-card';

        const title = document.createElement('h3');
        title.className = 'rules-card-title';
        title.textContent = card.title;

        const text = document.createElement('p');
        text.className = 'rules-card-text';
        text.textContent = card.text || '';

        const media = buildRulesMedia(card);

        cardEl.appendChild(title);
        if (card.text) cardEl.appendChild(text);
        cardEl.appendChild(media);

        if (card.note) {
            const note = document.createElement('p');
            note.className = 'rules-card-text';
            note.textContent = card.note;
            cardEl.appendChild(note);
        }

        track.appendChild(cardEl);
    });

    carousel.appendChild(track);

    const next = document.createElement('button');
    next.className = 'rules-arrow rules-arrow--next';
    next.setAttribute('aria-label', 'Siguiente');
    next.textContent = '›';
    next.addEventListener('click', () => goToRule(_rulesIndex + 1));

    row.appendChild(prev);
    row.appendChild(carousel);
    row.appendChild(next);

    const dots = document.createElement('div');
    dots.className = 'rules-dots';
    dots.id = 'rulesDots';
    RULES_CARDS.forEach((_, i) => {
        const dot = document.createElement('button');
        dot.className = 'rules-dot' + (i === 0 ? ' rules-dot--active' : '');
        dot.setAttribute('aria-label', `Ir a la tarjeta ${i + 1}`);
        dot.addEventListener('click', () => goToRule(i));
        dots.appendChild(dot);
    });

    dialog.appendChild(closeBtn);
    dialog.appendChild(row);
    dialog.appendChild(dots);
    overlay.appendChild(dialog);

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeRulesModal();
    });

    _rulesKeyHandler = (e) => {
        if (e.key === 'ArrowLeft') goToRule(_rulesIndex - 1);
        else if (e.key === 'ArrowRight') goToRule(_rulesIndex + 1);
        else if (e.key === 'Escape') closeRulesModal();
    };
    document.addEventListener('keydown', _rulesKeyHandler);

    document.body.appendChild(overlay);
}

// Move to card `i`, looping around at both ends.
function goToRule(i) {
    const count = RULES_CARDS.length;
    _rulesIndex = ((i % count) + count) % count;

    const track = document.getElementById('rulesTrack');
    if (track) track.style.transform = `translateX(-${_rulesIndex * 100}%)`;

    const dots = document.getElementById('rulesDots');
    if (dots) {
        Array.from(dots.children).forEach((dot, idx) => {
            dot.classList.toggle('rules-dot--active', idx === _rulesIndex);
        });
    }
}

function closeRulesModal() {
    if (_rulesKeyHandler) {
        document.removeEventListener('keydown', _rulesKeyHandler);
        _rulesKeyHandler = null;
    }
    const overlay = document.getElementById('rulesOverlay');
    if (overlay) overlay.remove();
}