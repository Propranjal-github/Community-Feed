import { Post, User, LeaderboardEntry, KarmaTransaction } from '../types';

let CURRENT_USER_ID: string | null = null; // Start logged out

const USERS: Record<string, User> = {
  'u1': { id: 'u1', username: 'DevWizard', avatarUrl: 'https://picsum.photos/seed/u1/200' },
  'u2': { id: 'u2', username: 'SpeedRunner', avatarUrl: 'https://picsum.photos/seed/u2/200' },
  'u3': { id: 'u3', username: 'PixelArtist', avatarUrl: 'https://picsum.photos/seed/u3/200' },
  'u4': { id: 'u4', username: 'AlgoMaster', avatarUrl: 'https://picsum.photos/seed/u4/200' },
  'u5': { id: 'u5', username: 'ReactFan', avatarUrl: 'https://picsum.photos/seed/u5/200' },
  'u6': { id: 'u6', username: 'DjangoRebel', avatarUrl: 'https://picsum.photos/seed/u6/200' },
};

let POSTS_DB = [
  { id: 'p1', authorId: 'u2', content: 'Just optimized my Docker build time by 50%! 🚀', likes: 12, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString() }, 
  { id: 'p2', authorId: 'u4', content: 'Is HTMX replacing React? Honest thoughts below.', likes: 45, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString() },
  { id: 'p3', authorId: 'u3', content: 'The new Tailwind v4 engine is insanely fast.', likes: 8, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 25).toISOString() },
  { id: 'p4', authorId: 'u5', content: 'Why I love TypeScript (Thread 1/5)', likes: 22, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString() },
  { id: 'p5', authorId: 'u6', content: 'Python 3.13 GIL removal is huge.', likes: 30, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 50).toISOString() },
];

let COMMENTS_DB = [
  { id: 'c1', postId: 'p1', parentId: null, authorId: 'u3', content: 'Multi-stage builds?', likes: 5, createdAt: new Date().toISOString() },
  { id: 'c2', postId: 'p1', parentId: 'c1', authorId: 'u2', content: 'Exactly. And caching layers.', likes: 2, createdAt: new Date().toISOString() },
  { id: 'c3', postId: 'p2', parentId: null, authorId: 'u1', content: 'No, they solve different problems.', likes: 15, createdAt: new Date().toISOString() },
  { id: 'c4', postId: 'p2', parentId: 'c3', authorId: 'u4', content: 'Fair point.', likes: 1, createdAt: new Date().toISOString() },
];

let KARMA_LOG: KarmaTransaction[] = [
  { id: 't1', userId: 'u3', sourceId: 'p3', sourceType: 'POST', amount: 5, timestamp: Date.now() - 1000 * 60 * 60 * 25 },
  { id: 't2', userId: 'u2', sourceId: 'p1', sourceType: 'POST', amount: 5, timestamp: Date.now() - 1000 * 60 * 60 * 2 },
  { id: 't3', userId: 'u3', sourceId: 'c1', sourceType: 'COMMENT', amount: 1, timestamp: Date.now() - 1000 * 60 * 60 * 1 },
];

const USER_LIKES = new Set<string>(); 

