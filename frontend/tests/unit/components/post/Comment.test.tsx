import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Comment from '../../../../src/components/post/Comment';
import type { Comment as CommentType } from '../../../../src/types';

const auth = vi.hoisted(() => ({ isLoggedIn: true }));
const openAuth = vi.hoisted(() => vi.fn());

vi.mock('../../../../src/hooks/useAuth', () => ({
  useAuth: () => auth,
}));
vi.mock('../../../../src/contexts/ModalContext', () => ({
  useAuthModal: () => ({ open: openAuth }),
}));

function mkComment(over: Partial<CommentType> = {}): CommentType {
  return {
    id: 'c1',
    author: { id: 'a1', username: 'a', displayName: 'Alice', role: 'USER' },
    text: 'hello world',
    likeCount: 3,
    isLikedByMe: false,
    createdAt: new Date().toISOString(),
    replies: [],
    ...over,
  };
}

beforeEach(() => {
  auth.isLoggedIn = true;
  openAuth.mockClear();
});

describe('Comment', () => {
  it('(CM-1) calls onLike with the comment id when liked', async () => {
    const onLike = vi.fn();
    render(<Comment comment={mkComment()} postAuthorId="x" onLike={onLike} onReply={vi.fn()} />);
    await userEvent.click(screen.getByText('3').closest('button')!);
    expect(onLike).toHaveBeenCalledWith('c1');
  });

  it('(CM-2) opens the auth modal instead of liking when logged out', async () => {
    auth.isLoggedIn = false;
    const onLike = vi.fn();
    render(<Comment comment={mkComment()} postAuthorId="x" onLike={onLike} onReply={vi.fn()} />);
    await userEvent.click(screen.getByText('3').closest('button')!);
    expect(onLike).not.toHaveBeenCalled();
    expect(openAuth).toHaveBeenCalledWith('login');
  });

  it('(CM-3) submits a reply through onReply, then clears and closes the box', async () => {
    const onReply = vi.fn().mockResolvedValue(undefined);
    render(<Comment comment={mkComment()} postAuthorId="x" onLike={vi.fn()} onReply={onReply} />);
    await userEvent.click(screen.getByRole('button', { name: /reply/i }));
    const box = screen.getByPlaceholderText('Write a reply…');
    await userEvent.type(box, 'my reply');
    await userEvent.click(screen.getAllByRole('button', { name: 'Reply' }).pop()!);
    expect(onReply).toHaveBeenCalledWith('c1', 'my reply');
    expect(screen.queryByPlaceholderText('Write a reply…')).not.toBeInTheDocument();
  });

  it('(CM-4) shows the /500 counter in the reply box', async () => {
    render(<Comment comment={mkComment()} postAuthorId="x" onLike={vi.fn()} onReply={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /reply/i }));
    await userEvent.type(screen.getByPlaceholderText('Write a reply…'), 'hi');
    expect(screen.getByText('2/500')).toBeInTheDocument();
  });

  it('(CM-5) does not render a Reply button on replies (two-level threading)', () => {
    render(<Comment comment={mkComment()} isReply postAuthorId="x" onLike={vi.fn()} onReply={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /reply/i })).not.toBeInTheDocument();
  });

  it('(CM-6) marks the post author with an Author badge', () => {
    const comment = mkComment({ author: { id: 'author-1', username: 'op', displayName: 'OP', role: 'USER' } });
    render(<Comment comment={comment} postAuthorId="author-1" onLike={vi.fn()} onReply={vi.fn()} />);
    expect(screen.getByText('Author')).toBeInTheDocument();
  });
});
