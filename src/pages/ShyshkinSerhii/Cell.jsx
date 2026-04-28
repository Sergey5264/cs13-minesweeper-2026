import React from 'react';
import styles from './Minesweeper.module.css';

const Cell = ({ cell, onClick, onContextMenu }) => {
  const renderContent = () => {
    if (!cell.isOpen) return cell.isFlagged ? '🚩' : '';
    if (cell.isMine) return '💣';
    return cell.adjacentMines > 0 ? cell.adjacentMines : '';
  };

  return (
    <button
      className={`${styles.cell} ${cell.isOpen ? styles.open : styles.closed} ${cell.isFlagged ? styles.flag : ''}`}
      onClick={() => onClick(cell.index)}
      onContextMenu={(e) => onContextMenu(e, cell.index)}
    >
      {renderContent()}
    </button>
  );
};

export default Cell;