import { useAuth } from '../../../hooks/useAuth';
import { contentService } from '../../../services/content.service';
import styles from './TopicFilterBar.module.css';

interface Props {
  activeTopic: string | null;
  onTopicChange: (topic: string | null) => void;
}

export default function TopicFilterBar({ activeTopic, onTopicChange }: Props) {
  const { isLoggedIn } = useAuth();
  const topics = contentService.getAvailableTopics();

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
          {topic.name}
        </button>
      ))}
    </div>
  );
}
