import { useState, useEffect, useCallback } from 'react';
import { contentService } from '../services/content.service';
import type { Post } from '../types';

export function useFeed() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [activeTopic, setActiveTopicState] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  const loadInitial = useCallback(async (topic: string | null) => {
    setLoading(true);
    const page = await contentService.getPosts(null, topic);
    setPosts(page.posts);
    setCursor(page.nextCursor);
    setHasMore(page.nextCursor !== null);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadInitial(activeTopic);
  }, [activeTopic, loadInitial]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading || cursor === null) return;
    setLoading(true);
    const page = await contentService.getPosts(cursor, activeTopic);
    setPosts((prev) => [...prev, ...page.posts]);
    setCursor(page.nextCursor);
    setHasMore(page.nextCursor !== null);
    setLoading(false);
  }, [hasMore, loading, cursor, activeTopic]);

  const setTopic = useCallback((topic: string | null) => {
    setActiveTopicState(topic);
  }, []);

  const refresh = useCallback(() => {
    loadInitial(activeTopic);
  }, [activeTopic, loadInitial]);

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

  return { posts, activeTopic, setTopic, loadMore, hasMore, loading, refresh, toggleLike };
}
