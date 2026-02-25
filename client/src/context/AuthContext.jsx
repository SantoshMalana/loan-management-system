import { createContext, useState, useEffect } from 'react';
import api from '../api/axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const clearAuth = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
    };

    // On mount: restore session from stored token
    useEffect(() => {
        const restoreSession = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    // Set header before the request
                    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                    const res = await api.get('/auth/me');
                    setUser(res.data);
                } catch (err) {
                    if ([400, 401, 403].includes(err?.response?.status)) {
                        clearAuth();
                    }
                }
            }
            setLoading(false);
        };
        restoreSession();
    }, []);

    // Auto-logout on 401 responses
    useEffect(() => {
        const id = api.interceptors.response.use(
            (r) => r,
            (err) => {
                if (err?.response?.status === 401) clearAuth();
                return Promise.reject(err);
            }
        );
        return () => api.interceptors.response.eject(id);
    }, []);

    /**
     * STEP 1 — Validate credentials.
     * Returns { pending: true, userId, emailHint, role } if valid.
     * Backend sends OTP to user's email.
     */
    const login = async (username, password, options = {}) => {
        const res = await api.post('/auth/login', {
            username: username.trim(),
            password,
            ...options,
        });
        return res.data;
    };

    /**
     * STEP 2 — Verify OTP (+ secretCode for staff).
     * On success: stores token, sets auth header, updates user state.
     */
    const verifyOtp = async (userId, otp, secretCode = null) => {
        const body = { userId, otp: String(otp).trim() };
        if (secretCode) body.secretCode = String(secretCode).trim();

        const res = await api.post('/auth/verify-otp', body);
        const { token, ...userData } = res.data;

        // Persist token
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));

        // Set default header for all future requests
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

        setUser(userData);
        return userData;
    };

    const forgotPassword = async (username, options = {}) => {
        const res = await api.post('/auth/forgot-password', {
            username: username.trim(),
            ...options,
        });
        return res.data;
    };

    const resetPassword = async (userId, otp, newPassword, secretCode = null) => {
        const body = { userId, otp: String(otp).trim(), newPassword };
        if (secretCode) body.secretCode = String(secretCode).trim();

        const res = await api.post('/auth/reset-password', body);
        return res.data;
    };

    const register = async (userData) => {
        const res = await api.post('/auth/register', userData);
        return res.data;
    };

    const logout = () => {
        delete api.defaults.headers.common['Authorization'];
        clearAuth();
    };

    return (
        <AuthContext.Provider value={{ user, login, verifyOtp, register, logout, loading, forgotPassword, resetPassword }}>
            {children}
        </AuthContext.Provider>
    );
};
