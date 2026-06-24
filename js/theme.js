// ==========================================================================
// theme.js
// Appearance management: dark/light mode toggle and selectable color
// themes. The active choices are persisted in localStorage and applied to
// <html> via the data-theme / data-mode attributes (an inline script in the
// page <head> applies them before first paint to avoid a flash).
// ==========================================================================

const THEME_KEY = 'conexiones-theme';
const MODE_KEY = 'conexiones-mode';

// Available themes. The first one is the default. The `swatch` is only used
// to draw a little color dot in the theme picker.
const THEMES = [
    { id: 'clasico',     name: 'Clásico',     swatch: '#667eea' },
    { id: 'minimalista', name: 'Minimalista', swatch: '#111111' },
    { id: 'oceano',      name: 'Océano',      swatch: '#0e7c9b' },
    { id: 'atardecer',   name: 'Atardecer',   swatch: '#e8633f' },
    { id: 'bosque',      name: 'Bosque',      swatch: '#3e8e2f' },
    { id: 'uva',         name: 'Uva',         swatch: '#a83fc0' }
];

const DEFAULT_THEME = 'clasico';

function getStoredTheme() {
    let t = null;
    try { t = localStorage.getItem(THEME_KEY); } catch (e) {}
    return THEMES.some(x => x.id === t) ? t : DEFAULT_THEME;
}

// The mode default follows the operating system / browser preference until
// the user explicitly toggles it.
function getStoredMode() {
    let m = null;
    try { m = localStorage.getItem(MODE_KEY); } catch (e) {}
    if (m === 'dark' || m === 'light') return m;
    const prefersDark = window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
}

function isModeUserChosen() {
    try { return localStorage.getItem(MODE_KEY) !== null; } catch (e) { return false; }
}

function applyTheme(theme, persist) {
    if (!THEMES.some(x => x.id === theme)) theme = DEFAULT_THEME;
    document.documentElement.setAttribute('data-theme', theme);
    if (persist) {
        try { localStorage.setItem(THEME_KEY, theme); } catch (e) {}
    }
    updateThemeMenuSelection(theme);
}

function applyMode(mode, persist) {
    mode = (mode === 'dark') ? 'dark' : 'light';
    document.documentElement.setAttribute('data-mode', mode);
    if (persist) {
        try { localStorage.setItem(MODE_KEY, mode); } catch (e) {}
    }
    const toggle = document.getElementById('modeToggle');
    if (toggle) toggle.checked = (mode === 'dark');
}

function toggleMode() {
    const current = document.documentElement.getAttribute('data-mode') === 'dark'
        ? 'dark' : 'light';
    applyMode(current === 'dark' ? 'light' : 'dark', true);
}

// --- Theme picker menu -----------------------------------------------------

function buildThemeMenu() {
    const menu = document.getElementById('themeMenu');
    if (!menu) return;
    menu.replaceChildren();

    const title = document.createElement('div');
    title.className = 'theme-menu-title';
    title.textContent = 'Tema';
    menu.appendChild(title);

    THEMES.forEach(t => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'theme-option';
        btn.dataset.themeId = t.id;

        const sw = document.createElement('span');
        sw.className = 'theme-swatch';
        sw.style.background = t.swatch;

        const label = document.createElement('span');
        label.className = 'theme-option-name';
        label.textContent = t.name;

        btn.appendChild(sw);
        btn.appendChild(label);
        btn.addEventListener('click', () => {
            applyTheme(t.id, true);
            closeThemeMenu();
        });
        menu.appendChild(btn);
    });

    updateThemeMenuSelection(getStoredTheme());
}

function updateThemeMenuSelection(theme) {
    document.querySelectorAll('.theme-option').forEach(el => {
        el.classList.toggle('active', el.dataset.themeId === theme);
    });
}

function openThemeMenu() {
    const menu = document.getElementById('themeMenu');
    if (menu) menu.hidden = false;
}

function closeThemeMenu() {
    const menu = document.getElementById('themeMenu');
    if (menu) menu.hidden = true;
}

function toggleThemeMenu() {
    const menu = document.getElementById('themeMenu');
    if (!menu) return;
    if (menu.hidden) openThemeMenu(); else closeThemeMenu();
}

// --- Init ------------------------------------------------------------------

function initAppearance() {
    // The <head> script already set the attributes; re-apply (without
    // persisting) so the toggle/menu UI reflects the current state.
    applyMode(getStoredMode(), false);
    applyTheme(getStoredTheme(), false);
    buildThemeMenu();

    // Keep following the system preference until the user picks a mode.
    if (window.matchMedia) {
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        const onChange = (e) => {
            if (!isModeUserChosen()) applyMode(e.matches ? 'dark' : 'light', false);
        };
        if (mq.addEventListener) mq.addEventListener('change', onChange);
        else if (mq.addListener) mq.addListener(onChange);
    }
}
