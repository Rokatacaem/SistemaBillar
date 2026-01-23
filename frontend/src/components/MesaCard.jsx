import React from 'react';
import './MesaCard.css';

const statusConfig = {
  AVAILABLE: { label: 'Disponible', className: 'status-available' },
  OCCUPIED: { label: 'Ocupada', className: 'status-occupied' },
  RESERVED: { label: 'Reservada', className: 'status-reserved' },
  OUT_OF_SERVICE: { label: 'Fuera de Servicio', className: 'status-out' },
};

function MesaCard({ mesa }) {
  const config = statusConfig[mesa.status] || { label: mesa.status, className: 'status-out' };

  // Determine felt color
  let surfaceClass = 'mesa-surface';
  if (mesa.type === 'CARDS') surfaceClass += ' variant-red'; // Example: Cards tables red
  else if (mesa.type === 'SNOOKER') surfaceClass += ' variant-blue';

  return (
    <div className="mesa-card-container">
      <div className="mesa-table">
        {/* Pockets */}
        <div className="pocket p-tl"></div>
        <div className="pocket p-tm"></div>
        <div className="pocket p-tr"></div>
        <div className="pocket p-bl"></div>
        <div className="pocket p-bm"></div>
        <div className="pocket p-br"></div>

        {/* Felt Surface */}
        <div className={surfaceClass}>
          <div className="mesa-info">
            <div className="mesa-name">{mesa.name}</div>
            <div className={`mesa-status-badge ${config.className}`}>
              {config.label}
            </div>
          </div>
        </div>
      </div>

      <div className="mesa-footer">
        <small style={{ color: '#888' }}>{mesa.type || 'POOL'}</small>
      </div>
    </div>
  );
}

export default MesaCard;