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
