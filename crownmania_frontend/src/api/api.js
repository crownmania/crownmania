import axios from 'axios';

// In development, use VITE_API_URL or localhost:5001.
// In production (Firebase Hosting), use relative baseURL so '/api/*' is proxied to Cloud Run.
const isDev = import.meta.env.DEV;
const baseURL = isDev
  ? (import.meta.env.VITE_API_URL || 'http://localhost:5001')
  : '';

const api = axios.create({ baseURL });

// Password protection functionality removed

export default api;
