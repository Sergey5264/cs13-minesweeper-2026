// ─── Стан гри ────────────────────────────────────────────────────────────────

const gameState = {
  rows: 8,
  cols: 8,
  minesCount: 10,
  status: 'process', // 'process' | 'win' | 'lose'
  gameTime: 0,
  timerId: null,
};

// Двовимірний масив клітинок (заповнюється у generateField)
let field = [];

// ─── Генерація поля ───────────────────────────────────────────────────────────

/**
 * Створює порожню сітку розміром rows × cols,
 * розставляє міни та підраховує сусідів.
 * @param {number} rows
 * @param {number} cols
 * @param {number} minesCount
 * @returns {Array<Array<Object>>} двовимірний масив клітинок
 */
function generateField(rows, cols, minesCount) {
  // 1. Ініціалізація: кожна клітинка порожня і закрита
  const grid = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      type: 'empty',
      neighborMines: 0,
      state: 'closed',
    }))
  );

  // 2. Розставляємо міни випадково, без дублікатів
  let placed = 0;
  while (placed < minesCount) {
    const row = Math.floor(Math.random() * rows);
    const col = Math.floor(Math.random() * cols);

    if (grid[row][col].type !== 'mine') {
      grid[row][col].type = 'mine';
      placed++;
    }
  }

  // 3. Підраховуємо сусідів для кожної порожньої клітинки
  countNeighbourMines(grid, rows, cols);

  return grid;
}

// ─── Підрахунок сусідів ───────────────────────────────────────────────────────

/**
 * Для кожної клітинки типу 'empty' записує кількість мін серед 8 сусідів.
 * @param {Array<Array<Object>>} grid
 * @param {number} rows
 * @param {number} cols
 */
function countNeighbourMines(grid, rows, cols) {
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (grid[row][col].type === 'mine') continue;

      let count = 0;

      for (const [dr, dc] of getNeighbourOffsets()) {
        const nr = row + dr;
        const nc = col + dc;

        if (isInBounds(nr, nc, rows, cols) && grid[nr][nc].type === 'mine') {
          count++;
        }
      }

      grid[row][col].neighborMines = count;
    }
  }
}

// ─── Відкриття клітинки ───────────────────────────────────────────────────────

/**
 * Відкриває клітинку (row, col).
 * – Якщо клітинка вже відкрита або під прапорцем — нічого не робить.
 * – Якщо міна — програш.
 * – Якщо neighborMines === 0 — рекурсивно відкриває сусідів.
 * @param {number} row
 * @param {number} col
 */
function openCell(row, col) {
  if (gameState.status !== 'process') return;

  const cell = field[row][col];

  if (cell.state === 'opened' || cell.state === 'flagged') return;

  cell.state = 'opened';

  if (cell.type === 'mine') {
    gameState.status = 'lose';
    stopTimer();
    revealAllMines(row, col);
    renderBoard();
    return;
  }

  // Рекурсивне розкриття порожніх клітинок
  if (cell.neighborMines === 0) {
    for (const [dr, dc] of getNeighbourOffsets()) {
      const nr = row + dr;
      const nc = col + dc;

      if (isInBounds(nr, nc, gameState.rows, gameState.cols)) {
        openCell(nr, nc);
      }
    }
  }

  checkWin();
  renderBoard();
}

// ─── Прапорець ────────────────────────────────────────────────────────────────

/**
 * Перемикає прапорець на клітинці (row, col).
 * Якщо клітинка вже відкрита — нічого не робить.
 * @param {number} row
 * @param {number} col
 */
function toggleFlag(row, col) {
  if (gameState.status !== 'process') return;

  const cell = field[row][col];

  if (cell.state === 'opened') return;

  cell.state = cell.state === 'flagged' ? 'closed' : 'flagged';

  renderBoard();
  updateMineCounter();
}

// ─── Перевірка перемоги ───────────────────────────────────────────────────────

/**
 * Перевіряє, чи всі порожні клітинки відкриті.
 * Якщо так — перемога.
 */
function checkWin() {
  const allOpened = field.every((row) =>
    row.every((cell) => cell.type === 'mine' || cell.state === 'opened')
  );

  if (allOpened) {
    gameState.status = 'win';
    stopTimer();
  }
}

// ─── Розкриття мін при програші ───────────────────────────────────────────────

/**
 * Показує всі міни на полі після програшу.
 * Клітинку, на яку натиснули, позначає як 'mine-triggered'.
 * @param {number} triggeredRow
 * @param {number} triggeredCol
 */
