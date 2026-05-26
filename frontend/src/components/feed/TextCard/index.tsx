import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { useAuthModal } from '../../../contexts/ModalContext';
import type { Post } from '../../../types';
import AuthorRow from '../../ui/AuthorRow';
import styles from './TextCard.module.css';

interface Props {
  post: Post;
  onLike: (id: string) => void;
  onTagClick: (tag: string) => void;
}

export default function TextCard({ post, onLike, _onTagClick }: Props) {
  const { isLoggedIn } = useAuth();
  const { open: openAuth } = useAuthModal();
  const navigate = useNavigate();
  const eyebrow = post.tags[0]?.name?.toUpperCase() ?? 'ARTICLE';

  function handleLike(e: React.MouseEvent) {
    e.stopPropagation();
    if (!isLoggedIn) { openAuth('login'); return; }
    onLike(post.id);
  }

  return (
    <article
      className={styles.card}
      onClick={() => navigate(`/post/${post.id}`)}
      data-testid="text-card"
    >
      <div className={styles.cream}>
        <span className={styles.eyebrow}>{eyebrow}</span>
        <blockquote className={styles.pullQuote}>{post.excerpt}</blockquote>
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
