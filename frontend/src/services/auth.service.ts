import axios from 'axios';
import userApi from './userApi';
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

const MOCK_CREDENTIALS: Record<string, { password: string; user: AuthUser }> = {
  'alice@verita.demo': {
    password: 'demo1234',
    user: { id: 'demo-alice', username: 'alice_verita', displayName: 'Alice Morgan', email: 'alice@verita.demo', role: 'VERIFIED' },
  },
  'bob@verita.demo': {
    password: 'demo1234',
    user: { id: 'demo-bob', username: 'bob_verita', displayName: 'Bob Nakamura', email: 'bob@verita.demo', role: 'USER' },
  },
};

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
    const mock = MOCK_CREDENTIALS[email];
    if (mock) {
      if (mock.password !== password) throw new AuthError('INVALID_CREDENTIALS');
      setAccessToken('mock-token');
      setUser(mock.user);
      return mock.user;
    }
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

  // Attempts to restore a session using the httpOnly refresh-token cookie.
  // Called on app mount. Returns the user if the cookie is still valid, null otherwise.
  // In demo mode (VITE_DEMO_USER=alice|bob), auto-logs in without backend.
  async restoreSession(): Promise<AuthUser | null> {
    const demoUser = import.meta.env.VITE_DEMO_USER;
    if (demoUser) {
      const emailMap: Record<string, string> = {
        alice: 'alice@verita.demo',
        bob: 'bob@verita.demo',
      };
      const mock = MOCK_CREDENTIALS[emailMap[demoUser] ?? ''];
      if (mock) {
        setAccessToken('mock-token');
        setUser(mock.user);
        return mock.user;
      }
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await userApi.post<BackendAuthResponse>('/api/v1/auth/refresh', undefined, { _retried: true } as any);
      const user = mapUser(data.user);
      setAccessToken(data.accessToken);
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
