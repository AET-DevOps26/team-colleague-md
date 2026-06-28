import { useRef, useState, useEffect } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { useAuthModal } from '../../../contexts/ModalContext';
import { addRecentSearch } from '../../../utils/recentSearches';
import SearchOverlay from '../SearchOverlay';
import Avatar from '../../ui/Avatar';
import styles from './Topbar.module.css';

function IconSearch() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

interface TopbarProps {
  bottomRow?: ReactNode;
}

export default function Topbar({ bottomRow }: TopbarProps) {
  const { isLoggedIn, user } = useAuth();
  const { open: openAuth } = useAuthModal();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [overlayQuery, setOverlayQuery] = useState('');

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 6);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  function runSearch(query: string) {
    const q = query.trim();
    setOverlayOpen(false);
    if (q) {
      addRecentSearch(q);
      navigate(`/search?q=${encodeURIComponent(q)}`);
    } else {
      navigate('/');
    }
  }

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    runSearch(inputRef.current?.value ?? '');
  }

  return (
    <header
      className={styles.topbar}
      data-scrolled={scrolled || undefined}
      data-testid="topbar"
    >
      <div className={styles.row1} data-testid="topbar-search-row">
        <form className={styles.search} onSubmit={handleSearch} role="search">
          <IconSearch />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search Verita — papers, people, topics, ideas…"
            aria-label="Search"
            onClick={() => { setOverlayQuery(inputRef.current?.value ?? ''); setOverlayOpen(true); }}
          />
        </form>
        <div className={styles.topbarRight}>
          {isLoggedIn && user ? (
            <Link to={`/profile/${user.username}`} className={styles.avatarBtn} aria-label="Your profile">
              <Avatar displayName={user.displayName} avatarUrl={user.avatarUrl} size={44} borderRadius={12} />
            </Link>
          ) : (
            <button className={styles.signinBtn} onClick={() => openAuth('login')}>
              Sign in
            </button>
          )}
        </div>
      </div>
      {bottomRow && (
        <div className={styles.row2} data-testid="topbar-topic-row">
          {bottomRow}
        </div>
      )}
      <SearchOverlay
        open={overlayOpen}
        initialQuery={overlayQuery}
        onClose={() => setOverlayOpen(false)}
        onSubmit={runSearch}
      />
    </header>
  );
}
