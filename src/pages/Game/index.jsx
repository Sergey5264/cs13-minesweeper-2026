import React from 'react';
import { Link } from 'react-router-dom';

const GamePage = () => (
  <div style={{ padding: '20px', textAlign: 'center' }}>
    <h1>Minesweeper</h1>
    <Link to="/shyshkin-serhii" style={{ padding: '10px 20px', background: '#7f5539', color: '#fff', textDecoration: 'none', borderRadius: '5px' }}>
      Гра: Shyshkin Serhii
    </Link>
  </div>
);

export default GamePage;
