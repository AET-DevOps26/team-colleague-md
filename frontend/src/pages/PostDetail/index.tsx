import { useRef, useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { PostDetail as PostDetailType } from '../../types';
import { contentService } from '../../services/content.service';
import { useReadingProgress } from '../../hooks/useReadingProgress';
import PostDetailTopbar from '../../components/layout/PostDetailTopbar';
import PostFooter from '../../components/post/PostFooter';
import EngageRow from '../../components/post/EngageRow';
import BottomBar from '../../components/post/BottomBar';
import Markdown from '../../components/ui/Markdown';
import Toast from '../../components/ui/Toast';
import { timeAgo } from '../../utils/timeAgo';
import { getInitials } from '../../utils/getInitials';
import styles from './PostDetail.module.css';

export default function PostDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const articleRef = useRef<HTMLElement>(null);
  const progress = useReadingProgress(articleRef);

  const [post, setPost] = useState<PostDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ show: false, message: '' });

  useEffect(() => {
    if (!id) { navigate('/'); return; }
    setLoading(true);
    contentService.getPost(id).then((p) => { setPost(p); setLoading(false); });
  }, [id, navigate]);

  const hideToast = useCallback(() => setToast((t) => ({ ...t, show: false })), []);

  function showToast(message: string) {
    setToast({ show: true, message });
  }

  function handleLike() {
    if (!post) return;
    const next = !post.isLikedByMe;
    setPost((p) => p && { ...p, isLikedByMe: next, likeCount: p.likeCount + (next ? 1 : -1) });
    contentService.toggleLike(post.id, next);
  }

  function handleBookmark() {
    if (!post) return;
    const next = !post.isBookmarkedByMe;
    setPost((p) => p && { ...p, isBookmarkedByMe: next, saveCount: p.saveCount + (next ? 1 : -1) });
    contentService.toggleBookmark(post.id, next)
      .then(() => showToast(next ? 'Saved to bookmarks' : 'Removed from bookmarks'))
      .catch(() => {
        // Revert the optimistic update if the server rejected it.
        setPost((p) => p && { ...p, isBookmarkedByMe: !next, saveCount: p.saveCount + (next ? -1 : 1) });
        showToast('Could not update bookmark');
      });
  }

  function handleShare() {
    navigator.clipboard.writeText(window.location.href).then(() => showToast('Link copied to clipboard'));
  }

  if (loading || !post) {
    return (
      <>
        <PostDetailTopbar />
        <div className={styles.loading}>Loading…</div>
      </>
    );
  }

  const dateStr = new Date(post.createdAt).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });

  return (
    <>
      {/* Reading progress bar */}
      <div className={styles.readingProgress}>
        <div className={styles.readingBar} style={{ width: `${progress}%` }} />
      </div>

      <PostDetailTopbar />

      <div className={styles.readerCol}>
        <article className={styles.reader} ref={articleRef}>

          {/* Author block */}
          <div className={styles.authorBlock}>
            <div className={styles.authorAvatar}>
              {post.author.avatarUrl
                ? <img src={post.author.avatarUrl} alt="" className={styles.authorAvatarImg} />
                : getInitials(post.author.displayName)}
            </div>
            <div className={styles.authorInfo}>
              <div className={styles.authorName}>
                {post.author.displayName}
                {post.author.role === 'VERIFIED' && (
                  <svg className={styles.verified} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 1.5 14.2 4l3.3-.5.8 3.2L21 9l-1.4 3 1 3.1-3 1.7-.6 3.3-3.3-.4-2.7 2-2.7-2-3.3.4L4.4 17 1.4 15l1-3.1L1 9l2.7-1.3.8-3.2L7.8 4 12 1.5z" />
                    <path d="m8.5 12 2.5 2.5 4.5-5" stroke="#fff" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <div className={styles.authorMeta}>
                {post.author.organisation && (
                  <>
                    <span>{post.author.organisation}</span>
                    <span className={styles.dotSep}>·</span>
                  </>
                )}
                <span>{timeAgo(post.createdAt)}</span>
                <span className={styles.dotSep}>·</span>
                <span>{dateStr}</span>
                <span className={styles.dotSep}>·</span>
                <span>{post.readTimeMinutes} min read</span>
              </div>
            </div>
          </div>

          {/* Title */}
          <h1 className={styles.postTitle}>{post.title}</h1>

          {/* Article body (real Markdown). AI summary and comments are intentionally
              hidden until those backends are wired (ADR-0012). */}
          <Markdown>{post.content}</Markdown>

          {/* Footer: tags + sources */}
          <PostFooter topics={post.topics} sources={post.sources} />

          {/* Engagement strip */}
          <EngageRow
            likeCount={post.likeCount}
            commentCount={post.commentCount}
            saveCount={post.saveCount}
            viewCount={post.viewCount}
          />

        </article>
      </div>

      {/* Floating bottom bar */}
      <BottomBar
        likeCount={post.likeCount}
        isLikedByMe={post.isLikedByMe}
        isBookmarkedByMe={post.isBookmarkedByMe}
        commentCount={post.commentCount}
        onLike={handleLike}
        onBookmark={handleBookmark}
        onShare={handleShare}
        onScrollToComments={() => {}}
        showComments={false}
      />

      <Toast message={toast.message} show={toast.show} onHide={hideToast} />
    </>
  );
}
