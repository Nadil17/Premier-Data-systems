import axios from 'axios';

const API_BASE_URL = import.meta.env.PROD ? '/api/v1' : (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1');

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    // `access_token` is the canonical key. Read the legacy key once so users
    // who logged in before the client migration are not logged out abruptly.
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid. Clear both the current and legacy keys so
      // the app does not immediately retry the same invalid request.
      localStorage.removeItem('token');
      localStorage.removeItem('access_token');
      localStorage.removeItem('auth-storage');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
