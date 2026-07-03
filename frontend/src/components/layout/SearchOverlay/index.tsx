import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { FormEvent } from 'react';
import { getRecentSearches, clearRecentSearches } from '../../../utils/recentSearches';
import { contentService } from '../../../services/content.service';
import styles from './SearchOverlay.module.css';

function IconBack() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </svg>
  );
}

function IconSearch() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function IconClear() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function IconBolt() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  );
}

const CLOSE_MS = 240;

interface Props {
  open: boolean;
  initialQuery: string;
  onClose: () => void;
  onSubmit: (query: string) => void;
}

/**
 * Full-viewport search surface (Verita Transition.html §2.6): an opaque panel that fully
 * occludes the page behind it. Static chips, not live type-ahead — Recent comes from
 * localStorage, Trending reuses available topics. Submitting navigates to the results page.
 */
export default function SearchOverlay({ open, initialQuery, onClose, onSubmit }: Props) {
  const [value, setValue] = useState(initialQuery);
  const [recent, setRecent] = useState<string[]>([]);
  const [trending, setTrending] = useState<{ id: string; name: string; displayName: string }[]>([]);
  // Keep the panel mounted through its close transition (opacity-only fade, §2.6).
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const raf = requestAnimationFrame(() => setShown(true));
      return () => cancelAnimationFrame(raf);
    }
    setShown(false);
    const t = setTimeout(() => setMounted(false), CLOSE_MS);
    return () => clearTimeout(t);
  }, [open]);

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

  if (!mounted) return null;

  function submit(query: string) {
    const trimmed = query.trim();
    if (trimmed) onSubmit(trimmed);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    submit(value);
  }

  function clearRecent() {
    clearRecentSearches();
    setRecent([]);
  }

  const trimmed = value.trim();
  const visibleTrending = trending.slice(0, 12);
  const bothEmpty = recent.length === 0 && visibleTrending.length === 0;

  return createPortal(
    <div
      className={`${styles.overlay} ${shown ? styles.open : styles.closing}`}
      role="dialog"
      aria-label="Search"
      aria-modal="true"
      data-testid="search-overlay"
    >
      <div className={styles.bar}>
        <button type="button" className={styles.back} onClick={onClose} aria-label="Close search">
          <IconBack />
        </button>
        <form className={styles.inputForm} onSubmit={handleSubmit} role="search">
          <div className={styles.inputWrap}>
            <IconSearch />
            <input
              ref={inputRef}
              className={styles.input}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Search Verita — papers, people, topics, ideas…"
              aria-label="Search"
            />
            {value && (
              <button type="button" className={styles.clear} onClick={() => { setValue(''); inputRef.current?.focus(); }} aria-label="Clear search">
                <IconClear />
              </button>
            )}
          </div>
          <button type="submit" className={styles.submit} disabled={!trimmed}>
            Search
          </button>
        </form>
      </div>

      <div className={styles.body}>
        <div className={styles.suggestions}>
          {recent.length > 0 && (
            <section>
              <div className={styles.sectionHead}>
                <div className={styles.sectionLabel}>Recent</div>
                <button type="button" className={styles.clearRecent} onClick={clearRecent}>
                  Clear
                </button>
              </div>
              <div className={styles.chips}>
                {recent.map((r) => (
                  <button key={r} type="button" className={styles.chip} onClick={() => submit(r)}>
                    <IconSearch />
                    {r}
                  </button>
                ))}
              </div>
            </section>
          )}

          {visibleTrending.length > 0 && (
            <section>
              <div className={styles.sectionLabel}>Trending</div>
              <div className={styles.chips}>
                {visibleTrending.map((t) => (
                  <button key={t.id} type="button" className={styles.chip} onClick={() => submit(t.name)}>
                    <IconBolt />
                    {t.displayName}
                  </button>
                ))}
              </div>
            </section>
          )}

          {bothEmpty && (
            <p className={styles.emptyState}>Type a keyword to start searching.</p>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
