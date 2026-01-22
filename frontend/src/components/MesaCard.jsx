import React from 'react';

const coloresEstado = {
  Disponible: '#4CAF50',
  Ocupada: '#F44336',
  Reservada: '#FF9800',
  'Fuera de servicio': '#9E9E9E',
};

function MesaCard({ mesa }) {
  const color = coloresEstado[mesa.estado] || '#CCCCCC';

  return (
    <div style={{
      border: `2px solid ${color}`,
      borderRadius: '8px',
      padding: '16px',
      width: '150px',
      textAlign: 'center',
      backgroundColor: '#f9f9f9',
    }}>
      <h3>{mesa.nombre}</h3>
      <p style={{ color }}>{mesa.estado}</p>
    </div>
  );
}

export default MesaCard;