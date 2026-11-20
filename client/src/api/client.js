import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

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
    if (error.response && error.response.status === 401) {
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
