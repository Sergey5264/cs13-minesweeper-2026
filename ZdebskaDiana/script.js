// --- Константи ----------

const DEFAULT_ROWS = 8;
const DEFAULT_COLS = 8;
const DEFAULT_MINE_COUNT = 10;

const GAME_STATUS = {
  IDLE: 'idle',
  PLAYING: 'process',
  WON: 'win',
  LOST: 'lose',
};

const CELL_STATE = {
  CLOSED: 'closed',
  OPENED: 'opened',
  FLAGGED: 'flagged',
};

const CELL_CONTENT = {
  MINE: 'mine',
  EMPTY: 'empty',
};

const DIRECTIONS = [
  [-1, -1], [-1, 0], [-1, 1],
  [ 0, -1],          [ 0, 1],
  [ 1, -1], [ 1, 0], [ 1, 1],
];

// --- Стан гри ----------

const gameState = {
  rows: DEFAULT_ROWS,
  cols: DEFAULT_COLS,
  minesCount: DEFAULT_MINE_COUNT,
  status: GAME_STATUS.IDLE,
  gameTime: 0,
  timerId: null,
  board: [],
};


// --- Кешовані DOM-посилання -------
let mineCounterElement;
let timerDisplayElement;


// --- Генерація поля ----------

/**
 * Створює порожню сітку розміром rows × cols,
 * розставляє міни та підраховує сусідів.
 * @param {number} rows
 * @param {number} cols
 * @param {number} minesCount
 * @returns {Array<Array<Object>>} двовимірний масив клітинок
 */
function generateField(rows, cols, minesCount) {
  const grid = Array.from({ length: rows }, () =>
  Array.from({ length: cols }, () => ({
    type: CELL_CONTENT.EMPTY,
    neighborMines: 0,
    state: CELL_STATE.CLOSED,
    triggered: false,
    wrongFlag: false,
  }))
);


  // 2. Розставляємо міни випадково, без дублікатів
  let placed = 0;
  while (placed < minesCount) {
    const row = Math.floor(Math.random() * rows);
    const col = Math.floor(Math.random() * cols);

    if (grid[row][col].type !== CELL_CONTENT.MINE) {
      grid[row][col].type = CELL_CONTENT.MINE;
      placed++;
    }
  }

  // 3. Підраховуємо сусідів для кожної порожньої клітинки
  countNeighbourMines(grid, rows, cols);

  return grid;
}

// --- Підрахунок сусідів -----------

/**
 * Для кожної клітинки типу 'empty' записує кількість мін серед 8 сусідів.
 * @param {Array<Array<Object>>} grid
 * @param {number} rows
 * @param {number} cols
 */
function countNeighbourMines(grid, rows, cols) {
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (grid[row][col].type === CELL_CONTENT.MINE) continue;

      let count = 0;

      for (const [directionalRow, directionalCol] of DIRECTIONS) {
        const neighbourRow = row + directionalRow;
        const neighbourCol = col + directionalCol;
 
        if (
          isInBounds(neighbourRow, neighbourCol, rows, cols) &&
          grid[neighbourRow][neighbourCol].type === CELL_CONTENT.MINE
        ) {
          count++;
        }
      }    

      grid[row][col].neighborMines = count;
    }
  }
}

// ---- Відкриття клітинки ----------

/**
 * Відкриває клітинку (row, col).
 * – Якщо клітинка вже відкрита або під прапорцем — нічого не робить.
 * – Якщо міна — програш.
 * – Якщо neighborMines === 0 — рекурсивно відкриває сусідів.
 * @param {number} row
 * @param {number} col
 */
function openCell(row, col) {
  const cell = gameState.board[row][col];

  if (cell.state === CELL_STATE.OPENED || cell.state === CELL_STATE.FLAGGED) return;

  cell.state = CELL_STATE.OPENED;

  if (cell.type === CELL_CONTENT.MINE) {
    cell.triggered = true;
    gameState.status = GAME_STATUS.LOST;
    stopTimer();
    revealAllMines(row, col);
    return;
  }

  if (cell.neighborMines === 0) {
    for (const [directionalRow, directionalCol] of DIRECTIONS) {
      const neighbourRow = row + directionalRow;
      const neighbourCol = col + directionalCol;

      if (isInBounds(neighbourRow, neighbourCol, gameState.rows, gameState.cols)) {
        openCell(neighbourRow, neighbourCol);
      }
    }
  }
}
function handleCellClick(row, col) {
  if (gameState.status === GAME_STATUS.WON || gameState.status === GAME_STATUS.LOST) return;

  if (gameState.status === GAME_STATUS.IDLE) {
    gameState.board = generateField(gameState.rows, gameState.cols, gameState.minesCount);
    gameState.status = GAME_STATUS.PLAYING;
    startTimer();
  }

  openCell(row, col);
  checkWin();
  renderBoard();
}
// ---- Прапорець ------------------

/**
 * Перемикає прапорець на клітинці (row, col).
 * Якщо клітинка вже відкрита — нічого не робить.
 * @param {number} row
 * @param {number} col
 */
function toggleFlag(row, col) {
  if (gameState.status !== GAME_STATUS.PLAYING) return;

  const cell = gameState.board[row][col];

  if (cell.state === CELL_STATE.OPENED) return;

  cell.state = cell.state === CELL_STATE.FLAGGED 
    ? CELL_STATE.CLOSED 
    : CELL_STATE.FLAGGED;
  renderBoard();
  updateMineCounter();
}


// ---- Перевірка перемоги -------------------

