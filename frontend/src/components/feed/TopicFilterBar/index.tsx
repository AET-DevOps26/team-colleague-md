import { useEffect, useState } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { contentService } from '../../../services/content.service';
import styles from './TopicFilterBar.module.css';

interface Props {
  activeTopic: string | null;
  onTopicChange: (topic: string | null) => void;
}

type TopicChip = { id: string; name: string; displayName: string };

export default function TopicFilterBar({ activeTopic, onTopicChange }: Props) {
  const { isLoggedIn } = useAuth();
  const [topics, setTopics] = useState<TopicChip[]>([]);

  useEffect(() => {
    let cancelled = false;
    contentService
      .getAvailableTopics()
      .then((t) => { if (!cancelled) setTopics(t); })
      .catch(() => { if (!cancelled) setTopics([]); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className={styles.tagbar}>
      <button
        className={`${styles.chip} ${activeTopic === null ? styles.active : ''}`}
        onClick={() => onTopicChange(null)}
      >
        {isLoggedIn ? 'For you' : 'Trending'}
      </button>
      {topics.map((topic) => (
        <button
          key={topic.id}
          className={`${styles.chip} ${activeTopic === topic.name ? styles.active : ''}`}
          onClick={() => onTopicChange(topic.name)}
        >
          {topic.displayName}
        </button>
      ))}
    </div>
  );
}