export const api = {
  // MOCK AUTH
  login: async (u: string, p: string): Promise<User> => {
     await new Promise(r => setTimeout(r, 600));
     if (u === 'fail') throw new Error("Invalid");
     CURRENT_USER_ID = 'u1'; // Force u1 login
     USERS['u1'].username = u; 
     return USERS['u1'];
  },

  signup: async (u: string, p: string): Promise<User> => {
     await new Promise(r => setTimeout(r, 600));
     const newId = `u${Date.now()}`;
     USERS[newId] = {
        id: newId,
        username: u,
        avatarUrl: `https://picsum.photos/seed/${newId}/200`
     };
     CURRENT_USER_ID = newId;
     return USERS[newId];
  },

  logout: async () => {
    CURRENT_USER_ID = null;
  },

  updateUsername: async (username: string): Promise<User> => {
    await new Promise(r => setTimeout(r, 400));
    if (CURRENT_USER_ID && USERS[CURRENT_USER_ID]) {
      USERS[CURRENT_USER_ID].username = username;
      return USERS[CURRENT_USER_ID];
    }
    throw new Error("User not found");
  },

  createPost: async (content: string): Promise<Post> => {
    if (!CURRENT_USER_ID) throw new Error("Auth required");
    await new Promise(r => setTimeout(r, 600));
    const newPost = {
      id: `p${Math.random().toString(36).substr(2, 9)}`,
      authorId: CURRENT_USER_ID,
      content,
      likes: 0,
      createdAt: new Date().toISOString()
    };
    POSTS_DB.unshift(newPost);
    
    return {
      ...newPost,
      author: USERS[CURRENT_USER_ID],
      hasLiked: false,
      commentCount: 0,
      comments: []
    };
  },

  createComment: async (postId: string, content: string, parentId?: string | null): Promise<boolean> => {
     if (!CURRENT_USER_ID) return false;
     await new Promise(r => setTimeout(r, 400));
     const newComment = {
       id: `c${Math.random().toString(36).substr(2, 9)}`,
       postId,
       parentId: parentId || null,
       authorId: CURRENT_USER_ID,
       content,
       likes: 0,
       createdAt: new Date().toISOString()
     };
     COMMENTS_DB.push(newComment);
     return true;
  },

  getFeed: async (search?: string, ordering?: string): Promise<Post[]> => {
    await new Promise(r => setTimeout(r, 600));
    
    let posts = [...POSTS_DB];

    if (search) {
      const lowerSearch = search.toLowerCase();
      posts = posts.filter(p => 
        p.content.toLowerCase().includes(lowerSearch) || 
        USERS[p.authorId].username.toLowerCase().includes(lowerSearch)
      );
    }

    if (ordering === '-likes_count') {
      posts.sort((a, b) => b.likes - a.likes);
    } else {
      posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return posts.map(post => {
      const postComments = COMMENTS_DB.filter(c => c.postId === post.id).map(c => ({
        ...c,
        author: USERS[c.authorId],
        hasLiked: USER_LIKES.has(`comment_${c.id}`),
        depth: 0 
      }));

      return {
        ...post,
        author: USERS[post.authorId],
        hasLiked: USER_LIKES.has(`post_${post.id}`),
        commentCount: postComments.length,
        comments: postComments,
      };
    });
  },

  getLeaderboard: async (): Promise<LeaderboardEntry[]> => {
    await new Promise(r => setTimeout(r, 400));
    const now = Date.now();
    const twentyFourHoursAgo = now - (24 * 60 * 60 * 1000);
    const validTransactions = KARMA_LOG.filter(t => t.timestamp > twentyFourHoursAgo);
    const scores: Record<string, number> = {};
    validTransactions.forEach(t => {
      scores[t.userId] = (scores[t.userId] || 0) + t.amount;
    });

    return Object.keys(USERS)
      .map(userId => ({
        user: USERS[userId],
        score: scores[userId] || 0,
        rank: 0,
        previousRank: 0 
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5) 
      .map((entry, index) => ({ ...entry, rank: index + 1 }));
  },

  toggleLike: async (targetId: string, type: 'POST' | 'COMMENT'): Promise<{ success: boolean; newLikes: number }> => {
    if (!CURRENT_USER_ID) throw new Error("Auth required");
    await new Promise(r => setTimeout(r, 200));
    const key = `${type.toLowerCase()}_${targetId}`;
    
    let isUnlike = USER_LIKES.has(key);
    let amount = type === 'POST' ? 5 : 1;
    if (isUnlike) {
        USER_LIKES.delete(key);
        amount = -amount; // Negative Karma for unlink
    } else {
        USER_LIKES.add(key);
    }

    let authorId = '';
    let newLikes = 0;

    if (type === 'POST') {
      const p = POSTS_DB.find(x => x.id === targetId);
      if (!p) return { success: false, newLikes: 0 };
      p.likes += (isUnlike ? -1 : 1);
      newLikes = p.likes;
      authorId = p.authorId;
    } else {
      const c = COMMENTS_DB.find(x => x.id === targetId);
      if (!c) return { success: false, newLikes: 0 };
      c.likes += (isUnlike ? -1 : 1);
      newLikes = c.likes;
      authorId = c.authorId;
    }
    
    KARMA_LOG.push({
      id: Math.random().toString(36),
      userId: authorId,
      sourceId: targetId,
      sourceType: type,
      amount: amount,
      timestamp: Date.now()
    });

    return { success: true, newLikes };
  },
  
  getCurrentUser: () => CURRENT_USER_ID ? USERS[CURRENT_USER_ID] : null
};