/**
 * Перевіряє, чи всі порожні клітинки відкриті.
 * Якщо так — перемога.
 */
function checkWin() {
  if (gameState.status !== GAME_STATUS.PLAYING) return;
 
  const allOpened = gameState.board.every((row) =>
    row.every(
      (cell) =>
        cell.type === CELL_CONTENT.MINE || cell.state === CELL_STATE.OPENED
    )
  );
 
  if (allOpened) {
    gameState.status = GAME_STATUS.WON;
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
  gameState.board.forEach((row, rowIndex) =>
    row.forEach((cell, colIndex) => {
      if (cell.type === CELL_CONTENT.MINE && cell.state !== CELL_STATE.FLAGGED) {
        cell.state = CELL_STATE.OPENED;
        cell.triggered = rowIndex === triggeredRow && colIndex === triggeredCol;
      }
      if (cell.type !== CELL_CONTENT.MINE && cell.state === CELL_STATE.FLAGGED) {
        cell.wrongFlag = true;
      }
    })
  );
}

// ---- Таймер -------------------

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

// ------ Старт / Рестарт гри ---------------

function startGame() {
  stopTimer();

  gameState.status = GAME_STATUS.IDLE;
  gameState.gameTime = 0;
  gameState.board = [];

  renderBoard();
  updateMineCounter();
  updateTimerDisplay();
}

// ------- Рендер поля ------------------

function renderBoard() {
  const boardEl = document.querySelector('.minesweeper__board');
  boardEl.style.setProperty('--cols', gameState.cols);
  boardEl.innerHTML = '';

  const isEmpty = gameState.board.length === 0;

  for (let rowIndex = 0; rowIndex < gameState.rows; rowIndex++) {
    for (let colIndex = 0; colIndex < gameState.cols; colIndex++) {
      const cell = isEmpty
        ? { state: CELL_STATE.CLOSED, type: CELL_CONTENT.EMPTY, neighborMines: 0, triggered: false, wrongFlag: false }
        : gameState.board[rowIndex][colIndex];

      const cellButton = document.createElement('button');
      cellButton.type = 'button';
      cellButton.classList.add('cell');

      applyCellClass(cellButton, cell, rowIndex, colIndex);
      cellButton.addEventListener('click', () => handleCellClick(rowIndex, colIndex));
      cellButton.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        toggleFlag(rowIndex, colIndex);
      });
      
      boardEl.appendChild(cellButton);
    }
  }
}

/**
 * Додає потрібні CSS-класи на DOM-елемент клітинки залежно від її стану.
 * @param {HTMLElement} el
 * @param {Object} cell
 */

function applyCellClass(element, cell, rowIndex, colIndex) {
  const position = `Ряд ${rowIndex + 1}, стовпець ${colIndex + 1}`;

  if (cell.wrongFlag) {
    element.classList.add('cell--flag-wrong');
    element.setAttribute('aria-label', `${position}, помилковий прапорець`);
    return;
  }
  if (cell.state === CELL_STATE.FLAGGED) {
    element.classList.add('cell--closed', 'cell--flag');
    element.setAttribute('aria-label', `${position}, прапорець`);
    return;
  }
  if (cell.state === CELL_STATE.CLOSED) {
    element.classList.add('cell--closed');
    element.setAttribute('aria-label', `${position}, закрита`);
    return;
  }
  if (cell.type === CELL_CONTENT.MINE) {
    element.classList.add(cell.triggered ? 'cell--mine-triggered' : 'cell--mine');
    element.setAttribute('aria-label', `${position}, міна`);
    return;
  }
  element.classList.add('cell--open');
  if (cell.neighborMines === 0) {
    element.classList.add('cell--num-0');
    element.setAttribute('aria-label', `${position}, відкрита, порожня`);
  } else {
    element.classList.add(`cell--num-${cell.neighborMines}`);
    element.textContent = cell.neighborMines;
    element.setAttribute('aria-label', `${position}, ${cell.neighborMines} сусідніх мін`);
  }
}
// ─── Оновлення UI лічильників ─────────────────────────────────────────────────

function updateMineCounter() {
  const flaggedCount = gameState.board.flat().filter((cell) => cell.state === CELL_STATE.FLAGGED).length;
  const remaining = Math.max(gameState.minesCount - flaggedCount, 0);
  mineCounterElement.textContent = String(remaining).padStart(3, '0');
}

function updateTimerDisplay() {
  const capped = Math.min(gameState.gameTime, 999);
  timerDisplayElement.textContent = String(capped).padStart(3, '0');
}

function updateStatusMessage() {
  const statusEl = document.querySelector('.minesweeper__status');
  if (!statusEl) return;
 
  if (gameState.status === GAME_STATUS.WON) {
    statusEl.textContent = 'Перемога! 🎉';
  } else if (gameState.status === GAME_STATUS.LOST) {
    statusEl.textContent = 'Програш 💥';
  } else {
    statusEl.textContent = '';
  }
}
// --- Допоміжні функції ----------


/** Перевіряє, чи координати (row, col) знаходяться в межах поля. */
function isInBounds(row, col, rows, cols) {
  return row >= 0 && row < rows && col >= 0 && col < cols;
}

// ─── Ініціалізація ────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  mineCounterElement = document.querySelector('.info-block__value--danger span:last-child');
  timerDisplayElement = document.querySelector('.info-block:last-child .info-block__value span:last-child');

  const startBtn = document.querySelector('.btn-start');
  startBtn.addEventListener('click', startGame);

  startGame();
});