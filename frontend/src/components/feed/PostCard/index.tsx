import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { useAuthModal } from '../../../contexts/ModalContext';
import type { Post } from '../../../types';
import styles from './PostCard.module.css';

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  return `${Math.round(diff / 86400)}d ago`;
}

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
  post: Post;
  onLike: (id: string) => void;
  onTagClick: (tag: string) => void;
}

export default function PostCard({ post, onLike, onTagClick }: Props) {
  const { isLoggedIn } = useAuth();
  const { open: openAuth } = useAuthModal();
  const navigate = useNavigate();
  const isCover = Boolean(post.coverImageUrl);

  function handleLike(e: React.MouseEvent) {
    e.stopPropagation();
    if (!isLoggedIn) { openAuth('login'); return; }
    onLike(post.id);
  }

  function handleAuthorClick(e: React.MouseEvent) {
    e.stopPropagation();
    navigate(`/profile/${post.author.username}`);
  }

  function handleTagClick(e: React.MouseEvent, name: string) {
    e.stopPropagation();
    onTagClick(name);
  }

  const authorInitials = post.author.displayName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  if (!isCover) {
    return (
      <article className={styles.card} onClick={() => navigate(`/post/${post.id}`)}>
        <div className={styles.cardText}>
          <h2 className={styles.cardTitle}>{post.title}</h2>
          <blockquote className={styles.pullQuote}>{post.excerpt}</blockquote>
          <div className={styles.metaTags}>
            {post.tags.slice(0, 2).map((t, i) => (
              <span
                key={t.id}
                className={`${styles.tagPill} ${i === 0 ? styles.accent : ''}`}
                onClick={(e) => handleTagClick(e, t.name)}
              >
                {i === 0 ? `#${t.name}` : t.name}
              </span>
            ))}
          </div>
          <div className={styles.authorRow}>
            <span className={styles.av}>{authorInitials}</span>
            <span className={styles.name} onClick={handleAuthorClick}>
              {post.author.displayName}
              {post.author.role === 'VERIFIED' && <IconVerified />}
            </span>
            <span className={styles.dotSep}>·</span>
            <span className={styles.ago}>{timeAgo(post.createdAt)}</span>
            <button className={`${styles.likes} ${post.isLikedByMe ? styles.liked : ''}`} onClick={handleLike} aria-label="Like">
              <IconHeart filled={post.isLikedByMe} />
              {post.likeCount.toLocaleString()}
            </button>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className={styles.card} onClick={() => navigate(`/post/${post.id}`)}>
      <div className={styles.cover}>
        <img src={post.coverImageUrl} alt="" className={styles.coverImg} />
      </div>
      <div className={styles.cardBody}>
        <h2 className={styles.cardTitle}>{post.title}</h2>
        <div className={styles.metaTags}>
          {post.tags.slice(0, 2).map((t, i) => (
            <span
              key={t.id}
              className={`${styles.tagPill} ${i === 0 ? styles.accent : ''}`}
              onClick={(e) => handleTagClick(e, t.name)}
            >
              {i === 0 ? `#${t.name}` : t.name}
            </span>
          ))}
        </div>
        <div className={styles.authorRow}>
          <span className={styles.av}>{authorInitials}</span>
          <span className={styles.name} onClick={handleAuthorClick}>
            {post.author.displayName}
            {post.author.role === 'VERIFIED' && <IconVerified />}
          </span>
          <span className={styles.dotSep}>·</span>
          <span className={styles.ago}>{timeAgo(post.createdAt)}</span>
          <button className={`${styles.likes} ${post.isLikedByMe ? styles.liked : ''}`} onClick={handleLike} aria-label="Like">
            <IconHeart filled={post.isLikedByMe} />
            {post.likeCount.toLocaleString()}
          </button>
        </div>
      </div>
    </article>
  );
}
