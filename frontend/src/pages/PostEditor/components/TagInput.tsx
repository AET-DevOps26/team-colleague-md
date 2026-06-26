import { useEffect, useRef, useState } from 'react';
import type { TopicItem } from '../../../types';
import styles from '../PostEditor.module.css';

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  searchTopics: (q: string) => Promise<TopicItem[]>;
  max?: number;
}

/** Normalise free text into a Topic name slug (matches the design's rules). */
function normalizeTag(value: string): string {
  return value.trim().replace(/^#+/, '').toLowerCase().replace(/\s+/g, '-');
}

const DEBOUNCE_MS = 200;

/**
 * Topic ("tags") entry: chips with removal, debounced autocomplete against
 * content-service `/topics/search`, click-to-add suggestions, and Enter to
 * create a brand-new topic when none matches.
 */
export default function TagInput({ tags, onChange, searchTopics, max = 10 }: TagInputProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<TopicItem[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    let active = true;
    // Flag "searching" the instant the user types so the dropdown opens with feedback
    // rather than appearing to do nothing until the debounced request resolves.
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const results = await searchTopics(q);
        if (active) setSuggestions(results.filter((t) => !tags.includes(t.name)));
      } catch {
        if (active) setSuggestions([]);
      } finally {
        if (active) setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, tags, searchTopics]);

  function addTag(raw: string) {
    const slug = normalizeTag(raw);
    if (slug && !tags.includes(slug) && tags.length < max) {
      onChange([...tags, slug]);
    }
    setQuery('');
    setSuggestions([]);
  }

  function removeTag(name: string) {
    onChange(tags.filter((t) => t !== name));
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (query.trim()) addTag(query);
    } else if (e.key === 'Backspace' && query === '' && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  }

  return (
    <div className={styles.tagsField}>
      <div className={styles.tagsWrap} onClick={() => inputRef.current?.focus()}>
        {tags.map((t) => (
          <span key={t} className={styles.tagChip}>
            #{t}
            <button
              type="button"
              className={styles.tagChipRemove}
              aria-label={`Remove ${t}`}
              onClick={(e) => {
                e.stopPropagation();
                removeTag(t);
              }}
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          className={styles.tagsInput}
          type="text"
          value={query}
          placeholder="Add tags… (Enter or comma to confirm)"
          aria-label="Add tags"
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
        />
      </div>
      {query.trim() && (loading || suggestions.length > 0) && (
        <ul className={styles.tagSuggestions} role="listbox">
          {loading && suggestions.length === 0 ? (
            <li className={styles.tagSuggestionStatus} aria-live="polite">
              Searching…
            </li>
          ) : (
            suggestions.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={false}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => addTag(s.name)}
                >
                  {s.displayName ?? s.name}
                  <span className={styles.tagSuggestionSlug}>#{s.name}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
