// Константи для станів гри, клітинок та вмісту (уникнення "магічних рядків")
const GAME_STATUS = {
  PLAYING: 'playing',
  WIN: 'win',
  LOST: 'lost'
};

const CELL_STATE = {
  CLOSED: 'closed',
  OPEN: 'open',
  FLAGGED: 'flagged'
};

const CELL_CONTENT = {
  EMPTY: 'empty',
  MINE: 'mine'
};

// Дефолтні налаштування (уникнення "магічних чисел")
const DEFAULT_ROWS = 8;
const DEFAULT_COLS = 8;
const DEFAULT_MINE_COUNT = 10;

// Об'єкт стану гри (глобальні параметри)
let gameState = {
  rows: DEFAULT_ROWS,
  cols: DEFAULT_COLS,
  minesCount: DEFAULT_MINE_COUNT,
  status: GAME_STATUS.PLAYING,
  gameTime: 0,
  timerId: null
};

// Двовимірний масив ігрового поля
let gameField = [];

// Масив зсувів для перевірки 8 сусідніх клітинок
const DIRECTIONS = [
  [-1, -1], [-1, 0], [-1, 1],
  [ 0, -1],          [ 0, 1],
  [ 1, -1], [ 1, 0], [ 1, 1]
];


// Генерація поля та випадкова розстановка мін
function generateField(rows, cols, minesCount) {
  gameState.rows = rows;
  gameState.cols = cols;
  gameState.minesCount = minesCount;
  gameState.status = GAME_STATUS.PLAYING;
  gameState.gameTime = 0;
  
  if (gameState.timerId) {
    clearInterval(gameState.timerId);
  }

  // Ініціалізація порожньої сітки
  gameField = [];
  for (let row = 0; row < rows; row++) {
    let currentRow = [];
    for (let col = 0; col < cols; col++) {
      currentRow.push({
        type: CELL_CONTENT.EMPTY,
        neighborMines: 0,
        state: CELL_STATE.CLOSED
      });
    }
    gameField.push(currentRow);
  }

  // Розстановка мін випадковим чином (з перевіркою дублікатів)
  let minesPlaced = 0;
  while (minesPlaced < minesCount) {
    let randRow = Math.floor(Math.random() * rows);
    let randCol = Math.floor(Math.random() * cols);

    if (gameField[randRow][randCol].type !== CELL_CONTENT.MINE) {
      gameField[randRow][randCol].type = CELL_CONTENT.MINE;
      minesPlaced++;
    }
  }

  // Одразу рахуємо сусідів для згенерованого поля
  countNeighbourMines();
}


// Підрахунок сусідніх мін для кожної порожньої клітинки
function countNeighbourMines() {
  for (let row = 0; row < gameState.rows; row++) {
    for (let col = 0; col < gameState.cols; col++) {
      if (gameField[row][col].type === CELL_CONTENT.MINE) {
        continue;
      }

      let count = 0;
      // Перевіряємо всі 8 сусідніх позицій
      for (let [directionalRow, directionalCol] of DIRECTIONS) {
        let neighbourRow = row + directionalRow;
        let neighbourCol = col + directionalCol;

        // Перевірка, щоб не вийти за межі поля
        if (neighbourRow >= 0 && neighbourRow < gameState.rows && neighbourCol >= 0 && neighbourCol < gameState.cols) {
          if (gameField[neighbourRow][neighbourCol].type === CELL_CONTENT.MINE) {
            count++;
          }
        }
      }
      gameField[row][col].neighborMines = count;
    }
  }
}


// Логіка відкриття клітинки
function openCell(row, col) {
  // Перевірка: чи гра ще триває
  if (gameState.status !== GAME_STATUS.PLAYING) {

    return;
  }

  // Перевірка на вихід за межі поля
  if (row < 0 || row >= gameState.rows || col < 0 || col >= gameState.cols) {

    return;
  }
  
  let cell = gameField[row][col];
  
  // Якщо клітинка вже відкрита або з прапорцем — нічого не робити
  if (cell.state === CELL_STATE.OPEN || cell.state === CELL_STATE.FLAGGED) {

    return;
  }

  // Відкриваємо клітинку
  cell.state = CELL_STATE.OPEN;

  // Якщо міна — гра закінчується поразкою
  if (cell.type === CELL_CONTENT.MINE) {
    gameState.status = GAME_STATUS.LOST;
    clearInterval(gameState.timerId);
    console.log("Game Over: You hit a mine!");

    return;
  }

  // Рекурсія: якщо порожня (0 мін навколо), автоматично відкриваємо всіх сусідів
  if (cell.neighborMines === 0) {
    for (let [directionalRow, directionalCol] of DIRECTIONS) {
      openCell(row + directionalRow, col + directionalCol);
    }
  }
}


// Встановлення або зняття прапорця
function toggleFlag(row, col) {
  if (gameState.status !== GAME_STATUS.PLAYING) {

    return;
  }
  
  let cell = gameField[row][col];
  
  if (cell.state === CELL_STATE.OPEN) {

    return;
  }

  // Змінюємо стан на протилежний
  if (cell.state === CELL_STATE.CLOSED) {
    cell.state = CELL_STATE.FLAGGED;
  } else if (cell.state === CELL_STATE.FLAGGED) {
    cell.state = CELL_STATE.CLOSED;
  }
}


// Запуск таймера
function startTimer() {
  if (gameState.timerId) {
    clearInterval(gameState.timerId);
  }
  
  // Додаємо 1 щосекунди
  gameState.timerId = setInterval(() => {
    if (gameState.status === GAME_STATUS.PLAYING) {
      gameState.gameTime++;
    }
  }, 1000);
}


// Перевірка умови перемоги (викликається ззовні після кліків)
function checkWinCondition() {
  let unrevealedSafeCells = 0;
  
  for (let row = 0; row < gameState.rows; row++) {
    for (let col = 0; col < gameState.cols; col++) {
      // Шукаємо клітинки без мін, які ще не відкриті
      if (gameField[row][col].type === CELL_CONTENT.EMPTY && gameField[row][col].state !== CELL_STATE.OPEN) {
        unrevealedSafeCells++;
      }
    }
  }
  
  // Якщо всі безпечні клітинки відкриті — перемога
  if (unrevealedSafeCells === 0) {
    gameState.status = GAME_STATUS.WIN;
    clearInterval(gameState.timerId);
    console.log("Win! All safe cells are opened.");
  }
}