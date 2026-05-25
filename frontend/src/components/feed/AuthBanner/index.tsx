import { useAuthModal } from '../../../contexts/ModalContext';
import styles from './AuthBanner.module.css';

export default function AuthBanner() {
  const { open } = useAuthModal();

  return (
    <div className={styles.banner} data-testid="auth-banner">
      <p className={styles.text}>
        Browsing as guest. <strong>Sign in</strong> to get a personalised feed, save bookmarks, and join the discussion.
      </p>
      <div className={styles.actions}>
        <button className={styles.btnGhost} onClick={() => open('login')}>Log in</button>
        <button className={styles.btnPrimary} onClick={() => open('signup')}>Create account</button>
      </div>
    </div>
  );
}
