// 0. Константи (Enums) — узгоджені з документацією проєкту

const GAME_STATUS = {
  IDLE: 'idle',
  PLAYING: 'playing',
  WON: 'won',
  LOST: 'lost',
};

const CELL_CONTENT = {
  EMPTY: 'empty',
  MINE: 'mine',
};

const CELL_STATE = {
  CLOSED: 'closed',
  OPEN: 'open',
  FLAGGED: 'flagged',
};

const DIRECTIONS = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],           [0, 1],
  [1, -1],  [1, 0],  [1, 1],
];

const DEFAULT_ROWS = 5;
const DEFAULT_COLS = 5;
const DEFAULT_MINES_COUNT = 5;

const gameState = {
  rows: DEFAULT_ROWS,
  cols: DEFAULT_COLS,
  minesCount: DEFAULT_MINES_COUNT,
  status: GAME_STATUS.IDLE,
  gameTime: 0,
  timerId: null,
  field: [],
  openedCellsCount: 0,
};

const DOM = {
  board: null,
  timer: null,
  flags: null,
  modal: null,
  modalTitle: null,
  modalMessage: null,
};

function initDOMRefs() {
  DOM.board = document.querySelector('.game-board');
  DOM.timer = document.getElementById('game-timer');
  DOM.flags = document.getElementById('flags-count');
  DOM.modal = document.getElementById('game-modal');
  DOM.modalTitle = document.getElementById('modal-title');
  DOM.modalMessage = document.getElementById('modal-message');
}


// 1. Генерація поля
function generateField(rows, cols, minesCount) {
  const totalCells = rows * cols;

  const clampedMinesCount = minesCount >= totalCells ? totalCells - 1 : minesCount;
  gameState.minesCount = clampedMinesCount;

  gameState.field = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      type: CELL_CONTENT.EMPTY,
      neighborMines: 0,
      state: CELL_STATE.CLOSED,
    }))
  );

  let placedMines = 0;

  while (placedMines < clampedMinesCount) {
    const row = Math.floor(Math.random() * rows);
    const col = Math.floor(Math.random() * cols);

    if (gameState.field[row][col].type !== CELL_CONTENT.MINE) {
      gameState.field[row][col].type = CELL_CONTENT.MINE;
      placedMines++;
    }
  }

  countAllNeighbours(gameState.field, rows, cols);
}


// 2. Підрахунок сусідів
function countAllNeighbours(field, rows, cols) {
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (field[row][col].type === CELL_CONTENT.MINE) continue;

      let count = 0;

      for (const [directionalRow, directionalCol] of DIRECTIONS) {
        const neighbourRow = row + directionalRow;
        const neighbourCol = col + directionalCol;

        if (
          neighbourRow >= 0 && neighbourRow < rows &&
          neighbourCol >= 0 && neighbourCol < cols
        ) {
          if (field[neighbourRow][neighbourCol].type === CELL_CONTENT.MINE) {
            count++;
          }
        }
      }

      field[row][col].neighborMines = count;
    }
  }
}


// 3. Логіка відкриття
function openCell(row, col) {
  const cell = gameState.field[row][col];

  if (
    gameState.status === GAME_STATUS.WON ||
    gameState.status === GAME_STATUS.LOST ||
    cell.state !== CELL_STATE.CLOSED
  ) {
    return;
  }

  if (cell.type === CELL_CONTENT.MINE) {
    cell.state = CELL_STATE.OPEN;
    endGame(GAME_STATUS.LOST);
    return;
  }

  cell.state = CELL_STATE.OPEN;
  gameState.openedCellsCount++;

  if (cell.neighborMines === 0) {
    for (const [directionalRow, directionalCol] of DIRECTIONS) {
      const neighbourRow = row + directionalRow;
      const neighbourCol = col + directionalCol;

      if (
        neighbourRow >= 0 && neighbourRow < gameState.rows &&
        neighbourCol >= 0 && neighbourCol < gameState.cols
      ) {
        openCell(neighbourRow, neighbourCol);
      }
    }
  }

  checkWin();
}


// 4. Керування прапорцями
function toggleFlag(row, col) {
  const cell = gameState.field[row][col];

  if (
    gameState.status === GAME_STATUS.WON ||
    gameState.status === GAME_STATUS.LOST ||
    cell.state === CELL_STATE.OPEN
  ) {
    return;
  }

  cell.state = (cell.state === CELL_STATE.FLAGGED) ? CELL_STATE.CLOSED : CELL_STATE.FLAGGED;
}


