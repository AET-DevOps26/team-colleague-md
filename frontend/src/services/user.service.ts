import type { UserProfile, UpdateUserRequest, DraftPost, Post } from '../types';
import { contentService } from './content.service';

const PROFILE_KEY_PREFIX = 'verita_profile_';

const MOCK_PROFILES: Record<string, UserProfile> = {
  alexchen: {
    id: 'user-1',
    username: 'alexchen',
    displayName: 'Alex Chen',
    avatarUrl: null,
    bio: 'ML engineer building agents and RAG systems. Writing about practical AI implementation — the parts that don\'t make it into the paper abstracts.',
    website: 'https://alexchen.dev',
    organisation: null,
    expertiseAreas: ['Agents', 'RAG', 'Fine-tuning'],
    role: 'USER',
    isBanned: false,
    postCount: 12,
    followerCount: 342,
    followingCount: 89,
    likeReceivedCount: 1840,
    createdAt: '2024-03-15T10:00:00Z',
    updatedAt: '2025-05-10T08:00:00Z',
    email: 'alex@example.com',
  },
  sarahjkim: {
    id: 'u1',
    username: 'sarahjkim',
    displayName: 'Sarah Kim',
    avatarUrl: null,
    bio: 'Researcher at DeepMind. Working on mechanistic interpretability and alignment. I summarize papers so you don\'t have to.',
    website: null,
    organisation: 'DeepMind',
    expertiseAreas: ['Interpretability', 'Alignment', 'Fine-tuning'],
    role: 'VERIFIED',
    isBanned: false,
    postCount: 47,
    followerCount: 2100,
    followingCount: 183,
    likeReceivedCount: 8400,
    createdAt: '2024-01-10T00:00:00Z',
    updatedAt: '2025-05-20T12:00:00Z',
  },
  priya_ml: {
    id: 'u3',
    username: 'priya_ml',
    displayName: 'Priya Nair',
    avatarUrl: null,
    bio: 'Open source ML at Hugging Face. Making large models accessible. RAG researcher and retrieval nerd.',
    website: 'https://priyanair.dev',
    organisation: 'Hugging Face',
    expertiseAreas: ['RAG', 'Open Source', 'Multimodal'],
    role: 'VERIFIED',
    isBanned: false,
    postCount: 31,
    followerCount: 1450,
    followingCount: 212,
    likeReceivedCount: 5200,
    createdAt: '2024-02-20T00:00:00Z',
    updatedAt: '2025-04-15T09:30:00Z',
  },
  marcello_r: {
    id: 'u2',
    username: 'marcello_r',
    displayName: 'Marcello Rossi',
    avatarUrl: null,
    bio: 'Building AI systems in production at a small team. Interested in the gap between research and engineering reality.',
    website: 'https://marcellorossi.io',
    organisation: null,
    expertiseAreas: ['Agents', 'LLMs'],
    role: 'USER',
    isBanned: false,
    postCount: 8,
    followerCount: 127,
    followingCount: 45,
    likeReceivedCount: 654,
    createdAt: '2024-06-01T00:00:00Z',
    updatedAt: '2025-03-28T14:00:00Z',
  },
};

