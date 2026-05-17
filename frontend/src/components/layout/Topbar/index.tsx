import { useRef, FormEvent } from 'react';
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

function AvatarButton({ username }: { username: string }) {
  return (
    <Link to={`/profile/${username}`} className={styles.avatarBtn} aria-label="Your profile" />
  );
}

export default function Topbar() {
  const { isLoggedIn, user } = useAuth();
  const { open: openAuth } = useAuthModal();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    const q = inputRef.current?.value.trim();
    if (q) navigate(`/search?q=${encodeURIComponent(q)}`);
    else navigate('/');
  }

  return (
    <header className={styles.topbar}>
      <div className={styles.topbarRow}>
        <form className={styles.search} onSubmit={handleSearch} role="search">
          <IconSearch />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search Verita — papers, people, tags, ideas…"
            aria-label="Search"
          />
        </form>
        <div className={styles.topbarRight}>
          {isLoggedIn && user ? (
            <AvatarButton username={user.username} />
          ) : (
            <button className={styles.signinBtn} onClick={() => openAuth('login')}>
              Sign in
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
