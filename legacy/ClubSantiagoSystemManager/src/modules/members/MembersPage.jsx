import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../../config';
import { useAuth } from '../../context/AuthContext';
import ConsumptionHistoryModal from './ConsumptionHistoryModal';

const MembersPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showDebtorsOnly, setShowDebtorsOnly] = useState(false);

    // Payment Modal State
    const [paymentUser, setPaymentUser] = useState(null);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('CASH');

    // History Modal State
    const [historyUser, setHistoryUser] = useState(null);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/users`);
            const data = await res.json();
            if (Array.isArray(data)) {
                setUsers(data);
            }
        } catch (err) {
            console.error('Error fetching users:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!confirm('¿Estás seguro de que deseas eliminar este usuario? Esta acción no se puede deshacer.')) return;
        try {
            const res = await fetch(`${API_URL}/users/${userId}`, { method: 'DELETE' });
            if (res.ok) {
                alert('Usuario eliminado correctamente');
                fetchUsers();
            } else {
                const err = await res.json();
                alert('Error al eliminar: ' + (err.error || 'Error desconocido'));
            }
        } catch (error) {
            console.error('Error deleting user:', error);
            alert('Error al eliminar usuario');
        }
    };

    const handlePayment = async (e) => {
        e.preventDefault();
        if (!paymentUser || !paymentAmount) return;

        if (confirm(`¿Confirmar pago de $${parseInt(paymentAmount).toLocaleString('es-CL')} para ${paymentUser.full_name}?`)) {
            try {
                const res = await fetch(`${API_URL}/users/${paymentUser.id}/pay`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        amount: parseInt(paymentAmount),
                        method: paymentMethod
                    })
                });

                if (res.ok) {
                    alert('Pago registrado con éxito');
                    setPaymentUser(null);
                    setPaymentAmount('');
                    fetchUsers(); // Refresh data
                } else {
                    alert('Error al registrar pago');
                }
            } catch (error) {
                alert('Error de red');
            }
        }
    };

    const getFlagEmoji = (code) => {
        if (!code) return '🏳️';
        const OFFSET = 127397;
        const chars = [...code.toUpperCase()].map(c => c.charCodeAt() + OFFSET);
        return String.fromCodePoint(...chars);
    };

    const [searchTerm, setSearchTerm] = useState('');

    const filteredUsers = users.filter(u => {
        const matchesSearch = u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.rut.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesDebtor = showDebtorsOnly ? parseFloat(u.current_debt) > 0 : true;

        return matchesSearch && matchesDebtor;
    });

    return (
        <div className="container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <button onClick={() => navigate('/dashboard')} className="btn-home">
                        🏠 Inicio
                    </button>
                    <h2>Gestión de Socios y Clientes</h2>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                    <input
                        type="text"
                        placeholder="Buscar socio (RUT/Nombre)..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            padding: '10px',
                            backgroundColor: '#333',
                            color: '#fff',
                            border: '1px solid #555',
                            borderRadius: '4px',
                            width: '250px'
                        }}
                    />
                    <button
                        onClick={() => setShowDebtorsOnly(!showDebtorsOnly)}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: showDebtorsOnly ? '#EF5350' : '#333',
                            color: '#fff',
                            border: '1px solid #555',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        {showDebtorsOnly ? 'Ver Todos' : 'Ver Deudores'}
                    </button>
                    <button onClick={() => navigate('/members/new')} className="btn-primary">
                        + Nuevo Registro
                    </button>
                </div>
            </div>

            {loading ? <p>Cargando...</p> : (
                <div style={{ overflowX: 'auto', height: 'calc(100vh - 200px)', overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--color-primary)' }}>
                                <th style={thStyle}>Pais</th>
                                <th style={thStyle}>RUT</th>
                                <th style={thStyle}>Nombre Completo</th>
                                <th style={thStyle}>Tipo</th>
                                <th style={thStyle}>Rol</th>
                                <th style={thStyle}>Deuda</th>
                                <th style={thStyle}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map(u => (
                                <tr key={u.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                    <td style={tdStyle}>{getFlagEmoji(u.flag_country)}</td>
                                    <td style={tdStyle}>{u.rut}</td>
                                    <td style={tdStyle}>{u.full_name}</td>
                                    <td style={tdStyle}>{u.type}</td>
                                    <td style={tdStyle}>{u.role}</td>
                                    <td style={{ ...tdStyle, color: parseFloat(u.current_debt) > 0 ? '#EF5350' : '#66BB6A', fontWeight: 'bold' }}>
                                        ${parseFloat(u.current_debt || 0).toLocaleString('es-CL')}
                                    </td>
                                    <td style={tdStyle}>
                                        <div style={{ display: 'flex', gap: '5px' }}>
                                            {/* Admin Only Actions: Edit/Delete */}
                                            {(user?.role === 'ADMIN' || user?.role === 'SUPERUSER') && (
                                                <>
                                                    <button
                                                        className="btn-secondary"
                                                        style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                                                        onClick={() => navigate(`/members/edit/${u.id}`)}
                                                    >
                                                        Editar
                                                    </button>
                                                    <button
                                                        className="btn-secondary"
                                                        style={{ padding: '4px 8px', fontSize: '0.8rem', backgroundColor: '#FF9800', color: '#fff' }}
                                                        onClick={() => setHistoryUser(u)}
                                                        title="Ver Historial de Consumo"
                                                    >
                                                        📜 Historial
                                                    </button>
                                                    <button
                                                        style={{ padding: '4px 8px', fontSize: '0.8rem', backgroundColor: '#F44336', border: 'none', borderRadius: '4px', color: '#fff', cursor: 'pointer' }}
                                                        onClick={() => handleDeleteUser(u.id)}
                                                    >
                                                        Eliminar
                                                    </button>
                                                </>
                                            )}

                                            {/* General Action: Pay Debt */}
                                            {parseFloat(u.current_debt) > 0 && (
                                                <button
                                                    style={{ padding: '4px 8px', fontSize: '0.8rem', backgroundColor: '#66BB6A', border: 'none', borderRadius: '4px', color: '#000', cursor: 'pointer', fontWeight: 'bold' }}
                                                    onClick={() => {
                                                        setPaymentUser(u);
                                                        setPaymentAmount(u.current_debt);
                                                    }}
                                                >
                                                    Pagar
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* PAYMENT MODAL */}
            {paymentUser && (
                <div style={modalOverlayStyle}>
                    <div style={modalContentStyle}>
                        <h3>Registrar Pago de Deuda</h3>
                        <p>Cliente: <strong>{paymentUser.full_name}</strong></p>
                        <p>Deuda Total: <strong>${parseFloat(paymentUser.current_debt).toLocaleString('es-CL')}</strong></p>

                        <form onSubmit={handlePayment} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px' }}>Monto a Pagar</label>
                                <input
                                    type="number"
                                    value={paymentAmount}
                                    onChange={e => setPaymentAmount(e.target.value)}
                                    max={paymentUser.current_debt}
                                    style={{ width: '100%', padding: '10px', backgroundColor: '#222', color: '#fff', border: '1px solid #444' }}
                                    required
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '5px' }}>Método de Pago</label>
                                <select
                                    value={paymentMethod}
                                    onChange={e => setPaymentMethod(e.target.value)}
                                    style={{ width: '100%', padding: '10px', backgroundColor: '#222', color: '#fff', border: '1px solid #444' }}
                                >
                                    <option value="CASH">Efectivo</option>
                                    <option value="DEBIT">Tarjeta Débito/Crédito</option>
                                    <option value="TRANSFER">Transferencia</option>
                                </select>
                            </div>

                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                <button type="button" onClick={() => setPaymentUser(null)} style={{ flex: 1, padding: '10px', backgroundColor: '#555', color: '#fff', border: 'none', cursor: 'pointer' }}>Cancelar</button>
                                <button type="submit" style={{ flex: 1, padding: '10px', backgroundColor: '#66BB6A', color: '#000', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>Confirmar Pago</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}


            {/* CONSUMPTION HISTORY MODAL */}
            {
                historyUser && (
                    <ConsumptionHistoryModal
                        user={historyUser}
                        onClose={() => setHistoryUser(null)}
                    />
                )
            }
        </div >
    );
};

const thStyle = { padding: '12px', fontWeight: '600', position: 'sticky', top: 0, backgroundColor: '#1E1E1E', zIndex: 1 };
const tdStyle = { padding: '12px' };
const modalOverlayStyle = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
};
const modalContentStyle = {
    backgroundColor: '#333', padding: '30px', borderRadius: '8px', width: '400px', maxWidth: '90%', color: '#fff'
};

export default MembersPage;
