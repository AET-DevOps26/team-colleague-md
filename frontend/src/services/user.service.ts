import type { UserProfile, UpdateUserRequest, DraftPost, Post, PostResponse } from '../types';
import { contentService } from './content.service';
import { isDemoMode } from './demoMode';
import { MOCK_BOOKMARKS, MOCK_LIKED, MOCK_DRAFTS } from './mocks/userMocks';
import api from './api';
import userApi from './userApi';

/** Maps a content-service PostResponse to the lightweight card-shaped Post. */
function toCardPost(r: PostResponse): Post {
  return {
    id: r.id,
    title: r.title,
    excerpt: r.excerpt,
    coverImageUrl: r.coverImageUrl ?? undefined,
    author: r.author,
    topics: r.topics,
    likeCount: r.likeCount,
    commentCount: r.commentCount,
    viewCount: r.viewCount,
    isLikedByMe: r.isLikedByMe,
    createdAt: r.createdAt,
    readTimeMinutes: r.readTimeMinutes,
  };
}

/** Resolves a username to its content-service / user-service UUID. */
async function resolveUserId(username: string): Promise<string> {
  const { data } = await userApi.get<{ id: string }>(
    `/api/v1/users/by-username/${encodeURIComponent(username)}`,
  );
  return data.id;
}

/** Fetches one page of the current user's published posts from a content-service collection. */
async function fetchUserPostPage(path: string): Promise<Post[]> {
  const { data } = await api.get<{ content: PostResponse[] }>(path, {
    params: { page: 0, size: 50 },
  });
  return data.content.map(toCardPost);
}

/** Converts a base64 `data:` URL (the cropped avatar from EditProfileModal) to a Blob for multipart upload. */
function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',');
  const mime = header.match(/data:(.*?);/)?.[1] ?? 'image/png';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export const userService = {
  async getProfile(username: string): Promise<UserProfile> {
    const { data } = await userApi.get<UserProfile>(
      `/api/v1/users/by-username/${encodeURIComponent(username)}`,
    );
    return data;
  },

  // Published posts authored by the user. Demo mode serves seeded fixtures so the
  // profile and home feed look populated; real mode hits content-service with no fallback.
  async getUserPosts(username: string): Promise<Post[]> {
    if (isDemoMode()) return contentService.getPostsByAuthor(username);
    const userId = await resolveUserId(username);
    return fetchUserPostPage(`/api/v1/users/${userId}/posts`);
  },

  async getUserBookmarks(username: string): Promise<Post[]> {
    if (isDemoMode()) return MOCK_BOOKMARKS[username] ?? [];
    const userId = await resolveUserId(username);
    return fetchUserPostPage(`/api/v1/users/${userId}/bookmarks`);
  },

  async getUserLikedPosts(username: string): Promise<Post[]> {
    if (isDemoMode()) {
      return (MOCK_LIKED[username] ?? []).map((p) => ({ ...p, isLikedByMe: true }));
    }
    const userId = await resolveUserId(username);
    return fetchUserPostPage(`/api/v1/users/${userId}/likes`);
  },

  async getUserDrafts(_username: string): Promise<DraftPost[]> {
    if (isDemoMode()) return [...MOCK_DRAFTS];
    const { data } = await api.get<{ content: PostResponse[] }>('/api/v1/me/drafts', {
      params: { page: 0, size: 50 },
    });
    return data.content.map((r) => ({
      id: r.id,
      title: r.title,
      excerpt: r.excerpt,
      topics: r.topics,
      updatedAt: r.updatedAt,
    }));
  },

  // Profile edits are always real (own profile only). Text fields go to PUT /users/me;
  // the avatar — a freshly cropped `data:` URL or a clear — uses the dedicated multipart endpoint.
  async updateProfile(_username: string, data: UpdateUserRequest & { avatarUrl?: string | null }): Promise<UserProfile> {
    const { avatarUrl, ...fields } = data;
    let { data: user } = await userApi.put<UserProfile>('/api/v1/users/me', fields);

    if (typeof avatarUrl === 'string' && avatarUrl.startsWith('data:')) {
      const form = new FormData();
      form.append('avatar', dataUrlToBlob(avatarUrl), 'avatar');
      ({ data: user } = await userApi.put<UserProfile>('/api/v1/users/me/avatar', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }));
    } else if (avatarUrl === null && user.avatarUrl) {
      ({ data: user } = await userApi.delete<UserProfile>('/api/v1/users/me/avatar'));
    }

    return user;
  },
};
