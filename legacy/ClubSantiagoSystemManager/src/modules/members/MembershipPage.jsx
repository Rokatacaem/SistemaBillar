
import React, { useState, useEffect } from 'react';
import { API_URL } from '../../config';
import MemberBookGenerator from './MemberBookGenerator';

const MembershipPage = () => {
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedMember, setSelectedMember] = useState(null); // For Modal
    const [showBookGenerator, setShowBookGenerator] = useState(false); // For Book Generator
    const [monthsToPay, setMonthsToPay] = useState(1);
    const [paymentMethod, setPaymentMethod] = useState('CASH');
    const [amount, setAmount] = useState(15000); // Default fee assumption

    const MONTHLY_FEE = 15000; // Hardcoded configuration for now

    useEffect(() => {
        fetchMembers();
    }, []);

    const fetchMembers = async () => {
        try {
            const res = await fetch(`${API_URL}/members`);
            const data = await res.json();
            setMembers(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenPayModal = (member) => {
        setSelectedMember(member);
        setMonthsToPay(1);
        setAmount(MONTHLY_FEE);
        setPaymentMethod('CASH');
    };

    const handleConfirmPayment = async () => {
        if (!selectedMember) return;

        try {
            const res = await fetch(`${API_URL}/members/${selectedMember.id}/pay-membership`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: parseInt(amount),
                    months: monthsToPay,
                    method: paymentMethod
                })
            });
            const data = await res.json();
            if (res.ok) { // Check res.ok instead of data.success if API returns standard errors
                alert('Membresía renovada con éxito');
                setSelectedMember(null);
                fetchMembers();
            } else {
                alert('Error: ' + (data.error || 'Error desconocido'));
            }
        } catch (error) {
            console.error(error);
            alert('Error al procesar el pago');
        }
    };

    const updateAmount = (months) => {
        setMonthsToPay(months);
        setAmount(months * MONTHLY_FEE);
    };

    return (
        <div style={{ padding: '20px', color: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ color: 'var(--color-primary)', margin: 0 }}>Gestión de Socios y Membresías</h2>
                <button
                    onClick={() => setShowBookGenerator(true)}
                    style={{ padding: '8px 16px', backgroundColor: '#333', color: '#fff', border: '1px solid #555', borderRadius: '4px', cursor: 'pointer' }}
                >
                    📖 Generar Libro
                </button>
            </div>

            {loading ? <p>Cargando...</p> : (
                <div style={{ backgroundColor: '#1E1E1E', borderRadius: '4px', overflow: 'hidden', height: 'calc(100vh - 150px)', overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#252525', color: '#888', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1 }}>
                                <th style={{ padding: '15px' }}>RUT</th>
                                <th style={{ padding: '15px' }}>Nombre</th>
                                <th style={{ padding: '15px' }}>Vencimiento</th>
                                <th style={{ padding: '15px' }}>Estado</th>
                                <th style={{ padding: '15px', textAlign: 'right' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {members.map(m => (
                                <tr key={m.id} style={{ borderBottom: '1px solid #333' }}>
                                    <td style={{ padding: '15px' }}>{m.rut}</td>
                                    <td style={{ padding: '15px', fontWeight: 'bold' }}>{m.full_name}</td>
                                    <td style={{ padding: '15px' }}>
                                        {m.membership_expires_at ? new Date(m.membership_expires_at).toLocaleDateString() : 'Sin registro'}
                                    </td>
                                    <td style={{ padding: '15px' }}>
                                        <span style={{
                                            padding: '5px 10px',
                                            borderRadius: '4px',
                                            fontSize: '0.8rem',
                                            fontWeight: 'bold',
                                            backgroundColor: m.status === 'ACTIVE' ? 'rgba(102, 187, 106, 0.2)' : 'rgba(239, 83, 80, 0.2)',
                                            color: m.status === 'ACTIVE' ? '#66BB6A' : '#EF5350'
                                        }}>
                                            {m.type === 'SOCIO' ? 'EXENTO/PERMANENTE' : (m.status === 'ACTIVE' ? 'AL DÍA' : 'VENCIDO')}
                                        </span>
                                    </td>
                                    <td style={{ padding: '15px', textAlign: 'right' }}>
                                        {m.type === 'FUNDADOR' && (
                                            <button
                                                onClick={() => handleOpenPayModal(m)}
                                                style={{
                                                    backgroundColor: 'var(--color-primary)',
                                                    color: '#000',
                                                    border: 'none',
                                                    padding: '8px 15px',
                                                    borderRadius: '4px',
                                                    cursor: 'pointer',
                                                    fontWeight: 'bold'
                                                }}
                                            >
                                                Renovar
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {members.length === 0 && (
                                <tr>
                                    <td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#666' }}>No hay socios registrados.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Payment Modal */}
            {selectedMember && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContent}>
                        <h3 style={{ marginTop: 0 }}>Renovar Membresía</h3>
                        <p style={{ color: '#888' }}>Socio: {selectedMember.full_name}</p>

                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '5px' }}>Meses a Pagar</label>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                {[1, 3, 6, 12].map(num => (
                                    <button
                                        key={num}
                                        onClick={() => updateAmount(num)}
                                        style={{
                                            padding: '10px',
                                            flex: 1,
                                            backgroundColor: monthsToPay === num ? 'var(--color-primary)' : '#333',
                                            color: monthsToPay === num ? '#000' : '#fff',
                                            border: 'none',
                                            borderRadius: '4px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {num} Mes{num > 1 ? 'es' : ''}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '5px' }}>Monto Total</label>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(Number(e.target.value))}
                                style={{ width: '100%', padding: '10px', backgroundColor: '#333', border: '1px solid #555', color: '#fff', borderRadius: '4px', fontSize: '1.2rem' }}
                            />
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '5px' }}>Método de Pago</label>
                            <select
                                value={paymentMethod}
                                onChange={(e) => setPaymentMethod(e.target.value)}
                                style={{ width: '100%', padding: '10px', backgroundColor: '#333', border: '1px solid #555', color: '#fff', borderRadius: '4px' }}
                            >
                                <option value="CASH">Efectivo</option>
                                <option value="DEBIT">Tarjeta Débito</option>
                                <option value="TRANSFER">Transferencia</option>
                            </select>
                        </div>

                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                onClick={() => setSelectedMember(null)}
                                style={{ flex: 1, padding: '15px', backgroundColor: '#333', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleConfirmPayment}
                                style={{ flex: 1, padding: '15px', backgroundColor: 'var(--color-primary)', color: '#000', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                            >
                                Confirmar Pago
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {showBookGenerator && (
                <MemberBookGenerator
                    members={members}
                    onClose={() => setShowBookGenerator(false)}
                />
            )}
        </div>
    );
};

const styles = {
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
    modalContent: { backgroundColor: '#1E1E1E', padding: '25px', borderRadius: '8px', width: '400px', maxWidth: '90%', border: '1px solid #333' }
};

export default MembershipPage;
