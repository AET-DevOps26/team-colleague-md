import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { useFollowedTopics } from '../../../contexts/FollowedTopicsContext';
import { contentService } from '../../../services/content.service';
import styles from './TopicFilterBar.module.css';

interface Props {
  activeTopic: string | null;
  onTopicChange: (topic: string | null) => void;
}

type TopicChip = { id: string; name: string; displayName: string };

export default function TopicFilterBar({ activeTopic, onTopicChange }: Props) {
  const { isLoggedIn } = useAuth();
  const { followedTopics, categories } = useFollowedTopics();
  const [trending, setTrending] = useState<TopicChip[]>([]);

  // Trending chips back both the anonymous bar and the logged-in zero-subscription fallback.
  useEffect(() => {
    let cancelled = false;
    contentService
      .getAvailableTopics()
      .then((t) => { if (!cancelled) setTrending(t); })
      .catch(() => { if (!cancelled) setTrending([]); });
    return () => { cancelled = true; };
  }, []);

  // Recover each subscribed Topic's slug + display name by joining the subscription UUIDs against
  // the Topic catalog (ADR-0014). Preserve catalog order so the chips stay stable.
  const subscribed = useMemo<TopicChip[]>(() => {
    if (!isLoggedIn) return [];
    const chips: TopicChip[] = [];
    for (const cat of categories) {
      for (const t of cat.topics) {
        if (followedTopics.has(t.id)) chips.push({ id: t.id, name: t.name, displayName: t.displayName });
      }
    }
    return chips;
  }, [isLoggedIn, followedTopics, categories]);

  // Logged-in with subscriptions → your topics. Anonymous or zero-subscription → Trending,
  // with a nudge to go subscribe in the latter case (no empty bar).
  const hasSubscriptions = subscribed.length > 0;
  const chips = isLoggedIn && hasSubscriptions ? subscribed : trending;
  const showSubscribePrompt = isLoggedIn && !hasSubscriptions;

  return (
    <div className={styles.tagbar}>
      <button
        className={`${styles.chip} ${activeTopic === null ? styles.active : ''}`}
        onClick={() => onTopicChange(null)}
      >
        {isLoggedIn ? 'For you' : 'Trending'}
      </button>
      {chips.map((topic) => (
        <button
          key={topic.id}
          className={`${styles.chip} ${activeTopic === topic.name ? styles.active : ''}`}
          onClick={() => onTopicChange(topic.name)}
        >
          {topic.displayName}
        </button>
      ))}
      {showSubscribePrompt && (
        <Link className={styles.subscribePrompt} to="/topics">
          Follow your personal topics →
        </Link>
      )}
    </div>
  );
}
