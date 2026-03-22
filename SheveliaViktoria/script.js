const DIRS = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
const gameState = {
  rows: 6,
  cols: 8,
  minesCount: 10,
  status: 'process', 
  gameTime: 0,
  timer: null,
  clickedMine: { row: -1, col: -1 },
  field: [], 
  firstClick: true,
};
let fieldEl, timeValueEl, flagsValueEl, startBtnEl, statusEl, minesweeperEl;

function generateField(rows, cols, minesCount, excludeRow = -1, excludeCol = -1) {
  const field = [];
  for (let r = 0; r < rows; r++) {
    field[r] = [];
    for (let c = 0; c < cols; c++) field[r][c] = { type: 'empty', state: 'closed', neighborMines: 0 };
  }
  const totalCells = rows * cols;
  const minePositions = new Set();
  let attempts = 0;

  while (minePositions.size < minesCount && attempts < 5000) {
    attempts++;
    const idx = Math.floor(Math.random() * totalCells);
    const r = Math.floor(idx / cols), c = idx % cols;
    if (r === excludeRow && c === excludeCol || minePositions.has(`${r},${c}`)) continue;

    field[r][c].type = 'mine';
    updateNeighbourMinesAroundCell(field, rows, cols, r, c, -1);
    let valid = true;
    for (const [delta_row, delta_col] of DIRS) {
      const new_row = r + delta_row;
      const new_col = c + delta_col;
      if (new_row >= 0 && new_row < rows && new_col >= 0 && new_col < cols) {
        if (field[new_row][new_col].type === 'empty' && field[new_row][new_col].neighborMines > 3) {
          valid = false; 
          break;
        }
      }
    }
    if (valid) {
      minePositions.add(`${r},${c}`);
    } else {
      updateNeighbourMinesAroundCell(field, rows, cols, r, c, -1);
      field[r][c].type = 'empty';
    }
    }
    if (minePositions.size < minesCount) {
      const availablePositions = [];
      for (let row = 0; row < rows; row++){
        for (let col = 0; col < cols; col++) {
          const isExcludedCell = row === excludeRow && col === excludeCol;
          const hasMineAlready = field[row][col].type === 'mine';
          if (!isExcludedCell && hasMineAlready){
            availablePositions.push({row, col});
          }
        }
      }
      for (let currentIndex = availablePositions.length - 1; currentIndex > 0; currentIndex--) {
        const randomIndex = Math.floor(Math.random() * (currentIndex + 1));
        const temporaryPosition = availablePositions[currentIndex];
        availablePositions[currentIndex] = availablePositions[randomIndex];
        availablePositions[randomIndex] = temporaryPosition;
      }
      const remainingMineToPlace = Math.min(minesCount - minePositions.size, availablePositions.length);
      for (let index = 0; index < remainingMineToPlace; index++) {
        const minePosition = availablePositions[index];
        field[minePosition.row][minePosition.col].type = 'mine';
  minePositions.add (`${minePosition.row},${minePosition.col}`);    
      }
    }
  countNeighbourMines(field, rows, cols);
  
  return field;
}
function countNeighbourMines(field, rows, cols) {
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      if (field[r][c].type == 'mine') continue;
      let count = 0;
      for (const [delta_row, delta_col] of DIRS) {
        const new_row = r + delta_row, new_col = c + delta_col;
        if (new_row >= 0 && new_row < rows && new_col >= 0 && new_col < cols && field[new_row][new_col].type == 'mine') count++;
      }
      field[r][c].neighborMines = count;
    }
}
function updateNeighbourMinesAroundCell(field, rows, cols, mineRow, mineCol, delta) {
  for (const [delta_row, delta_col] of DIRS) {
    const neighbourRow = mineRow + delta_row;
    const neighbourCol = mineCol + delta_col;
    if (neighbourRow >= 0 && neighbourRow < rows && neighbourCol >= 0 && neighbourCol < cols) {
      if (field[neighbourRow][neighbourCol].type !== 'mine') {
        field[neighbourRow][neighbourCol].neighborMines += delta;
      }
    }
  }
}
function openCell(row, col) {
  if (gameState.status !== 'process') return;
  const cell = gameState.field[row][col];
  if (cell.state == 'opened' || cell.state == 'flagged') return;

  if (gameState.firstClick) {
    gameState.firstClick = false;
    startTimer();
    if (cell.type == 'mine') {
      gameState.field = generateField(gameState.rows, gameState.cols, gameState.minesCount, row, col);
      openCell(row, col);
      return;
    }
  }

  if (cell.type == 'mine') {
    cell.state = 'opened';
    gameState.status = 'lose';
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
  while (stack.length > 0 ) {
    const [r, c] = stack.pop();
    if (r < 0 || r >= rows || c < 0 || c >= cols) continue;
    const cell = gameState.field[r][c];
    if (cell.state === 'opened'  || cell.state === 'flagged') continue;
    cell.state = 'opened';
    if (cell.neighborMines === 0) {
      for (const [dr, dc] of DIRS) {
        stack.push([r + dr, c + dc]);
      }
    }
  }
}
function toggleFlag(row, col) {
  if (gameState.status !== 'process') return;
  const cell = gameState.field[row][col];
  if (cell.state == 'opened') return;
  cell.state = cell.state == 'flagged' ? 'closed' : 'flagged';
  renderField();
  updateFlagsDisplay();
}
function checkWin() {
  const { field, rows, cols } = gameState;
  let openedCount = 0, actualMines = 0;
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      if (field[r][c].state == 'opened') openedCount++;
      if (field[r][c].type == 'mine') actualMines++;
    }
  if (openedCount == rows * cols - actualMines) {
    gameState.status = 'win';
    stopTimer();
    renderField();
  }
}
function startTimer() {
  if (gameState.timer) return;
  gameState.timer = setInterval(() => {
    gameState.gameTime++;
    if (timeValueEl) timeValueEl.textContent = String(gameState.gameTime).padStart(3, '0');
  }, 1000);
}
function stopTimer() {
  if (gameState.timer) { clearInterval(gameState.timer); gameState.timer = null; }
}
function getCellClasses(cell, row, col) {
  const classes = ['cell'];
  const isClickedMine = gameState.clickedMine.row == row && gameState.clickedMine.col == col;
  if (gameState.status == 'lose' && cell.type == 'mine' && isClickedMine) classes.push('cell--mine-hit');
  else if (cell.state == 'closed') classes.push('cell--closed');
  else if (cell.state == 'flagged') classes.push(cell.type == 'mine' ? 'cell--flag-mine' : 'cell--flag');
  else if (cell.state == 'opened') {
    if (cell.type == 'mine') classes.push('cell--mine');
    else { classes.push('cell--open'); if (cell.neighborMines >= 1 && cell.neighborMines <= 3) classes.push(`cell--num-${cell.neighborMines}`); }
  }
  return classes;
}
function getCellContent(cell) {
  return (cell.state == 'opened' && cell.type == 'empty' && cell.neighborMines > 0) ? String(cell.neighborMines) : '';
}
function getAriaLabel(cell) {
  if (cell.state == 'closed') return 'Закрита';
  if (cell.state == 'flagged') return cell.type == 'mine' ? 'Прапорець на міні' : 'Прапорець без міни';
  if (cell.type == 'mine') return cell.state == 'opened' ? 'Натиснута міна' : 'Міна';
  return cell.neighborMines > 0 ? String(cell.neighborMines) : 'Порожня';
}
function renderField() {
  if (!fieldEl) return;
  const { field, rows, cols } = gameState;
  fieldEl.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  fieldEl.innerHTML = '';
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const cell = field[r][c];
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = getCellClasses(cell, r, c).join(' ');
      btn.textContent = getCellContent(cell);
      btn.dataset.row = r; btn.dataset.col = c;
      btn.setAttribute('aria-label', getAriaLabel(cell));
      if (gameState.status == 'process') {
        btn.addEventListener('click', () => openCell(r, c));
        btn.addEventListener('contextmenu', (e) => { e.preventDefault(); toggleFlag(r, c); });
      } else btn.disabled = true;
      fieldEl.appendChild(btn);
    }
  updateGameStatus();
}
function updateGameStatus() {
  if (!statusEl || !minesweeperEl || !startBtnEl) return;
  const { status } = gameState;
  statusEl.textContent = '';
  statusEl.className = 'game-status';
  minesweeperEl.classList.remove('minesweeper--win', 'minesweeper--lose');
  startBtnEl.classList.remove('start-btn--win', 'start-btn--lose');
  if (status == 'win') {
    statusEl.textContent = 'Ви перемогли';
    statusEl.classList.add('game-status--visible', 'game-status--win');
    minesweeperEl.classList.add('minesweeper--win');
    startBtnEl.classList.add('start-btn--win');
    startBtnEl.textContent = 'Нова гра';
  } else if (status == 'lose') {
    statusEl.textContent = 'Ви програли';
    statusEl.classList.add('game-status--visible', 'game-status--lose');
    minesweeperEl.classList.add('minesweeper--lose');
    startBtnEl.classList.add('start-btn--lose');
    startBtnEl.textContent = 'Спробувати знову';
  } else startBtnEl.textContent = 'Старт';
}
function revealAllMines() {
  const { field, rows, cols } = gameState;
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      if (field[r][c].type == 'mine' && field[r][c].state !== 'opened') field[r][c].state = 'opened';
  renderField();
}
function updateFlagsDisplay() {
  if (!flagsValueEl) return;
  let flaggedCellsCount = 0;
  const { field, rows, cols, minesCount } = gameState;
  for (let r = 0; r < rows; r++)
     for (let c = 0; c < cols; c++)
      if (field[r][c].state == 'flagged') flaggedCellsCount++;
  const remainingFlagsCount = minesCount - flaggedCellsCount;
  flagsValueEl.textContent = remainingFlagsCount >= 0
    ? String(remainingFlagsCount).padStart(3, '0')
    : `0-${Math.abs(remainingFlagsCount)}`;
}
function resetGame() {
  stopTimer();
  gameState.status = 'process';
  gameState.gameTime = 0;
  gameState.firstClick = true;
  gameState.clickedMine = { row: -1, col: -1 };
  gameState.field = generateField(gameState.rows, gameState.cols, gameState.minesCount);
  if (timeValueEl) timeValueEl.textContent = '000';
  updateFlagsDisplay();
  updateGameStatus();
  renderField();
}
function init() {
  fieldEl = document.querySelector('.field');
  timeValueEl = document.querySelector('.game-header .counter:first-child .value');
  flagsValueEl = document.querySelector('.game-header .counter:last-child .value');
  startBtnEl = document.querySelector('.start-btn');
  statusEl = document.querySelector('.game-status');
  minesweeperEl = document.querySelector('.minesweeper');
  if (!fieldEl) return;
  gameState.field = generateField(gameState.rows, gameState.cols, gameState.minesCount);
  renderField();
  updateFlagsDisplay();
  if (startBtnEl) startBtnEl.addEventListener('click', resetGame);
}

document.readyState == 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();