function revealAllMines(triggeredRow, triggeredCol) {
  field.forEach((row, ri) =>
    row.forEach((cell, ci) => {
      if (cell.type === 'mine' && cell.state !== 'flagged') {
        cell.state = 'opened';
        cell.triggered = ri === triggeredRow && ci === triggeredCol;
      }
      // Помилковий прапорець — не міна, але позначена
      if (cell.type !== 'mine' && cell.state === 'flagged') {
        cell.wrongFlag = true;
      }
    })
  );
}

// ─── Таймер ───────────────────────────────────────────────────────────────────

function startTimer() {
  stopTimer(); // захист від подвійного запуску
  gameState.gameTime = 0;

  gameState.timerId = setInterval(() => {
    gameState.gameTime++;
    updateTimerDisplay();
  }, 1000);
}

function stopTimer() {
  if (gameState.timerId !== null) {
    clearInterval(gameState.timerId);
    gameState.timerId = null;
  }
}

// ─── Старт / Рестарт гри ─────────────────────────────────────────────────────

function startGame() {
  stopTimer();

  gameState.status = 'process';
  gameState.gameTime = 0;

  field = generateField(gameState.rows, gameState.cols, gameState.minesCount);

  startTimer();
  renderBoard();
  updateMineCounter();
  updateTimerDisplay();
}

// ─── Рендер поля ─────────────────────────────────────────────────────────────

function renderBoard() {
  const boardEl = document.querySelector('.minesweeper__board');
  boardEl.style.setProperty('--cols', gameState.cols);
  boardEl.innerHTML = '';

  field.forEach((row, ri) => {
    row.forEach((cell, ci) => {
      const el = document.createElement('div');
      el.classList.add('cell');
      el.setAttribute('role', 'button');
      el.setAttribute('tabindex', '0');

      applyCellClass(el, cell);

      // Лівий клік — відкрити
      el.addEventListener('click', () => openCell(ri, ci));

      // Правий клік — прапорець
      el.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        toggleFlag(ri, ci);
      });

      // Клавіатура: Enter/Space — відкрити, F — прапорець
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') openCell(ri, ci);
        if (e.key === 'f' || e.key === 'F') toggleFlag(ri, ci);
      });

      boardEl.appendChild(el);
    });
  });
}

/**
 * Додає потрібні CSS-класи на DOM-елемент клітинки залежно від її стану.
 * @param {HTMLElement} el
 * @param {Object} cell
 */
function applyCellClass(el, cell) {
  if (cell.wrongFlag) {
    el.classList.add('cell--flag-wrong');
    return;
  }

  if (cell.state === 'flagged') {
    el.classList.add('cell--closed', 'cell--flag');
    return;
  }

  if (cell.state === 'closed') {
    el.classList.add('cell--closed');
    return;
  }

  // state === 'opened'
  if (cell.type === 'mine') {
    el.classList.add(cell.triggered ? 'cell--mine-triggered' : 'cell--mine');
    return;
  }

  // Порожня або з цифрою
  el.classList.add('cell--open');

  if (cell.neighborMines === 0) {
    el.classList.add('cell--num-0');
  } else {
    el.classList.add(`cell--num-${cell.neighborMines}`);
    el.textContent = cell.neighborMines;
  }
}

// ─── Оновлення UI лічильників ─────────────────────────────────────────────────

function updateMineCounter() {
  const flaggedCount = field
    .flat()
    .filter((cell) => cell.state === 'flagged').length;

  const remaining = gameState.minesCount - flaggedCount;

  const counterEl = document.querySelector(
    '.info-block__value--danger span:last-child'
  );

  if (counterEl) {
    counterEl.textContent = String(Math.max(remaining, 0)).padStart(3, '0');
  }
}

function updateTimerDisplay() {
  const timerEl = document.querySelector(
    '.info-block:last-child .info-block__value span:last-child'
  );

  if (timerEl) {
    const capped = Math.min(gameState.gameTime, 999);
    timerEl.textContent = String(capped).padStart(3, '0');
  }
}

// ─── Допоміжні функції ────────────────────────────────────────────────────────

/** Повертає масив зміщень для 8 сусідів. */
function getNeighbourOffsets() {
  return [
    [-1, -1], [-1, 0], [-1, 1],
    [ 0, -1],          [ 0, 1],
    [ 1, -1], [ 1, 0], [ 1, 1],
  ];
}

/** Перевіряє, чи координати (row, col) знаходяться в межах поля. */
function isInBounds(row, col, rows, cols) {
  return row >= 0 && row < rows && col >= 0 && col < cols;
}

// ─── Ініціалізація ────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  const startBtn = document.querySelector('.btn-start');
  startBtn.addEventListener('click', startGame);

  // Відразу малюємо порожнє поле без таймера
  field = generateField(gameState.rows, gameState.cols, gameState.minesCount);
  renderBoard();
  updateMineCounter();
});