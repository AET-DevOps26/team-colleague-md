import axios from 'axios';
import api from './api';
import type {
  FileUploadResponse,
  PostPatchRequest,
  PostRequest,
  PostResponse,
  TopicItem,
} from '../types';

/** Pulls the content-service `ErrorResponse.message` off a failed request, falling back to a default. */
export function uploadErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const message = (err.response?.data as { message?: string } | undefined)?.message;
    if (message) return message;
  }
  return fallback;
}

/**
 * Real content-service calls for the Post Editor (ADR-0010 file-upload proxy).
 * Distinct from the still-mocked `content.service.ts`; this module is wired to
 * the live backend via the shared `api` axios instance.
 */
export const postEditorService = {
  /** Upload a cover or inline image; returns its public URL (ADR-0010). */
  async uploadFile(file: File): Promise<string> {
    const form = new FormData();
    form.append('file', file);
    const { data } = await api.post<FileUploadResponse>('/api/v1/files', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.url;
  },

  async searchTopics(q: string): Promise<TopicItem[]> {
    const { data } = await api.get<TopicItem[]>('/api/v1/topics/search', {
      params: { q },
    });
    return data;
  },

  async createPost(req: PostRequest): Promise<PostResponse> {
    const { data } = await api.post<PostResponse>('/api/v1/posts', req);
    return data;
  },

  async getPost(id: string): Promise<PostResponse> {
    const { data } = await api.get<PostResponse>(`/api/v1/posts/${id}`);
    return data;
  },

  async updatePost(id: string, patch: PostPatchRequest): Promise<PostResponse> {
    const { data } = await api.patch<PostResponse>(`/api/v1/posts/${id}`, patch);
    return data;
  },
};
