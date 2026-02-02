import React, { useEffect, useState, useCallback } from 'react';
import { PostCard } from './components/PostCard';
import { Leaderboard } from './components/Leaderboard';
import { CreatePostModal } from './components/CreatePostModal';
import { AuthModal } from './components/AuthModal';
import { api } from './services/api'; 
import { Post, LeaderboardEntry } from './types';
import { Flame, PlusCircle, Search, Loader2, ArrowDownCircle, LogOut, LogIn, UserPlus } from 'lucide-react';

const PAGE_SIZE = 10;

const App: React.FC = () => {
  // Client-Side Pagination State
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [displayedPosts, setDisplayedPosts] = useState<Post[]>([]);
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);
  
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);
  
  // Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('-created_at'); 

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'login'|'signup'>('login');
  
  const [, setTick] = useState(0); 

  // Initialize Session
  useEffect(() => {
    const init = async () => {
      if (api.initSession) await api.initSession();
      setTick(t => t + 1);
    };
    init();
  }, []);

  // Listen for global auth triggers
  useEffect(() => {
    const handleAuthRequired = () => openAuth('login');
    window.addEventListener('auth-required', handleAuthRequired);
    return () => window.removeEventListener('auth-required', handleAuthRequired);
  }, []);

  // Fetch Feed Wrapper
  const fetchPosts = useCallback(async () => {
    setLoadingPosts(true);
    try {
      // Fetch ALL posts at once (MVP Mode)
      const data = await api.getFeed(searchQuery, sortBy);
      
      if (Array.isArray(data)) {
         setAllPosts(data);
         // Reset display count on new fetch/filter
         setDisplayCount(PAGE_SIZE);
         setDisplayedPosts(data.slice(0, PAGE_SIZE));
      } else {
         console.error("API response malformed", data);
      }
      
      if (api.isFallbackMode && api.isFallbackMode()) {
         setUsingFallback(true);
      }
    } catch (e) {
      console.error("Critical Failure:", e);
    }
    setLoadingPosts(false);
  }, [searchQuery, sortBy]);

  // Handle Load More (Client Side Slicing)
  useEffect(() => {
    if (allPosts.length > 0) {
      setDisplayedPosts(allPosts.slice(0, displayCount));
    }
  }, [displayCount, allPosts]);

  const handleLoadMore = () => {
    setDisplayCount(prev => prev + PAGE_SIZE);
  };

  // Initial Load & Search/Sort Changes
  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Fetch Leaderboard
  const fetchLeaderboard = useCallback(async () => {
    if (leaderboard.length === 0) setLoadingLeaderboard(true); 
    try {
      const data = await api.getLeaderboard();
      setLeaderboard(data);
    } catch (e) {
      console.error("Leaderboard fetch failed", e);
    }
    setLoadingLeaderboard(false);
  }, [leaderboard.length]);

  useEffect(() => {
    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 3000); // Poll every 3 seconds for demo
    return () => clearInterval(interval);
  }, [fetchLeaderboard]);

  const handleLogout = async () => {
    await api.logout();
    setTick(t => t + 1);
    fetchPosts();
    fetchLeaderboard();
  };

  const openAuth = (tab: 'login' | 'signup') => {
    setAuthModalTab(tab);
    setIsAuthModalOpen(true);
  };

  const handleCreatePostClick = () => {
    if (!api.getCurrentUser()) {
      openAuth('login');
      return;
    }
    setIsCreateModalOpen(true);
  };

  const currentUser = api.getCurrentUser();
  const hasMore = displayedPosts.length < allPosts.length;

  return (
    <div className="min-h-screen bg-slate-900 pb-20">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="bg-emerald-500 p-1.5 rounded-lg">
                <Flame className="text-slate-900 fill-slate-900" size={20} />
              </div>
              <span className="text-xl font-bold tracking-tight text-white">Playto</span>
              {usingFallback && (
                <span className="bg-amber-500/10 text-amber-500 text-[10px] px-2 py-0.5 rounded-full border border-amber-500/20 ml-2">
                  OFFLINE MODE
                </span>
              )}
            </div>
            
            <div className="hidden md:flex flex-1 max-w-md mx-8">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input 
                  type="text" 
                  placeholder="Search discussions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-full py-2 pl-10 pr-4 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button 
                onClick={handleCreatePostClick}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
              >
                <PlusCircle size={16} />
                New Post
              </button>
              
              <div className="flex items-center gap-3 pl-4 border-l border-slate-700">
                 {!currentUser ? (
                   <div className="flex items-center gap-2">
                      <button 
                        onClick={() => openAuth('login')}
                        className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
                      >
                        Log In
                      </button>
                      <button 
                        onClick={() => openAuth('signup')}
                        className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border border-slate-700"
                      >
                        Sign Up
                      </button>
                   </div>
                 ) : (
                   <div className="flex items-center gap-3">
                     <div className="text-right hidden sm:block">
                        <div className="text-sm font-medium text-white flex items-center gap-2 justify-end">
                          {currentUser.username}
                        </div>
                        <div className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wide">
                          Member
                        </div>
                     </div>
                     <img 
                       src={currentUser.avatarUrl} 
                       className="w-8 h-8 rounded-full border border-slate-700"
                       alt="Profile"
                     />
                     <button 
                       onClick={handleLogout}
                       title="Log Out"
                       className="ml-2 text-slate-500 hover:text-red-400 transition-colors"
                     >
                       <LogOut size={18} />
                     </button>
                   </div>
                 )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Feed Column */}
          <main className="lg:col-span-8">
            <div className="mb-6 flex items-center justify-between">
              <h1 className="text-2xl font-bold text-white">Community Feed</h1>
              <div className="flex gap-2">
                 <select 
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="bg-slate-800 border border-slate-700 text-slate-300 text-sm rounded-lg p-2 outline-none cursor-pointer hover:border-emerald-500 transition-colors"
                 >
                    <option value="-likes_count">Trending</option>
                    <option value="-created_at">Newest</option>
                 </select>
              </div>
            </div>

            {loadingPosts ? (
               <div className="space-y-6">
                 {[1,2].map(i => (
                    <div key={i} className="bg-slate-800 h-64 rounded-xl animate-pulse"></div>
                 ))}
               </div>
            ) : (
              displayedPosts.length > 0 ? (
                <>
                  {displayedPosts.map(post => (
                    <PostCard 
                      key={post.id} 
                      post={post} 
                      onUpdateLeaderboard={fetchLeaderboard}
                      refreshFeed={() => fetchPosts()}
                    />
                  ))}
                  
                  {hasMore && (
                    <div className="py-8 flex justify-center">
                      <button 
                        onClick={handleLoadMore}
                        className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-full text-slate-300 font-medium transition-all active:scale-95"
                      >
                         <ArrowDownCircle size={18} />
                         Load More Posts
                      </button>
                    </div>
                  )}
                  
                  {!hasMore && displayedPosts.length > 10 && (
                    <div className="text-center py-8 text-slate-500 text-sm">
                      You've reached the end of the internet.
                    </div>
                  )}
                </>
              ) : (
                <div className="text-slate-400 text-center py-10">
                  <p>No posts found matching your search.</p>
                </div>
              )
            )}
          </main>

          {/* Sidebar Column */}
          <aside className="lg:col-span-4 hidden lg:block">
            <Leaderboard 
              entries={leaderboard} 
              loading={loadingLeaderboard} 
            />
            
            {/* Footer / Info */}
            <div className="mt-8 p-4 rounded-lg bg-slate-800/50 border border-slate-800">
               <h3 className="text-sm font-semibold text-slate-400 mb-2">System Status</h3>
               <p className="text-xs text-slate-500 leading-relaxed">
                 {usingFallback ? (
                   <>
                     Running in <strong>Offline/Mock Mode</strong>. <br/>
                     The backend server is unreachable, so we are using local simulation data.
                   </>
                 ) : (
                   <>
                     Running in <strong>Online Mode</strong>. <br/>
                     Connected to Django Backend. <br/>
                     {!currentUser ? (
                       <span>Not logged in</span>
                     ) : (
                       <span>Logged in as <strong className="text-emerald-400">{currentUser.username}</strong></span>
                     )}
                   </>
                 )}
               </p>
            </div>
          </aside>
        </div>
      </div>

      {isCreateModalOpen && (
        <CreatePostModal 
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => {
             fetchPosts();
          }}
        />
      )}

      {isAuthModalOpen && (
        <AuthModal 
          defaultTab={authModalTab}
          onClose={() => setIsAuthModalOpen(false)}
          onSuccess={() => {
            setTick(t => t + 1);
            fetchPosts();
          }}
        />
      )}
    </div>
  );
};

export default App;