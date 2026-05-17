import { useState } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import type { Comment as CommentType } from '../../../types';
import Comment from '../Comment';
import styles from './CommentSection.module.css';

type SortOrder = 'Top' | 'Newest' | 'Oldest';

interface CommentSectionProps {
  comments: CommentType[];
  postAuthorId: string;
}

export default function CommentSection({ comments, postAuthorId }: CommentSectionProps) {
  const [sort, setSort] = useState<SortOrder>('Top');

  const sorted = [...comments].sort((a, b) => {
    if (sort === 'Top') return b.likeCount - a.likeCount;
    if (sort === 'Newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  const total = comments.reduce((n, c) => n + 1 + c.replies.length, 0);

  return (
    <section className={styles.section} id="comments">
      <div className={styles.head}>
        <h2 className={styles.title}>Comments</h2>
        <span className={styles.count}>{total}</span>

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

      <div className={styles.list}>
        {sorted.map((c) => (
          <Comment key={c.id} comment={c} isAuthor={c.author.id === postAuthorId} />
        ))}
      </div>

      {total > sorted.length && (
        <button className={styles.showMore} type="button">
          Load more comments
        </button>
      )}
    </section>
  );
}
