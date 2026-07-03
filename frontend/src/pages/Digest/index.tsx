import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useAuthModal } from '../../contexts/ModalContext';
import { contentService } from '../../services/content.service';
import type { TodayDigest } from '../../types';
import PostDetailTopbar from '../../components/layout/PostDetailTopbar';
import PastDigests from './PastDigests';
import styles from './Digest.module.css';

// Topic-Subscription management lives on the standalone Topic page now (ADR-0014); Digest is a
// single Past-Digests view with no tab bar.
export default function Digest() {
  const { isLoggedIn } = useAuth();


  if (!isLoggedIn) {
    return (
      <>
        <PostDetailTopbar />
        <div className={styles.content}>
          <LoggedOutDigest />
        </div>
      </>
    );
  }

  return (
    <>
      <PostDetailTopbar />
      <div className={styles.content}>
        <PastDigests />
      </div>
    </>
  );
}

/**
 * Logged-out surface: today's public digest (ADR-0016) as a readable hero, plus an auth upsell.
 * Falls back to a plain sign-in hero when no public digest exists.
 */
function LoggedOutDigest() {
  const navigate = useNavigate();
  const { open: openAuth } = useAuthModal();
  const [publicDigest, setPublicDigest] = useState<TodayDigest | null>(null);

  useEffect(() => {
    let cancelled = false;
    contentService.getPublicTodayDigest()
      .then((d) => { if (!cancelled) setPublicDigest(d); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });

  return (
    <div className={styles.pastDigestsWrap}>
      {publicDigest && (
        <div className={styles.todayHero}>
          <div className={styles.todayHeroInner}>
            <div className={styles.todayHeroText}>
              <div className={styles.todayLabel}>
                <span className={styles.todayLabelDot} />
                Today · {todayFormatted}
              </div>
              <div className={styles.todayTitle}>{publicDigest.title}</div>
              <div className={styles.todaySubtitle}>{publicDigest.topStorySubtitle}</div>
              <div className={styles.todayMeta}>
                <span>{publicDigest.eventCount} events</span>
                <span className={styles.todayMetaDot}>·</span>
                <span>~{publicDigest.readTimeMinutes} min read</span>
              </div>
            </div>
            <button
              className={styles.todayCta}
              onClick={() => navigate(`/digest/${publicDigest.id}`, { state: { from: 'Digest' } })}
            >
              Read{' '}
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <div className={styles.signinHero}>
        <div>
          <div className={styles.signinHeroEyebrow}>
            <span className={styles.signinHeroEyebrowDot} />
            AI Daily Digest
          </div>
          <div className={styles.signinHeroTitle}>Your personalised digest awaits</div>
          <div className={styles.signinHeroSub}>
            Sign in to get a daily briefing on AI news and research tailored to your topics.
          </div>
        </div>
        <div className={styles.signinHeroActions}>
          <button className={styles.signinHeroBtnPrimary} onClick={() => openAuth('login')}>
            Log in
          </button>
          <button className={styles.signinHeroBtnGhost} onClick={() => openAuth('signup')}>
            Create account
          </button>
        </div>
      </div>
    </div>
  );
}
