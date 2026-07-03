import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useParams } from 'react-router-dom';
import PostEditor from '../../../../src/pages/PostEditor';
import { ToastProvider } from '../../../../src/contexts/ToastContext';
import type { PostResponse } from '../../../../src/types';

const svc = vi.hoisted(() => ({
  getPost: vi.fn(),
  createPost: vi.fn(),
  updatePost: vi.fn(),
  uploadFile: vi.fn(),
  searchTopics: vi.fn(),
}));

vi.mock('../../../../src/services/postEditor.service', () => ({
  postEditorService: svc,
}));

beforeAll(() => {
  vi.stubGlobal('URL', { ...URL, createObjectURL: () => 'blob:x', revokeObjectURL: () => {} });
});

beforeEach(() => {
  vi.clearAllMocks();
  svc.searchTopics.mockResolvedValue([]);
  svc.createPost.mockResolvedValue({ id: 'new-id' });
  svc.updatePost.mockResolvedValue({ id: 'edit-id' });
  svc.uploadFile.mockResolvedValue('https://cdn/img.png');
});

function Marker() {
  const { id } = useParams();
  return <div>detail:{id}</div>;
}

function renderAt(path: string) {
  return render(
    <ToastProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/" element={<div>HOME</div>} />
          <Route path="/post/new" element={<PostEditor />} />
          <Route path="/post/:id/edit" element={<PostEditor />} />
          <Route path="/post/:id" element={<Marker />} />
        </Routes>
      </MemoryRouter>
    </ToastProvider>,
  );
}

const RESPONSE: PostResponse = {
  id: 'p1',
  author: { id: 'u1', username: 'a', displayName: 'A', role: 'USER' },
  status: 'PUBLISHED',
  type: 'NORMAL',
  title: 'Existing title',
  excerpt: '',
  summary: null,
  content: 'Existing body',
  coverImageUrl: null,
  topics: [{ id: 't1', name: 'llms' }],
  sourceUrl: [],
  readTimeMinutes: 1,
  likeCount: 0, dislikeCount: 0, commentCount: 0, viewCount: 0, saveCount: 0,
  isLikedByMe: false, isDislikedByMe: false, isBookmarkedByMe: false,
  createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
};

describe('PostEditor (integration)', () => {
  it('(PE-1) disables Publish on an empty new post', () => {
    renderAt('/post/new');
    expect(screen.getByRole('button', { name: 'Publish' })).toBeDisabled();
  });

  it('(PE-2) enables Publish once title and body satisfy the contract', async () => {
    renderAt('/post/new');
    await userEvent.type(screen.getByLabelText('Post title'), 'Hello world');
    await userEvent.type(screen.getByLabelText('Post body'), 'Body');
    expect(screen.getByRole('button', { name: 'Publish' })).toBeEnabled();
  });

  it('(PE-3) publishing creates the post and navigates to it', async () => {
    renderAt('/post/new');
    await userEvent.type(screen.getByLabelText('Post title'), 'Hello world');
    await userEvent.type(screen.getByLabelText('Post body'), 'Body text');
    await userEvent.click(screen.getByRole('button', { name: 'Publish' }));
    await userEvent.click(screen.getByRole('button', { name: 'Publish now' }));
    await waitFor(() =>
      expect(svc.createPost).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Hello world', content: 'Body text', status: 'PUBLISHED' }),
      ),
    );
    expect(await screen.findByText('detail:new-id')).toBeInTheDocument();
  });

  it('(PE-4) edit mode loads an existing post', async () => {
    svc.getPost.mockResolvedValue(RESPONSE);
    renderAt('/post/p1/edit');
    expect(await screen.findByDisplayValue('Existing title')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Existing body')).toBeInTheDocument();
    expect(svc.getPost).toHaveBeenCalledWith('p1');
  });

  it('(PE-5) the Bold toolbar button wraps the selected text', async () => {
    renderAt('/post/new');
    const body = screen.getByLabelText('Post body') as HTMLTextAreaElement;
    await userEvent.type(body, 'word');
    body.setSelectionRange(0, 4);
    await userEvent.click(screen.getByRole('button', { name: /^Bold/i }));
    expect(body.value).toBe('**word**');
  });

  it('(PE-6) the Preview toggle renders Markdown', async () => {
    renderAt('/post/new');
    await userEvent.type(screen.getByLabelText('Post body'), '## Heading');
    await userEvent.click(screen.getByRole('button', { name: 'Preview' }));
    expect(screen.getByRole('heading', { level: 2, name: 'Heading' })).toBeInTheDocument();
  });

  it('(PE-7) selecting a cover image uploads it and shows the preview', async () => {
    renderAt('/post/new');
    const input = screen.getByTestId('cover-input') as HTMLInputElement;
    await userEvent.upload(input, new File(['x'], 'cover.png', { type: 'image/png' }));
    expect(await screen.findByAltText('Cover')).toHaveAttribute('src', 'https://cdn/img.png');
    expect(svc.uploadFile).toHaveBeenCalled();
  });

  it('(PE-8) leaving with unsaved changes offers to save a draft', async () => {
    renderAt('/post/new');
    await userEvent.type(screen.getByLabelText('Post title'), 'Hello world');
    await userEvent.click(screen.getByRole('button', { name: /^Back to / }));
    const saveDraft = await screen.findByRole('button', { name: 'Save draft' });
    await userEvent.click(saveDraft);
    await waitFor(() =>
      expect(svc.createPost).toHaveBeenCalledWith(expect.objectContaining({ status: 'DRAFT' })),
    );
    expect(await screen.findByText('HOME')).toBeInTheDocument();
  });
});
