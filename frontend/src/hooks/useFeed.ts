import { useState, useEffect, useCallback } from 'react';
import { contentService } from '../services/content.service';
import type { Post } from '../types';

export function useFeed() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [activeTag, setActiveTagState] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  const loadInitial = useCallback(async (tag: string | null) => {
    setLoading(true);
    const page = await contentService.getPosts(null, tag);
    setPosts(page.posts);
    setCursor(page.nextCursor);
    setHasMore(page.nextCursor !== null);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadInitial(activeTag);
  }, [activeTag, loadInitial]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading || cursor === null) return;
    setLoading(true);
    const page = await contentService.getPosts(cursor, activeTag);
    setPosts((prev) => [...prev, ...page.posts]);
    setCursor(page.nextCursor);
    setHasMore(page.nextCursor !== null);
    setLoading(false);
  }, [hasMore, loading, cursor, activeTag]);

  const setTag = useCallback((tag: string | null) => {
    setActiveTagState(tag);
  }, []);

  const refresh = useCallback(() => {
    loadInitial(activeTag);
  }, [activeTag, loadInitial]);

  const toggleLike = useCallback(async (postId: string) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, isLikedByMe: !p.isLikedByMe, likeCount: p.likeCount + (p.isLikedByMe ? -1 : 1) }
          : p
      )
    );
    await contentService.toggleLike(postId);
  }, []);

  return { posts, activeTag, setTag, loadMore, hasMore, loading, refresh, toggleLike };
}
