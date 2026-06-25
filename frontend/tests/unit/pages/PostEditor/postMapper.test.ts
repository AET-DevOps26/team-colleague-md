import { describe, it, expect } from 'vitest';
import { toEditorPost, toCreateRequest, toPatchRequest } from '../../../../src/pages/PostEditor/postMapper';
import type { EditorPost, PostResponse } from '../../../../src/types';

const RESPONSE: PostResponse = {
  id: 'post-1',
  author: { id: 'u1', username: 'a', displayName: 'A', role: 'USER' },
  status: 'PUBLISHED',
  type: 'NORMAL',
  title: 'My Post',
  excerpt: 'Preview',
  summary: null,
  content: 'Body text',
  coverImageUrl: 'https://img/cover.png',
  topics: [{ id: 't1', name: 'llms' }, { id: 't2', name: 'agents' }],
  sourceUrl: ['https://a.com', 'https://b.com'],
  readTimeMinutes: 3,
  likeCount: 0, dislikeCount: 0, commentCount: 0, viewCount: 0, saveCount: 0,
  isLikedByMe: false, isDislikedByMe: false, isBookmarkedByMe: false,
  createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
};

const EDITOR: EditorPost = {
  id: null,
  title: 'My Post',
  content: 'Body text',
  coverImageUrl: 'https://img/cover.png',
  sources: ['https://a.com', '', '  '],
  topics: ['llms', 'agents', '  '],
  status: 'DRAFT',
};

describe('postMapper', () => {
  it('(PM-1) toEditorPost maps a PostResponse into editor state', () => {
    const e = toEditorPost(RESPONSE);
    expect(e.id).toBe('post-1');
    expect(e.title).toBe('My Post');
    expect(e.content).toBe('Body text');
    expect(e.coverImageUrl).toBe('https://img/cover.png');
    expect(e.sources).toEqual(['https://a.com', 'https://b.com']);
    expect(e.topics).toEqual(['llms', 'agents']);
    expect(e.status).toBe('PUBLISHED');
  });

  it('(PM-2) toEditorPost normalises an absent cover image to null', () => {
    const e = toEditorPost({ ...RESPONSE, coverImageUrl: undefined });
    expect(e.coverImageUrl).toBeNull();
  });

  it('(PM-3) toCreateRequest carries the requested status and drops empty sources/topics', () => {
    const req = toCreateRequest(EDITOR, 'PUBLISHED');
    expect(req.status).toBe('PUBLISHED');
    expect(req.title).toBe('My Post');
    expect(req.content).toBe('Body text');
    expect(req.coverImageUrl).toBe('https://img/cover.png');
    expect(req.sourceUrl).toEqual(['https://a.com']);
    expect(req.topics).toEqual(['llms', 'agents']);
  });

  it('(PM-4) toCreateRequest sends a null cover image when there is none', () => {
    const req = toCreateRequest({ ...EDITOR, coverImageUrl: null }, 'DRAFT');
    expect(req.coverImageUrl).toBeNull();
  });

  it('(PM-5) toPatchRequest omits status when none is given (no downgrade of a published post)', () => {
    const patch = toPatchRequest(EDITOR);
    expect('status' in patch).toBe(false);
    expect(patch.title).toBe('My Post');
    expect(patch.topics).toEqual(['llms', 'agents']);
  });

  it('(PM-6) toPatchRequest includes status when explicitly provided', () => {
    const patch = toPatchRequest(EDITOR, 'DRAFT');
    expect(patch.status).toBe('DRAFT');
  });
});
