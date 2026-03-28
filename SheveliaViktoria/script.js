const DIRECTIONS = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
const CELL_STATE = {
  CLOSED: 'closed',
  OPENED: 'opened',
  FLAGGED: 'flagged',
};

const GAME_STATUS = {
  PROCESS: 'process',
  WIN: 'win',
  LOSE: 'lose',
};

const CELL_CONTENT = {
  MINE: 'mine',
  EMPTY: 'empty',
};
const gameState = {
  rows: 6,
  cols: 8,
  minesCount: 10,
  status: GAME_STATUS.PROCESS,
  gameTime: 0,
  timer: null,
  clickedMine: { row: -1, col: -1 },
  field: [],
  firstClick: true,
};
let fieldElement, timeValueElement, flagsValueElement, startButtonElement, statusElement, minesweeperElement;

function createEmptyField(rows, cols) {
  const field = [];
  for (let row = 0; row < rows; row++) {
    field[row] = [];
    for (let col = 0; col < cols; col++) {
      field[row][col] = {
        type: CELL_CONTENT.EMPTY,
        state: CELL_STATE.CLOSED,
        neighborMines: 0,
      };
    }
  }

  return field;
}


function isValidMinePlacement(field, rows, cols, row, col) {
  for (const [dRow, dCol] of DIRECTIONS) {
    const newRow = row + dRow;
    const newCol = col + dCol;
    if (
      newRow >= 0 && newRow < rows &&
      newCol >= 0 && newCol < cols &&
      field[newRow][newCol].type === CELL_CONTENT.EMPTY &&
      field[newRow][newCol].neighborMines > 3) {

      return false;
    }
  }

  return true;
}


function placeMines(field, rows, cols, minesCount, excludeRow, excludeCol) {
  const totalCells = rows * cols;
  const minePositions = new Set();
  let attempts = 0;

  while (minePositions.size < minesCount && attempts < 5000) {
    attempts++;

    const idx = Math.floor(Math.random() * totalCells);
    const row = Math.floor(idx / cols);
    const col = idx % cols;

    if ((row === excludeRow && col === excludeCol) || field[row][col].type === CELL_CONTENT.MINE) continue;

    field[row][col].type = CELL_CONTENT.MINE;
    updateNeighbourMinesAroundCell(field, rows, cols, row, col, 1);

    if (isValidMinePlacement(field, rows, cols, row, col)) {
      minePositions.add(`${row},${col}`);
    } else {
      updateNeighbourMinesAroundCell(field, rows, cols, row, col, -1);
      field[row][col].type = CELL_CONTENT.EMPTY;
    }
  }

  return minePositions;
}


function fillRemainingMines(field, rows, cols, minePositions, minesCount, excludeRow, excludeCol) {
  const available = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (!(row === excludeRow && col === excludeCol) && field[row][col].type !== CELL_CONTENT.MINE) {
        available.push({ row, col });
      }
    }
  }
  for (let i = available.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [available[i], available[j]] = [available[j], available[i]];
  }

  const needed = Math.min(minesCount - minePositions.size, available.length);

  for (let i = 0; i < needed; i++) {
    const { row, col } = available[i];
    field[row][col].type = CELL_CONTENT.MINE;
    minePositions.add(`${row},${col}`);
  }
}


function generateField(rows, cols, minesCount, excludeRow = -1, excludeCol = -1) {
  const field = createEmptyField(rows, cols);

  const minePositions = placeMines(field, rows, cols, minesCount, excludeRow, excludeCol);

  if (minePositions.size < minesCount) {
    fillRemainingMines(field, rows, cols, minePositions, minesCount, excludeRow, excludeCol);
  }

  countNeighbourMines(field, rows, cols);

  return field;
}


function countNeighbourMines(field, rows, cols) {
  for (let row = 0; row < rows; row++)
    for (let col = 0; col < cols; col++) {
      if (field[row][col].type === CELL_CONTENT.MINE) continue;
      let count = 0;
      for (const [directionalRow, directionalCol] of DIRECTIONS) {
        const newRow = row + directionalRow, newCol = col + directionalCol;
        if (newRow >= 0 && newRow < rows && newCol >= 0 && newCol < cols && field[newRow][newCol].type === CELL_CONTENT.MINE) count++;
      }
      field[row][col].neighborMines = count;
    }
}


function updateNeighbourMinesAroundCell(field, rows, cols, mineRow, mineCol, delta) {
  for (const [directionalRow, directionalCol] of DIRECTIONS) {
    const neighbourRow = mineRow + directionalRow;
    const neighbourCol = mineCol + directionalCol;
    if (neighbourRow >= 0 && neighbourRow < rows && neighbourCol >= 0 && neighbourCol < cols) {
      if (field[neighbourRow][neighbourCol].type !== CELL_CONTENT.MINE) {
        field[neighbourRow][neighbourCol].neighborMines += delta;
      }
    }
  }
}


