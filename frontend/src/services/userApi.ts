import axios from 'axios';
import { getToken, clearSession } from './tokenStore';
import { emit } from './authEvents';

const userApi = axios.create({
  baseURL: 'http://localhost:8081',
  headers: { 'Content-Type': 'application/json' },
});

userApi.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

userApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearSession();
      emit();
    }
    return Promise.reject(error);
  }
);

export default userApi;
