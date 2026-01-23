import React, { useEffect, useState } from 'react';
import MesaCard from '../components/MesaCard';
import { getTables, createTable } from '../services/api';

function MesasPage() {
  const [mesas, setMesas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMesas = async () => {
    try {
      setLoading(true);
      const data = await getTables();
      setMesas(data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Error al cargar mesas. Asegúrate de que el backend esté corriendo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMesas();
  }, []);

  const handleCreateTable = async () => {
    const nombre = prompt("Nombre de la mesa (ej: Mesa 5):");
    if (!nombre) return;

    try {
      await createTable({ name: nombre, type: 'POOL' });
      fetchMesas(); // Refresh list
    } catch (err) {
      alert("Error al crear mesa: " + err.message);
    }
  };

  if (loading) return <div>Cargando mesas...</div>;
  if (error) return <div style={{ color: 'red' }}>{error}</div>;

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Estado de las Mesas</h2>
        <button onClick={handleCreateTable} style={{ padding: '10px', cursor: 'pointer' }}>
          + Nueva Mesa
        </button>
      </div>

      {mesas.length === 0 ? (
        <p>No hay mesas registradas.</p>
      ) : (
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          {mesas.map((mesa) => (
            <MesaCard key={mesa.id} mesa={mesa} />
          ))}
        </div>
      )}
    </div>
  );
}

export default MesasPage;