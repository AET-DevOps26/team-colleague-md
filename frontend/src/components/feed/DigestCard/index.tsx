import { Link } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { useAuthModal } from '../../../contexts/ModalContext';
import { contentService } from '../../../services/content.service';
import styles from './DigestCard.module.css';

export default function DigestCard() {
  const { isLoggedIn } = useAuth();
  const { open: openAuth } = useAuthModal();
  const digest = contentService.getTodayDigest();

  if (!isLoggedIn) {
    return (
      <article className={styles.card}>
        <div className={styles.label}>Community Digest · {digest.date}</div>
        <h2 className={styles.title}>What Everyone's Reading This Week</h2>
        <ul className={styles.bullets}>
          <li>The most-saved paper this week: circuit-level evidence of skill induction in 70B models.</li>
          <li>Top debate: does RLHF scale, or is it hitting a ceiling? 400+ comments.</li>
          <li>Most-viewed: a new SAE paper on refusal features.</li>
        </ul>
        <button className={styles.cta} onClick={() => openAuth('login')}>
          Sign in to read
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </button>
      </article>
    );
  }

  return (
    <article className={styles.card}>
      <div className={styles.label}>Your Digest · {digest.date}</div>
      <h2 className={styles.title}>{digest.title}</h2>
      <ul className={styles.bullets}>
        <li>{digest.topStorySubtitle}</li>
        <li>{digest.eventCount} events · {digest.readTimeMinutes} min read</li>
      </ul>
      <Link to={`/digest/${digest.date}`} className={styles.ctaLink}>
        Read →
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </Link>
    </article>
  );
}
