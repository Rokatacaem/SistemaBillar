import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../../config';

import { useAuth } from '../../context/AuthContext';

const TablesPage = () => {
    const { user } = useAuth();
    const [tables, setTables] = useState([]);
    const [selectedTable, setSelectedTable] = useState(null);
    const [loading, setLoading] = useState(true);

    // Player Assignment State
    const [users, setUsers] = useState([]);
    const [showPlayerModal, setShowPlayerModal] = useState(false);
    const [selectedPlayers, setSelectedPlayers] = useState([]);

    // Order State
    const [showProductModal, setShowProductModal] = useState(false);
    const [products, setProducts] = useState([]);
    const [sessionItems, setSessionItems] = useState([]);
    const [sessionTotal, setSessionTotal] = useState(0);

    // Payment State
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentMode, setPaymentMode] = useState('SINGLE'); // SINGLE or SPLIT
    const [paymentMethod, setPaymentMethod] = useState('CASH');
    const [payerId, setPayerId] = useState('');
    const [splitPayers, setSplitPayers] = useState([]); // Array of {id, name, type, percentage, method, amount_estimated}
    const [paymentDetails, setPaymentDetails] = useState({ timeCost: 0, consumptionCost: 0, total: 0 });
    const [hourlyRates, setHourlyRates] = useState({ client: 4000, socio: 4000 });

    // Table Management State
    const [showTableModal, setShowTableModal] = useState(false);
    const [tableForm, setTableForm] = useState({ id: null, name: '', type: 'POOL' });

    // Assignment State
    const [showAssignmentModal, setShowAssignmentModal] = useState(false);
    const [pendingProduct, setPendingProduct] = useState(null);

    const fetchTables = async () => {
        try {
            const res = await fetch(`${API_URL}/tables`);
            const data = await res.json();
            if (Array.isArray(data)) {
                setTables(data);
                if (selectedTable) {
                    const updated = data.find(t => t.id === selectedTable.id);
                    if (updated) setSelectedTable(updated);
                }
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            const res = await fetch(`${API_URL}/users`);
            const data = await res.json();
            setUsers(data);
        } catch (err) { console.error(err); }
    };

    const fetchProducts = async () => {
        try {
            const res = await fetch(`${API_URL}/products`);
            const data = await res.json();
            setProducts(data);
        } catch (err) { console.error(err); }
    };

    const handleSaveTable = async (e) => {
        e.preventDefault();
        const method = tableForm.id ? 'PUT' : 'POST';
        const url = tableForm.id ? `${API_URL}/tables/${tableForm.id}` : `${API_URL}/tables`;

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: tableForm.name, type: tableForm.type })
            });
            if (res.ok) {
                alert(tableForm.id ? 'Mesa actualizada' : 'Mesa creada');
                setShowTableModal(false);
                fetchTables();
                setTableForm({ id: null, name: '', type: 'POOL' });
            } else {
                const data = await res.json();
                alert(data.error || 'Error al guardar mesa');
            }
        } catch (err) { console.error(err); }
    };

    const handleEditTable = (e, table) => {
        e.stopPropagation();
        setTableForm({ id: table.id, name: table.name, type: table.type });
        setShowTableModal(true);
    };

    const handleDeleteTable = async (e, tableId) => {
        e.stopPropagation();
        if (!confirm('¿Seguro quieres eliminar esta mesa permanentemente?')) return;

        try {
            const res = await fetch(`${API_URL}/tables/${tableId}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                alert('Mesa eliminada');
                fetchTables();
                if (selectedTable?.id === tableId) setSelectedTable(null);
            } else {
                alert('Error al eliminar');
            }
        } catch (err) { console.error(err); }
    };

    const fetchSessionItems = async (sessionId) => {
        if (!sessionId) return;
        try {
            const res = await fetch(`${API_URL}/sessions/${sessionId}/items`);
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data)) {
                    setSessionItems(data);
                    const total = data.reduce((acc, item) => acc + (parseInt(item.price) * item.quantity), 0);
                    setSessionTotal(total);
                }
            }
        } catch (err) { console.error(err); }
    };

    // Waiting List State
    const [waitingList, setWaitingList] = useState([]);
    const [showWaitingModal, setShowWaitingModal] = useState(false);
    const [waitingGameType, setWaitingGameType] = useState('POOL');

    useEffect(() => {
        fetchTables();
        fetchUsers();
        fetchProducts();
        fetchWaitingList();
        const interval = setInterval(() => {
            fetchTables();
            fetchWaitingList();
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    const fetchWaitingList = async () => {
        try {
            const res = await fetch(`${API_URL}/waiting-list`);
            if (res.ok) setWaitingList(await res.json());
        } catch (e) {
            console.error(e);
        }
    };

    const handleAddToWaitlist = async (userId) => {
        try {
            const res = await fetch(`${API_URL}/waiting-list`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: userId, game_type: waitingGameType })
            });
            if (res.ok) {
                alert('Agregado a lista de espera');
                setShowWaitingModal(false);
                setPlayerSearch('');
                setSelectedPlayers([]);
                fetchWaitingList();
            } else {
                const data = await res.json();
                alert(data.error);
            }
        } catch (e) { alert('Error de conexión'); }
    };

    const handleRemoveWaitlist = async (id) => {
        if (!confirm('¿Eliminar de lista de espera?')) return;
        try {
            await fetch(`${API_URL}/waiting-list/${id}`, { method: 'DELETE' });
            fetchWaitingList();
        } catch (e) { console.error(e); }
    };

    // Add Player to Active Cards Session
    const handleAddPlayerToSession = async (tableId, user) => {
        try {
            const res = await fetch(`${API_URL}/sessions/${selectedTable.current_session_id}/players`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: user.id, full_name: user.full_name, full_nameShort: user.full_name })
            });
            if (res.ok) {
                fetchTables();
                setShowPlayerModal(false);
            }
        } catch (e) { console.error(e); }
    };

    const handleEndPlayer = async (e, sessionId, userId) => {
        e.stopPropagation();
        if (!confirm('¿Finalizar tiempo de este jugador? Se cobrará el monto acumulado hasta ahora.')) return;
        try {
            const res = await fetch(`${API_URL}/sessions/${sessionId}/players/${userId}/end`, { method: 'POST' });
            if (res.ok) {
                const data = await res.json();
                alert(`Jugador finalizado. Costo: $${data.cost.toLocaleString('es-CL')}`);
                fetchTables();
            } else {
                const err = await res.json();
                alert('Error al finalizar jugador: ' + err.error);
            }
        } catch (e) {
            console.error(e);
            alert('Error de conexión al finalizar jugador');
        }
    };

    // Refresh items when selected table changes
    useEffect(() => {
        if (selectedTable && selectedTable.current_session_id) {
            fetchSessionItems(selectedTable.current_session_id);
        } else {
            setSessionItems([]);
            setSessionTotal(0);
        }
    }, [selectedTable]);

    // Open Modal instead of direct action
    const handleOpenTableClick = () => {
        setSelectedPlayers([]);
        setShowPlayerModal(true);
    };

    const confirmOpenTable = async (trainingMode = false) => {
        if (selectedPlayers.length === 0) {
            if (!confirm('¿Abrir mesa sin jugadores asignados?')) return;
        }

        try {
            await fetch(`${API_URL}/sessions/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    table_id: selectedTable.id,
                    players: selectedPlayers,
                    is_training: trainingMode
                })
            });
            setShowPlayerModal(false);
            setSelectedPlayers([]);
            setIsTraining(false);
            fetchTables();
        } catch (err) {
            alert('Error al abrir mesa');
        }
    };

    const handleCloseTable = async () => {
        if (!selectedTable) return;

        // Fetch product rates
        try {
            const pRes = await fetch(`${API_URL}/products`);
            const prodsData = await pRes.json();
            const timeProd = Array.isArray(prodsData) ? (prodsData.find(p => p.name.toLowerCase().includes('hora')) || { price_client: 4000, price_socio: 4000 }) : { price_client: 4000, price_socio: 4000 };
            const rates = { client: parseFloat(timeProd.price_client), socio: parseFloat(timeProd.price_socio) };
            setHourlyRates(rates);

            // Calculate provisional costs for UI
            const start = new Date(selectedTable.start_time).getTime();
            const now = new Date().getTime();
            let timeCost = 0;
            let h = 0;

            if (selectedTable.type === 'CARDS') {
                // Sum individual players
                let players = [];
                try { players = typeof selectedTable.players === 'string' ? JSON.parse(selectedTable.players) : selectedTable.players; } catch (e) { }

                if (Array.isArray(players)) {
                    players.forEach(p => {
                        // If player ended (endedAt present), they are already charged/settled. Skip them for the "Close Table" bill.
                        if (p.endedAt) return;

                        const pStart = p.startAt ? new Date(p.startAt).getTime() : start; // fallback to session start
                        const pEnd = now;
                        const dur = pEnd - pStart;
                        const durationH = dur / 3600000;

                        // Estimate Rate (Frontend guess, Backend is authoritative)
                        const u = users.find(u => u.id === p.id);
                        const isSocio = p.type === 'SOCIO' || (u && u.type === 'SOCIO');
                        const isFundadorActive = (p.type === 'FUNDADOR' || (u && u.type === 'FUNDADOR')) && (p.status === 'ACTIVE' || (u && u.status === 'ACTIVE'));

                        let pRate = (isSocio || isFundadorActive) ? rates.socio : rates.client;
                        if (selectedTable.is_training) pRate = pRate * 0.5;

                        timeCost += Math.ceil(durationH * pRate);
                    });
                }
                h = 0; // Not used for cards global duration
            } else {
                // POOL Standard
                const ms = now - start;
                h = ms / 3600000;
                timeCost = Math.ceil(h * rates.client);
            }

            setPaymentDetails({
                timeCost: timeCost,
                consumptionCost: sessionTotal,
                total: timeCost + sessionTotal,
                durationHours: h
            });
            setPayerId(''); // Reset payer
            setPaymentMethod('CASH');
            setPaymentMode('SINGLE');

            // Init Split Payers with Session Players
            let initialSplit = [];
            try {
                const players = typeof selectedTable.players === 'string' ? JSON.parse(selectedTable.players || '[]') : selectedTable.players || [];
                if (Array.isArray(players)) {
                    initialSplit = players.map(p => {
                        const foundUser = users.find(u => u.id === p.id);
                        return {
                            id: p.id,
                            name: foundUser ? foundUser.full_name : (p.full_name || p.name),
                            type: foundUser ? foundUser.type : (p.type || 'CLIENTE'),
                            percentage: 0,
                            method: 'ACCOUNT' // Always ACCOUNT for split in Tables
                        };
                    });
                }
            } catch (e) { console.error('Error parsing players', e); }

            // If empty, add at least one generic
            if (initialSplit.length === 0) {
                initialSplit.push({ id: null, name: 'Anónimo 1', type: 'CLIENTE', percentage: 0, method: 'ACCOUNT' });
            }

            // Auto distribute percentage
            const evenPct = Math.floor(100 / initialSplit.length);
            const remainder = 100 - (evenPct * initialSplit.length);
            initialSplit.forEach((p, idx) => {
                p.percentage = evenPct + (idx === 0 ? remainder : 0);
            });

            setSplitPayers(initialSplit);
            setShowPaymentModal(true);
        } catch (err) { console.error(err); }
    };

    const calculateSplitEstimates = () => {
        return splitPayers.map(p => {
            const isSocio = p.type === 'SOCIO';
            const isFundadorActive = p.type === 'FUNDADOR' && p.status === 'ACTIVE';
            let rate = (isSocio || isFundadorActive) ? hourlyRates.socio : hourlyRates.client;

            if (selectedTable.is_training) rate = rate * 0.5;

            const pct = parseFloat(p.percentage) || 0;
            const timeCost = Math.ceil(paymentDetails.durationHours * (pct / 100) * rate);
            const consumptionCost = Math.ceil(paymentDetails.consumptionCost * (pct / 100));
            return {
                ...p,
                amount_estimated: timeCost + consumptionCost
            };
        });
    };

    const splitEstimates = calculateSplitEstimates();
    const grandTotalSplit = splitEstimates.reduce((s, p) => s + p.amount_estimated, 0);

    const confirmCloseTable = async () => {
        if (paymentMode === 'SPLIT') {
            const totalPerc = splitPayers.reduce((s, p) => s + parseFloat(p.percentage), 0);
            if (Math.abs(totalPerc - 100) > 0.1) {
                alert(`El total de porcentajes debe ser 100% (Actual: ${totalPerc}%)`);
                return;
            }
        }

        try {
            const payload = {
                table_id: selectedTable.id,
                type: paymentMode
            };

            if (paymentMode === 'SINGLE') {
                payload.paymentMethod = paymentMethod;
                payload.payerId = payerId || null;
            } else {
                payload.payments = splitPayers.map(p => ({
                    payerId: p.id,
                    percentage: parseFloat(p.percentage),
                    method: 'ACCOUNT' // Force ACCOUNT for split payments
                }));
            }

            const res = await fetch(`${API_URL}/sessions/end`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setShowPaymentModal(false);
                fetchTables();
            } else {
                const err = await res.json();
                alert('Error: ' + err.error);
            }
        } catch (err) { alert('Error al procesar pago'); }
    };

    const handleAddProduct = (product) => {
        if (!selectedTable || !selectedTable.current_session_id) return;

        // Check if table has players
        let tablePlayers = [];
        try {
            if (selectedTable.players) {
                tablePlayers = (typeof selectedTable.players === 'string')
                    ? JSON.parse(selectedTable.players)
                    : selectedTable.players;
            }
        } catch (e) { console.error('Error parsing players', e); }

        if (tablePlayers && tablePlayers.length > 0) {
            // Open Assignment Modal
            setPendingProduct(product);
            setShowProductModal(false);
            setShowAssignmentModal(true);
        } else {
            // Direct Add to Table
            executeAddProduct(product, null, null);
        }
    };

    const executeAddProduct = async (product, assignedToId, assignedToName) => {
        // simplified for now: use price_client
        const price = product.price_client;
        try {
            const res = await fetch(`${API_URL}/sessions/${selectedTable.current_session_id}/items`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    product_id: product.id,
                    product_name: product.name,
                    price: price,
                    quantity: 1,
                    assigned_to: assignedToId,
                    assigned_name: assignedToName
                })
            });

            if (res.ok) {
                setShowProductModal(false);
                setShowAssignmentModal(false);
                setPendingProduct(null);
                fetchSessionItems(selectedTable.current_session_id);
            } else {
                const data = await res.json();
                alert('Error: ' + (data.error || 'Error al agregar producto'));
            }
        } catch (err) {
            console.error(err);
            alert('Error de conexión');
        }
    };

    const togglePlayerSelection = (user) => {
        if (selectedPlayers.find(p => p.id === user.id)) {
            setSelectedPlayers(selectedPlayers.filter(p => p.id !== user.id));
        } else {
            setSelectedPlayers([...selectedPlayers, user]);
        }
    };

    const renderTablePlayers = (table) => {
        if (!table.players || table.players.length === 0) return 'Sin asignar';
        // Handle postgres array vs string
        let players = table.players;
        if (typeof players === 'string') {
            try { players = JSON.parse(players); } catch (e) { return 'Error datos'; }
        }
        if (!Array.isArray(players) || players.length === 0) return 'Sin Asignar';
        return players.map(p => p.full_name).join(', ');
    };

    const getTableStyle = (table) => {
        const isOccupied = table.status === 'OCCUPIED';
        let baseColor = '#252525';
        let shapeStyle = {};

        switch (table.type) {
            case 'CARDS':
                baseColor = '#2E7D32'; // Green
                shapeStyle = { clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)', aspectRatio: '1/1' }; // Octagon
                break;
            case 'CARAMBOLA':
                baseColor = '#4FC3F7'; // Light Blue
                break;
            case 'POOL_CHILENO':
                baseColor = '#1B5E20'; // Dark Green
                break;
            case '9BALL':
                baseColor = '#81C784'; // Light Green
                break;
            default:
                baseColor = '#252525';
        }

        if (isOccupied) {
            // When occupied, we might want to keep the color but make it brighter or indicate status differently?
            // User request implied the tables "are" these colors. 
            // Current login uses var(--color-primary) for occupied.
            // Let's mix: If occupied, use the color but maybe add a border or glow.
            // OR: Follow previous pattern: Occupied = Highlight.
            // BUT: The specific colors requested (Light Blue, Dark Green) sound like the "felt" color.
            // So they should probably be visible ALWAYS, maybe dimmer when available?
            // "Las Mesas de Billar que sean Azul claro" -> This is likely the felt color.

            // Re-evaluating: The request is about the physical appearance.
            // Strategy: Use the requested color as the specific background. 
            // Occupied status to be shown via border/glow or overlay text.
            return {
                backgroundColor: baseColor,
                color: '#fff', // Always white text on colored backgrounds? Light blue might need dark text.
                ...shapeStyle,
                border: isOccupied ? '4px solid #FFD700' : '2px solid transparent', // Gold border for active
                boxShadow: isOccupied ? '0 0 15px rgba(255, 215, 0, 0.5)' : 'none'
            };
        }

        // Available State
        return {
            backgroundColor: baseColor,
            color: '#fff',
            ...shapeStyle,
            opacity: 0.8 // Slightly dimmer when not in use
        };
    };

    const [selectedType, setSelectedType] = useState('ALL');
    const [isTraining, setIsTraining] = useState(false); // New State

    const uniqueTypes = ['ALL', ...new Set(tables.map(t => t.type))];

    const filteredTables = (selectedType === 'ALL'
        ? tables
        : tables.filter(t => t.type === selectedType)).sort((a, b) => {
            // Force CARDS to the bottom
            if (a.type === 'CARDS' && b.type !== 'CARDS') return 1;
            if (a.type !== 'CARDS' && b.type === 'CARDS') return -1;
            return a.id - b.id;
        });

    const getTypeLabel = (type) => {
        switch (type) {
            case 'CARAMBOLA': return 'BILLAR';
            case 'POOL_CHILENO': return 'POOL CHILENO';
            case '9BALL': return 'BOLA 9';
            case 'CARDS': return 'CARTAS';
            case 'POOL': return 'POOL';
            default: return type;
        }
    };

    const [playerSearch, setPlayerSearch] = useState('');

    const filteredUsers = users.filter(u =>
        u.full_name.toLowerCase().includes(playerSearch.toLowerCase()) ||
        u.rut.includes(playerSearch) ||
        (u.type && u.type.toLowerCase().includes(playerSearch.toLowerCase()))
    );

    return (
        <div style={styles.container}>
            {/* ... Left Panel Code ... */}
            <div style={styles.leftPanel}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h2 style={{ margin: 0, color: '#fff' }}>Mesas (Rol: {user?.role || 'Sin Rol'})</h2>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                            onClick={() => setShowWaitingModal(true)}
                            style={{ padding: '8px 16px', backgroundColor: '#9C27B0', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                            📋 Lista de Espera ({waitingList.length})
                        </button>
                        {(user?.role === 'ADMIN' || true) && (
                            <button
                                onClick={() => {
                                    setTableForm({ id: null, name: '', type: 'POOL' });
                                    setShowTableModal(true);
                                }}
                                style={{ padding: '8px 16px', backgroundColor: '#FF9800', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                            >
                                + Nueva Mesa
                            </button>
                        )}
                    </div>
                </div>
                <div style={styles.filterBar}>
                    {uniqueTypes.map(type => (
                        <button
                            key={type}
                            onClick={() => setSelectedType(type)}
                            style={selectedType === type ? styles.filterBtnActive : styles.filterBtn}
                        >
                            {getTypeLabel(type)}
                        </button>
                    ))}
                </div>

                {loading ? <p style={{ color: '#fff', padding: '20px' }}>Cargando mesas...</p> : (
                    <div style={styles.grid}>
                        {filteredTables.map(table => (
                            <div
                                key={table.id}
                                onClick={() => setSelectedTable(table)}
                                style={{
                                    ...styles.card,
                                    borderColor: selectedTable?.id === table.id ? '#fff' : 'transparent',
                                    ...getTableStyle(table),
                                    // Flex centering for CARDS to avoid clipping
                                    ...(table.type === 'CARDS' ? { display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' } : {})
                                }}
                            >
                                <div style={{
                                    display: 'flex',
                                    justifyContent: table.type === 'CARDS' ? 'center' : 'space-between',
                                    marginBottom: '10px',
                                    flexDirection: table.type === 'CARDS' ? 'column' : 'row',
                                    alignItems: 'center',
                                    width: '100%',
                                    position: 'relative'
                                }}>
                                    <span style={{ fontWeight: 'bold' }}>{table.name}</span>
                                    {(user?.role === 'ADMIN' || user?.role === 'SUPERUSER') && table.status !== 'OCCUPIED' && (
                                        <div style={{ position: 'absolute', right: 0, top: -5, display: 'flex', gap: '5px' }}>
                                            <button
                                                onClick={(e) => handleEditTable(e, table)}
                                                style={{ background: '#2196F3', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                title="Editar Mesa"
                                            >
                                                ✎
                                            </button>
                                            <button
                                                onClick={(e) => handleDeleteTable(e, table.id)}
                                                style={{ background: 'red', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                title="Eliminar Mesa"
                                            >
                                                X
                                            </button>
                                        </div>
                                    )}
                                    <span style={{ fontSize: '0.7em', opacity: 0.7 }}>{getTypeLabel(table.type)}</span>
                                </div>
                                <div style={{ fontSize: '1.5rem', fontFamily: 'monospace', fontWeight: 'bold', textAlign: 'center', width: '100%' }}>
                                    {table.status === 'OCCUPIED' ? <Timer startTime={table.start_time} darkText={true} /> : '--:--'}
                                </div>
                                <div style={{ fontSize: '0.75rem', marginTop: '10px', textAlign: 'center', opacity: 0.8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>
                                    {table.status === 'OCCUPIED' ? renderTablePlayers(table) : 'Disponible'}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Right Panel */}
            <div style={styles.rightPanel}>
                {selectedTable ? (
                    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                        <div style={styles.panelHeader}>
                            <h3 style={{ margin: 0 }}>{selectedTable.name}</h3>
                            <span style={{ fontSize: '0.8rem', padding: '2px 6px', borderRadius: '4px', background: selectedTable.status === 'OCCUPIED' ? 'var(--color-primary)' : '#444', color: selectedTable.status === 'OCCUPIED' ? '#000' : '#fff' }}>
                                {selectedTable.status === 'OCCUPIED' ? 'EN USO' : 'DISPONIBLE'}
                            </span>
                        </div>

                        {/* Start View */}
                        {selectedTable.status !== 'OCCUPIED' && (
                            <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                                <p style={{ color: '#888', textAlign: 'center' }}>Mesa lista para jugar.</p>
                                <button onClick={handleOpenTableClick} style={styles.btnMainAction}>ABRIR MESA</button>
                            </div>
                        )}

                        {/* Occupied View */}
                        {selectedTable.status === 'OCCUPIED' && (
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                {/* Info Area */}
                                <div style={{ padding: '15px', textAlign: 'center', borderBottom: '1px solid #333', backgroundColor: '#222' }}>
                                    {selectedTable.type === 'CARDS' ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            {/* Cards Header: Total so far? */}
                                            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>Mesa de Cartas</div>

                                            {/* Players List with Timers */}
                                            <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                                                {(() => {
                                                    let players = [];
                                                    try { players = typeof selectedTable.players === 'string' ? JSON.parse(selectedTable.players) : selectedTable.players; } catch (e) { }
                                                    return players && players.map((p, idx) => (
                                                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px', borderBottom: '1px solid #444' }}>
                                                            <div style={{ textAlign: 'left' }}>
                                                                <div style={{ fontWeight: 'bold', color: '#fff' }}>{p.full_name || p.name}</div>
                                                                <div style={{ fontSize: '0.9rem', color: 'gold' }}>
                                                                    <Timer startTime={p.startAt || selectedTable.start_time} />
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <button
                                                                    onClick={(e) => handleEndPlayer(e, selectedTable.current_session_id, p.id)}
                                                                    style={{ padding: '2px 6px', background: 'red', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7em' }}
                                                                >
                                                                    F.
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ));
                                                })()}
                                            </div>

                                            <button
                                                onClick={() => { setSelectedPlayers([]); setShowPlayerModal(true); /* Reuse modal for adding logic? Need differentiation */ }}
                                                style={{ padding: '5px', background: '#333', color: '#fff', border: '1px dashed #666', borderRadius: '4px', cursor: 'pointer', marginTop: '5px' }}
                                            >
                                                + Agregar Jugador
                                            </button>

                                        </div>
                                    ) : (
                                        <>
                                            <div style={{ fontSize: '2.5rem', fontFamily: 'monospace', fontWeight: 'bold', color: 'var(--color-primary)' }}>
                                                <Timer startTime={selectedTable.start_time} />
                                            </div>
                                            <div style={{ fontSize: '0.9rem', color: '#aaa', marginBottom: '5px' }}>
                                                {renderTablePlayers(selectedTable)}
                                            </div>
                                        </>
                                    )}

                                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#fff', marginTop: '10px' }}>
                                        Total Consumo: ${(sessionTotal).toLocaleString('es-CL')}
                                    </div>
                                </div>

                                {/* Products List */}
                                <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
                                    {sessionItems.length === 0 ? (
                                        <div style={{ textAlign: 'center', color: '#555', marginTop: '20px' }}>Sin consumo</div>
                                    ) : (
                                        <table style={{ width: '100%', fontSize: '0.9rem', color: '#ddd' }}>
                                            <tbody>
                                                {sessionItems.map(item => (
                                                    <tr key={item.id} style={{ borderBottom: '1px solid #333' }}>
                                                        <td style={{ padding: '8px' }}>{item.quantity}x</td>
                                                        <td style={{ padding: '8px' }}>
                                                            {item.product_name}
                                                            {item.assigned_name && (
                                                                <span style={{ display: 'block', fontSize: '0.75rem', color: '#888', fontStyle: 'italic' }}>
                                                                    ({item.assigned_name})
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td style={{ padding: '8px', textAlign: 'right' }}>${parseInt(item.price).toLocaleString('es-CL')}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                                {/* ... Buttons ... */}
                                <div style={{ padding: '10px' }}>
                                    <button onClick={() => setShowProductModal(true)} style={styles.btnActionSecondary}>+ AGREGAR CONSUMO</button>
                                </div>

                                <div style={{ padding: '20px', borderTop: '1px solid #333' }}>
                                    <button onClick={handleCloseTable} style={{ ...styles.btnMainAction, backgroundColor: '#EF5350', color: '#fff' }}>
                                        COBRAR Y CERRAR
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#666' }}>Seleccione una mesa</div>
                )}
            </div>

            {/* PLAYER MODAL */}
            {showPlayerModal && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContent}>
                        <h3>Seleccionar Jugadores</h3>
                        <input
                            type="text"
                            placeholder="Buscar jugador..."
                            value={playerSearch}
                            onChange={(e) => setPlayerSearch(e.target.value)}
                            style={{ width: '100%', padding: '10px', marginBottom: '10px', backgroundColor: '#222', color: '#fff', border: '1px solid #444', borderRadius: '4px' }}
                            autoFocus
                        />

                        {/* Training Mode Toggle */}
                        {selectedPlayers.length === 1 && (
                            <div style={{ marginBottom: '10px', padding: '10px', backgroundColor: '#333', borderRadius: '4px', display: 'flex', alignItems: 'center' }}>
                                <input
                                    type="checkbox"
                                    id="trainingMode"
                                    checked={isTraining}
                                    onChange={(e) => setIsTraining(e.target.checked)}
                                    disabled={(() => {
                                        const user = selectedPlayers[0];
                                        const isFundadorActive = user.type === 'FUNDADOR' && user.status === 'ACTIVE';
                                        const isSocio = user.type === 'SOCIO';
                                        return !(isSocio || isFundadorActive);
                                    })()}
                                    style={{ marginRight: '10px', transform: 'scale(1.2)' }}
                                />
                                <label htmlFor="trainingMode" style={{ cursor: 'pointer', color: '#fff', fontSize: '0.9rem' }}>
                                    Modo Entrenamiento (50% Descuento)
                                    <div style={{ fontSize: '0.75rem', color: '#aaa' }}>Solo para Socios/Fundadores Activos sin compañeros.</div>
                                </label>
                            </div>
                        )}

                        <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #333', borderRadius: '4px', marginBottom: '20px' }}>
                            <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #333', borderRadius: '4px', marginBottom: '20px' }}>
                                {filteredUsers.map(u => (
                                    <div
                                        key={u.id}
                                        onClick={() => togglePlayerSelection(u)}
                                        style={{
                                            padding: '10px',
                                            borderBottom: '1px solid #333',
                                            cursor: 'pointer',
                                            backgroundColor: selectedPlayers.find(p => p.id === u.id) ? 'rgba(76, 175, 80, 0.2)' : 'transparent'
                                        }}
                                    >
                                        <div style={{ fontWeight: 'bold' }}>{u.full_name}</div>
                                        <div style={{ fontSize: '0.8rem', color: '#888' }}>{u.rut} - {u.type}</div>
                                    </div>
                                ))}
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button onClick={() => { setShowPlayerModal(false); setPlayerSearch(''); }} style={styles.btnActionSecondary}>Cancelar</button>
                                <button
                                    onClick={() => {
                                        if (selectedTable && selectedTable.status === 'OCCUPIED') {
                                            // Adding a single player (take the last one selected)
                                            if (selectedPlayers.length > 0) {
                                                handleAddPlayerToSession(selectedTable.id, selectedPlayers[selectedPlayers.length - 1]);
                                            }
                                        } else {
                                            confirmOpenTable(isTraining); // Pass training flag
                                        }
                                    }}
                                    style={styles.btnMainAction}
                                >
                                    {selectedTable && selectedTable.status === 'OCCUPIED' ? 'Agregar Jugador' : 'Confirmar Inicio'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* PRODUCT MODAL */}
            {
                showProductModal && (
                    <div style={styles.modalOverlay}>
                        <div style={styles.modalContent}>
                            <h3>Agregar Producto</h3>
                            <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #333', borderRadius: '4px', marginBottom: '20px' }}>
                                {products.filter(p => !p.name.toLowerCase().includes('hora de juego')).map(p => (
                                    <div
                                        key={p.id}
                                        onClick={() => handleAddProduct(p)}
                                        style={{
                                            padding: '10px',
                                            borderBottom: '1px solid #333',
                                            cursor: 'pointer',
                                            display: 'flex', justifyContent: 'space-between',
                                            '&:hover': { backgroundColor: '#333' }
                                        }}
                                    >
                                        <div>
                                            <div style={{ fontWeight: 'bold' }}>{p.name}</div>
                                            <div style={{ fontSize: '0.8rem', color: '#888' }}>Stock: {p.stock}</div>
                                        </div>
                                        <div style={{ fontWeight: 'bold', color: 'var(--color-primary)' }}>
                                            ${parseInt(p.price_client).toLocaleString('es-CL')}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <button onClick={() => setShowProductModal(false)} style={styles.btnActionSecondary}>Cancelar</button>
                        </div>
                    </div>
                )
            }

            {/* PAYMENT MODAL */}
            {
                showPaymentModal && (
                    <div style={styles.modalOverlay}>
                        <div style={styles.modalContent}>
                            <h3>Cerrar Mesa y Cobrar</h3>

                            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                                <button onClick={() => setPaymentMode('SINGLE')} style={{ flex: 1, padding: '10px', background: paymentMode === 'SINGLE' ? 'var(--color-primary)' : '#333', color: paymentMode === 'SINGLE' ? '#000' : '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Pago Único</button>
                                <button onClick={() => setPaymentMode('SPLIT')} style={{ flex: 1, padding: '10px', background: paymentMode === 'SPLIT' ? 'var(--color-primary)' : '#333', color: paymentMode === 'SPLIT' ? '#000' : '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Pago Dividido</button>
                            </div>

                            {paymentMode === 'SINGLE' ? (
                                <>
                                    <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#333', borderRadius: '4px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                            <span>Tiempo de Juego:</span>
                                            <span>${paymentDetails.timeCost.toLocaleString('es-CL')}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                            <span>Consumo:</span>
                                            <span>${paymentDetails.consumptionCost.toLocaleString('es-CL')}</span>
                                        </div>
                                        <div style={{ borderTop: '1px solid #555', marginTop: '10px', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--color-primary)' }}>
                                            <span>TOTAL A PAGAR:</span>
                                            <span>${paymentDetails.total.toLocaleString('es-CL')}</span>
                                        </div>
                                    </div>

                                    <div style={{ marginBottom: '20px' }}>
                                        <label style={{ display: 'block', marginBottom: '5px' }}>Método de Pago</label>
                                        <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} style={{ width: '100%', padding: '10px', backgroundColor: '#222', color: '#fff', border: '1px solid #555', marginBottom: '10px' }}>
                                            <option value="CASH">Efectivo</option>
                                            <option value="DEBIT">Tarjeta Débito/Crédito</option>
                                            <option value="TRANSFER">Transferencia</option>
                                            <option value="ACCOUNT">Cargar a Cuenta</option>
                                        </select>

                                        {paymentMethod === 'ACCOUNT' && (
                                            <>
                                                <p style={{ fontSize: '0.9rem', color: '#aaa', fontStyle: 'italic', marginBottom: '5px' }}>
                                                    Se asignará como deuda al cliente seleccionado.
                                                </p>
                                                <select
                                                    value={payerId}
                                                    onChange={e => setPayerId(e.target.value)}
                                                    style={{ width: '100%', padding: '12px', backgroundColor: '#222', color: '#fff', border: '1px solid #555', fontSize: '1rem' }}
                                                >
                                                    <option value="">-- Seleccionar Cliente --</option>
                                                    {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                                                </select>
                                            </>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div style={{ marginBottom: '20px' }}>
                                    <div style={{ marginBottom: '10px', textAlign: 'right', fontWeight: 'bold' }}>
                                        Total Dividido: ${grandTotalSplit.toLocaleString('es-CL')}
                                    </div>
                                    <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                                        <table style={{ width: '100%', fontSize: '0.85rem', color: '#ddd' }}>
                                            <thead>
                                                <tr>
                                                    <th>Jugador (Se asignará a cuenta)</th>
                                                    <th style={{ width: '50px' }}>%</th>
                                                    <th>Total a Deuda</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {splitPayers.map((payer, idx) => (
                                                    <tr key={idx}>
                                                        <td>
                                                            <select
                                                                value={payer.id || ''}
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    const u = users.find(u => u.id == val);
                                                                    const updated = [...splitPayers];
                                                                    updated[idx].id = u ? u.id : null;
                                                                    updated[idx].name = u ? u.full_name : 'Anónimo';
                                                                    updated[idx].type = u ? u.type : 'CLIENTE';
                                                                    setSplitPayers(updated);
                                                                }}
                                                                style={{ background: '#222', color: '#fff', border: 'none', width: '100%' }}
                                                            >
                                                                <option value="">Anónimo</option>
                                                                {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                                                            </select>
                                                            <div style={{ fontSize: '0.75rem', color: payer.type === 'SOCIO' ? 'gold' : '#888' }}>{payer.type}</div>
                                                        </td>
                                                        <td>
                                                            <input
                                                                type="number"
                                                                value={payer.percentage}
                                                                onChange={(e) => {
                                                                    const updated = [...splitPayers];
                                                                    updated[idx].percentage = e.target.value;
                                                                    setSplitPayers(updated);
                                                                }}
                                                                style={{ width: '45px', background: '#333', color: '#fff', border: '1px solid #555' }}
                                                            />
                                                        </td>
                                                        <td>${(splitEstimates[idx].amount_estimated).toLocaleString('es-CL')}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <button onClick={() => setSplitPayers([...splitPayers, { id: null, name: 'Otro', type: 'CLIENTE', percentage: 0, method: 'ACCOUNT' }])} style={{ marginTop: '10px', fontSize: '0.8rem', background: 'none', border: '1px dashed #555', color: '#aaa', cursor: 'pointer', width: '100%' }}>+ Agregar Pagador</button>
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                                <button onClick={() => setShowPaymentModal(false)} style={styles.btnActionSecondary}>Cancelar</button>
                                <button
                                    onClick={confirmCloseTable}
                                    style={styles.btnMainAction}
                                >
                                    {paymentMode === 'SINGLE' ? 'CONFIRMAR Y CERRAR' : 'ASIGNAR DEUDAS Y CERRAR'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* ASSIGNMENT MODAL */}
            {
                showAssignmentModal && pendingProduct && (
                    <div style={styles.modalOverlay}>
                        <div style={styles.modalContent}>
                            <h3>¿A quién asignar {pendingProduct.name}?</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                                <button
                                    onClick={() => executeAddProduct(pendingProduct, null, null)}
                                    style={{ ...styles.btnActionSecondary, padding: '15px', fontWeight: 'bold' }}
                                >
                                    A LA MESA (GENERAL)
                                </button>

                                <hr style={{ width: '100%', borderColor: '#444' }} />

                                {(() => {
                                    let players = [];
                                    try {
                                        players = (typeof selectedTable.players === 'string')
                                            ? JSON.parse(selectedTable.players)
                                            : selectedTable.players;
                                    } catch (e) { }

                                    return players.map(p => (
                                        <button
                                            key={p.id}
                                            onClick={() => executeAddProduct(pendingProduct, p.id, p.full_name)}
                                            style={styles.btnActionSecondary}
                                        >
                                            👤 {p.full_nameShort || p.full_name}
                                        </button>
                                    ));
                                })()}
                            </div>
                            <button onClick={() => { setShowAssignmentModal(false); setPendingProduct(null); }} style={styles.btnActionSecondary}>Cancelar</button>
                        </div>
                    </div>
                )
            }
            {/* TABLE MANAGEMENT MODAL */}
            {
                showTableModal && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
                    }}>
                        <div style={{ backgroundColor: '#333', padding: '30px', borderRadius: '8px', width: '400px', maxWidth: '90%', color: '#fff' }}>
                            <h3>{tableForm.id ? 'Editar Mesa' : 'Nueva Mesa'}</h3>
                            <form onSubmit={handleSaveTable} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '5px' }}>Nombre de la Mesa</label>
                                    <input
                                        type="text"
                                        value={tableForm.name}
                                        onChange={e => setTableForm({ ...tableForm, name: e.target.value })}
                                        style={{ width: '100%', padding: '10px', backgroundColor: '#222', color: '#fff', border: '1px solid #444' }}
                                        required
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '5px' }}>Tipo</label>
                                    <select
                                        value={tableForm.type}
                                        onChange={e => setTableForm({ ...tableForm, type: e.target.value })}
                                        style={{ width: '100%', padding: '10px', backgroundColor: '#222', color: '#fff', border: '1px solid #444' }}
                                    >
                                        <option value="POOL">Pool</option>
                                        <option value="CARAMBOLA">Carambola</option>
                                        <option value="POOL_CHILENO">Pool Chileno</option>
                                        <option value="9BALL">Bola 9</option>
                                        <option value="CARDS">Cartas/Domino</option>
                                        <option value="SNOOKER">Snooker</option>
                                    </select>
                                </div>
                                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                    <button type="button" onClick={() => setShowTableModal(false)} style={{ flex: 1, padding: '10px', backgroundColor: '#555', color: '#fff', border: 'none', cursor: 'pointer' }}>Cancelar</button>
                                    <button type="submit" style={{ flex: 1, padding: '10px', backgroundColor: '#FF9800', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>Guardar</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
            {/* WAITING LIST MODAL */}
            {
                showWaitingModal && (
                    <div style={styles.modalOverlay}>
                        <div style={styles.modalContent}>
                            <h3>Lista de Espera</h3>

                            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                                <select
                                    value={waitingGameType}
                                    onChange={e => setWaitingGameType(e.target.value)}
                                    style={{ flex: 1, padding: '10px', backgroundColor: '#222', color: '#fff', border: '1px solid #444' }}
                                >
                                    <option value="POOL">Pool</option>
                                    <option value="CARAMBOLA">Carambola</option>
                                    <option value="SNOOKER">Snooker</option>
                                    <option value="CARDS">Cartas</option>
                                </select>
                            </div>

                            <input
                                type="text"
                                placeholder="Buscar socio para agregar..."
                                value={playerSearch}
                                onChange={(e) => setPlayerSearch(e.target.value)}
                                style={{ width: '100%', padding: '10px', marginBottom: '10px', backgroundColor: '#222', color: '#fff', border: '1px solid #444', borderRadius: '4px' }}
                            />

                            {/* Search Results */}
                            {playerSearch && (
                                <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #333', marginBottom: '15px' }}>
                                    {filteredUsers.map(u => (
                                        <div
                                            key={u.id}
                                            onClick={() => handleAddToWaitlist(u.id)}
                                            style={{ padding: '8px', borderBottom: '1px solid #333', cursor: 'pointer', '&:hover': { backgroundColor: '#444' } }}
                                        >
                                            {u.full_name} ({u.type})
                                        </div>
                                    ))}
                                </div>
                            )}

                            <hr style={{ border: '1px solid #333', margin: '15px 0' }} />

                            {/* List */}
                            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                {waitingList.length === 0 ? <p style={{ color: '#888' }}>No hay nadie en espera.</p> : (
                                    <table style={{ width: '100%', borderCollapse: 'collapse', color: '#ddd' }}>
                                        <thead>
                                            <tr style={{ background: '#333', textAlign: 'left' }}>
                                                <th style={{ padding: '8px' }}>Nombre</th>
                                                <th style={{ padding: '8px' }}>Juego</th>
                                                <th style={{ padding: '8px' }}>Hora</th>
                                                <th></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {waitingList.map(w => (
                                                <tr key={w.id} style={{ borderBottom: '1px solid #333' }}>
                                                    <td style={{ padding: '8px' }}>{w.full_name}</td>
                                                    <td style={{ padding: '8px' }}>{w.game_type}</td>
                                                    <td style={{ padding: '8px' }}>{new Date(w.created_at).toLocaleTimeString().slice(0, 5)}</td>
                                                    <td style={{ padding: '8px', textAlign: 'right' }}>
                                                        <button
                                                            onClick={() => handleRemoveWaitlist(w.id)}
                                                            style={{ background: 'red', color: '#fff', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer' }}
                                                        >
                                                            X
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>


                            <button onClick={() => { setShowWaitingModal(false); setPlayerSearch(''); }} style={{ ...styles.btnActionSecondary, marginTop: '20px' }}>Cerrar</button>
                        </div>
                    </div>
                )
            }
        </div>
    );
};

const Timer = ({ startTime, darkText }) => {
    const [elapsed, setElapsed] = useState('00:00:00');
    useEffect(() => {
        const interval = setInterval(() => {
            const start = new Date(startTime).getTime();
            const now = new Date().getTime();
            const ms = now - start;
            if (ms < 0) { setElapsed('00:00:00'); return; }
            const h = Math.floor(ms / 3600000);
            const m = Math.floor((ms % 3600000) / 60000);
            const s = Math.floor((ms % 60000) / 1000);
            setElapsed(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
        }, 1000);
        return () => clearInterval(interval);
    }, [startTime]);
    return <span style={{ color: darkText ? '#000' : 'inherit' }}>{elapsed}</span>;
}

const styles = {
    container: { display: 'flex', height: '100%', width: '100%', backgroundColor: '#121212' },
    leftPanel: { flex: 1, borderRight: '1px solid #333', display: 'flex', flexDirection: 'column' },
    rightPanel: { width: '350px', backgroundColor: '#1E1E1E', display: 'flex', flexDirection: 'column' },
    filterBar: { height: '50px', borderBottom: '1px solid #333', display: 'flex', alignItems: 'center', padding: '0 20px', gap: '10px' },
    filterBtnActive: { background: '#333', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' },
    grid: { padding: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '15px', overflowY: 'auto' },
    card: { backgroundColor: '#252525', borderRadius: '8px', padding: '15px', cursor: 'pointer', border: '2px solid transparent', transition: 'all 0.2s' },
    panelHeader: { padding: '20px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    btnMainAction: { width: '100%', padding: '15px', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', backgroundColor: 'var(--color-primary)', color: '#000' },
    btnActionSecondary: { width: '100%', padding: '10px', background: '#333', color: '#fff', border: '1px dashed #555', borderRadius: '6px', cursor: 'pointer' },
    // Modal Styles
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
    modalContent: { backgroundColor: '#1E1E1E', padding: '20px', borderRadius: '8px', width: '400px', border: '1px solid #333', display: 'flex', flexDirection: 'column' }
};

export default TablesPage;
