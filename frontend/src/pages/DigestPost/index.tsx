import { useRef, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { DigestDetail } from '../../types';
import { contentService } from '../../services/content.service';
import { useReadingProgress } from '../../hooks/useReadingProgress';
import { useAuth } from '../../hooks/useAuth';
import { useAuthModal } from '../../contexts/ModalContext';
import { useToast } from '../../hooks/useToast';
import { timeAgo } from '../../utils/timeAgo';
import PostDetailTopbar from '../../components/layout/PostDetailTopbar';
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

  const [digest, setDigest] = useState<DigestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) { navigate('/digest'); return; }
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    contentService.getDigest(id)
      .then((d) => { if (!cancelled) setDigest(d); })
      // A personal digest fetched by a non-target caller (or anonymous) 404s (ADR-0016/0019).
      .catch(() => { if (!cancelled) setNotFound(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id, navigate]);

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

  if (notFound || !digest) {
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

  const dateStr = new Date(digest.date + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
  const isPublic = digest.digestType === 'PUBLIC';

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
                {isPublic ? 'Verita Community Digest' : 'Verita AI Digest'}
              </div>
              <div className={styles.date}>
                <span>{dateStr}</span>
                <span className={styles.dotSep}>·</span>
                <span className={styles.readTime}>~{digest.readTimeMinutes} min read</span>
                <span className={styles.dotSep}>·</span>
                <span>{digest.eventCount} {digest.eventCount === 1 ? 'event' : 'events'}</span>
              </div>
            </div>

            <h1 className={styles.title}>{digest.title}</h1>
            {/* Guard against seed/legacy digests that mirrored summary into subtitle,
                which rendered the same blurb twice (subtitle here + intro below). */}
            {digest.subtitle && digest.subtitle !== digest.summary && (
              <p className={styles.subtitle}>{digest.subtitle}</p>
            )}

            {/* Topic pills move into the personalisation note for logged-in readers. */}
            {!isLoggedIn && digest.topics.length > 0 && (
              <div className={styles.topicPills}>
                <span className={styles.topicPillsLabel}>Topics</span>
                {digest.topics.slice(0, 10).map((t) => (
                  <span key={t.id} className={styles.topicPill}>#{t.name}</span>
                ))}
              </div>
            )}
          </div>

          {/* Source-topics row (logged-in) / auth upsell (logged-out) */}
          {isLoggedIn ? (
            <div className={styles.topicSource}>
              <div className={styles.topicSourceHead}>
                <span className={styles.topicSourceLabel}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
                  </svg>
                  Generated from your topics
                </span>
                <a className={styles.topicSourceManage} onClick={() => navigate('/topics')}>Manage →</a>
              </div>
              {digest.topics.length > 0 && (
                <div className={styles.topicPills}>
                  {digest.topics.slice(0, 10).map((t) => (
                    <span key={t.id} className={styles.topicPill}>#{t.name}</span>
                  ))}
                </div>
              )}
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

          {/* Intro summary */}
          {digest.summary && <p className={styles.summaryIntro}>{digest.summary}</p>}

          {/* Structured event stream (ADR-0019) */}
          <div className={styles.eventStream}>
            {digest.events.map((event, i) => (
              <section key={i} className={styles.event}>
                <h2 className={styles.eventHeadline}>{event.headline}</h2>
                {event.summaryBullets.length > 0 && (
                  <ul className={styles.eventBullets}>
                    {event.summaryBullets.map((bullet, j) => <li key={j}>{bullet}</li>)}
                  </ul>
                )}
                {event.sources.length > 0 && (
                  <div className={styles.sourceChips}>
                    {event.sources.map((s, k) => (
                      <a
                        key={k}
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.sourceChip}
                        title={s.title ?? undefined}
                      >
                        <span className={styles.sourceChipName}>{s.sourceName || displayDomain(s.url)}</span>
                        {s.publishedAt && <span className={styles.sourceChipTime}>· {timeAgo(s.publishedAt)}</span>}
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                          <polyline points="15 3 21 3 21 9" />
                          <line x1="10" y1="14" x2="21" y2="3" />
                        </svg>
                      </a>
                    ))}
                  </div>
                )}
              </section>
            ))}
          </div>

          {/* Footer */}
          <div className={styles.footer}>
            <div className={styles.footerLeft}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
              </svg>
              <span>
                {isPublic
                  ? 'Generated by Verita AI from platform-wide trending topics.'
                  : 'Generated by Verita AI from posts across your subscribed topics.'}
              </span>
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

      {/* Floating bottom bar — Share only, for PUBLIC digests (a personal-digest link 404s for
          anyone else, so sharing is hidden there; ADR-0019). Save removed entirely. */}
      {isPublic && (
        <div className={styles.bottomBar}>
          <div className={styles.actionsPill}>
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
      )}
    </>
  );
}
