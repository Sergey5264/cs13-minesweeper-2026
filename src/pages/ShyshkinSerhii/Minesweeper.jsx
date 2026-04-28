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
  const [flagsAvailable, setFlagsAvailable] = useState(MINES_COUNT);
  const [seconds, setSeconds] = useState(0);
  const [message, setMessage] = useState({ text: '', kind: 'info' });

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

  const createBoard = useCallback(() => {
    const total = ROWS * COLS, indices = Array.from({ length: total }, (_, i) => i).sort(() => Math.random() - 0.5);
    const mineSet = new Set(indices.slice(0, MINES_COUNT));
    const newBoard = Array.from({ length: total }, (_, i) => ({
      index: i, isMine: mineSet.has(i), isOpen: false, isFlagged: false, adjacentMines: 0
    }));
    newBoard.forEach(c => { if (!c.isMine) c.adjacentMines = neighborsOf(c.index).reduce((acc, ni) => acc + (newBoard[ni].isMine ? 1 : 0), 0); });
    setBoard(newBoard);
  }, [neighborsOf]);

  useEffect(() => { createBoard(); }, [createBoard]);
  useEffect(() => {
    let interval;
    if (status === GAME_STATUS.RUNNING) interval = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(interval);
  }, [status]);

  const handleCellClick = (index) => {
    if (status === GAME_STATUS.WON || status === GAME_STATUS.LOST) return;
    if (status === GAME_STATUS.READY) setStatus(GAME_STATUS.RUNNING);
    const newBoard = [...board], cell = newBoard[index];
    if (cell.isOpen || cell.isFlagged) return;
    if (cell.isMine) {
      newBoard.forEach(c => { if(c.isMine) c.isOpen = true; });
      setBoard(newBoard); setStatus(GAME_STATUS.LOST); setMessage({ text: 'Поразка!', kind: 'lose' });
      return;
    }
    const queue = [index], visited = new Set();
    while (queue.length) {
      const idx = queue.shift(); if (visited.has(idx)) continue; visited.add(idx);
      const c = newBoard[idx]; if (c.isOpen || c.isFlagged || c.isMine) continue;
      c.isOpen = true; if (c.adjacentMines === 0) neighborsOf(idx).forEach(n => queue.push(n));
    }
    setBoard(newBoard);
    if (newBoard.filter(c => c.isOpen && !c.isMine).length === (ROWS * COLS - MINES_COUNT)) {
      setStatus(GAME_STATUS.WON); setMessage({ text: 'Перемога!', kind: 'win' });
    }
  };

  const handleContextMenu = (e, index) => {
    e.preventDefault(); if (status !== GAME_STATUS.RUNNING && status !== GAME_STATUS.READY) return;
    const newBoard = [...board], cell = newBoard[index];
    if (cell.isOpen) return;
    if (cell.isFlagged) { cell.isFlagged = false; setFlagsAvailable(f => f + 1); }
    else if (flagsAvailable > 0) { cell.isFlagged = true; setFlagsAvailable(f => f - 1); }
    setBoard(newBoard);
  };

  return (
    <div className={styles.container}>
      <div className={styles.hud}>
        <Timer seconds={seconds} />
        <div>🚩: {flagsAvailable}</div>
        <button onClick={() => { setStatus(GAME_STATUS.READY); setSeconds(0); setFlagsAvailable(MINES_COUNT); setMessage({ text: '', kind: 'info' }); createBoard(); }}>Рестарт</button>
      </div>
      <GameStatus text={message.text} kind={message.kind} />
      <Board board={board} cols={COLS} onCellClick={handleCellClick} onContextMenu={handleContextMenu} />
    </div>
  );
};

export default Minesweeper;
// Triggering push