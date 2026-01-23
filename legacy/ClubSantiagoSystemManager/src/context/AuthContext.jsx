import React, { createContext, useState, useContext, useEffect } from 'react';
import { API_URL } from '../config';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    // Lazy initialization to avoid sync setState in effect
    const [user, setUser] = useState(() => {
        const storedUser = localStorage.getItem('smcbs_user');
        return storedUser ? JSON.parse(storedUser) : null;
    });

    const [loading] = useState(false); // No async loading needed with lazy init

    const login = async (rut, password) => {
        try {
            const response = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rut, password }),
            });

            const data = await response.json();
            if (response.ok && data.success) {
                setUser(data.user);
                localStorage.setItem('smcbs_user', JSON.stringify(data.user));
                return { success: true };
            } else {
                return { success: false, error: data.error || 'Login failed' };
            }
        } catch (err) {
            console.error('Login error:', err);
            return { success: false, error: 'Network error' };
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('smcbs_user');
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
