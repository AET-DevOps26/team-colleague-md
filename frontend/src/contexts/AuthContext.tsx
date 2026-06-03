import { createContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { authService } from '../services/auth.service';
import { subscribe } from '../services/authEvents';
import type { AuthUser } from '../types';

interface AuthContextValue {
  user: AuthUser | null;
  isLoggedIn: boolean;
  isRestoring: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoggedIn: false,
  isRestoring: true,
  login: async () => {},
  signup: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);

  // On mount: try to restore session from the httpOnly refresh-token cookie.
  // While restoring, isRestoring=true so the app can show a loading state
  // instead of briefly flashing the logged-out UI.
  useEffect(() => {
    authService.restoreSession()
      .then((restored) => setUser(restored))
      .finally(() => setIsRestoring(false));
  }, []);

  // Clear user state when a 401 propagates through the auth event bus.
  useEffect(() => {
    return subscribe(() => setUser(null));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const u = await authService.login(email, password);
    setUser(u);
  }, []);

  const signup = useCallback(async (username: string, email: string, password: string) => {
    const u = await authService.signup(username, email, password);
    setUser(u);
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoggedIn: user !== null, isRestoring, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
