import { useContext } from 'react';
import { ToastContext } from '../contexts/ToastContext';

/**
 * Access to the top-center welcome pill — an independent surface from the toast stack, fired only
 * by the auth flow on a successful sign-in.
 */
export function useWelcome() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useWelcome must be used within a ToastProvider');
  const { welcome, showWelcome, dismissWelcome } = ctx;
  return { welcome, showWelcome, dismissWelcome };
}
