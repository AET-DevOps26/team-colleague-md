import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { useAuthModal } from '../../../contexts/ModalContext';
import styles from './BottomBar.module.css';

interface BottomBarProps {
  likeCount: number;
  isLikedByMe: boolean;
  isBookmarkedByMe: boolean;
  commentCount: number;
  onLike: () => void;
  onBookmark: () => void;
  onShare: () => void;
  onScrollToComments: () => void;
  /** When false, the comment composer and jump-to-comments button are hidden (comments not yet wired). */
  showComments?: boolean;
}

export default function BottomBar({
  likeCount,
  isLikedByMe,
  isBookmarkedByMe,
  commentCount,
  onLike,
  onBookmark,
  onShare,
  onScrollToComments,
  showComments = true,
}: BottomBarProps) {
  const { isLoggedIn, user } = useAuth();
  const { open: openAuth } = useAuthModal();
  const [expanded, setExpanded] = useState(false);
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (composerRef.current && !composerRef.current.contains(e.target as Node)) {
        setExpanded(false);
      }
    }
    if (expanded) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [expanded]);

  function handleComposerClick() {
    if (!isLoggedIn) {
      openAuth('login');
      return;
    }
    setExpanded(true);
    setTimeout(() => textareaRef.current?.focus(), 50);
  }

  function handleLike() {
    if (!isLoggedIn) { openAuth('login'); return; }
    onLike();
  }

  function handleBookmark() {
    if (!isLoggedIn) { openAuth('login'); return; }
    onBookmark();
  }

  const initials = user?.displayName.slice(0, 2).toUpperCase() ?? '';

  return (
    <div className={styles.bar}>
      {/* Comment composer */}
      {showComments && (isLoggedIn ? (
        <div
          ref={composerRef}
          className={`${styles.composer} ${expanded ? styles.composerExpanded : ''}`}
          onClick={!expanded ? handleComposerClick : undefined}
        >
          <div className={styles.composerRow1}>
            <div className={styles.composerAvatar}>{initials}</div>
            {expanded ? (
              <textarea
                ref={textareaRef}
                className={styles.composerTextarea}
                placeholder="Write a comment…"
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={3}
              />
            ) : (
              <span className={styles.composerPlaceholder}>Write a comment…</span>
            )}
          </div>

          {expanded && (
            <div className={styles.composerFoot}>
              <span className={styles.charCount}>{text.length}/500</span>
              <button
                className={`${styles.sendCta} ${!text.trim() ? styles.sendDisabled : ''}`}
                type="button"
                disabled={!text.trim()}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m22 2-7 20-4-9-9-4 20-7z" />
                </svg>
                Comment
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className={styles.composerSignin}>
          <span>Join the discussion</span>
          <button className={styles.composerSigninCta} onClick={() => openAuth('login')} type="button">
            Sign in to comment
          </button>
        </div>
      ))}

      {/* Actions pill */}
      <div className={styles.pill}>
        {showComments && (
          <>
            <button className={styles.act} onClick={onScrollToComments} type="button" aria-label="Jump to comments">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <span>{commentCount}</span>
            </button>

            <span className={styles.sep} />
          </>
        )}

        <button
          className={`${styles.act} ${isLikedByMe ? styles.actOn : ''}`}
          onClick={handleLike}
          type="button"
          aria-label="Like"
        >
          <svg viewBox="0 0 24 24" fill={isLikedByMe ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          <span>{likeCount}</span>
        </button>

        <span className={styles.sep} />

        <button
          className={`${styles.act} ${isBookmarkedByMe ? styles.actOn : ''}`}
          onClick={handleBookmark}
          type="button"
          aria-label="Save"
        >
          <svg viewBox="0 0 24 24" fill={isBookmarkedByMe ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
          <span>Save</span>
        </button>

        <span className={styles.sep} />

        <button className={styles.act} onClick={onShare} type="button" aria-label="Copy link">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <path d="m16 6-4-4-4 4" />
            <path d="M12 2v14" />
          </svg>
          <span>Share</span>
        </button>
      </div>
    </div>
  );
}
