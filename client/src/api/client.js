import axios from 'axios';

// In production the API is served by the same origin, so '/api' is the safe default
const baseURL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({ baseURL });

// Attach the token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('clf_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// One place where an expired session is handled
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = (error.config && error.config.url) || '';
    const isAuthEndpoint = url.startsWith('/auth/login') || url.startsWith('/auth/register');
    const suspended =
      error.response && error.response.status === 403 &&
      String((error.response.data && error.response.data.message) || '').includes('suspended');
    if (suspended) {
      localStorage.removeItem('clf_token');
      localStorage.removeItem('clf_user');
      window.dispatchEvent(new Event('clf:unauthorized'));
    }
    if (error.response && error.response.status === 401 && !isAuthEndpoint) {
      localStorage.removeItem('clf_token');
      localStorage.removeItem('clf_user');
      // tell AuthContext so the navbar and ProtectedRoute drop the session
      window.dispatchEvent(new Event('clf:unauthorized'));
    }
    const message =
      (error.response && error.response.data && error.response.data.message) ||
      (error.code === 'ERR_NETWORK' ? 'Cannot reach the server. Is the API running?' : 'Something went wrong');
    return Promise.reject(new Error(message));
  }
);

export default api;
export { baseURL };
