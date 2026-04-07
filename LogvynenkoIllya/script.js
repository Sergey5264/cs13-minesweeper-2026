const CELL_STATE = {
  CLOSED: 'closed',
  OPENED: 'opened',
  FLAGGED: 'flagged'
};

const GAME_STATUS = {
  PLAYING: 'process',
  WON: 'win',
  LOST: 'lose'
};

const CELL_CONTENT = {
  EMPTY: 'empty',
  MINE: 'mine'
};

const gameState = {
  rows: 10,
  cols: 10,
  minesCount: 15,
  status: GAME_STATUS.PLAYING,
  gameTime: 0,
  timerId: null,
  board: [],
  explodedCell: null,
  firstMoveMade: false
};

const gridElement = document.getElementById('game-grid');
const flagsCounterElement = document.getElementById('flags-counter');
const timerCounterElement = document.getElementById('timer-counter');
const startButtonElement = document.getElementById('start-button');
const statusMessageElement = document.getElementById('status-message');


function createCell() {

  return {
    type: CELL_CONTENT.EMPTY,
    neighborMines: 0,
    state: CELL_STATE.CLOSED
  };
}


function generateField(rowsCount, colsCount, minesCount) {
  if (minesCount < 0 || minesCount >= rowsCount * colsCount) {
    throw new Error(
      `minesCount (${minesCount}) must be between 0 and ${rowsCount * colsCount - 1}`
    );
  }

  const grid = Array.from({ length: rowsCount }, () =>
    Array.from({ length: colsCount }, () => createCell())
  );

  let placedMines = 0;

  while (placedMines < minesCount) {
    const row = Math.floor(Math.random() * rowsCount);
    const col = Math.floor(Math.random() * colsCount);

    if (grid[row][col].type !== CELL_CONTENT.MINE) {
      grid[row][col].type = CELL_CONTENT.MINE;
      placedMines += 1;
    }
  }

  return grid;
}


function getAdjacentCells(grid, row, col) {
  if (grid.length === 0) {

    return [];
  }

  const rowCount = grid.length;
  const colCount = grid[0].length;
  const adjacentCells = [];

  for (let directionRow = -1; directionRow <= 1; directionRow += 1) {
    for (let directionCol = -1; directionCol <= 1; directionCol += 1) {
      if (directionRow === 0 && directionCol === 0) {
        continue;
      }

      const neighborRow = row + directionRow;
      const neighborCol = col + directionCol;

      if (
        neighborRow >= 0 &&
        neighborRow < rowCount &&
        neighborCol >= 0 &&
        neighborCol < colCount
      ) {
        adjacentCells.push({
          cell: grid[neighborRow][neighborCol],
          row: neighborRow,
          col: neighborCol
        });
      }
    }
  }

  return adjacentCells;
}


function countAdjacentMines(grid) {
  if (grid.length === 0) {

    return;
  }

  for (let row = 0; row < grid.length; row += 1) {
    for (let col = 0; col < grid[0].length; col += 1) {
      if (grid[row][col].type === CELL_CONTENT.MINE) {
        continue;
      }

      grid[row][col].neighborMines = getAdjacentCells(grid, row, col)
        .filter(({ cell }) => cell.type === CELL_CONTENT.MINE)
        .length;
    }
  }
}


function checkWinCondition(grid) {

  return grid.every((row) =>
    row.every((cell) => {
      if (cell.type === CELL_CONTENT.MINE) {

        return cell.state !== CELL_STATE.OPENED;
      }

      return cell.state === CELL_STATE.OPENED;
    })
  );
}


function stopTimer(state) {
  if (state.timerId !== null) {
    clearInterval(state.timerId);
    state.timerId = null;
  }
}


function formatCounterValue(value) {

  return String(Math.min(Math.max(value, 0), 999)).padStart(3, '0');
}


function countFlaggedCells(grid) {

  return grid.flat().filter((cell) => cell.state === CELL_STATE.FLAGGED).length;
}


function updateTimerDisplay(state) {
  timerCounterElement.textContent = formatCounterValue(state.gameTime);
}


function updateFlagsCounter(state) {
  const flaggedCellsCount = countFlaggedCells(state.board);
  flagsCounterElement.textContent = formatCounterValue(state.minesCount - flaggedCellsCount);
}


function updateStatusMessage(state) {
  if (state.status === GAME_STATUS.WON) {
    statusMessageElement.textContent = 'You win!';

    return;
  }

  if (state.status === GAME_STATUS.LOST) {
    statusMessageElement.textContent = 'Game over!';

    return;
  }

  statusMessageElement.textContent = '';
}


function updateStartButtonFace(state) {
  if (state.status === GAME_STATUS.WON) {
    startButtonElement.textContent = '😎';

    return;
  }

  if (state.status === GAME_STATUS.LOST) {
    startButtonElement.textContent = '😵';

    return;
  }

  startButtonElement.textContent = '🙂';
}


function startTimer(state) {
  stopTimer(state);

  state.timerId = setInterval(() => {
    state.gameTime += 1;
    updateTimerDisplay(state);
  }, 1000);
}


function revealCell(state, grid, row, col, isRecursive = false) {
  if (state.status !== GAME_STATUS.PLAYING) {

    return;
  }

  if (grid.length === 0 || row < 0 || row >= grid.length || col < 0 || col >= grid[0].length) {

    return;
  }

  const cell = grid[row][col];

  if (cell.state === CELL_STATE.OPENED || cell.state === CELL_STATE.FLAGGED) {

    return;
  }

  cell.state = CELL_STATE.OPENED;

  if (cell.type === CELL_CONTENT.MINE) {
    state.status = GAME_STATUS.LOST;
    state.explodedCell = { row, col };
    stopTimer(state);

    return;
  }

  if (cell.neighborMines === 0) {
    getAdjacentCells(grid, row, col).forEach(({ row: neighborRow, col: neighborCol }) => {
      revealCell(state, grid, neighborRow, neighborCol, true);
    });
  }

  if (!isRecursive && checkWinCondition(grid)) {
    state.status = GAME_STATUS.WON;
    stopTimer(state);
  }
}


