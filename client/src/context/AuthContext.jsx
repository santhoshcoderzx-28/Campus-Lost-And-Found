import { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem('clf_user');
      const parsed = raw ? JSON.parse(raw) : null;
      return parsed && parsed._id ? parsed : null;
    } catch (error) {
      localStorage.removeItem('clf_user');
      return null;
    }
  });

  // A 401 anywhere in the app ends the session immediately
  useEffect(() => {
    const onUnauthorized = () => setUser(null);
    window.addEventListener('clf:unauthorized', onUnauthorized);
    return () => window.removeEventListener('clf:unauthorized', onUnauthorized);
  }, []);
  const [loading, setLoading] = useState(false);
  // true until the stored token has been checked once, so a protected route
  // does not redirect a valid session during the first paint
  const [initialising, setInitialising] = useState(true);

  // verify the stored token once on load
  useEffect(() => {
    const token = localStorage.getItem('clf_token');
    if (!token) {
      setInitialising(false);
      return;
    }
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
      })
      .finally(() => setInitialising(false));
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
    initialising,
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
