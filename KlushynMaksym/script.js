const CELL_CONTENT = {
  EMPTY: 'empty',
  MINE: 'mine'
};

const CELL_STATE = {
  CLOSED: 'closed',
  OPENED: 'opened',
  FLAGGED: 'flagged'
};

const GAME_STATUS = {
  PROCESS: 'process',
  WIN: 'win',
  LOSE: 'lose'
};

const DIRECTIONS = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],           [0, 1],
  [1, -1],  [1, 0],  [1, 1]
];

// Глобальний стан гри
const gameState = {
  rows: 9, 
  cols: 9,
  minesCount: 15,
  status: GAME_STATUS.PROCESS,
  gameTime: 0,
  timerId: null,
  field: []
};

// Генерація поля та випадкове розміщення мін
function generateField(rows, cols, minesCount) {
  gameState.field = [];
  
  for (let row = 0; row < rows; row++) {
    const currentRow = [];
    for (let col = 0; col < cols; col++) {
      currentRow.push({ type: CELL_CONTENT.EMPTY, state: CELL_STATE.CLOSED, neighborMines: 0 });
    }
    gameState.field.push(currentRow);
  }

  let placedMines = 0;
  while (placedMines < minesCount) {
    const row = Math.floor(Math.random() * rows);
    const col = Math.floor(Math.random() * cols);

    if (gameState.field[row][col].type !== CELL_CONTENT.MINE) {
      gameState.field[row][col].type = CELL_CONTENT.MINE;
      placedMines++;
    }
  }
}

function countAdjacentMines(board, rows, cols) {
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (board[row][col].type === CELL_CONTENT.MINE) continue;

      let minesAround = 0;
      for (const [directionalRow, directionalCol] of DIRECTIONS) {
        const neighbourRow = row + directionalRow;
        const neighbourCol = col + directionalCol;
        
        if (neighbourRow >= 0 && neighbourRow < rows && neighbourCol >= 0 && neighbourCol < cols) {
          if (board[neighbourRow][neighbourCol].type === CELL_CONTENT.MINE) {
            minesAround++;
          }
        }
      }
      board[row][col].neighborMines = minesAround;
    }
  }
}

function checkWinCondition(board, rows, cols) {
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const cell = board[row][col];
      // Якщо клітинка не є міною і при цьому не відкрита — гра ще не виграна
      if (cell.type !== CELL_CONTENT.MINE && cell.state !== CELL_STATE.OPENED) {
        return false;
      }
    }
  }
  gameState.status = GAME_STATUS.WIN;
  stopTimer();
  return true;
}

// Логіка відкриття клітинки та рекурсія
function revealCell(board, row, col, rows, cols) {
  if (row < 0 || row >= rows || col < 0 || col >= cols) return;

  const cell = board[row][col];

  if (cell.state === CELL_STATE.OPENED || cell.state === CELL_STATE.FLAGGED || gameState.status !== GAME_STATUS.PROCESS) return;

  if (cell.type === CELL_CONTENT.MINE) {
    cell.state = CELL_STATE.OPENED;
    gameState.status = GAME_STATUS.LOSE;
    stopTimer();
    return;
  }

  cell.state = CELL_STATE.OPENED;
  checkWinCondition(board, rows, cols);

  if (cell.neighborMines === 0) {
    for (const [directionalRow, directionalCol] of DIRECTIONS) {
      revealCell(board, row + directionalRow, col + directionalCol, rows, cols);
    }
  }
}

function toggleFlag(board, row, col, rows, cols) {
  if (row < 0 || row >= rows || col < 0 || col >= cols) return;

  const cell = board[row][col];
  if (cell.state === CELL_STATE.OPENED || gameState.status !== GAME_STATUS.PROCESS) return;

  if (cell.state === CELL_STATE.CLOSED) {
    cell.state = CELL_STATE.FLAGGED;
  } else if (cell.state === CELL_STATE.FLAGGED) {
    cell.state = CELL_STATE.CLOSED;
  }
}

function startTimer() {
  if (gameState.timerId !== null) return;
  gameState.timerId = setInterval(() => {
    gameState.gameTime++;
  }, 1000);
}

function stopTimer() {
  if (gameState.timerId !== null) {
    clearInterval(gameState.timerId);
    gameState.timerId = null;
  }
}

// Початкова ініціалізація
function initGame() {
  gameState.status = GAME_STATUS.PROCESS;
  gameState.gameTime = 0;
  stopTimer();
  generateField(gameState.rows, gameState.cols, gameState.minesCount);
  countAdjacentMines(gameState.field, gameState.rows, gameState.cols);
  startTimer();
}

initGame();