function openCell(row, col) {
  if (gameState.status !== GAME_STATUS.PROCESS) return;
  const cell = gameState.field[row][col];
  if (cell.state === CELL_STATE.OPENED || cell.state === CELL_STATE.FLAGGED) return;

  if (gameState.firstClick) {
    gameState.firstClick = false;
    startTimer();
    if (cell.type === CELL_CONTENT.MINE) {
      gameState.field = generateField(gameState.rows, gameState.cols, gameState.minesCount, row, col);
      openCell(row, col);
      return;
    }
  }

  if (cell.type === CELL_CONTENT.MINE) {
    cell.state = CELL_STATE.OPENED;
    gameState.status = GAME_STATUS.LOSE;
    gameState.clickedMine = { row, col };
    stopTimer();
    revealAllMines();
    return;
  }

  openCellRecursive(row, col);
  renderField();
  checkWin();
}


function openCellRecursive(row, col) {
  const { rows, cols } = gameState;
  const stack = [[row, col]];

  while (stack.length > 0) {
    const [currentRow, currentCol] = stack.pop();
    if (currentRow < 0 || currentRow >= rows || currentCol < 0 || currentCol >= cols) continue;
    const cell = gameState.field[currentRow][currentCol];
    if (cell.state === CELL_STATE.OPENED || cell.state === CELL_STATE.FLAGGED) continue;

    cell.state = CELL_STATE.OPENED;

    if (cell.neighborMines === 0) {
      for (const [directionalRow, directionalCol] of DIRECTIONS) {
        const newRow = currentRow + directionalRow;
        const newCol = currentCol + directionalCol;
        stack.push([newRow, newCol]);
      }
    }
  }
}


function toggleFlag(row, col) {
  if (gameState.status !== GAME_STATUS.PROCESS) return;
  const cell = gameState.field[row][col];
  if (cell.state === CELL_STATE.OPENED) return;
  cell.state = cell.state === CELL_STATE.FLAGGED ? CELL_STATE.CLOSED : CELL_STATE.FLAGGED;
  renderField();
  updateFlagsDisplay();
}


function checkWin() {
  const { field, rows, cols } = gameState;
  let openedCount = 0, actualMines = 0;
  for (let row = 0; row < rows; row++)
    for (let col = 0; col < cols; col++) {
      if (field[row][col].state === CELL_STATE.OPENED) openedCount++;
      if (field[row][col].type === CELL_CONTENT.MINE) actualMines++;
    }
  if (openedCount === rows * cols - actualMines) {
    gameState.status = GAME_STATUS.WIN;
    stopTimer();
    renderField();
  }
}


function startTimer() {
  if (gameState.timer) return;
  gameState.timer = setInterval(() => {
    gameState.gameTime++;
    if (timeValueElement) timeValueElement.textContent = String(gameState.gameTime).padStart(3, '0');
  }, 1000);
}


function stopTimer() {
  if (gameState.timer) { clearInterval(gameState.timer); gameState.timer = null; }
}


function getCellClasses(cell, row, col) {
  const classes = ['cell'];
  const isClickedMine = gameState.clickedMine.row === row && gameState.clickedMine.col === col;

  if (gameState.status === GAME_STATUS.LOSE) {
    if (cell.type === CELL_CONTENT.MINE && isClickedMine) {
      classes.push('cell--mine-hit');
    }
    else if (cell.type === CELL_CONTENT.MINE && cell.state === CELL_STATE.FLAGGED) {
      classes.push('cell--flag-wrong');
    }
    else if (cell.type === CELL_CONTENT.EMPTY && cell.state === CELL_STATE.FLAGGED) {
      classes.push('cell--flag-correct');
    }
    else if (cell.type === CELL_CONTENT.MINE && cell.state !== CELL_STATE.FLAGGED && !isClickedMine) {
      classes.push('cell--mine');
    }
    else if (cell.state === CELL_STATE.OPENED && cell.type === CELL_CONTENT.EMPTY) {
      classes.push('cell--open');
      if (cell.neighborMines >= 1 && cell.neighborMines <= 3) {
        classes.push(`cell--num-${cell.neighborMines}`);
      }
    }
    else if (cell.state === CELL_STATE.CLOSED && cell.type === CELL_CONTENT.EMPTY) {
      classes.push('cell--closed');
    }
    else {
      if (cell.state === CELL_STATE.OPENED) {
        classes.push('cell--open');
      } else if (cell.state === CELL_STATE.CLOSED) {
        classes.push('cell--closed');
      } else if (cell.state === CELL_STATE.FLAGGED) {
        classes.push('cell--flag-wrong');
      }
    }
  }
  else {
    if (cell.state === CELL_STATE.CLOSED) {
      classes.push('cell--closed');
    }
    else if (cell.state === CELL_STATE.FLAGGED) {

      classes.push('cell--flag-wrong');
    }
    else if (cell.state === CELL_STATE.OPENED) {
      if (cell.type === CELL_CONTENT.MINE) {
        classes.push('cell--mine');
      } else {
        classes.push('cell--open');
        if (cell.neighborMines >= 1 && cell.neighborMines <= 3) {
          classes.push(`cell--num-${cell.neighborMines}`);
        }
      }
    }
  }

  return classes;
}


