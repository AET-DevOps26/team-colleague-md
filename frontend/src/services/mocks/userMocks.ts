/**
 * Demo-mode display layer for the four data-sparse, post-derived user reads
 * (posts, bookmarks, liked posts, drafts) — ADR-0011.
 *
 * Reached only when {@link isDemoMode} is true. Keyed by *seed* usernames
 * (scripts/seed/data/users.ts) so the mock and the real backend identities line up;
 * the retired `alice_verita`/`bob_verita` demo identities are intentionally gone.
 */
import type { DraftPost, Post } from '../../types';
import { contentService } from '../content.service';

/** Posts a demo user has bookmarked, by seed username. */
export const MOCK_BOOKMARKS: Record<string, Post[]> = {
  alexchen: contentService.getPostsByAuthor('sarahjkim').slice(0, 3),
  sarahjkim: contentService.getPostsByAuthor('priya_ml').slice(0, 2),
  priya_ml: contentService.getPostsByAuthor('marcello_r').slice(0, 2),
  marcello_r: contentService.getPostsByAuthor('sarahjkim').slice(0, 1),
  tobiask: contentService.getPostsByAuthor('alexchen').slice(0, 2),
};

/** Posts a demo user has liked, by seed username. */
export const MOCK_LIKED: Record<string, Post[]> = {
  alexchen: contentService.getPostsByAuthor('priya_ml').concat(contentService.getPostsByAuthor('marcello_r')),
  sarahjkim: contentService.getPostsByAuthor('marcello_r'),
  priya_ml: contentService.getPostsByAuthor('sarahjkim').slice(0, 2),
  marcello_r: contentService.getPostsByAuthor('priya_ml').slice(0, 1),
  tobiask: contentService.getPostsByAuthor('sarahjkim').slice(0, 2).concat(contentService.getPostsByAuthor('alexchen').slice(0, 1)),
};

/** Draft posts shown on the current user's profile in demo mode. */
export const MOCK_DRAFTS: DraftPost[] = [
  {
    id: 'd1',
    title: 'When RAG Fails: A Taxonomy of Retrieval Errors',
    excerpt: 'Three patterns I keep seeing across production RAG systems — and what you can actually do about them.',
    topics: [{ id: 't4', name: 'RAG' }, { id: 't1', name: 'LLMs' }],
    updatedAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
  },
  {
    id: 'd2',
    title: 'Tool-Use Patterns for Agentic Systems',
    excerpt: 'What separates a demo agent from a production one usually isn\'t the model — it\'s how you define and validate tool schemas.',
    topics: [{ id: 't2', name: 'Agents' }],
    updatedAt: new Date(Date.now() - 26 * 3600 * 1000).toISOString(),
  },
];
