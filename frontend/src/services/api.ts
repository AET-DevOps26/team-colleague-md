import axios from 'axios';
import { getToken, clearSession } from './tokenStore';
import { emit } from './authEvents';
import { refreshSession } from './sessionRefresh';

const api = axios.create({
  baseURL: '/content',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Mirror the same silent-refresh logic as userApi so content-service 401s also attempt a token
// refresh before logging the user out. The refresh is single-flight and shared across both axios
// instances (see sessionRefresh) so concurrent 401s can't trigger the refresh-rotation race.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status !== 401 || original._retried) {
      return Promise.reject(error);
    }
    original._retried = true;

    try {
      const { accessToken } = await refreshSession();
      original.headers.Authorization = `Bearer ${accessToken}`;
      return api(original);
    } catch {
      clearSession();
      emit();
      return Promise.reject(error);
    }
  },
);

export default api;