function getCellContent(cell) {
  return (cell.state === CELL_STATE.OPENED && cell.type === CELL_CONTENT.EMPTY && cell.neighborMines > 0) ? String(cell.neighborMines) : '';
}


function getAriaLabel(cell) {
  if (cell.state === CELL_STATE.CLOSED) return 'Закрита';
  if (cell.state === CELL_STATE.FLAGGED) return cell.type === CELL_CONTENT.MINE ? 'Прапорець на міні' : 'Прапорець без міни';
  if (cell.type === CELL_CONTENT.MINE) return cell.state === CELL_STATE.OPENED ? 'Натиснута міна' : 'Міна';
  return cell.neighborMines > 0 ? String(cell.neighborMines) : 'Порожня';
}


function renderField() {
  if (!fieldElement) return;
  const { field, rows, cols } = gameState;
  fieldElement.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  fieldElement.innerHTML = '';
  for (let row = 0; row < rows; row++)
    for (let col = 0; col < cols; col++) {
      const cell = field[row][col];
      const button = document.createElement('button');
      button.type = 'button';
      button.className = getCellClasses(cell, row, col).join(' ');
      button.textContent = getCellContent(cell);
      button.dataset.row = row; button.dataset.col = col;
      button.setAttribute('aria-label', getAriaLabel(cell));
      if (gameState.status === GAME_STATUS.PROCESS) {
        button.addEventListener('click', () => openCell(row, col));
        button.addEventListener('contextmenu', (event) => { event.preventDefault(); toggleFlag(row, col); });
      } else button.disabled = true;
      fieldElement.appendChild(button);
    }
  updateGameStatus();
}


function updateGameStatus() {
  if (!statusElement || !minesweeperElement || !startButtonElement) return;
  const { status } = gameState;
  statusElement.textContent = '';
  statusElement.className = 'game-status';
  minesweeperElement.classList.remove('minesweeper--win', 'minesweeper--lose');
  startButtonElement.classList.remove('start-btn--win', 'start-btn--lose');
  if (status === GAME_STATUS.WIN) {
    statusElement.textContent = 'Ви перемогли';
    statusElement.classList.add('game-status--visible', 'game-status--win');
    minesweeperElement.classList.add('minesweeper--win');
    startButtonElement.classList.add('start-btn--win');
    startButtonElement.textContent = 'Нова гра';
  } else if (status === GAME_STATUS.LOSE) {
    statusElement.textContent = 'Ви програли';
    statusElement.classList.add('game-status--visible', 'game-status--lose');
    minesweeperElement.classList.add('minesweeper--lose');
    startButtonElement.classList.add('start-btn--lose');
    startButtonElement.textContent = 'Спробувати знову';
  } else startButtonElement.textContent = 'Старт';
}


function revealAllMines() {
  const { field, rows, cols } = gameState;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const cell = field[row][col];
      if (cell.state === CELL_STATE.OPENED) continue;
      if (cell.type === CELL_CONTENT.MINE) {
        if (cell.state !== CELL_STATE.FLAGGED) {
          cell.state = CELL_STATE.OPENED;
        }
      }
      else if (cell.type === CELL_CONTENT.EMPTY && cell.state === CELL_STATE.FLAGGED) {
      }
    }
  }

  renderField();
}


function updateFlagsDisplay() {
  if (!flagsValueElement) return;
  let flaggedCellsCount = 0;
  const { field, rows, cols, minesCount } = gameState;
  for (let row = 0; row < rows; row++)
    for (let col = 0; col < cols; col++)
      if (field[row][col].state === CELL_STATE.FLAGGED) flaggedCellsCount++;
  const remainingFlagsCount = minesCount - flaggedCellsCount;
  flagsValueElement.textContent = remainingFlagsCount >= 0
    ? String(remainingFlagsCount).padStart(3, '0')
    : `0-${Math.abs(remainingFlagsCount)}`;
}


function resetGame() {
  stopTimer();
  gameState.status = GAME_STATUS.PROCESS;
  gameState.gameTime = 0;
  gameState.firstClick = true;
  gameState.clickedMine = { row: -1, col: -1 };
  gameState.field = generateField(gameState.rows, gameState.cols, gameState.minesCount);
  if (timeValueElement) timeValueElement.textContent = '000';
  updateFlagsDisplay();
  updateGameStatus();
  renderField();
}


function init() {
  fieldElement = document.querySelector('.field');
  timeValueElement = document.querySelector('.game-header .counter:first-child .value');
  flagsValueElement = document.querySelector('.game-header .counter:last-child .value');
  startButtonElement = document.querySelector('.start-btn');
  statusElement = document.querySelector('.game-status');
  minesweeperElement = document.querySelector('.minesweeper');
  if (!fieldElement) return;
  gameState.field = generateField(gameState.rows, gameState.cols, gameState.minesCount);
  renderField();
  updateFlagsDisplay();
  if (startButtonElement) startButtonElement.addEventListener('click', resetGame);
}


document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();