import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { contentService } from '../../../services/content.service';
import styles from './DigestCard.module.css';

export default function DigestCard() {
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const digest = contentService.getTodayDigest();

  const dateLabel = new Date(digest.date + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  function handleClick() {
    navigate(`/digest/${digest.date}`);
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
      <h2 className={styles.title}>
        {isLoggedIn ? digest.title : "Today's Top Reads in AI Research"}
      </h2>
      <div className={styles.divider} />
      <ul className={styles.bullets}>
        {isLoggedIn ? (
          <>
            <li>{digest.topStorySubtitle}</li>
            <li>{digest.eventCount} papers and discussions curated today</li>
            <li>Personalized to your interests</li>
          </>
        ) : (
          <>
            <li>Most-saved today: circuit-level evidence of skill induction in 70B models.</li>
            <li>Top discussion: does RLHF scale, or is it hitting a ceiling?</li>
            <li>Trending: a new SAE paper on refusal features.</li>
          </>
        )}
      </ul>
      <span className={styles.cta}>
        {isLoggedIn ? 'Read digest' : "Browse today's digest"}
        <span className={styles.arrow}>→</span>
      </span>
    </article>
  );
}
