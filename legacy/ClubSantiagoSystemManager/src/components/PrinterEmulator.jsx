import React, { useState, useEffect } from 'react';

const PrinterEmulator = () => {
    const [tickets, setTickets] = useState([]);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (window.electronAPI) {
            window.electronAPI.onPrinterEmulate((data) => {
                console.log('Ticket received:', data);
                setTickets((prev) => [data, ...prev]);
                setIsOpen(true);
            });
        }
    }, []);

    if (!isOpen) return null;

    return (
        <div style={styles.overlay}>
            <div style={styles.modal}>
                <div style={styles.header}>
                    <h3>🖨️ Emulador de Impresora Térmica (ESC/POS)</h3>
                    <button onClick={() => setIsOpen(false)} style={styles.closeBtn}>X</button>
                </div>
                <div style={styles.feed}>
                    {tickets.map((ticket, index) => (
                        <div key={index} style={styles.ticket}>
                            <div style={styles.ticketHeader}>
                                <strong>{ticket.type}</strong> - {new Date().toLocaleTimeString()}
                            </div>
                            <pre style={styles.ticketContent}>
                                {JSON.stringify(ticket.data, null, 2)}
                                {/* TODO: Parse ESC/POS commands to HTML if needed */}
                            </pre>
                            <div style={styles.cutLine}>--------------------------------</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const styles = {
    overlay: {
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
    },
    modal: {
        width: '350px', // Typical 80mm width approximation approx
        height: '80vh',
        backgroundColor: '#fff',
        borderRadius: '8px',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'monospace',
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
    },
    header: {
        padding: '10px',
        borderBottom: '1px solid #ccc',
        display: 'flex',
        justifyContent: 'space-between',
        backgroundColor: '#f0f0f0',
        borderTopLeftRadius: '8px',
        borderTopRightRadius: '8px',
    },
    closeBtn: {
        cursor: 'pointer',
        border: 'none',
        background: 'none',
        fontWeight: 'bold',
        fontSize: '16px',
    },
    feed: {
        flex: 1,
        overflowY: 'auto',
        padding: '10px',
        backgroundColor: '#fafafa',
    },
    ticket: {
        backgroundColor: '#fff',
        padding: '15px',
        marginBottom: '20px',
        border: '1px solid #ddd',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
    },
    ticketHeader: {
        textAlign: 'center',
        marginBottom: '10px',
        borderBottom: '1px dashed #999',
        paddingBottom: '5px',
    },
    ticketContent: {
        whiteSpace: 'pre-wrap',
        fontSize: '12px',
    },
    cutLine: {
        textAlign: 'center',
        marginTop: '10px',
        color: '#999',
    }
};

export default PrinterEmulator;
