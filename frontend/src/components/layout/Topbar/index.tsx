import { useRef, useState, useEffect } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { useAuthModal } from '../../../contexts/ModalContext';
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

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 6);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    const q = inputRef.current?.value.trim();
    if (q) navigate(`/search?q=${encodeURIComponent(q)}`);
    else navigate('/');
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
          />
        </form>
        <div className={styles.topbarRight}>
          {isLoggedIn && user ? (
            <Link to={`/profile/${user.username}`} className={styles.avatarBtn} aria-label="Your profile" />
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
    </header>
  );
}
