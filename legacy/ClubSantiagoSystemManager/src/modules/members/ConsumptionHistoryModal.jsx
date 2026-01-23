import React, { useEffect, useState } from 'react';
import { API_URL } from '../../config';

const ConsumptionHistoryModal = ({ user, onClose }) => {
    const [sales, setSales] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedSale, setSelectedSale] = useState(null); // For viewing details if items list is long? 
    // Or just show all in a nice table? Let's try to show inline first.

    useEffect(() => {
        if (user) fetchHistory();
    }, [user]);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/users/${user.id}/sales`);
            const data = await res.json();
            if (Array.isArray(data)) {
                setSales(data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString('es-CL');
    };

    const renderItems = (itemsJson) => {
        try {
            const items = typeof itemsJson === 'string' ? JSON.parse(itemsJson) : itemsJson;
            if (!Array.isArray(items)) return '-';
            return items.map((item, idx) => (
                <div key={idx} style={{ fontSize: '0.85rem', marginBottom: '2px' }}>
                    {item.quantity}x {item.name}
                    {item.type === 'RETURN' && <span style={{ color: '#EF5350', marginLeft: '5px' }}>(Devolución)</span>}
                    {item.type === 'EXCHANGE' && <span style={{ color: '#FF9800', marginLeft: '5px' }}>(Cambio)</span>}
                </div>
            ));
        } catch (e) {
            return 'Datos corruptos';
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100
        }}>
            <div style={{ backgroundColor: '#1E1E1E', padding: '25px', borderRadius: '8px', width: '800px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', border: '1px solid #444', color: '#fff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ color: 'var(--color-primary)', margin: 0 }}>
                        Historial de Consumo: {user.full_name}
                    </h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
                </div>

                {loading ? <p>Cargando historial...</p> : (
                    <div style={{ overflowY: 'auto', flex: 1 }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid #444', color: '#888' }}>
                                    <th style={{ padding: '10px' }}>Fecha</th>
                                    <th style={{ padding: '10px' }}>Detalle</th>
                                    <th style={{ padding: '10px' }}>Total</th>
                                    <th style={{ padding: '10px' }}>Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sales.map(sale => (
                                    <tr key={sale.id} style={{ borderBottom: '1px solid #333' }}>
                                        <td style={{ padding: '10px', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                                            {formatDate(sale.created_at)}
                                        </td>
                                        <td style={{ padding: '10px', verticalAlign: 'top' }}>
                                            {renderItems(sale.items)}
                                        </td>
                                        <td style={{ padding: '10px', verticalAlign: 'top', fontWeight: 'bold', color: parseFloat(sale.total) < 0 ? '#EF5350' : '#4CAF50' }}>
                                            ${parseInt(sale.total).toLocaleString('es-CL')}
                                        </td>
                                        <td style={{ padding: '10px', verticalAlign: 'top' }}>
                                            <span style={{
                                                padding: '2px 6px', borderRadius: '4px', fontSize: '0.8rem',
                                                backgroundColor: sale.payment_status === 'PAID' ? 'rgba(76, 175, 80, 0.2)' : 'rgba(239, 83, 80, 0.2)',
                                                color: sale.payment_status === 'PAID' ? '#81C784' : '#EF5350'
                                            }}>
                                                {sale.payment_status === 'PAID' ? 'PAGADO' : 'PENDIENTE'}
                                            </span>
                                            <div style={{ fontSize: '0.75rem', marginTop: '4px', color: '#888' }}>
                                                {sale.method === 'CASH' ? 'Efectivo' : sale.method === 'ACCOUNT' ? 'Cuenta Cte' : sale.method}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {sales.length === 0 && (
                                    <tr>
                                        <td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                                            No hay registros de consumo.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                <div style={{ marginTop: '20px', textAlign: 'right' }}>
                    <button onClick={onClose} className="btn-secondary" style={{ padding: '8px 20px' }}>Cerrar</button>
                </div>
            </div>
        </div>
    );
};

export default ConsumptionHistoryModal;
