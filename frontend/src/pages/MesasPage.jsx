import React from 'react';
import MesaCard from '../components/MesaCard';

const mesas = [
  { id: 1, nombre: 'Mesa 1', estado: 'Disponible' },
  { id: 2, nombre: 'Mesa 2', estado: 'Ocupada' },
  { id: 3, nombre: 'Mesa 3', estado: 'Reservada' },
  { id: 4, nombre: 'Mesa 4', estado: 'Fuera de servicio' },
];

function MesasPage() {
  return (
    <div style={{ padding: '20px' }}>
      <h2>Estado de las Mesas</h2>
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        {mesas.map((mesa) => (
          <MesaCard key={mesa.id} mesa={mesa} />
        ))}
      </div>
    </div>
  );
}

export default MesasPage;