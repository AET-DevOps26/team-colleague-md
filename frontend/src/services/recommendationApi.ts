import axios from 'axios';
import { getToken, clearSession } from './tokenStore';
import { emit } from './authEvents';
import { refreshSession } from './sessionRefresh';

// recommendation-service axios instance. Mirrors `api`/`userApi`: attaches the in-memory
// bearer token per request and shares the single-flight silent refresh on 401 so the feed
// calls participate in the same session-recovery path as content/user calls.
const recommendationApi = axios.create({
  baseURL: '/recommendation',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
  timeout: 10000,
});

recommendationApi.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

recommendationApi.interceptors.response.use(
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
      return recommendationApi(original);
    } catch {
      clearSession();
      emit();
      return Promise.reject(error);
    }
  },
);

export default recommendationApi;
