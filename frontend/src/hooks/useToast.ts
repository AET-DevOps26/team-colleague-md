import { useContext } from 'react';
import { ToastContext } from '../contexts/ToastContext';

/**
 * Access to the bottom-right toast stack. `showToast` returns the toast id so callers can
 * `dismiss` it later (e.g. after an Undo action runs).
 */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  const { toasts, showToast, dismiss, dismissAll } = ctx;
  return { toasts, showToast, dismiss, dismissAll };
}