function toggleFlag(state, grid, row, col) {
  if (state.status !== GAME_STATUS.PLAYING) {

    return;
  }

  if (grid.length === 0 || row < 0 || row >= grid.length || col < 0 || col >= grid[0].length) {

    return;
  }

  const cell = grid[row][col];

  if (cell.state === CELL_STATE.OPENED) {

    return;
  }

  const flaggedCellsCount = countFlaggedCells(grid);

  if (cell.state === CELL_STATE.CLOSED && flaggedCellsCount >= state.minesCount) {

    return;
  }

  cell.state =
    cell.state === CELL_STATE.FLAGGED
      ? CELL_STATE.CLOSED
      : CELL_STATE.FLAGGED;
}


function initializeGame(state) {
  stopTimer(state);
  state.status = GAME_STATUS.PLAYING;
  state.gameTime = 0;
  state.explodedCell = null;
  state.firstMoveMade = false;
  state.board = generateField(state.rows, state.cols, state.minesCount);
  countAdjacentMines(state.board);
  updateTimerDisplay(state);
  updateFlagsCounter(state);
  updateStatusMessage(state);
  updateStartButtonFace(state);
}


function getCellView(state, cell, row, col) {
  const shouldRevealBoard = state.status !== GAME_STATUS.PLAYING;
  const classes = ['cell'];
  let text = '';
  let value = '';

  if (cell.state === CELL_STATE.OPENED) {
    classes.push('open');

    if (cell.type === CELL_CONTENT.MINE) {
      classes.push('mine');
    } else if (cell.neighborMines > 0) {
      text = String(cell.neighborMines);
      value = text;
    }
  } else if (cell.state === CELL_STATE.FLAGGED) {
    if (shouldRevealBoard && cell.type !== CELL_CONTENT.MINE) {
      classes.push('open', 'flag', 'false-flag');
    } else {
      classes.push('closed', 'flag');
    }
  } else if (shouldRevealBoard && cell.type === CELL_CONTENT.MINE) {
    classes.push('open', 'mine');
  } else {
    classes.push('closed');
  }

  if (
    state.explodedCell !== null &&
    state.explodedCell.row === row &&
    state.explodedCell.col === col
  ) {
    classes.push('clicked');
  }

  return { classes, text, value };
}


function getCellAriaLabel(row, col, cell) {
  let stateLabel = 'closed';

  if (cell.state === CELL_STATE.FLAGGED) {
    stateLabel = 'flagged';
  } else if (cell.state === CELL_STATE.OPENED) {
    if (cell.type === CELL_CONTENT.MINE) {
      stateLabel = 'mine';
    } else if (cell.neighborMines > 0) {
      stateLabel = `${cell.neighborMines} adjacent mines`;
    } else {
      stateLabel = 'opened, empty';
    }
  }

  return `Row ${row + 1}, column ${col + 1}, ${stateLabel}`;
}


function renderGrid(state) {
  gridElement.style.setProperty('--grid-cols', state.cols);
  gridElement.style.setProperty('--grid-rows', state.rows);
  gridElement.innerHTML = '';

  for (let row = 0; row < state.rows; row += 1) {
    for (let col = 0; col < state.cols; col += 1) {
      const cell = state.board[row][col];
      const cellView = getCellView(state, cell, row, col);
      const cellElement = document.createElement('button');

      cellElement.type = 'button';
      cellElement.className = cellView.classes.join(' ');
      cellElement.dataset.row = String(row);
      cellElement.dataset.col = String(col);
      cellElement.textContent = cellView.text;
      cellElement.setAttribute('aria-label', getCellAriaLabel(row, col, cell));

      if (cellView.value !== '') {
        cellElement.dataset.value = cellView.value;
      }

      gridElement.appendChild(cellElement);
    }
  }
}


function handleLeftClick(event) {
  const cellElement = event.target.closest('.cell');

  if (!cellElement || gameState.status !== GAME_STATUS.PLAYING) {

    return;
  }

  const row = Number(cellElement.dataset.row);
  const col = Number(cellElement.dataset.col);
  const cell = gameState.board[row][col];

  if (cell.state !== CELL_STATE.CLOSED) {

    return;
  }

  if (!gameState.firstMoveMade) {
    gameState.firstMoveMade = true;
    startTimer(gameState);
  }

  revealCell(gameState, gameState.board, row, col);
  renderGrid(gameState);
  updateFlagsCounter(gameState);
  updateStatusMessage(gameState);
  updateStartButtonFace(gameState);
}


function handleRightClick(event) {
  event.preventDefault();

  const cellElement = event.target.closest('.cell');

  if (!cellElement) {

    return;
  }

  if (gameState.status !== GAME_STATUS.PLAYING) {

    return;
  }

  const row = Number(cellElement.dataset.row);
  const col = Number(cellElement.dataset.col);

  toggleFlag(gameState, gameState.board, row, col);
  renderGrid(gameState);
  updateFlagsCounter(gameState);
}


function handleRestartClick() {
  initializeGame(gameState);
  renderGrid(gameState);
}


function bootstrap() {
  initializeGame(gameState);
  renderGrid(gameState);

  gridElement.addEventListener('click', handleLeftClick);
  gridElement.addEventListener('contextmenu', handleRightClick);
  startButtonElement.addEventListener('click', handleRestartClick);
}


bootstrap();
