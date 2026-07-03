import { useRef, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { PostDetail as PostDetailType } from '../../types';
import { contentService } from '../../services/content.service';
import { useReadingProgress } from '../../hooks/useReadingProgress';
import { useAuth } from '../../hooks/useAuth';
import { useAuthModal } from '../../contexts/ModalContext';
import { useToast } from '../../hooks/useToast';
import PostDetailTopbar from '../../components/layout/PostDetailTopbar';
import Markdown from '../../components/ui/Markdown';
import styles from './DigestPost.module.css';

/** Best-effort display domain from a source URL (e.g. `https://arxiv.org/abs/…` → `arxiv.org`). */
function displayDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export default function DigestPost() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const { open: openAuth } = useAuthModal();
  const { showToast } = useToast();
  const articleRef = useRef<HTMLElement>(null);
  const progress = useReadingProgress(articleRef);

  const [post, setPost] = useState<PostDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [followedCount, setFollowedCount] = useState<number | null>(null);

  useEffect(() => {
    if (!id) { navigate('/digest'); return; }
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    contentService.getPost(id)
      .then((p) => { if (!cancelled) setPost(p); })
      // A personal digest fetched by a non-target caller (or anonymous) 404s (ADR-0016).
      .catch(() => { if (!cancelled) setNotFound(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id, navigate]);

  // Personalisation note count — only relevant when logged in.
  useEffect(() => {
    if (!isLoggedIn) { setFollowedCount(null); return; }
    let cancelled = false;
    contentService.getFollowedTopicIds()
      .then((ids) => { if (!cancelled) setFollowedCount(ids.size); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [isLoggedIn]);

  const [saved, setSaved] = useState(false);
  useEffect(() => { if (post) setSaved(post.isBookmarkedByMe); }, [post]);

  function handleSave() {
    if (!post) return;
    if (!isLoggedIn) { openAuth('login'); return; }
    const next = !saved;
    setSaved(next);
    contentService.toggleBookmark(post.id, next)
      .then(() => showToast(next
        ? { variant: 'success', message: 'Digest saved' }
        : { variant: 'info', message: 'Removed from saved' }))
      .catch(() => {
        setSaved(!next);
        showToast({ variant: 'error', message: 'Could not update bookmark' });
      });
  }

  function handleShare() {
    navigator.clipboard.writeText(window.location.href)
      .then(() => showToast({ variant: 'success', message: 'Link copied to clipboard' }));
  }

  if (loading) {
    return (
      <>
        <PostDetailTopbar />
        <div className={styles.loading}>Loading…</div>
      </>
    );
  }

  if (notFound || !post) {
    return (
      <>
        <PostDetailTopbar />
        <div className={styles.notFound}>
          <h1>Digest not available</h1>
          <p>This digest is private or no longer exists.</p>
          <button className={styles.notFoundCta} onClick={() => navigate('/digest')}>
            Back to Digest
          </button>
        </div>
      </>
    );
  }

  const dateStr = new Date(post.createdAt).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  return (
    <>
      {/* Reading progress bar */}
      <div className={styles.readingProgress}>
        <div className={styles.readingBar} style={{ width: `${progress}%` }} />
      </div>

      <PostDetailTopbar />

      <div className={styles.readerCol}>
        <article className={styles.reader} ref={articleRef}>

          {/* Header */}
          <div className={styles.header}>
            <div className={styles.byline}>
              <div className={styles.aiBadge}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" />
                </svg>
                Verita AI Digest
              </div>
              <div className={styles.date}>
                <span>{dateStr}</span>
                <span className={styles.dotSep}>·</span>
                <span className={styles.readTime}>~{post.readTimeMinutes} min read</span>
              </div>
            </div>

            <h1 className={styles.title}>{post.title}</h1>

            {post.topics.length > 0 && (
              <div className={styles.topicPills}>
                <span className={styles.topicPillsLabel}>Topics</span>
                {post.topics.map((t) => (
                  <span key={t.id} className={styles.topicPill}>#{t.name}</span>
                ))}
              </div>
            )}
          </div>

          {/* Personalisation note (logged-in) / auth upsell (logged-out) */}
          {isLoggedIn ? (
            <div className={styles.personalizationNote}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
              </svg>
              <span>
                Personalised from <strong>{followedCount ?? 0} subscribed {followedCount === 1 ? 'topic' : 'topics'}</strong>.{' '}
                <a onClick={() => navigate('/topics')}>Manage subscriptions →</a>
              </span>
            </div>
          ) : (
            <div className={styles.authUpsell}>
              <div className={styles.authUpsellText}>
                <strong>Get a digest built for you</strong>
                <span>Subscribe to topics and authors — Verita AI curates your daily briefing from what you actually follow.</span>
              </div>
              <div className={styles.authUpsellActions}>
                <button className={styles.upsellBtnGhost} onClick={() => openAuth('login')}>Log in</button>
                <button className={styles.upsellBtnPrimary} onClick={() => openAuth('signup')}>Create account</button>
              </div>
            </div>
          )}

          {/* Body (Markdown, ADR-0017) */}
          <Markdown>{post.content}</Markdown>

          {/* Sources — flat list (ADR-0017) */}
          {post.sources.length > 0 && (
            <div className={styles.sources}>
              <div className={styles.sourcesLabel}>Sources</div>
              <ul className={styles.sourcesList}>
                {post.sources.map((s, i) => (
                  <li key={i}>
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className={styles.sourceLink}>
                      {displayDomain(s.url)}
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Footer */}
          <div className={styles.footer}>
            <div className={styles.footerLeft}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
              </svg>
              <span>Generated by Verita AI from posts across your subscribed topics.</span>
            </div>
            {isLoggedIn && (
              <button className={styles.manageLink} onClick={() => navigate('/topics')}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5h0a1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
                </svg>
                Manage Digest
              </button>
            )}
          </div>

        </article>
      </div>

      {/* Floating bottom bar — Save + Share (per digest design mock) */}
      <div className={styles.bottomBar}>
        <div className={styles.actionsPill}>
          <button
            className={`${styles.cact} ${saved ? styles.cactOn : ''}`}
            onClick={handleSave}
            type="button"
            aria-label="Save digest"
          >
            <svg viewBox="0 0 24 24" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
            <span>{isLoggedIn ? 'Save' : 'Sign in to save'}</span>
          </button>
          <span className={styles.cactSep} />
          <button className={styles.cact} onClick={handleShare} type="button" aria-label="Share digest">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <path d="m16 6-4-4-4 4" />
              <path d="M12 2v14" />
            </svg>
            <span>Share</span>
          </button>
        </div>
      </div>
    </>
  );
}
