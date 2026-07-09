import type { Comment, FeedPage, Post, PostDetail, DigestListItem, DigestDetail, DigestType, TopicCategory, TodayDigest, User, PostResponse, PostSummaryResponse } from '../types';
import api from './api';
import recommendationApi from './recommendationApi';
import { getUser } from './tokenStore';
import axios from 'axios';

/** recommendation-service FeedPage: an ordered ID list, hydrated separately via content-service. */
interface FeedIdPage {
  postIds: string[];
  nextCursor: string | null;
}

/** content-service PostCard — the lightweight feed-card shape (no article body). */
interface PostCardResponse {
  id: string;
  author: User;
  title: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  topics: { id: string; name: string }[];
  readTimeMinutes: number | null;
  likeCount: number;
  commentCount: number;
  viewCount: number;
  isLikedByMe: boolean;
  createdAt: string;
}

function toCardPost(c: PostCardResponse): Post {
  return {
    id: c.id,
    title: c.title,
    excerpt: c.excerpt ?? '',
    coverImageUrl: c.coverImageUrl ?? undefined,
    author: c.author,
    topics: c.topics,
    likeCount: c.likeCount,
    commentCount: c.commentCount,
    viewCount: c.viewCount,
    isLikedByMe: c.isLikedByMe,
    createdAt: c.createdAt,
    readTimeMinutes: c.readTimeMinutes ?? undefined,
  };
}

/** content-service CommentResponse — hierarchical; author is an AuthorSummary (User-shaped). */
interface CommentResponse {
  id: string;
  author: User;
  text: string;
  likeCount: number;
  isLikedByMe: boolean;
  createdAt: string;
  replies: CommentResponse[];
}

function toComment(c: CommentResponse): Comment {
  return {
    id: c.id,
    author: { ...c.author, avatarUrl: c.author.avatarUrl ?? undefined },
    text: c.text,
    likeCount: c.likeCount,
    isLikedByMe: c.isLikedByMe,
    createdAt: c.createdAt,
    replies: c.replies.map(toComment),
  };
}

function toPostDetail(r: PostResponse): PostDetail {
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
    content: r.content,
    summary: r.summary ?? null,
    summaryStatus: r.summaryStatus,
    summaryGeneratedAt: r.summaryGeneratedAt ?? null,
    summaryModel: r.summaryModel ?? null,
    saveCount: r.saveCount,
    isBookmarkedByMe: r.isBookmarkedByMe,
    readTimeMinutes: r.readTimeMinutes,
    sources: r.sourceUrl.map((url) => ({ label: url, url })),
  };
}

/**
 * Real feed (ADR-0012, two hops): recommendation-service returns an ordered ID page
 * (personal when logged in, trending otherwise / when a topic is selected), then
 * content-service hydrates the cards. Order is preserved against the ID list defensively.
 */
async function fetchRealFeed(cursor: string | null, topic: string | null): Promise<FeedPage> {
  const params: Record<string, string> = {};
  if (cursor) params.cursor = cursor;

  let path = '/api/v1/feed/trending';
  if (topic) {
    params.topic = topic;
  } else if (getUser()) {
    path = '/api/v1/feed/personal';
  }

  const { data: feed } = await recommendationApi.get<FeedIdPage>(path, { params });
  if (feed.postIds.length === 0) return { posts: [], nextCursor: feed.nextCursor };

  const { data: cards } = await api.get<PostCardResponse[]>('/api/v1/posts/cards', {
    params: { ids: feed.postIds.join(',') },
  });
  const byId = new Map(cards.map((c) => [c.id, c]));
  const posts = feed.postIds
    .map((id) => byId.get(id))
    .filter((c): c is PostCardResponse => Boolean(c))
    .map(toCardPost);

  return { posts, nextCursor: feed.nextCursor };
}

/** content-service PostResponse → the lightweight feed-card Post (search + digest reuse this). */
function toFeedPost(r: PostResponse): Post {
  return {
    id: r.id,
    title: r.title,
    excerpt: r.excerpt ?? '',
    coverImageUrl: r.coverImageUrl ?? undefined,
    author: r.author,
    topics: r.topics,
    likeCount: r.likeCount,
    commentCount: r.commentCount,
    viewCount: r.viewCount,
    isLikedByMe: r.isLikedByMe,
    createdAt: r.createdAt,
    readTimeMinutes: r.readTimeMinutes ?? undefined,
  };
}

