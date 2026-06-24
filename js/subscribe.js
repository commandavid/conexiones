// ==========================================================================
// subscribe.js
// Lets a player leave their email to be notified when a new puzzle is
// published. Emails are stored in the Firestore `subscribers` collection,
// keyed by the (normalised) address so the same email is never stored twice.
// Actually sending the notification emails is handled elsewhere/later.
// ==========================================================================

// Basic, conservative email validation. This is a usability check, not a
// security boundary — the real guarantees must live in Firestore rules.
function isValidEmail(email) {
    if (typeof email !== 'string') return false;
    const trimmed = email.trim();
    if (trimmed.length === 0 || trimmed.length > 254) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

// Persist a subscriber. Returns one of:
//   'created' | 'exists' | 'invalid' | 'error'
async function saveSubscriberEmail(email) {
    const normalized = String(email || '').trim().toLowerCase();
    if (!isValidEmail(normalized)) return 'invalid';
    if (typeof db === 'undefined' || !db) return 'error';

    // Use the address as the document id so duplicates are impossible.
    // encodeURIComponent keeps the id free of characters Firestore forbids.
    const docId = encodeURIComponent(normalized);

    try {
        const ref = db.collection('subscribers').doc(docId);
        return await db.runTransaction(async (tx) => {
            const snap = await tx.get(ref);
            if (snap.exists) return 'exists';
            tx.set(ref, {
                email: normalized,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            return 'created';
        });
    } catch (e) {
        console.error('Error saving subscriber:', e);
        return 'error';
    }
}

// --- Modal -----------------------------------------------------------------

function showSubscribeModal() {
    closeSubscribeModal();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'subscribeOverlay';

    const dialog = document.createElement('div');
    dialog.className = 'modal-dialog';

    const h2 = document.createElement('h2');
    h2.textContent = '¿Te avisamos?';

    const p = document.createElement('p');
    p.textContent = 'Déjanos tu correo y te avisaremos cuando se publique un nuevo puzzle.';

    const label = document.createElement('label');
    label.setAttribute('for', 'subscribeEmail');
    label.textContent = 'Correo electrónico';

    const input = document.createElement('input');
    input.type = 'email';
    input.id = 'subscribeEmail';
    input.maxLength = 254;
    input.placeholder = 'tucorreo@ejemplo.com';
    input.autocomplete = 'email';

    const msg = document.createElement('div');
    msg.className = 'modal-msg';
    msg.id = 'subscribeMsg';

    const buttons = document.createElement('div');
    buttons.className = 'dialog-buttons';

    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn-save';
    saveBtn.textContent = 'Suscribirme';
    saveBtn.addEventListener('click', submitSubscription);

    const skipBtn = document.createElement('button');
    skipBtn.className = 'btn-skip';
    skipBtn.textContent = 'Ahora no';
    skipBtn.addEventListener('click', closeSubscribeModal);

    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') submitSubscription();
    });

    buttons.appendChild(saveBtn);
    buttons.appendChild(skipBtn);
    dialog.appendChild(h2);
    dialog.appendChild(p);
    dialog.appendChild(label);
    dialog.appendChild(input);
    dialog.appendChild(msg);
    dialog.appendChild(buttons);
    overlay.appendChild(dialog);

    // Close when clicking the backdrop (but not the dialog itself).
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeSubscribeModal();
    });

    document.body.appendChild(overlay);
    input.focus();
}

function closeSubscribeModal() {
    const overlay = document.getElementById('subscribeOverlay');
    if (overlay) overlay.remove();
}

async function submitSubscription() {
    const input = document.getElementById('subscribeEmail');
    const msg = document.getElementById('subscribeMsg');
    if (!input) return;

    const email = input.value.trim();
    if (!isValidEmail(email)) {
        if (msg) {
            msg.textContent = 'Introduce un correo válido.';
            msg.className = 'modal-msg error';
        }
        return;
    }

    const saveBtn = document.querySelector('#subscribeOverlay .btn-save');
    if (saveBtn) saveBtn.disabled = true;
    if (msg) {
        msg.textContent = 'Guardando…';
        msg.className = 'modal-msg';
    }

    const result = await saveSubscriberEmail(email);

    if (result === 'created' || result === 'exists') {
        if (msg) {
            msg.textContent = result === 'created'
                ? '¡Listo! Te avisaremos.'
                : 'Este correo ya estaba suscrito.';
            msg.className = 'modal-msg success';
        }
        setTimeout(closeSubscribeModal, 1300);
    } else {
        if (msg) {
            msg.textContent = result === 'invalid'
                ? 'Introduce un correo válido.'
                : 'No se pudo guardar. Inténtalo más tarde.';
            msg.className = 'modal-msg error';
        }
        if (saveBtn) saveBtn.disabled = false;
    }
}
