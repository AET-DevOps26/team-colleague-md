import type { AuthUser } from '../types';

const MOCK_USER: AuthUser = {
  id: 'user-1',
  username: 'alexchen',
  displayName: 'Alex Chen',
  role: 'USER',
  email: 'alex@example.com',
};

const TOKEN_KEY = 'verita_token';
const USER_KEY = 'verita_user';

export const authService = {
  login(_email: string, _password: string): Promise<AuthUser> {
    return new Promise((resolve) => {
      setTimeout(() => {
        localStorage.setItem(TOKEN_KEY, 'mock-jwt-token');
        localStorage.setItem(USER_KEY, JSON.stringify(MOCK_USER));
        resolve(MOCK_USER);
      }, 600);
    });
  },

  signup(_username: string, _email: string, _password: string): Promise<AuthUser> {
    return new Promise((resolve) => {
      setTimeout(() => {
        localStorage.setItem(TOKEN_KEY, 'mock-jwt-token');
        localStorage.setItem(USER_KEY, JSON.stringify(MOCK_USER));
        resolve(MOCK_USER);
      }, 600);
    });
  },

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  getCurrentUser(): AuthUser | null {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  },
};
