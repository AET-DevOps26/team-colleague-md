import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { contentService } from '../../../services/content.service';
import type { TodayDigest } from '../../../types';
import styles from './DigestCard.module.css';

export default function DigestCard() {
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [digest, setDigest] = useState<TodayDigest | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Logged-in users get their personalised "today" digest; guests get the public one (ADR-0016).
    const load = isLoggedIn
      ? contentService.getDigests().then((d) => d.today)
      : contentService.getPublicTodayDigest();
    load
      .then((d) => { if (!cancelled) setDigest(d); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [isLoggedIn]);

  // No digest today (e.g. generation pipeline not yet live) → the promo card simply hides.
  if (!digest) return null;

  const dateLabel = new Date(digest.date + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  function handleClick() {
    if (digest) navigate(`/digest/${digest.id}`);
  }

  return (
    <article
      className={styles.card}
      onClick={handleClick}
      data-testid="digest-card"
    >
      <div className={styles.label}>
        {isLoggedIn ? 'Your Digest' : 'Community Digest'} · {dateLabel}
      </div>
      <div className={styles.sublabel}>
        {digest.eventCount} picks · {digest.readTimeMinutes} min read
      </div>
      <h2 className={styles.title}>{digest.title}</h2>
      <div className={styles.divider} />
      <ul className={styles.bullets}>
        <li>{digest.topStorySubtitle}</li>
        <li>{digest.eventCount} papers and discussions curated today</li>
        <li>{isLoggedIn ? 'Personalised to your interests' : 'Platform-wide trending stories'}</li>
      </ul>
      <span className={styles.cta}>
        {isLoggedIn ? 'Read digest' : "Browse today's digest"}
        <span className={styles.arrow}>→</span>
      </span>
    </article>
  );
}
