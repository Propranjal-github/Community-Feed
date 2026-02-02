import React, { useState } from 'react';
import { Post } from '../types';
import { CommentNode } from './CommentNode';
import { Heart, MessageSquare, Share2, MoreHorizontal, Send } from 'lucide-react';
import { api } from '../services/api';

interface PostCardProps {
  post: Post;
  onUpdateLeaderboard: () => void;
  refreshFeed?: () => void;
}

export const PostCard: React.FC<PostCardProps> = ({ post, onUpdateLeaderboard, refreshFeed }) => {
  const [likes, setLikes] = useState(post.likes);
  const [hasLiked, setHasLiked] = useState(post.hasLiked);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  const currentUser = api.getCurrentUser();

  const handleLike = async () => {
    if (!currentUser) {
       window.dispatchEvent(new Event('auth-required'));
       return;
    }

    const prevLikes = likes;
    const prevHasLiked = hasLiked;

    // Optimistic Update
    setLikes(prev => prevHasLiked ? prev - 1 : prev + 1);
    setHasLiked(!prevHasLiked);

    try {
      const result = await api.toggleLike(post.id, 'POST');
      if (result.success) {
         setLikes(result.newLikes);
      } else {
         throw new Error("Failed");
      }
      onUpdateLeaderboard();
    } catch (e) {
      // Revert if failed (e.g., self-like prevention)
      setLikes(prevLikes);
      setHasLiked(prevHasLiked);
      
      // Simple feedback
      alert("You cannot vote on your own post.");
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    if (!currentUser) {
        window.dispatchEvent(new Event('auth-required'));
        return;
    }

    setIsSubmittingComment(true);
    try {
      const success = await api.createComment(post.id, commentText);
      if (success) {
        setCommentText('');
        if (refreshFeed) refreshFeed(); // Refresh to show new comment
      }
    } catch (e) {
      console.error(e);
    }
    setIsSubmittingComment(false);
  };

  const topLevelComments = post.comments.filter(c => c.parentId === null);

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-xl overflow-hidden mb-6">
      <div className="p-5">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <img 
              src={post.author.avatarUrl} 
              alt={post.author.username} 
              className="w-10 h-10 rounded-full border-2 border-slate-600"
            />
            <div>
              <h3 className="font-bold text-slate-100">{post.author.username}</h3>
              <p className="text-xs text-slate-400">
                 {new Date(post.createdAt).toLocaleString()}
              </p>
            </div>
          </div>
          <button className="text-slate-400 hover:text-white">
            <MoreHorizontal size={20} />
          </button>
        </div>

        <p className="text-slate-200 text-lg leading-relaxed mb-4">
          {post.content}
        </p>

        <div className="flex items-center gap-6 border-t border-slate-700/50 pt-4">
          <button 
            onClick={handleLike}
            className={`flex items-center gap-2 text-sm font-semibold transition-all active:scale-95 ${
              hasLiked ? 'text-emerald-400' : 'text-slate-400 hover:text-emerald-400'
            }`}
          >
            <Heart className={hasLiked ? 'fill-emerald-400' : ''} size={20} />
            {likes}
          </button>
          
          <button 
            onClick={() => setShowComments(!showComments)}
            className="flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-blue-400 transition-colors"
          >
            <MessageSquare size={20} />
            {post.commentCount} Comments
          </button>

          <button className="flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-purple-400 transition-colors">
            <Share2 size={20} />
            Share
          </button>
        </div>
      </div>

      {showComments && (
        <div className="bg-slate-900/50 p-5 border-t border-slate-700/50 animate-in fade-in slide-in-from-top-2 duration-200">
           <form onSubmit={handleCommentSubmit} className="flex gap-3 mb-6 relative group">
              {currentUser ? (
                <img 
                  src={currentUser.avatarUrl} 
                  className="w-8 h-8 rounded-full border border-slate-700 flex-shrink-0" 
                  alt="Me" 
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-slate-700 flex-shrink-0" />
              )}
              
              <div className="flex-1 relative">
                <input 
                  type="text" 
                  placeholder={currentUser ? "Write a comment..." : "Log in to comment..."}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onFocus={() => {
                      if (!currentUser) {
                          window.dispatchEvent(new Event('auth-required'));
                      }
                  }}
                  disabled={isSubmittingComment}
                  className="w-full bg-slate-800 border-none rounded-lg px-4 py-2 pr-10 text-sm text-slate-200 focus:ring-2 focus:ring-emerald-500/50 outline-none placeholder-slate-500"
                />
                <button 
                  type="submit"
                  disabled={!commentText.trim() || isSubmittingComment}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-emerald-500 disabled:text-slate-600 hover:text-emerald-400 transition-colors"
                >
                  <Send size={16} />
                </button>
              </div>
           </form>

          <div className="space-y-1">
            {topLevelComments.map(comment => (
              <CommentNode 
                key={comment.id} 
                comment={comment} 
                allComments={post.comments}
                onUpdateLeaderboard={onUpdateLeaderboard}
                refreshFeed={refreshFeed}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};