import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { useAuthModal, useSettingsModal } from '../../../contexts/ModalContext';
import styles from './Sidebar.module.css';

function IconExplore() {
  return (
    <svg className={styles.ico} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="m14.5 9.5-2 5-5 2 2-5 5-2z" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconDigest() {
  return (
    <svg className={styles.ico} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg className={styles.ico} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5h0a1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function IconSignIn() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <polyline points="10 17 15 12 10 7" />
      <line x1="15" y1="12" x2="3" y2="12" />
    </svg>
  );
}

interface SidebarProps {
  collapsed?: boolean;
}

export default function Sidebar({ collapsed = false }: SidebarProps) {
  const { isLoggedIn } = useAuth();
  const { open: openAuth } = useAuthModal();
  const { open: openSettings } = useSettingsModal();
  const { pathname } = useLocation();

  return (
    <aside
      className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}
      data-testid="sidebar"
    >
      <div className={styles.brand}>
        <div className={styles.brandWordmark}>
          <span className={styles.brandV}>V</span>
          <span className={styles.brandErita}>erita</span>
        </div>
      </div>

      <nav className={styles.nav} aria-label="Primary">
        <Link
          to="/"
          className={styles.navItem}
          aria-current={pathname === '/' ? 'page' : undefined}
        >
          <IconExplore />
          <span className={styles.label}>Explore</span>
        </Link>
        <Link
          to="/digest"
          className={styles.navItem}
          aria-current={pathname.startsWith('/digest') ? 'page' : undefined}
        >
          <IconDigest />
          <span className={styles.label}>Digest</span>
        </Link>
      </nav>

      <div className={styles.navSpacer} />

      {isLoggedIn ? (
        <Link to="/post/new" className={styles.navCta}>
          <IconPlus />
          <span className={styles.ctaLabel}>New post</span>
        </Link>
      ) : (
        <button
          className={styles.navSignin}
          onClick={() => openAuth('login')}
          data-testid="sidebar-signin"
        >
          <IconSignIn />
          <span className={styles.ctaLabel}>Sign in</span>
        </button>
      )}

      <div className={styles.navBottom}>
        <button
          className={`${styles.navItem} ${!isLoggedIn ? styles.disabled : ''}`}
          onClick={isLoggedIn ? openSettings : undefined}
          disabled={!isLoggedIn}
          aria-disabled={!isLoggedIn}
          data-testid="sidebar-settings"
        >
          <IconSettings />
          <span className={styles.label}>Settings</span>
        </button>
      </div>
    </aside>
  );
}
