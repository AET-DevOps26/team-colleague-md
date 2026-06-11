import axios from 'axios';
import { getToken, setAccessToken, clearSession } from './tokenStore';
import { emit } from './authEvents';

const userApi = axios.create({
  baseURL: '/api/user',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
  timeout: 10000,
});

userApi.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On 401: attempt a silent refresh before giving up and logging the user out.
let refreshing: Promise<string> | null = null;

userApi.interceptors.response.use(
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .post<{ accessToken: string }>('/api/v1/auth/refresh', undefined, { _retried: true } as any)
          .then((r) => r.data.accessToken)
          .finally(() => { refreshing = null; });
      }
      const newToken = await refreshing;
      setAccessToken(newToken);
      original.headers.Authorization = `Bearer ${newToken}`;
      return userApi(original);
    } catch {
      clearSession();
      emit();
      return Promise.reject(error);
    }
  },
);

export async function checkUsernameAvailable(username: string): Promise<boolean> {
  const res = await userApi.get<{ available: boolean }>('/api/v1/auth/check-username', { params: { username } });
  return res.data.available;
}

export async function checkEmailAvailable(email: string): Promise<boolean> {
  const res = await userApi.get<{ available: boolean }>('/api/v1/auth/check-email', { params: { email } });
  return res.data.available;
}

export default userApi;
