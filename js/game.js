// ==========================================================================
// game.js
// Core gameplay: shuffling words, selecting cards, checking answers,
// resetting the board, and showing transient status messages.
// ==========================================================================

function generateWords() {
    // Recolectar todas las palabras de las categorías del puzzle actual
    const allWords = Object.values(CATEGORIES).flat();
    // Mezclar Fisher-Yates
    for (let i = allWords.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allWords[i], allWords[j]] = [allWords[j], allWords[i]];
    }
    return allWords;
}

function toggleCard(idx) {
    if (selected.has(idx)) {
        selected.delete(idx);
    } else {
        if (selected.size >= 4) {
            showMessage("Solo puedes seleccionar hasta 4 tarjetas antes de aceptar.", "error");
            return;
        }
        selected.add(idx);
    }
    renderGrid();
}

function checkAnswer() {
    if (selected.size !== 4) {
        showMessage("Debes seleccionar exactamente 4 tarjetas antes de aceptar.", "error");
        return;
    }

    const selectedWords = new Set([...selected].map(idx => words[idx]));
    let foundCategory = null;

    for (const [catName, catWords] of Object.entries(CATEGORIES)) {
        if (!matchedCategories.has(catName)) {
            const catSet = new Set(catWords);
            if (
                selectedWords.size === catSet.size &&
                [...selectedWords].every(w => catSet.has(w))
            ) {
                foundCategory = catName;
                break;
            }
        }
    }

    if (foundCategory) {
        // Correcto
        selected.forEach(idx => matchedWords.add(idx));
        matchedCategories.set(foundCategory, nextMatchedRow);
        nextMatchedRow++;
        selected.clear();
        showMessage(`¡Correcto! Has encontrado la categoría '${CATEGORIES_TITLES[foundCategory] || foundCategory}'.`, "success");

        if (matchedCategories.size === Object.keys(CATEGORIES).length) {
            showMessage("¡Has acertado todas las categorías! 🎉 ¡Ganaste!", "success");
            acceptBtn.disabled = true;
            // Mark this puzzle as solved in this session
            if (typeof PUZZLES !== 'undefined') {
                markPuzzleSolved(currentPuzzleIndex);
            }
        }
    } else {
        // Incorrecto: calcular cuántas palabras de la misma categoría se acertaron
        const counts = {};
        for (const idx of selected) {
            const w = words[idx];
            for (const [catName, catWords] of Object.entries(CATEGORIES)) {
                if (matchedCategories.has(catName)) continue; // ya resuelta
                if (catWords.includes(w)) {
                    counts[catName] = (counts[catName] || 0) + 1;
                }
            }
        }

        // Encontrar la categoría con más coincidencias
        let bestCat = null;
        let bestCount = 0;
        for (const [cat, cnt] of Object.entries(counts)) {
            if (cnt > bestCount) {
                bestCount = cnt;
                bestCat = cat;
            }
        }

        selected.clear();
        tries--;
        triesEl.textContent = tries;

        if (bestCount >= 2) {
            const wordsAway = 4 - bestCount;
            showMessage(`Estás a ${wordsAway} palabra${wordsAway === 1 ? '' : 's'}.`, "info");
        } else {
            showMessage("No era una solución válida. Has perdido 1 intento.", "error");
        }

        if (tries <= 0) {
            showMessage("Se han agotado los intentos. Fin del juego.", "error");
            acceptBtn.disabled = true;
        }
    }

    renderGrid();
}

function resetGame() {
    words = generateWords();
    selected.clear();
    matchedCategories.clear();
    matchedWords.clear();
    tries = TRIES_INIT;
    nextMatchedRow = 0;
    triesEl.textContent = tries;
    acceptBtn.disabled = false;
    messageEl.textContent = "";
    messageEl.className = "message";
    renderGrid();
}

function showMessage(text, type = "info") {
    // Clear any existing hide timeout
    if (messageTimeout) {
        clearTimeout(messageTimeout);
        messageTimeout = null;
    }

    messageEl.textContent = text;
    messageEl.className = `message ${type}`;

    // Auto-hide message after a few seconds
    messageTimeout = setTimeout(() => {
        clearMessage();
    }, 4000);
}

function clearMessage() {
    if (messageTimeout) {
        clearTimeout(messageTimeout);
        messageTimeout = null;
    }
    if (messageEl) {
        messageEl.textContent = '';
        messageEl.className = 'message';
    }
}
