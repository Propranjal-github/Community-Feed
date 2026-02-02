import { Post, LeaderboardEntry, User } from '../types';
import { api as mockApi } from './mockBackend';

const API_BASE = import.meta.env.VITE_API_URL || '';

const GUEST_USER: User = {
  id: 'guest',
  username: 'Guest',
  avatarUrl: 'https://picsum.photos/seed/guest/200'
};

let currentUserCache: User | null = null;
let useMock = false;
let csrfTokenCache: string | null = null;

const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeout = 5000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
};

export const api = {
  
  isFallbackMode: () => useMock,

  // --- AUTH METHODS ---

  login: async (username: string, password: string): Promise<User> => {
    if (useMock) return mockApi.login(username, password);
    try {
      const response = await fetchWithTimeout(`${API_BASE}/api/users/login/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfTokenCache || ''
        },
        body: JSON.stringify({ username, password }),
        credentials: 'include'
      });

      if (!response.ok) throw new Error('Invalid credentials');
      
      // Refresh session to get new CSRF token and ensure cookie sync
      await api.initSession();
      
      return currentUserCache || GUEST_USER;
    } catch (e) {
      throw e;
    }
  },

  signup: async (username: string, password: string): Promise<User> => {
    if (useMock) return mockApi.signup(username, password);
    try {
      const response = await fetchWithTimeout(`${API_BASE}/api/users/signup/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfTokenCache || ''
        },
        body: JSON.stringify({ username, password }),
        credentials: 'include'
      });

      if (!response.ok) {
         const err = await response.json();
         throw new Error(err.error || 'Signup failed');
      }
      
      const user = await response.json();
      currentUserCache = user;
      return user;
    } catch (e) {
      throw e;
    }
  },

  logout: async (): Promise<void> => {
    if (useMock) return mockApi.logout();
    try {
      await fetchWithTimeout(`${API_BASE}/api/users/logout/`, {
        method: 'POST',
        headers: {
           'X-CSRFToken': csrfTokenCache || ''
        },
        credentials: 'include'
      });
      currentUserCache = null;
      // Re-init session to get a fresh Guest user
      await api.initSession();
    } catch (e) {
      console.warn("Logout failed", e);
    }
  },

  updateUsername: async (username: string): Promise<User> => {
    if (useMock) return mockApi.updateUsername(username);
    try {
      const response = await fetchWithTimeout(`${API_BASE}/api/users/me/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfTokenCache || ''
        },
        body: JSON.stringify({ username }),
        credentials: 'include'
      });

      if (!response.ok) throw new Error('Failed to update username');
      
      const user = await response.json();
      currentUserCache = user;
      return user;
    } catch (e) {
      return mockApi.updateUsername(username);
    }
  },

  // --- EXISTING METHODS ---

  getFeed: async (search: string = '', ordering: string = ''): Promise<Post[]> => {
    if (useMock) return mockApi.getFeed(search, ordering);
    
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (ordering) params.append('ordering', ordering);

      const response = await fetchWithTimeout(`${API_BASE}/api/posts/?${params.toString()}`, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Network response not ok');
      return await response.json();
    } catch (e) {
      console.warn("Backend unavailable, switching to Mock Mode.");
      useMock = true;
      return mockApi.getFeed(search, ordering);
    }
  },

  createPost: async (content: string): Promise<Post> => {
    if (useMock) return mockApi.createPost(content);
    try {
      const response = await fetchWithTimeout(`${API_BASE}/api/posts/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfTokenCache || ''
        },
        body: JSON.stringify({ content }),
        credentials: 'include'
      }, 8000); 
      if (!response.ok) throw new Error('Failed to create post');
      return await response.json();
    } catch (e) {
      return mockApi.createPost(content);
    }
  },

  createComment: async (postId: string, content: string, parentId?: string | null): Promise<boolean> => {
    if (useMock) return mockApi.createComment(postId, content, parentId);
    try {
      const response = await fetchWithTimeout(`${API_BASE}/api/comments/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfTokenCache || ''
        },
        body: JSON.stringify({ postId, content, parentId }),
        credentials: 'include'
      }, 8000);
      return response.ok;
    } catch (e) {
      return mockApi.createComment(postId, content, parentId);
    }
  },

  getLeaderboard: async (): Promise<LeaderboardEntry[]> => {
    if (useMock) return mockApi.getLeaderboard();
    try {
      const response = await fetchWithTimeout(`${API_BASE}/api/leaderboard/`, {
        credentials: 'include'
      }, 3000); 
      if (!response.ok) throw new Error('Network response not ok');
      return await response.json();
    } catch (e) {
      if (!useMock) console.warn("Leaderboard unreachable, using Mock.");
      useMock = true;
      return mockApi.getLeaderboard();
    }
  },

  toggleLike: async (targetId: string, type: 'POST' | 'COMMENT'): Promise<{ success: boolean; newLikes: number }> => {
    if (useMock) return mockApi.toggleLike(targetId, type);
    
    try {
      const endpoint = type === 'POST' ? 'posts' : 'comments';
      
      const response = await fetchWithTimeout(`${API_BASE}/api/${endpoint}/${targetId}/like/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfTokenCache || ''
        },
        credentials: 'include'
      }, 5000);

      if (response.ok) {
        const data = await response.json();
        return { success: true, newLikes: data.newLikes };
      }
      throw new Error("API Error");
    } catch (e) {
      return mockApi.toggleLike(targetId, type);
    }
  },
  
  getCurrentUser: (): User => {
    if (useMock) return mockApi.getCurrentUser();
    return currentUserCache || GUEST_USER;
  },

  initSession: async () => {
    try {
      const response = await fetchWithTimeout(`${API_BASE}/api/users/me/`, { 
        credentials: 'include'
      }, 3000);

      if (response.ok) {
        const data = await response.json();
        if (data.csrfToken) {
          csrfTokenCache = data.csrfToken;
        }
        if (data.isAuthenticated && data.user) {
          currentUserCache = data.user;
        }
      } else {
        useMock = true; 
      }
    } catch (e) {
      useMock = true; 
    }
  }
};