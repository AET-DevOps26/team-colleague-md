import type { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { useAuthModal } from '../../../contexts/ModalContext';
import { useNavigationHistory } from '../../../contexts/NavigationHistoryContext';
import { pageNameFromPath } from '../../../utils/pageName';
import Avatar from '../../ui/Avatar';
import styles from './PostDetailTopbar.module.css';

interface PostDetailTopbarProps {
  tabs?: ReactNode;
}

export default function PostDetailTopbar({ tabs }: PostDetailTopbarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoggedIn } = useAuth();
  const { open: openAuth } = useAuthModal();
  const { previousPath } = useNavigationHistory();

  // Prefer an explicit label passed via navigation state; otherwise derive it from the page
  // the back button actually returns to (navigate(-1)). Defaults to 'Explore' on deep links.
  const explicitFrom = (location.state as { from?: string } | null)?.from;
  const from = explicitFrom ?? (previousPath ? pageNameFromPath(previousPath) : 'Explore');

  return (
    <header className={styles.topbar}>
      <button className={styles.backBtn} onClick={() => navigate(-1)} aria-label={`Back to ${from}`}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 18-6-6 6-6" />
        </svg>
        <span>{from}</span>
      </button>

      {tabs && (
        <>
          <span className={styles.topbarDivider} aria-hidden="true" />
          <div className={styles.topbarTabs} role="tablist" aria-label="Digest views">
            {tabs}
          </div>
        </>
      )}

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
