import { createContext, useState, useCallback, type ReactNode } from 'react';
import { authService } from '../services/auth.service';
import type { AuthUser } from '../types';

interface AuthContextValue {
  user: AuthUser | null;
  isLoggedIn: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (patch: Partial<Pick<AuthUser, 'displayName' | 'avatarUrl'>>) => void;
}

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoggedIn: false,
  login: async () => {},
  signup: async () => {},
  logout: () => {},
  updateUser: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => authService.getCurrentUser());

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

  const updateUser = useCallback((patch: Partial<Pick<AuthUser, 'displayName' | 'avatarUrl'>>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...patch };
      localStorage.setItem('verita_user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoggedIn: user !== null, login, signup, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}
