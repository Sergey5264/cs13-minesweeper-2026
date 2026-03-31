const CELL_STATE = {
  CLOSED: 'closed',
  OPENED: 'opened',
  FLAGGED: 'flagged',
};

const GAME_STATUS = {
  PLAYING: 'process',
  WON: 'win',
  LOST: 'lose',
};

const CELL_CONTENT = {
  EMPTY: 'empty',
  MINE: 'mine',
};

const gameState = {
  rows: 10,
  cols: 10,
  minesCount: 15,
  status: GAME_STATUS.PLAYING,
  gameTime: 0,
  timerId: null,
  board: [],
};

function createCell() {
  return {
    type: CELL_CONTENT.EMPTY,
    neighborMines: 0,
    state: CELL_STATE.CLOSED,
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
          col: neighborCol,
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
  clearInterval(state.timerId);
  state.timerId = null;
}

function startTimer(state) {
  stopTimer(state);

  state.timerId = setInterval(() => {
    state.gameTime += 1;
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

  cell.state =
    cell.state === CELL_STATE.FLAGGED
      ? CELL_STATE.CLOSED
      : CELL_STATE.FLAGGED;
}

function initializeGame(state) {
  stopTimer(state);
  state.status = GAME_STATUS.PLAYING;
  state.gameTime = 0;
  state.board = generateField(state.rows, state.cols, state.minesCount);
  countAdjacentMines(state.board);
  startTimer(state);
}