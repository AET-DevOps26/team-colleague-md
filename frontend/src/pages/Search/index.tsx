import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import Topbar from '../../components/layout/Topbar';
import PostCard from '../../components/feed/PostCard';
import { contentService } from '../../services/content.service';
import type { Post } from '../../types';
import feedStyles from '../../components/feed/FeedGrid/FeedGrid.module.css';
import styles from './Search.module.css';

export default function Search() {
  const [params] = useSearchParams();
  const q = params.get('q') ?? '';

  const [posts, setPosts] = useState<Post[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setPage(0);
    contentService.searchPosts(q, 0)
      .then((res) => {
        if (cancelled) return;
        setPosts(res.posts);
        setTotal(res.totalElements);
        setHasMore(res.hasMore);
      })
      .catch(() => {
        if (cancelled) return;
        setPosts([]);
        setTotal(0);
        setHasMore(false);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [q]);

  const loadMore = useCallback(() => {
    const next = page + 1;
    contentService.searchPosts(q, next)
      .then((res) => {
        setPosts((prev) => [...prev, ...res.posts]);
        setHasMore(res.hasMore);
        setPage(next);
      })
      .catch(() => {});
  }, [page, q]);

  // Optimistic like, matching the Home feed's behaviour.
  const onLike = useCallback((id: string) => {
    setPosts((prev) => prev.map((p) => {
      if (p.id !== id) return p;
      const liked = !p.isLikedByMe;
      contentService.toggleLike(id, liked).catch(() => {});
      return { ...p, isLikedByMe: liked, likeCount: p.likeCount + (liked ? 1 : -1) };
    }));
  }, []);

  return (
    <>
      <Topbar />
      <section className={styles.resultsWrap}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            {loading ? 'Searching…' : `${total} ${total === 1 ? 'result' : 'results'} for `}
            {!loading && <span className={styles.query}>“{q}”</span>}
          </h1>
        </div>

        {!loading && posts.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyTitle}>No results for “{q}”</div>
            <div className={styles.emptySub}>Try a different keyword or browse the latest.</div>
            <Link to="/" className={styles.emptyLink}>Back to feed</Link>
          </div>
        ) : (
          <>
            <div className={feedStyles.masonry}>
              {posts.map((post) => (
                <PostCard key={post.id} post={post} onLike={onLike} />
              ))}
            </div>
            {hasMore && (
              <div className={styles.loadMoreWrap}>
                <button className={styles.loadMoreBtn} onClick={loadMore}>Load more</button>
              </div>
            )}
          </>
        )}
      </section>
    </>
  );
}
