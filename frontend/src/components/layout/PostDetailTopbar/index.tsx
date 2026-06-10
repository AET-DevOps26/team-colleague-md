import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { useAuthModal } from '../../../contexts/ModalContext';
import Avatar from '../../ui/Avatar';
import styles from './PostDetailTopbar.module.css';

export default function PostDetailTopbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoggedIn } = useAuth();
  const { open: openAuth } = useAuthModal();

  const from = (location.state as { from?: string } | null)?.from ?? 'Explore';

  return (
    <header className={styles.topbar}>
      <button className={styles.backBtn} onClick={() => navigate(-1)} aria-label={`Back to ${from}`}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 18-6-6 6-6" />
        </svg>
        <span>{from}</span>
      </button>

      <div className={styles.right}>
        {isLoggedIn ? (
          <button
            className={styles.avatarBtn}
            onClick={() => navigate(`/profile/${user!.username}`)}
            aria-label="Profile"
          >
            <Avatar displayName={user!.displayName} avatarUrl={user!.avatarUrl} size={36} borderRadius={10} />
          </button>
        ) : (
          <button className={styles.signinBtn} onClick={() => openAuth('login')}>
            Sign in
          </button>
        )}
      </div>
    </header>
  );
}
