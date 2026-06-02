import { createContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { authService } from '../services/auth.service';
import { subscribe } from '../services/authEvents';
import type { AuthUser } from '../types';

interface AuthContextValue {
  user: AuthUser | null;
  isLoggedIn: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoggedIn: false,
  login: async () => {},
  signup: async () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => authService.getCurrentUser());

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

  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoggedIn: user !== null, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
