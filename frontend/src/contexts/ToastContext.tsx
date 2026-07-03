import { createContext, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastOptions {
  variant?: ToastVariant;
  message: string;
  // Auto-dismiss delay in ms; defaults to 6000 when an action is present (more time to act),
  // otherwise 4000.
  lifetime?: number;
  action?: ToastAction;
}

export interface ToastEntry {
  id: number;
  variant: ToastVariant;
  message: string;
  lifetime: number;
  action?: ToastAction;
  // Once true the item plays its leave transition; it is removed from the array after LEAVE_MS.
  leaving: boolean;
}

export interface WelcomeEntry {
  id: number;
  message: string;
}

export interface ToastContextValue {
  toasts: ToastEntry[];
  welcome: WelcomeEntry | null;
  showToast: (opts: ToastOptions) => number;
  dismiss: (id: number) => void;
  dismissAll: () => void;
  showWelcome: (message: string) => void;
  dismissWelcome: () => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

const STACK_MAX = 2;
const DEFAULT_LIFETIME = 4000;
const ACTION_LIFETIME = 6000;
// Must match the toast leave transition in Toast.module.css.
const LEAVE_MS = 240;

/**
 * Single source of truth for the two notification surfaces: the bottom-right toast stack and the
 * top-center welcome pill. Removal is two-phase — `dismiss` flips `leaving` so the item can play
 * its exit transition, then unmounts it after LEAVE_MS — so every removal path (manual close,
 * timer expiry, dismissAll, stack-overflow eviction) animates out the same way.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const [welcome, setWelcome] = useState<WelcomeEntry | null>(null);
  const seq = useRef(0);
  const removeTimers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const remove = useCallback((id: number) => {
    const timer = removeTimers.current.get(id);
    if (timer) clearTimeout(timer);
    removeTimers.current.delete(id);
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Idempotent: begin the leave transition (if not already) and schedule the unmount once.
  const dismiss = useCallback((id: number) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id && !t.leaving ? { ...t, leaving: true } : t)),
    );
    if (!removeTimers.current.has(id)) {
      removeTimers.current.set(id, setTimeout(() => remove(id), LEAVE_MS));
    }
  }, [remove]);

  const dismissAll = useCallback(() => {
    setToasts((prev) => {
      prev.forEach((t) => {
        if (!removeTimers.current.has(t.id)) {
          removeTimers.current.set(t.id, setTimeout(() => remove(t.id), LEAVE_MS));
        }
      });
      return prev.map((t) => (t.leaving ? t : { ...t, leaving: true }));
    });
  }, [remove]);

  const showToast = useCallback((opts: ToastOptions): number => {
    const id = ++seq.current;
    const entry: ToastEntry = {
      id,
      variant: opts.variant ?? 'info',
      message: opts.message,
      lifetime: opts.lifetime ?? (opts.action ? ACTION_LIFETIME : DEFAULT_LIFETIME),
      action: opts.action,
      leaving: false,
    };
    setToasts((prev) => [...prev, entry]);
    return id;
  }, []);

  // Enforce the stack cap declaratively: when more than STACK_MAX live toasts are present, evict
  // the oldest (it animates out via dismiss). Runs after render so a 3rd push shows briefly then
  // pushes the 1st out.
  useEffect(() => {
    const live = toasts.filter((t) => !t.leaving);
    if (live.length > STACK_MAX) {
      live.slice(0, live.length - STACK_MAX).forEach((t) => dismiss(t.id));
    }
  }, [toasts, dismiss]);

  const showWelcome = useCallback((message: string) => {
    setWelcome({ id: ++seq.current, message });
  }, []);

  const dismissWelcome = useCallback(() => setWelcome(null), []);

  return (
    <ToastContext.Provider
      value={{ toasts, welcome, showToast, dismiss, dismissAll, showWelcome, dismissWelcome }}
    >
      {children}
    </ToastContext.Provider>
  );
}
