import { createContext, useState, useCallback, useContext, useEffect, type ReactNode } from 'react';
import { subscribe } from '../services/authEvents';

type AuthTab = 'login' | 'signup';

interface AuthModalContextValue {
  isOpen: boolean;
  activeTab: AuthTab;
  open: (tab?: AuthTab) => void;
  close: () => void;
}

interface SettingsModalContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

export const AuthModalContext = createContext<AuthModalContextValue>({
  isOpen: false,
  activeTab: 'login',
  open: () => {},
  close: () => {},
});

export const SettingsModalContext = createContext<SettingsModalContextValue>({
  isOpen: false,
  open: () => {},
  close: () => {},
});

export function useAuthModal() {
  return useContext(AuthModalContext);
}

export function useSettingsModal() {
  return useContext(SettingsModalContext);
}

function AuthEventListener({ open }: { open: (tab?: AuthTab) => void }) {
  useEffect(() => {
    return subscribe(() => open('login'));
  }, [open]);
  return null;
}

export function AuthModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<AuthTab>('login');

  const open = useCallback((tab: AuthTab = 'login') => {
    setActiveTab(tab);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => setIsOpen(false), []);

  return (
    <AuthModalContext.Provider value={{ isOpen, activeTab, open, close }}>
      <AuthEventListener open={open} />
      {children}
    </AuthModalContext.Provider>
  );
}

export function SettingsModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  return (
    <SettingsModalContext.Provider value={{ isOpen, open, close }}>
      {children}
    </SettingsModalContext.Provider>
  );
}
