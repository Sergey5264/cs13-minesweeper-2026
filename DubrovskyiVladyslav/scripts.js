class Minesweeper {
    // Константи для уникнення "магічних рядків"
    static STATUS = { PROCESS: 'process', WIN: 'win', LOSE: 'lose' };
    static CELL_TYPE = { EMPTY: 'empty', MINE: 'mine' };
    static CELL_STATE = { CLOSED: 'closed', OPENED: 'open', FLAGGED: 'flagged' };

    constructor(rows = 10, cols = 10, minesCount = 15) {
        this.rows = rows;
        this.cols = cols;
        this.minesCount = minesCount;

        this.reset();
    }

    /**
     * Скидання та ініціалізація початкового стану
     */
    reset() {
        this.status = Minesweeper.STATUS.PROCESS;
        this.gameTime = 0;
        this.timerId = null;
        this.field = this._generateField();
        this._countAllNeighbors();
        this._startTimer();

        console.log(`🎮 Гра ініціалізована: ${this.rows}x${this.cols}, мін: ${this.minesCount}`);
    }

    /**
     * Генерація поля через функціональні методи масивів
     * @private
     */
    _generateField() {
        // Створюємо порожнє поле
        const field = Array.from({ length: this.rows }, () =>
            Array.from({ length: this.cols }, () => ({
                type: Minesweeper.CELL_TYPE.EMPTY,
                state: Minesweeper.CELL_STATE.CLOSED,
                neighborMines: 0
            }))
        );

        // Розстановка мін через генератор випадкових унікальних координат
        let planted = 0;
        while (planted < this.minesCount) {
            const row = Math.floor(Math.random() * this.rows);
            const col = Math.floor(Math.random() * this.cols);

            if (field[row][col].type !== Minesweeper.CELL_TYPE.MINE) {
                field[row][col].type = Minesweeper.CELL_TYPE.MINE;
                planted++;
            }
        }

        return field;
    }

    /**
     * Обхід сусідів з використанням патерну "offset array"
     * @private
     */
    _countAllNeighbors() {
        this._forEachCell((row, col) => {
            if (this.field[row][col].type === Minesweeper.CELL_TYPE.MINE) {
                return;
            }

            this.field[row][col].neighborMines = this._getNeighbors(row, col)
                .filter(([neighbourRow, neighbourCol]) => this.field[neighbourRow][neighbourCol].type === Minesweeper.CELL_TYPE.MINE)
                .length;
        });
    }

    /**
     * Отримує координати всіх валідних сусідів клітинки
     * @private
     */
    _getNeighbors(row, col) {
        const neighbors = [];
        for (let directionalRow = -1; directionalRow <= 1; directionalRow++) {
            for (let directionalCol = -1; directionalCol <= 1; directionalCol++) {
                if (directionalRow === 0 && directionalCol === 0) {
                    continue;
                }

                const neighbourRow = row + directionalRow;
                const neighbourCol = col + directionalCol;

                if (neighbourRow >= 0 && neighbourRow < this.rows && neighbourCol >= 0 && neighbourCol < this.cols) {
                    neighbors.push([neighbourRow, neighbourCol]);
                }
            }
        }

        return neighbors;
    }

    /**
     * Допоміжний метод для ітерації по всьому полю (DRY)
     * @private
     */
    _forEachCell(callback) {
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                callback(row, col);
            }
        }
    }

    /**
     * Публічний метод для відкриття клітинки
     */
    openCell(row, col) {
        // Defensive programming: перевірка меж та стану
        if (!this._isValidCoords(row, col)) {
            return;
        }

        const cell = this.field[row][col];

        if (this.status !== Minesweeper.STATUS.PROCESS ||
            cell.state !== Minesweeper.CELL_STATE.CLOSED) {
            return;
        }

        if (cell.type === Minesweeper.CELL_TYPE.MINE) {
            this._terminate(Minesweeper.STATUS.LOSE);

            return;
        }

        cell.state = Minesweeper.CELL_STATE.OPENED;

        // Рекурсивне відкриття при 0 мін поруч
        if (cell.neighborMines === 0) {
            this._getNeighbors(row, col).forEach(([neighbourRow, neighbourCol]) =>
                this.openCell(neighbourRow, neighbourCol)
            );
        }

        this._checkWin();
    }

    toggleFlag(row, col) {
        if (!this._isValidCoords(row, col)) {
            return;
        }

        const cell = this.field[row][col];

        if (cell.state === Minesweeper.CELL_STATE.OPENED ||
            this.status !== Minesweeper.STATUS.PROCESS) {
            return;
        }

        cell.state = cell.state === Minesweeper.CELL_STATE.FLAGGED
            ? Minesweeper.CELL_STATE.CLOSED
            : Minesweeper.CELL_STATE.FLAGGED;
    }

    _isValidCoords(row, col) {
        return row >= 0 && row < this.rows && col >= 0 && col < this.cols;
    }

    _startTimer() {
        if (this.timerId) {
            clearInterval(this.timerId);
        }

        this.timerId = setInterval(() => {
            this.gameTime++;
        }, 1000);
    }

    _checkWin() {
        let hasUnopenedEmpty = false;

        this._forEachCell((row, col) => {
            const cell = this.field[row][col];
            // Перевіряємо, чи є порожні клітинки, які не були відкриті (включаючи зафлагані)
            if (cell.type === Minesweeper.CELL_TYPE.EMPTY &&
                cell.state !== Minesweeper.CELL_STATE.OPENED) {
                hasUnopenedEmpty = true;
            }
        });

        if (!hasUnopenedEmpty) {
            this._terminate(Minesweeper.STATUS.WIN);
        }
    }

    _terminate(finalStatus) {
        this.status = finalStatus;
        clearInterval(this.timerId);

        // Відкриваємо всі міни при програші
        if (finalStatus === Minesweeper.STATUS.LOSE) {
            this._forEachCell((row, col) => {
                if (this.field[row][col].type === Minesweeper.CELL_TYPE.MINE) {
                    this.field[row][col].state = Minesweeper.CELL_STATE.OPENED;
                }
            });
        }

        console.log(finalStatus === Minesweeper.STATUS.WIN ? "🏆 ПЕРЕМОГА!" : "💥 БУМ! ГРА ЗАКІНЧЕНА.");
    }
}

// Запуск екземпляру гри
const game = new Minesweeper(10, 10, 15);