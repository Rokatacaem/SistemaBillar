import React from 'react';
import { Link } from 'react-router-dom';

function Navbar() {
  return (
    <nav style={{ padding: '10px', backgroundColor: '#333', color: '#fff' }}>
      <Link to="/" style={{ marginRight: '15px', color: '#fff' }}>Mesas</Link>
      <Link to="/turnos" style={{ marginRight: '15px', color: '#fff' }}>Turnos</Link>
      <Link to="/pedidos" style={{ marginRight: '15px', color: '#fff' }}>Pedidos</Link>
      <Link to="/reportes" style={{ color: '#fff' }}>Reportes</Link>
    </nav>
  );
}

export default Navbar;