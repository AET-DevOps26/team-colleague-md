export interface User {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  role: 'USER' | 'VERIFIED' | 'ADMIN';
  organisation?: string;
}

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  bio?: string | null;
  website?: string | null;
  organisation?: string | null;
  expertiseAreas?: string[];
  role: 'USER' | 'VERIFIED' | 'ADMIN';
  isBanned: boolean;
  postCount: number;
  followerCount: number;
  followingCount: number;
  likeReceivedCount: number;
  createdAt: string;
  updatedAt: string;
  email?: string;
}

export interface UpdateUserRequest {
  displayName?: string;
  bio?: string | null;
  avatarUrl?: string | null;
  website?: string | null;
  organisation?: string | null;
  expertiseAreas?: string[] | null;
}

export interface DraftPost {
  id: string;
  title: string;
  excerpt: string;
  topics: Topic[];
  updatedAt: string;
}

export interface Topic {
  id: string;
  name: string;
}

export interface Post {
  id: string;
  title: string;
  excerpt: string;
  coverImageUrl?: string;
  author: User;
  topics: Topic[];
  likeCount: number;
  commentCount: number;
  viewCount: number;
  isLikedByMe: boolean;
  createdAt: string;
  readTimeMinutes?: number;
}

export interface TodayDigest {
  date: string;
  title: string;
  topStorySubtitle: string;
  eventCount: number;
  readTimeMinutes: number;
  generatedAt: string;
  status: 'generated' | 'generating';
}

export interface DigestListItem {
  date: string;
  displayDate: string;
  title: string;
  eventCount: number;
  readTimeMinutes: number;
}

/** Mirrors content-service OpenAPI TopicResponse */
export interface TopicItem {
  id: string;
  name: string;
  displayName: string;
  sortOrder: number;
  totalPostCount: number;
  postsThisWeek: number;
  postsPrevWeek: number;
  activityScore: number;
  isHot: boolean;
  followerCount: number;
}

/** Mirrors content-service OpenAPI TopicCategoryGroup */
export interface TopicCategory {
  id: string;
  label: string;
  sortOrder: number;
  topics: TopicItem[];
}

export interface FeedPage {
  posts: Post[];
  nextCursor: string | null;
}

export interface PostSource {
  label: string;
  url: string;
}

export interface PostDetail extends Post {
  saveCount: number;
  isBookmarkedByMe: boolean;
  readTimeMinutes: number;
  sources: PostSource[];
}

export interface Comment {
  id: string;
  author: User;
  text: string;
  likeCount: number;
  isLikedByMe: boolean;
  createdAt: string;
  replies: Comment[];
}

export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  role: 'USER' | 'VERIFIED' | 'ADMIN';
  email: string;
}

// ── Post authoring (mirrors content-service OpenAPI) ──────────

export type PostStatus = 'DRAFT' | 'PUBLISHED';

/** Mirrors content-service OpenAPI PostRequest (create / full replace). */
export interface PostRequest {
  title: string;
  content: string;
  excerpt?: string;
  coverImageUrl?: string | null;
  sourceUrl?: string[];
  topics?: string[];
  status?: PostStatus;
}

/** Mirrors content-service OpenAPI PostPatchRequest (partial update). */
export interface PostPatchRequest {
  title?: string;
  content?: string;
  excerpt?: string | null;
  coverImageUrl?: string | null;
  sourceUrl?: string[];
  topics?: string[];
  status?: PostStatus;
}

/** Mirrors content-service OpenAPI PostResponse. */
export interface PostResponse {
  id: string;
  author: User;
  status: PostStatus;
  type: 'NORMAL' | 'DIGEST';
  title: string;
  excerpt: string;
  summary?: string | null;
  content: string;
  coverImageUrl?: string | null;
  topics: Topic[];
  sourceUrl: string[];
  readTimeMinutes: number;
  likeCount: number;
  dislikeCount: number;
  commentCount: number;
  viewCount: number;
  saveCount: number;
  isLikedByMe: boolean;
  isDislikedByMe: boolean;
  isBookmarkedByMe: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Mirrors content-service OpenAPI FileUploadResponse. */
export interface FileUploadResponse {
  url: string;
}

/**
 * The Post Editor's working draft state — what the form binds to.
 * `id` is null for an unsaved new post; topics are Topic name slugs.
 */
export interface EditorPost {
  id: string | null;
  title: string;
  content: string;
  coverImageUrl: string | null;
  sources: string[];
  topics: string[];
  status: PostStatus;
}
