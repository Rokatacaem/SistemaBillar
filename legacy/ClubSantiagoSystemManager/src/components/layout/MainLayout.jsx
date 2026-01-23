import React, { useEffect, useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { API_URL } from '../../config';

const MainLayout = () => {
    const { user, logout } = useAuth();
    const location = useLocation();
    const [shiftStatus, setShiftStatus] = useState({ status: 'CERRADO', cashier: '' });

    // Password Change State
    const [showPwdModal, setShowPwdModal] = useState(false);
    const [pwdData, setPwdData] = useState({ current: '', new: '' });

    // Fetch shift status on mount and when location changes (in case we just opened/closed a shift)
    useEffect(() => {
        const fetchShift = async () => {
            try {
                const res = await fetch(`${API_URL}/shifts/current`);
                const data = await res.json();
                if (data && data.status === 'OPEN') {
                    setShiftStatus({ status: 'ABIERTO', cashier: data.cashier_name });
                } else {
                    setShiftStatus({ status: 'CERRADO', cashier: '' });
                }
            } catch (err) {
                console.error('Error fetching shift status:', err);
            }
        };

        fetchShift();
    }, [location.pathname]); // Re-fetch on route change to keep updated

    const handleChangePassword = async (e) => {
        e.preventDefault();
        if (!pwdData.current || !pwdData.new) return alert('Complete todos los campos');

        try {
            const res = await fetch(`${API_URL}/users/change-password`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.id,
                    currentPassword: pwdData.current,
                    newPassword: pwdData.new
                })
            });

            const data = await res.json();
            if (res.ok) {
                alert('Contraseña actualizada con éxito');
                setShowPwdModal(false);
                setPwdData({ current: '', new: '' });
            } else {
                alert('Error: ' + data.error);
            }
        } catch (err) {
            console.error(err);
            alert('Error al conectar con el servidor');
        }
    };

    const navLinks = [
        { label: 'MESAS', path: '/tables', icon: '🎱' },
        { label: 'MOSTRADOR', path: '/dashboard', icon: '🖥️' }, /* Dashboard as simple landing or counter */
        { label: 'CLIENTES', path: '/members', icon: '👥' },
        { label: 'SOCIOS', path: '/memberships', icon: '💳' },
        { label: 'PRODUCTOS', path: '/products', icon: '🍺' },
        { label: 'CAJA', path: '/shifts', icon: '💰' },
    ];

    return (
        <div style={styles.container}>
            {/* TOP HEADER */}
            <header style={styles.header}>
                <div style={styles.brandSection}>
                    <div style={styles.logoBox}>BS</div>
                    <span style={styles.brandName}>Club Billar Santiago</span>
                </div>

                <nav style={styles.nav}>
                    {navLinks.map(link => (
                        <NavLink
                            key={link.path}
                            to={link.path}
                            style={({ isActive }) => ({
                                ...styles.navLink,
                                borderBottom: isActive ? '3px solid var(--color-primary)' : '3px solid transparent',
                                color: isActive ? '#fff' : 'var(--text-muted)'
                            })}
                        >
                            <span style={{ fontSize: '1.2rem', marginBottom: '4px' }}>{link.icon}</span>
                            <span>{link.label}</span>
                        </NavLink>
                    ))}
                </nav>

                <div style={styles.userSection}>
                    {/* Logged User Info */}
                    <div style={{ ...styles.shiftInfo, marginRight: '10px', alignItems: 'flex-end' }}>
                        <span style={{ fontSize: '0.8rem', color: '#888' }}>USUARIO</span>
                        <span style={{ fontWeight: 'bold', color: '#fff' }}>
                            {user ? user.name : 'Desc...'} ({user ? user.role : ''})
                        </span>
                    </div>

                    <button
                        onClick={() => setShowPwdModal(true)}
                        style={{ ...styles.logoutBtn, marginRight: '10px', fontSize: '0.8rem', width: 'auto', padding: '0 10px', borderRadius: '4px', background: '#444' }}
                        title="Cambiar Contraseña"
                    >
                        🔑
                    </button>

                    <div style={styles.shiftInfo}>
                        <span style={{ fontSize: '0.8rem', color: '#888' }}>TURNO ACTUAL</span>
                        <span style={{ fontWeight: 'bold', color: shiftStatus.status === 'ABIERTO' ? 'var(--color-primary)' : '#EF5350' }}>
                            {shiftStatus.status === 'ABIERTO' ? `Abierto (${shiftStatus.cashier})` : 'Cerrado'}
                        </span>
                    </div>
                    <button onClick={logout} style={styles.logoutBtn} title="Cerrar Sesión">
                        ⏻
                    </button>
                </div>
            </header>

            {/* CONTENT AREA */}
            <main style={styles.main}>
                <Outlet />
            </main>

            {/* PASSWORD CHANGE MODAL */}
            {showPwdModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 100,
                    display: 'flex', justifyContent: 'center', alignItems: 'center'
                }}>
                    <div style={{ backgroundColor: '#222', padding: '20px', borderRadius: '8px', minWidth: '300px', border: '1px solid #444' }}>
                        <h3 style={{ marginTop: 0, color: '#fff' }}>Cambiar Contraseña</h3>
                        <form onSubmit={handleChangePassword}>
                            <div style={{ marginBottom: '10px' }}>
                                <label style={{ display: 'block', color: '#ccc', marginBottom: '5px' }}>Contraseña Actual</label>
                                <input
                                    type="password"
                                    value={pwdData.current}
                                    onChange={e => setPwdData({ ...pwdData, current: e.target.value })}
                                    style={{ width: '100%', padding: '8px', background: '#333', border: '1px solid #555', color: 'white' }}
                                    required
                                />
                            </div>
                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', color: '#ccc', marginBottom: '5px' }}>Nueva Contraseña</label>
                                <input
                                    type="password"
                                    value={pwdData.new}
                                    onChange={e => setPwdData({ ...pwdData, new: e.target.value })}
                                    style={{ width: '100%', padding: '8px', background: '#333', border: '1px solid #555', color: 'white' }}
                                    required
                                />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                <button type="button" onClick={() => setShowPwdModal(false)} style={{ padding: '8px 15px', background: '#555', border: 'none', color: 'white', cursor: 'pointer' }}>Cancelar</button>
                                <button type="submit" style={{ padding: '8px 15px', background: 'var(--color-primary)', border: 'none', color: 'black', fontWeight: 'bold', cursor: 'pointer' }}>Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

