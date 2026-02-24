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

    useEffect(() => {
        const checkLoggedIn = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    const res = await api.get('/auth/me');
                    setUser(res.data);
                } catch (err) {
                    if ([400, 401].includes(err?.response?.status)) clearAuth();
                }
            }
            setLoading(false);
        };
        checkLoggedIn();
    }, []);

    // Auto-logout on 401
    useEffect(() => {
        const id = api.interceptors.response.use(
            (r) => r,
            (err) => { if (err?.response?.status === 401) clearAuth(); return Promise.reject(err); }
        );
        return () => api.interceptors.response.eject(id);
    }, []);

    /**
     * STEP 1 — Submit credentials.
     * Returns { pending: true, userId, emailHint, role } if credentials are valid.
     * The backend sends an OTP to the user's email.
     */
    const login = async (username, password, options = {}) => {
        const res = await api.post('/auth/login', { username, password, ...options });
        return res.data;
    };

    /**
     * STEP 2 — Verify OTP (applicants) or OTP + secretCode (staff).
     * On success, stores token and updates user state.
     */
    const verifyOtp = async (userId, otp, secretCode = null) => {
        const body = { userId, otp };
        if (secretCode) body.secretCode = secretCode;
        const res = await api.post('/auth/verify-otp', body);
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data));
        setUser(res.data);
        return res.data;
    };

    const register = async (userData) => {
        await api.post('/auth/register', userData);
    };

    const logout = () => clearAuth();

    return (
        <AuthContext.Provider value={{ user, login, verifyOtp, register, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};
