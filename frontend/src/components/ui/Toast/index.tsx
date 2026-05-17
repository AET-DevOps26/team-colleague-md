import { useEffect } from 'react';
import styles from './Toast.module.css';

interface ToastProps {
  message: string;
  show: boolean;
  onHide: () => void;
}

export default function Toast({ message, show, onHide }: ToastProps) {
  useEffect(() => {
    if (!show) return;
    const timer = setTimeout(onHide, 2500);
    return () => clearTimeout(timer);
  }, [show, onHide]);

  return (
    <div className={`${styles.toast} ${show ? styles.show : ''}`} role="status" aria-live="polite">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6 9 17l-5-5" />
      </svg>
      <span>{message}</span>
    </div>
  );
}
