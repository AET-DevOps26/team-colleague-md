import { useState, useEffect, useRef } from 'react';
import type { FormEvent } from 'react';
import { getRecentSearches } from '../../../utils/recentSearches';
import { contentService } from '../../../services/content.service';
import styles from './SearchOverlay.module.css';

function IconSearch() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

interface Props {
  open: boolean;
  initialQuery: string;
  onClose: () => void;
  onSubmit: (query: string) => void;
}

/**
 * Full-viewport search surface (PRD §3.6): static chips, not live type-ahead. Recent searches
 * come from localStorage; trending chips are topic names. Submitting navigates to the results page.
 */
export default function SearchOverlay({ open, initialQuery, onClose, onSubmit }: Props) {
  const [value, setValue] = useState(initialQuery);
  const [recent, setRecent] = useState<string[]>([]);
  const [trending, setTrending] = useState<{ id: string; name: string; displayName: string }[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setValue(initialQuery);
    setRecent(getRecentSearches());
    contentService.getAvailableTopics().then(setTrending).catch(() => setTrending([]));
    const t = setTimeout(() => inputRef.current?.focus(), 0);
    return () => clearTimeout(t);
  }, [open, initialQuery]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  function submit(query: string) {
    const trimmed = query.trim();
    if (trimmed) onSubmit(trimmed);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    submit(value);
  }

  return (
    <div className={styles.overlay} role="dialog" aria-label="Search" data-testid="search-overlay">
      <div className={styles.backdrop} onClick={onClose} />
      <div className={styles.panel}>
        <form className={styles.searchBar} onSubmit={handleSubmit} role="search">
          <IconSearch />
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Search Verita — papers, people, topics, ideas…"
            aria-label="Search"
          />
          <button type="button" className={styles.escBtn} onClick={onClose} aria-label="Close search">
            Esc
          </button>
        </form>

        {recent.length > 0 && (
          <div className={styles.section}>
            <div className={styles.sectionLabel}>Recent</div>
            <div className={styles.chips}>
              {recent.map((r) => (
                <button key={r} type="button" className={styles.chip} onClick={() => submit(r)}>
                  {r}
                </button>
              ))}
            </div>
          </div>
        )}

        {trending.length > 0 && (
          <div className={styles.section}>
            <div className={styles.sectionLabel}>Trending</div>
            <div className={styles.chips}>
              {trending.slice(0, 12).map((t) => (
                <button key={t.id} type="button" className={styles.chip} onClick={() => submit(t.name)}>
                  #{t.displayName}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
