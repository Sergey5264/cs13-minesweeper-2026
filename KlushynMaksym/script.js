// Глобальний стан гри
const gameState = {
    rows: 9, 
    cols: 9,
    minesCount: 15,
    status: 'process',
    gameTime: 0,
    timerId: null,
    field: []
  };
  
  // Генерація поля та випадкове розміщення мін
  function generateField(rows, cols, minesCount) {
    gameState.field = [];
    
    for (let r = 0; r < rows; r++) {
      const row = [];
      for (let c = 0; c < cols; c++) {
        row.push({ type: 'empty', state: 'closed', neighborMines: 0 });
      }
      gameState.field.push(row);
    }
  
    let placedMines = 0;
    while (placedMines < minesCount) {
      const r = Math.floor(Math.random() * rows);
      const c = Math.floor(Math.random() * cols);
  
      if (gameState.field[r][c].type !== 'mine') {
        gameState.field[r][c].type = 'mine';
        placedMines++;
      }
    }
  }
  
  function countNeighbourMines() {
    const directions = [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1],           [0, 1],
      [1, -1],  [1, 0],  [1, 1]
    ];
  
    for (let r = 0; r < gameState.rows; r++) {
      for (let c = 0; c < gameState.cols; c++) {
        if (gameState.field[r][c].type === 'mine') continue;
  
        let minesAround = 0;
        for (const [dr, dc] of directions) {
          const nr = r + dr;
          const nc = c + dc;
          
          if (nr >= 0 && nr < gameState.rows && nc >= 0 && nc < gameState.cols) {
            if (gameState.field[nr][nc].type === 'mine') minesAround++;
          }
        }
        gameState.field[r][c].neighborMines = minesAround;
      }
    }
  }
  
  // Логіка відкриття клітинки та рекурсія
  function openCell(row, col) {
    if (row < 0 || row >= gameState.rows || col < 0 || col >= gameState.cols) return;
  
    const cell = gameState.field[row][col];
  
    if (cell.state === 'opened' || cell.state === 'flagged' || gameState.status !== 'process') return;
  
    if (cell.type === 'mine') {
      cell.state = 'opened';
      gameState.status = 'lose';
      stopTimer();
      return;
    }
  
    cell.state = 'opened';
  
    if (cell.neighborMines === 0) {
      const directions = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1],           [0, 1],
        [1, -1],  [1, 0],  [1, 1]
      ];
      for (const [dr, dc] of directions) {
        openCell(row + dr, col + dc);
      }
    }
  }
  
  function toggleFlag(row, col) {
    const cell = gameState.field[row][col];
    if (cell.state === 'opened' || gameState.status !== 'process') return;
  
    if (cell.state === 'closed') {
      cell.state = 'flagged';
    } else if (cell.state === 'flagged') {
      cell.state = 'closed';
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
    gameState.status = 'process';
    gameState.gameTime = 0;
    stopTimer();
    generateField(gameState.rows, gameState.cols, gameState.minesCount);
    countNeighbourMines();
    startTimer();
  }
  
  initGame();