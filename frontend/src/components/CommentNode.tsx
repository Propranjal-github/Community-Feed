import React, { useState } from 'react';
import { Comment } from '../types';
import { Heart, MessageCircle, ChevronDown, ChevronUp, Send, X } from 'lucide-react';
import { api } from '../services/api';

interface CommentNodeProps {
  comment: Comment;
  allComments: Comment[]; 
  depth?: number;
  onUpdateLeaderboard?: () => void;
  refreshFeed?: () => void;
}

export const CommentNode: React.FC<CommentNodeProps> = ({ 
  comment, 
  allComments, 
  depth = 0,
  onUpdateLeaderboard,
  refreshFeed
}) => {
  const [likes, setLikes] = useState(comment.likes);
  const [hasLiked, setHasLiked] = useState(comment.hasLiked);
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // Reply State
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const children = allComments.filter(c => c.parentId === comment.id);

  const handleLike = async () => {
    if (!api.getCurrentUser()) {
        window.dispatchEvent(new Event('auth-required'));
        return;
    }

    const prevLikes = likes;
    const prevHasLiked = hasLiked;

    setLikes(prev => prevHasLiked ? prev - 1 : prev + 1);
    setHasLiked(!prevHasLiked);

    try {
      const result = await api.toggleLike(comment.id, 'COMMENT');
      if (result.success) {
         setLikes(result.newLikes);
      } else {
         throw new Error("Failed");
      }
      if (onUpdateLeaderboard) onUpdateLeaderboard();
    } catch (e) {
      setLikes(prevLikes);
      setHasLiked(prevHasLiked);
      alert("You cannot vote on your own comment.");
    }
  };

  const handleReplyClick = () => {
    if (!api.getCurrentUser()) {
        window.dispatchEvent(new Event('auth-required'));
        return;
    }
    setIsReplying(!isReplying);
  };

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    setIsSubmitting(true);
    try {
      // Pass the current comment ID as the parentId
      const success = await api.createComment(comment.postId, replyText, comment.id);
      if (success) {
        setReplyText('');
        setIsReplying(false);
        setIsCollapsed(false); // Ensure thread is open to see new reply
        if (refreshFeed) refreshFeed();
      }
    } catch (e) {
      console.error(e);
      alert("Failed to post reply");
    }
    setIsSubmitting(false);
  };

  return (
    <div className={`mt-3 ${depth > 0 ? 'ml-0' : ''}`}>
      <div className="flex gap-3 group">
        <div className="flex flex-col items-center">
          <img 
            src={comment.author.avatarUrl} 
            alt={comment.author.username} 
            className="w-8 h-8 rounded-full bg-slate-700 object-cover border border-slate-700"
          />
          {!isCollapsed && children.length > 0 && (
             <div className="w-px h-full bg-slate-700/50 mt-2 group-hover:bg-slate-600 transition-colors" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50 hover:border-slate-600 transition-colors">
            <div className="flex justify-between items-start">
              <span className="text-sm font-semibold text-slate-200">
                {comment.author.username}
                <span className="text-slate-500 font-normal ml-2 text-xs">
                  • {new Date(comment.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </span>
              </span>
              
              <button 
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="text-slate-500 hover:text-slate-300"
              >
                {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
              </button>
            </div>

            {!isCollapsed && (
              <>
                <p className="text-slate-300 text-sm mt-1 leading-relaxed">
                  {comment.content}
                </p>

                <div className="flex items-center gap-4 mt-3">
                  <button 
                    onClick={handleLike}
                    className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
                      hasLiked ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <Heart size={14} className={hasLiked ? 'fill-emerald-400' : ''} />
                    {likes}
                  </button>
                  <button 
                    onClick={handleReplyClick}
                    className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
                      isReplying ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <MessageCircle size={14} />
                    Reply
                  </button>
                </div>
              </>
            )}
          </div>
          
          {/* Reply Input Form */}
          {!isCollapsed && isReplying && (
             <div className="mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                <form onSubmit={handleReplySubmit} className="flex gap-2">
                   <input
                      autoFocus
                      type="text"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder={`Reply to ${comment.author.username}...`}
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50"
                      disabled={isSubmitting}
                   />
                   <div className="flex gap-1">
                     <button
                        type="submit"
                        disabled={!replyText.trim() || isSubmitting}
                        className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white p-2 rounded-lg transition-colors"
                     >
                       <Send size={14} />
                     </button>
                     <button
                        type="button"
                        onClick={() => setIsReplying(false)}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-400 p-2 rounded-lg transition-colors"
                     >
                       <X size={14} />
                     </button>
                   </div>
                </form>
             </div>
          )}

          {!isCollapsed && children.length > 0 && (
            <div className="relative">
               {depth < 4 && (
                 <div className="absolute top-0 left-[-19px] w-4 h-6 border-b-0 border-l-0 border-slate-700 rounded-bl-xl z-0"></div>
               )}
               {children.map(child => (
                 <CommentNode 
                   key={child.id} 
                   comment={child} 
                   allComments={allComments}
                   depth={depth + 1}
                   onUpdateLeaderboard={onUpdateLeaderboard}
                   refreshFeed={refreshFeed}
                 />
               ))}
            </div>
          )}
           {isCollapsed && children.length > 0 && (
            <div className="mt-2 text-xs text-slate-500 italic pl-2 cursor-pointer hover:text-emerald-400" onClick={() => setIsCollapsed(false)}>
              {children.length} replies hidden...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};