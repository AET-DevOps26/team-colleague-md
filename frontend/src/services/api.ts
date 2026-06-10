import axios from 'axios';
import { getToken, setAccessToken, clearSession } from './tokenStore';
import { emit } from './authEvents';
import userApi from './userApi';

const api = axios.create({
  baseURL: 'http://localhost:8082',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Mirror the same silent-refresh logic as userApi so content-service 401s
// also attempt a token refresh before logging the user out.
let refreshing: Promise<string> | null = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status !== 401 || original._retried) {
      return Promise.reject(error);
    }
    original._retried = true;

    try {
      if (!refreshing) {
        refreshing = userApi
          .post<{ accessToken: string }>('/api/v1/auth/refresh')
          .then((r) => r.data.accessToken)
          .finally(() => { refreshing = null; });
      }
      const newToken = await refreshing;
      setAccessToken(newToken);
      original.headers.Authorization = `Bearer ${newToken}`;
      return api(original);
    } catch {
      clearSession();
      emit();
      return Promise.reject(error);
    }
  },
);

export default api;
