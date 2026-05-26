import { useNavigate } from 'react-router-dom';
import type { User } from '../../../types';
import { timeAgo } from '../../../utils/timeAgo';
import styles from './AuthorRow.module.css';

function IconHeart({ filled }: { filled: boolean }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function IconVerified() {
  return (
    <svg className={styles.verified} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 1.5 14.2 4l3.3-.5.8 3.2L21 9l-1.4 3 1 3.1-3 1.7-.6 3.3-3.3-.4-2.7 2-2.7-2-3.3.4L4.4 17 1.4 15l1-3.1L1 9l2.7-1.3.8-3.2L7.8 4 12 1.5z" />
      <path d="m8.5 12 2.5 2.5 4.5-5" stroke="#fff" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

interface Props {
  author: User;
  createdAt: string;
  likeCount: number;
  isLikedByMe: boolean;
  onLike: (e: React.MouseEvent) => void;
}

export default function AuthorRow({ author, createdAt, likeCount, isLikedByMe, onLike }: Props) {
  const navigate = useNavigate();
  const initials = author.displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className={styles.row}>
      <span
        className={styles.avatar}
        onClick={(e) => { e.stopPropagation(); navigate(`/profile/${author.username}`); }}
        aria-hidden="true"
      >
        {initials}
      </span>
      <span
        className={styles.name}
        onClick={(e) => { e.stopPropagation(); navigate(`/profile/${author.username}`); }}
      >
        {author.displayName}
        {author.role === 'VERIFIED' && <IconVerified />}
      </span>
      <span className={styles.sep}>·</span>
      <span className={styles.time}>{timeAgo(createdAt)}</span>
      <button
        className={`${styles.likes} ${isLikedByMe ? styles.liked : ''}`}
        onClick={onLike}
        aria-label="Like"
      >
        <IconHeart filled={isLikedByMe} />
        {likeCount.toLocaleString()}
      </button>
    </div>
  );
}
