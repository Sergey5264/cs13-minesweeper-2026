import React, { useState, useEffect, useCallback } from 'react';
import Board from './Board';
import Timer from './Timer';
import GameStatus from './GameStatus';
import styles from './Minesweeper.module.css';

const ROWS = 10, COLS = 10, MINES_COUNT = 10;
const GAME_STATUS = { READY: 'ready', RUNNING: 'running', WON: 'won', LOST: 'lost' };

const Minesweeper = () => {
  const [board, setBoard] = useState([]);
  const [status, setStatus] = useState(GAME_STATUS.READY);
  const [seconds, setSeconds] = useState(0);
  const [message, setMessage] = useState({ text: '', kind: 'info' });

  // Вирахований стан (Derived state) замість окремого useState
  const flagsAvailable = MINES_COUNT - board.filter(c => c.isFlagged).length;

  const neighborsOf = useCallback((index) => {
    const row = Math.floor(index / COLS), col = index % COLS, res = [];
    for (let dR = -1; dR <= 1; dR++) {
      for (let dC = -1; dC <= 1; dC++) {
        if (dR === 0 && dC === 0) continue;
        const nR = row + dR, nC = col + dC;
        if (nR >= 0 && nR < ROWS && nC >= 0 && nC < COLS) res.push(nR * COLS + nC);
      }
    }
    return res;
  }, []);

  // Створюємо порожнє поле без мін для безпечного першого кліку
  const createEmptyBoard = useCallback(() => {
    const total = ROWS * COLS;
    const newBoard = Array.from({ length: total }, (_, i) => ({
      index: i, isMine: false, isOpen: false, isFlagged: false, adjacentMines: 0
    }));
    setBoard(newBoard);
    setStatus(GAME_STATUS.READY);
    setSeconds(0);
    setMessage({ text: '', kind: 'info' });
  }, []);

  useEffect(() => { createEmptyBoard(); }, [createEmptyBoard]);

  useEffect(() => {
    let interval;
    if (status === GAME_STATUS.RUNNING) interval = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(interval);
  }, [status]);

  const handleCellClick = (index) => {
    if (status === GAME_STATUS.WON || status === GAME_STATUS.LOST) return;

    let currentBoard = [...board];
    let currentCell = currentBoard[index];

    if (currentCell.isOpen || currentCell.isFlagged) return;

    // Safe first move: генеруємо міни тільки під час першого кліку
    if (status === GAME_STATUS.READY) {
      setStatus(GAME_STATUS.RUNNING);
      const total = ROWS * COLS;
      // Виключаємо індекс першого кліку, щоб там точно не було міни
      const indices = Array.from({ length: total }, (_, i) => i).filter(i => i !== index).sort(() => Math.random() - 0.5);
      const mineSet = new Set(indices.slice(0, MINES_COUNT));

      // Створюємо нові об'єкти (без мутацій)
      currentBoard = currentBoard.map((c, i) => ({ ...c, isMine: mineSet.has(i) }));
      currentBoard = currentBoard.map((c, i) => {
        if (c.isMine) return c;
        const adjacentMines = neighborsOf(i).reduce((acc, ni) => acc + (currentBoard[ni].isMine ? 1 : 0), 0);
        return { ...c, adjacentMines };
      });
      currentCell = currentBoard[index];
    }

    // Програш (якщо потрапили на міну)
    if (currentCell.isMine) {
      const lostBoard = currentBoard.map(c => c.isMine ? { ...c, isOpen: true } : c);
      setBoard(lostBoard);
      setStatus(GAME_STATUS.LOST);
      setMessage({ text: 'Поразка!', kind: 'lose' });
      return;
    }

    // Відкриття клітинок (без мутацій!)
    const queue = [index];
    const visited = new Set();
    const nextBoard = [...currentBoard];

    while (queue.length) {
      const idx = queue.shift();
      if (visited.has(idx)) continue;
      visited.add(idx);

      const c = nextBoard[idx];
      if (c.isOpen || c.isFlagged || c.isMine) continue;

      // Створюємо новий об'єкт клітинки замість мутації
      nextBoard[idx] = { ...c, isOpen: true };

      if (c.adjacentMines === 0) {
        neighborsOf(idx).forEach(n => queue.push(n));
      }
    }

    setBoard(nextBoard);

    // Перевірка перемоги
    if (nextBoard.filter(c => c.isOpen && !c.isMine).length === (ROWS * COLS - MINES_COUNT)) {
      setStatus(GAME_STATUS.WON);
      setMessage({ text: 'Перемога!', kind: 'win' });
    }
  };

  const handleContextMenu = (e, index) => {
    e.preventDefault();
    if (status !== GAME_STATUS.RUNNING && status !== GAME_STATUS.READY) return;

    const newBoard = [...board];
    const cell = newBoard[index];

    if (cell.isOpen) return;

    // Створюємо новий об'єкт замість мутації
    if (cell.isFlagged) {
      newBoard[index] = { ...cell, isFlagged: false };
    } else if (flagsAvailable > 0) {
      newBoard[index] = { ...cell, isFlagged: true };
    }
    setBoard(newBoard);
  };

  return (
    <div className={styles.container}>
      <div className={styles.hud}>
        <Timer seconds={seconds} />
        <div>🚩: {flagsAvailable}</div>
        <button type="button" onClick={createEmptyBoard}>Рестарт</button>
      </div>
      <GameStatus text={message.text} kind={message.kind} />
      <Board board={board} cols={COLS} onCellClick={handleCellClick} onContextMenu={handleContextMenu} />
    </div>
  );
};

export default Minesweeper;