// 5. Таймер
function startTimer() {
  if (gameState.timerId) return;

  gameState.timerId = setInterval(() => {
    gameState.gameTime++;
    DOM.timer.textContent = gameState.gameTime;
  }, 1000);
}


function stopTimer() {
  clearInterval(gameState.timerId);
  gameState.timerId = null;
}


function endGame(result) {
  gameState.status = result;
  stopTimer();
  renderBoard();

  if (result === GAME_STATUS.WON) {
    DOM.modalTitle.textContent = '🎉 ПЕРЕМОГА!';
    DOM.modalTitle.className = 'status-win';
    DOM.modalMessage.textContent = `Твій час: ${gameState.gameTime} сек.`;
  } else {
    DOM.modalTitle.textContent = '💥';
    DOM.modalTitle.className = 'status-lose';
    DOM.modalMessage.textContent = 'Ти натрапив на міну. Спробуй ще раз!';
  }

  DOM.modal.style.display = 'flex';
}


function checkWin() {
  const safeCellsCount = (gameState.rows * gameState.cols) - gameState.minesCount;

  if (gameState.openedCellsCount === safeCellsCount) {
    endGame(GAME_STATUS.WON);
  }
}


// 6. Малювання поля
function renderBoard() {
  if (!DOM.board) return;

  const placedFlags = gameState.field.flat().filter(cell => cell.state === CELL_STATE.FLAGGED).length;
  DOM.flags.textContent = Math.max(0, gameState.minesCount - placedFlags);

  DOM.board.innerHTML = '';

  for (let row = 0; row < gameState.rows; row++) {
    for (let col = 0; col < gameState.cols; col++) {
      const cellData = gameState.field[row][col];

      const cellElement = document.createElement('button');
      cellElement.setAttribute('type', 'button');
      cellElement.classList.add('cell');

      let ariaLabel = `Рядок ${row + 1}, стовпець ${col + 1}`;

      if (cellData.state === CELL_STATE.OPEN) {
        cellElement.classList.add('revealed');
        if (cellData.type === CELL_CONTENT.MINE) {
          cellElement.classList.add('exploded');
          cellElement.textContent = '💣';
          ariaLabel += ', міна';
        } else if (cellData.neighborMines > 0) {
          cellElement.textContent = cellData.neighborMines;
          cellElement.classList.add(`number-${cellData.neighborMines}`);
          ariaLabel += `, ${cellData.neighborMines} сусідніх мін`;
        } else {
          ariaLabel += ', порожня';
        }
      } else if (cellData.state === CELL_STATE.FLAGGED) {
        cellElement.classList.add('flag');
        cellElement.textContent = '🚩';
        ariaLabel += ', позначена прапорцем';
      } else {
        ariaLabel += ', закрита';
      }

      cellElement.setAttribute('aria-label', ariaLabel);

      cellElement.addEventListener('click', () => {
        if (gameState.status === GAME_STATUS.IDLE || gameState.status === GAME_STATUS.PLAYING) {
          if (gameState.status === GAME_STATUS.IDLE) {
            gameState.status = GAME_STATUS.PLAYING;
            startTimer();
          }
          openCell(row, col);

          if (gameState.status === GAME_STATUS.PLAYING) {
            renderBoard();
          }
        }
      });

      cellElement.addEventListener('contextmenu', (event) => {
        event.preventDefault();
        if (gameState.status === GAME_STATUS.PLAYING || gameState.status === GAME_STATUS.IDLE) {
          toggleFlag(row, col);
          renderBoard();
        }
      });

      DOM.board.appendChild(cellElement);
    }
  }
}


function resetGame() {
  stopTimer();
  gameState.status = GAME_STATUS.IDLE;
  gameState.gameTime = 0;
  gameState.openedCellsCount = 0;
  DOM.timer.textContent = '0';

  generateField(gameState.rows, gameState.cols, gameState.minesCount);
  renderBoard();
}


// Керування подіями
document.addEventListener('DOMContentLoaded', () => {
  initDOMRefs();

  const resetButton = document.getElementById('reset-btn');
  if (resetButton) {
    resetButton.addEventListener('click', resetGame);
  }

  const playAgainButton = document.getElementById('play-again-button');
  if (playAgainButton) {
    playAgainButton.addEventListener('click', () => {
      resetGame();
      DOM.modal.style.display = 'none';
    });
  }

  resetGame();
});