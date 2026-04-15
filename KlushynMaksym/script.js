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

const gameState = {
    rows: 9, 
    cols: 9,
    minesCount: 15,
    status: GAME_STATUS.PROCESS,
    gameTime: 0,
    timerId: null,
    field: [],
    firstClick: true 
};

// DOM Елементи
const boardElement = document.querySelector('.game-board');
const timerElement = document.getElementById('timer');
const flagCounterElement = document.querySelector('.flag-counter');
const restartButton = document.querySelector('.btn-restart');
const gameMessageElement = document.getElementById('game-message');

// ЛОГІКА ГРИ

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
            if (cell.type !== CELL_CONTENT.MINE && cell.state !== CELL_STATE.OPENED) {
                return false;
            }
        }
    }
    gameState.status = GAME_STATUS.WIN;
    stopTimer();
    return true;
}

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

// РОБОТА З ТАЙМЕРОМ

function startTimer() {
    if (gameState.timerId !== null) return;
    gameState.timerId = setInterval(() => {
        gameState.gameTime++;
        timerElement.textContent = `⏱️ ${String(gameState.gameTime).padStart(3, '0')}`;
    }, 1000);
}

function stopTimer() {
    if (gameState.timerId !== null) {
        clearInterval(gameState.timerId);
        gameState.timerId = null;
    }
}

// ІНТЕГРАЦІЯ З DOM (Рендеринг та події)

function renderBoard() {
    boardElement.innerHTML = ''; 
    let flagsUsed = 0;

    for (let row = 0; row < gameState.rows; row++) {
        for (let col = 0; col < gameState.cols; col++) {
            const cellData = gameState.field[row][col];
            
            const cellElement = document.createElement('button');
            cellElement.type = 'button';
            cellElement.classList.add('cell');

            let ariaLabel = `Рядок ${row + 1}, стовпець ${col + 1}, `;

            if (cellData.state === CELL_STATE.OPENED) {
                cellElement.classList.add('open');
                
                if (cellData.type === CELL_CONTENT.MINE) {
                    cellElement.classList.add('exploded');
                    cellElement.textContent = '💣';
                    ariaLabel += 'відкрита міна';
                } else if (cellData.neighborMines > 0) {
                    cellElement.textContent = cellData.neighborMines;
                    cellElement.classList.add(`num-${cellData.neighborMines}`);
                    ariaLabel += `відкрита, ${cellData.neighborMines} мін навколо`;
                } else {
                    ariaLabel += 'відкрита, безпечна';
                }
            } else if (cellData.state === CELL_STATE.FLAGGED) {
                cellElement.classList.add('flag');
                cellElement.textContent = '🚩';
                flagsUsed++;
                ariaLabel += 'з прапорцем';
            } else {
                ariaLabel += 'закрита';
            }

            cellElement.setAttribute('aria-label', ariaLabel);

            cellElement.addEventListener('click', () => {
                if (gameState.status !== GAME_STATUS.PROCESS) return;
                
                if (gameState.firstClick) {
                    startTimer();
                    gameState.firstClick = false;
                }

                revealCell(gameState.field, row, col, gameState.rows, gameState.cols);
                renderBoard(); 
                checkGameEnd();
            });

            cellElement.addEventListener('contextmenu', (e) => {
                e.preventDefault(); 
                if (gameState.status !== GAME_STATUS.PROCESS) return;

                toggleFlag(gameState.field, row, col, gameState.rows, gameState.cols);
                renderBoard(); 
            });

            boardElement.appendChild(cellElement);
        }
    }

    const flagsLeft = gameState.minesCount - flagsUsed;
    flagCounterElement.textContent = `🚩 ${String(flagsLeft).padStart(3, '0')}`;

    if (gameState.status === GAME_STATUS.LOSE) {
        restartButton.textContent = '😵';
    } else if (gameState.status === GAME_STATUS.WIN) {
        restartButton.textContent = '😎';
    } else {
        restartButton.textContent = '🙂';
    }
}

function checkGameEnd() {
    if (gameState.status === GAME_STATUS.LOSE) {
        revealAllMines();
        gameMessageElement.textContent = 'Ви підірвалися на міні! Гра закінчена. 💥';
    } else if (gameState.status === GAME_STATUS.WIN) {
        gameMessageElement.textContent = 'Вітаємо! Ви розмінували всі безпечні клітинки! 🎉';
    }
}

function revealAllMines() {
    for (let r = 0; r < gameState.rows; r++) {
        for (let c = 0; c < gameState.cols; c++) {
            if (gameState.field[r][c].type === CELL_CONTENT.MINE) {
                gameState.field[r][c].state = CELL_STATE.OPENED;
            }
        }
    }
    renderBoard();
}

restartButton.addEventListener('click', () => {
    initGame();
});

// ІНІЦІАЛІЗАЦІЯ

function initGame() {
    gameState.status = GAME_STATUS.PROCESS;
    gameState.gameTime = 0;
    gameState.firstClick = true;
    
    stopTimer();
    timerElement.textContent = '⏱️ 000'; 
    gameMessageElement.textContent = ''; 
    
    generateField(gameState.rows, gameState.cols, gameState.minesCount);
    countAdjacentMines(gameState.field, gameState.rows, gameState.cols);
    
    renderBoard(); 
}

initGame();