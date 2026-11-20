import { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('clf_user');
    return raw ? JSON.parse(raw) : null;
  });
  const [loading, setLoading] = useState(false);

  // verify the stored token once on load
  useEffect(() => {
    const token = localStorage.getItem('clf_token');
    if (!token) return;
    api
      .get('/auth/me')
      .then((res) => {
        setUser(res.data.user);
        localStorage.setItem('clf_user', JSON.stringify(res.data.user));
      })
      .catch(() => {
        localStorage.removeItem('clf_token');
        localStorage.removeItem('clf_user');
        setUser(null);
      });
  }, []);

  const persist = (data) => {
    localStorage.setItem('clf_token', data.token);
    localStorage.setItem('clf_user', JSON.stringify(data.user));
    setUser(data.user);
  };

  const login = async (email, password) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      persist(res.data);
      return res.data.user;
    } finally {
      setLoading(false);
    }
  };

  const register = async (payload) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/register', payload);
      persist(res.data);
      return res.data.user;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      /* the session is cleared locally regardless */
    }
    localStorage.removeItem('clf_token');
    localStorage.removeItem('clf_user');
    setUser(null);
  };

  const value = {
    user,
    loading,
    isAuthenticated: Boolean(user),
    isAdmin: Boolean(user && user.role === 'admin'),
    login,
    register,
    logout,
    setUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
