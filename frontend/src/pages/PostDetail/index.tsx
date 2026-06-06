import { useRef, useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Comment, PostDetail as PostDetailType } from '../../types';
import { contentService } from '../../services/content.service';
import { useReadingProgress } from '../../hooks/useReadingProgress';
import PostDetailTopbar from '../../components/layout/PostDetailTopbar';
import AISummaryPanel from '../../components/post/AISummaryPanel';
import PostBody from '../../components/post/PostBody';
import PostFooter from '../../components/post/PostFooter';
import EngageRow from '../../components/post/EngageRow';
import CommentSection from '../../components/post/CommentSection';
import BottomBar from '../../components/post/BottomBar';
import Toast from '../../components/ui/Toast';
import { timeAgo } from '../../utils/timeAgo';
import styles from './PostDetail.module.css';

const AI_BULLETS = [
  { html: 'The authors isolate a class of <b>~140 attention heads</b> across layers 18–32 that fire only on <em>coherent</em> in-context examples — not on shuffled or noisy ones.' },
  { html: 'Ablating a <em>single</em> head drops 5-shot accuracy by <code style="font-family:var(--font-mono);font-size:12.5px;background:#fff;padding:1px 5px;border-radius:3px;border:1px solid var(--border-subtle)">11–18 pts</code> on MMLU-Pro; ablating the cluster collapses few-shot to zero-shot performance.' },
  { html: 'Heads form three sub-populations: <b>retrieval</b> (find the demonstration), <b>format</b> (lock onto the output shape), and <b>predict</b> (apply the rule).' },
  { html: 'The circuit appears <em>only above 30B parameters</em>; smaller models show statistically null versions of the same heads.' },
  { html: 'Activation patching localises the effect to a sparse, <code style="font-family:var(--font-mono);font-size:12.5px;background:#fff;padding:1px 5px;border-radius:3px;border:1px solid var(--border-subtle)">&lt; 800-feature</code> subspace in the residual stream — small enough to start naming individual features.' },
];

export default function PostDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const articleRef = useRef<HTMLElement>(null);
  const commentsRef = useRef<HTMLDivElement>(null);
  const progress = useReadingProgress(articleRef);

  const [post, setPost] = useState<PostDetailType | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ show: false, message: '' });

  useEffect(() => {
    if (!id) { navigate('/'); return; }
    setLoading(true);
    Promise.all([contentService.getPost(id), contentService.getComments(id)]).then(
      ([p, c]) => { setPost(p); setComments(c); setLoading(false); },
    );
  }, [id, navigate]);

  const hideToast = useCallback(() => setToast((t) => ({ ...t, show: false })), []);

  function showToast(message: string) {
    setToast({ show: true, message });
  }

  function handleLike() {
    if (!post) return;
    const next = !post.isLikedByMe;
    setPost((p) => p && { ...p, isLikedByMe: next, likeCount: p.likeCount + (next ? 1 : -1) });
    contentService.toggleLike(post.id);
  }

  function handleBookmark() {
    if (!post) return;
    contentService.toggleBookmark(post.id).then(({ saveCount, isBookmarkedByMe }) => {
      setPost((p) => p && { ...p, saveCount, isBookmarkedByMe });
      showToast(isBookmarkedByMe ? 'Saved to bookmarks' : 'Removed from bookmarks');
    });
  }

  function handleShare() {
    navigator.clipboard.writeText(window.location.href).then(() => showToast('Link copied to clipboard'));
  }

  function handleScrollToComments() {
    commentsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  if (loading || !post) {
    return (
      <>
        <PostDetailTopbar />
        <div className={styles.loading}>Loading…</div>
      </>
    );
  }

  const authorInitials = post.author.displayName.slice(0, 2).toUpperCase();
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
            <div className={styles.authorAvatar}>{authorInitials}</div>
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
                {post.author.organization && (
                  <>
                    <span>{post.author.organization}</span>
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

          {/* AI Summary */}
          <AISummaryPanel bullets={AI_BULLETS} />

          {/* Article body */}
          <PostBody />

          {/* Footer: tags + sources */}
          <PostFooter tags={post.tags} sources={post.sources} />

          {/* Engagement strip */}
          <EngageRow
            likeCount={post.likeCount}
            commentCount={post.commentCount}
            saveCount={post.saveCount}
            viewCount={post.viewCount}
          />

          {/* Comments */}
          <div ref={commentsRef}>
            <CommentSection comments={comments} postAuthorId={post.author.id} />
          </div>

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
        onScrollToComments={handleScrollToComments}
      />

      <Toast message={toast.message} show={toast.show} onHide={hideToast} />
    </>
  );
}
