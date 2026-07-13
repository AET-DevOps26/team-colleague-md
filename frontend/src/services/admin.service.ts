import type {
  AdminUser,
  AdminUserPage,
  DigestGenerationJob,
  FailedSummaryPage,
  LlmConfig,
  PostSummaryResponse,
  UserRole,
} from '../types';
import api from './api';
import userApi from './userApi';

/**
 * Admin panel data access (ADR-0020).
 *
 * User management lives in user-service; the GenAI ops live behind content-service's admin front
 * door, which forwards to genai-service over the internal-token channel — the browser never talks
 * to GenAI directly. Every call here requires an ADMIN token and 403s otherwise.
 */
export const adminService = {
  // ── Users ───────────────────────────────────────────────────

  /** Server-side search + pagination; `q` empty means "all users". */
  async listUsers(q: string, page: number, size: number): Promise<AdminUserPage> {
    const { data } = await userApi.get<AdminUserPage>('/api/v1/users', {
      params: { ...(q ? { q } : {}), page, size },
    });
    return data;
  },

  async updateUserRole(userId: string, role: UserRole): Promise<AdminUser> {
    const { data } = await userApi.patch<AdminUser>(`/api/v1/users/${userId}/role`, { role });
    return data;
  },

  async updateUserBanStatus(userId: string, banned: boolean): Promise<AdminUser> {
    const { data } = await userApi.patch<AdminUser>(`/api/v1/users/${userId}/ban`, { banned });
    return data;
  },

  // ── GenAI ops ───────────────────────────────────────────────

  async getLlmConfig(): Promise<LlmConfig> {
    const { data } = await api.get<LlmConfig>('/api/v1/admin/genai/llm-config');
    return data;
  },

  /** Rejected with 400 if the provider has no API key configured. */
  async updateLlmConfig(provider: string, model: string): Promise<LlmConfig> {
    const { data } = await api.put<LlmConfig>('/api/v1/admin/genai/llm-config', { provider, model });
    return data;
  },

  async listFailedSummaries(page: number, size: number): Promise<FailedSummaryPage> {
    const { data } = await api.get<FailedSummaryPage>('/api/v1/admin/posts/summaries/failed', {
      params: { page, size },
    });
    return data;
  },

  /** Queues the summary (202). Poll `getPostSummary` for PENDING → COMPLETED/FAILED. */
  async resummarizePost(postId: string): Promise<void> {
    await api.post(`/api/v1/admin/posts/${postId}/summarize`);
  },

  /** Same endpoint the post detail page polls, reused here for re-summarize feedback. */
  async getPostSummary(postId: string): Promise<PostSummaryResponse> {
    const { data } = await api.get<PostSummaryResponse>(`/api/v1/posts/${postId}/summary`);
    return data;
  },

  // ── Digest ──────────────────────────────────────────────────

  /**
   * Starts generation for one user and one Platform Day (202). Generation is far too slow for a
   * request thread, so the server answers with a PENDING job; poll `getDigestJob` for the outcome.
   *
   * `date` is an ISO `YYYY-MM-DD` day. Omitting it lets the server default to yesterday.
   */
  async generateUserDigest(
    userId: string,
    date: string,
    force: boolean,
  ): Promise<DigestGenerationJob> {
    const { data } = await api.post<DigestGenerationJob>(
      `/api/v1/admin/digests/generate/users/${userId}`,
      null,
      { params: { date, force } },
    );
    return data;
  },

  async getDigestJob(jobId: string): Promise<DigestGenerationJob> {
    const { data } = await api.get<DigestGenerationJob>(`/api/v1/admin/digests/jobs/${jobId}`);
    return data;
  },
};

/**
 * Pulls a post ID out of whatever an admin pasted — a bare UUID or a post URL
 * (`/post/<uuid>`, with or without origin, query, or trailing segments).
 */
export function extractPostId(input: string): string | null {
  const uuid = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
  const match = input.trim().match(uuid);
  return match ? match[0].toLowerCase() : null;
}
