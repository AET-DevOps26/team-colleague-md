import { useEffect, useRef } from 'react';
import type { Post } from '../../../types';
import PostCard from '../PostCard';
import DigestCard from '../DigestCard';
import styles from './FeedGrid.module.css';

interface Props {
  posts: Post[];
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void;
  onLike: (id: string) => void;
}

export default function FeedGrid({ posts, hasMore, loading, onLoadMore, onLike }: Props) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          onLoadMore();
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loading, onLoadMore]);

  return (
    <div>
      <div className={styles.masonry}>
        <DigestCard />
        {posts.map((post) => (
          <PostCard key={post.id} post={post} onLike={onLike} />
        ))}
      </div>
      <div ref={sentinelRef} className={styles.sentinel}>
        {loading && <span className={styles.loadingText}>Loading…</span>}
      </div>
    </div>
  );
}
