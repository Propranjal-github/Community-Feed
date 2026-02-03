import { Post, LeaderboardEntry, User } from '../types';
import { api as mockApi } from './mockBackend';

const API_BASE = import.meta.env.VITE_API_URL || '';

let currentUserCache: User | null = null;
let useMock = false;
let csrfTokenCache: string | null = null;

// Increased timeout to 2 minutes (120000ms) for Render cold starts
const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeout = 120000) => {
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

// Helper to handle CSRF retries
const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
  // 1. Prepare Headers
  const headers = {
    'Content-Type': 'application/json',
    'X-CSRFToken': csrfTokenCache || '',
    ...(options.headers || {})
  };

  // 2. First Try
  let response = await fetchWithTimeout(url, {
    ...options,
    headers,
    credentials: 'include'
  });

  // 3. Handle CSRF Failure (403) -> Retry once
  if (response.status === 403) {
    console.warn("CSRF missing or invalid. Refreshing session...");
    await api.initSession(); // Updates csrfTokenCache
    
    // Update header with new token
    headers['X-CSRFToken'] = csrfTokenCache || '';
    
    response = await fetchWithTimeout(url, {
      ...options,
      headers,
      credentials: 'include'
    });
  }

  return response;
};

export const api = {
  
  isFallbackMode: () => useMock,

  // --- AUTH METHODS ---

  login: async (username: string, password: string): Promise<User> => {
    if (useMock) return mockApi.login(username, password);
    try {
      const response = await authenticatedFetch(`${API_BASE}/api/users/login/`, {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) throw new Error('Invalid credentials');
      
      // Refresh session to get new CSRF token and ensure cookie sync
      await api.initSession();
      
      if (!currentUserCache) throw new Error("Login failed to retrieve user");
      return currentUserCache;
    } catch (e) {
      if (e instanceof TypeError) throw e; // Network error
      throw e; 
    }
  },

  signup: async (username: string, password: string): Promise<User> => {
    if (useMock) return mockApi.signup(username, password);
    try {
      const response = await authenticatedFetch(`${API_BASE}/api/users/signup/`, {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
         const err = await response.json();
         throw new Error(err.error || 'Signup failed');
      }
      
      await api.initSession();
      if (!currentUserCache) throw new Error("Signup failed to retrieve user");
      return currentUserCache;
    } catch (e) {
      throw e;
    }
  },

  logout: async (): Promise<void> => {
    if (useMock) return mockApi.logout();
    try {
      await authenticatedFetch(`${API_BASE}/api/users/logout/`, {
        method: 'POST',
      });
      currentUserCache = null;
      await api.initSession();
    } catch (e) {
      console.warn("Logout failed", e);
    }
  },

  updateUsername: async (username: string): Promise<User> => {
    if (useMock) return mockApi.updateUsername(username);
    try {
      const response = await authenticatedFetch(`${API_BASE}/api/users/me/`, {
        method: 'PATCH',
        body: JSON.stringify({ username }),
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
      }); // Uses default 120s timeout
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
      const response = await authenticatedFetch(`${API_BASE}/api/posts/`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      });
      
      if (!response.ok) {
        // If server error, THROW, do not fallback to mock.
        throw new Error(`Server error: ${response.status}`);
      }
      return await response.json();
    } catch (e: any) {
      // Only fallback to mock on NETWORK failures (e.g. backend down), not logic/auth errors
      if (e.message === 'Failed to fetch' || e.name === 'AbortError') {
         return mockApi.createPost(content);
      }
      throw e;
    }
  },

  createComment: async (postId: string, content: string, parentId?: string | null): Promise<boolean> => {
    if (useMock) return mockApi.createComment(postId, content, parentId);
    try {
      const response = await authenticatedFetch(`${API_BASE}/api/comments/`, {
        method: 'POST',
        body: JSON.stringify({ postId, content, parentId }),
      });
      return response.ok;
    } catch (e: any) {
      if (e.message === 'Failed to fetch' || e.name === 'AbortError') {
         return mockApi.createComment(postId, content, parentId);
      }
      return false;
    }
  },

  getLeaderboard: async (): Promise<LeaderboardEntry[]> => {
    if (useMock) return mockApi.getLeaderboard();
    try {
      const response = await fetchWithTimeout(`${API_BASE}/api/leaderboard/`, {
        credentials: 'include'
      }, 120000); // 2 minutes timeout
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
      
      const response = await authenticatedFetch(`${API_BASE}/api/${endpoint}/${targetId}/like/`, {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        return { success: true, newLikes: data.newLikes };
      }
      throw new Error("API Error");
    } catch (e) {
      // Don't fallback on like errors usually, but for consistency with existing code:
      return mockApi.toggleLike(targetId, type);
    }
  },
  
  getCurrentUser: (): User | null => {
    if (useMock) return mockApi.getCurrentUser();
    return currentUserCache;
  },

  initSession: async () => {
    try {
      const response = await fetchWithTimeout(`${API_BASE}/api/users/me/`, { 
        credentials: 'include'
      }, 120000); 

      if (response.ok) {
        const data = await response.json();
        if (data.csrfToken) {
          csrfTokenCache = data.csrfToken;
        }
        if (data.isAuthenticated && data.user) {
          currentUserCache = data.user;
        } else {
          currentUserCache = null; // No guest user
        }
      } else {
        useMock = true; 
      }
    } catch (e) {
      useMock = true; 
    }
  }
};