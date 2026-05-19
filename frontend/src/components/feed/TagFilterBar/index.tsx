import { useAuth } from '../../../hooks/useAuth';
import { contentService } from '../../../services/content.service';
import styles from './TagFilterBar.module.css';

interface Props {
  activeTag: string | null;
  onTagChange: (tag: string | null) => void;
}

export default function TagFilterBar({ activeTag, onTagChange }: Props) {
  const { isLoggedIn } = useAuth();
  const tags = contentService.getAvailableTags();

  return (
    <div className={styles.tagbar}>
      <button
        className={`${styles.chip} ${activeTag === null ? styles.active : ''}`}
        onClick={() => onTagChange(null)}
      >
        {isLoggedIn ? 'For you' : 'Trending'}
      </button>
      {tags.map((tag) => (
        <button
          key={tag.id}
          className={`${styles.chip} ${activeTag === tag.name ? styles.active : ''}`}
          onClick={() => onTagChange(tag.name)}
        >
          {tag.name}
        </button>
      ))}
    </div>
  );
}
