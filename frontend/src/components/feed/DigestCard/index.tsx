import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { useAuthModal } from '../../../contexts/ModalContext';
import { contentService } from '../../../services/content.service';
import styles from './DigestCard.module.css';

export default function DigestCard() {
  const { isLoggedIn } = useAuth();
  const { open: openAuth } = useAuthModal();
  const navigate = useNavigate();
  const digest = contentService.getTodayDigest();

  function handleClick() {
    if (!isLoggedIn) { openAuth('login'); return; }
    navigate(`/digest/${digest.date}`);
  }

  return (
    <article
      className={styles.card}
      onClick={handleClick}
      data-testid="digest-card"
    >
      <div className={styles.label}>
        {isLoggedIn ? 'Your Digest' : 'Community Digest'} · {digest.date}
      </div>
      <div className={styles.sublabel}>
        {digest.eventCount} picks · {digest.readTimeMinutes} min read
      </div>
      <h2 className={styles.title}>
        {isLoggedIn ? digest.title : "What Everyone's Reading This Week"}
      </h2>
      <div className={styles.divider} />
      <ul className={styles.bullets}>
        {isLoggedIn ? (
          <>
            <li>{digest.topStorySubtitle}</li>
            <li>{digest.eventCount} events across AI research this week</li>
          </>
        ) : (
          <>
            <li>The most-saved paper: circuit-level evidence of skill induction in 70B models.</li>
            <li>Top debate: does RLHF scale, or is it hitting a ceiling?</li>
            <li>Most-viewed: a new SAE paper on refusal features.</li>
          </>
        )}
      </ul>
      <span className={styles.cta}>
        {isLoggedIn ? 'Read digest' : 'Sign in to read'}
        <span className={styles.arrow}>→</span>
      </span>
    </article>
  );
}
