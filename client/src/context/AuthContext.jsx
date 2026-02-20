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
                    // 401 = expired/invalid token → clear it automatically
                    if (err?.response?.status === 401 || err?.response?.status === 400) {
                        clearAuth();
                    }
                }
            }
            setLoading(false);
        };
        checkLoggedIn();
    }, []);

    // Global response interceptor: if any API call returns 401, force logout
    useEffect(() => {
        const interceptorId = api.interceptors.response.use(
            (response) => response,
            (error) => {
                if (error?.response?.status === 401) {
                    // Token is no longer valid — clear and redirect to login
                    clearAuth();
                }
                return Promise.reject(error);
            }
        );
        return () => api.interceptors.response.eject(interceptorId);
    }, []);

    const login = async (credentials) => {
        const res = await api.post('/auth/login', credentials);
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data));
        setUser(res.data);
        return res.data;
    };

    const register = async (userData) => {
        await api.post('/auth/register', userData);
    };

    const logout = () => {
        clearAuth();
    };

    return (
        <AuthContext.Provider value={{ user, login, register, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};
