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

// DOM ЕЛЕМЕНТИ 
const boardElement = document.getElementById('gameBoard');
const mineCountElement = document.getElementById('mineCount');
const flagCountElement = document.getElementById('flagCount');
const timerElement = document.getElementById('timer');
const newGameBtn = document.getElementById('newGameBtn');
const gameMessageElement = document.getElementById('gameMessage');
const difficultyButtons = document.querySelectorAll('.difficulty-btn');

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
    gameState.timerId = null;
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

  // Оновлюємо візуал
  renderBoard();

}

  // ВІЗУАЛІЗАЦІЯ (DOM РЕНДЕРИНГ)
// ВІЗУАЛІЗАЦІЯ (DOM РЕНДЕРИНГ)
function renderBoard() {
  boardElement.innerHTML = '';
  boardElement.style.gridTemplateColumns = `repeat(${gameState.cols}, var(--cell-size))`;

  for (let row = 0; row < gameState.rows; row++) {
    for (let col = 0; col < gameState.cols; col++) {
      
      const cellData = gameField[row][col]; // Беремо дані цієї клітинки з масиву
      const cellElement = document.createElement('div');
      cellElement.classList.add('cell');

      // --- ДОДАЄМО ВІЗУАЛІЗАЦІЮ СТАНУ ---
      
      // Якщо клітинка відкрита
      if (cellData.state === CELL_STATE.OPEN) {
        cellElement.classList.add('revealed'); // Робимо її втиснутою
        
        // Якщо це міна - малюємо бомбу і вибух
        if (cellData.type === CELL_CONTENT.MINE) {
          cellElement.classList.add('mine', 'exploded');
          cellElement.textContent = '💣';
        } 
        // Якщо не міна, але є сусіди - малюємо цифру і фарбуємо її
        else if (cellData.neighborMines > 0) {
          cellElement.textContent = cellData.neighborMines;
          cellElement.classList.add(`num${cellData.neighborMines}`); // Додає класи типу num1, num2
        }
      } 
      // Якщо на клітинці стоїть прапорець
      else if (cellData.state === CELL_STATE.FLAGGED) {
        cellElement.classList.add('flag');
        cellElement.textContent = '🚩';
      }

      // --- РЕАКЦІЯ НА КЛІКИ ---
      cellElement.addEventListener('click', () => {
        if (!gameState.timerId && gameState.status === GAME_STATUS.PLAYING) {
          startTimer();
        }
        openCell(row, col);
        checkWinCondition(); // Одразу перевіряємо, чи ми не виграли
        renderBoard();
      });

      cellElement.addEventListener('contextmenu', (event) => {
        if (!gameState.timerId && gameState.status === GAME_STATUS.PLAYING) {
          startTimer();
        }
        event.preventDefault();
        toggleFlag(row, col);
        renderBoard();
      });

      boardElement.appendChild(cellElement);
    }
  }
  updateUI();
}

// ОНОВЛЕННЯ ІНТЕРФЕЙСУ
function updateUI() {
  // Рахуємо, скільки прапорців зараз стоїть на полі
  let flagsPlaced = 0;
  for (let row = 0; row < gameState.rows; row++) {
    for (let col = 0; col < gameState.cols; col++) {
      if (gameField[row][col].state === CELL_STATE.FLAGGED) {
        flagsPlaced++;
      }
    }
  }

  // Виводимо цифри в HTML
  mineCountElement.textContent = gameState.minesCount - flagsPlaced;
  flagCountElement.textContent = flagsPlaced;
  timerElement.textContent = gameState.gameTime;

  // Керуємо повідомленням про кінець гри
  if (gameState.status === GAME_STATUS.WIN) {
    gameMessageElement.textContent = '🏆 ПЕРЕМОГА! Всі міни знайдено!';
    gameMessageElement.classList.remove('hidden');
    gameMessageElement.style.color = '#27ae60'; // Зелений
  } else if (gameState.status === GAME_STATUS.LOST) {
    gameMessageElement.textContent = '💥 БУМ! ВИ ПРОГРАЛИ!';
    gameMessageElement.classList.remove('hidden');
    gameMessageElement.style.color = '#c0392b'; // Червоний
  } else {
    gameMessageElement.classList.add('hidden'); // Ховаємо під час гри
  }
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
      timerElement.textContent = gameState.gameTime;
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

// КНОПКИ УПРАВЛІННЯ 
// Кнопка "Нова гра"
newGameBtn.addEventListener('click', () => {
  // Перезапускаємо гру з поточними налаштуваннями
  generateField(gameState.rows, gameState.cols, gameState.minesCount);
});

// Кнопки вибору складності
difficultyButtons.forEach(button => {
  button.addEventListener('click', (event) => {
    // Знімаємо підсвітку з усіх кнопок
    difficultyButtons.forEach(btn => btn.classList.remove('active'));
    // Підсвічуємо ту, на яку натиснули
    event.target.classList.add('active');

    // Читаємо рівень складності з атрибута data-level і запускаємо гру
    const level = event.target.getAttribute('data-level');
    if (level === 'easy') {
      generateField(8, 8, 10);
    } else if (level === 'medium') {
      generateField(12, 12, 20);
    } else if (level === 'hard') {
      generateField(16, 16, 40);
    }
  });
});

// Запускаємо першу гру автоматично при завантаженні сторінки
generateField(8, 8, 10);