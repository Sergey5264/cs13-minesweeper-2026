class Minesweeper {
    // Константи для уникнення "магічних рядків"
    static STATUS = { PROCESS: 'process', WIN: 'win', LOSE: 'lose' };
    static CELL_TYPE = { EMPTY: 'empty', MINE: 'mine' };
    static CELL_STATE = { CLOSED: 'closed', OPENED: 'opened', FLAGGED: 'flagged' };

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
            const r = Math.floor(Math.random() * this.rows);
            const c = Math.floor(Math.random() * this.cols);

            if (field[r][c].type !== Minesweeper.CELL_TYPE.MINE) {
                field[r][c].type = Minesweeper.CELL_TYPE.MINE;
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
        this._forEachCell((r, c) => {
            if (this.field[r][c].type === Minesweeper.CELL_TYPE.MINE) return;

            this.field[r][c].neighborMines = this._getNeighbors(r, c)
                .filter(([nr, nc]) => this.field[nr][nc].type === Minesweeper.CELL_TYPE.MINE)
                .length;
        });
    }

    /**
     * Отримує координати всіх валідних сусідів клітинки
     * @private
     */
    _getNeighbors(r, c) {
        const neighbors = [];
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const nr = r + dr, nc = c + dc;
                if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
                    neighbors.push([nr, nc]);
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
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                callback(r, c);
            }
        }
    }

    /**
     * Публічний метод для відкриття клітинки
     */
    openCell(r, c) {
        // Defensive programming: перевірка меж та стану
        if (!this._isValidCoords(r, c)) return;
        const cell = this.field[r][c];

        if (this.status !== Minesweeper.STATUS.PROCESS ||
            cell.state !== Minesweeper.CELL_STATE.CLOSED) return;

        if (cell.type === Minesweeper.CELL_TYPE.MINE) {
            this._terminate(Minesweeper.STATUS.LOSE);
            return;
        }

        cell.state = Minesweeper.CELL_STATE.OPENED;

        // Рекурсивне відкриття при 0 мін поруч
        if (cell.neighborMines === 0) {
            this._getNeighbors(r, c).forEach(([nr, nc]) => this.openCell(nr, nc));
        }

        this._checkWin();
    }

    toggleFlag(r, c) {
        if (!this._isValidCoords(r, c)) return;
        const cell = this.field[r][c];

        if (cell.state === Minesweeper.CELL_STATE.OPENED ||
            this.status !== Minesweeper.STATUS.PROCESS) return;

        cell.state = cell.state === Minesweeper.CELL_STATE.FLAGGED
            ? Minesweeper.CELL_STATE.CLOSED
            : Minesweeper.CELL_STATE.FLAGGED;
    }

    _isValidCoords(r, c) {
        return r >= 0 && r < this.rows && c >= 0 && c < this.cols;
    }

    _startTimer() {
        if (this.timerId) clearInterval(this.timerId);
        this.timerId = setInterval(() => {
            this.gameTime++;
        }, 1000);
    }

    _checkWin() {
        let hasClosedEmpty = false;
        this._forEachCell((r, c) => {
            const cell = this.field[r][c];
            if (cell.type === Minesweeper.CELL_TYPE.EMPTY &&
                cell.state === Minesweeper.CELL_STATE.CLOSED) {
                hasClosedEmpty = true;
            }
        });

        if (!hasClosedEmpty) this._terminate(Minesweeper.STATUS.WIN);
    }

    _terminate(finalStatus) {
        this.status = finalStatus;
        clearInterval(this.timerId);

        // Відкриваємо всі міни при програші
        if (finalStatus === Minesweeper.STATUS.LOSE) {
            this._forEachCell((r, c) => {
                if (this.field[r][c].type === Minesweeper.CELL_TYPE.MINE) {
                    this.field[r][c].state = Minesweeper.CELL_STATE.OPENED;
                }
            });
        }

        console.log(finalStatus === Minesweeper.STATUS.WIN ? "🏆 ПЕРЕМОГА!" : "💥 БУМ! ГРА ЗАКІНЧЕНА.");
    }
}

// Запуск екземпляру гри
const game = new Minesweeper(10, 10, 15);