import { useState } from 'react';
import type { Comment as CommentType } from '../../../types';
import { useAuth } from '../../../hooks/useAuth';
import { useAuthModal } from '../../../contexts/ModalContext';
import styles from './Comment.module.css';

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function VerifiedIcon() {
  return (
    <svg className={styles.verified} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 1.5 14.2 4l3.3-.5.8 3.2L21 9l-1.4 3 1 3.1-3 1.7-.6 3.3-3.3-.4-2.7 2-2.7-2-3.3.4L4.4 17 1.4 15l1-3.1L1 9l2.7-1.3.8-3.2L7.8 4 12 1.5z" />
      <path d="m8.5 12 2.5 2.5 4.5-5" stroke="#fff" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

interface CommentProps {
  comment: CommentType;
  isReply?: boolean;
  isAuthor?: boolean;
}

export default function Comment({ comment, isReply = false, isAuthor = false }: CommentProps) {
  const { isLoggedIn } = useAuth();
  const { open: openAuth } = useAuthModal();
  const [liked, setLiked] = useState(comment.isLikedByMe);
  const [likeCount, setLikeCount] = useState(comment.likeCount);
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState('');

  function handleLike() {
    if (!isLoggedIn) {
      openAuth('login');
      return;
    }
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => c + (next ? 1 : -1));
  }

  function handleReplyClick() {
    if (!isLoggedIn) {
      openAuth('login');
      return;
    }
    setShowReply((v) => !v);
  }

  const initials = comment.author.displayName.slice(0, 2).toUpperCase();
  const avatarSize = isReply ? styles.avSm : styles.avMd;

  return (
    <article className={`${styles.cmt} ${isReply ? styles.reply : ''}`}>
      <div className={`${styles.avatar} ${avatarSize}`}>{initials}</div>
      <div className={styles.body}>
        <div className={styles.head}>
          <span className={styles.who}>
            {comment.author.displayName}
            {comment.author.role === 'VERIFIED' && <VerifiedIcon />}
          </span>
          {comment.author.organisation && (
            <span className={styles.role}>{comment.author.organisation.toLowerCase()}</span>
          )}
          {isAuthor && <span className={styles.opBadge}>Author</span>}
          <span>·</span>
          <span>{timeAgo(comment.createdAt)}</span>
        </div>

        <div className={styles.text}>
          {comment.text.split('\n\n').map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>

        <div className={styles.actions}>
          <button
            className={`${styles.actionBtn} ${liked ? styles.liked : ''}`}
            onClick={handleLike}
            type="button"
          >
            <svg viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            {likeCount}
          </button>

          {!isReply && (
            <button className={styles.actionBtn} onClick={handleReplyClick} type="button">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="m9 17-5-5 5-5" />
                <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
              </svg>
              Reply
            </button>
          )}
        </div>

        {showReply && (
          <div className={styles.replyInline}>
            <div className={styles.replyBox}>
              <textarea
                className={styles.replyInput}
                placeholder="Write a reply…"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows={1}
              />
              <div className={styles.replyActions}>
                <button
                  className={styles.replyCancel}
                  onClick={() => { setShowReply(false); setReplyText(''); }}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className={`${styles.replySubmit} ${replyText.trim() ? '' : styles.disabled}`}
                  type="button"
                  disabled={!replyText.trim()}
                >
                  Reply
                </button>
              </div>
            </div>
          </div>
        )}

        {comment.replies.length > 0 && (
          <div className={styles.replies}>
            {comment.replies.map((reply) => (
              <Comment key={reply.id} comment={reply} isReply />
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
