import React, { useState, useRef } from 'react';

const MemberBookGenerator = ({ members, onClose }) => {
    const [filterType, setFilterType] = useState('ALL');
    const [sortBy, setSortBy] = useState('SURNAME');

    // Filter Logic
    const filteredMembers = members.filter(m => {
        if (filterType === 'ALL') return true;
        if (filterType === 'FUNDADOR') return m.type === 'FUNDADOR'; // Or m.type === 'SOCIO' && m.role === ?? User just said "Socios Fundadores"
        // Let's assume user meant the 'FUNDADOR' type I saw in form options
        return m.type === filterType;
    });

    // Helper to guess surname (last word of full name logic, or more complex?)
    // User asked "Ordered by surname".
    const getSurname = (fullName) => {
        if (!fullName) return '';
        const parts = fullName.trim().split(' ');
        if (parts.length === 1) return parts[0];
        if (parts.length === 2) return parts[1]; // First Last
        if (parts.length === 3) return parts[1]; // First Last Mat
        if (parts.length >= 4) return parts[2]; // First Middle Last Mat
        return parts[parts.length - 1]; // Fallback
    };

    // Sort Logic
    const sortedMembers = [...filteredMembers].sort((a, b) => {
        if (sortBy === 'SURNAME') {
            const surnameA = getSurname(a.full_name).toLowerCase();
            const surnameB = getSurname(b.full_name).toLowerCase();
            return surnameA.localeCompare(surnameB);
        }
        if (sortBy === 'DATE') {
            const dateA = new Date(a.incorporation_date || a.created_at || 0);
            const dateB = new Date(b.incorporation_date || b.created_at || 0);
            return dateA - dateB;
        }
        return 0;
    });

    const handlePrint = () => {
        window.print();
    };

    return (
        <div style={styles.overlay}>
            <div style={styles.modal}>
                {/* CONTROLS (Hidden in Print) */}
                <div className="no-print" style={{ borderBottom: '1px solid #333', paddingBottom: '20px', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                        <h2 style={{ margin: 0, color: '#fff' }}>Generador Libro de Socios</h2>
                        <button onClick={onClose} style={styles.closeBtn}>X</button>
                    </div>

                    <div style={{ display: 'flex', gap: '20px' }}>
                        <div>
                            <label style={styles.label}>Filtrar por Tipo:</label>
                            <select value={filterType} onChange={e => setFilterType(e.target.value)} style={styles.select}>
                                <option value="ALL">Todos</option>
                                <option value="FUNDADOR">Socios Fundadores</option>
                                <option value="SOCIO">Socios</option>
                                <option value="CLIENTE">Clientes</option>
                            </select>
                        </div>
                        <div>
                            <label style={styles.label}>Ordenar por:</label>
                            <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={styles.select}>
                                <option value="SURNAME">Apellido Paterno</option>
                                <option value="DATE">Fecha Incorporación</option>
                            </select>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                            <button onClick={handlePrint} style={styles.printBtn}>⎙ Imprimir Libro</button>
                        </div>
                    </div>
                </div>

                {/* PRINTABLE AREA */}
                <div className="printable-area" style={{ backgroundColor: '#fff', color: '#000', padding: '40px', minHeight: '80vh' }}>
                    <h1 style={{ textAlign: 'center', fontSize: '24px', marginBottom: '10px' }}>LIBRO DE SOCIOS</h1>
                    <h3 style={{ textAlign: 'center', fontSize: '16px', marginBottom: '30px', fontWeight: 'normal' }}>
                        CLUB DE BILLAR SANTIAGO — {filterType === 'ALL' ? 'REGISTRO GENERAL' : filterType}
                    </h3>

                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid #000' }}>
                                <th style={styles.th}>N° / RUT</th>
                                <th style={styles.th}>NOMBRE COMPLETO</th>
                                <th style={styles.th}>FECHA INCORPORACIÓN</th>
                                <th style={styles.th}>FIRMA</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedMembers.map((m, idx) => (
                                <tr key={m.id} style={{ borderBottom: '1px solid #ccc', height: '40px' }}>
                                    <td style={styles.td}>{m.rut}</td>
                                    <td style={styles.td}>{m.full_name}</td>
                                    <td style={styles.td}>
                                        {m.incorporation_date
                                            ? new Date(m.incorporation_date).toLocaleDateString()
                                            : (m.created_at ? new Date(m.created_at).toLocaleDateString() : '-')}
                                    </td>
                                    <td style={styles.td}></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div style={{ marginTop: '20px', fontSize: '10px', textAlign: 'right' }}>
                        Generado el: {new Date().toLocaleDateString()}
                    </div>
                </div>
            </div>

            <style>{`
                @media print {
                    .no-print { display: none !important; }
                    .printable-area { 
                        position: absolute; 
                        top: 0; 
                        left: 0; 
                        width: 100%; 
                        margin: 0; 
                        padding: 20px; 
                        background: white !important; 
                        color: black !important;
                    }
                    body { background-color: white !important; }
                    /* Hide other app elements if they are not inside printable-area, but since this is a modal, we might need to hide #root > * except this. 
                       Actually, simplistic approach: overlay covers everything, but print media might capture underlying info?
                       Better: 'position: fixed; top:0; left:0; width:100%; height:100%; z-index: 9999; background: white;' on printable-area.
                    */
                }
            `}</style>
        </div>
    );
};

const styles = {
    overlay: {
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 2000,
        display: 'flex', justifyContent: 'center', setItems: 'center', overflowY: 'auto', padding: '20px'
    },
    modal: {
        backgroundColor: '#222', width: '900px', maxWidth: '100%', borderRadius: '8px', padding: '20px',
        color: '#fff'
    },
    closeBtn: {
        background: 'transparent', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer'
    },
    label: { display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: '#ccc' },
    select: {
        padding: '8px', borderRadius: '4px', border: '1px solid #444', backgroundColor: '#333', color: '#fff'
    },
    printBtn: {
        padding: '8px 16px', backgroundColor: 'var(--color-primary)', color: '#000', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold'
    },
    th: { textAlign: 'left', padding: '8px', fontWeight: 'bold' },
    td: { padding: '8px' }
};

export default MemberBookGenerator;
