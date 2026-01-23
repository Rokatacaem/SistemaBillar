
import React, { useEffect, useState } from 'react';
import { API_URL } from '../../config';
import { useAuth } from '../../context/AuthContext';

const DashboardPage = () => {
    const { user } = useAuth();
    // State
    const [activeSessions, setActiveSessions] = useState([]);
    const [recentSales, setRecentSales] = useState([]);
    const [loading, setLoading] = useState(true);

    // New Order Modal State
    const [showNewOrderModal, setShowNewOrderModal] = useState(false);
    // State for Modal visibility
    const [showCloseTableModal, setShowCloseTableModal] = useState(false);
    const [products, setProducts] = useState([]);
    const [cart, setCart] = useState([]);
    const [paymentMethod, setPaymentMethod] = useState('CASH');

    // User Assignment State
    const [users, setUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUser, setSelectedUser] = useState(null);

    useEffect(() => {
        fetchData();
        fetchProducts();
        fetchUsers();

        const interval = setInterval(() => {
            fetchData();
        }, 10000); // 10 seconds refresh

        return () => clearInterval(interval);
    }, []);

    const fetchUsers = async () => {
        try {
            const res = await fetch(`${API_URL}/users`);
            const data = await res.json();
            setUsers(data);
        } catch (err) { console.error('Error fetching users', err); }
    };

    const fetchData = async () => {
        try {
            const res = await fetch(`${API_URL}/tables`);
            const data = await res.json();
            const occupied = data.filter(t => t.status === 'OCCUPIED');
            setActiveSessions(occupied);

            // Mock Data for "Closed/Recent" based on Fudo screenshot
            // TODO: Fetch real sales from API
            setRecentSales([
                { id: 8280, time: '14:56:20', status: 'Cerrada', client: 'JUAN PÉREZ', total: 3800 },
                { id: 8279, time: '14:20:12', status: 'Cerrada', client: 'MESA 4', total: 12500 }
            ]);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchProducts = async () => {
        try {
            const res = await fetch(`${API_URL}/products`);
            const data = await res.json();
            setProducts(data);
        } catch (err) { console.error('Error fetching products', err); }
    };

    const addToCart = (product) => {
        const existing = cart.find(item => item.id === product.id);
        if (existing) {
            setCart(cart.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
        } else {
            setCart([...cart, { ...product, quantity: 1 }]);
        }
    };

    const removeFromCart = (productId) => {
        setCart(cart.filter(item => item.id !== productId));
    };

    const calculateTotal = () => {
        return cart.reduce((sum, item) => sum + (parseInt(item.price_client) * item.quantity), 0);
    };

    const handleConfirmOrder = async () => {
        if (cart.length === 0) return;

        // Validation: Account payment needs user
        if (paymentMethod === 'ACCOUNT' && !selectedUser) {
            alert('Debe identificar al cliente para cargar a cuenta.');
            return;
        }

        try {
            const items = cart.map(item => ({
                id: item.id,
                name: item.name,
                price: item.price_client,
                quantity: item.quantity,
                type: 'PRODUCT'
            }));

            await fetch(`${API_URL}/sales/direct`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items,
                    total: calculateTotal(),
                    method: paymentMethod,
                    user_id: selectedUser ? selectedUser.id : null,
                    user_name: selectedUser ? selectedUser.full_name : null
                })
            });

            setShowNewOrderModal(false);
            setCart([]);
            setSelectedUser(null);
            alert('Venta registrada con éxito');
            // Refresh recent sales
            fetchData();
        } catch (err) {
            alert('Error al registrar venta');
        }
    };

    // CLOSE TABLE LOGIC
    const [closeInfo, setCloseInfo] = useState(null); // {table, session, consumption}
    const [hourlyRates, setHourlyRates] = useState({ client: 4000, socio: 4000 });
    const [paymentMode, setPaymentMode] = useState('SINGLE'); // 'SINGLE' | 'SPLIT'

    // Split State
    const [splitPayers, setSplitPayers] = useState([]); // Array of {id, name, type, percentage, method, amount_estimated}

    const openCloseModal = async (table) => {
        try {
            // Fetch product rates
            const pRes = await fetch(`${API_URL}/products`);
            const prodsData = await pRes.json();
            const timeProd = Array.isArray(prodsData) ? (prodsData.find(p => p.name.toLowerCase().includes('hora')) || { price_client: 4000, price_socio: 4000 }) : { price_client: 4000, price_socio: 4000 };
            const rates = { client: parseFloat(timeProd.price_client), socio: parseFloat(timeProd.price_socio) };
            setHourlyRates(rates);

            // Fetch session consumption
            const res = await fetch(`${API_URL}/sessions/${table.current_session_id}/items`);
            if (!res.ok) throw new Error('Error al obtener consumo');
            const items = await res.json();

            let consumptionTotal = 0;
            if (Array.isArray(items)) {
                consumptionTotal = items.reduce((sum, i) => sum + (parseInt(i.price) * i.quantity), 0);
            } else {
                console.warn('Items not array:', items);
            }

            // Prep Session Data
            const startTime = new Date(table.start_time);
            const durationMs = new Date() - startTime;
            const durationHours = durationMs / (1000 * 60 * 60);

            // Fetch Table Info (Mock or from Table Object if available)
            // Ideally we need 'is_training' from the table/session object.
            // Assuming 'table' object has it if we update GET /tables or GET /sessions
            // For now, let's assume table.is_training is available (added to DB)

            // Estimate Single Payment (Default)
            // Use Client Rate by default for anonymous single, or check players
            const estimatedTimeCost = Math.ceil(durationHours * rates.client);

            setCloseInfo({
                table,
                consumptionTotal,
                durationHours,
                items: Array.isArray(items) ? items : [],
                estimatedTotal: estimatedTimeCost + consumptionTotal
            });

            // Init Split Payers with Session Players
            let initialSplit = [];
            try {
                const players = typeof table.players === 'string' ? JSON.parse(table.players || '[]') : table.players || [];
                if (Array.isArray(players)) {
                    initialSplit = players.map(p => {
                        // Attempt to find latest user info from global state to get correct TYPE
                        const foundUser = users.find(u => u.id === p.id);
                        return {
                            id: p.id,
                            name: foundUser ? foundUser.full_name : (p.full_name || p.name),
                            type: foundUser ? foundUser.type : (p.type || 'CLIENTE'),
                            status: foundUser ? foundUser.status : 'ACTIVE', // Track status
                            percentage: 0,
                            method: 'CASH'
                        };
                    });
                }
            } catch (e) { console.error('Error parsing players', e); }

            // Add at least one row if empty
            if (initialSplit.length === 0) {
                initialSplit.push({ id: null, name: 'Cliente Anónimo', type: 'CLIENTE', percentage: 100, method: 'CASH' });
            } else {
                // Distribute % evenly initially? Or just 0
                const share = Math.floor(100 / initialSplit.length);
                initialSplit.forEach(p => p.percentage = share);
                // Fix remainder on first
                initialSplit[0].percentage += (100 - (share * initialSplit.length));
            }

            setSplitPayers(initialSplit);
            setPaymentMode('SINGLE');
            setShowCloseTableModal(true);
        } catch (err) {
            console.error(err);
            alert('Error al abrir modal de cierre: ' + err.message);
        }
    };

    const handleConfirmClose = async () => {
        if (!closeInfo) return;

        if (paymentMode === 'SPLIT') {
            const totalPerc = splitPayers.reduce((s, p) => s + parseFloat(p.percentage), 0);
            if (Math.abs(totalPerc - 100) > 0.1) {
                alert(`El total de porcentajes debe ser 100% (Actual: ${totalPerc}%)`);
                return;
            }
        }

        try {
            const payload = {
                table_id: closeInfo.table.id,
                type: paymentMode
            };

            if (paymentMode === 'SINGLE') {
                payload.paymentMethod = paymentMethod;
                payload.payerId = selectedUser ? selectedUser.id : null;
            } else {
                payload.payments = splitPayers.map(p => ({
                    payerId: p.id,
                    percentage: parseFloat(p.percentage),
                    method: p.method
                }));
            }

            const res = await fetch(`${API_URL}/sessions/end`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                alert('Mesa cerrada con éxito');
                setShowCloseTableModal(false);
                fetchData(); // Refresh tables
            } else {
                const err = await res.json();
                alert('Error: ' + err.error);
            }
        } catch (err) { console.error(err); }
    };

    // Calculate dynamic estimates for UI
    const calculateSplitEstimates = () => {
        if (!closeInfo) return splitPayers;

        return splitPayers.map(p => {
            const isSocio = p.type === 'SOCIO';
            const isFundadorActive = p.type === 'FUNDADOR' && p.status === 'ACTIVE';
            let rate = (isSocio || isFundadorActive) ? hourlyRates.socio : hourlyRates.client;

            // Apply Training Discount
            if (closeInfo.table.is_training) {
                rate = rate * 0.5;
            }

            const pct = parseFloat(p.percentage) || 0;
            const timeCost = Math.ceil(closeInfo.durationHours * (pct / 100) * rate);
            const consumptionCost = Math.ceil(closeInfo.consumptionTotal * (pct / 100));
            return {
                ...p,
                amount_estimated: timeCost + consumptionCost,
                details: `Tiempo: $${timeCost} | Consumo: $${consumptionCost}`
            };
        });
    };

    const splitEstimates = calculateSplitEstimates();
    const grandTotalSplit = splitEstimates.reduce((s, p) => s + p.amount_estimated, 0);

    return (
        <div style={{ padding: '20px', color: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ color: 'var(--color-primary)', margin: 0 }}>MOSTRADOR</h2>
                <button onClick={() => setShowNewOrderModal(true)} className="btn-primary" style={{ fontSize: '0.9rem' }}>+ Nuevo Pedido</button>
            </div>

            {/* SECCION EN CURSO */}
            <div style={{ marginBottom: '30px' }}>
                <h3 style={{ fontSize: '1rem', color: '#888', borderBottom: '1px solid #333', paddingBottom: '10px' }}>EN CURSO ({activeSessions.length} Mesas Activas)</h3>
                <div style={{ backgroundColor: '#1E1E1E', borderRadius: '4px', height: 'calc(100vh - 250px)', overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                        <thead>
                            <tr style={{ color: '#888', textAlign: 'left', position: 'sticky', top: 0, backgroundColor: '#1E1E1E', zIndex: 1 }}>
                                <th style={{ padding: '10px' }}>Cliente</th>
                                <th style={{ padding: '10px' }}>Mesa / ID</th>
                                <th style={{ padding: '10px' }}>Hora Inicio</th>
                                <th style={{ padding: '10px', textAlign: 'right' }}>Total Estimado</th>
                                <th style={{ padding: '10px' }}>Acción</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(() => {
                                // Flatten Sessions into Rows (Client-Centric)
                                const rows = [];
                                activeSessions.forEach(session => {
                                    let players = [];
                                    try {
                                        players = typeof session.players === 'string' ? JSON.parse(session.players) : session.players;
                                    } catch (e) { }

                                    if (Array.isArray(players) && players.length > 0) {
                                        // Generate row for each player
                                        players.forEach(p => {
                                            // Calculate Estimates
                                            let estTotal = 0;

                                            // Time Cost
                                            if (p.startAt) {
                                                const start = new Date(p.startAt);
                                                const now = new Date();
                                                const hours = (now - start) / (1000 * 60 * 60);
                                                // Default Rate guess (Dashboard only) - 4000
                                                // Ideally we'd know if they are Socio
                                                // We can check our 'users' state
                                                // We can check our 'users' state
                                                const user = users.find(u => u.id === p.id);
                                                const isSocio = user && user.type === 'SOCIO';
                                                const isFundadorActive = user && (user.type === 'FUNDADOR' && user.status === 'ACTIVE');
                                                let rate = (isSocio || isFundadorActive) ? hourlyRates.socio : hourlyRates.client;

                                                if (session.is_training) rate = rate * 0.5;

                                                estTotal += Math.ceil(hours * rate);
                                            }

                                            // Consumption Share?
                                            // For now, consumption is usually Table-based unless assigned.
                                            // We could fetch items per session but that's expensive for POLL.
                                            // Let's assume Table Total / Player Count for rough estimate? 
                                            // OR just show Time Cost for Cards Players.
                                            // User said "show consolidated... with individual consumption".
                                            // Without 'assigned_to' loaded here, we can't show mapped consumption.
                                            // Let's show Time Cost + "Part. Consumo" (Partitioned)

                                            rows.push({
                                                key: `${session.id}-${p.id}`,
                                                client: p.full_name,
                                                table: session.name,
                                                startTime: p.startAt || session.start_time,
                                                total: estTotal,
                                                session: session,
                                                player: p,
                                                isPlayerRow: true
                                            });
                                        });
                                    } else {
                                        // Anonymous Session
                                        rows.push({
                                            key: session.id,
                                            client: 'Mesa General (Anónimo)',
                                            table: session.name,
                                            startTime: session.start_time,
                                            total: parseInt(session.consumption_total || 0), // Base consumption
                                            session: session,
                                            isPlayerRow: false
                                        });
                                    }
                                });

                                if (rows.length === 0) return (
                                    <tr><td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#666' }}>Sin actividad.</td></tr>
                                );

                                return rows.map(row => (
                                    <tr key={row.key} style={{ borderTop: '1px solid #333' }}>
                                        <td style={{ padding: '15px 10px', fontWeight: 'bold' }}>{row.client}</td>
                                        <td style={{ padding: '15px 10px', color: '#888' }}>{row.table}</td>
                                        <td style={{ padding: '15px 10px' }}>{new Date(row.startTime).toLocaleTimeString()}</td>
                                        <td style={{ padding: '15px 10px', textAlign: 'right', color: 'var(--color-primary)' }}>
                                            ${row.total.toLocaleString('es-CL')}
                                        </td>
                                        <td style={{ padding: '15px 10px' }}>
                                            {row.isPlayerRow && row.session.type === 'CARDS' ? (
                                                <button
                                                    onClick={async () => {
                                                        if (!confirm(`¿Finalizar a ${row.client}?`)) return;
                                                        try {
                                                            const res = await fetch(`${API_URL}/sessions/${row.session.id}/players/${row.player.id}/end`, { method: 'POST' });
                                                            if (res.ok) {
                                                                const d = await res.json();
                                                                alert(`Finalizado. Costo: $${d.cost}`);
                                                                fetchData();
                                                            } else {
                                                                const e = await res.json();
                                                                alert('Error: ' + e.error);
                                                            }
                                                        } catch (err) { alert('Error de conexión'); }
                                                    }}
                                                    style={{ background: '#FF9800', border: 'none', color: '#000', borderRadius: '4px', padding: '5px 10px', cursor: 'pointer', fontWeight: 'bold', marginRight: '5px' }}
                                                >
                                                    Finalizar (F.)
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => openCloseModal(row.session)}
                                                    style={{ background: '#EF5350', border: 'none', color: '#fff', borderRadius: '4px', padding: '5px 10px', cursor: 'pointer' }}
                                                >
                                                    Cerrar Mesa
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ));
                            })()}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* SECCION CERRADAS (MOCK) */}
            <div>
                <h3 style={{ fontSize: '1rem', color: '#888', borderBottom: '1px solid #333', paddingBottom: '10px' }}>CERRADAS (Últimas 5)</h3>
                <div style={{ backgroundColor: '#1E1E1E', borderRadius: '4px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                        <thead>
                            <tr style={{ color: '#888', textAlign: 'left' }}>
                                <th style={{ padding: '10px' }}>ID</th>
                                <th style={{ padding: '10px' }}>Hora</th>
                                <th style={{ padding: '10px' }}>Estado</th>
                                <th style={{ padding: '10px' }}>Cliente</th>
                                <th style={{ padding: '10px', textAlign: 'right' }}>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentSales.map(sale => (
                                <tr key={sale.id} style={{ borderTop: '1px solid #333' }}>
                                    <td style={{ padding: '10px', fontWeight: 'bold' }}>{sale.id}</td>
                                    <td style={{ padding: '10px' }}>{sale.time}</td>
                                    <td style={{ padding: '10px', color: '#66BB6A' }}>{sale.status}</td>
                                    <td style={{ padding: '10px' }}>{sale.client}</td>
                                    <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold' }}>${sale.total.toLocaleString('es-CL')}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* CLOSE TABLE MODAL */}
            {
                showCloseTableModal && closeInfo && (
                    <div style={styles.modalOverlay}>
                        <div style={styles.modalContent}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                                <h3>Cerrar Mesa: {closeInfo.table.name}</h3>
                                <button onClick={() => setShowCloseTableModal(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
                            </div>

                            <div style={{ display: 'flex', gap: '20px' }}>
                                {/* Summary Left */}
                                <div style={{ flex: 1, borderRight: '1px solid #333', paddingRight: '10px' }}>
                                    <h4>Resumen General</h4>
                                    <p><strong>Tiempo:</strong> {Math.floor(closeInfo.durationHours * 60)} min</p>
                                    <p><strong>Consumo:</strong> ${closeInfo.consumptionTotal.toLocaleString('es-CL')}</p>
                                    <hr style={{ borderColor: '#333' }} />
                                    {paymentMode === 'SINGLE' ? (
                                        <h2 style={{ color: 'var(--color-primary)' }}>Total: ${closeInfo.estimatedTotal.toLocaleString('es-CL')}</h2>
                                    ) : (
                                        <h2 style={{ color: '#aaa' }}>Total Dividido: ${grandTotalSplit.toLocaleString('es-CL')}</h2>
                                    )}
                                </div>

                                {/* Payment Logic Right */}
                                <div style={{ flex: 2, paddingLeft: '10px' }}>
                                    <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                                        <button
                                            onClick={() => setPaymentMode('SINGLE')}
                                            style={{ flex: 1, padding: '10px', cursor: 'pointer', background: paymentMode === 'SINGLE' ? 'var(--color-primary)' : '#333', color: paymentMode === 'SINGLE' ? '#000' : '#fff', border: 'none', borderRadius: '4px' }}
                                        >
                                            Pago Único
                                        </button>
                                        <button
                                            onClick={() => setPaymentMode('SPLIT')}
                                            style={{ flex: 1, padding: '10px', cursor: 'pointer', background: paymentMode === 'SPLIT' ? 'var(--color-primary)' : '#333', color: paymentMode === 'SPLIT' ? '#000' : '#fff', border: 'none', borderRadius: '4px' }}
                                        >
                                            Pago Dividido (%)
                                        </button>
                                    </div>

                                    {paymentMode === 'SINGLE' && (
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '5px' }}>Método de Pago</label>
                                            <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '10px', backgroundColor: '#333', color: '#fff' }}>
                                                <option value="CASH">Efectivo</option>
                                                <option value="DEBIT">Tarjeta Débito/Crédito</option>
                                                <option value="TRANSFER">Transferencia</option>
                                                <option value="ACCOUNT">Cargar a Cuenta</option>
                                            </select>

                                            {paymentMethod === 'ACCOUNT' && (
                                                <div style={{ marginBottom: '10px' }}>
                                                    <label style={{ display: 'block', marginBottom: '5px' }}>Cliente (Obligatorio)</label>
                                                    <select
                                                        value={selectedUser ? selectedUser.id : ''}
                                                        onChange={(e) => {
                                                            const u = users.find(user => user.id == e.target.value);
                                                            setSelectedUser(u || null);
                                                        }}
                                                        style={{ width: '100%', padding: '10px', backgroundColor: '#333', color: '#fff' }}
                                                    >
                                                        <option value="">-- Seleccionar --</option>
                                                        {users.map(u => (
                                                            <option key={u.id} value={u.id}>{u.full_name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {paymentMode === 'SPLIT' && (
                                        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                            <table style={{ width: '100%', fontSize: '0.9rem' }}>
                                                <thead>
                                                    <tr>
                                                        <th>Jugador</th>
                                                        <th style={{ width: '60px' }}>%</th>
                                                        <th>Estimado</th>
                                                        <th>Método</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {splitPayers.map((payer, idx) => (
                                                        <tr key={idx}>
                                                            <td>
                                                                {payer.id ? payer.name : (
                                                                    <select
                                                                        value={payer.id || ''}
                                                                        onChange={(e) => {
                                                                            const val = e.target.value;
                                                                            const u = users.find(u => u.id == val); // Loose equality for string/number match
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
                                                                )}
                                                                <br /><small style={{ color: payer.type === 'SOCIO' ? 'gold' : '#888' }}>{payer.type}</small>
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
                                                                    style={{ width: '50px', background: '#333', color: '#fff', border: '1px solid #555' }}
                                                                />
                                                            </td>
                                                            <td>
                                                                ${(splitEstimates[idx].amount_estimated).toLocaleString('es-CL')}
                                                            </td>
                                                            <td>
                                                                <select
                                                                    value={payer.method}
                                                                    onChange={(e) => {
                                                                        const updated = [...splitPayers];
                                                                        updated[idx].method = e.target.value;
                                                                        setSplitPayers(updated);
                                                                    }}
                                                                    style={{ width: '90px', fontSize: '0.8rem', background: '#333', color: '#fff' }}
                                                                >
                                                                    <option value="CASH">Efectivo</option>
                                                                    <option value="DEBIT">Tarjeta</option>
                                                                    <option value="ACCOUNT">Cuenta</option>
                                                                </select>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                            <button onClick={() => setSplitPayers([...splitPayers, { id: null, name: 'Otro', type: 'CLIENTE', percentage: 0, method: 'CASH' }])} style={{ marginTop: '10px', fontSize: '0.8rem', background: 'none', border: '1px dashed #555', color: '#aaa', cursor: 'pointer', width: '100%' }}>+ Agregar Pagador</button>
                                        </div>
                                    )}

                                    <button onClick={handleConfirmClose} style={{ marginTop: '20px', width: '100%', padding: '15px', background: '#EF5350', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                                        CONFIRMAR CIERRE
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* NEW ORDER MODAL */}
            {
                showNewOrderModal && (
                    <div style={styles.modalOverlay}>
                        <div style={styles.modalContent}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                                <h3>Nuevo Pedido (Venta Directa)</h3>
                                <button onClick={() => setShowNewOrderModal(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
                            </div>

                            <div style={{ display: 'flex', gap: '20px', height: '400px' }}>
                                {/* Products Column */}
                                <div style={{ flex: 1, overflowY: 'auto', borderRight: '1px solid #333', paddingRight: '10px' }}>
                                    <h4>Productos</h4>
                                    {products.map(p => (
                                        <div key={p.id} onClick={() => addToCart(p)} style={styles.productItem}>
                                            <span>{p.name}</span>
                                            <span style={{ color: 'var(--color-primary)' }}>${parseInt(p.price_client).toLocaleString('es-CL')}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* Cart Column */}
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                    {/* User Selection Section */}
                                    <div style={{ marginBottom: '15px', borderBottom: '1px solid #333', paddingBottom: '10px' }}>
                                        <h4 style={{ margin: '0 0 10px 0' }}>Cliente {paymentMethod !== 'ACCOUNT' && <span style={{ fontSize: '0.8rem', color: '#888' }}>(Opcional)</span>}</h4>

                                        <select
                                            value={selectedUser ? selectedUser.id : ''}
                                            onChange={(e) => {
                                                const u = users.find(user => user.id == e.target.value);
                                                setSelectedUser(u || null);
                                            }}
                                            style={{ width: '100%', padding: '10px', backgroundColor: '#333', border: '1px solid #555', color: '#fff', borderRadius: '4px' }}
                                        >
                                            <option value="">-- {paymentMethod === 'ACCOUNT' ? 'Seleccionar Cliente (Obligatorio)' : 'Cliente General / Anónimo'} --</option>
                                            {users.map(u => (
                                                <option key={u.id} value={u.id}>{u.full_name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <h4>Resumen</h4>
                                    <div style={{ flex: 1, overflowY: 'auto', marginBottom: '10px' }}>
                                        {cart.length === 0 ? <p style={{ color: '#666' }}>Carro vacío</p> : (
                                            cart.map(item => (
                                                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem' }}>
                                                    <div>
                                                        <span style={{ fontWeight: 'bold' }}>{item.quantity}x</span> {item.name}
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '10px' }}>
                                                        <span>${(parseInt(item.price_client) * item.quantity).toLocaleString('es-CL')}</span>
                                                        <button onClick={() => removeFromCart(item.id)} style={{ color: '#EF5350', background: 'none', border: 'none', cursor: 'pointer' }}>x</button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>

                                    <div style={{ borderTop: '1px solid #333', paddingTop: '10px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '15px' }}>
                                            <span>TOTAL</span>
                                            <span style={{ color: 'var(--color-primary)' }}>${calculateTotal().toLocaleString('es-CL')}</span>
                                        </div>

                                        <div style={{ marginBottom: '15px' }}>
                                            <label style={{ display: 'block', marginBottom: '5px' }}>Método de Pago</label>
                                            <div style={{ display: 'flex', gap: '5px' }}>
                                                {['CASH', 'DEBIT', 'TRANSFER', 'ACCOUNT'].map(m => (
                                                    <button
                                                        key={m}
                                                        onClick={() => setPaymentMethod(m)}
                                                        style={{
                                                            flex: 1,
                                                            padding: '8px',
                                                            background: paymentMethod === m ? 'var(--color-primary)' : '#333',
                                                            color: paymentMethod === m ? '#000' : '#fff',
                                                            border: '1px solid',
                                                            borderColor: paymentMethod === m ? 'var(--color-primary)' : '#555',
                                                            borderRadius: '4px',
                                                            cursor: 'pointer',
                                                            fontSize: '0.8rem',
                                                            fontWeight: paymentMethod === m ? 'bold' : 'normal'
                                                        }}
                                                    >
                                                        {m === 'CASH' ? 'EFEC' : m === 'DEBIT' ? 'TARJ' : m === 'TRANSFER' ? 'TRANS' : 'CUENTA'}
                                                    </button>
                                                ))}
                                            </div>
                                            {/* Display Credit Info if ACCOUNT selected and User Selected */}
                                            {paymentMethod === 'ACCOUNT' && selectedUser && (
                                                <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#333', borderRadius: '4px', fontSize: '0.9rem' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                        <span>Deuda Actual:</span>
                                                        <span>${parseFloat(selectedUser.current_debt || 0).toLocaleString('es-CL')}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <button
                                            onClick={handleConfirmOrder}
                                            disabled={
                                                cart.length === 0 ||
                                                (paymentMethod === 'ACCOUNT' && !selectedUser)
                                            }
                                            style={{
                                                width: '100%',
                                                padding: '15px',
                                                backgroundColor: (cart.length === 0 || (paymentMethod === 'ACCOUNT' && !selectedUser)) ? '#555' : 'var(--color-primary)',
                                                color: (cart.length === 0 || (paymentMethod === 'ACCOUNT' && !selectedUser)) ? '#888' : '#000',
                                                border: 'none',
                                                borderRadius: '4px',
                                                fontWeight: 'bold',
                                                fontSize: '1rem',
                                                cursor: (cart.length === 0 || (paymentMethod === 'ACCOUNT' && !selectedUser)) ? 'not-allowed' : 'pointer'
                                            }}
                                        >
                                            {paymentMethod === 'ACCOUNT' && !selectedUser ? 'SELECCIONE CLIENTE' :
                                                paymentMethod === 'ACCOUNT' ? 'CONFIRMAR CARGO' : 'CONFIRMAR VENTA'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* SYSTEM RESET (Admin Only) */}
            {user && user.full_name === 'Rodrigo Enrique Zúñiga Lobos' && (
                <div style={{ position: 'fixed', bottom: '10px', right: '10px', zIndex: 9999 }}>
                    <button
                        onClick={async () => {
                            if (confirm('PELIGRO: ¿Estás seguro de que quieres RESTABLECER TODAS LAS TRANSACCIONES? Esto eliminará ventas, sesiones y deudas.')) {
                                const confirmText = prompt("Para confirmar, escribe 'ELIMINAR':");
                                if (confirmText === 'ELIMINAR') {
                                    try {
                                        const res = await fetch(`${API_URL}/admin/reset-transactions`, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ adminName: user.full_name })
                                        });
                                        const data = await res.json();
                                        if (res.ok) {
                                            alert(data.message);
                                            window.location.reload();
                                        } else {
                                            alert('Error: ' + data.error);
                                        }
                                    } catch (err) {
                                        console.error(err);
                                        alert('Error de conexión');
                                    }
                                }
                            }
                        }}
                        style={{
                            backgroundColor: 'red',
                            color: 'white',
                            border: '2px solid white',
                            padding: '10px',
                            fontWeight: 'bold',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            opacity: 0.1, // Hint invisible unless hovered
                            transition: 'opacity 0.3s'
                        }}
                        onMouseEnter={(e) => e.target.style.opacity = '1'}
                        onMouseLeave={(e) => e.target.style.opacity = '0.1'}
                    >
                        ⚠️ RESTABLECER SISTEMA
                    </button>
                </div>
            )}
        </div >
    );
};

const styles = {
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
    modalContent: { backgroundColor: '#1E1E1E', padding: '20px', borderRadius: '8px', width: '800px', maxWidth: '90%', border: '1px solid #333' },
    productItem: { padding: '10px', backgroundColor: '#252525', marginBottom: '8px', borderRadius: '4px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', border: '1px solid transparent', transition: 'border-color 0.2s' }
};

export default DashboardPage;
