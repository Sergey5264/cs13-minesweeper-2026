const ROWS = 10;
const COLS = 10;
const MINES_COUNT = 5; // "немного меньше мин"

/** @typedef {{ index:number, row:number, col:number, isMine:boolean, isOpen:boolean, isFlagged:boolean, adjacentMines:number }} Cell */

const timerEl = document.getElementById('timer');
const flagsEl = document.getElementById('flags-count');
const buttonEl = document.getElementById('new-game');
const gridEl = document.getElementById('grid');
const messageEl = document.getElementById('message');

/** @type {Cell[]} */
let board = [];
let status = 'ready'; // ready | running | won | lost
let flagsAvailable = MINES_COUNT;
let openedSafeCount = 0;
let timerId = null;
let seconds = 0;

function setMessage(text, kind) {
  if (!text) {
    messageEl.textContent = '';
    messageEl.className = 'message message--hidden';
    return;
  }
  messageEl.textContent = text;
  messageEl.className = `message message--${kind ?? 'info'}`;
}

function updateHud() {
  timerEl.textContent = String(seconds);
  flagsEl.textContent = String(flagsAvailable);
  buttonEl.textContent = status === 'running' ? 'Рестарт' : 'Старт';
}

function stopTimer() {
  if (timerId) window.clearInterval(timerId);
  timerId = null;
}

function startTimer() {
  stopTimer();
  timerId = window.setInterval(() => {
    seconds += 1;
    timerEl.textContent = String(seconds);
  }, 1000);
}

function indexToRowCol(index) {
  return { row: Math.floor(index / COLS), col: index % COLS };
}

function rowColToIndex(row, col) {
  return row * COLS + col;
}

function neighborsOf(index) {
  const { row, col } = indexToRowCol(index);
  const result = [];
  for (let dRow = -1; dRow <= 1; dRow += 1) {
    for (let dCol = -1; dCol <= 1; dCol += 1) {
      if (dRow === 0 && dCol === 0) continue;
      const neighborRow = row + dRow;
      const neighborCol = col + dCol;
      if (neighborRow < 0 || neighborRow >= ROWS || neighborCol < 0 || neighborCol >= COLS) continue;
      result.push(rowColToIndex(neighborRow, neighborCol));
    }
  }
  return result;
}

function shuffledIndices(n) {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function createBoard() {
  const total = ROWS * COLS;
  const mineSet = new Set(shuffledIndices(total).slice(0, MINES_COUNT));

  board = Array.from({ length: total }, (_, index) => {
    const { row, col } = indexToRowCol(index);
    return {
      index,
      row,
      col,
      isMine: mineSet.has(index),
      isOpen: false,
      isFlagged: false,
      adjacentMines: 0,
    };
  });

  board.forEach((cell) => {
    if (cell.isMine) return;
    const minesAround = neighborsOf(cell.index).reduce((acc, ni) => acc + (board[ni].isMine ? 1 : 0), 0);
    cell.adjacentMines = minesAround;
  });
}

function renderGridFromBoard() {
  gridEl.style.setProperty('--cols', String(COLS));
  gridEl.innerHTML = '';

  const frag = document.createDocumentFragment();
  board.forEach((cell) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cell cell--closed';
    btn.dataset.index = String(cell.index);
    frag.appendChild(btn);
  });
  gridEl.appendChild(frag);
}

function getCellEl(index) {
  return gridEl.querySelector(`.cell[data-index="${index}"]`);
}

function applyCellToDom(cell) {
  const el = getCellEl(cell.index);
  if (!el) return;

  el.textContent = '';

  if (cell.isOpen) {
    el.className = 'cell cell--open';
    if (cell.isMine) {
      el.className = 'cell cell--mine';
      return;
    }
    if (cell.adjacentMines > 0) {
      el.textContent = String(cell.adjacentMines);
    }
    return;
  }

  if (cell.isFlagged) {
    el.className = 'cell cell--flag';
    return;
  }

  el.className = 'cell cell--closed';
}

function applyAllToDom() {
  board.forEach(applyCellToDom);
}

function endGame(newStatus) {
  status = newStatus;
  stopTimer();
  updateHud();
}

function revealMines(hitIndex) {
  board.forEach((cell) => {
    if (!cell.isMine) return;
    cell.isOpen = true;
  });
  applyAllToDom();

  const hitEl = getCellEl(hitIndex);
  if (hitEl) hitEl.className = 'cell cell--mine-hit';
}

function openCellRecursive(startIndex) {
  const queue = [startIndex];
  const visited = new Set();

  while (queue.length) {
    const idx = queue.shift();
    if (idx == null) break;
    if (visited.has(idx)) continue;
    visited.add(idx);

    const cell = board[idx];
    if (cell.isOpen || cell.isFlagged) continue;
    if (cell.isMine) continue;

    cell.isOpen = true;
    openedSafeCount += 1;
    applyCellToDom(cell);

    if (cell.adjacentMines === 0) {
      neighborsOf(idx).forEach((n) => {
        if (!visited.has(n)) queue.push(n);
      });
    }
  }
}

function checkWin() {
  const safeCells = ROWS * COLS - MINES_COUNT;
  return openedSafeCount === safeCells;
}

function startNewGame() {
  stopTimer();
  seconds = 0;
  status = 'ready';
  flagsAvailable = MINES_COUNT;
  openedSafeCount = 0;
  setMessage('', 'info');

  createBoard();
  renderGridFromBoard();
  applyAllToDom();
  updateHud();
}

function ensureRunning() {
  if (status === 'ready') {
    status = 'running';
    startTimer();
    updateHud();
  }
}

gridEl.addEventListener('click', (e) => {
  const el = e.target.closest('.cell');
  if (!el) return;
  const index = Number(el.dataset.index);
  if (!Number.isFinite(index)) return;

  if (status === 'won' || status === 'lost') return;
  ensureRunning();

  const cell = board[index];
  if (cell.isOpen || cell.isFlagged) return;

  if (cell.isMine) {
    revealMines(index);
    setMessage('Поразка: ви натрапили на міну.', 'lose');
    endGame('lost');
    return;
  }

  openCellRecursive(index);

  if (checkWin()) {
    setMessage('Перемога: всі безпечні клітинки відкриті!', 'win');
    endGame('won');
  }
});

gridEl.addEventListener('contextmenu', (e) => {
  const el = e.target.closest('.cell');
  if (!el) return;
  e.preventDefault();

  const index = Number(el.dataset.index);
  if (!Number.isFinite(index)) return;

  if (status === 'won' || status === 'lost') return;
  ensureRunning();

  const cell = board[index];
  if (cell.isOpen) return;

  if (cell.isFlagged) {
    cell.isFlagged = false;
    flagsAvailable += 1;
    applyCellToDom(cell);
    updateHud();
    return;
  }

  if (flagsAvailable <= 0) return;
  cell.isFlagged = true;
  flagsAvailable -= 1;
  applyCellToDom(cell);
  updateHud();
});

buttonEl.addEventListener('click', () => {
  startNewGame();
});

startNewGame();

