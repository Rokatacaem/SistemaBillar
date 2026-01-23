import React, { useState, useEffect } from 'react';
import { API_URL } from '../../config';
import { useAuth } from '../../context/AuthContext';

const ReturnExchangeModal = ({ onClose, products, onSuccess }) => {
    const { user } = useAuth();
    const [mode, setMode] = useState('RETURN'); // 'RETURN' or 'EXCHANGE'
    const [loading, setLoading] = useState(false);

    // Return State
    const [returnForm, setReturnForm] = useState({
        productId: '',
        quantity: 1,
        reason: 'WRONG', // WRONG (Restock) | DEFECTIVE (Loss)
        amount: 0,
        method: 'CASH', // CASH | ACCOUNT (if supported)
        userId: '' // Only for Account refund, but maybe too complex for now? Let's keep simple.
    });

    // Exchange State
    const [exchangeForm, setExchangeForm] = useState({
        returnProductId: '',
        newProductId: '',
        quantity: 1,
        userId: '' // Optional for Client Price check or Account diff
    });

    // User Search for Account refunds (Optional polish, maybe skip for MVP and do CASH only first? 
    // Plan said usually CASH. Let's stick to CASH for simplicity unless user requested Account support explicitly. 
    // Plan mentioned Account. Let's add basic User ID input if needed, or just assume Cash for now to match MVP speed).

    // Auto-Calculate Refund Amount
    useEffect(() => {
        if (mode === 'RETURN' && returnForm.productId) {
            const prod = products.find(p => p.id === parseInt(returnForm.productId));
            if (prod) {
                // Default to Client Price. 
                // In a perfect world we'd know what price they paid. Use Client Price as default refund.
                const price = parseInt(prod.price_client);
                setReturnForm(prev => ({ ...prev, amount: price * prev.quantity }));
            }
        }
    }, [returnForm.productId, returnForm.quantity, products, mode]);

    const handleReturnSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/products/return`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...returnForm,
                    productId: parseInt(returnForm.productId),
                    quantity: parseInt(returnForm.quantity),
                    userId: user.id // Admin doing the action
                })
            });
            const data = await res.json();
            if (res.ok) {
                alert('Devolución procesada correctamente');
                onSuccess();
                onClose();
            } else {
                alert(data.error || 'Error al procesar devolución');
            }
        } catch (err) {
            console.error(err);
            alert('Error de conexión');
        } finally {
            setLoading(false);
        }
    };

    const handleExchangeSubmit = async (e) => {
        e.preventDefault();
        if (exchangeForm.returnProductId === exchangeForm.newProductId) {
            alert('El producto a devolver y el nuevo no pueden ser el mismo.');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/products/exchange`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...exchangeForm,
                    returnProductId: parseInt(exchangeForm.returnProductId),
                    newProductId: parseInt(exchangeForm.newProductId),
                    quantity: parseInt(exchangeForm.quantity),
                    userId: user.id // Admin
                })
            });
            const data = await res.json();
            if (res.ok) {
                const diff = data.difference;
                const msg = diff > 0
                    ? `Cambio procesado. Cliente debe PAGAR: $${diff.toLocaleString()}`
                    : diff < 0
                        ? `Cambio procesado. Devolver a Cliente: $${Math.abs(diff).toLocaleString()}`
                        : 'Cambio procesado. Sin diferencia de precio.';
                alert(msg);
                onSuccess();
                onClose();
            } else {
                alert(data.error || 'Error al procesar cambio');
            }
        } catch (err) {
            console.error(err);
            alert('Error de conexión');
        } finally {
            setLoading(false);
        }
    };

    // Calculate Diff for Display in Exchange
    const getExchangeDiff = () => {
        if (!exchangeForm.returnProductId || !exchangeForm.newProductId) return null;
        const oldP = products.find(p => p.id === parseInt(exchangeForm.returnProductId));
        const newP = products.find(p => p.id === parseInt(exchangeForm.newProductId));
        if (!oldP || !newP) return null;

        const oldPrice = parseInt(oldP.price_client);
        const newPrice = parseInt(newP.price_client);
        const diff = (newPrice - oldPrice) * exchangeForm.quantity;
        return diff;
    };

    const exchangeDiff = getExchangeDiff();

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100
        }}>
            <div style={{ backgroundColor: '#1E1E1E', padding: '25px', borderRadius: '8px', width: '500px', border: '1px solid #444', color: '#fff' }}>
                <h2 style={{ color: 'var(--color-primary)', marginTop: 0, marginBottom: '20px', textAlign: 'center' }}>
                    Gestión de Devoluciones
                </h2>

                {/* TABS */}
                <div style={{ display: 'flex', borderBottom: '1px solid #444', marginBottom: '20px' }}>
                    <button
                        onClick={() => setMode('RETURN')}
                        style={{
                            flex: 1, padding: '10px', background: 'none', border: 'none',
                            color: mode === 'RETURN' ? 'var(--color-primary)' : '#888',
                            borderBottom: mode === 'RETURN' ? '2px solid var(--color-primary)' : 'none',
                            cursor: 'pointer', fontWeight: 'bold'
                        }}
                    >
                        Devolución (Dinero)
                    </button>
                    <button
                        onClick={() => setMode('EXCHANGE')}
                        style={{
                            flex: 1, padding: '10px', background: 'none', border: 'none',
                            color: mode === 'EXCHANGE' ? 'var(--color-primary)' : '#888',
                            borderBottom: mode === 'EXCHANGE' ? '2px solid var(--color-primary)' : 'none',
                            cursor: 'pointer', fontWeight: 'bold'
                        }}
                    >
                        Cambio (Producto)
                    </button>
                </div>

                {mode === 'RETURN' ? (
                    <form onSubmit={handleReturnSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '5px', color: '#aaa' }}>Producto devuelto</label>
                            <select
                                className="input-field"
                                value={returnForm.productId}
                                onChange={e => setReturnForm({ ...returnForm, productId: e.target.value })}
                                required
                                style={{ width: '100%' }}
                            >
                                <option value="">Seleccione Producto...</option>
                                {products.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>

                        <div style={{ display: 'flex', gap: '15px' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', marginBottom: '5px', color: '#aaa' }}>Cantidad</label>
                                <input
                                    type="number" className="input-field"
                                    value={returnForm.quantity}
                                    onChange={e => setReturnForm({ ...returnForm, quantity: e.target.value })}
                                    min="1" required
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', marginBottom: '5px', color: '#aaa' }}>Total Reembolso</label>
                                <div className="input-field" style={{ background: '#333', color: '#fff' }}>
                                    ${(returnForm.amount || 0).toLocaleString()}
                                </div>
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '5px', color: '#aaa' }}>Razón</label>
                            <div style={{ display: 'flex', gap: '15px' }}>
                                <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                    <input
                                        type="radio"
                                        name="reason"
                                        value="WRONG"
                                        checked={returnForm.reason === 'WRONG'}
                                        onChange={e => setReturnForm({ ...returnForm, reason: e.target.value })}
                                        style={{ marginRight: '8px' }}
                                    />
                                    Equivocación (Restock)
                                </label>
                                <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#EF5350' }}>
                                    <input
                                        type="radio"
                                        name="reason"
                                        value="DEFECTIVE"
                                        checked={returnForm.reason === 'DEFECTIVE'}
                                        onChange={e => setReturnForm({ ...returnForm, reason: e.target.value })}
                                        style={{ marginRight: '8px' }}
                                    />
                                    Defectuoso (Merma)
                                </label>
                            </div>
                        </div>

                        <div style={{ marginTop: '10px' }}>
                            <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={loading}>
                                {loading ? 'Procesando...' : 'Confirmar Devolución'}
                            </button>
                        </div>
                    </form>
                ) : (
                    <form onSubmit={handleExchangeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '5px', color: '#aaa' }}>Producto Devuelto (Entra)</label>
                            <select
                                className="input-field"
                                value={exchangeForm.returnProductId}
                                onChange={e => setExchangeForm({ ...exchangeForm, returnProductId: e.target.value })}
                                required
                                style={{ width: '100%' }}
                            >
                                <option value="">Seleccione Producto...</option>
                                {products.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '5px', color: '#aaa' }}>Producto Nuevo (Sale)</label>
                            <select
                                className="input-field"
                                value={exchangeForm.newProductId}
                                onChange={e => setExchangeForm({ ...exchangeForm, newProductId: e.target.value })}
                                required
                                style={{ width: '100%' }}
                            >
                                <option value="">Seleccione Producto...</option>
                                {products.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '5px', color: '#aaa' }}>Cantidad</label>
                            <input
                                type="number" className="input-field"
                                value={exchangeForm.quantity}
                                onChange={e => setExchangeForm({ ...exchangeForm, quantity: e.target.value })}
                                min="1" required
                            />
                        </div>

                        {exchangeDiff !== null && (
                            <div style={{
                                padding: '15px', borderRadius: '6px',
                                backgroundColor: exchangeDiff > 0 ? 'rgba(76, 175, 80, 0.1)' : exchangeDiff < 0 ? 'rgba(244, 67, 54, 0.1)' : '#333',
                                border: `1px solid ${exchangeDiff > 0 ? '#4CAF50' : exchangeDiff < 0 ? '#F44336' : '#555'}`,
                                textAlign: 'center'
                            }}>
                                <span style={{ display: 'block', fontSize: '0.9rem', color: '#ccc' }}>Diferencia a Pagar/Devolver:</span>
                                <strong style={{ fontSize: '1.3rem', color: exchangeDiff > 0 ? '#4CAF50' : exchangeDiff < 0 ? '#F44336' : '#fff' }}>
                                    ${exchangeDiff > 0 ? '+' : ''}{exchangeDiff.toLocaleString()}
                                </strong>
                            </div>
                        )}

                        <div style={{ marginTop: '10px' }}>
                            <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={loading}>
                                {loading ? 'Procesando...' : 'Confirmar Cambio'}
                            </button>
                        </div>
                    </form>
                )}

                <button
                    onClick={onClose}
                    style={{
                        marginTop: '15px', width: '100%', background: 'none', border: 'none',
                        color: '#888', cursor: 'pointer', padding: '10px'
                    }}
                >
                    Cancelar
                </button>
            </div>
        </div>
    );
};

export default ReturnExchangeModal;
