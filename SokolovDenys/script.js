// 0. Константи (Enums) — узгоджені з документацією проєкту
const GAME_STATUS = {
  IDLE: 'idle',
  PLAYING: 'playing',
  WON: 'won',
  LOST: 'lost',
};

const CELL_TYPE = {
  EMPTY: 'empty',
  MINE: 'mine',
};

const CELL_STATE = {
  CLOSED: 'closed',
  OPEN: 'open',
  FLAGGED: 'flagged',
};

// Константи для обходу сусідів
const DIRECTIONS = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],           [0, 1],
  [1, -1],  [1, 0],  [1, 1],
];

const gameState = {
  rows: 5,
  cols: 5,
  minesCount: 5,
  status: GAME_STATUS.IDLE,
  gameTime: 0,
  timerId: null,
  field: [],
  openedCellsCount: 0, // Оптимізація: лічильник для O(1) перевірки перемоги
};

// 1. Генерація поля
function generateField(rows, cols, minesCount) {
  const totalCells = rows * cols;

  // Захист від нескінченного циклу (Clamping)
  if (minesCount >= totalCells) {
    minesCount = totalCells - 1;
  }

  gameState.field = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      type: CELL_TYPE.EMPTY,
      neighborMines: 0,
      state: CELL_STATE.CLOSED,
    }))
  );

  let placedMines = 0;

  while (placedMines < minesCount) {
    const row = Math.floor(Math.random() * rows);
    const col = Math.floor(Math.random() * cols);

    if (gameState.field[row][col].type !== CELL_TYPE.MINE) {
      gameState.field[row][col].type = CELL_TYPE.MINE;
      placedMines++;
    }
  }

  countAllNeighbours();
}

// 2. Підрахунок сусідів
function countAllNeighbours() {
  for (let row = 0; row < gameState.rows; row++) {
    for (let col = 0; col < gameState.cols; col++) {
      if (gameState.field[row][col].type === CELL_TYPE.MINE) continue;

      let count = 0;

      for (const [directionalRow, directionalCol] of DIRECTIONS) {
        const neighbourRow = row + directionalRow;
        const neighbourCol = col + directionalCol;

        if (
          neighbourRow >= 0 && neighbourRow < gameState.rows &&
          neighbourCol >= 0 && neighbourCol < gameState.cols
        ) {
          if (gameState.field[neighbourRow][neighbourCol].type === CELL_TYPE.MINE) {
            count++;
          }
        }
      }

      gameState.field[row][col].neighborMines = count;
    }
  }
}

// 3. Логіка відкриття
function openCell(row, col) {
  const cell = gameState.field[row][col];

  // Перевірка статусів згідно з новими Enums
  if (
    gameState.status === GAME_STATUS.WON || 
    gameState.status === GAME_STATUS.LOST || 
    cell.state !== CELL_STATE.CLOSED
  ) {
    return;
  }

  if (cell.type === CELL_TYPE.MINE) {
    cell.state = CELL_STATE.OPEN;
    endGame(GAME_STATUS.LOST);

    return;
  }

  cell.state = CELL_STATE.OPEN;
  gameState.openedCellsCount++; // Інкремент лічильника

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

  const timerElement = document.getElementById('game-timer');

  gameState.timerId = setInterval(() => {
    gameState.gameTime++;
    if (timerElement) timerElement.textContent = gameState.gameTime;
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

  const modal = document.getElementById('game-modal');
  const title = document.getElementById('modal-title');
  const message = document.getElementById('modal-message');

  if (result === GAME_STATUS.WON) {
    title.textContent = '🎉 ПЕРЕМОГА!';
    title.className = 'status-win';
    message.textContent = `Твій час: ${gameState.gameTime} сек.`;
  } else {
    title.textContent = '💥';
    title.className = 'status-lose';
    message.textContent = 'Ти натрапив на міну. Спробуй ще раз!';
  }

  if (modal) modal.style.display = 'flex';
}

// Оптимізована перевірка перемоги O(1)
function checkWin() {
  const safeCellsCount = (gameState.rows * gameState.cols) - gameState.minesCount;

  if (gameState.openedCellsCount === safeCellsCount) {
    endGame(GAME_STATUS.WON);
  }
}

// 6. Малювання поля
function renderBoard() {
  const boardElement = document.querySelector('.game-board');
  if (!boardElement) return;

  // Лічильник ЗАЛИШКУ прапорців (minesCount - placedFlags)
  const placedFlags = gameState.field.flat().filter(cell => cell.state === CELL_STATE.FLAGGED).length;
  const flagsElement = document.getElementById('flags-count');
  
  if (flagsElement) {
    flagsElement.textContent = Math.max(0, gameState.minesCount - placedFlags);
  }

  boardElement.innerHTML = '';

  for (let row = 0; row < gameState.rows; row++) {
    for (let col = 0; col < gameState.cols; col++) {
      const cellData = gameState.field[row][col];
      const cellElement = document.createElement('div');
      cellElement.classList.add('cell');

      if (cellData.state === CELL_STATE.OPEN) {
        cellElement.classList.add('revealed');
        if (cellData.type === CELL_TYPE.MINE) {
          cellElement.classList.add('exploded');
          cellElement.textContent = '💣';
        } else if (cellData.neighborMines > 0) {
          cellElement.textContent = cellData.neighborMines;
          cellElement.classList.add(`number-${cellData.neighborMines}`);
        }
      } else if (cellData.state === CELL_STATE.FLAGGED) {
        cellElement.classList.add('flag');
        cellElement.textContent = '🚩';
      }

      cellElement.addEventListener('click', () => {
        if (gameState.status === GAME_STATUS.IDLE || gameState.status === GAME_STATUS.PLAYING) {
          if (gameState.status === GAME_STATUS.IDLE) {
            gameState.status = GAME_STATUS.PLAYING;
            startTimer();
          }
          openCell(row, col);
          renderBoard();
        }
      });

      cellElement.addEventListener('contextmenu', (event) => {
        event.preventDefault();
        if (gameState.status === GAME_STATUS.PLAYING || gameState.status === GAME_STATUS.IDLE) {
          toggleFlag(row, col);
          renderBoard();
        }
      });

      boardElement.appendChild(cellElement);
    }
  }
}

function resetGame() {
  stopTimer();
  gameState.status = GAME_STATUS.IDLE;
  gameState.gameTime = 0;
  gameState.openedCellsCount = 0;
  
  const timerElement = document.getElementById('game-timer');
  if (timerElement) timerElement.textContent = '0';
  
  generateField(gameState.rows, gameState.cols, gameState.minesCount);
  renderBoard();
}

// Керування подіями
window.onload = () => {
  const resetButton = document.querySelector('.reset-button');
  if (resetButton) {
    resetButton.addEventListener('click', resetGame);
  }

  const playAgainButton = document.getElementById('play-again-button');
  if (playAgainButton) {
    playAgainButton.addEventListener('click', () => {
      resetGame();
      const modal = document.getElementById('game-modal');
      if (modal) modal.style.display = 'none';
    });
  }
  
  resetGame();
};