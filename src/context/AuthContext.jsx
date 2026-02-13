import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();
import { API_URL as BASE_URL } from "../config";
const API_URL = `${BASE_URL}/auth`;

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (token) {
            localStorage.setItem('token', token);
            // In a real app, we'd fetch the user profile here to verify the token
            const savedUser = JSON.parse(localStorage.getItem('user'));
            if (savedUser) setUser(savedUser);
        } else {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setUser(null);
        }
        setLoading(false);
    }, [token]);

    const login = async (handle, password) => {
        try {
            const res = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ handle, password })
            });
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                if (res.status === 403 && errorData.isSuspended) {
                    return {
                        success: false,
                        error: errorData.error,
                        isSuspended: true,
                        suspensionDetails: errorData
                    };
                }
                return { success: false, error: errorData.error || "Giriş yapılamadı." };
            }
            const data = await res.json();
            setToken(data.token);
            setUser({ handle: data.handle, name: data.name });
            localStorage.setItem('user', JSON.stringify({ handle: data.handle, name: data.name }));
            return { success: true };
        } catch (err) {
            console.error("Login error:", err);
            return { success: false, error: "Sunucuya bağlanılamadı. Lütfen daha sonra tekrar deneyin." };
        }
    };

    const register = async (name, handle, password) => {
        try {
            const res = await fetch(`${API_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, handle, password })
            });
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                return { success: false, error: errorData.error || "Kayıt yapılamadı." };
            }
            const data = await res.json();
            setToken(data.token);
            setUser({ handle: data.handle, name: data.name });
            localStorage.setItem('user', JSON.stringify({ handle: data.handle, name: data.name }));
            return { success: true };
        } catch (err) {
            console.error("Register error:", err);
            return { success: false, error: "Sunucuya bağlanılamadı. Lütfen daha sonra tekrar deneyin." };
        }
    };

    const logout = () => {
        setToken(null);
        setUser(null);
    };

    const submitAppeal = async (handle, password, appealText) => {
        try {
            const res = await fetch(`${API_URL}/appeal`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ handle, password, appealText })
            });
            const data = await res.json();
            if (res.ok) {
                return { success: true, message: data.message };
            }
            return { success: false, error: data.error };
        } catch (err) {
            console.error("Appeal submit error:", err);
            return { success: false, error: "İtiraz gönderilirken bir hata oluştu." };
        }
    };

    return (
        <AuthContext.Provider value={{ user, token, login, register, logout, submitAppeal, authenticated: !!token, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
