// ==========================================================================
// state.js
// Global constants, mutable game state, and DOM element references.
// Loaded first (after the puzzle data) so every other script can rely on
// these variables already existing.
// ==========================================================================

// --- Constants -------------------------------------------------------------
const CATEGORY_COLORS = {
    morado: "#9b59b6",
    azul: "#3498db",
    verde: "#2ecc71",
    amarillo: "#f1c40f"
};

const TABLE_SIZE = 4;
const TRIES_INIT = 4;

// --- Current puzzle ----------------------------------------------------------
let currentPuzzleIndex = 0;
let CATEGORIES = {};
let CATEGORIES_TITLES = {};

// --- Puzzle picker state -----------------------------------------------------
let isShowingPuzzleList = false;
let solvedPuzzles = new Set();

// --- Game state ---------------------------------------------------------------
let words = [];
let selected = new Set();
let matchedCategories = new Map();  // category name -> row index
let matchedWords = new Set();
let tries = TRIES_INIT;
let totalFails = 0;  // Fallos acumulados de todos los reinicios del puzzle actual
let nextMatchedRow = 0;  // Next row to place a matched category
let messageTimeout = null;
let dragSourceIdx = null;  // words-index of the card currently being dragged
let didDrag = false;       // guards against the click that may follow a drag

// --- DOM element references ----------------------------------------------------
const gridEl = document.getElementById("grid");
const triesEl = document.getElementById("tries");
const acceptBtn = document.getElementById("acceptBtn");
const resetBtn = document.getElementById("resetBtn");
const messageEl = document.getElementById("message");
const puzzleBtn = document.getElementById("puzzleBtn");
