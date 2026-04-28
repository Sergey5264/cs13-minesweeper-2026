import React from 'react';
import Cell from './Cell';
import styles from './Minesweeper.module.css';

const Board = ({ board, cols, onCellClick, onContextMenu }) => {
  return (
    <div className={styles.grid} style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {board.map((cell) => (
        <Cell key={cell.index} cell={cell} onClick={onCellClick} onContextMenu={onContextMenu} />
      ))}
    </div>
  );
};

export default Board;
