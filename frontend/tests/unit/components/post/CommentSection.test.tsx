import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CommentSection from '../../../../src/components/post/CommentSection';
import type { Comment as CommentType } from '../../../../src/types';

vi.mock('../../../../src/hooks/useAuth', () => ({ useAuth: () => ({ isLoggedIn: true }) }));
vi.mock('../../../../src/contexts/ModalContext', () => ({ useAuthModal: () => ({ open: vi.fn() }) }));

function mkComment(id: string, over: Partial<CommentType> = {}): CommentType {
  return {
    id,
    author: { id: `a-${id}`, username: id, displayName: id.toUpperCase(), role: 'USER' },
    text: `text ${id}`,
    likeCount: 0,
    isLikedByMe: false,
    createdAt: new Date('2026-06-01').toISOString(),
    replies: [],
    ...over,
  };
}

const baseProps = {
  count: 0,
  loading: false,
  error: false,
  postAuthorId: 'x',
  onReload: vi.fn(),
  onLike: vi.fn(),
  onReply: vi.fn(),
};

beforeEach(() => vi.clearAllMocks());

describe('CommentSection', () => {
  it('(CS-1) shows a loading state', () => {
    render(<CommentSection {...baseProps} comments={[]} loading />);
    expect(screen.getByText(/loading comments/i)).toBeInTheDocument();
  });

  it('(CS-2) shows an empty state', () => {
    render(<CommentSection {...baseProps} comments={[]} />);
    expect(screen.getByText(/be the first to comment/i)).toBeInTheDocument();
  });

  it('(CS-3) shows an error state with a working Retry', async () => {
    const onReload = vi.fn();
    render(<CommentSection {...baseProps} comments={[]} error onReload={onReload} />);
    expect(screen.getByText(/couldn’t load comments/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(onReload).toHaveBeenCalled();
  });

  it('(CS-4) caps the initial render at 10 top-level comments and reveals the rest', async () => {
    const comments = Array.from({ length: 13 }, (_, i) => mkComment(`c${i}`));
    render(<CommentSection {...baseProps} comments={comments} count={13} />);

    expect(screen.getAllByRole('article')).toHaveLength(10);
    const more = screen.getByRole('button', { name: /load 3 more comments/i });
    await userEvent.click(more);
    expect(screen.getAllByRole('article')).toHaveLength(13);
  });

  it('(CS-5) renders the count from props in the header', () => {
    render(<CommentSection {...baseProps} comments={[mkComment('c0')]} count={42} />);
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('(CS-6) sorts by Newest when chosen', async () => {
    const older = mkComment('old', { createdAt: new Date('2026-06-01').toISOString() });
    const newer = mkComment('new', { createdAt: new Date('2026-06-10').toISOString() });
    render(<CommentSection {...baseProps} comments={[older, newer]} count={2} />);

    await userEvent.click(screen.getByRole('button', { name: /top/i }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Newest' }));

    const articles = screen.getAllByRole('article');
    expect(articles[0]).toHaveTextContent('text new');
  });
});