const FALLBACK_PROFILE: UserProfile = {
  id: 'unknown',
  username: 'unknown',
  displayName: 'Unknown User',
  avatarUrl: null,
  bio: null,
  website: null,
  organisation: null,
  expertiseAreas: [],
  role: 'USER',
  isBanned: false,
  postCount: 0,
  followerCount: 0,
  followingCount: 0,
  likeReceivedCount: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const MOCK_BOOKMARKS: Record<string, Post[]> = {
  alexchen: contentService.getPostsByAuthor('sarahjkim').slice(0, 3),
  sarahjkim: contentService.getPostsByAuthor('priya_ml').slice(0, 2),
  priya_ml: contentService.getPostsByAuthor('marcello_r').slice(0, 2),
  marcello_r: contentService.getPostsByAuthor('sarahjkim').slice(0, 1),
};

const MOCK_LIKED: Record<string, Post[]> = {
  alexchen: contentService.getPostsByAuthor('priya_ml').concat(contentService.getPostsByAuthor('marcello_r')),
  sarahjkim: contentService.getPostsByAuthor('marcello_r'),
  priya_ml: contentService.getPostsByAuthor('sarahjkim').slice(0, 2),
  marcello_r: contentService.getPostsByAuthor('priya_ml').slice(0, 1),
};

const MOCK_DRAFTS: DraftPost[] = [
  {
    id: 'd1',
    title: 'When RAG Fails: A Taxonomy of Retrieval Errors',
    excerpt: 'Three patterns I keep seeing across production RAG systems — and what you can actually do about them.',
    tags: [{ id: 't4', name: 'RAG' }, { id: 't1', name: 'LLMs' }],
    updatedAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
  },
  {
    id: 'd2',
    title: 'Tool-Use Patterns for Agentic Systems',
    excerpt: 'What separates a demo agent from a production one usually isn\'t the model — it\'s how you define and validate tool schemas.',
    tags: [{ id: 't2', name: 'Agents' }],
    updatedAt: new Date(Date.now() - 26 * 3600 * 1000).toISOString(),
  },
];

function loadStoredOverride(username: string): Partial<UserProfile> | null {
  const raw = localStorage.getItem(PROFILE_KEY_PREFIX + username);
  return raw ? (JSON.parse(raw) as Partial<UserProfile>) : null;
}

export const userService = {
  getProfile(username: string): Promise<UserProfile> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const base = MOCK_PROFILES[username] ?? { ...FALLBACK_PROFILE, username, displayName: username };
        const override = loadStoredOverride(username);
        resolve(override ? { ...base, ...override } : base);
      }, 300);
    });
  },

  getUserPosts(username: string): Promise<Post[]> {
    return new Promise((resolve) => {
      setTimeout(() => resolve(contentService.getPostsByAuthor(username)), 250);
    });
  },

  getUserBookmarks(username: string): Promise<Post[]> {
    return new Promise((resolve) => {
      setTimeout(() => resolve(MOCK_BOOKMARKS[username] ?? []), 250);
    });
  },

  getUserLikedPosts(username: string): Promise<Post[]> {
    return new Promise((resolve) => {
      const posts = (MOCK_LIKED[username] ?? []).map((p) => ({ ...p, isLikedByMe: true }));
      setTimeout(() => resolve(posts), 250);
    });
  },

  getUserDrafts(_username: string): Promise<DraftPost[]> {
    return new Promise((resolve) => {
      setTimeout(() => resolve([...MOCK_DRAFTS]), 250);
    });
  },

  updateProfile(username: string, data: UpdateUserRequest): Promise<UserProfile> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const base = MOCK_PROFILES[username] ?? { ...FALLBACK_PROFILE, username };
        const stored = loadStoredOverride(username) ?? {};
        const merged: Partial<UserProfile> = {
          ...stored,
          ...data,
          expertiseAreas: data.expertiseAreas ?? undefined,
          updatedAt: new Date().toISOString(),
        };

        // Store the full merged profile including avatarUrl.
        // try/catch below handles QuotaExceededError if the base64 is too large;
        // in that case the avatar lives in MOCK_PROFILES memory only (session-scoped).
        const toStore = merged;

        try {
          localStorage.setItem(PROFILE_KEY_PREFIX + username, JSON.stringify(toStore));
        } catch {
          // quota exceeded — skip persistence, keep in-memory only
        }

        // Update in-memory profile so getProfile() returns the new avatar for this session
        if (MOCK_PROFILES[username]) {
          MOCK_PROFILES[username] = { ...MOCK_PROFILES[username], ...merged } as UserProfile;
        }

        resolve({ ...base, ...merged });
      }, 400);
    });
  },
};
