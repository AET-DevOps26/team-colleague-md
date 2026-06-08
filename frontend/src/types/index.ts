export interface User {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  role: 'USER' | 'VERIFIED' | 'ADMIN';
  organisation?: string;
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

export interface DigestSummary {
  date: string;
  title: string;
  topStorySubtitle: string;
  eventCount: number;
  readTimeMinutes: number;
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
