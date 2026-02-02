export interface User {
  id: string;
  username: string;
  avatarUrl: string;
}

export interface Comment {
  id: string;
  postId: string;
  parentId: string | null;
  author: User;
  content: string;
  likes: number;
  hasLiked: boolean; 
  createdAt: string;
  depth: number; 
}

export interface Post {
  id: string;
  author: User;
  content: string;
  likes: number;
  hasLiked: boolean;
  commentCount: number;
  createdAt: string;
  comments: Comment[]; 
}

export interface LeaderboardEntry {
  user: User;
  score: number;
  rank: number;
  previousRank: number; 
}

export interface KarmaTransaction {
  id: string;
  userId: string;
  sourceId: string;
  sourceType: 'POST' | 'COMMENT';
  amount: number;
  timestamp: number;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