/** content-service DigestSummary (list/card projection, no events). */
interface DigestSummaryResponse {
  id: string;
  digestType: DigestType;
  digestDate: string;
  title: string;
  subtitle?: string | null;
  summary?: string | null;
  eventCount?: number;
  sourceCount?: number;
  readTimeMinutes?: number;
  previewHeadlines?: string[];
  topics?: { id: string; name: string }[];
  generatedAt?: string | null;
  createdAt: string;
}

/** content-service DigestDetail (summary fields + full event stream). */
interface DigestDetailResponse extends DigestSummaryResponse {
  events?: {
    headline: string;
    summaryBullets?: string[];
    topicIds?: string[];
    sources?: { url: string; sourceName?: string | null; provider?: string | null; publishedAt?: string | null; title?: string | null }[];
  }[];
}

/** DigestSummary → the Past Digests list-card shape. */
function toDigestListItem(r: DigestSummaryResponse): DigestListItem {
  return {
    id: r.id,
    date: r.digestDate,
    displayDate: new Date(r.digestDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
    digestType: r.digestType,
    title: r.title,
    eventCount: r.eventCount ?? 0,
    readTimeMinutes: r.readTimeMinutes ?? 5,
  };
}

/** DigestSummary → the "today" hero model. */
function toTodayDigest(r: DigestSummaryResponse): TodayDigest {
  const ts = r.generatedAt ?? r.createdAt;
  return {
    id: r.id,
    date: r.digestDate,
    digestType: r.digestType,
    title: r.title,
    topStorySubtitle: r.subtitle ?? r.summary ?? '',
    previewHeadlines: r.previewHeadlines ?? [],
    eventCount: r.eventCount ?? 0,
    readTimeMinutes: r.readTimeMinutes ?? 5,
    generatedAt: new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    status: 'generated',
  };
}

/** DigestDetail response → the reader model with a structured event stream. */
function toDigestDetail(r: DigestDetailResponse): DigestDetail {
  return {
    id: r.id,
    digestType: r.digestType,
    date: r.digestDate,
    title: r.title,
    subtitle: r.subtitle ?? '',
    summary: r.summary ?? '',
    eventCount: r.eventCount ?? (r.events?.length ?? 0),
    sourceCount: r.sourceCount ?? 0,
    readTimeMinutes: r.readTimeMinutes ?? 5,
    previewHeadlines: r.previewHeadlines ?? [],
    topics: (r.topics ?? []).map((t) => ({ id: t.id, name: t.name })),
    events: (r.events ?? []).map((e) => ({
      headline: e.headline,
      summaryBullets: e.summaryBullets ?? [],
      topicIds: e.topicIds ?? [],
      sources: (e.sources ?? []).map((s) => ({
        url: s.url,
        sourceName: s.sourceName ?? null,
        provider: s.provider ?? null,
        publishedAt: s.publishedAt ?? null,
        title: s.title ?? null,
      })),
    })),
    generatedAt: r.generatedAt ?? null,
    createdAt: r.createdAt,
  };
}

export const contentService = {
  getPosts(cursor: string | null, topic: string | null): Promise<FeedPage> {
    return fetchRealFeed(cursor, topic);
  },

  async toggleLike(postId: string, like: boolean): Promise<{ likeCount: number; isLikedByMe: boolean }> {
    const { data } = await api.post<{ likeCount: number; isLikedByMe: boolean }>(
      `/api/v1/posts/${postId}/like`,
      { type: like ? 'LIKE' : 'NONE' },
    );
    return { likeCount: data.likeCount, isLikedByMe: data.isLikedByMe };
  },

  // Topic chips for the feed filter bar — trending topics from content-service. `name` is the
  // slug passed to the trending feed's `?topic=`; `displayName` is what the chip shows.
  async getAvailableTopics(): Promise<{ id: string; name: string; displayName: string }[]> {
    const { data } = await api.get<{ id: string; name: string; displayName: string | null }[]>(
      '/api/v1/topics/trending',
    );
    return data.map((t) => ({ id: t.id, name: t.name, displayName: t.displayName ?? t.name }));
  },

  async getPost(id: string): Promise<PostDetail> {
    const { data } = await api.get<PostResponse>(`/api/v1/posts/${id}`);
    return toPostDetail(data);
  },

  async getPostSummary(id: string): Promise<PostSummaryResponse> {
    const { data } = await api.get<PostSummaryResponse>(`/api/v1/posts/${id}/summary`);
    return data;
  },

  async getComments(postId: string): Promise<Comment[]> {
    const { data } = await api.get<CommentResponse[]>(`/api/v1/posts/${postId}/comments`);
    return data.map(toComment);
  },

  async addComment(postId: string, text: string, parentId?: string): Promise<Comment> {
    const { data } = await api.post<CommentResponse>(
      `/api/v1/posts/${postId}/comments`,
      parentId ? { text, parentId } : { text },
    );
    return toComment(data);
  },

  async likeComment(commentId: string, like: boolean): Promise<{ likeCount: number; isLikedByMe: boolean }> {
    const { data } = await api.post<{ likeCount: number; isLikedByMe: boolean }>(
      `/api/v1/comments/${commentId}/like`,
      { type: like ? 'LIKE' : 'NONE' },
    );
    return { likeCount: data.likeCount, isLikedByMe: data.isLikedByMe };
  },

  async toggleBookmark(postId: string, bookmark: boolean): Promise<void> {
    if (bookmark) await api.post(`/api/v1/posts/${postId}/bookmark`);
    else await api.delete(`/api/v1/posts/${postId}/bookmark`);
  },

  // Past Digests page (ADR-0019): the caller's digest history — personal digests plus assigned
  // public digests, newest first. Auth-required. "today" is derived client-side from the newest
  // item dated today.
  async getDigests(): Promise<{ today: TodayDigest | null; items: DigestListItem[] }> {
    const { data } = await api.get<{ content: DigestSummaryResponse[] }>('/api/v1/digests', {
      params: { page: 0, size: 30 },
    });
    // digestDate is generated in the digest timezone (Europe/Berlin), so derive "today" there too —
    // a browser-local/UTC date drifts a day for users outside Berlin near midnight. en-CA yields YYYY-MM-DD.
    const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin' }).format(new Date());
    const todaySummary = data.content.find((d) => d.digestDate === todayStr) ?? null;
    return {
      today: todaySummary ? toTodayDigest(todaySummary) : null,
      items: data.content.map(toDigestListItem),
    };
  },

  // Today's public digest (ADR-0018/0019): the newest PUBLIC digest, readable without login.
  // Powers the logged-out `/digest` surface. Returns null when no public digest exists (404).
  async getPublicTodayDigest(): Promise<TodayDigest | null> {
    try {
      const { data } = await api.get<DigestSummaryResponse>('/api/v1/digests/public/today');
      return toTodayDigest(data);
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 404) return null;
      throw e;
    }
  },

  // One digest with its full event stream (ADR-0019). Optional auth: a personal digest fetched
  // by a non-target caller 404s; public digests are open.
  async getDigest(id: string): Promise<DigestDetail> {
    const { data } = await api.get<DigestDetailResponse>(`/api/v1/digests/${id}`);
    return toDigestDetail(data);
  },

  // Manage Topics catalog — category-grouped topics with stats from content-service.
  async getTopicCategories(): Promise<TopicCategory[]> {
    const { data } = await api.get<TopicCategory[]>('/api/v1/topics');
    return data;
  },

  // Followed-topic set as topic UUIDs (recommendation-service speaks only UUIDs).
  async getFollowedTopicIds(): Promise<Set<string>> {
    const { data } = await recommendationApi.get<{ id: string; name: string }[]>(
      '/api/v1/subscriptions/topics',
    );
    return new Set(data.map((t) => t.id));
  },

  async followTopic(topicId: string): Promise<void> {
    await recommendationApi.post(`/api/v1/subscriptions/topics/${topicId}`);
  },

  async unfollowTopic(topicId: string): Promise<void> {
    await recommendationApi.delete(`/api/v1/subscriptions/topics/${topicId}`);
  },

  // Keyword search (PRD §3.6) — content-service full-text search. Page-based so the results
  // page can load more.
  async searchPosts(q: string, page: number): Promise<{ posts: Post[]; totalElements: number; hasMore: boolean }> {
    const { data } = await api.get<{ content: PostResponse[]; totalElements: number; totalPages: number; page: number }>(
      '/api/v1/posts/search',
      { params: { q, page, size: 20 } },
    );
    return {
      posts: data.content.map(toFeedPost),
      totalElements: data.totalElements,
      hasMore: data.page < data.totalPages - 1,
    };
  },
};
