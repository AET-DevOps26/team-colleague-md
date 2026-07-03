import { useState, useEffect, useCallback, useRef } from 'react';
import { contentService } from '../services/content.service';
import { useAuth } from './useAuth';
import type { Comment, User } from '../types';

/** Total comments in a tree, counting every reply at every depth. */
function countTree(comments: Comment[]): number {
  return comments.reduce((n, c) => n + 1 + countTree(c.replies), 0);
}

/** Return a new tree with `fn` applied to the comment matching `id` (searches replies too). */
function mapComment(comments: Comment[], id: string, fn: (c: Comment) => Comment): Comment[] {
  return comments.map((c) => {
    if (c.id === id) return fn(c);
    if (c.replies.length) return { ...c, replies: mapComment(c.replies, id, fn) };
    return c;
  });
}

/** Append `reply` under the top-level comment `parentId`. */
function appendReply(comments: Comment[], parentId: string, reply: Comment): Comment[] {
  return comments.map((c) =>
    c.id === parentId ? { ...c, replies: [...c.replies, reply] } : c,
  );
}

/** Find the comment `id` anywhere in the tree. */
function findComment(comments: Comment[], id: string): Comment | undefined {
  for (const c of comments) {
    if (c.id === id) return c;
    const found = findComment(c.replies, id);
    if (found) return found;
  }
  return undefined;
}

/** Remove the comment `id` wherever it sits in the tree. */
function removeComment(comments: Comment[], id: string): Comment[] {
  return comments
    .filter((c) => c.id !== id)
    .map((c) => (c.replies.length ? { ...c, replies: removeComment(c.replies, id) } : c));
}

function authorFromUser(user: ReturnType<typeof useAuth>['user']): User {
  return {
    id: user!.id,
    username: user!.username,
    displayName: user!.displayName,
    avatarUrl: user!.avatarUrl,
    role: user!.role,
  };
}

/**
 * Owns the comment tree + running count for one post, with optimistic add/reply/like and
 * revert-on-error. Consumed by PostDetail and wired into both the BottomBar composer and
 * CommentSection. `initialCount` seeds the count so the bar shows the post's known total until
 * the tree loads.
 */
export function useComments(postId: string | undefined, initialCount: number) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const tempId = useRef(0);
  // Latest tree, so callbacks with empty deps can read current like-state without going stale.
  const commentsRef = useRef<Comment[]>([]);
  useEffect(() => {
    commentsRef.current = comments;
  }, [comments]);

  const load = useCallback(() => {
    if (!postId) return;
    setLoading(true);
    setError(false);
    contentService
      .getComments(postId)
      .then((tree) => {
        setComments(tree);
        setCount(countTree(tree));
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [postId]);

  useEffect(() => {
    load();
  }, [load]);

  const addComment = useCallback(
    async (text: string) => {
      if (!postId || !user) return;
      const optimistic: Comment = {
        id: `temp-${tempId.current++}`,
        author: authorFromUser(user),
        text,
        likeCount: 0,
        isLikedByMe: false,
        createdAt: new Date().toISOString(),
        replies: [],
      };
      setComments((prev) => [optimistic, ...prev]);
      setCount((c) => c + 1);
      try {
        const saved = await contentService.addComment(postId, text);
        setComments((prev) => prev.map((c) => (c.id === optimistic.id ? saved : c)));
      } catch (e) {
        setComments((prev) => removeComment(prev, optimistic.id));
        setCount((c) => c - 1);
        throw e;
      }
    },
    [postId, user],
  );

  const reply = useCallback(
    async (parentId: string, text: string) => {
      if (!postId || !user) return;
      const optimistic: Comment = {
        id: `temp-${tempId.current++}`,
        author: authorFromUser(user),
        text,
        likeCount: 0,
        isLikedByMe: false,
        createdAt: new Date().toISOString(),
        replies: [],
      };
      setComments((prev) => appendReply(prev, parentId, optimistic));
      setCount((c) => c + 1);
      try {
        const saved = await contentService.addComment(postId, text, parentId);
        setComments((prev) => mapComment(prev, optimistic.id, () => saved));
      } catch (e) {
        setComments((prev) => removeComment(prev, optimistic.id));
        setCount((c) => c - 1);
        throw e;
      }
    },
    [postId, user],
  );

  const likeComment = useCallback(
    async (commentId: string) => {
      const current = findComment(commentsRef.current, commentId);
      if (!current) return;
      const nextLiked = !current.isLikedByMe;
      setComments((prev) =>
        mapComment(prev, commentId, (c) => ({
          ...c,
          isLikedByMe: nextLiked,
          likeCount: c.likeCount + (nextLiked ? 1 : -1),
        })),
      );
      try {
        await contentService.likeComment(commentId, nextLiked);
      } catch {
        // Revert the optimistic flip.
        setComments((prev) =>
          mapComment(prev, commentId, (c) => ({
            ...c,
            isLikedByMe: !nextLiked,
            likeCount: c.likeCount + (nextLiked ? -1 : 1),
          })),
        );
      }
    },
    [],
  );

  return { comments, count, loading, error, reload: load, addComment, reply, likeComment };
}
