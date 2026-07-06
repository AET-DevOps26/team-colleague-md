import axios from 'axios';
import userApi from './userApi';
import { refreshSession } from './sessionRefresh';
import { setAccessToken, setUser, clearSession, getUser } from './tokenStore';
import { AuthError } from '../errors/AuthError';
import type { AuthUser } from '../types';

interface BackendUser {
  id: string;
  username: string;
  displayName: string;
  email: string;
  role: 'USER' | 'VERIFIED' | 'ADMIN';
  avatarUrl?: string;
}

interface BackendAuthResponse {
  accessToken: string;
  user: BackendUser;
}

function mapUser(u: BackendUser): AuthUser {
  return {
    id: u.id,
    username: u.username,
    displayName: u.displayName,
    email: u.email,
    role: u.role,
    avatarUrl: u.avatarUrl,
  };
}

function handleAxiosError(error: unknown, isRegister: boolean): never {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const message: string = error.response?.data?.message ?? '';
    if (isRegister && status === 409) {
      if (message.toLowerCase().includes('username')) throw new AuthError('USERNAME_IN_USE');
      throw new AuthError('EMAIL_IN_USE');
    }
    if (status === 401 || status === 404) throw new AuthError('INVALID_CREDENTIALS');
    if (!error.response) throw new AuthError('NETWORK_ERROR');
  }
  throw new AuthError('UNKNOWN');
}

export const authService = {
  async login(email: string, password: string): Promise<AuthUser> {
    try {
      const { data } = await userApi.post<BackendAuthResponse>('/api/v1/auth/login', { email, password });
      const user = mapUser(data.user);
      setAccessToken(data.accessToken);
      setUser(user);
      return user;
    } catch (error) {
      handleAxiosError(error, false);
    }
  },

  async signup(username: string, email: string, password: string): Promise<AuthUser> {
    try {
      const { data } = await userApi.post<BackendAuthResponse>('/api/v1/auth/register', { username, email, password });
      const user = mapUser(data.user);
      setAccessToken(data.accessToken);
      setUser(user);
      return user;
    } catch (error) {
      handleAxiosError(error, true);
    }
  },

  async logout(): Promise<void> {
    try {
      await userApi.post('/api/v1/auth/logout');
    } catch {
      // ignore — clear local state regardless
    } finally {
      clearSession();
    }
  },

  // --- Password reset (two-step OTP) ---

  // Step 1: request a 6-digit code. The backend always responds 204 (even for unknown emails,
  // to avoid account enumeration), so a resolved promise just means "request accepted".
  async requestPasswordReset(email: string): Promise<void> {
    try {
      await userApi.post('/api/v1/auth/forgot-password', { email });
    } catch (error) {
      if (axios.isAxiosError(error) && !error.response) throw new AuthError('NETWORK_ERROR');
      throw new AuthError('UNKNOWN');
    }
  },

  // Step 2: exchange the emailed code for a single-use reset token. 400 = wrong/expired/too many tries.
  async verifyResetCode(email: string, code: string): Promise<string> {
    try {
      const { data } = await userApi.post<{ resetToken: string }>('/api/v1/auth/verify-reset-code', { email, code });
      return data.resetToken;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 400) throw new AuthError('INVALID_RESET_CODE');
        if (!error.response) throw new AuthError('NETWORK_ERROR');
      }
      throw new AuthError('UNKNOWN');
    }
  },

  // Step 3: set the new password using the reset token. 400 = token invalid/expired between steps.
  async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      await userApi.post('/api/v1/auth/reset-password', { token, newPassword });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 400) throw new AuthError('INVALID_RESET_CODE');
        if (!error.response) throw new AuthError('NETWORK_ERROR');
      }
      throw new AuthError('UNKNOWN');
    }
  },

  // Attempts to restore a session using the httpOnly refresh-token cookie.
  // Called on app mount. Returns the user if the cookie is still valid, null otherwise.
  async restoreSession(): Promise<AuthUser | null> {
    try {
      // Shares the single-flight refresh with the axios 401 interceptors so a request that
      // races app bootstrap can't fire a second, rotation-invalidated refresh (sessionRefresh).
      const data = await refreshSession();
      const user = mapUser(data.user);
      setUser(user);
      return user;
    } catch {
      return null;
    }
  },

  getCurrentUser(): AuthUser | null {
    return getUser();
  },
};
