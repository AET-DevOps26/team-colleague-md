import type { AuthUser } from '../types';

const USER_KEY = 'verita_user';

// Access token lives only in memory — never persisted to localStorage.
// This protects against XSS token theft. The refresh token is stored as
// an httpOnly cookie by the backend and is never accessible to JavaScript.
let _accessToken: string | null = null;

export function getToken(): string | null {
  return _accessToken;
}

export function setAccessToken(token: string | null): void {
  _accessToken = token;
}

export function getUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function setUser(user: AuthUser): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession(): void {
  _accessToken = null;
  localStorage.removeItem(USER_KEY);
}
