import React from 'react';
import styles from './Minesweeper.module.css';

const Cell = ({ cell, onClick, onContextMenu }) => {
  const renderContent = () => {
    if (!cell.isOpen) return cell.isFlagged ? '🚩' : '';
    if (cell.isMine) return '💣';
    return cell.adjacentMines > 0 ? cell.adjacentMines : '';
  };

  const getAriaLabel = () => {
    if (!cell.isOpen) return cell.isFlagged ? 'Клітинка з прапорцем' : 'Закрита клітинка';
    if (cell.isMine) return 'Міна';
    return cell.adjacentMines > 0 ? `Відкрито, ${cell.adjacentMines} мін навколо` : 'Відкрита порожня клітинка';
  };

  return (
    <button
      type="button"
      aria-label={getAriaLabel()}
      className={`${styles.cell} ${cell.isOpen ? styles.open : styles.closed} ${cell.isFlagged ? styles.flag : ''}`}
      onClick={() => onClick(cell.index)}
      onContextMenu={(e) => onContextMenu(e, cell.index)}
    >
      {renderContent()}
    </button>
  );
};

export default Cell;
