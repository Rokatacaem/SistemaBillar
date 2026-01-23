import React from 'react';

const statusConfig = {
  AVAILABLE: { label: 'Disponible', color: '#4CAF50' },
  OCCUPIED: { label: 'Ocupada', color: '#F44336' },
  RESERVED: { label: 'Reservada', color: '#FF9800' },
  OUT_OF_SERVICE: { label: 'Fuera de servicio', color: '#9E9E9E' },
};

function MesaCard({ mesa }) {
  // Fallback if status is unknown
  const config = statusConfig[mesa.status] || { label: mesa.status, color: '#CCCCCC' };

  return (
    <div style={{
      border: `2px solid ${config.color}`,
      borderRadius: '8px',
      padding: '16px',
      width: '150px',
      textAlign: 'center',
      backgroundColor: '#f9f9f9',
    }}>
      <h3>{mesa.name}</h3> {/* Backend uses 'name', not 'nombre' */}
      <p style={{ color: config.color, fontWeight: 'bold' }}>{config.label}</p>
      {mesa.type && <small style={{ color: '#666' }}>{mesa.type}</small>}
    </div>
  );
}

export default MesaCard;