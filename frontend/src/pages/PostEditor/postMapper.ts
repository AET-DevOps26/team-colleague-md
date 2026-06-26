import type { EditorPost, PostPatchRequest, PostRequest, PostResponse, PostStatus } from '../../types';

const clean = (xs: string[]): string[] => xs.map((x) => x.trim()).filter(Boolean);

/** Hydrate editor state from a fetched post (edit flow). */
export function toEditorPost(res: PostResponse): EditorPost {
  return {
    id: res.id,
    title: res.title,
    content: res.content,
    coverImageUrl: res.coverImageUrl ?? null,
    sources: res.sourceUrl ?? [],
    topics: (res.topics ?? []).map((t) => t.name),
    status: res.status,
  };
}

/** Build a create payload, stamping the chosen publish/draft status. */
export function toCreateRequest(post: EditorPost, status: PostStatus): PostRequest {
  return {
    title: post.title,
    content: post.content,
    coverImageUrl: post.coverImageUrl,
    sourceUrl: clean(post.sources),
    topics: clean(post.topics),
    status,
  };
}

/**
 * Build a partial update. `status` is included only when explicitly passed, so
 * saving edits to a published post never downgrades it to a draft.
 */
export function toPatchRequest(post: EditorPost, status?: PostStatus): PostPatchRequest {
  const patch: PostPatchRequest = {
    title: post.title,
    content: post.content,
    coverImageUrl: post.coverImageUrl,
    sourceUrl: clean(post.sources),
    topics: clean(post.topics),
  };
  if (status) patch.status = status;
  return patch;
}
