import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { API_URL } from '../../config';
import OpenShiftModal from './OpenShiftModal';

// UTILS
const formatCurrency = (amount) => '$' + parseInt(amount || 0).toLocaleString('es-CL');

const ShiftsPage = () => {
    const { user } = useAuth();
    const [currentShift, setCurrentShift] = useState(null);
    const [loading, setLoading] = useState(true);

    // Modals
    const [showOpenModal, setShowOpenModal] = useState(false);
    const [showCloseModal, setShowCloseModal] = useState(false);
    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);

    // Form States
    const [declaredCash, setDeclaredCash] = useState('');
    const [expenseAmount, setExpenseAmount] = useState('');
    const [expenseDesc, setExpenseDesc] = useState('');
    const [closingNotes, setClosingNotes] = useState('');

    useEffect(() => {
        fetchShift();
    }, []);

    const fetchShift = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/shifts/current`);
            const data = await res.json();
            setCurrentShift(data); // null or object
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // HANDLERS
    const handleShiftOpened = () => {
        setShowOpenModal(false);
        fetchShift();
    };

    const handleAddExpense = async (e) => {
        e.preventDefault();
        const amount = parseInt(expenseAmount);

        if (amount > currentShift.system_cash) {
            alert(`No puede retirar más de lo que hay en caja ($${currentShift.system_cash.toLocaleString('es-CL')})`);
            return;
        }

        try {
            const res = await fetch(`${API_URL}/expenses`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    shift_id: currentShift.id,
                    amount: amount,
                    description: expenseDesc,
                    created_by: user.id
                })
            });
            if (res.ok) {
                alert('Gasto registrado');
                setExpenseAmount('');
                setExpenseDesc('');
                setShowExpenseModal(false);
                fetchShift();
            }
        } catch (err) { console.error(err); }
    };

    const handleCloseShift = async (e) => {
        e.preventDefault();
        if (!confirm('¿Seguro que desea cerrar la caja? Esta acción es irreversible.')) return;

        try {
            const res = await fetch(`${API_URL}/shifts/close`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    shift_id: currentShift.id,
                    closer_id: user.id,
                    final_cash_declared: parseInt(declaredCash),
                    final_cash_system: currentShift.system_cash,
                    expenses_total: currentShift.total_expenses,
                    notes: closingNotes
                })
            });
            if (res.ok) {
                setShowCloseModal(false);
                // Prepare report data for view
                const reportData = {
                    ...currentShift,
                    final_cash_declared: parseInt(declaredCash),
                    closer_name: user.name,
                    notes: closingNotes
                };
                setCurrentShift({ ...reportData, status: 'CLOSED' }); // Optimistic update for report view
                setShowReportModal(true);
            } else {
                alert('Error al cerrar turno');
            }
        } catch (err) { console.error(err); }
    };

    if (loading) return <div style={{ padding: '20px', color: '#fff' }}>Cargando Caja...</div>;

    // VIEW: REPORT (Generated after close)
    if (showReportModal) {
        return (
            <div style={{ padding: '40px', backgroundColor: '#fff', color: '#000', maxWidth: '600px', margin: '20px auto', fontFamily: 'monospace' }}>
                <h2 style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: '10px' }}>COMPROBANTE CIERRE DE CAJA</h2>

                <div style={{ marginBottom: '20px' }}>
                    <p><strong>Fecha Apertura:</strong> {new Date(currentShift.opened_at).toLocaleString()}</p>
                    <p><strong>Fecha Cierre:</strong> {new Date().toLocaleString()}</p>
                    <p><strong>Cajero:</strong> {currentShift.cashier_name}</p>
                    <p><strong>Cierra:</strong> {user.name}</p>
                </div>

                <table style={{ width: '100%', marginBottom: '20px', borderCollapse: 'collapse' }}>
                    <tbody>
                        <tr><td>(+) Fondo Inicial</td><td style={{ textAlign: 'right' }}>{formatCurrency(currentShift.initial_cash)}</td></tr>
                        <tr><td>(+) Ventas Efectivo</td><td style={{ textAlign: 'right' }}>{formatCurrency(currentShift.total_sales_cash)}</td></tr>
                        <tr><td>(+) Ventas Débito</td><td style={{ textAlign: 'right' }}>{formatCurrency(currentShift.total_sales_debit)}</td></tr>
                        <tr><td>(+) Ventas Transferencia</td><td style={{ textAlign: 'right' }}>{formatCurrency(currentShift.total_sales_transfer)}</td></tr>
                        <tr><td>(-) Gastos / Retiros</td><td style={{ textAlign: 'right' }}>{formatCurrency(currentShift.total_expenses)}</td></tr>
                        <tr style={{ borderTop: '2px solid #000', fontWeight: 'bold' }}>
                            <td>(=) Total Sistema (Efectivo)</td><td style={{ textAlign: 'right' }}>{formatCurrency(currentShift.system_cash)}</td>
                        </tr>
                        <tr>
                            <td>Efec. Declarado (Real)</td><td style={{ textAlign: 'right' }}>{formatCurrency(currentShift.final_cash_declared || declaredCash)}</td>
                        </tr>
                        <tr style={{ fontWeight: 'bold', color: (currentShift.final_cash_declared - currentShift.system_cash) > 0 ? 'green' : (currentShift.final_cash_declared - currentShift.system_cash) < 0 ? 'red' : 'black' }}>
                            <td>Diferencia</td><td style={{ textAlign: 'right' }}>{formatCurrency((currentShift.final_cash_declared || declaredCash) - currentShift.system_cash)}</td>
                        </tr>
                    </tbody>
                </table>

                {currentShift.notes && (
                    <div style={{ marginBottom: '40px', border: '1px solid #ccc', padding: '10px' }}>
                        <strong>Notas:</strong> {currentShift.notes}
                    </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '80px', textAlign: 'center' }}>
                    <div style={{ borderTop: '1px solid #000', width: '40%' }}>
                        <p>{currentShift.cashier_name}<br />ENTREGA CONFORME</p>
                    </div>
                    <div style={{ borderTop: '1px solid #000', width: '40%' }}>
                        <p>{user.name}<br />RECIBE CONFORME</p>
                    </div>
                </div>

                <button
                    onClick={() => {
                        window.location.href = '/login';
                        localStorage.removeItem('smcbs_user');
                        window.location.reload();
                    }}
                    style={{ marginTop: '40px', width: '100%', padding: '15px', backgroundColor: '#000', color: '#fff', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}
                    className="no-print"
                >
                    FINALIZAR Y CERRAR SESIÓN (CAMBIO DE TURNO)
                </button>
                <style>{`@media print { .no-print { display: none; } body { background: #fff; } }`}</style>
            </div>
        );
    }

    // VIEW: NO ACTIVE SHIFT
    if (!currentShift) {
        return (
            <div style={{ padding: '20px', color: '#fff', textAlign: 'center', marginTop: '50px' }}>
                <h1 style={{ color: '#888' }}>Caja Cerrada</h1>
                <p>No hay un turno activo en este momento.</p>
                <button onClick={() => setShowOpenModal(true)} style={btnPrimaryLg}>Abrir Turno de Caja</button>

                {/* MODAL OPEN */}
                {showOpenModal && (
                    <OpenShiftModal
                        user={user}
                        onClose={() => setShowOpenModal(false)}
                        onSuccess={handleShiftOpened}
                    />
                )}
            </div>
        );
    }

    // VIEW: ACTIVE SHIFT DASHBOARD
    return (
        <div style={{ padding: '20px', color: '#fff', maxWidth: '1000px', margin: '0 auto' }}>
            {/* HERADER */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '1px solid #333', paddingBottom: '20px' }}>
                <div>
                    <h2 style={{ margin: 0, color: 'var(--color-primary)' }}>TURNO ACTIVO</h2>
                    <p style={{ margin: '5px 0 0 0', color: '#888' }}>
                        Abierto por: <strong>{currentShift.cashier_name}</strong> • {new Date(currentShift.opened_at).toLocaleTimeString()}
                    </p>
                </div>
                <div>
                    <button onClick={() => setShowCloseModal(true)} style={{ ...btnPrimaryLg, backgroundColor: '#EF5350' }}>CERRAR CAJA</button>
                </div>
            </div>

            {/* METRICS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '40px' }}>
                <MetricCard title="Fondo Inicial" value={formatCurrency(currentShift.initial_cash)} color="#888" />
                <MetricCard title="(+) Ventas Efectivo" value={formatCurrency(currentShift.total_sales_cash)} color="#66BB6A" />
                <MetricCard title="(+) Ventas Débito" value={formatCurrency(currentShift.total_sales_debit)} color="#42A5F5" />
                <MetricCard title="(+) Ventas Transfer." value={formatCurrency(currentShift.total_sales_transfer)} color="#AB47BC" />
                <MetricCard title="(-) Gastos" value={formatCurrency(currentShift.total_expenses)} color="#EF5350" />
                <MetricCard title="(=) EFECTIVO EN CAJA" value={formatCurrency(currentShift.system_cash)} color="#fff" bg="#333" isBig />
            </div>

            {/* EXPENSES SECTION */}
            <div style={{ backgroundColor: '#1E1E1E', padding: '20px', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ margin: 0 }}>Gastos y Retiros</h3>
                    <button onClick={() => setShowExpenseModal(true)} style={btnSec}>+ Registrar Gasto</button>
                </div>
                {/* Could list recent expenses here if API returned them */}
                <p style={{ color: '#666', fontStyle: 'italic' }}>Gestione los gastos menores que salen de la caja aquí.</p>
            </div>

            {/* MODAL EXPENSE */}
            {showExpenseModal && (
                <div style={modalOverlay}>
                    <div style={modalContent}>
                        <h3>Registrar Gasto</h3>
                        <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#222', borderRadius: '4px', textAlign: 'center' }}>
                            <span style={{ color: '#888', fontSize: '0.9rem' }}>Disponible en Caja:</span><br />
                            <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#fff' }}>{formatCurrency(currentShift.system_cash)}</span>
                        </div>
                        <form onSubmit={handleAddExpense}>
                            <label style={labelStyle}>Monto</label>
                            <input type="tel" value={expenseAmount} onChange={e => setExpenseAmount(e.target.value.replace(/\D/g, ''))} style={inputStyle} required />

                            <label style={labelStyle}>Descripción / Motivo</label>
                            <input type="text" value={expenseDesc} onChange={e => setExpenseDesc(e.target.value)} style={inputStyle} required placeholder="Ej: Compra Limones" />

                            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                                <button type="button" onClick={() => setShowExpenseModal(false)} style={btnSec}>Cancelar</button>
                                <button type="submit" style={btnPri}>Registrar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL CLOSE */}
            {showCloseModal && (
                <div style={modalOverlay}>
                    <div style={modalContent}>
                        <h3>Cierre de Turno</h3>
                        <p>Por favor cuente el dinero físico en la caja e ingrese el total.</p>

                        <div style={{ backgroundColor: '#222', padding: '15px', borderRadius: '4px', marginBottom: '20px', textAlign: 'center' }}>
                            <span style={{ color: '#888', display: 'block', fontSize: '0.8rem' }}>TOTAL ESPERADO (SISTEMA)</span>
                            <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{formatCurrency(currentShift.system_cash)}</span>
                        </div>

                        <form onSubmit={handleCloseShift}>
                            <label style={labelStyle}>Efectivo Contado (Real)</label>
                            <input
                                type="tel"
                                value={declaredCash}
                                autoFocus
                                onChange={e => setDeclaredCash(e.target.value.replace(/\D/g, ''))}
                                style={{ ...inputStyle, fontSize: '1.2rem', textAlign: 'center', color: '#66BB6A' }}
                                required
                            />

                            {declaredCash && (
                                <div style={{ textAlign: 'center', margin: '10px 0', fontWeight: 'bold', color: (parseInt(declaredCash) - currentShift.system_cash) !== 0 ? '#EF5350' : '#66BB6A' }}>
                                    Diferencia: {formatCurrency(parseInt(declaredCash) - currentShift.system_cash)}
                                </div>
                            )}

                            <label style={labelStyle}>Notas / Observaciones</label>
                            <textarea
                                value={closingNotes}
                                onChange={e => setClosingNotes(e.target.value)}
                                style={{ ...inputStyle, height: '80px' }}
                                placeholder="Ej: Faltan $500 por vuelto mal dado..."
                            ></textarea>

                            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                                <button type="button" onClick={() => setShowCloseModal(false)} style={btnSec}>Cancelar</button>
                                <button type="submit" style={{ ...btnPri, backgroundColor: '#EF5350' }}>Confirmar Cierre</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

// COMPONENTS
const MetricCard = ({ title, value, color, bg = 'transparent', isBig = false }) => (
    <div style={{ backgroundColor: bg, border: '1px solid #333', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
        <h4 style={{ margin: '0 0 10px 0', color: '#888', fontSize: '0.9rem' }}>{title}</h4>
        <div style={{ fontSize: isBig ? '2rem' : '1.5rem', fontWeight: 'bold', color: color }}>{value}</div>
    </div>
);

// STYLES
const modalOverlay = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
};
const modalContent = {
    backgroundColor: '#333', padding: '30px', borderRadius: '8px', width: '400px', maxWidth: '90%', color: '#fff'
};
const inputStyle = {
    width: '100%', padding: '12px', backgroundColor: '#222', border: '1px solid #444', color: '#fff', borderRadius: '4px', marginBottom: '10px'
};
const labelStyle = { display: 'block', marginBottom: '5px', color: '#ccc', textAlign: 'left' };
const btnPrimaryLg = {
    padding: '15px 30px', fontSize: '1.2rem', backgroundColor: 'var(--color-primary)', color: '#000', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold'
};
const btnPri = {
    flex: 1, padding: '12px', backgroundColor: 'var(--color-primary)', color: '#000', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold'
};
const btnSec = {
    flex: 1, padding: '12px', backgroundColor: '#555', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer'
};

export default ShiftsPage;
