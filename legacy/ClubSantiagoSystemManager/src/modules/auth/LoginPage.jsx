import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import logo from '../../assets/logo-club.jpg'; // Updated logo extension

const LoginPage = () => {
    const [rut, setRut] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        const result = await login(rut, password);
        if (result.success) {
            navigate('/dashboard');
        } else {
            setError(result.error);
        }
    };

    return (
        <div style={{
            minHeight: '100dvh',
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            background: 'linear-gradient(135deg, #0f1012 0%, #1a1c1e 100%)',
            color: '#fff',
            padding: '20px' // Add padding to prevent edge touching on small screens
        }}>
            <div style={{
                width: '100%',
                maxWidth: '420px',
                padding: '40px',
                borderRadius: '16px',
                backgroundColor: 'rgba(30, 30, 30, 0.8)',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
                border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <img
                        src={logo}
                        alt="Club Santiago Logo"
                        style={{ width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover', marginBottom: '1rem', border: '3px solid var(--color-primary)' }}
                        onError={(e) => { e.target.style.display = 'none'; }} // Fallback if image missing
                    />
                    <h2 style={{ color: 'var(--color-primary)', fontSize: '1.8rem', fontWeight: 'bold', margin: '0' }}>SMCBS</h2>
                    <p style={{ color: '#888', marginTop: '0.5rem' }}>Sistema de Gestión Club Santiago</p>
                </div>

                {error && (
                    <div style={{
                        backgroundColor: 'rgba(239, 83, 80, 0.1)',
                        border: '1px solid #ef4444',
                        color: '#ef4444',
                        padding: '12px',
                        borderRadius: '8px',
                        textAlign: 'center',
                        marginBottom: '1.5rem',
                        fontSize: '0.9rem'
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                        <label className="form-label" style={{ display: 'block', marginBottom: '8px', color: '#ccc', fontSize: '0.9rem' }}>RUT</label>
                        <input
                            type="text"
                            value={rut}
                            onChange={(e) => setRut(e.target.value)}
                            placeholder="Ej: 12345678-9"
                            className="input-field"
                            style={{
                                width: '100%',
                                padding: '12px 16px',
                                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                                border: '1px solid #444',
                                borderRadius: '8px',
                                color: '#fff',
                                outline: 'none',
                                fontSize: '1rem',
                                transition: 'border-color 0.2s'
                            }}
                            onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'}
                            onBlur={(e) => e.target.style.borderColor = '#444'}
                        />
                    </div>
                    <div className="form-group" style={{ marginBottom: '2rem' }}>
                        <label className="form-label" style={{ display: 'block', marginBottom: '8px', color: '#ccc', fontSize: '0.9rem' }}>Contraseña</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="input-field"
                                style={{
                                    width: '100%',
                                    padding: '12px 16px',
                                    paddingRight: '45px', // Space for eye icon
                                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                                    border: '1px solid #444',
                                    borderRadius: '8px',
                                    color: '#fff',
                                    outline: 'none',
                                    fontSize: '1rem',
                                    transition: 'border-color 0.2s'
                                }}
                                onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'}
                                onBlur={(e) => e.target.style.borderColor = '#444'}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{
                                    position: 'absolute',
                                    right: '12px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    color: '#888',
                                    cursor: 'pointer',
                                    padding: '4px',
                                    display: 'flex',
                                    alignItems: 'center'
                                }}
                            >
                                {showPassword ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                )}
                            </button>
                        </div>
                    </div>
                    <button
                        type="submit"
                        className="btn-primary"
                        style={{
                            width: '100%',
                            padding: '14px',
                            backgroundColor: 'var(--color-primary)',
                            color: '#1a1c1e',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '1.1rem',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            transition: 'transform 0.1s, filter 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.filter = 'brightness(1.1)'}
                        onMouseLeave={(e) => e.target.style.filter = 'brightness(1)'}
                        onMouseDown={(e) => e.target.style.transform = 'scale(0.98)'}
                        onMouseUp={(e) => e.target.style.transform = 'scale(1)'}
                    >
                        INGRESAR
                    </button>

                    <p style={{ textAlign: 'center', marginTop: '1.5rem', color: '#666', fontSize: '0.8rem' }}>
                        © 2024 Club Santiago - System Manager v1.0
                    </p>
                </form>
            </div>
        </div>
    );
};

export default LoginPage;
