import axios from 'axios';
import { authStore } from '@/features/auth/store/auth.store';

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
});

http.interceptors.request.use((config) => {
  const token = authStore.getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

http.interceptors.response.use(
  (res) => res,
  (error) => {
    const isLogin = String(error.config?.url ?? '').includes('/auth/login');
    if (error.response?.status === 401 && !isLogin) {
      authStore.clear();
      if (window.location.pathname !== '/login') window.location.assign('/login');
    }
    return Promise.reject(error);
  },
);
