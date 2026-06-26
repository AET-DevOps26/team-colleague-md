import axios from 'axios';
import { setAccessToken } from './tokenStore';

interface RefreshUser {
  id: string;
  username: string;
  displayName: string;
  email: string;
  role: 'USER' | 'VERIFIED' | 'ADMIN';
  avatarUrl?: string;
}

export interface RefreshResponse {
  accessToken: string;
  user: RefreshUser;
}

// Single-flight refresh. The backend rotates the refresh-token cookie on every call
// (AuthService.rotateTokens), so two concurrent refreshes sent with the same cookie would
// race: the first rotates it, the second 401s on the now-stale cookie and logs the user out.
// All callers — app bootstrap (restoreSession) and both axios 401 interceptors — funnel
// through this one in-flight promise so only a single refresh is ever airborne at a time.
//
// Uses a bare axios call (not userApi/api) to bypass the interceptors entirely, which both
// avoids re-entrancy and breaks the would-be import cycle with those modules.
let inFlight: Promise<RefreshResponse> | null = null;

export function refreshSession(): Promise<RefreshResponse> {
  if (!inFlight) {
    inFlight = axios
      .post<RefreshResponse>('/user/api/v1/auth/refresh', undefined, { withCredentials: true })
      .then((res) => {
        setAccessToken(res.data.accessToken);
        return res.data;
      })
      .finally(() => {
        inFlight = null;
      });
  }
  return inFlight;
}
