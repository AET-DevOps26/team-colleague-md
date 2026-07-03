import { createContext, useState, useCallback, useContext, useEffect, type ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import { contentService } from '../services/content.service';
import type { TopicCategory } from '../types';

interface FollowedTopicsContextValue {
  // The Topic catalog (category-grouped), used both to render the Manage-Topics UI and to
  // join the subscription UUIDs back to each Topic's slug + display name for the filter chips.
  categories: TopicCategory[];
  // Subscribed Topic ids (UUIDs — recommendation-service speaks only UUIDs).
  followedTopics: Set<string>;
  loading: boolean;
  // Optimistic follow/unfollow by topic id; resolves once the request settles, rejects (after
  // rolling the local set back) so callers can surface an error toast.
  toggleTopic: (topicId: string) => Promise<void>;
  // Optimistic bulk clear of every subscription; rolls the whole set back on any failure.
  unfollowAll: () => Promise<void>;
  // Optimistic bulk follow (the Undo path for unfollowAll); rolls back the added ids on failure.
  followMany: (topicIds: string[]) => Promise<void>;
}

const FollowedTopicsContext = createContext<FollowedTopicsContextValue>({
  categories: [],
  followedTopics: new Set(),
  loading: false,
  toggleTopic: async () => {},
  unfollowAll: async () => {},
  followMany: async () => {},
});

export function useFollowedTopics() {
  return useContext(FollowedTopicsContext);
}

/**
 * Single source of truth for the user's Topic Subscriptions within a session (ADR-0014).
 * Both the Topic page (subscribe/unsubscribe) and the Home Topic Filter read from here, so a
 * toggle in one place reflects in the other immediately. The set is loaded once the user is
 * known and cleared on logout.
 */
export function FollowedTopicsProvider({ children }: { children: ReactNode }) {
  const { isLoggedIn } = useAuth();
  const [categories, setCategories] = useState<TopicCategory[]>([]);
  const [followedTopics, setFollowedTopics] = useState<Set<string>>(() => new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isLoggedIn) {
      setCategories([]);
      setFollowedTopics(new Set());
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all([
      contentService.getTopicCategories().then((c) => { if (!cancelled) setCategories(c); }).catch(() => {}),
      contentService.getFollowedTopicIds().then((ids) => { if (!cancelled) setFollowedTopics(ids); }).catch(() => {}),
    ]).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [isLoggedIn]);

  // Flip immediately, fire the request, roll back on failure.
  const toggleTopic = useCallback((topicId: string): Promise<void> => {
    const wasFollowing = followedTopics.has(topicId);
    setFollowedTopics((prev) => {
      const next = new Set(prev);
      if (wasFollowing) next.delete(topicId); else next.add(topicId);
      return next;
    });
    const op = wasFollowing ? contentService.unfollowTopic(topicId) : contentService.followTopic(topicId);
    return op.catch((err) => {
      setFollowedTopics((prev) => {
        const next = new Set(prev);
        if (wasFollowing) next.add(topicId); else next.delete(topicId);
        return next;
      });
      throw err;
    });
  }, [followedTopics]);

  // Clear every subscription at once. Snapshot the set, drop it locally, fire one unfollow per
  // id, and restore the whole snapshot if any request fails (all-or-nothing for the user).
  const unfollowAll = useCallback((): Promise<void> => {
    const prev = followedTopics;
    if (prev.size === 0) return Promise.resolve();
    setFollowedTopics(new Set());
    return Promise.all([...prev].map((id) => contentService.unfollowTopic(id)))
      .then(() => {})
      .catch((err) => { setFollowedTopics(prev); throw err; });
  }, [followedTopics]);

  // Re-follow a set of ids in one shot — the Undo path for unfollowAll.
  const followMany = useCallback((topicIds: string[]): Promise<void> => {
    if (topicIds.length === 0) return Promise.resolve();
    setFollowedTopics((p) => { const n = new Set(p); topicIds.forEach((id) => n.add(id)); return n; });
    return Promise.all(topicIds.map((id) => contentService.followTopic(id)))
      .then(() => {})
      .catch((err) => {
        setFollowedTopics((p) => { const n = new Set(p); topicIds.forEach((id) => n.delete(id)); return n; });
        throw err;
      });
  }, []);

  return (
    <FollowedTopicsContext.Provider value={{ categories, followedTopics, loading, toggleTopic, unfollowAll, followMany }}>
      {children}
    </FollowedTopicsContext.Provider>
  );
}