const styles = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100vw',
        backgroundColor: '#121212', // Deep background
        overflow: 'hidden'
    },
    header: {
        height: '60px',
        backgroundColor: '#1E1E1E', // Panel color
        borderBottom: '1px solid #333',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        flexShrink: 0,
        boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
        zIndex: 10
    },
    brandSection: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        width: '200px'
    },
    logoBox: {
        width: '32px',
        height: '32px',
        backgroundColor: 'var(--color-primary)',
        color: '#000',
        fontWeight: 'bold',
        borderRadius: '6px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    },
    brandName: {
        fontWeight: 'bold',
        fontSize: '0.95rem',
        letterSpacing: '0.5px'
    },
    nav: {
        display: 'flex',
        height: '100%',
        gap: '10px'
    },
    navLink: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        padding: '0 20px',
        textDecoration: 'none',
        fontSize: '0.75rem',
        fontWeight: '600',
        letterSpacing: '0.5px',
        transition: 'all 0.2s',
        color: '#888'
    },
    userSection: {
        display: 'flex',
        alignItems: 'center',
        gap: '15px',
        minWidth: '200px', // Allow growth
        justifyContent: 'flex-end'
    },
    shiftInfo: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        lineHeight: '1.1'
    },
    logoutBtn: {
        background: '#333',
        border: 'none',
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        cursor: 'pointer',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    },
    main: {
        flex: 1,
        overflow: 'hidden', // Let children handle scroll
        position: 'relative'
    }
};

export default MainLayout;
