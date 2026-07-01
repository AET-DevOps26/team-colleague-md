import { useState } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import type { Comment as CommentType } from '../../../types';
import Comment from '../Comment';
import styles from './CommentSection.module.css';

type SortOrder = 'Top' | 'Newest' | 'Oldest';

/** Top-level comments revealed initially, and per "Load more" click. */
const REVEAL_BATCH = 10;

interface CommentSectionProps {
  comments: CommentType[];
  count: number;
  loading: boolean;
  error: boolean;
  postAuthorId: string;
  onReload: () => void;
  onLike: (commentId: string) => void;
  onReply: (parentId: string, text: string) => Promise<void>;
}

export default function CommentSection({
  comments,
  count,
  loading,
  error,
  postAuthorId,
  onReload,
  onLike,
  onReply,
}: CommentSectionProps) {
  const [sort, setSort] = useState<SortOrder>('Top');
  const [visible, setVisible] = useState(REVEAL_BATCH);

  const sorted = [...comments].sort((a, b) => {
    if (sort === 'Top') return b.likeCount - a.likeCount;
    if (sort === 'Newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  const shown = sorted.slice(0, visible);
  const remaining = sorted.length - shown.length;

  return (
    <section className={styles.section} id="comments">
      <div className={styles.head}>
        <h2 className={styles.title}>Comments</h2>
        <span className={styles.count}>{count}</span>

        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className={styles.sortPill} type="button">
              <span>{sort}</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content className={styles.dropdown} align="end" sideOffset={4}>
              {(['Top', 'Newest', 'Oldest'] as SortOrder[]).map((option) => (
                <DropdownMenu.Item
                  key={option}
                  className={`${styles.dropdownItem} ${sort === option ? styles.dropdownItemActive : ''}`}
                  onSelect={() => setSort(option)}
                >
                  {option}
                </DropdownMenu.Item>
              ))}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>

      {loading ? (
        <p className={styles.stateMsg}>Loading comments…</p>
      ) : error ? (
        <div className={styles.stateMsg}>
          <span>Couldn’t load comments.</span>
          <button className={styles.retry} onClick={onReload} type="button">Retry</button>
        </div>
      ) : comments.length === 0 ? (
        <p className={styles.stateMsg}>No comments yet. Be the first to comment.</p>
      ) : (
        <>
          <div className={styles.list}>
            {shown.map((c) => (
              <Comment
                key={c.id}
                comment={c}
                postAuthorId={postAuthorId}
                onLike={onLike}
                onReply={onReply}
              />
            ))}
          </div>

          {remaining > 0 && (
            <button
              className={styles.showMore}
              type="button"
              onClick={() => setVisible((v) => v + REVEAL_BATCH)}
            >
              Load {Math.min(remaining, REVEAL_BATCH)} more comment{Math.min(remaining, REVEAL_BATCH) === 1 ? '' : 's'}
            </button>
          )}
        </>
      )}
    </section>
  );
}
