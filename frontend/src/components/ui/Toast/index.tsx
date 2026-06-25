import { useEffect } from 'react';
import styles from './Toast.module.css';

interface ToastProps {
  message: string;
  show: boolean;
  onHide: () => void;
  neutral?: boolean;
  error?: boolean;
}

export default function Toast({ message, show, onHide, neutral = false, error = false }: ToastProps) {
  useEffect(() => {
    if (!show) return;
    const timer = setTimeout(onHide, 2500);
    return () => clearTimeout(timer);
  }, [show, onHide]);

  return (
    <div
      className={`${styles.toast} ${show ? styles.show : ''} ${error ? styles.error : neutral ? styles.neutral : ''}`}
      role={error ? 'alert' : 'status'}
      aria-live={error ? 'assertive' : 'polite'}
    >
      {error ? (
        <svg className={styles.iconWarn} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" /><path d="M12 8v5" /><path d="M12 16h.01" />
        </svg>
      ) : neutral ? (
        <svg className={styles.iconMinus} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" /><path d="M8 12h8" />
        </svg>
      ) : (
        <svg className={styles.iconCheck} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      )}
      <span>{message}</span>
    </div>
  );
}
