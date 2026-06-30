import { useEffect, useState } from 'react';
import { useWelcome } from '../../../hooks/useWelcome';
import styles from './Toast.module.css';

const WELCOME_LIFETIME = 3000;

/**
 * Top-center one-shot greeting, mounted once at the app root. Independent of the toast stack:
 * single message, no hover-pause, fixed 3000ms lifetime.
 */
export default function WelcomePill() {
  const { welcome, dismissWelcome } = useWelcome();
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!welcome) {
      setShown(false);
      return;
    }
    const raf = requestAnimationFrame(() => setShown(true));
    const timer = setTimeout(dismissWelcome, WELCOME_LIFETIME);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [welcome, dismissWelcome]);

  if (!welcome) return null;
  return (
    <div className={`${styles.welcomePill} ${shown ? styles.show : ''}`} role="status" aria-live="polite">
      <span className={styles.welcomeMsg}>{welcome.message}</span>
    </div>
  );
}
