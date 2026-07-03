import { useEffect, useRef, useState, type ReactElement } from 'react';
import type { ToastEntry, ToastVariant } from '../../../contexts/ToastContext';
import styles from './Toast.module.css';

const ICONS: Record<ToastVariant, ReactElement> = {
  success: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  error: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  ),
  warning: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  info: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  ),
};

interface ToastItemProps {
  toast: ToastEntry;
  onDismiss: (id: number) => void;
}

/**
 * One toast in the stack. Owns its own auto-dismiss countdown so it can pause on hover and resume
 * with the remaining time; the leave animation is driven by `toast.leaving` from the context.
 */
export default function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const { id, variant, message, lifetime, action, leaving } = toast;
  const [shown, setShown] = useState(false);
  const remaining = useRef(lifetime);
  // Set to Date.now() whenever the countdown (re)starts; the initial 0 is never read.
  const startedAt = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Entrance: flip on after mount so the opacity/translate transition runs.
  useEffect(() => setShown(true), []);

  useEffect(() => {
    if (leaving) return;
    startedAt.current = Date.now();
    timer.current = setTimeout(() => onDismiss(id), remaining.current);
    return () => clearTimeout(timer.current);
  }, [id, leaving, onDismiss]);

  function pause() {
    if (leaving) return;
    clearTimeout(timer.current);
    remaining.current = Math.max(0, remaining.current - (Date.now() - startedAt.current));
  }

  function resume() {
    if (leaving) return;
    clearTimeout(timer.current);
    startedAt.current = Date.now();
    timer.current = setTimeout(() => onDismiss(id), remaining.current);
  }

  const className = [
    styles.toastItem,
    shown && !leaving ? styles.show : '',
    leaving ? styles.leaving : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      className={className}
      data-variant={variant}
      role={variant === 'error' ? 'alert' : 'status'}
      aria-live={variant === 'error' ? 'assertive' : 'polite'}
      onMouseEnter={pause}
      onMouseLeave={resume}
    >
      <span className={styles.toastIcon} aria-hidden="true">{ICONS[variant]}</span>
      <div className={styles.toastBody}>
        <span className={styles.toastMsg}>{message}</span>
        {action && (
          <button
            className={styles.toastAction}
            type="button"
            onClick={() => { action.onClick(); onDismiss(id); }}
          >
            {action.label}
          </button>
        )}
      </div>
      <button className={styles.toastClose} type="button" aria-label="Dismiss" onClick={() => onDismiss(id)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}
