import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { useAuthModal } from '../../../contexts/ModalContext';
import type { Post } from '../../../types';
import AuthorRow from '../../ui/AuthorRow';
import styles from './ImageCard.module.css';

interface Props {
  post: Post;
  onLike: (id: string) => void;
  topRightOverlay?: React.ReactNode;
  className?: string;
}

export default function ImageCard({ post, onLike, topRightOverlay, className }: Props) {
  const { isLoggedIn } = useAuth();
  const { open: openAuth } = useAuthModal();
  const navigate = useNavigate();
  const typeBadge = post.topics[0]?.name ?? 'Article';

  function handleLike(e: React.MouseEvent) {
    e.stopPropagation();
    if (!isLoggedIn) { openAuth('login'); return; }
    onLike(post.id);
  }

  return (
    <article
      className={`${styles.card}${className ? ` ${className}` : ''}`}
      onClick={() => navigate(`/post/${post.id}`)}
      data-testid="image-card"
    >
      <div className={styles.cover}>
        <img src={post.coverImageUrl} alt="" className={styles.coverImg} />
        <span className={styles.badgeTl}>{typeBadge}</span>
        {topRightOverlay ?? (post.readTimeMinutes ? (
          <span className={styles.badgeTr}>{post.readTimeMinutes} min read</span>
        ) : null)}
      </div>
      <div className={styles.body}>
        <h2 className={styles.title}>{post.title}</h2>
          <AuthorRow
          author={post.author}
          createdAt={post.createdAt}
          likeCount={post.likeCount}
          isLikedByMe={post.isLikedByMe}
          onLike={handleLike}
        />
      </div>
    </article>
  );
}
