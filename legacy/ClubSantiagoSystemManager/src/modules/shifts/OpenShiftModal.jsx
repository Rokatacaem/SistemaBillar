import React, { useState } from 'react';
import { API_URL } from '../../config';

const OpenShiftModal = ({ user, onClose, onSuccess }) => {
    const [initialCash, setInitialCash] = useState('');
    const [loading, setLoading] = useState(false);
    const inputRef = React.useRef(null);

    React.useEffect(() => {
        // Small timeout to ensure render is complete and window is ready
        setTimeout(() => {
            inputRef.current?.focus();
        }, 100);
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/shifts/open`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cashier_id: user.id, initial_cash: parseInt(initialCash || 0) })
            });
            if (res.ok) {
                alert('Turno abierto con éxito');
                onSuccess();
            } else {
                alert('Error al abrir turno');
            }
        } catch (err) {
            console.error(err);
            alert('Error de conexión');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.overlay}>
            <div style={styles.content}>
                <h3>Apertura de Caja</h3>
                <form onSubmit={handleSubmit}>
                    <label style={styles.label}>Fondo Inicial (Sencillo)</label>
                    <input
                        type="tel"
                        value={initialCash}
                        onChange={e => setInitialCash(e.target.value.replace(/\D/g, ''))}
                        style={styles.input}
                        placeholder="$0"
                        required
                        ref={inputRef}
                    />
                    <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                        <button type="button" onClick={onClose} style={styles.btnSec} disabled={loading}>Cancelar</button>
                        <button type="submit" style={styles.btnPri} disabled={loading}>
                            {loading ? 'Abriendo...' : 'Confirmar Apertura'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const styles = {
    overlay: {
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
    },
    content: {
        backgroundColor: '#333', padding: '30px', borderRadius: '8px', width: '400px', maxWidth: '90%', color: '#fff'
    },
    input: {
        width: '100%', padding: '12px', backgroundColor: '#222', border: '1px solid #444', color: '#fff', borderRadius: '4px', marginBottom: '10px'
    },
    label: { display: 'block', marginBottom: '5px', color: '#ccc', textAlign: 'left' },
    btnPri: {
        flex: 1, padding: '12px', backgroundColor: 'var(--color-primary)', color: '#000', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold'
    },
    btnSec: {
        flex: 1, padding: '12px', backgroundColor: '#555', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer'
    }
};

export default OpenShiftModal;
