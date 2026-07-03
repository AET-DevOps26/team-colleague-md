import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useComments } from '../../../src/hooks/useComments';
import type { Comment } from '../../../src/types';

const svc = vi.hoisted(() => ({
  getComments: vi.fn(),
  addComment: vi.fn(),
  likeComment: vi.fn(),
}));

vi.mock('../../../src/services/content.service', () => ({
  contentService: svc,
}));

vi.mock('../../../src/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'me', username: 'me', displayName: 'Me', role: 'USER' },
    isLoggedIn: true,
  }),
}));

function mkComment(id: string, over: Partial<Comment> = {}): Comment {
  return {
    id,
    author: { id: 'a', username: 'a', displayName: 'A', role: 'USER' },
    text: `text ${id}`,
    likeCount: 0,
    isLikedByMe: false,
    createdAt: new Date('2026-06-01').toISOString(),
    replies: [],
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useComments', () => {
  it('(UC-1) loads the tree and counts replies in the total', async () => {
    svc.getComments.mockResolvedValue([
      mkComment('c1', { replies: [mkComment('c1r1'), mkComment('c1r2')] }),
      mkComment('c2'),
    ]);
    const { result } = renderHook(() => useComments('p1', 0));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.comments).toHaveLength(2);
    expect(result.current.count).toBe(4); // 2 top-level + 2 replies
  });

  it('(UC-2) addComment optimistically prepends and bumps count, then swaps in the saved comment', async () => {
    svc.getComments.mockResolvedValue([mkComment('c1')]);
    const saved = mkComment('server-id', { text: 'hello' });
    let resolveSave: (c: Comment) => void = () => {};
    svc.addComment.mockReturnValue(new Promise<Comment>((r) => { resolveSave = r; }));

    const { result } = renderHook(() => useComments('p1', 1));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let pending: Promise<void>;
    act(() => { pending = result.current.addComment('hello'); });

    // Optimistic: prepended, count bumped, temp id.
    expect(result.current.comments[0].text).toBe('hello');
    expect(result.current.count).toBe(2);

    await act(async () => { resolveSave(saved); await pending; });
    expect(result.current.comments[0].id).toBe('server-id');
    expect(result.current.count).toBe(2);
  });

  it('(UC-3) reverts an optimistic add when the server rejects', async () => {
    svc.getComments.mockResolvedValue([mkComment('c1')]);
    svc.addComment.mockRejectedValue(new Error('boom'));

    const { result } = renderHook(() => useComments('p1', 1));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await expect(result.current.addComment('nope')).rejects.toThrow('boom');
    });
    expect(result.current.comments).toHaveLength(1);
    expect(result.current.count).toBe(1);
  });

  it('(UC-4) likeComment toggles like state and count optimistically', async () => {
    svc.getComments.mockResolvedValue([mkComment('c1', { likeCount: 5 })]);
    svc.likeComment.mockResolvedValue({ likeCount: 6, isLikedByMe: true });

    const { result } = renderHook(() => useComments('p1', 1));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => { await result.current.likeComment('c1'); });
    expect(result.current.comments[0].isLikedByMe).toBe(true);
    expect(result.current.comments[0].likeCount).toBe(6);
    expect(svc.likeComment).toHaveBeenCalledWith('c1', true);
  });

  it('(UC-5) reply appends under the parent and bumps count', async () => {
    svc.getComments.mockResolvedValue([mkComment('c1')]);
    svc.addComment.mockResolvedValue(mkComment('server-r', { text: 'a reply' }));

    const { result } = renderHook(() => useComments('p1', 1));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => { await result.current.reply('c1', 'a reply'); });
    expect(result.current.comments[0].replies).toHaveLength(1);
    expect(result.current.comments[0].replies[0].id).toBe('server-r');
    expect(result.current.count).toBe(2);
    expect(svc.addComment).toHaveBeenCalledWith('p1', 'a reply', 'c1');
  });

  it('(UC-6) surfaces a load error', async () => {
    svc.getComments.mockRejectedValue(new Error('down'));
    const { result } = renderHook(() => useComments('p1', 0));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe(true);
  });
});
